import ObjectMeta, { VALIDATION_RULE_LIMITS } from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import DynamicRecord from '../models/DynamicRecord.js';
import {
  asyncHandler,
  sendSuccess,
  AppError,
  paginate,
} from '../utils/errors.js';
import { audit } from '../utils/auditLogger.js';
import {
  seedDefaultFields,
  ensureUserObject,
} from '../services/metadataService.js';
import { validateFormula } from '../services/formulaParser.js';
import { buildSampleContext } from '../services/validationEngine.js';

// API names the platform reserves for system fields on every object, so the
// user's name field can't be created on top of one of them.
const RESERVED_FIELD_API_NAMES = ['owner_id', 'description', 'id'];

// Upper bound on object-level validation rules, to keep the per-save formula
// evaluation cost bounded.
const MAX_VALIDATION_RULES = 50;

/**
 * GET /api/objects
 * List all objects for the current tenant.
 */
const listObjects = asyncHandler(async (req, res) => {
  const { includeFields, navOnly } = req.query;
  const filter = { tenantId: req.tenantId, isActive: true };
  if (navOnly === 'true') filter.showInNav = true;

  // Filter by workspace allowedObjects if configured
  if (req.tenant?.allowedObjects?.length > 0) {
    filter.apiName = { $in: req.tenant.allowedObjects };
  }

  const objects = await ObjectMeta.find(filter).sort({ navOrder: 1, name: 1 });

  if (includeFields === 'true') {
    const withFields = await Promise.all(
      objects.map(async (obj) => {
        const fields = await FieldMeta.find({
          objectId: obj._id,
          tenantId: req.tenantId,
        }).sort({ displayOrder: 1, apiName: 1 });
        return { ...obj.toObject(), fields };
      }),
    );
    return sendSuccess(res, { data: withFields });
  }

  sendSuccess(res, { data: objects });
});

/**
 * GET /api/objects/:apiName
 */
const getObject = asyncHandler(async (req, res) => {
  const { apiName } = req.params;

  // Auto-seed the user object if requested but not yet created
  if (apiName === 'user') {
    await ensureUserObject(req.tenantId, req.user._id);
  }

  const obj = await ObjectMeta.findOne({ tenantId: req.tenantId, apiName });
  if (!obj) throw new AppError(`Object "${apiName}" not found.`, 404);

  const fields = await FieldMeta.find({
    objectId: obj._id,
    tenantId: req.tenantId,
  }).sort({ displayOrder: 1, apiName: 1 });

  sendSuccess(res, { data: { ...obj.toObject(), fields } });
});

/**
 * POST /api/objects
 */
const createObject = asyncHandler(async (req, res) => {
  const {
    name,
    label,
    pluralLabel,
    apiName,
    description,
    icon,
    color,
    nameFieldApiName,
    enableHistory,
    showInNav,
    navOrder,
    sharingModel,
    kanbanConfig,
    nameFieldType,
    nameFieldLabel,
    autoNumberPrefix,
    autoNumberPadding,
    autoNumberStartAt,
  } = req.body;

  // Normalise the name-field config once. Each value falls back to its default
  // only when the client omitted it (or sent a blank string).
  const nameFieldConfig = {
    nameFieldType: nameFieldType || 'text',
    nameFieldLabel: nameFieldLabel?.trim() || 'Name',
    nameFieldApiName: nameFieldApiName?.trim().toLowerCase() || 'name',
    autoNumberPrefix: autoNumberPrefix || '',
    autoNumberPadding: parseInt(autoNumberPadding, 10) || 5,
    autoNumberStartAt: parseInt(autoNumberStartAt, 10) || 1,
  };

  if (!['text', 'auto_number'].includes(nameFieldConfig.nameFieldType)) {
    throw new AppError('nameFieldType must be "text" or "auto_number".', 400);
  }

  if (!/^[a-z][a-z0-9_]{1,39}$/.test(nameFieldConfig.nameFieldApiName)) {
    throw new AppError(
      'Name field API name must start with a letter and contain only lowercase letters, numbers, and underscores.',
      400,
    );
  }

  if (RESERVED_FIELD_API_NAMES.includes(nameFieldConfig.nameFieldApiName)) {
    throw new AppError(
      `"${nameFieldConfig.nameFieldApiName}" is reserved and cannot be used as the name field API name.`,
      400,
    );
  }

  // Check apiName uniqueness per tenant
  const existing = await ObjectMeta.findOne({
    tenantId: req.tenantId,
    apiName,
  });
  if (existing)
    throw new AppError(
      `An object with API name "${apiName}" already exists.`,
      409,
    );

  // Enforce tenant limits
  if (req.tenant) {
    const count = await ObjectMeta.countDocuments({
      tenantId: req.tenantId,
      isActive: true,
    });
    if (count >= req.tenant.limits.maxObjects) {
      throw new AppError(
        `Object limit reached (max ${req.tenant.limits.maxObjects}).`,
        429,
      );
    }
  }

  const obj = await ObjectMeta.create({
    tenantId: req.tenantId,
    name,
    label,
    pluralLabel,
    apiName,
    description,
    icon,
    color,
    // Kept in sync with the FieldMeta seeded below.
    nameFieldApiName: nameFieldConfig.nameFieldApiName,
    enableHistory,
    showInNav,
    navOrder,
    sharingModel,
    kanbanConfig,
    isCustom: true,
    isActive: true,
    createdBy: req.user._id,
  });

  // Seed default system fields — pass name field config so the name field is
  // created with the label, API name, and type the user specified.
  await seedDefaultFields(obj, req.tenantId, req.user._id, nameFieldConfig);

  // Add newly created custom object to tenant's allowedObjects if the list is configured
  if (req.tenant?.allowedObjects?.length > 0) {
    await req.tenant.updateOne({
      $addToSet: { allowedObjects: apiName },
      $inc: { 'usage.objects': 1 },
    });
  } else {
    // Update tenant usage if no allowedObjects restriction
    await req.tenant?.updateOne({ $inc: { 'usage.objects': 1 } });
  }

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    userEmail: req.user.email,
    action: 'create',
    resource: 'ObjectMeta',
    resourceId: obj._id,
    req,
  });

  const fields = await FieldMeta.find({ objectId: obj._id }).sort({
    displayOrder: 1,
  });
  sendSuccess(
    res,
    { data: { ...obj.toObject(), fields } },
    'Object created successfully',
    201,
  );
});

/**
 * PUT /api/objects/:apiName
 */
const updateObject = asyncHandler(async (req, res) => {
  const { apiName } = req.params;
  const obj = await ObjectMeta.findOne({ tenantId: req.tenantId, apiName });
  if (!obj) throw new AppError(`Object "${apiName}" not found.`, 404);

  const allowedUpdates = [
    'name',
    'label',
    'pluralLabel',
    'description',
    'icon',
    'color',
    'enableHistory',
    'enableActivities',
    'enableNotes',
    'enableFiles',
    'showInNav',
    'navOrder',
    'sharingModel',
    'searchable',
    'searchFields',
    'actionButtons',
    'validationRules',
    'kanbanConfig',
  ];

  // Validate any validation rule expressions before saving
  if (
    Array.isArray(req.body.validationRules) &&
    req.body.validationRules.length > 0
  ) {
    const rules = req.body.validationRules;

    if (rules.length > MAX_VALIDATION_RULES) {
      throw new AppError(
        `An object can have at most ${MAX_VALIDATION_RULES} validation rules.`,
        400,
      );
    }

    // Length caps, checked here so the user gets a clear message rather than a
    // raw Mongoose validation error from the schema's maxlength.
    const tooLong = [];
    for (const rule of rules) {
      const label = rule.name || 'Unnamed rule';
      for (const [key, limit] of Object.entries(VALIDATION_RULE_LIMITS)) {
        const value = rule[key];
        if (typeof value === 'string' && value.trim().length > limit) {
          tooLong.push(
            `"${label}": ${key} is ${value.trim().length} characters (max ${limit}).`,
          );
        }
      }
    }
    if (tooLong.length > 0) {
      throw new AppError(tooLong.join('\n'), 400);
    }

    const fields = await FieldMeta.find({
      tenantId: req.tenantId,
      objectApiName: apiName,
    });
    const sampleCtx = buildSampleContext(fields);
    const invalidRules = [];
    for (const rule of rules) {
      // Only active rules are enforced at save time, so only they must parse.
      if (rule.isActive === false || !rule.expression) continue;
      const result = validateFormula(rule.expression.trim(), sampleCtx);
      if (!result.valid) {
        invalidRules.push(`"${rule.name || 'Unnamed rule'}": ${result.error}`);
      }
    }
    if (invalidRules.length > 0) {
      throw new AppError(
        `Invalid validation rule expression(s):\n${invalidRules.join('\n')}`,
        400,
      );
    }
  }

  allowedUpdates.forEach((key) => {
    if (req.body[key] !== undefined) obj[key] = req.body[key];
  });
  obj.lastModifiedBy = req.user._id;
  await obj.save();

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'update',
    resource: 'ObjectMeta',
    resourceId: obj._id,
    req,
  });

  sendSuccess(res, { data: obj }, 'Object updated successfully');
});

/**
 * DELETE /api/objects/:apiName
 */
const deleteObject = asyncHandler(async (req, res) => {
  const { apiName } = req.params;
  const obj = await ObjectMeta.findOne({ tenantId: req.tenantId, apiName });
  if (!obj) throw new AppError(`Object "${apiName}" not found.`, 404);
  if (!obj.isCustom)
    throw new AppError('System objects cannot be deleted.', 403);
  if (obj.isSystem)
    throw new AppError('System objects cannot be deleted.', 403);

  // Counted up front so the response can report what the cascade removed.
  const [fieldCount, recordCount] = await Promise.all([
    FieldMeta.countDocuments({ tenantId: req.tenantId, objectId: obj._id }),
    DynamicRecord.countDocuments({
      tenantId: req.tenantId,
      objectApiName: apiName,
    }),
  ]);

  // Hard-delete the object. The pre-deleteOne hook on ObjectMeta cascades to
  // fields, records, layouts, counters, screens and config, and strips the
  // object from workspace/tenant allow-lists, object groups and permissions.
  await obj.deleteOne();

  await req.tenant?.updateOne({ $inc: { 'usage.objects': -1 } });

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'delete',
    resource: 'ObjectMeta',
    resourceId: obj._id,
    details: { apiName, fieldCount, recordCount },
    req,
  });

  sendSuccess(
    res,
    { data: { apiName, fieldCount, recordCount } },
    'Object deleted successfully',
  );
});

export { listObjects, getObject, createObject, updateObject, deleteObject };
