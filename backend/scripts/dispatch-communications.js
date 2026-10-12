/**
 * Communication dispatcher runner (BRD §16.3).
 *
 * Delivers queued policy_communication records via their configured channel.
 * Currently implements email via SMTP; WhatsApp/SMS/Post stubbed.
 *
 * Run via cron (e.g., every 5 minutes):
 *   */5 * * * * cd /path/to/backend && node scripts/dispatch-communications.js >> /var/log/communications.log 2>&1
 *
 * Or invoke programmatically from the scheduler.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { dispatchCommunicationsAllTenants } from '../services/insurance/communicationDispatcher.js';

const run = async () => {
  await connectDB();

  console.log('Dispatching queued communications...');
  try {
    const results = await dispatchCommunicationsAllTenants();
    console.log('Dispatch results:', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Communication dispatch failed:', err);
    process.exit(1);
  }

  await mongoose.connection.close();
  console.log('Communication dispatch complete.');
};

run().catch((err) => {
  console.error('Communication dispatcher failed:', err);
  process.exit(1);
});