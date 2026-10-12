/**
 * seed-local.js
 * First-time setup: downloads MongoDB binary + creates admin account.
 * Run ONCE: npm run seed:local
 *
 * Uses the same persistent DB path as dev-server.js so data carries over.
 */
require('dotenv').config();

const os = require('os');
const path = require('path');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Persistent data directory — same path dev-server.js uses
const DB_PATH = path.join(
  process.env.USERPROFILE || os.homedir(),
  'AppData', 'Local', 'salesforce-mini-db'
);

fs.mkdirSync(DB_PATH, { recursive: true });

async function main() {
  console.log('Setting up local development database...');
  console.log('Binary cache: ' + path.join(os.homedir(), '.cache', 'mongodb-binaries'));
  console.log('Data path:    ' + DB_PATH);
  console.log('(First run downloads ~336 MB MongoDB binary — please wait)');
  console.log('');

  const mongod = await MongoMemoryServer.create({
    binary: {
      version: '7.0.14',
      checkMD5: false,
    },
    instance: {
      port: 27017,
      dbPath: DB_PATH,          // Persist data to disk
      storageEngine: 'wiredTiger',
    },
  });

  const uri = mongod.getUri('salesforce-mini');
  process.env.MONGO_URI = uri;
  console.log('MongoDB started at:', uri);

  // Run the main seeder — it calls process.exit(0) when done
  require('./seed');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
