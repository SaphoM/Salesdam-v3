/**
 * Grant the standard_user role (and admin, for consistency) full CRUD +
 * field permissions on the insurance object pack, plus "account" (a
 * standard object the insurance workspace depends on but that wasn't in
 * the original standardObjects permission list).
 *
 * Additive only: existing objectPermissions entries for other objects
 * (client, lead, deal, ...) are left untouched. Field permissions are
 * read from the real FieldMeta records seeded for this tenant, not from
 * a static config, so they match what's actually in the database.
 *
 * Idempotent — re-running replaces just the insurance-object entries with
 * the same values.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Tenant from '../models/Tenant.js';
import Role from '../models/Role.js';
import FieldMeta from '../models/FieldMeta.js';

const INSURANCE_APIS = [
  'product_version', 'benefit_cover', 'child_benefit_rule',
  'policy', 'policy_party', 'insured_life', 'policy_acceptance',
  'policy_status_history', 'policy_premium_history',
  'policy_endorsement', 'policy_endorsement_item',
  'claim', 'claim_requirement', 'claim_payment', 'claim_status_history',
  'policy_approval', 'policy_communication', 'premium_transaction',
  'communication_template', 'endorsement_approval_workflow',
];

// 'account' is a standard object the Insurance workspace's Finance group
// uses, but it was never in the original standardObjects permission list.
const EXTRA_STANDARD_APIS = ['account'];

const TARGET_APIS = [...INSURANCE_APIS, ...EXTRA_STANDARD_APIS];

const fieldPermissionsFor = async (tenantId, apiName) => {
  const fields = await FieldMeta.find({ tenantId, objectApiName: apiName });
  return fields
    .filter((f) => !f.isReadOnly)
    .map((f) => ({
      fieldApiName: f.apiName,
      canView: true,
      canEdit: f.type === 'auto_number' || f.type === 'formula' ? false : true,
    }));
};

const grantOnRole = async (tenantId, roleName, canDelete) => {
  const role = await Role.findOne({ tenantId, name: roleName });
  if (!role) {
    console.log(`Role "${roleName}" not found — skipping.`);
    return;
  }

  const existing = new Map(role.objectPermissions.map((p) => [p.objectApiName, p]));

  for (const apiName of TARGET_APIS) {
    const fieldPermissions = await fieldPermissionsFor(tenantId, apiName);
    existing.set(apiName, {
      objectApiName: apiName,
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete,
      canExport: true,
      canImport: false,
      fieldPermissions,
    });
  }

  role.objectPermissions = Array.from(existing.values());
  await role.save();
  console.log(`"${roleName}": granted ${TARGET_APIS.length} objects (${role.objectPermissions.length} total on role).`);
};

const run = async () => {
  await connectDB();

  const tenant = await Tenant.findOne({ name: 'Salesdam' });
  if (!tenant) throw new Error('Salesdam tenant not found');

  await grantOnRole(tenant._id, 'standard_user', true);
  await grantOnRole(tenant._id, 'admin', true);

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
