import configurationService from '../services/configurationService.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';

/**
 * GET /api/v1/configuration
 * Effective configuration for the caller's tenant (tenant overrides applied
 * over platform defaults). Readable by any authenticated tenant user so the
 * frontend can consume branded/settings values.
 */
const getEffectiveConfig = asyncHandler(async (req, res) => {
  const data = await configurationService.getEffective(req.tenantId);
  sendSuccess(res, { data });
});

/**
 * PUT /api/v1/configuration/:key
 * Set a tenant-level override (admin only). Unknown or non-editable keys are
 * rejected — tenants may only override settings the operator exposes.
 */
const updateTenantConfig = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const editable = await configurationService.isTenantEditable(key);
  if (!editable) {
    throw new AppError(
      `Configuration key '${key}' is not available for tenant override.`,
      403,
    );
  }
  if (req.body?.value === undefined) {
    throw new AppError('A "value" is required.', 400);
  }

  const doc = await configurationService.set({
    key,
    tenantId: req.tenantId,
    value: req.body.value,
    updatedBy: req.user._id,
  });
  sendSuccess(res, { data: doc }, 'Configuration saved');
});

/**
 * DELETE /api/v1/configuration/:key
 * Clear a tenant override so the platform default applies again (admin only).
 */
const resetTenantConfig = asyncHandler(async (req, res) => {
  const removed = await configurationService.clear(req.params.key, req.tenantId);
  sendSuccess(
    res,
    { data: { removed } },
    removed ? 'Override cleared' : 'No override was set',
  );
});

/**
 * GET /api/v1/configuration/defaults  (superuser)
 * Platform-wide defaults plus code-level defaults, shown to the operator.
 */
const getSystemDefaults = asyncHandler(async (req, res) => {
  const data = await configurationService.getEffective(null);
  sendSuccess(res, { data });
});

/**
 * PUT /api/v1/configuration/defaults/:key  (superuser)
 * Create or update a platform-wide default for every tenant.
 */
const setSystemDefault = asyncHandler(async (req, res) => {
  const { key } = req.params;
  if (req.body?.value === undefined) {
    throw new AppError('A "value" is required.', 400);
  }
  const doc = await configurationService.set({
    key,
    tenantId: null,
    value: req.body.value,
    dataType: req.body.dataType,
    category: req.body.category,
    label: req.body.label,
    description: req.body.description,
    editableByTenant: req.body.editableByTenant,
    updatedBy: req.user._id,
  });
  sendSuccess(res, { data: doc }, 'Platform default saved');
});

/**
 * DELETE /api/v1/configuration/defaults/:key  (superuser)
 * Remove a stored platform-wide default; the code-level default (if any)
 * applies again.
 */
const resetSystemDefault = asyncHandler(async (req, res) => {
  const removed = await configurationService.clear(req.params.key, null);
  sendSuccess(
    res,
    { data: { removed } },
    removed ? 'Platform default cleared' : 'No platform default was set',
  );
});

export {
  getEffectiveConfig,
  updateTenantConfig,
  resetTenantConfig,
  getSystemDefaults,
  setSystemDefault,
  resetSystemDefault,
};
