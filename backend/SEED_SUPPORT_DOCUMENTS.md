# Seeding Support Documents Object

This guide explains how to seed the Support Documents object for existing tenants in your Salesdam application.

## Overview

The Support Documents object is automatically created when a new user registers. However, if you need to manually add it to existing tenants or your development environment, use this seeding script.

## Prerequisites

- MongoDB is running and accessible
- Backend server has proper `.env` configuration with `MONGO_URI` set
- Node.js with `npm` is installed

## Quick Start

### Option 1: NPM Script (Recommended)

Run from the backend directory:

```bash
npm run seed:support-docs
```

### Option 2: Direct Node Execution

```bash
node scripts/seed-support-documents.js
```

## What the Script Does

1. **Connects to MongoDB** using `MONGO_URI` from `.env`
2. **Finds all tenants** in the database
3. **For each tenant:**
   - Creates the Support Documents object if it doesn't exist
   - Creates all associated fields (document_name, document_type, lead_id, deal_id, etc.)
   - Adds `support_document` to the tenant's `allowedObjects` array
4. **Logs progress** for each tenant
5. **Reports success/failure** count

## Output Example

```
📋 Starting Support Document seeding...

Found 3 tenant(s)

Processing tenant: Acme Corp (507f1f77bcf86cd799439011)
✓ Created Support Document object for tenant 507f1f77bcf86cd799439011
  └─ Created 11 fields
  └─ Added support_document to allowedObjects

Processing tenant: Tech Startup (507f1f77bcf86cd799439012)
◐ Support Document object already exists for tenant 507f1f77bcf86cd799439012

Processing tenant: Global Solutions (507f1f77bcf86cd799439013)
✓ Created Support Document object for tenant 507f1f77bcf86cd799439013
  └─ Created 11 fields
  └─ Added support_document to allowedObjects

✅ Seeding complete!
   ✓ Successful: 3/3
```

## What Gets Created

### Object Configuration
- **Name:** Support Document
- **Label:** Support Document
- **API Name:** support_document
- **Icon:** FileText
- **Color:** #8b5cf6

### Fields Created (11 total)
1. **document_name** (text, required) - The name of the document
2. **document_type** (text) - Type of document (PDF, Word, etc.)
3. **document_url** (text) - URL to access the document
4. **file_format** (text) - File format extension
5. **date_published** (datetime) - When the document was published
6. **date_modified** (datetime) - Last modification date
7. **description** (textarea) - Document description
8. **lead_id** (lookup to Lead) - Link to a Lead record
9. **deal_id** (lookup to Deal) - Link to a Deal record
10. **created_at** (datetime, read-only) - System created timestamp
11. **updated_at** (datetime, read-only) - System updated timestamp

## Troubleshooting

### Connection Error
```
MongoDB connection failed: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:** Make sure MongoDB is running:
```bash
# If using Docker
npm run db:up

# Or start your MongoDB service manually
```

### No Tenants Found
```
No tenants found in database
```

**Solution:** This is normal if your database is empty. Run the main seed script first:
```bash
npm run seed
```

### Permission Error
```
Error: Permission denied while accessing the file
```

**Solution:** Make sure the script file has execute permissions:
```bash
chmod +x scripts/seed-support-documents.js
```

## When to Use This Script

✅ **Use this script when:**
- Migrating an existing Salesdam instance
- Adding Support Documents support to a current deployment
- Testing the Support Documents object locally
- Setting up a staging environment

✅ **You don't need this script when:**
- Creating a brand new tenant (automatically seeded during registration)
- Using a fresh database (use `npm run seed` instead)

## Integration with Tender Workflow

Once this object is seeded, the following workflow becomes available:

1. User visits Find Tenders page
2. Views a tender and clicks "Save as Lead"
3. The tender is saved as a Lead
4. All support documents from the tender are saved to the **support_document** object
5. Each document is linked to the lead via the `lead_id` field
6. User can view/manage documents from the lead record

## Manual Verification

After running the script, verify it worked:

```bash
# Connect to MongoDB
mongosh

# Switch to salesdam database
use salesdam

# Check if Support Document object exists
db.objectmeta.findOne({ apiName: 'support_document' })

# Should return something like:
# {
#   _id: ObjectId("..."),
#   name: 'Support Document',
#   apiName: 'support_document',
#   tenantId: ObjectId("..."),
#   ...
# }

# Count fields
db.fieldmeta.countDocuments({ 
  objectApiName: 'support_document',
  tenantId: ObjectId("...") 
})
# Should return: 11
```

## Environment Variables

The script respects these environment variables from your `.env` file:

```env
# MongoDB connection
MONGO_URI=mongodb://localhost:27017/salesdam
```

## Performance Notes

- Script processes one tenant at a time
- Each tenant takes ~100-500ms depending on database performance
- Fields creation is batched for efficiency
- Total time for 10 tenants: typically < 5 seconds

## Rollback / Cleanup

If you need to remove the Support Documents object:

```javascript
// Connect to MongoDB
use salesdam

// Delete the object
db.objectmeta.deleteOne({ apiName: 'support_document' })

// Delete associated fields
db.fieldmeta.deleteMany({ objectApiName: 'support_document' })

// Remove from tenant's allowedObjects
db.tenants.updateMany(
  {},
  { $pull: { allowedObjects: 'support_document' } }
)
```

## Support

For issues or questions, check:
1. MongoDB connection status: `npm run db:logs`
2. Environment variables: Check `.env` file
3. Error logs in console output
4. Backend logs if server is running

---

**Last Updated:** 2026-07-31
