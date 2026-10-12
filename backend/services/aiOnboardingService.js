import OpenAI from 'openai';
import Tenant from '../models/Tenant.js';
import ObjectMeta from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import Automation from '../models/Automation.js';
import logger from '../utils/logger.js';
import { seedStandardObjects } from './metadataService.js';

/**
 * Industry/useCase -> workspace templates.
 * When OpenAI is available, we call the API for richer generation.
 * Otherwise we use these built-in templates as fallback.
 */
const WORKSPACE_TEMPLATES = {
  real_estate: {
    objects: ['property', 'listing', 'showing'],
    description: 'Real estate CRM with property and listing management',
  },
  healthcare: {
    objects: ['patient', 'appointment', 'provider'],
    description: 'Healthcare CRM with patient and appointment management',
  },
  ecommerce: {
    objects: ['customer', 'order', 'product'],
    description: 'E-commerce CRM with customer and order management',
  },
  default: {
    objects: [],
    description: 'General purpose CRM',
  },
};

/**
 * Run AI onboarding for a new tenant.
 * Generates custom objects, fields, and sample automations based on industry/useCase.
 */
const runAIOnboarding = async (tenantId, userId, { industry, useCase }) => {
  try {
    // First seed standard CRM objects (contact, account, lead, etc.)
    const standardObjects = await seedStandardObjects(tenantId, userId);

    let aiConfig = null;

    // Try OpenAI if key is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        aiConfig = await generateWithOpenAI({ industry, useCase });
      } catch (err) {
        logger.warn('OpenAI onboarding failed, using template fallback:', err.message);
      }
    }

    // Fall back to template
    if (!aiConfig) {
      aiConfig = await generateFromTemplate({ industry, useCase });
    }

    // Create AI-suggested custom objects
    for (const objDef of (aiConfig.objects || [])) {
      try {
        const existing = await ObjectMeta.findOne({ tenantId, apiName: objDef.apiName });
        if (existing) continue;

        const obj = await ObjectMeta.create({
          tenantId,
          createdBy: userId,
          isCustom: true,
          showInNav: true,
          navOrder: 100 + (aiConfig.objects.indexOf(objDef) * 10),
          ...objDef,
        });

        // Create fields for this object
        if (objDef.fields) {
          const fieldDocs = objDef.fields.map((f, i) => ({
            tenantId,
            objectId: obj._id,
            objectApiName: obj.apiName,
            createdBy: userId,
            displayOrder: (i + 1) * 10,
            ...f,
          }));
          await FieldMeta.insertMany(fieldDocs, { ordered: false }).catch(() => {});
        }
      } catch (err) {
        logger.warn(`Failed to create AI object ${objDef.apiName}:`, err.message);
      }
    }

    // Create sample automation
    for (const automationDef of (aiConfig.automations || [])) {
      try {
        const existing = await Automation.findOne({ tenantId, apiName: automationDef.apiName });
        if (!existing) {
          await Automation.create({
            tenantId,
            createdBy: userId,
            isActive: false, // user must activate manually
            isValid: true,
            ...automationDef,
          });
        }
      } catch (err) {
        logger.warn(`Failed to create AI automation ${automationDef.apiName}:`, err.message);
      }
    }

    // Mark onboarding complete
    await Tenant.updateOne({ _id: tenantId }, {
      'onboarding.completed': true,
      'onboarding.completedAt': new Date(),
    });

    logger.info(`AI onboarding completed for tenant ${tenantId}`);
  } catch (err) {
    logger.error('runAIOnboarding error:', err);
  }
};

const generateWithOpenAI = async ({ industry, useCase }) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `You are a CRM architect. A company in the "${industry}" industry wants a CRM for "${useCase}".

Generate a JSON configuration for their CRM workspace. Include:
1. Up to 3 custom objects (beyond standard Account/Contact/Lead/Opportunity/Task)
2. Fields for each custom object (5-8 fields each)
3. 1-2 sample automations

Respond ONLY with valid JSON in this exact format:
{
  "objects": [
    {
      "name": "ObjectName",
      "label": "Object Label",
      "pluralLabel": "Object Labels",
      "apiName": "object_api_name",
      "description": "What this object stores",
      "icon": "LucideIconName",
      "color": "#hexcolor",
      "fields": [
        {
          "name": "Field Name",
          "label": "Field Label",
          "apiName": "field_api_name",
          "type": "text|number|picklist|date|email|phone|boolean|lookup",
          "isRequired": false,
          "picklistValues": []
        }
      ]
    }
  ],
  "automations": [
    {
      "name": "Automation Name",
      "description": "What it does",
      "apiName": "automation_api_name",
      "type": "record_triggered",
      "trigger": {
        "objectApiName": "object_name",
        "events": ["create"],
        "runWhen": "always"
      },
      "nodes": [
        { "id": "1", "type": "trigger", "label": "Record Created", "position": {"x": 0, "y": 0}, "nextNodes": [{"nodeId": "2"}] },
        { "id": "2", "type": "action_send_notification", "label": "Send Notification", "position": {"x": 0, "y": 100}, "config": { "title": "New record created" }, "nextNodes": [{"nodeId": "3"}] },
        { "id": "3", "type": "end", "label": "End", "position": {"x": 0, "y": 200}, "nextNodes": [] }
      ]
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content);
};

/**
 * Rich general-purpose template used when:
 * - No OPENAI_API_KEY is configured
 * - OpenAI call fails
 * - Industry/use case not recognized
 *
 * Seeds 3 starter automations that work with the standard objects
 * (Account, Contact, Lead, Opportunity, Task) that are always created.
 */
const GENERAL_TEMPLATE = {
  objects: [], // Standard objects (Account/Contact/Lead/Opportunity/Task) are always seeded separately
  automations: [
    {
      name: 'New Contact Welcome',
      description: 'Notify the owner when a new contact is created',
      apiName: 'new_contact_welcome',
      type: 'record_triggered',
      trigger: { objectApiName: 'contact', events: ['create'], runWhen: 'always' },
      nodes: [
        { id: '1', type: 'trigger', label: 'Contact Created', position: { x: 250, y: 0 }, nextNodes: [{ nodeId: '2' }] },
        { id: '2', type: 'action_send_notification', label: 'Notify Owner', position: { x: 250, y: 120 },
          config: { title: 'New contact: {first_name} {last_name}', body: 'A new contact has been added to your CRM.' },
          nextNodes: [{ nodeId: '3' }] },
        { id: '3', type: 'end', label: 'End', position: { x: 250, y: 240 }, nextNodes: [] },
      ],
    },
    {
      name: 'Lead Converted Alert',
      description: 'Notify when a lead status changes to Converted',
      apiName: 'lead_converted_alert',
      type: 'record_triggered',
      trigger: {
        objectApiName: 'lead', events: ['update'], runWhen: 'conditions_met',
        conditions: [{ field: 'status', operator: 'equals', value: 'converted' }],
      },
      nodes: [
        { id: '1', type: 'trigger', label: 'Lead Updated', position: { x: 250, y: 0 }, nextNodes: [{ nodeId: '2' }] },
        { id: '2', type: 'action_send_notification', label: 'Alert Owner', position: { x: 250, y: 120 },
          config: { title: 'Lead converted!', body: '{first_name} {last_name} has been converted.' },
          nextNodes: [{ nodeId: '3' }] },
        { id: '3', type: 'end', label: 'End', position: { x: 250, y: 240 }, nextNodes: [] },
      ],
    },
    {
      name: 'Opportunity Won Celebration',
      description: 'Notify team when an opportunity is closed won',
      apiName: 'opportunity_won',
      type: 'record_triggered',
      trigger: {
        objectApiName: 'opportunity', events: ['update'], runWhen: 'conditions_met',
        conditions: [{ field: 'stage', operator: 'equals', value: 'closed_won' }],
      },
      nodes: [
        { id: '1', type: 'trigger', label: 'Opportunity Updated', position: { x: 250, y: 0 }, nextNodes: [{ nodeId: '2' }] },
        { id: '2', type: 'action_send_notification', label: 'Notify Team', position: { x: 250, y: 120 },
          config: { title: 'Deal Won! 🎉 {name}', body: 'Opportunity closed won. Great work!' },
          nextNodes: [{ nodeId: '3' }] },
        { id: '3', type: 'end', label: 'End', position: { x: 250, y: 240 }, nextNodes: [] },
      ],
    },
  ],
};

const generateFromTemplate = async ({ industry, useCase }) => {
  // Always return the general template — it works for any industry/use case
  // Standard objects (Account, Contact, Lead, Opportunity, Task) are seeded
  // separately in runAIOnboarding via seedStandardObjects()
  logger.info(`Using general template for industry="${industry || 'general'}" useCase="${useCase || 'general'}"`);
  return GENERAL_TEMPLATE;
};

/**
 * GET /api/ai/onboarding-status
 */
const getOnboardingStatus = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).select('onboarding');
  return tenant?.onboarding || { completed: false };
};

export { runAIOnboarding, getOnboardingStatus };
