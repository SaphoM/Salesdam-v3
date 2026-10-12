import 'dotenv/config.js';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import FieldMeta from '../models/FieldMeta.js';
import ObjectMeta from '../models/ObjectMeta.js';
import logger from '../utils/logger.js';

/**
 * Migration script to fix missing auto-number fields for invoice and quote objects.
 * Run this if you've upgraded and already have invoice and quote objects in the database.
 */
const fixAutoNumbers = async () => {
  await connectDB();
  logger.info('Starting auto-number field migration...');

  try {
    const tenants = await mongoose.connection.collection('tenants').find({}).toArray();
    logger.info(`Found ${tenants.length} tenant(s)`);

    for (const tenant of tenants) {
      logger.info(`\nProcessing tenant: ${tenant._id}`);

      // Fix Invoice auto-number field
      const invoiceObj = await ObjectMeta.findOne({
        tenantId: tenant._id,
        apiName: 'invoice',
      });

      if (invoiceObj) {
        const existingInvoiceField = await FieldMeta.findOne({
          tenantId: tenant._id,
          objectApiName: 'invoice',
          apiName: 'invoice_number',
        });

        if (existingInvoiceField && existingInvoiceField.type !== 'auto_number') {
          // Update existing field to be auto-number
          await FieldMeta.updateOne(
            {
              tenantId: tenant._id,
              objectApiName: 'invoice',
              apiName: 'invoice_number',
            },
            {
              $set: {
                type: 'auto_number',
                autoNumberPrefix: 'INV-',
                autoNumberPadding: 4,
                autoNumberStartAt: 1000,
              },
            }
          );
          logger.info('✓ Updated invoice_number field to auto_number');
        } else if (!existingInvoiceField) {
          // Create new auto-number field
          await FieldMeta.create({
            tenantId: tenant._id,
            objectId: invoiceObj._id,
            objectApiName: 'invoice',
            name: 'Invoice Number',
            label: 'Invoice Number',
            apiName: 'invoice_number',
            type: 'auto_number',
            isRequired: true,
            isSystem: true,
            isReadOnly: true,
            displayOrder: 10,
            section: 'Invoice Information',
            autoNumberPrefix: 'INV-',
            autoNumberPadding: 4,
            autoNumberStartAt: 1000,
          });
          logger.info('✓ Created invoice_number auto-number field');
        } else {
          logger.info('✓ invoice_number field is already configured correctly');
        }
      } else {
        logger.info('- Invoice object not found, skipping');
      }

      // Fix Quote auto-number field
      const quoteObj = await ObjectMeta.findOne({
        tenantId: tenant._id,
        apiName: 'quote',
      });

      if (quoteObj) {
        const existingQuoteField = await FieldMeta.findOne({
          tenantId: tenant._id,
          objectApiName: 'quote',
          apiName: 'quote_number',
        });

        if (existingQuoteField && existingQuoteField.type !== 'auto_number') {
          // Update existing field to be auto-number
          await FieldMeta.updateOne(
            {
              tenantId: tenant._id,
              objectApiName: 'quote',
              apiName: 'quote_number',
            },
            {
              $set: {
                type: 'auto_number',
                autoNumberPrefix: 'QU-',
                autoNumberPadding: 4,
                autoNumberStartAt: 1000,
              },
            }
          );
          logger.info('✓ Updated quote_number field to auto_number');
        } else if (!existingQuoteField) {
          // Create new auto-number field
          await FieldMeta.create({
            tenantId: tenant._id,
            objectId: quoteObj._id,
            objectApiName: 'quote',
            name: 'Quote Number',
            label: 'Quote Number',
            apiName: 'quote_number',
            type: 'auto_number',
            isRequired: true,
            isSystem: true,
            isReadOnly: true,
            displayOrder: 10,
            section: 'Quote Information',
            autoNumberPrefix: 'QU-',
            autoNumberPadding: 4,
            autoNumberStartAt: 1000,
          });
          logger.info('✓ Created quote_number auto-number field');
        } else {
          logger.info('✓ quote_number field is already configured correctly');
        }
      } else {
        logger.info('- Quote object not found, skipping');
      }
    }

    logger.info('\n✅ Migration complete!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
};

fixAutoNumbers().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
