import 'dotenv/config.js';
import mongoose from 'mongoose';
import ObjectMeta from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import Tenant from '../models/Tenant.js';
import logger from '../utils/logger.js';
import { supportDocumentObject } from '../config/objects/supportDocument.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const seedSupportDocumentsForTenant = async (tenantId, userId) => {
  try {
    const { fields, ...objectConfigWithoutFields } = supportDocumentObject;
    const fieldsToCreate = fields || [];

    // Check if object already exists
    let objectMeta = await ObjectMeta.findOne({
      tenantId,
      apiName: supportDocumentObject.apiName,
    });

    if (!objectMeta) {
      objectMeta = await ObjectMeta.create({
        ...objectConfigWithoutFields,
        tenantId,
        createdBy: userId,
        lastModifiedBy: userId,
      });
      logger.info(`✓ Created Support Document object for tenant ${tenantId}`);
    } else {
      logger.info(`◐ Support Document object already exists for tenant ${tenantId}`);
    }

    // Create fields
    if (fieldsToCreate.length > 0) {
      const existingFieldApiNames = await FieldMeta.find(
        { objectId: objectMeta._id, tenantId },
        { apiName: 1 }
      ).then((fields) => new Set(fields.map((f) => f.apiName)));

      const fieldsToAdd = fieldsToCreate.filter(
        (f) => !existingFieldApiNames.has(f.apiName)
      );

      if (fieldsToAdd.length > 0) {
        const fieldDocs = fieldsToAdd.map((field) => ({
          ...field,
          tenantId,
          objectId: objectMeta._id,
          objectApiName: supportDocumentObject.apiName,
          createdBy: userId,
          lastModifiedBy: userId,
        }));

        await FieldMeta.insertMany(fieldDocs);
        logger.info(`  └─ Created ${fieldsToAdd.length} fields`);
      }
    }

    // Update tenant's allowedObjects if needed
    const tenant = await Tenant.findById(tenantId);
    if (tenant && !tenant.allowedObjects?.includes('support_document')) {
      tenant.allowedObjects = tenant.allowedObjects || [];
      tenant.allowedObjects.push('support_document');
      await tenant.save();
      logger.info(`  └─ Added support_document to allowedObjects`);
    }

    return true;
  } catch (error) {
    logger.error(`Failed to seed Support Document for tenant ${tenantId}:`, error);
    return false;
  }
};

const main = async () => {
  await connectDB();

  logger.info('\n📋 Starting Support Document seeding...\n');

  try {
    // Get all tenants
    const tenants = await Tenant.find({});

    if (tenants.length === 0) {
      logger.warn('No tenants found in database');
      process.exit(0);
    }

    logger.info(`Found ${tenants.length} tenant(s)\n`);

    let successCount = 0;
    let failureCount = 0;

    for (const tenant of tenants) {
      logger.info(`Processing tenant: ${tenant.name} (${tenant._id})`);

      const userId = tenant.createdBy || new mongoose.Types.ObjectId();
      const success = await seedSupportDocumentsForTenant(tenant._id, userId);

      if (success) {
        successCount++;
      } else {
        failureCount++;
      }

      logger.info('');
    }

    logger.info(`\n✅ Seeding complete!`);
    logger.info(`   ✓ Successful: ${successCount}/${tenants.length}`);
    if (failureCount > 0) {
      logger.warn(`   ✗ Failed: ${failureCount}/${tenants.length}`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

main();
