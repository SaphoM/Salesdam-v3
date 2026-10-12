import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name:     { type: String, required: true, trim: true },
  color:    { type: String, default: '#6366f1' },
  icon:     { type: String, default: 'Folder' },
  order:    { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

folderSchema.index({ tenantId: 1, name: 1 });

export default mongoose.model('DashboardFolder', folderSchema);
