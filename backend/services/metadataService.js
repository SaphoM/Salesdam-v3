import FieldMeta from '../models/FieldMeta.js';
import ObjectMeta from '../models/ObjectMeta.js';
import Layout from '../models/Layout.js';
import { SALESDAM_OBJECTS } from '../config/objects/index.js';
import logger from '../utils/logger.js';

/**
 * Seed default system fields when a new custom object is created.
 * These fields are always present and cannot be deleted.
 */
const seedDefaultFields = async (
  objectMeta,
  tenantId,
  userId,
  nameFieldConfig = {},
) => {
  const {
    nameFieldType = 'text',
    nameFieldLabel = 'Name',
    // Falls back to the ObjectMeta's configured name field so the seeded
    // FieldMeta.apiName can never diverge from ObjectMeta.nameFieldApiName.
    nameFieldApiName = objectMeta.nameFieldApiName || 'name',
    autoNumberPrefix = '',
    autoNumberPadding = 5,
    autoNumberStartAt = 1,
  } = nameFieldConfig;

  const nameField =
    nameFieldType === 'auto_number'
      ? {
          name: nameFieldLabel,
          label: nameFieldLabel,
          apiName: nameFieldApiName,
          type: 'auto_number',
          isRequired: false,
          isSystem: true,
          isReadOnly: true,
          isUnique: true,
          displayOrder: 1,
          section: 'Information',
          column: 1,
          isSearchable: true,
          autoNumberPrefix,
          autoNumberPadding,
          autoNumberStartAt,
        }
      : {
          name: nameFieldLabel,
          label: nameFieldLabel,
          apiName: nameFieldApiName,
          type: 'text',
          isRequired: true,
          isSystem: true,
          maxLength: 255,
          displayOrder: 1,
          section: 'Information',
          column: 1,
          isSearchable: true,
        };

  const systemFields = [
    nameField,
    {
      name: 'Owner',
      label: 'Record Owner',
      apiName: 'owner_id',
      type: 'lookup',
      isSystem: true,
      lookupObjectApiName: 'user',
      displayOrder: 2,
      section: 'System Information',
      column: 1,
    },
    {
      name: 'Description',
      label: 'Description',
      apiName: 'description',
      type: 'textarea',
      isSystem: false,
      isRequired: false,
      displayOrder: 100,
      section: 'Additional Information',
      column: 1,
    },
  ];

  // The name field is first in the list, so if its apiName collides with one of
  // the other seeded fields (e.g. the user named it "description") the name
  // field wins and the colliding default is dropped rather than silently lost
  // to the unique index.
  const seen = new Set();
  const toCreate = systemFields
    .filter((f) => {
      if (seen.has(f.apiName)) return false;
      seen.add(f.apiName);
      return true;
    })
    .map((f) => ({
      tenantId,
      objectId: objectMeta._id,
      objectApiName: objectMeta.apiName,
      createdBy: userId,
      ...f,
    }));

  try {
    await FieldMeta.insertMany(toCreate, { ordered: false });
  } catch (err) {
    // Duplicate-key errors are expected on re-seed and are safe to ignore;
    // anything else means a field failed to be created, which must be visible.
    if (err?.code !== 11000) {
      logger.error(
        `seedDefaultFields failed for object "${objectMeta.apiName}": ${err.message}`,
      );
      throw err;
    }
  }
};

/**
 * Seed default objects for a new tenant (standard CRM objects).
 * Uses object definitions from config/objects/index.js
 */
const seedFieldsForDefinition = async (objectMeta, objDef, tenantId, userId) => {
  const fields = objDef?.fields || [];

  if (fields.length === 0) {
    await seedDefaultFields(objectMeta, tenantId, userId);
    return;
  }

  const toCreate = fields.map((f) => ({
    tenantId,
    objectId: objectMeta._id,
    objectApiName: objectMeta.apiName,
    isSystem: f.isSystem || false,
    createdBy: userId,
    ...f,
  }));

  await FieldMeta.insertMany(toCreate, { ordered: false }).catch(() => {});
};

/**
 * Seed any list of object definitions into a tenant, idempotently.
 * Skips objects that already exist. Used for both the standard CRM pack and
 * the opt-in insurance pack so the seeding logic lives in one place.
 */
const seedObjectDefinitions = async (definitions, tenantId, userId) => {
  const createdObjects = [];
  for (const objDef of definitions) {
    const existing = await ObjectMeta.findOne({
      tenantId,
      apiName: objDef.apiName,
    });
    if (!existing) {
      const obj = await ObjectMeta.create({
        tenantId,
        createdBy: userId,
        ...objDef,
      });
      await seedFieldsForDefinition(obj, objDef, tenantId, userId);
      createdObjects.push(obj);
    }
  }

  return createdObjects;
};

const seedStandardObjects = (tenantId, userId) =>
  seedObjectDefinitions(SALESDAM_OBJECTS, tenantId, userId);

const seedStandardFields = (objectMeta, tenantId, userId) => {
  const object = SALESDAM_OBJECTS.find((obj) => obj.apiName === objectMeta.apiName);
  return seedFieldsForDefinition(objectMeta, object, tenantId, userId);
};

/**
 * Ensure the special "user" object exists in the tenant's metadata.
 * System fields map to User model properties. Custom fields go into profileData.
 * Safe to call multiple times — idempotent.
 */
const ensureUserObject = async (tenantId, userId) => {
  let obj = await ObjectMeta.findOne({ tenantId, apiName: 'user' });

  if (!obj) {
    obj = await ObjectMeta.create({
      tenantId,
      name: 'User',
      label: 'User',
      pluralLabel: 'Users',
      apiName: 'user',
      icon: 'User',
      color: '#6366f1',
      isCustom: false,
      showInNav: false,
      navOrder: 999,
      nameFieldApiName: 'email',
      createdBy: userId,
    });
  }

  // Seed system fields if they don't exist
  const systemFields = [
    {
      apiName: 'firstName',
      label: 'First Name',
      type: 'text',
      isRequired: true,
      isSystem: true,
      displayOrder: 1,
      section: 'User Information',
      column: 1,
    },
    {
      apiName: 'lastName',
      label: 'Last Name',
      type: 'text',
      isRequired: true,
      isSystem: true,
      displayOrder: 2,
      section: 'User Information',
      column: 2,
    },
    {
      apiName: 'email',
      label: 'Email',
      type: 'email',
      isRequired: true,
      isSystem: true,
      displayOrder: 3,
      section: 'User Information',
      column: 1,
    },
    {
      apiName: 'phone',
      label: 'Phone',
      type: 'phone',
      isSystem: true,
      displayOrder: 4,
      section: 'User Information',
      column: 2,
    },
    {
      apiName: 'title',
      label: 'Job Title',
      type: 'text',
      isSystem: true,
      displayOrder: 5,
      section: 'User Information',
      column: 1,
    },
    {
      apiName: 'department',
      label: 'Department',
      type: 'text',
      isSystem: true,
      displayOrder: 6,
      section: 'User Information',
      column: 2,
    },
    {
      apiName: 'systemRole',
      label: 'System Role',
      type: 'picklist',
      isSystem: true,
      displayOrder: 7,
      section: 'Access',
      column: 1,
      picklistValues: [
        { label: 'User', value: 'user', isDefault: true },
        { label: 'Admin', value: 'admin' },
        { label: 'Superuser', value: 'superuser' },
      ],
    },
    {
      apiName: 'role',
      label: 'Role',
      type: 'picklist',
      isSystem: true,
      displayOrder: 9,
      section: 'Access',
      column: 1,
      helpText: 'RBAC role assigned to this user',
    },
    {
      apiName: 'status',
      label: 'Status',
      type: 'picklist',
      isSystem: true,
      displayOrder: 8,
      section: 'Access',
      column: 2,
      picklistValues: [
        { label: 'Active', value: 'active', isDefault: true },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Pending', value: 'pending' },
        { label: 'Suspended', value: 'suspended' },
      ],
    },
  ];

  for (const fieldDef of systemFields) {
    const exists = await FieldMeta.findOne({
      tenantId,
      objectApiName: 'user',
      apiName: fieldDef.apiName,
    });
    if (!exists) {
      await FieldMeta.create({
        tenantId,
        objectId: obj._id,
        objectApiName: 'user',
        name: fieldDef.label,
        createdBy: userId,
        ...fieldDef,
      });
    }
  }

  return obj;
};

export {
  seedDefaultFields,
  seedObjectDefinitions,
  seedStandardObjects,
  seedStandardFields,
  ensureUserObject,
};
