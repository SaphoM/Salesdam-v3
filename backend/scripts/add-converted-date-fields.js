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

const addConvertedDateFieldMeta = async () => {
  try {
    console.log('\n📋 Adding converted_date field metadata...\n');

    const objects = ['deal', 'lead'];
    let fieldsAdded = 0;

    for (const objectName of objects) {
      console.log(`\n→ Processing ${objectName} objects:`);

      // Get all unique tenants with this object
      const tenantsWithObject = await DynamicRecord.distinct('tenantId', {
        objectApiName: objectName,
      });

      console.log(`  Found ${tenantsWithObject.length} tenants with ${objectName} records`);

      for (const tenantId of tenantsWithObject) {
        try {
          // Find the ObjectMeta for this object in this tenant
          const objectMeta = await ObjectMeta.findOne({
            tenantId,
            apiName: objectName,
          });

          if (!objectMeta) {
            console.log(`  ⚠️  No ObjectMeta found for ${objectName} in tenant ${tenantId}`);
            continue;
          }

          // Check if converted_date field already exists
          const existingField = await FieldMeta.findOne({
            tenantId,
            objectApiName: objectName,
            apiName: 'converted_date',
          });

          if (existingField) {
            console.log(`  ✓ Tenant ${tenantId.toString().slice(-8)}: converted_date already exists`);
            continue;
          }

          // Create the converted_date field metadata
          const fieldMeta = new FieldMeta({
            tenantId,
            objectId: objectMeta._id,
            objectApiName: objectName,
            name: 'Converted Date',
            label: 'Converted Date',
            apiName: 'converted_date',
            type: 'datetime',
            isRequired: false,
            isSystem: true,
            isReadOnly: false,
            displayOrder: objectName === 'deal' ? 86 : 215,
            section: objectName === 'deal' ? 'Deal Information' : 'Lead Information',
            isSearchable: true,
            isFilterable: true,
            isSortable: true,
          });

          await fieldMeta.save();
          fieldsAdded++;
          console.log(`  ✓ Tenant ${tenantId.toString().slice(-8)}: converted_date field added`);
        } catch (error) {
          console.error(`  ✗ Error processing tenant ${tenantId}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Added field metadata to ${fieldsAdded} object-tenant combinations\n`);
  } catch (error) {
    console.error('\n✗ Field metadata error:', error.message);
    throw error;
  }
};

const addConvertedDateToRecords = async () => {
  try {
    console.log('🔄 Updating existing records...\n');

    const objects = ['deal', 'lead'];
    let totalRecordsUpdated = 0;

    for (const objectName of objects) {
      console.log(`\n→ Processing ${objectName} records:`);

      // Find all records that don't have converted_date
      const query = {
        objectApiName: objectName,
        'data.converted_date': { $exists: false },
      };

      const countBefore = await DynamicRecord.countDocuments(query);
      console.log(`  📊 Found ${countBefore} ${objectName} records without converted_date`);

      if (countBefore === 0) {
        console.log(`  ✓ All ${objectName} records already have converted_date`);
        continue;
      }

      // Update all records to add converted_date = null
      const result = await DynamicRecord.updateMany(
        query,
        {
          $set: {
            'data.converted_date': null,
            updatedAt: new Date(),
          },
        }
      );

      console.log(`  ✓ Updated ${result.modifiedCount} ${objectName} records`);
      console.log(`    - Matched: ${result.matchedCount}`);
      console.log(`    - Modified: ${result.modifiedCount}`);

      // Verify the update
      const countAfter = await DynamicRecord.countDocuments(query);
      console.log(`  ✓ Verification: ${countAfter} records still without converted_date (should be 0)`);

      totalRecordsUpdated += result.modifiedCount;
    }

    console.log(`\n✅ Total records updated: ${totalRecordsUpdated}\n`);
    return totalRecordsUpdated;
  } catch (error) {
    console.error('\n✗ Record update error:', error.message);
    throw error;
  }
};

const main = async () => {
  console.log('🚀 Starting converted_date field migration...');
  console.log('=====================================');

  try {
    await connectDB();

    // Add field metadata first
    await addConvertedDateFieldMeta();

    // Then update existing records
    const recordsUpdated = await addConvertedDateToRecords();

    console.log('=====================================');
    console.log('✅ Script completed successfully!');
    console.log(`   - Updated ${recordsUpdated} total records`);
    console.log('   - Added converted_date field to Deal and Lead objects');
    console.log('=====================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n=====================================');
    console.error('❌ Script failed\n');
    process.exit(1);
  }
};

main();
