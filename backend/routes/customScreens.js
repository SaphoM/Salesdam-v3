import express from 'express';
import CustomScreen from '../models/CustomScreen.js';
import ExternalObject from '../models/ExternalObject.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';

const router = express.Router();
router.use(requireAuth, enforceTenant);

// GET /api/custom-screens?objectApiName=contact
router.get('/', asyncHandler(async (req, res) => {
  const { objectApiName } = req.query;
  const filter = { tenantId: req.tenantId, isActive: true };
  if (objectApiName) filter.objectApiName = objectApiName;

  const screens = await CustomScreen.find(filter).sort({ order: 1, name: 1 });
  sendSuccess(res, { data: screens });
}));

// GET /api/custom-screens/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const screen = await CustomScreen.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!screen) throw new AppError('Screen not found.', 404);
  sendSuccess(res, { data: screen });
}));

// POST /api/custom-screens
router.post('/', asyncHandler(async (req, res) => {
  const { objectApiName, name, tabLabel, description, dataSources, components, order } = req.body;
  if (!objectApiName || !name) throw new AppError('objectApiName and name are required.', 400);

  const screen = await CustomScreen.create({
    tenantId: req.tenantId,
    objectApiName, name,
    tabLabel: tabLabel || name,
    description, dataSources, components,
    order: order ?? 0,
    createdBy: req.user._id,
  });
  sendSuccess(res, { data: screen }, 'Screen created', 201);
}));

// PUT /api/custom-screens/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const screen = await CustomScreen.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!screen) throw new AppError('Screen not found.', 404);

  const allowed = ['name', 'tabLabel', 'description', 'dataSources', 'components', 'order', 'isActive'];
  allowed.forEach(k => { if (req.body[k] !== undefined) screen[k] = req.body[k]; });
  screen.lastModifiedBy = req.user._id;
  await screen.save();
  sendSuccess(res, { data: screen }, 'Screen updated');
}));

// DELETE /api/custom-screens/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await CustomScreen.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
  sendSuccess(res, {}, 'Screen deleted');
}));

// POST /api/custom-screens/:id/fetch-data
// Called from the frontend when rendering a screen — executes data sources
// and returns the fetched data. Body: { recordId, recordData }
router.post('/:id/fetch-data', asyncHandler(async (req, res) => {
  const screen = await CustomScreen.findOne({ _id: req.params.id, tenantId: req.tenantId })
    .populate('dataSources.externalObjectId');
  if (!screen) throw new AppError('Screen not found.', 404);

  const { recordData = {} } = req.body;
  const results = {};

  for (const source of (screen.dataSources || [])) {
    try {
      const axios = (await import('axios')).default;
      let url     = interpolate(source.url, recordData);
      let headers = { 'Content-Type': 'application/json' };

      // Merge ExternalObject auth
      const ext = source.externalObjectId;
      if (ext) {
        if (!url.startsWith('http')) url = ext.baseUrl.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
        if (ext.authType === 'bearer' && ext.credentials?.token) {
          headers['Authorization'] = `Bearer ${ext.credentials.token}`;
        } else if (ext.authType === 'api_key' && ext.credentials?.apiKey) {
          headers[ext.credentials.apiKeyHeader || 'X-Api-Key'] = ext.credentials.apiKey;
        }
        if (ext.defaultHeaders) for (const [k, v] of ext.defaultHeaders) headers[k] = v;
      }

      if (source.headers) for (const [k, v] of (source.headers instanceof Map ? source.headers : Object.entries(source.headers))) headers[k] = v;

      const method = (source.method || 'GET').toUpperCase();
      const body   = source.body ? JSON.parse(interpolate(source.body, recordData)) : undefined;

      const resp = await axios({ method, url, headers, data: body, timeout: 10000 });
      let data = resp.data;

      // Extract via dot-path if resultPath is set
      if (source.resultPath) {
        source.resultPath.split('.').forEach(key => { data = data?.[key]; });
      }

      results[source.name] = data;
    } catch (err) {
      results[source.name] = { _error: err.message };
    }
  }

  sendSuccess(res, { data: results });
}));

function interpolate(str, data) {
  if (!str) return str;
  return String(str).replace(/\{([^}]+)\}/g, (match, key) => data[key] ?? match);
}

export default router;
