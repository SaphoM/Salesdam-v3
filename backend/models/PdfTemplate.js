import mongoose from 'mongoose';

// A single content block on the canvas
const blockSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  type:  {
    type: String,
    required: true,
    enum: ['text', 'record_field', 'datatable', 'image', 'divider', 'page_break', 'spacer'],
  },
  // Visual / layout
  order: { type: Number, default: 0 },
  style: { type: mongoose.Schema.Types.Mixed, default: {} }, // fontSize, bold, align, color, padding…

  // Block-specific config
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  /*
    text:          { content: "Hello {record.name}" }
    record_field:  { inputName: "record", fieldApiName: "name", label: "Name" }
    datatable:     { inputName: "items", columns: [{ fieldApiName, label }] }
    image:         { inputName: "image" | url: "https://…", width, height }
    divider:       { thickness, color }
    page_break:    {}
    spacer:        { height }
  */
}, { _id: false });

// An input that a flow must provide when calling this template
const inputSchema = new mongoose.Schema({
  name:          { type: String, required: true },    // variable name used as {name.field}
  label:         { type: String, required: true },
  type:          {
    type: String,
    required: true,
    enum: ['record', 'collection', 'text', 'number', 'date', 'image'],
  },
  objectApiName: { type: String },  // required when type = record | collection
  required:      { type: Boolean, default: true },
  description:   { type: String },
}, { _id: false });

const pdfTemplateSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },

  name:        { type: String, required: true, trim: true },
  apiName:     { type: String, required: true, trim: true, lowercase: true },
  description: { type: String, trim: true },
  category:    { type: String, trim: true, default: 'General' },

  // Page settings
  pageSettings: {
    size:        { type: String, enum: ['A4', 'Letter', 'Legal'], default: 'A4' },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    marginTop:    { type: Number, default: 40 },
    marginRight:  { type: Number, default: 40 },
    marginBottom: { type: Number, default: 40 },
    marginLeft:   { type: Number, default: 40 },
    headerHtml:   { type: String, default: '' },
    footerHtml:   { type: String, default: '' },
  },

  // Inputs that the flow must supply
  inputs: [inputSchema],

  // Ordered content blocks
  blocks: [blockSchema],

  isActive:  { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

pdfTemplateSchema.index({ tenantId: 1, apiName: 1 }, { unique: true });
pdfTemplateSchema.index({ tenantId: 1, category: 1 });
pdfTemplateSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model('PdfTemplate', pdfTemplateSchema);
