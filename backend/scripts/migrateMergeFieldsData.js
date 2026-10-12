import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import FieldMeta from '../models/FieldMeta.js';
import DynamicRecord from '../models/DynamicRecord.js';
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
};

const objectFieldMappings = {
  lead: ['address'],
  account: ['billing_address', 'shipping_address'],
  contact: ['mailing_address', 'other_address'],
  order: ['address'],
};

const migrate = async () => {
  try {
    await connectDB();
    logger.info('Starting merge field data migration...');

    let fieldsUpdated = 0;
    let recordsUpdated = 0;

    // Step 1: Update FieldMeta
    logger.info('\n--- Updating FieldMeta ---');
    for (const [oldApiName, newApiName] of Object.entries(fieldMappings)) {
      const result = await FieldMeta.updateMany(
        { apiName: oldApiName },
        { $set: { apiName: newApiName } }
      );

      if (result.modifiedCount > 0) {
        logger.info(`✓ Updated ${result.modifiedCount} field(s): ${oldApiName} → ${newApiName}`);
        fieldsUpdated += result.modifiedCount;
      }
    }

    // Step 2: Migrate data in DynamicRecords
    logger.info('\n--- Migrating DynamicRecord data ---');
    for (const [objectApiName, nestedObjects] of Object.entries(objectFieldMappings)) {
      const records = await DynamicRecord.find({ objectApiName, isDeleted: false });
      logger.info(`Processing ${records.length} ${objectApiName} records...`);

      for (const record of records) {
        let hasChanges = false;

        for (const nestedObjName of nestedObjects) {
          if (record.data && record.data[nestedObjName]) {
            const nestedObj = record.data[nestedObjName];

            // Move nested object properties to top level with prefixed names
            for (const [key, value] of Object.entries(nestedObj)) {
              const newFieldName = nestedObjName === 'address'
                ? key
                : `${nestedObjName.replace('_address', '')}_${key}`;

              record.data[newFieldName] = value;
              hasChanges = true;
            }

            // Remove the nested object
            delete record.data[nestedObjName];
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await record.save();
          recordsUpdated++;
        }
      }
    }

    logger.info(`\n✅ Migration complete!`);
    logger.info(`   Fields updated: ${fieldsUpdated}`);
    logger.info(`   Records updated: ${recordsUpdated}\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
