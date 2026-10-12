import mongoose from 'mongoose';

const { Schema } = mongoose;

const supportDocumentSchema = new Schema(
  {
    documentId: { type: String },
    fileName: { type: String },
    extension: { type: String },
    dateModified: { type: Date },
  },
  { _id: false }
);

const tenderSchema = new Schema(
  {
    // Unique id from the eTenders source, used to upsert/dedupe records
    sourceId: { type: Number, required: true, unique: true, index: true },

    tenderNumber: { type: String, trim: true, index: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true, index: true },
    categoryId: { type: Number },
    type: { type: String, trim: true },

    organOfState: { type: String, trim: true },
    department: { type: String, trim: true, index: true },
    departmentId: { type: Number },

    status: { type: String, trim: true, index: true },

    province: { type: String, trim: true, index: true },
    provinceId: { type: Number },

    datePublished: { type: Date, index: true },
    closingDate: { type: Date, index: true },

    briefingSession: { type: Boolean, default: false },
    briefingCompulsory: { type: Boolean, default: false },
    compulsoryBriefingSession: { type: Date },
    briefingVenue: { type: String, trim: true },

    streetName: { type: String, trim: true },
    suburb: { type: String, trim: true },
    town: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    delivery: { type: String, trim: true },

    conditions: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true },
    telephone: { type: String, trim: true },
    fax: { type: String, trim: true },

    eSubmission: { type: Boolean, default: false },
    twoEnvelopeSubmission: { type: Boolean, default: false },
    validity: { type: Number },

    supportDocuments: { type: [supportDocumentSchema], default: [] },

    // Raw payload from the source, kept for auditing / future re-mapping
    raw: { type: Schema.Types.Mixed, select: false },
  },
  { timestamps: true }
);

tenderSchema.index({ description: 'text', tenderNumber: 'text' });

const Tender = mongoose.model('Tender', tenderSchema);

export default Tender;
