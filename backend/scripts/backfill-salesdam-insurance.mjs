/**
 * One-off: backfill standard-object metadata for the "Salesdam" tenant (it
 * currently has none — standard objects render from a static schema there),
 * then seed the insurance object pack, then scope the existing "Insurance"
 * workspace's allowedObjects/objectGroups to what was actually seeded.
 *
 * Idempotent (seedStandardObjects / seedInsuranceObjects skip existing
 * apiNames). Safe to re-run.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import ObjectMeta from '../models/ObjectMeta.js';
import { seedStandardObjects } from '../services/metadataService.js';
import { seedInsuranceObjects } from '../services/insuranceMetadataService.js';

const INSURANCE_NAV_GROUPS = [
  { name: 'Sales', objectApiNames: ['lead'] },
  { name: 'Customers', objectApiNames: ['client'] },
  { name: 'Policies', objectApiNames: ['policy', 'insured_life', 'policy_party', 'policy_acceptance'] },
  { name: 'Finance', objectApiNames: ['account', 'transaction'] },
  { name: 'Claims', objectApiNames: ['claim', 'claim_requirement', 'claim_payment'] },
  { name: 'Products', objectApiNames: ['product', 'product_version', 'benefit_cover', 'child_benefit_rule'] },
  { name: 'Service', objectApiNames: ['case', 'task'] },
];

const run = async () => {
  await connectDB();

  const tenant = await Tenant.findOne({ name: 'Salesdam' });
  if (!tenant) throw new Error('Salesdam tenant not found');

  const user = await User.findOne({ tenantId: tenant._id, username: 'superadmin' });
  if (!user) throw new Error('superadmin user not found for Salesdam');

  const createdStandard = await seedStandardObjects(tenant._id, user._id);
  console.log(`Standard objects created: ${createdStandard.length}`);

  const createdInsurance = await seedInsuranceObjects(tenant._id, user._id);
  console.log(`Insurance objects created: ${createdInsurance.length}`);

  const existingApiNames = new Set(
    await ObjectMeta.find({ tenantId: tenant._id }).distinct('apiName'),
  );

  const objectGroups = INSURANCE_NAV_GROUPS
    .map((g) => ({ name: g.name, objectApiNames: g.objectApiNames.filter((o) => existingApiNames.has(o)) }))
    .filter((g) => g.objectApiNames.length > 0);
  const allowedObjects = [...new Set(objectGroups.flatMap((g) => g.objectApiNames))];

  const ws = await Workspace.findOneAndUpdate(
    { tenantId: tenant._id, apiName: 'insurance' },
    { $set: { allowedObjects, objectGroups } },
    { new: true },
  );

  console.log(
    `Workspace "${ws.name}" scoped to ${ws.allowedObjects.length} objects across ${ws.objectGroups.length} groups.`,
  );
  console.log('allowedObjects:', ws.allowedObjects.join(', '));

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
