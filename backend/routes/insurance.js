/**
 * /api/v1/insurance — versioned multi-tenant Insurance business API (BRD §8).
 *
 * Business operations, not database operations: the website/branch/telephone
 * callers start an application, capture stages, price, accept, validate and
 * submit; the platform owns the rules. Tenant scope comes ONLY from the
 * authenticated credential (session or API key) via requireAuth — never from
 * the request body (BRD §8.1).
 */
import express from 'express';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { checkObjectPermission } from '../middleware/permissions.js';
import { AppError, asyncHandler, sendSuccess } from '../utils/errors.js';
import * as applicationService from '../services/insurance/applicationService.js';
import * as endorsementService from '../services/insurance/endorsementService.js';
import * as claimService from '../services/insurance/claimService.js';
import * as approvalService from '../services/insurance/approvalService.js';
import * as policyDocumentService from '../services/insurance/policyDocumentService.js';
import * as communicationService from '../services/insurance/communicationService.js';

const router = express.Router();

router.use(requireAuth, enforceTenant);

// Correlation id for troubleshooting across systems (BRD §8.7, §25.2).
router.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || randomUUID();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

const requirePolicy = (action) => checkObjectPermission(action, 'policy');
const requireClaim = (action) => checkObjectPermission(action, 'claim');

/**
 * Enforce an API key's object allow-list on this API. The core guard in
 * middleware/auth.js only matches /records|objects/... URLs, so without this an
 * object-restricted key could reach the insurance API unrestricted.
 */
const INSURANCE_SCOPES = [
  [/^\/claims/, 'claim'],
  [/^\/endorsements/, 'policy'],
  [/^\/(policies|applications|products|product-versions)/, 'policy'],
];
router.use((req, res, next) => {
  const allowed = req.apiKey?.allowedObjects;
  if (!req.isApiKeyAuth || !allowed?.length) return next();
  const scope = INSURANCE_SCOPES.find(([re]) => re.test(req.path))?.[1];
  if (scope && !allowed.includes(scope)) {
    return next(new AppError(`This API key is not authorised to access '${scope}'.`, 403));
  }
  next();
});

// ── Product & configuration (BRD §8.4) ────────────────────────────────────────

router.get(
  '/products',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const products = await applicationService.listProducts({ tenantId: req.tenantId });
    sendSuccess(res, { data: products });
  }),
);

router.get(
  '/product-versions/:id/rules',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const rules = await applicationService.productVersionRules({
      tenantId: req.tenantId,
      versionId: req.params.id,
    });
    sendSuccess(res, { data: rules });
  }),
);

// ── Applications (BRD §8.5) ───────────────────────────────────────────────────

router.post(
  '/applications',
  requirePolicy('create'),
  asyncHandler(async (req, res) => {
    const body = { ...req.body };
    // Idempotency-Key header makes retried starts safe (BRD §8.6).
    const key = req.headers['idempotency-key'];
    if (key && !body.idempotency_key) body.idempotency_key = String(key);

    const state = await applicationService.startApplication({
      tenantId: req.tenantId,
      userId: req.user._id,
      body,
    });
    sendSuccess(res, { data: state }, 'Application started', 201);
  }),
);

router.get(
  '/applications/:id',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const state = await applicationService.getApplicationState({
      tenantId: req.tenantId,
      policyId: req.params.id,
    });
    sendSuccess(res, { data: state });
  }),
);

const put = (path, fn) =>
  router.put(
    path,
    requirePolicy('update'),
    asyncHandler(async (req, res) => {
      const state = await fn({
        tenantId: req.tenantId,
        userId: req.user._id,
        policyId: req.params.id,
        body: req.body,
      });
      sendSuccess(res, { data: state });
    }),
  );

put('/applications/:id/premium-payer', applicationService.setPremiumPayer);
put('/applications/:id/main-member', applicationService.setMainMember);
put('/applications/:id/spouse', applicationService.setSpouse);
put('/applications/:id/children', applicationService.syncChildren);
put('/applications/:id/extended-family', applicationService.syncExtendedFamily);
put('/applications/:id/beneficiary', applicationService.setBeneficiary);
put('/applications/:id/payment-method', applicationService.setPaymentMethod);

router.post(
  '/applications/:id/premium',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const premium = await applicationService.calculatePremium({
      tenantId: req.tenantId,
      policyId: req.params.id,
    });
    sendSuccess(res, { data: premium });
  }),
);

router.post(
  '/applications/:id/acceptance',
  requirePolicy('update'),
  asyncHandler(async (req, res) => {
    const acceptance = await applicationService.captureAcceptance({
      tenantId: req.tenantId,
      userId: req.user._id,
      policyId: req.params.id,
      body: req.body,
    });
    sendSuccess(res, { data: acceptance }, 'Acceptance captured', 201);
  }),
);

router.post(
  '/applications/:id/validate',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const result = await applicationService.validateApplication({
      tenantId: req.tenantId,
      policyId: req.params.id,
    });
    sendSuccess(res, { data: result });
  }),
);

router.post(
  '/applications/:id/submit',
  requirePolicy('update'),
  asyncHandler(async (req, res) => {
    const result = await applicationService.submitApplication({
      tenantId: req.tenantId,
      userId: req.user._id,
      policyId: req.params.id,
    });
    sendSuccess(res, { data: result }, 'Application submitted');
  }),
);

router.post(
  '/policies/:id/issue',
  requirePolicy('update'),
  asyncHandler(async (req, res) => {
    const state = await applicationService.issuePolicy({
      tenantId: req.tenantId,
      userId: req.user._id,
      policyId: req.params.id,
    });
    sendSuccess(res, { data: state }, 'Policy issued');
  }),
);

// ── Policies: read & servicing (BRD §12) ──────────────────────────────────────

router.get(
  '/policies',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const result = await applicationService.listPolicies({
      tenantId: req.tenantId,
      status: req.query.status,
      limit: req.query.limit,
      skip: req.query.skip,
    });
    sendSuccess(res, result);
  }),
);

router.get(
  '/policies/:id',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const state = await applicationService.getApplicationState({
      tenantId: req.tenantId,
      policyId: req.params.id,
    });
    sendSuccess(res, { data: state });
  }),
);

// Servicing actions share one validated path; an illegal action is rejected by
// the policy state machine (e.g. reinstate a cancelled policy → 409).
for (const action of ['lapse', 'reinstate', 'cancel', 'suspend', 'reactivate', 'close']) {
  router.post(
    `/policies/:id/${action}`,
    requirePolicy('update'),
    asyncHandler(async (req, res) => {
      const state = await applicationService.applyPolicyAction({
        tenantId: req.tenantId,
        userId: req.user._id,
        policyId: req.params.id,
        action,
        reason: req.body?.reason,
      });
      sendSuccess(res, { data: state }, `Policy ${action}d`);
    }),
  );
}

// ── Endorsements / amendments (BRD §17) ───────────────────────────────────────

router.post(
  '/policies/:id/endorsements',
  requirePolicy('update'),
  asyncHandler(async (req, res) => {
    const data = await endorsementService.createEndorsement({
      tenantId: req.tenantId,
      userId: req.user._id,
      policyId: req.params.id,
      body: req.body,
    });
    sendSuccess(res, { data }, 'Endorsement created', 201);
  }),
);

router.get(
  '/policies/:id/endorsements',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const data = await endorsementService.listEndorsements({
      tenantId: req.tenantId,
      policyId: req.params.id,
    });
    sendSuccess(res, { data });
  }),
);

router.get(
  '/endorsements/:id',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const data = await endorsementService.getEndorsementState({
      tenantId: req.tenantId,
      endorsementId: req.params.id,
    });
    sendSuccess(res, { data });
  }),
);

for (const action of ['submit', 'approve', 'reject', 'apply', 'cancel']) {
  router.post(
    `/endorsements/:id/${action}`,
    requirePolicy('update'),
    asyncHandler(async (req, res) => {
      const data = await endorsementService[`${action}Endorsement`]({
        tenantId: req.tenantId,
        userId: req.user._id,
        endorsementId: req.params.id,
        body: req.body,
      });
      sendSuccess(res, { data }, 'Endorsement updated');
    }),
  );
}

// ── Policy approval before issue (BRD §11.2) ────────────────────────────────────

router.get(
  '/policies/:id/approvals',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const data = await approvalService.getApprovalState({
      tenantId: req.tenantId,
      policyId: req.params.id,
    });
    sendSuccess(res, { data });
  }),
);

for (const action of ['approve', 'reject']) {
  router.post(
    `/approvals/:id/${action}`,
    requirePolicy('update'),
    asyncHandler(async (req, res) => {
      const data = await approvalService[`${action}Policy`]({
        tenantId: req.tenantId,
        userId: req.user._id,
        approvalId: req.params.id,
        body: req.body,
      });
      sendSuccess(res, { data }, `Approval ${action}d`);
    }),
  );
}

// ── Policy documents (BRD §11.3) ───────────────────────────────────────────────

router.get(
  '/policies/:id/documents',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const data = await policyDocumentService.listPolicyDocuments({
      tenantId: req.tenantId,
      policyId: req.params.id,
    });
    sendSuccess(res, { data });
  }),
);

router.post(
  '/policies/:id/documents/:type',
  requirePolicy('update'),
  asyncHandler(async (req, res) => {
    const data = await policyDocumentService.generatePolicyDocument({
      tenantId: req.tenantId,
      userId: req.user._id,
      policyId: req.params.id,
      type: req.params.type,
    });
    sendSuccess(res, { data }, 'Document generated');
  }),
);

// ── Communication logging (BRD §16.3) ─────────────────────────────────────────

router.get(
  '/policies/:id/communications',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const data = await communicationService.listCommunications({
      tenantId: req.tenantId,
      policyId: req.params.id,
    });
    sendSuccess(res, { data });
  }),
);

router.post(
  '/communications',
  requirePolicy('update'),
  asyncHandler(async (req, res) => {
    const { policy, claim, ...rest } = req.body;
    const data = await communicationService.logCommunication({
      tenantId: req.tenantId,
      userId: req.user._id,
      policyId: policy,
      claimId: claim,
      ...rest,
    });
    sendSuccess(res, { data }, 'Communication logged', 201);
  }),
);

router.get(
  '/communications',
  requirePolicy('read'),
  asyncHandler(async (req, res) => {
    const data = await communicationService.listCommunications({
      tenantId: req.tenantId,
      event: req.query.event,
      channel: req.query.channel,
    });
    sendSuccess(res, { data });
  }),
);

// ── Claims (BRD §14–§15, §21) ─────────────────────────────────────────────────

router.post(
  '/claims',
  requireClaim('create'),
  asyncHandler(async (req, res) => {
    const state = await claimService.startClaim({
      tenantId: req.tenantId,
      userId: req.user._id,
      body: req.body,
    });
    sendSuccess(res, { data: state }, 'Claim reported', 201);
  }),
);

router.get(
  '/claims/:id',
  requireClaim('read'),
  asyncHandler(async (req, res) => {
    const data = await claimService.getClaimState({
      tenantId: req.tenantId,
      claimId: req.params.id,
    });
    sendSuccess(res, { data });
  }),
);

router.post(
  '/claims/:id/requirements',
  requireClaim('update'),
  asyncHandler(async (req, res) => {
    const data = await claimService.addRequirement({
      tenantId: req.tenantId,
      userId: req.user._id,
      claimId: req.params.id,
      body: req.body,
    });
    sendSuccess(res, { data }, 'Requirement added', 201);
  }),
);

router.put(
  '/claims/:id/requirements/:requirementId',
  requireClaim('update'),
  asyncHandler(async (req, res) => {
    const data = await claimService.updateRequirement({
      tenantId: req.tenantId,
      userId: req.user._id,
      claimId: req.params.id,
      requirementId: req.params.requirementId,
      body: req.body,
    });
    sendSuccess(res, { data }, 'Requirement updated');
  }),
);

router.post(
  '/claims/:id/transition',
  requireClaim('update'),
  asyncHandler(async (req, res) => {
    const data = await claimService.transitionClaim({
      tenantId: req.tenantId,
      userId: req.user._id,
      claimId: req.params.id,
      body: req.body,
    });
    sendSuccess(res, { data }, 'Claim status updated');
  }),
);

router.post(
  '/claims/:id/payments',
  requireClaim('update'),
  asyncHandler(async (req, res) => {
    const data = await claimService.recordClaimPayment({
      tenantId: req.tenantId,
      userId: req.user._id,
      claimId: req.params.id,
      body: req.body,
    });
    sendSuccess(res, { data }, 'Payment recorded', 201);
  }),
);

router.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

export default router;
