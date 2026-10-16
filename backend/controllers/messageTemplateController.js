import messageTemplateService from '../services/messageTemplateService.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';

const listTemplates = asyncHandler(async (req, res) => {
  const templates = await messageTemplateService.listTemplates({
    tenantId: req.tenantId,
    channel: req.query.channel,
    isActive: req.query.isActive,
  });
  sendSuccess(res, { data: templates });
});

const getTemplate = asyncHandler(async (req, res) => {
  const template = await messageTemplateService.getTemplate({
    tenantId: req.tenantId,
    id: req.params.id,
  });
  sendSuccess(res, { data: template });
});

const createTemplate = asyncHandler(async (req, res) => {
  const template = await messageTemplateService.createTemplate({
    tenantId: req.tenantId,
    data: req.body,
    user: req.user,
  });
  sendSuccess(res, { data: template }, 'Message template created', 201);
});

const updateTemplate = asyncHandler(async (req, res) => {
  const template = await messageTemplateService.updateTemplate({
    tenantId: req.tenantId,
    id: req.params.id,
    updates: req.body,
  });
  sendSuccess(res, { data: template }, 'Message template updated');
});

const deleteTemplate = asyncHandler(async (req, res) => {
  await messageTemplateService.deleteTemplate({ tenantId: req.tenantId, id: req.params.id });
  sendSuccess(res, {}, 'Message template deleted');
});

// Preview merge-field resolution without sending.
const previewTemplate = asyncHandler(async (req, res) => {
  const { values } = req.body || {};
  if (!values || typeof values !== 'object') {
    throw new AppError('A values object is required.', 400);
  }
  const template = await messageTemplateService.getTemplate({
    tenantId: req.tenantId,
    id: req.params.id,
  });
  sendSuccess(res, {
    data: {
      subject: messageTemplateService.render(template.subject, values),
      body: messageTemplateService.render(template.body, values),
    },
  });
});

export { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, previewTemplate };
