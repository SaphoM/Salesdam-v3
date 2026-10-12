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

const addIsConvertedFieldMeta = async () => {
  try {
    console.log('\n📋 Adding is_converted field metadata...\n');

    // Get all unique tenants with deal objects
    const tenantsWithDeals = await DynamicRecord.distinct('tenantId', {
      objectApiName: 'deal',
    });

    console.log(`Found ${tenantsWithDeals.length} tenants with deal records\n`);

    let fieldsAdded = 0;

    for (const tenantId of tenantsWithDeals) {
      try {
        // Find the ObjectMeta for deal in this tenant
        const objectMeta = await ObjectMeta.findOne({
          tenantId,
          apiName: 'deal',
        });

        if (!objectMeta) {
          console.log(`⚠️  No ObjectMeta found for deal in tenant ${tenantId}`);
          continue;
        }

        // Check if is_converted field already exists
        const existingField = await FieldMeta.findOne({
          tenantId,
          objectApiName: 'deal',
          apiName: 'is_converted',
        });

        if (existingField) {
          console.log(`✓ Tenant ${tenantId.toString().slice(-8)}: is_converted already exists`);
          continue;
        }

        // Create the is_converted field metadata
        const fieldMeta = new FieldMeta({
          tenantId,
          objectId: objectMeta._id,
          objectApiName: 'deal',
          name: 'Converted to Order',
          label: 'Converted to Order',
          apiName: 'is_converted',
          type: 'boolean',
          isRequired: false,
          isSystem: true,
          isReadOnly: false,
          displayOrder: 85,
          section: 'Deal Information',
          isSearchable: true,
          isFilterable: true,
          isSortable: true,
          defaultValue: false,
        });

        await fieldMeta.save();
        fieldsAdded++;
        console.log(`✓ Tenant ${tenantId.toString().slice(-8)}: is_converted field added`);
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

const addIsConvertedToRecords = async () => {
  try {
    console.log('🔄 Updating existing deal records...\n');

    // Find all deal records that don't have is_converted
    const query = {
      objectApiName: 'deal',
      'data.is_converted': { $exists: false },
    };

    const countBefore = await DynamicRecord.countDocuments(query);
    console.log(`📊 Found ${countBefore} deal records without is_converted`);

    if (countBefore === 0) {
      console.log('✓ All deal records already have is_converted\n');
      return 0;
    }

    // Update all records to add is_converted = false
    const result = await DynamicRecord.updateMany(
      query,
      {
        $set: {
          'data.is_converted': false,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`\n✓ Updated ${result.modifiedCount} deal records`);
    console.log(`  - Matched: ${result.matchedCount}`);
    console.log(`  - Modified: ${result.modifiedCount}`);
    console.log(`  - Acknowledged: ${result.acknowledged}\n`);

    // Verify the update
    const countAfter = await DynamicRecord.countDocuments(query);
    console.log(`✓ Verification: ${countAfter} records still without is_converted (should be 0)\n`);

    return result.modifiedCount;
  } catch (error) {
    console.error('\n✗ Record update error:', error.message);
    throw error;
  }
};

const main = async () => {
  console.log('🚀 Starting is_converted field migration...');
  console.log('=====================================');

  try {
    await connectDB();

    // Add field metadata first
    await addIsConvertedFieldMeta();

    // Then update existing records
    const recordsUpdated = await addIsConvertedToRecords();

    console.log('=====================================');
    console.log('✅ Script completed successfully!');
    console.log(`   - Updated ${recordsUpdated} deal records`);
    console.log('=====================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n=====================================');
    console.error('❌ Script failed\n');
    process.exit(1);
  }
};

main();
