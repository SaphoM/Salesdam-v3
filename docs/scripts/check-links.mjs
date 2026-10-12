/**
 * Fails if the navigation tree and the pages on disk disagree.
 *
 * The previous sidebar linked 20 pages that had never been written and omitted 7
 * that existed. Nobody noticed because nothing checked. This runs before `build`,
 * so that class of drift becomes a failed build rather than a dead link a reader
 * discovers.
 *
 *   node scripts/check-links.mjs
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAV, ALL_PAGES } from '../src/data/navigation.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const pagesDir = join(root, 'src', 'pages');

/** Every route the pages directory produces. */
function routes(dir = pagesDir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return routes(full);
    if (!/\.(astro|md|mdx|html)$/.test(entry)) return [];

    const rel = relative(pagesDir, full).split(sep).join('/');
    const route = '/' + rel.replace(/\.(astro|md|mdx|html)$/, '').replace(/\/?index$/, '');
    return [route === '' ? '/' : route];
  });
}

const onDisk = new Set(routes());
const inNav = new Set(ALL_PAGES.map((p) => p.path));

// Pages that intentionally exist without a sidebar entry.
const ALLOWED_ORPHANS = new Set([
  '/search',          // reachable from the header and Cmd-K
  '/404',             // error page
  '/api/endpoints',   // stub preserving an old URL
  '/api/explorer',    // stub preserving an old URL
]);

const missing = [...inNav].filter((p) => !onDisk.has(p));
const orphans = [...onDisk].filter((p) => !inNav.has(p) && !ALLOWED_ORPHANS.has(p));

// Duplicate paths in the nav would render two active items for one page.
const seen = new Set();
const duplicates = [...inNav.keys()].length !== ALL_PAGES.length
  ? ALL_PAGES.map((p) => p.path).filter((p) => (seen.has(p) ? true : (seen.add(p), false)))
  : [];

let failed = false;

if (missing.length) {
  failed = true;
  console.error(`\n✗ ${missing.length} navigation entr${missing.length === 1 ? 'y' : 'ies'} point at a page that does not exist:`);
  missing.forEach((p) => {
    const entry = ALL_PAGES.find((x) => x.path === p);
    console.error(`    ${p}   (“${entry.title}” under “${entry.section}”)`);
  });
  console.error('  Either create the page, or remove it from src/data/navigation.js.');
}

if (orphans.length) {
  failed = true;
  console.error(`\n✗ ${orphans.length} page${orphans.length === 1 ? '' : 's'} exist but are not reachable from the sidebar:`);
  orphans.forEach((p) => console.error(`    ${p}`));
  console.error('  Add them to src/data/navigation.js, or list them in ALLOWED_ORPHANS in this script.');
}

if (duplicates.length) {
  failed = true;
  console.error(`\n✗ Duplicate paths in the navigation tree: ${duplicates.join(', ')}`);
}

// ── Inline links ────────────────────────────────────────────────────────────
// The nav check above can't see links written in prose. Several legacy pages link
// to pages that were planned and never written, which is invisible until a reader
// clicks one.
function sources(dir = pagesDir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sources(full);
    return entry.endsWith('.astro') ? [full] : [];
  });
}

const brokenInline = [];
for (const file of sources()) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(pagesDir, file).split(sep).join('/');
  for (const m of text.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1].replace(/\/$/, '') || '/';
    // Ignore asset paths — they aren't pages.
    if (/\.(svg|png|jpe?g|ico|css|js|json|txt|xml|pdf)$/i.test(href)) continue;
    if (!onDisk.has(href)) brokenInline.push([rel, href]);
  }
}

if (brokenInline.length) {
  failed = true;
  console.error(`\n✗ ${brokenInline.length} inline link(s) point at a page that does not exist:`);
  const byTarget = new Map();
  for (const [from, href] of brokenInline) {
    if (!byTarget.has(href)) byTarget.set(href, []);
    byTarget.get(href).push(from);
  }
  [...byTarget.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([href, froms]) => {
      console.error(`    ${href}`);
      froms.forEach((f) => console.error(`        linked from ${f}`));
    });
  console.error('  Create the page, or repoint the link.');
}

if (failed) {
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Navigation check passed — ${inNav.size} pages in ${NAV.length} sections, all present; ` +
    `${ALLOWED_ORPHANS.size} intentional orphans.`,
);
