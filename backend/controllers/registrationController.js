import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Role from '../models/Role.js';
import RegistrationToken from '../models/RegistrationToken.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';
import { audit } from '../utils/auditLogger.js';
import { seedDefaultRoles } from '../services/roleService.js';
// import { seedSalesdamLayouts } from '../services/layoutService.js';
import { seedSalesdamObjects } from '../services/salesdamObjectsService.js';
import { createDefaultWorkspace } from '../services/workspaceService.js';
import emailVerificationService from '../services/emailVerificationService.js';
import welcomeEmailService from '../services/welcomeEmailService.js';
import paystackService from '../services/paystackService.js';
import logger from '../utils/logger.js';
import { getPlanTier } from '../config/planMapping.js';
import { executeWithTransaction } from '../utils/transactionHelper.js';
import PLAN_LIMITS from '../config/planLimits.js';

/**
 * POST /api/registration/free
 * Register user with free plan (when Paystack is disabled)
 */
const registerWithFreePlan = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    username,
    password,
    phone,
    companyName,
    employees,
  } = req.body;

  // Validation
  if (!firstName || !lastName || !email || !username || !password) {
    throw new AppError('Missing required fields', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  // Check if user exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username: username.toLowerCase() }],
  });

  if (existingUser) {
    throw new AppError('Email or username already exists', 409);
  }

  // Check if company name is unique
  const existingTenant = await Tenant.findOne({
    name: { $regex: new RegExp(`^${companyName.trim()}$`, 'i') },
  });

  if (existingTenant) {
    throw new AppError('Company name already exists', 409);
  }

  // Generate slug
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const slugExists = await Tenant.findOne({ slug });
  if (slugExists) {
    throw new AppError('Company URL already in use', 409);
  }

  // Execute registration within a transaction to ensure consistency
  const result = await executeWithTransaction(async (session) => {
    // Create tenant with FREE plan - immediately active
    const tenant = await Tenant.create(
      [
        {
          name: companyName.trim(),
          slug,
          phone,
          ownerEmail: email,
          numberOfEmployees: employees || 1,
          plan: 'free',
          status: 'pending_verification',
          registrationSource: 'manual',
          limits: PLAN_LIMITS.starter || {
            maxUsers: 5,
            maxRecords: 5000,
            maxObjects: 25,
            maxAutomations: 5,
          },
          companyProfile: {
            companyName: companyName.trim(),
            email: email,
            phone: phone || '',
            financialYearStartMonth: 1, // Default to January
          },
          invoiceQuoteSettings: {
            companyName: companyName.trim(),
            emailAddress: email,
            phoneNumber: phone || '',
            invoicePrefix: 'INV',
            invoiceStartingNumber: 1,
            quotePrefix: 'QUO',
            quoteStartingNumber: 1,
            quoteValidityDays: 30,
            defaultTaxRate: 0,
            invoiceTerms: 'Payment is due within 30 days of invoice date.',
            quoteTerms: 'This quote is valid for 30 days from the date issued.',
            paymentInstructions:
              'Please transfer payment to the bank account details provided below.',
            cancellationPolicy:
              'Orders may be cancelled up to 7 days before delivery date.',
            invoiceFooter: 'Thank you for your business!',
            showLogoOnDocuments: true,
            showBankingDetailsOnInvoices: true,
            showBankingDetailsOnQuotes: false,
            showTaxBreakdown: true,
            showDiscountField: false,
          },
        },
      ],
      { session },
    );

    const tenantDoc = tenant[0];

    // Seed default roles with transaction session
    await seedDefaultRoles(tenantDoc._id, session);

    const superuserRole = await Role.findOne({
      tenantId: tenantDoc._id,
      name: 'superuser',
    }).session(session);

    // Create user - immediately active (email verified)
    const user = await User.create(
      [
        {
          tenantId: tenantDoc._id,
          firstName,
          lastName,
          email,
          username: username.toLowerCase().trim(),
          password,
          role: superuserRole?._id,
          status: 'pending_verification',
          emailVerified: false,
        },
      ],
      { session },
    );

    const userDoc = user[0];

    // Create default "Sales Hub" workspace
    await createDefaultWorkspace(tenantDoc._id, userDoc._id);

    // Seed Salesdam objects with fields
    await seedSalesdamObjects(tenantDoc._id, userDoc._id);

    // Update tenant's allowedObjects with seeded object API names
    const allowedObjectApiNames = [
      'client',
      'contact',
      'lead',
      'deal',
      'order',
      'product',
      'task',
      'case',
      'support_document',
      'deal_line_item',
      'order_line_item',
      'quote',
      'invoice',
    ];
    await Tenant.findByIdAndUpdate(
      tenantDoc._id,
      { $set: { allowedObjects: allowedObjectApiNames } },
      { session },
    );

    return { tenant: tenantDoc, user: userDoc };
  });

  // Generate email verification token
  const verificationToken = emailVerificationService.generateToken(email);

  // Send verification email
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  await emailVerificationService.sendVerificationEmail(
    email,
    verificationToken,
    appUrl,
  );

  // Create registration token
  const registrationToken = await RegistrationToken.create({
    userId: result.user._id,
    tenantId: result.tenant._id,
    token: verificationToken,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await audit({
    tenantId: result.tenant._id,
    userId: result.user._id,
    userEmail: email,
    action: 'registration_started',
    resource: 'Registration',
    resourceId: registrationToken._id,
    req,
    metadata: { registrationSource: 'manual', plan: 'free' },
  });

  sendSuccess(
    res,
    {
      data: {
        registrationId: registrationToken._id,
        email,
        message: 'Please verify your email to continue',
      },
    },
    'Registration started. Verification email sent.',
    201,
  );
});

/**
 * POST /api/registration/paystack
 * Register user with Paystack payment method
 */
const registerWithPaystack = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    username,
    password,
    phone,
    companyName,
    employees,
    planId,
    debitOrderDay,
    hub,
  } = req.body;

  // Validation
  if (!firstName || !lastName || !email || !username || !password) {
    throw new AppError('Missing required fields', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  // Check if user exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username: username.toLowerCase() }],
  });

  if (existingUser) {
    throw new AppError('Email or username already exists', 409);
  }

  // Check if company name is unique
  const existingTenant = await Tenant.findOne({
    name: { $regex: new RegExp(`^${companyName.trim()}$`, 'i') },
  });

  if (existingTenant) {
    throw new AppError('Company name already exists', 409);
  }

  // Generate slug
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const slugExists = await Tenant.findOne({ slug });
  if (slugExists) {
    throw new AppError('Company URL already in use', 409);
  }

  // Execute registration within a transaction to ensure consistency
  const result = await executeWithTransaction(async (session) => {
    const planTier = getPlanTier(planId);

    // Create tenant with default company profile and invoice/quote settings
    const tenant = await Tenant.create(
      [
        {
          name: companyName.trim(),
          slug,
          phone,
          ownerEmail: email,
          numberOfEmployees: employees,
          plan: planTier,
          debitOrderDay: debitOrderDay ? Number(debitOrderDay) : 1,
          limits: PLAN_LIMITS[planTier],
          status: 'pending_payment',
          registrationSource: 'paystack',
          companyProfile: {
            companyName: companyName.trim(),
            email: email,
            phone: phone || '',
            financialYearStartMonth: 1, // Default to January
          },
          invoiceQuoteSettings: {
            companyName: companyName.trim(),
            emailAddress: email,
            phoneNumber: phone || '',
            invoicePrefix: 'INV',
            invoiceStartingNumber: 1,
            quotePrefix: 'QUO',
            quoteStartingNumber: 1,
            quoteValidityDays: 30,
            defaultTaxRate: 0,
            invoiceTerms: 'Payment is due within 30 days of invoice date.',
            quoteTerms: 'This quote is valid for 30 days from the date issued.',
            paymentInstructions:
              'Please transfer payment to the bank account details provided below.',
            cancellationPolicy:
              'Orders may be cancelled up to 7 days before delivery date.',
            invoiceFooter: 'Thank you for your business!',
            showLogoOnDocuments: true,
            showBankingDetailsOnInvoices: true,
            showBankingDetailsOnQuotes: false,
            showTaxBreakdown: true,
            showDiscountField: false,
          },
        },
      ],
      { session },
    );

    const tenantDoc = tenant[0];

    // Seed default roles with transaction session
    await seedDefaultRoles(tenantDoc._id, session);

    // Seed Salesdam default layouts
    // await seedSalesdamLayouts(tenantDoc._id, null);

    const superuserRole = await Role.findOne({
      tenantId: tenantDoc._id,
      name: 'superuser',
    }).session(session);

    // Create user with unverified email
    const user = await User.create(
      [
        {
          tenantId: tenantDoc._id,
          firstName,
          lastName,
          email,
          username: username.toLowerCase().trim(),
          password,
          role: superuserRole?._id,
          status: 'pending_verification',
          emailVerified: false,
        },
      ],
      { session },
    );

    const userDoc = user[0];

    // Create default "Sales Hub" workspace with predefined object groups
    await createDefaultWorkspace(tenantDoc._id, userDoc._id);

    // Seed Salesdam objects with fields
    await seedSalesdamObjects(tenantDoc._id, userDoc._id);

    // Update tenant's allowedObjects with seeded object API names
    const allowedObjectApiNames = [
      'client',
      'contact',
      'lead',
      'deal',
      'order',
      'product',
      'task',
      'case',
      'support_document',
      'deal_line_item',
      'order_line_item',
      'quote',
      'invoice',
    ];
    await Tenant.findByIdAndUpdate(
      tenantDoc._id,
      { $set: { allowedObjects: allowedObjectApiNames } },
      { session },
    );

    return { tenant: tenantDoc, user: userDoc };
  });

  // Generate email verification token
  const verificationToken = emailVerificationService.generateToken(email);

  // Send verification email
  const appUrl = process.env.APP_URL;
  await emailVerificationService.sendVerificationEmail(
    email,
    verificationToken,
    appUrl,
  );

  // Create registration token
  const registrationToken = await RegistrationToken.create({
    userId: result.user._id,
    tenantId: result.tenant._id,
    token: verificationToken,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await audit({
    tenantId: result.tenant._id,
    userId: result.user._id,
    userEmail: email,
    action: 'registration_started',
    resource: 'Registration',
    resourceId: registrationToken._id,
    req,
    metadata: { registrationSource: 'paystack' },
  });

  sendSuccess(
    res,
    {
      data: {
        registrationId: registrationToken._id,
        email,
        message: 'Please verify your email to continue',
      },
    },
    'Registration started. Verification email sent.',
    201,
  );
});

/**
 * POST /api/registration/verify-email
 * Verify email. Paystack registrations get a checkout URL; free-plan
 * registrations are activated immediately (no payment step).
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError('Verification token is required', 400);
  }

  // Find the token in the database
  const registrationToken = await RegistrationToken.findOne({
    token,
    expiresAt: { $gt: new Date() },
  }).populate('userId tenantId');

  if (!registrationToken) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  const user = registrationToken.userId;

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.emailVerified) {
    throw new AppError('Email already verified', 400);
  }

  // Mark email as verified
  user.emailVerified = true;
  await user.save();

  // Update registration token
  registrationToken.emailVerified = true;
  await registrationToken.save();

  // Get plan from tenant
  let tenant = registrationToken.tenantId;

  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }

  // Ensure we have the full tenant document
  if (tenant._id && !tenant.plan) {
    tenant = await Tenant.findById(tenant._id);
  }

  logger.info(
    `Verifying email for tenant: ${tenant._id}, registrationSource: ${tenant.registrationSource}, plan: ${tenant.plan}`,
  );

  // Initialize Paystack payment with minimum amount for verification
  let checkoutUrl = null;
  if (tenant.registrationSource === 'paystack') {
    user.status = 'pending_payment';
    await user.save();

    try {
      logger.info('Initializing verification payment for tenant:', tenant._id);

      // Minimum amount to verify banking details (R1.00 = 100 cents)
      const verificationAmount = 1;

      // Calculate next billing date based on debit order day
      const today = new Date();
      const currentDay = today.getDate();
      const debitDay = tenant.debitOrderDay;

      let nextBillingDate;
      if (currentDay >= debitDay) {
        // Next billing is on the same day next month
        nextBillingDate = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          debitDay,
        );
      } else {
        // Next billing is on the debit day this month
        nextBillingDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          debitDay,
        );
      }

      logger.info(
        `Next billing date calculated: ${nextBillingDate} for debit day: ${debitDay}`,
      );

      // Initialize payment with minimum amount for verification
      const paymentResult = await paystackService.initializePayment(
        user.email,
        verificationAmount,
        {
          userId: user._id.toString(),
          tenantId: tenant._id.toString(),
          planId: tenant.plan,
          email: user.email,
          isVerificationCharge: true,
          debitOrderDay: debitDay,
          nextBillingDate: nextBillingDate.toISOString(),
        },
      );

      logger.info('Paystack payment initialization result:', paymentResult);

      if (paymentResult && paymentResult.success) {
        checkoutUrl = paymentResult.data.authorization_url;
        logger.info(`Verification checkout URL generated: ${checkoutUrl}`);

        // Save checkout URL and billing info to tenant for future retrieval
        tenant.billing = tenant.billing || {};
        tenant.billing.checkoutUrl = checkoutUrl;
        tenant.billing.checkoutUrlGeneratedAt = new Date();
        tenant.billing.nextBillingDate = nextBillingDate;
        await tenant.save();
        logger.info(
          `Saved checkout URL and next billing date to tenant ${tenant._id}`,
        );
      } else {
        logger.error('Payment initialization failed:', paymentResult);
      }
    } catch (error) {
      logger.error('Error initializing Paystack payment:', error);
      // Continue without checkout URL, user can retry
    }
  } else {
    // Free plan (or any other non-Paystack source) - no payment required,
    // activate the account immediately and log the user in.
    logger.info(
      `Registration source is not paystack: ${tenant.registrationSource}`,
    );

    user.status = 'active';
    await user.save();

    tenant.status = 'active';
    await tenant.save();

    await req.createSession({
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip,
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    welcomeEmailService
      .sendWelcomeEmail(user.email, user.firstName, tenant.name, appUrl)
      .catch((err) => {
        logger.error('Failed to send welcome email:', err);
      });
  }

  await audit({
    tenantId: user.tenantId,
    userId: user._id,
    userEmail: user.email,
    action: 'email_verified',
    resource: 'User',
    resourceId: user._id,
    req,
  });

  sendSuccess(res, {
    data: {
      isVerified: true,
      checkoutUrl,
      registrationType: tenant.registrationSource,
      isActive: user.status === 'active',
      email: user.email,
    },
  });
});

/**
 * GET /api/registration/verification-status
 * Check email verification status
 */
const getVerificationStatus = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await User.findOne({ email }).populate('tenantId');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isVerified = user.emailVerified;
  const tenant = await Tenant.findById(user.tenantId);

  let checkoutUrl = null;

  if (isVerified && tenant?.registrationSource === 'paystack') {
    try {
      const verificationAmount = 1; // R1.00 for banking details verification

      // Calculate next billing date based on debit order day
      const today = new Date();
      const currentDay = today.getDate();
      const debitDay = tenant.debitOrderDay;

      let nextBillingDate;
      if (currentDay >= debitDay) {
        nextBillingDate = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          debitDay,
        );
      } else {
        nextBillingDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          debitDay,
        );
      }

      const paymentResult = await paystackService.initializePayment(
        user.email,
        verificationAmount,
        {
          userId: user._id.toString(),
          tenantId: tenant._id.toString(),
          planId: tenant.plan,
          email: user.email,
          isVerificationCharge: true,
          debitOrderDay: debitDay,
          nextBillingDate: nextBillingDate.toISOString(),
        },
      );

      if (paymentResult.success) {
        checkoutUrl = paymentResult.data.authorization_url;
        logger.info(`Verification checkout URL regenerated for ${email}`);
      }
    } catch (error) {
      logger.error('Error getting checkout URL:', error);
    }
  }

  sendSuccess(res, {
    data: {
      isVerified,
      checkoutUrl,
      email,
    },
  });
});

/**
 * POST /api/registration/verify-payment
 * Verify Paystack payment, refund verification charge, and activate account
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    throw new AppError('Payment reference is required', 400);
  }

  // Verify with Paystack
  const verificationResult = await paystackService.verifyTransaction(reference);

  if (!verificationResult.success) {
    throw new AppError('Payment verification failed', 400);
  }

  const transactionData = verificationResult.data;

  // Find user by email from metadata
  const email =
    transactionData.customer?.email || transactionData.metadata?.email;

  if (!email) {
    throw new AppError('Email not found in transaction data', 400);
  }

  const user = await User.findOne({ email }).populate('tenantId');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.status === 'active') {
    return sendSuccess(res, {
      data: { status: 'success', message: 'Account already activated' },
    });
  }

  const tenant = await Tenant.findById(user.tenantId);
  const isVerificationCharge =
    transactionData.metadata?.isVerificationCharge === true ||
    transactionData.metadata?.isVerificationCharge === 'true';

  // Activate user and tenant
  user.status = 'active';
  await user.save();

  let nextBillingDate = transactionData.metadata?.nextBillingDate
    ? new Date(transactionData.metadata.nextBillingDate)
    : tenant.billing?.nextBillingDate;

  const updatedTenant = await Tenant.findByIdAndUpdate(
    user.tenantId,
    {
      status: 'active',
      $set: {
        'billing.lastPaymentDate': new Date(),
        'billing.paystackReference': reference,
        'billing.planActivatedDate': new Date(),
        'billing.nextBillingDate': nextBillingDate,
        'billing.verificationPaymentRefunded': false,
      },
    },
    { new: true },
  );

  // Extract authorization code from transaction for future charges
  const authorizationCode = transactionData.authorization?.authorization_code;

  // If this was a verification charge, refund it and set up subscription
  if (isVerificationCharge) {
    logger.info(`Initiating refund for verification charge: ${reference}`);
    paystackService
      .refundTransaction(reference)
      .then(async (refundResult) => {
        if (refundResult.success) {
          logger.info(
            `Refund initiated successfully for reference: ${reference}`,
          );
          await Tenant.findByIdAndUpdate(user.tenantId, {
            $set: {
              'billing.verificationPaymentRefunded': true,
              'billing.authorizationCode': authorizationCode,
            },
          }).catch((err) => logger.error('Error updating refund status:', err));

          // Create Paystack subscription for recurring billing
          if (authorizationCode) {
            try {
              logger.info(
                `Creating Paystack subscription for tenant: ${user.tenantId}`,
              );
              const planResult = await paystackService.getPlans();

              if (planResult && planResult.success) {
                const selectedPlan = planResult.data.find((p) =>
                  p.plan_code.includes(tenant.plan),
                );

                if (selectedPlan) {
                  // Get customer ID from Paystack transaction
                  const customerId = transactionData.customer?.customer_code;

                  if (customerId) {
                    const subscriptionResult =
                      await paystackService.createSubscription(
                        customerId,
                        selectedPlan.plan_code,
                        authorizationCode,
                      );

                    if (subscriptionResult.success) {
                      logger.info(
                        `Subscription created successfully for tenant: ${user.tenantId}`,
                      );
                      await Tenant.findByIdAndUpdate(user.tenantId, {
                        $set: {
                          'billing.subscriptionId':
                            subscriptionResult.data.subscription_code,
                          'billing.customerId': customerId,
                        },
                      });
                    } else {
                      logger.error(
                        `Failed to create subscription for tenant: ${user.tenantId}`,
                        subscriptionResult,
                      );
                    }
                  } else {
                    logger.warn(
                      `No customer ID found in transaction for tenant: ${user.tenantId}`,
                    );
                  }
                }
              }
            } catch (err) {
              logger.error(`Error creating subscription:`, err);
            }
          }
        } else {
          logger.error(
            `Refund failed for reference: ${reference}`,
            refundResult,
          );
        }
      })
      .catch((err) => logger.error('Error initiating refund:', err));
  }

  await audit({
    tenantId: user.tenantId,
    userId: user._id,
    userEmail: user.email,
    action: 'payment_verified',
    resource: 'Payment',
    resourceId: reference,
    req,
    metadata: {
      amount: transactionData.amount,
      isVerificationCharge,
      nextBillingDate,
    },
  });

  // Create session for auto-login
  await req.createSession({
    userId: user._id.toString(),
    tenantId: updatedTenant._id.toString(),
    userAgent: req.headers['user-agent'] || '',
    ipAddress: req.ip,
  });

  // Send welcome email (in background, don't block response)
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  welcomeEmailService
    .sendWelcomeEmail(user.email, user.firstName, updatedTenant.name, appUrl)
    .catch((err) => {
      logger.error('Failed to send welcome email:', err);
    });

  sendSuccess(
    res,
    {
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        tenant: {
          _id: updatedTenant._id,
          name: updatedTenant.name,
          debitOrderDay: updatedTenant.debitOrderDay,
          nextBillingDate,
        },
      },
    },
    'Payment verified. Account activated.',
  );
});

export {
  registerWithFreePlan,
  registerWithPaystack,
  verifyEmail,
  getVerificationStatus,
  verifyPayment,
};
