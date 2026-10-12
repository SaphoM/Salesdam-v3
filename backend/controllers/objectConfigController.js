import ObjectTypeConfig from '../models/ObjectTypeConfig.js';
import Tenant from '../models/Tenant.js';
import { asyncHandler, sendSuccess } from '../utils/errors.js';

/**
 * GET /api/object-config/:objectApiName
 * Returns the config doc (or sensible defaults if none exists yet).
 */
const getConfig = asyncHandler(async (req, res) => {
  const { objectApiName } = req.params;
  let config = await ObjectTypeConfig.findOne({ tenantId: req.tenantId, objectApiName });

  if (!config) {
    // Return defaults without persisting
    config = {
      objectApiName,
      conversionSettings: {
        enabled: true,
        convertedStatus: 'Converted',
        autoCreateOpportunity: false,
        requireOpportunity: false,
        defaultOpportunityName: '{company} - Opportunity',
        fieldMappings: [],
      },
      emailToLead:  { enabled: false, routingEmail: '', defaultStatus: 'New', defaultLeadSource: 'Email', useEmailSubjectAsName: true, addEmailBodyAsDescription: true },
      emailToCase:  { enabled: false, routingEmail: '', defaultStatus: 'New', defaultPriority: 'Medium', useEmailSubjectAsSubject: true, addEmailBodyAsDescription: true },
    };
  }

  sendSuccess(res, { data: config });
});

/**
 * PUT /api/object-config/:objectApiName
 * Upsert the config document.
 */
const updateConfig = asyncHandler(async (req, res) => {
  const { objectApiName } = req.params;
  const tenant = await Tenant.findById(req.tenantId);

  // Auto-generate routing emails based on tenant slug if they are not set
  const body = { ...req.body };

  if (objectApiName === 'lead' && body.emailToLead) {
    if (!body.emailToLead.routingEmail && tenant?.slug) {
      body.emailToLead.routingEmail = `lead@${tenant.slug}.crm.io`;
    }
  }
  if (objectApiName === 'case' && body.emailToCase) {
    if (!body.emailToCase.routingEmail && tenant?.slug) {
      body.emailToCase.routingEmail = `support@${tenant.slug}.crm.io`;
    }
  }

  const config = await ObjectTypeConfig.findOneAndUpdate(
    { tenantId: req.tenantId, objectApiName },
    { $set: { ...body, tenantId: req.tenantId, objectApiName } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  sendSuccess(res, { data: config }, 'Configuration saved');
});

export { getConfig, updateConfig };
