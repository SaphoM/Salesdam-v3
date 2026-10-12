import express from 'express';
import ExternalObject from '../models/ExternalObject.js';
import ObjectMeta from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import DynamicRecord from '../models/DynamicRecord.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { checkAppPermission } from '../middleware/permissions.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';
import { seedDefaultFields } from '../services/metadataService.js';

const router = express.Router();
router.use(requireAuth, enforceTenant);

// GET  /api/external-objects
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await ExternalObject.find({
      tenantId: req.tenantId,
      isActive: true,
    })
      .select('-credentials')
      .sort({ name: 1 });
    sendSuccess(res, { data: items });
  }),
);

// GET /api/external-objects/:id
router.get(
  '/:id',
  checkAppPermission('canManageIntegrations'),
  asyncHandler(async (req, res) => {
    const item = await ExternalObject.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).select('-credentials');
    if (!item) throw new AppError('External object not found.', 404);
    sendSuccess(res, { data: item });
  }),
);

// POST /api/external-objects
router.post(
  '/',
  checkAppPermission('canManageIntegrations'),
  asyncHandler(async (req, res) => {
    const {
      name,
      objectApiName,
      description,
      baseUrl,
      dataPath,
      idField,
      category,
      authType,
      credentials,
      defaultHeaders,
      defaultTimeout,
    } = req.body;
    if (!name || !baseUrl)
      throw new AppError('name and baseUrl are required.', 400);

    const item = await ExternalObject.create({
      tenantId: req.tenantId,
      name,
      objectApiName,
      description,
      baseUrl,
      dataPath,
      idField,
      category,
      authType,
      credentials: credentials || {},
      defaultHeaders: defaultHeaders || {},
      defaultTimeout,
      createdBy: req.user._id,
    });

    sendSuccess(
      res,
      { data: { ...item.toObject(), credentials: undefined } },
      'External object created',
      201,
    );
  }),
);

// PUT /api/external-objects/:id
router.put(
  '/:id',
  checkAppPermission('canManageIntegrations'),
  asyncHandler(async (req, res) => {
    const item = await ExternalObject.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!item) throw new AppError('External object not found.', 404);

    const allowed = [
      'name',
      'description',
      'baseUrl',
      'category',
      'authType',
      'credentials',
      'defaultHeaders',
      'defaultTimeout',
      'isActive',
    ];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) item[k] = req.body[k];
    });
    await item.save();

    sendSuccess(
      res,
      { data: { ...item.toObject(), credentials: undefined } },
      'Updated',
    );
  }),
);

// DELETE /api/external-objects/:id
router.delete(
  '/:id',
  checkAppPermission('canManageIntegrations'),
  asyncHandler(async (req, res) => {
    await ExternalObject.deleteOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    sendSuccess(res, {}, 'Deleted');
  }),
);

// POST /api/external-objects/:id/fetch-schema
// Fetches the endpoint and infers field types from the response payload.
router.post(
  '/:id/fetch-schema',
  checkAppPermission('canManageIntegrations'),
  asyncHandler(async (req, res) => {
    const item = await ExternalObject.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).select('+credentials');

    if (!item) {
      throw new AppError('External object not found.', 404);
    }

    const axios = (await import('axios')).default;
    const headers = buildHeaders(item);
    const url = req.body.url || item.listEndpoint || item.baseUrl;
    console.log('Fetching schema from URL:', url); // Debug log

    let responseData;
    try {
      const response = await axios.get(url, {
        headers,
        timeout: item.defaultTimeout || 8000,
      });
      responseData = response.data;
    } catch (err) {
      throw new AppError(`Failed to fetch schema: ${err.message}`, 422);
    }

    // Navigate to the data array using dataPath
    const dataPath = req.body.dataPath || item.dataPath || '';
    let records = responseData;
    if (dataPath) {
      for (const key of dataPath.split('.')) {
        if (records && typeof records === 'object') records = records[key];
      }
    }

    // Take first record to infer schema
    const sample = Array.isArray(records)
      ? records[0]
      : typeof records === 'object'
        ? records
        : null;

    if (!sample) {
      return sendSuccess(
        res,
        { data: { rawResponse: responseData, fieldSuggestions: [] } },
        'No records found at that path',
      );
    }

    // Infer field types from sample values
    const fieldSuggestions = Object.entries(sample).map(([key, value]) => {
      let type = 'text';
      if (typeof value === 'boolean') type = 'boolean';
      else if (typeof value === 'number')
        type = Number.isInteger(value) ? 'number' : 'currency';
      else if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) type = 'datetime';
        else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) type = 'date';
        else if (/^[\w.+\-]+@[\w\-]+\.[a-z]{2,}$/i.test(value)) type = 'email';
        else if (/^https?:\/\//.test(value)) type = 'url';
        else if (/^\+?[\d\s\-().]{7,}$/.test(value)) type = 'phone';
      }
      return {
        externalKey: key,
        fieldApiName:
          key
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
            .slice(0, 40) || 'field',
        fieldLabel: key
          .replace(/[_-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        fieldType: type,
        sampleValue: String(value ?? '').slice(0, 100),
        include: true,
      };
    });

    sendSuccess(res, {
      data: {
        rawResponse: responseData,
        fieldSuggestions,
        recordCount: Array.isArray(records) ? records.length : 1,
      },
    });
  }),
);

// POST /api/external-objects/:id/provision-object
// Creates an ObjectMeta + FieldMeta records for the external object using its fieldMappings.
router.post(
  '/:id/provision-object',
  checkAppPermission('canManageIntegrations'),
  asyncHandler(async (req, res) => {
    const item = await ExternalObject.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
    if (!item) throw new AppError('External object not found.', 404);
    if (!item.objectApiName)
      throw new AppError('objectApiName must be set before provisioning.', 400);

    // Create or update ObjectMeta
    let obj = await ObjectMeta.findOne({
      tenantId: req.tenantId,
      apiName: item.objectApiName,
    });
    if (!obj) {
      obj = await ObjectMeta.create({
        tenantId: req.tenantId,
        name: item.name,
        label: item.name,
        pluralLabel: item.name + 's',
        apiName: item.objectApiName,
        description:
          item.description || `External object synced from ${item.baseUrl}`,
        icon: 'Globe',
        color: '#0ea5e9',
        isCustom: false,
        showInNav: true,
        navOrder: 200,
        createdBy: req.user._id,
      });
      await seedDefaultFields(obj, req.tenantId, req.user._id);
    }

    // Create FieldMeta for each included mapping
    let created = 0;
    for (const mapping of item.fieldMappings || []) {
      if (!mapping.include) continue;
      const exists = await FieldMeta.findOne({
        tenantId: req.tenantId,
        objectApiName: item.objectApiName,
        apiName: mapping.fieldApiName,
      });
      if (!exists) {
        await FieldMeta.create({
          tenantId: req.tenantId,
          objectId: obj._id,
          objectApiName: item.objectApiName,
          name: mapping.fieldLabel || mapping.fieldApiName,
          label: mapping.fieldLabel || mapping.fieldApiName,
          apiName: mapping.fieldApiName,
          type: mapping.fieldType || 'text',
          displayOrder: created + 10,
          section: 'Information',
          column: (created % 2) + 1,
          createdBy: req.user._id,
        });
        created++;
      }
    }

    sendSuccess(
      res,
      { data: { objectApiName: item.objectApiName, fieldsCreated: created } },
      `Object provisioned with ${created} fields`,
    );
  }),
);

// POST /api/external-objects/:id/sync
// Fetches live data from the external endpoint and upserts records into DynamicRecord.
router.post(
  '/:id/sync',
  checkAppPermission('canManageIntegrations'),
  asyncHandler(async (req, res) => {
    const item = await ExternalObject.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).select('+credentials');
    if (!item) throw new AppError('External object not found.', 404);
    if (!item.objectApiName)
      throw new AppError('Provision the object first before syncing.', 400);

    const axios = (await import('axios')).default;
    const headers = buildHeaders(item);
    const url = item.listEndpoint || item.baseUrl;

    let responseData;
    try {
      const response = await axios.get(url, {
        headers,
        timeout: item.defaultTimeout || 8000,
      });
      responseData = response.data;
    } catch (err) {
      throw new AppError(`Sync fetch failed: ${err.message}`, 422);
    }

    // Navigate to records array
    let records = responseData;
    if (item.dataPath) {
      for (const key of item.dataPath.split('.')) {
        if (records && typeof records === 'object') records = records[key];
      }
    }
    if (!Array.isArray(records)) records = [records].filter(Boolean);

    const obj = await ObjectMeta.findOne({
      tenantId: req.tenantId,
      apiName: item.objectApiName,
    });
    if (!obj)
      throw new AppError(
        'Object not provisioned. Run provision-object first.',
        400,
      );

    const idField = item.idField || 'id';
    let upserted = 0;

    for (const rawRecord of records) {
      const externalId = String(rawRecord[idField] ?? '');
      if (!externalId) continue;

      // Find or create the DynamicRecord by externalId stored in data._external_id
      let record = await DynamicRecord.findOne({
        tenantId: req.tenantId,
        objectApiName: item.objectApiName,
        'data._external_id': externalId,
        isDeleted: false,
      });

      if (!record) {
        record = new DynamicRecord({
          tenantId: req.tenantId,
          objectId: obj._id,
          objectApiName: item.objectApiName,
          ownerId: req.user._id,
          createdBy: req.user._id,
          lastModifiedBy: req.user._id,
        });
      }

      // Map fields
      record.setField('_external_id', externalId);
      for (const mapping of item.fieldMappings || []) {
        if (!mapping.include) continue;
        const value = rawRecord[mapping.externalKey];
        if (value !== undefined) record.setField(mapping.fieldApiName, value);
      }
      record.lastModifiedBy = req.user._id;
      await record.save();
      upserted++;
    }

    item.lastSyncedAt = new Date();
    await item.save();

    sendSuccess(
      res,
      { data: { upserted, total: records.length } },
      `Synced ${upserted} records`,
    );
  }),
);

// POST /api/external-objects/:id/test  — fires a GET to the base URL
router.post(
  '/:id/test',
  checkAppPermission('canManageIntegrations'),
  asyncHandler(async (req, res) => {
    const item = await ExternalObject.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).select('+credentials');
    if (!item) throw new AppError('External object not found.', 404);

    const axios = (await import('axios')).default;
    const headers = buildHeaders(item);

    try {
      const response = await axios.get(item.baseUrl, {
        headers,
        timeout: item.defaultTimeout || 5000,
      });
      sendSuccess(
        res,
        { data: { ok: true, status: response.status } },
        'Connection successful',
      );
    } catch (err) {
      sendSuccess(
        res,
        {
          data: { ok: false, error: err.message, status: err.response?.status },
        },
        'Connection failed',
      );
    }
  }),
);

function buildHeaders(item) {
  const headers = {};
  if (item.defaultHeaders) {
    for (const [k, v] of item.defaultHeaders) headers[k] = v;
  }
  if (item.authType === 'bearer' && item.credentials?.token) {
    headers['Authorization'] = `Bearer ${item.credentials.token}`;
  } else if (item.authType === 'basic' && item.credentials?.username) {
    const encoded = Buffer.from(
      `${item.credentials.username}:${item.credentials.password || ''}`,
    ).toString('base64');
    headers['Authorization'] = `Basic ${encoded}`;
  } else if (item.authType === 'api_key' && item.credentials?.apiKey) {
    const headerName = item.credentials.apiKeyHeader || 'X-Api-Key';
    headers[headerName] = item.credentials.apiKey;
  }
  return headers;
}

export { buildHeaders };
export default router;
