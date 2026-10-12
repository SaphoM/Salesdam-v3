import cron from 'node-cron';
import env from '../config/env.js';
import { fetchAllTenders } from '../services/etenders.service.js';
import { upsertRawTenders } from '../services/tender.service.js';

let isRunning = false;

/**
 * Runs one full fetch-and-store cycle. Exported so it can also be
 * triggered manually (e.g. from an admin route or a one-off script).
 */
export const runFetchTendersJob = async () => {
  if (isRunning) {
    console.log('[fetchTenders] a run is already in progress, skipping');
    return { skipped: true };
  }

  isRunning = true;
  const startedAt = Date.now();
  console.log('[fetchTenders] starting fetch from eTenders...');

  try {
    const rawTenders = await fetchAllTenders();
    console.log(`[fetchTenders] fetched ${rawTenders.length} records, upserting...`);

    const result = await upsertRawTenders(rawTenders);
    const durationMs = Date.now() - startedAt;

    console.log(
      `[fetchTenders] done in ${durationMs}ms - total: ${result.total}, upserted: ${result.upserted}, failed: ${result.failed}`
    );

    return { ...result, durationMs };
  } catch (err) {
    console.error('[fetchTenders] failed:', err.message);
    throw err;
  } finally {
    isRunning = false;
  }
};

/**
 * Registers the two daily cron schedules. Call once on server startup.
 */
export const scheduleFetchTendersJob = () => {
  cron.schedule(env.fetchCronMorning, () => {
    runFetchTendersJob().catch(() => {});
  });

  cron.schedule(env.fetchCronEvening, () => {
    runFetchTendersJob().catch(() => {});
  });

  console.log(
    `[fetchTenders] scheduled at "${env.fetchCronMorning}" and "${env.fetchCronEvening}"`
  );

  if (env.runFetchOnStartup) {
    runFetchTendersJob().catch(() => {});
  }
};
