import mongoose from 'mongoose';

const registrationTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    paymentVerified: {
      type: Boolean,
      default: false,
    },
    paystackReference: String,
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired tokens
    },
  },
  {
    timestamps: true,
  },
);

const RegistrationToken = mongoose.model('RegistrationToken', registrationTokenSchema);

export default RegistrationToken;
