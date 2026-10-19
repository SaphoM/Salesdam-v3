/**
 * Cross-platform local development server.
 *
 * Starts the MongoDB binary managed by mongodb-memory-server, keeps its data
 * under backend/.data, and then starts the API. No system MongoDB install is
 * required.
 *
 * Usage: npm run dev:local
 */
import 'dotenv/config';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.LOCAL_MONGO_DB_PATH
  ? path.resolve(process.env.LOCAL_MONGO_DB_PATH)
  : path.join(__dirname, '.data', 'mongodb');

async function main() {
  const { default: logger } = await import('./utils/logger.js');

  fs.mkdirSync(DB_PATH, { recursive: true });

  logger.info('Starting local MongoDB...');
  // A single-member replica set, not a plain standalone mongod: the app's
  // record-creation path uses Mongoose transactions, which a standalone
  // mongod rejects with "Transaction numbers are only allowed on a replica
  // set member or mongos". MongoMemoryReplSet runs rs.initiate() for us;
  // MongoMemoryServer with an `instance.replSet` flag does not, and so hangs
  // with no primary until connection times out.
  const mongod = await MongoMemoryReplSet.create({
    binary: {
      version: process.env.MONGOMS_VERSION || '8.2.6',
      checkMD5: false,
    },
    replSet: {
      name: 'rs0',
      count: 1,
      dbName: 'salesdam',
      ip: '127.0.0.1',
      storageEngine: 'wiredTiger',
    },
    instanceOpts: [
      {
        port: Number(process.env.MONGO_PORT || 27017),
        dbPath: DB_PATH,
      },
    ],
  });

  process.env.MONGO_URI = mongod.getUri('salesdam');

  const { default: app } = await import('./app.js');
  const { default: connectDB } = await import('./config/db.js');

  await connectDB();

  const port = Number(process.env.PORT || 5000);
  const server = http.createServer(app);

  const shutdown = async (signal) => {
    logger.info(`${signal} received; shutting down local services...`);
    server.close(async () => {
      await mongod.stop();
      process.exit(0);
    });
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  server.listen(port, () => {
    logger.info(`Backend running on http://localhost:${port}`);
    logger.info(`Health check: http://localhost:${port}/health`);
  });
}

main().catch((error) => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});
