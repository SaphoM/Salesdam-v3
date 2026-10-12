/**
 * insurance-metadata.e2e.mjs — verifies the Insurance object pack seeds
 * correctly and only into the tenant it is applied to.
 *
 * Run: node tests/insurance-metadata.e2e.mjs   (from backend/)
 * Exits non-zero if any check fails.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import ObjectMeta from '../models/ObjectMeta.js';
import FieldMeta from '../models/FieldMeta.js';
import Session from '../models/Session.js';
import { seedDefaultRoles } from '../services/roleService.js';
import { seedStandardObjects, ensureUserObject } from '../services/metadataService.js';
import { seedInsuranceObjects } from '../services/insuranceMetadataService.js';
import { INSURANCE_OBJECTS } from '../config/insurance/objects.js';

const RUN = Date.now().toString(36);
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const seedTenant = async (label, hub) => {
  const tenant = await Tenant.create({
    name: `ZZ_INS_${label}_${RUN}`,
    slug: `zz-ins-${label}-${RUN}`,
    hub,
    status: 'active',
    plan: 'enterprise',
  });
  await seedDefaultRoles(tenant._id);
  const adminRole = await Role.findOne({ tenantId: tenant._id, name: 'admin' });
  const user = await User.create({
    tenantId: tenant._id,
    firstName: 'Ins',
    lastName: label,
    email: `ins-${label}-${RUN}@example.com`,
    username: `ins_${label}_${RUN}`,
    password: 'IsoTest123!',
    role: adminRole._id,
    status: 'active',
    emailVerified: true,
  });
  await seedStandardObjects(tenant._id, user._id);
  await ensureUserObject(tenant._id, user._id);
  return { tenant, user };
};

let tenantIds = [];
try {
  await connectDB();
  const A = await seedTenant('a', 'insurance');
  const B = await seedTenant('b', 'sales');
  tenantIds = [A.tenant._id, B.tenant._id];

  const created = await seedInsuranceObjects(A.tenant._id, A.user._id);
  check('seeds all insurance objects', created.length === INSURANCE_OBJECTS.length, `${created.length}/${INSURANCE_OBJECTS.length}`);

  const aObjects = await ObjectMeta.find({ tenantId: A.tenant._id, apiName: { $in: INSURANCE_OBJECTS.map((o) => o.apiName) } }).lean();
  check('all insurance objects present in tenant A', aObjects.length === INSURANCE_OBJECTS.length, `${aObjects.length}`);

  const policy = aObjects.find((o) => o.apiName === 'policy');
  check('policy object uses auto-number name field', policy?.nameFieldApiName === 'policy_number');

  const policyNumberField = await FieldMeta.findOne({ tenantId: A.tenant._id, apiName: 'policy_number', objectApiName: 'policy' }).lean();
  check('policy_number field is auto_number', policyNumberField?.type === 'auto_number');

  const premiumField = await FieldMeta.findOne({ tenantId: A.tenant._id, apiName: 'premium', objectApiName: 'benefit_cover' }).lean();
  check('benefit_cover premium is currency', premiumField?.type === 'currency');

  const rateField = await FieldMeta.findOne({ tenantId: A.tenant._id, apiName: 'rate_category', objectApiName: 'benefit_cover' }).lean();
  check('rate_category has the 5 BRD rate categories', (rateField?.picklistValues || []).length === 5, `${(rateField?.picklistValues || []).length}`);

  // Isolation: tenant B (hub=sales) receives none of the insurance objects.
  const bObjects = await ObjectMeta.find({ tenantId: B.tenant._id, apiName: { $in: INSURANCE_OBJECTS.map((o) => o.apiName) } }).lean();
  check('insurance pack not seeded into tenant B', bObjects.length === 0, `${bObjects.length}`);

  // Lookup fields in the insurance pack point only at objects that exist in tenant A.
  const insApiNames = INSURANCE_OBJECTS.map((o) => o.apiName);
  const lookups = await FieldMeta.find({ tenantId: A.tenant._id, type: 'lookup', objectApiName: { $in: insApiNames } }).lean();
  const targets = [...new Set(lookups.map((f) => f.lookupObjectApiName))];
  const existingTargets = await ObjectMeta.find({ tenantId: A.tenant._id, apiName: { $in: targets } }).distinct('apiName');
  check('every lookup target object exists in the tenant', targets.every((t) => existingTargets.includes(t)), `targets=${targets.join(',')} existing=${existingTargets.join(',')}`);

  // Idempotency.
  const again = await seedInsuranceObjects(A.tenant._id, A.user._id);
  check('re-seed is idempotent (creates nothing)', again.length === 0, `${again.length}`);
} catch (err) {
  check('test harness ran without error', false, err.message);
} finally {
  await Tenant.deleteMany({ _id: { $in: tenantIds } });
  await Promise.all(
    [User, Role, ObjectMeta, FieldMeta, Session].map((M) =>
      M.deleteMany({ tenantId: { $in: tenantIds } }).catch(() => {}),
    ),
  );
  await mongoose.connection.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
