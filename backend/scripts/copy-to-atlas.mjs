/**
 * copy-to-atlas.mjs — copies the local demo database to an Atlas cluster so a
 * hosted Salesdam shows the same users, roles, workspace and demo records.
 *
 * Copies every collection except `sessions` (old logins shouldn't carry over),
 * keeping the same _ids so every link between records stays intact. Also
 * recreates each collection's indexes (incl. the search text index).
 *
 * Refuses to write into a non-empty Atlas database unless --wipe is passed,
 * which drops the target's copies of those collections first — use it to
 * reset the hosted demo back to your local state.
 *
 * The local dev server (node dev-server.js) must be running.
 *
 * Usage (from backend/):
 *   ATLAS_URI='mongodb+srv://user:pass@cluster.../salesdam' node scripts/copy-to-atlas.mjs
 *   ATLAS_URI='...' node scripts/copy-to-atlas.mjs --wipe
 */
import { MongoClient } from 'mongodb';

const SOURCE_URI = process.env.LOCAL_URI || 'mongodb://127.0.0.1:27017/salesdam?directConnection=true';
const TARGET_URI = process.env.ATLAS_URI;
const SKIP = new Set(['sessions']);
const WIPE = process.argv.includes('--wipe');

if (!TARGET_URI) {
  console.error('Set ATLAS_URI to your Atlas connection string (ending in /salesdam).');
  process.exit(1);
}
if (!/mongodb\.net\/[^/?]+/.test(TARGET_URI)) {
  console.error('ATLAS_URI must name the database, e.g. ...mongodb.net/salesdam');
  process.exit(1);
}

const masked = TARGET_URI.replace(/\/\/[^@]*@/, '//***:***@');
const source = new MongoClient(SOURCE_URI);
const target = new MongoClient(TARGET_URI);

try {
  await source.connect();
  await target.connect();
  const src = source.db();
  const dst = target.db();
  console.log(`From: local ${src.databaseName}\nTo:   ${masked} (db: ${dst.databaseName})\n`);

  const collections = (await src.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !SKIP.has(n) && !n.startsWith('system.'))
    .sort();

  const existing = new Set((await dst.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  const occupied = [];
  for (const name of collections) {
    if (existing.has(name) && (await dst.collection(name).estimatedDocumentCount()) > 0) occupied.push(name);
  }
  if (occupied.length && !WIPE) {
    console.error(`Atlas already has data in: ${occupied.join(', ')}`);
    console.error('Nothing was changed. Re-run with --wipe to replace it with your local data.');
    process.exit(1);
  }

  const rows = [];
  for (const name of collections) {
    const docs = await src.collection(name).find({}).toArray();
    if (WIPE && existing.has(name)) await dst.collection(name).drop();
    if (docs.length) await dst.collection(name).insertMany(docs, { ordered: true });

    for (const idx of await src.collection(name).indexes()) {
      if (idx.name === '_id_') continue;
      const { key, v, ns, ...options } = idx;
      try {
        await dst.collection(name).createIndex(key, options);
      } catch (err) {
        console.warn(`  index ${name}.${idx.name} skipped: ${err.message}`);
      }
    }
    rows.push([name, docs.length, await dst.collection(name).countDocuments()]);
  }

  console.log('collection'.padEnd(26), 'local'.padStart(7), 'atlas'.padStart(7));
  let mismatch = false;
  for (const [name, local, atlas] of rows) {
    if (local !== atlas) mismatch = true;
    console.log(name.padEnd(26), String(local).padStart(7), String(atlas).padStart(7), local === atlas ? '' : '  <-- MISMATCH');
  }
  console.log(mismatch ? '\nSome counts differ — check the warnings above.' : '\nDone. Every collection matches.');
  process.exit(mismatch ? 1 : 0);
} catch (err) {
  console.error('Copy failed:', err.message);
  process.exit(1);
} finally {
  await source.close().catch(() => {});
  await target.close().catch(() => {});
}
