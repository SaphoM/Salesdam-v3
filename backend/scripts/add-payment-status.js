import mongoose from 'mongoose';
import { config } from 'dotenv';
import DynamicRecord from '../models/DynamicRecord.js';
import FieldMeta from '../models/FieldMeta.js';
import ObjectMeta from '../models/ObjectMeta.js';

config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const addPaymentStatusFieldMeta = async () => {
  try {
    console.log('\n📋 Adding payment_status field metadata...\n');

    // Get all unique tenants with order objects
    const tenantsWithOrders = await DynamicRecord.distinct('tenantId', {
      objectApiName: 'order',
    });

    console.log(`Found ${tenantsWithOrders.length} tenants with order records\n`);

    let fieldsAdded = 0;

    for (const tenantId of tenantsWithOrders) {
      try {
        // Find the ObjectMeta for order in this tenant
        const objectMeta = await ObjectMeta.findOne({
          tenantId,
          apiName: 'order',
        });

        if (!objectMeta) {
          console.log(`⚠️  No ObjectMeta found for order in tenant ${tenantId}`);
          continue;
        }

        // Check if payment_status field already exists
        const existingField = await FieldMeta.findOne({
          tenantId,
          objectApiName: 'order',
          apiName: 'payment_status',
        });

        if (existingField) {
          console.log(`✓ Tenant ${tenantId.toString().slice(-8)}: payment_status already exists`);
          continue;
        }

        // Create the payment_status field metadata
        const fieldMeta = new FieldMeta({
          tenantId,
          objectId: objectMeta._id,
          objectApiName: 'order',
          name: 'Payment Status',
          label: 'Payment Status',
          apiName: 'payment_status',
          type: 'picklist',
          isRequired: false,
          isSystem: true,
          displayOrder: 185,
          section: 'Purchase',
          isSearchable: true,
          isFilterable: true,
          isSortable: true,
          picklistValues: [
            { label: 'Pending', value: 'pending', isDefault: true, isActive: true },
            { label: 'Unpaid', value: 'unpaid', isDefault: false, isActive: true },
            { label: 'Paid', value: 'paid', isDefault: false, isActive: true },
            { label: 'Overdue', value: 'overdue', isDefault: false, isActive: true },
            { label: 'Cancelled', value: 'cancelled', isDefault: false, isActive: true },
          ],
          defaultValue: 'pending',
        });

        await fieldMeta.save();
        fieldsAdded++;
        console.log(`✓ Tenant ${tenantId.toString().slice(-8)}: payment_status field added`);
      } catch (error) {
        console.error(`✗ Error processing tenant ${tenantId}: ${error.message}`);
      }
    }

    console.log(`\n✅ Added field metadata to ${fieldsAdded} tenants\n`);
  } catch (error) {
    console.error('\n✗ Field metadata error:', error.message);
    throw error;
  }
};

const addPaymentStatusToRecords = async () => {
  try {
    console.log('🔄 Updating existing order records...\n');

    // Find all order records that don't have payment_status
    const query = {
      objectApiName: 'order',
      'data.payment_status': { $exists: false },
    };

    const countBefore = await DynamicRecord.countDocuments(query);
    console.log(`📊 Found ${countBefore} order records without payment_status`);

    if (countBefore === 0) {
      console.log('✓ All order records already have payment_status\n');
      return 0;
    }

    // Update all records to add payment_status = 'pending'
    const result = await DynamicRecord.updateMany(
      query,
      {
        $set: {
          'data.payment_status': 'pending',
          updatedAt: new Date(),
        },
      }
    );

    console.log(`\n✓ Updated ${result.modifiedCount} order records`);
    console.log(`  - Matched: ${result.matchedCount}`);
    console.log(`  - Modified: ${result.modifiedCount}`);
    console.log(`  - Acknowledged: ${result.acknowledged}\n`);

    // Verify the update
    const countAfter = await DynamicRecord.countDocuments(query);
    console.log(`✓ Verification: ${countAfter} records still without payment_status (should be 0)\n`);

    return result.modifiedCount;
  } catch (error) {
    console.error('\n✗ Record update error:', error.message);
    throw error;
  }
};

const main = async () => {
  console.log('🚀 Starting payment_status migration...');
  console.log('=====================================');

  try {
    await connectDB();

    // Add field metadata first
    await addPaymentStatusFieldMeta();

    // Then update existing records
    const recordsUpdated = await addPaymentStatusToRecords();

    console.log('=====================================');
    console.log('✅ Script completed successfully!');
    console.log(`   - Updated ${recordsUpdated} order records`);
    console.log('=====================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n=====================================');
    console.error('❌ Script failed\n');
    process.exit(1);
  }
};

main();
