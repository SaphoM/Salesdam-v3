/**
 * prep-demo-data.mjs — builds ONE complete, ready-to-view example for the
 * client walkthrough: a Product, Product Version, Benefit Cover, an issued
 * Policy that's been lapsed and reinstated, and a Claim taken through to Paid.
 *
 * Run this ONCE, quietly, before opening the browser for the client — never
 * live during the presentation. It exists so Parts 6-9 of the script (the
 * application, issue, lapse/reinstate, claim) can be a pure click-through
 * tour of real, already-finished records, with no terminal visible to the
 * client. The live, in-front-of-the-client build (Parts 3-5 of the script)
 * is a SEPARATE Product/Version/Benefit Cover the presenter creates by
 * clicking "New Product" etc. — this script does not touch that part.
 *
 * Safe to re-run any time before a demo; each run creates a fresh set of
 * records (new policy/claim numbers) rather than reusing the last run's.
 *
 * Usage (from backend/): node scripts/prep-demo-data.mjs
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import ObjectMeta from '../models/ObjectMeta.js';
import DynamicRecord from '../models/DynamicRecord.js';
import * as applicationService from '../services/insurance/applicationService.js';
import * as claimService from '../services/insurance/claimService.js';

const run = async () => {
  await connectDB();

  const tenant = await Tenant.findOne({ name: 'Salesdam' });
  if (!tenant) throw new Error('Tenant "Salesdam" not found — run the normal setup first.');
  const agent = await User.findOne({ tenantId: tenant._id, username: 'insuranceuser' });
  if (!agent) throw new Error('insuranceuser not found.');

  const tenantId = tenant._id;
  const userId = agent._id;

  const makeRecord = async (apiName, data) => {
    const obj = await ObjectMeta.findOne({ tenantId, apiName });
    if (!obj) throw new Error(`Object "${apiName}" not seeded for this tenant.`);
    const record = new DynamicRecord({ tenantId, objectId: obj._id, objectApiName: apiName, ownerId: userId, createdBy: userId, lastModifiedBy: userId });
    Object.entries(data).forEach(([k, v]) => record.setField(k, v));
    await record.save();
    return record;
  };

  // Deliberately NOT named "Family Funeral Plan" / "FFP v1" — those exact
  // names are what the presenter creates LIVE in Part 3-5 of the script,
  // starting from an empty Products list. Naming this one differently keeps
  // that list genuinely empty when the live demo starts.
  console.log('Creating reference Product, Product Version, Benefit Cover...');
  const product = await makeRecord('product', {
    name: 'Family Funeral Plan (Reference Example)',
    description: 'Funeral cover for the main member, spouse and children. Prepared ahead of the client call — not the one built live in Part 3.',
  });
  const productVersion = await makeRecord('product_version', {
    name: 'FFP Reference v1',
    product: String(product._id),
    status: 'active',
    effective_from: new Date(),
    allow_spouse: true,
    allow_children: true,
    min_entry_age: 18,
    max_entry_age: 65,
    requires_approval: false,
  });
  await makeRecord('benefit_cover', {
    name: 'Main Member Only - R100k',
    product_version: String(productVersion._id),
    effective_from: new Date(),
    rate_category: 'main_member_only',
    cover_amount: 100000,
    premium: 250,
  });
  console.log(`  Product Version id: ${productVersion._id}`);

  console.log('Starting the application (Thabo Nkosi)...');
  let state = await applicationService.startApplication({
    tenantId, userId, body: { channel: 'branch', product_version_id: String(productVersion._id) },
  });
  const policyId = String(state.policy._id ?? state.policy.id);

  state = await applicationService.setMainMember({
    tenantId, userId, policyId,
    body: { name: 'Thabo Nkosi', id_number: '8501015800089', age: 41, cover_amount: 100000 },
  });
  const mainMemberId = state.policy.main_member;

  await applicationService.setPremiumPayer({ tenantId, userId, policyId, body: { client_id: mainMemberId } });
  await applicationService.calculatePremium({ tenantId, policyId });
  await applicationService.captureAcceptance({
    tenantId, userId, policyId,
    body: { channel: 'branch', accepted_terms_version: 'v1.0', signature_reference: 'sig-ref-demo-001' },
  });
  await applicationService.submitApplication({ tenantId, userId, policyId });
  state = await applicationService.issuePolicy({ tenantId, userId, policyId });
  console.log(`  Policy issued: ${state.policy.policy_number} (status: ${state.policy.status})`);

  console.log('Running the missed-payment story: lapse, then reinstate...');
  await applicationService.applyPolicyAction({ tenantId, userId, policyId, action: 'lapse', reason: 'Missed premium payment' });
  state = await applicationService.applyPolicyAction({ tenantId, userId, policyId, action: 'reinstate', reason: 'Payment received' });
  console.log(`  Policy status now: ${state.policy.status}`);

  console.log('Filing and paying the claim...');
  const lives = await DynamicRecord.find({ tenantId, objectApiName: 'insured_life', 'data.policy': policyId });
  const insuredLifeId = String(lives[0]._id);
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 1);

  let claimState = await claimService.startClaim({
    tenantId, userId,
    body: { policy_id: policyId, insured_life_id: insuredLifeId, claim_type: 'death', event_date: eventDate.toISOString().slice(0, 10) },
  });
  const claimId = String(claimState.claim._id ?? claimState.claim.id);

  await claimService.transitionClaim({ tenantId, userId, claimId, body: { to: 'under_review' } });
  await claimService.transitionClaim({ tenantId, userId, claimId, body: { to: 'approved', approved_amount: 100000 } });
  claimState = await claimService.recordClaimPayment({
    tenantId, userId, claimId, body: { amount: 100000, method: 'eft', reference: 'PAY-DEMO-001' },
  });
  console.log(`  Claim: ${claimState.claim?.claim_number ?? '(see log above)'} — paid`);

  console.log('\nDone. Pre-staged example ready:');
  console.log(`  Policy:  ${state.policy.policy_number} — http://localhost:5173/o/policy/${policyId}`);
  console.log(`  Claim:   ${claimState.claim?.claim_number ?? ''} — http://localhost:5173/o/claim/${claimId}`);
  console.log('\nThese are the records Parts 6-9 of the script open and walk through — no terminal needed live.');

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error('prep-demo-data failed:', err);
  process.exit(1);
});
