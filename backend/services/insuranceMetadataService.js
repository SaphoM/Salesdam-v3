import { INSURANCE_OBJECTS } from '../config/insurance/objects.js';
import { seedObjectDefinitions } from './metadataService.js';
import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import ObjectMeta from '../models/ObjectMeta.js';

/**
 * Seed the Insurance Workspace object pack into a tenant.
 *
 * Opt-in: call only for tenants whose `hub` is `insurance` (or that the
 * operator explicitly enables). Idempotent — re-running skips existing objects.
 *
 * @returns {Promise<Array>} the ObjectMeta documents created (empty if already seeded)
 */
export const seedInsuranceObjects = (tenantId, userId) =>
  seedObjectDefinitions(INSURANCE_OBJECTS, tenantId, userId);

/**
 * Sidebar groups for the Insurance Workspace (BRD §4.1). Home/Collections/
 * Omnichannel Inbox/Reports/Settings are app-level surfaces, not objects, and
 * are not created here.
 */
const INSURANCE_NAV_GROUPS = [
  { name: 'Sales', objectApiNames: ['lead'] },
  { name: 'Customers', objectApiNames: ['client'] },
  { name: 'Policies', objectApiNames: ['policy', 'insured_life', 'policy_party', 'policy_acceptance'] },
  { name: 'Finance', objectApiNames: ['account', 'transaction'] },
  { name: 'Claims', objectApiNames: ['claim', 'claim_requirement', 'claim_payment'] },
  { name: 'Products', objectApiNames: ['product', 'product_version', 'benefit_cover', 'child_benefit_rule'] },
  { name: 'Service', objectApiNames: ['case', 'task'] },
];

/**
 * Create (or reuse) the "Insurance" Workspace and add the user as a member.
 * Only objects that actually exist for the tenant are grouped, so this is safe
 * to run before/after the object pack. Idempotent.
 */
export const seedInsuranceWorkspace = async (tenantId, userId) => {
  const existing = await Workspace.findOne({ tenantId, apiName: 'insurance' });
  if (existing) {
    if (userId) {
      await Workspace.updateOne({ _id: existing._id }, { $addToSet: { memberIds: userId } });
      await User.updateOne({ _id: userId, tenantId }, { $addToSet: { workspaceIds: existing._id } });
    }
    return existing;
  }

  const existingApiNames = new Set(await ObjectMeta.find({ tenantId }).distinct('apiName'));
  const objectGroups = INSURANCE_NAV_GROUPS.map((g) => ({
    name: g.name,
    objectApiNames: g.objectApiNames.filter((o) => existingApiNames.has(o)),
  })).filter((g) => g.objectApiNames.length > 0);
  const allowedObjects = [...new Set(objectGroups.flatMap((g) => g.objectApiNames))];

  const workspace = await Workspace.create({
    tenantId,
    name: 'Insurance',
    apiName: 'insurance',
    description: 'Insurance Workspace — policy, collections and claims',
    color: '#0ea5e9',
    icon: 'ShieldCheck',
    status: 'active',
    isDefault: false,
    allowedObjects,
    objectGroups,
    memberIds: userId ? [userId] : [],
    createdBy: userId,
  });

  if (userId) {
    await User.updateOne({ _id: userId, tenantId }, { $addToSet: { workspaceIds: workspace._id } });
  }
  return workspace;
};

export default { seedInsuranceObjects, seedInsuranceWorkspace };
