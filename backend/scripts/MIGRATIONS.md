# Database Migrations

## Merge Fields Migration

This migration removes merge fields (e.g., `address.city`) and converts them to individual fields (e.g., `city`).

### What's being migrated:

**Lead object:**
- `address.street` → `street`
- `address.city` → `city`
- `address.province` → `province`
- `address.zip` → `zip`
- `address.country` → `country`

**Account object:**
- `billing_address.street` → `billing_street`
- `billing_address.city` → `billing_city`
- `billing_address.province` → `billing_province`
- `billing_address.zip` → `billing_zip`
- `billing_address.country` → `billing_country`
- `shipping_address.street` → `shipping_street`
- `shipping_address.city` → `shipping_city`
- `shipping_address.province` → `shipping_province`
- `shipping_address.zip` → `shipping_zip`
- `shipping_address.country` → `shipping_country`

**Contact object:**
- `mailing_address.street` → `mailing_street`
- `mailing_address.city` → `mailing_city`
- `mailing_address.province` → `mailing_province`
- `mailing_address.zip` → `mailing_zip`
- `mailing_address.country` → `mailing_country`
- `other_address.street` → `other_street`
- `other_address.city` → `other_city`
- `other_address.province` → `other_province`
- `other_address.zip` → `other_zip`
- `other_address.country` → `other_country`

**Order object:**
- `address.street` → `street`
- `address.city` → `city`
- `address.province` → `province`
- `address.zip` → `zip`
- `address.country` → `country`

### Running the migrations:

#### Option 1: Migrate only field metadata (FieldMeta collection)
```bash
npm run migrate:merge-fields
```
This updates field definitions without modifying existing record data.

#### Option 2: Migrate field metadata AND record data (RECOMMENDED)
```bash
npm run migrate:merge-fields-data
```
This is the comprehensive migration that:
1. Updates all FieldMeta documents
2. Migrates existing DynamicRecord data from nested objects to flat fields

**Use this option if you have existing records with merge field data.**

### Important notes:

- Always **backup your database** before running migrations
- These migrations are **idempotent** - it's safe to run them multiple times
- The comprehensive migration (`migrate:merge-fields-data`) also handles any existing records with nested data
- After migration, all new records will use the flat field structure from the updated config files

### Troubleshooting:

If the migration fails:
1. Check MongoDB connection
2. Verify `.env` file has correct database credentials
3. Check logs for specific errors
4. Restore from backup if needed

### Example output:

```
Starting merge field data migration...

--- Updating FieldMeta ---
✓ Updated 5 field(s): address.street → street
✓ Updated 5 field(s): address.city → city
... (more updates)

--- Migrating DynamicRecord data ---
Processing 25 lead records...
Processing 30 account records...
... (more records)

✅ Migration complete!
   Fields updated: 45
   Records updated: 120
```
