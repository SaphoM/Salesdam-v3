/**
 * Small helpers for creating/reading metadata-driven records from insurance
 * services, so the domain services reuse the same FieldMeta + auto-number +
 * audit conventions as the generic record controller.
 */
import ObjectMeta from '../../models/ObjectMeta.js';
import FieldMeta from '../../models/FieldMeta.js';
import DynamicRecord from '../../models/DynamicRecord.js';
import { applyAutoNumbers } from '../autoNumberService.js';
import { AppError } from '../../utils/errors.js';

/** Load an active object definition for a tenant, or fail clearly. */
export const getObjectMeta = async (tenantId, apiName) => {
  const obj = await ObjectMeta.findOne({ tenantId, apiName, isActive: true });
  if (!obj) {
    throw new AppError(
      `Object "${apiName}" is not configured for this tenant. ` +
        'Seed the Insurance object pack first.',
      400,
    );
  }
  return obj;
};

/** Tenant-scoped single read. */
export const findOne = (tenantId, objectApiName, filter = {}) =>
  DynamicRecord.findOne({ tenantId, objectApiName, isDeleted: false, ...filter });

/** Tenant-scoped list read. */
export const findMany = (tenantId, objectApiName, filter = {}, sort = { createdAt: 1 }) =>
  DynamicRecord.find({ tenantId, objectApiName, isDeleted: false, ...filter }).sort(sort);

/** Create a record with auto-number fields applied (mirrors recordController). */
export const createDynamic = async ({ tenantId, objectApiName, data = {}, userId, ownerId }) => {
  const obj = await getObjectMeta(tenantId, objectApiName);
  const fields = await FieldMeta.find({ tenantId, objectApiName });
  const record = new DynamicRecord({
    tenantId,
    objectId: obj._id,
    objectApiName,
    ownerId: ownerId || userId,
    createdBy: userId,
    lastModifiedBy: userId,
  });
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) record.setField(key, value);
  }
  await applyAutoNumbers(record, fields, tenantId, objectApiName);
  await record.save();
  return record;
};

/** Apply field changes to an existing record. */
export const updateDynamic = async (record, data = {}, userId) => {
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) record.setField(key, value);
  }
  if (userId) record.lastModifiedBy = userId;
  await record.save();
  return record;
};
