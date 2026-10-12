/**
 * CustomScreen — a configurable screen attached to a CRM object.
 * Renders as a tab on the record detail page and can pull data
 * from record fields, related records, or external HTTP sources.
 */
import mongoose from 'mongoose';

const dataSourceSchema = new mongoose.Schema({
  id:               { type: String, required: true },
  name:             { type: String, required: true },   // variable name, e.g. "weather"
  method:           { type: String, default: 'GET' },
  url:              { type: String, required: true },   // supports {recordId}, {fieldName}
  externalObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExternalObject' },
  headers:          { type: Map, of: String },
  body:             { type: String },                   // JSON template
  resultPath:       { type: String },                   // dot-path into response, e.g. "data.items"
}, { _id: false });

const componentSchema = new mongoose.Schema({
  id:     { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['heading', 'text', 'field_value', 'metric', 'data_table', 'separator', 'field_list', 'badge'],
  },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  order:  { type: Number, default: 0 },
  cols:   { type: Number, enum: [3, 4, 6, 8, 12], default: 12 }, // grid column span
}, { _id: false });

const customScreenSchema = new mongoose.Schema({
  tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  objectApiName: { type: String, required: true, index: true }, // which object this tab appears on
  name:          { type: String, required: true, trim: true },
  tabLabel:      { type: String, trim: true },         // label shown on the tab
  description:   { type: String, trim: true },
  isActive:      { type: Boolean, default: true },
  order:         { type: Number, default: 0 },         // tab position order
  dataSources:   [dataSourceSchema],
  components:    [componentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

customScreenSchema.index({ tenantId: 1, objectApiName: 1, isActive: 1 });

export default mongoose.model('CustomScreen', customScreenSchema);
