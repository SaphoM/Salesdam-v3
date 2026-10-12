import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  subject:     { type: String, required: true, trim: true },   // supports {field_name} merge tokens
  bodyText:    { type: String, default: '' },                   // plain-text version
  bodyHtml:    { type: String, default: '' },                   // HTML version
  category:    { type: String, trim: true, default: 'General' },
  description: { type: String, trim: true },
  tags:        [{ type: String }],
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

emailTemplateSchema.index({ tenantId: 1, category: 1 });
emailTemplateSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model('EmailTemplate', emailTemplateSchema);
