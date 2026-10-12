import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ObjectMeta from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import logger from '../utils/logger.js';

dotenv.config();

const makeApprovalStatusReadOnly = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all tenants' lead object metadata
    const leadObjects = await ObjectMeta.find({ apiName: 'lead' });
    console.log(`Found ${leadObjects.length} lead object(s) across all tenants`);

    if (leadObjects.length === 0) {
      console.log('No lead objects found');
      process.exit(0);
    }

    // Update each lead object's approval_status and rejection_reason fields
    for (const leadObj of leadObjects) {
      console.log(`\nUpdating lead object for tenant: ${leadObj.tenantId}`);

      // Find and update approval_status field in FieldMeta
      const approvalStatusField = await FieldMeta.findOneAndUpdate(
        {
          objectId: leadObj._id,
          apiName: 'approval_status',
          tenantId: leadObj.tenantId,
        },
        { isReadOnly: true },
        { new: true }
      );

      if (approvalStatusField) {
        console.log('  ✓ Set approval_status to readOnly');
      } else {
        console.log('  ✗ approval_status field not found');
      }

      // Find and update rejection_reason field in FieldMeta
      const rejectionReasonField = await FieldMeta.findOneAndUpdate(
        {
          objectId: leadObj._id,
          apiName: 'rejection_reason',
          tenantId: leadObj.tenantId,
        },
        { isReadOnly: true },
        { new: true }
      );

      if (rejectionReasonField) {
        console.log('  ✓ Set rejection_reason to readOnly');
      } else {
        console.log('  ✗ rejection_reason field not found');
      }

      console.log(`  ✓ Updated fields for tenant: ${leadObj.tenantId}`);
    }

    console.log('\n✅ Successfully updated approval status fields to read-only');
    process.exit(0);
  } catch (error) {
    logger.error('Error updating approval status fields:', error);
    console.error('Error:', error.message);
    process.exit(1);
  }
};

makeApprovalStatusReadOnly();
