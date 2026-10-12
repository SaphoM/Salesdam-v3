import ObjectMeta from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import logger from '../utils/logger.js';
import { SALESDAM_OBJECTS } from '../config/objects/index.js';

/**
 * Seed Salesdam objects for a new tenant
 * Creates all standard CRM objects with predefined fields
 * Objects are imported from config/objects/
 */
export const seedSalesdamObjects = async (tenantId, createdById) => {
  try {
    logger.info(`Seeding Salesdam objects for tenant: ${tenantId}`);

    for (const objectConfig of SALESDAM_OBJECTS) {
      // Extract fields from config (don't mutate the original)
      const { fields, ...objectConfigWithoutFields } = objectConfig;
      const fieldsToCreate = fields || [];

      // Check if object already exists
      let objectMeta = await ObjectMeta.findOne({
        tenantId,
        apiName: objectConfig.apiName,
      });

      // Create object if it doesn't exist
      if (!objectMeta) {
        objectMeta = await ObjectMeta.create({
          ...objectConfigWithoutFields,
          tenantId,
          createdBy: createdById,
          lastModifiedBy: createdById,
        });
        logger.info(`Created object: ${objectConfig.apiName} (${objectMeta._id})`);
      } else {
        logger.info(`Object ${objectConfig.apiName} already exists for tenant ${tenantId}`);
      }

      // Always ensure fields are created (in case object existed but fields didn't)
      if (fieldsToCreate.length > 0) {
        // Check which fields already exist
        const existingFieldApiNames = await FieldMeta.find(
          { objectId: objectMeta._id, tenantId },
          { apiName: 1 }
        ).then((fields) => new Set(fields.map((f) => f.apiName)));

        // Only create fields that don't already exist
        const fieldsToAdd = fieldsToCreate.filter((f) => !existingFieldApiNames.has(f.apiName));

        if (fieldsToAdd.length > 0) {
          const fieldDocs = fieldsToAdd.map((field) => ({
            ...field,
            tenantId,
            objectId: objectMeta._id,
            objectApiName: objectConfig.apiName,
            createdBy: createdById,
            lastModifiedBy: createdById,
          }));

          const createdFields = await FieldMeta.insertMany(fieldDocs);
          logger.info(`Created ${createdFields.length} fields for object: ${objectConfig.apiName}`);
        } else {
          logger.info(`All fields already exist for object: ${objectConfig.apiName}`);
        }
      } else {
        logger.warn(`No fields defined for object: ${objectConfig.apiName}`);
      }
    }

    logger.info(`Successfully seeded Salesdam objects for tenant: ${tenantId}`);
    return true;
  } catch (error) {
    logger.error(`Error seeding Salesdam objects for tenant ${tenantId}:`, error);
    throw error;
  }
};

export default { seedSalesdamObjects };
