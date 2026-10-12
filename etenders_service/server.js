import app from './src/app.js';
import env from './src/config/env.js';
import connectDb from './src/config/db.js';
import { scheduleFetchTendersJob } from './src/jobs/fetchTenders.job.js';

const start = async () => {
  try {
    await connectDb();

    scheduleFetchTendersJob();

    app.listen(env.port, () => {
      console.log(`[server] listening on port ${env.port}`);
      console.log(`[server] swagger ui: http://localhost:${env.port}/api-docs`);
    });
  } catch (err) {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  }
};

start();
