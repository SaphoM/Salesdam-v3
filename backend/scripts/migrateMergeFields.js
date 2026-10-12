import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import FieldMeta from '../models/FieldMeta.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const fieldMappings = {
  // Lead fields
  'address.street': 'street',
  'address.city': 'city',
  'address.province': 'province',
  'address.zip': 'zip',
  'address.country': 'country',

  // Account fields
  'billing_address.street': 'billing_street',
  'billing_address.city': 'billing_city',
  'billing_address.province': 'billing_province',
  'billing_address.zip': 'billing_zip',
  'billing_address.country': 'billing_country',
  'shipping_address.street': 'shipping_street',
  'shipping_address.city': 'shipping_city',
  'shipping_address.province': 'shipping_province',
  'shipping_address.zip': 'shipping_zip',
  'shipping_address.country': 'shipping_country',

  // Contact fields
  'mailing_address.street': 'mailing_street',
  'mailing_address.city': 'mailing_city',
  'mailing_address.province': 'mailing_province',
  'mailing_address.zip': 'mailing_zip',
  'mailing_address.country': 'mailing_country',
  'other_address.street': 'other_street',
  'other_address.city': 'other_city',
  'other_address.province': 'other_province',
  'other_address.zip': 'other_zip',
  'other_address.country': 'other_country',

  // Order fields
  'order.address.street': 'street',
  'order.address.city': 'city',
  'order.address.province': 'province',
  'order.address.zip': 'zip',
  'order.address.country': 'country',
};

const migrate = async () => {
  try {
    await connectDB();
    logger.info('Starting merge field migration...');

    let totalUpdated = 0;

    for (const [oldApiName, newApiName] of Object.entries(fieldMappings)) {
      const result = await FieldMeta.updateMany(
        { apiName: oldApiName },
        { $set: { apiName: newApiName } }
      );

      if (result.modifiedCount > 0) {
        logger.info(`✓ Updated ${result.modifiedCount} field(s): ${oldApiName} → ${newApiName}`);
        totalUpdated += result.modifiedCount;
      }
    }

    logger.info(`\n✅ Migration complete! Total fields updated: ${totalUpdated}\n`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
