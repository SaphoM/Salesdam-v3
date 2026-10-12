import mongoose from 'mongoose';

const fieldMappingSchema = new mongoose.Schema({
  leadField:    { type: String, required: true },
  targetObject: { type: String, enum: ['contact', 'client', 'deal'], required: true },
  targetField:  { type: String, required: true },
}, { _id: false });

const objectTypeConfigSchema = new mongoose.Schema({
  tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  objectApiName: { type: String, required: true, trim: true },

  // ── Lead conversion ──────────────────────────────────────────────────
  conversionSettings: {
    enabled:                { type: Boolean, default: true },
    convertedStatus:        { type: String, default: 'Converted' },
    autoCreateOpportunity:  { type: Boolean, default: false },
    requireOpportunity:     { type: Boolean, default: false },
    defaultOpportunityName: { type: String, default: '{company} - Opportunity' },
    fieldMappings:          { type: [fieldMappingSchema], default: [] },
  },

  // ── Email to Lead ────────────────────────────────────────────────────
  emailToLead: {
    enabled:                  { type: Boolean, default: false },
    routingEmail:             { type: String },
    defaultOwnerId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    defaultStatus:            { type: String, default: 'New' },
    defaultLeadSource:        { type: String, default: 'Email' },
    useEmailSubjectAsName:    { type: Boolean, default: true },
    addEmailBodyAsDescription:{ type: Boolean, default: true },
  },

  // ── Email to Case ────────────────────────────────────────────────────
  emailToCase: {
    enabled:                  { type: Boolean, default: false },
    routingEmail:             { type: String },
    defaultOwnerId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    defaultStatus:            { type: String, default: 'New' },
    defaultPriority:          { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    useEmailSubjectAsSubject: { type: Boolean, default: true },
    addEmailBodyAsDescription:{ type: Boolean, default: true },
  },
}, { timestamps: true });

objectTypeConfigSchema.index({ tenantId: 1, objectApiName: 1 }, { unique: true });

export default mongoose.model('ObjectTypeConfig', objectTypeConfigSchema);
