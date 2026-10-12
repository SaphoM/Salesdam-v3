import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },

  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // MIME type — e.g. application/pdf, image/png
  mimeType: { type: String, required: true, default: 'application/octet-stream' },

  // Storage — base64 data URI or a URL (S3, etc.)
  data:     { type: String },        // base64 encoded content (for small files)
  url:      { type: String },        // external URL if stored remotely

  sizeBytes: { type: Number, default: 0 },

  // Polymorphic "related to" — attach a file to any record
  relatedTo: {
    objectApiName: { type: String },
    recordId:      { type: mongoose.Schema.Types.ObjectId, ref: 'DynamicRecord' },
  },

  // Which PDF template generated this file (if any)
  pdfTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'PdfTemplate' },

  tags:      [{ type: String }],
  isActive:  { type: Boolean, default: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

fileSchema.index({ tenantId: 1, 'relatedTo.objectApiName': 1, 'relatedTo.recordId': 1 });
fileSchema.index({ tenantId: 1, pdfTemplateId: 1 });
fileSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('File', fileSchema);
