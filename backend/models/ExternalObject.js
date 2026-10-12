/**
 * ExternalObject — a configured external system or API endpoint.
 * Automations reference these to call external services (Slack, REST APIs, etc.)
 * without embedding credentials directly in each automation.
 */
import mongoose from 'mongoose';

const externalObjectSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true }, // "Slack Webhook", "HubSpot CRM"
    description: { type: String, trim: true },
    baseUrl: { type: String, required: true, trim: true }, // https://hooks.slack.com/services/...
    category: {
      type: String,
      enum: ['http', 'slack', 'email', 'database', 'crm', 'erp', 'custom'],
      default: 'http',
    },

    // Authentication
    authType: {
      type: String,
      enum: ['none', 'bearer', 'basic', 'api_key', 'oauth2'],
      default: 'none',
    },
    // Credentials — excluded from list/get queries via .select('-credentials') in the route
    credentials: {
      token: { type: String }, // bearer token
      username: { type: String },
      password: { type: String },
      apiKey: { type: String },
      apiKeyHeader: { type: String }, // header name for API key, e.g. "X-Api-Key"
    },

    defaultHeaders: { type: Map, of: String },
    defaultTimeout: { type: Number, default: 10000 },

    // CRM integration — makes this a browsable "object" inside the CRM
    objectApiName: { type: String, trim: true, lowercase: true }, // linked ObjectMeta apiName
    listEndpoint: { type: String, trim: true }, // GET URL for list; defaults to baseUrl
    getEndpoint: { type: String, trim: true }, // GET single: {id} replaced with record ID
    dataPath: { type: String, trim: true }, // dot-path to records array in response, e.g. "data.items"
    idField: { type: String, default: 'id' }, // which key in each record is the unique ID

    // Field mappings — auto-generated from schema fetch, user-editable
    fieldMappings: [
      {
        externalKey: { type: String, required: true }, // key name in the API response object
        fieldApiName: { type: String, required: true }, // FieldMeta apiName
        fieldLabel: { type: String }, // display label
        fieldType: { type: String, default: 'text' }, // FieldMeta type
        include: { type: Boolean, default: true }, // include this field in sync
      },
    ],

    lastSyncedAt: { type: Date },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

externalObjectSchema.index({ tenantId: 1, name: 1 });

export default mongoose.model('ExternalObject', externalObjectSchema);
