import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import DynamicRecord from '../models/DynamicRecord.js';
import AuditLog from '../models/AuditLog.js';
import { asyncHandler, sendSuccess, AppError, paginate } from '../utils/errors.js';
import { audit } from '../utils/auditLogger.js';
import { seedDefaultRoles } from '../services/roleService.js';
import { seedStandardObjects } from '../services/metadataService.js';
import PLAN_LIMITS from '../config/planLimits.js';

/** GET /api/superadmin/stats */
const getGlobalStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalTenants,
    activeTenants,
    suspendedTenants,
    deletedTenants,
    totalUsers,
    activeUsers,
    totalRecords,
    activeSessions,
    newTenantsThisMonth,
    recentLogs,
    planDistribution,
    topTenants,
  ] = await Promise.all([
    Tenant.countDocuments({}),
    Tenant.countDocuments({ status: 'active' }),
    Tenant.countDocuments({ status: 'suspended' }),
    Tenant.countDocuments({ status: 'deleted' }),
    User.countDocuments({}),
    User.countDocuments({ status: 'active' }),
    DynamicRecord.countDocuments({ isDeleted: false }),
    Session.countDocuments({ expiresAt: { $gt: now } }),
    Tenant.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('userId', 'firstName lastName email')
      .populate('tenantId', 'name slug'),
    Tenant.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Tenant.aggregate([
      { $match: { status: { $ne: 'deleted' } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'tenantId',
          as: 'usersArr',
        },
      },
      {
        $project: {
          name: 1,
          plan: 1,
          status: 1,
          createdAt: 1,
          userCount: { $size: '$usersArr' },
          'usage.records': 1,
          'usage.storageUsedMB': 1,
          'limits.maxUsers': 1,
          'limits.maxRecords': 1,
        },
      },
      { $sort: { userCount: -1 } },
      { $limit: 8 },
    ]),
  ]);

  sendSuccess(res, {
    data: {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        deleted: deletedTenants,
        newThisMonth: newTenantsThisMonth,
      },
      users: { total: totalUsers, active: activeUsers },
      records: { total: totalRecords },
      sessions: { active: activeSessions },
      planDistribution,
      topTenants,
      recentActivity: recentLogs,
    },
  });
});

/** GET /api/superadmin/tenants */
const listAllTenants = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status, plan } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {};
  if (status) query.status = status;
  if (plan) query.plan = plan;
  if (search) query.name = { $regex: search, $options: 'i' };

  const [tenants, total] = await Promise.all([
    Tenant.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Tenant.countDocuments(query),
  ]);

  const tenantIds = tenants.map((t) => t._id);
  const userCounts = await User.aggregate([
    { $match: { tenantId: { $in: tenantIds } } },
    {
      $group: {
        _id: '$tenantId',
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
      },
    },
  ]);
  const userCountMap = Object.fromEntries(
    userCounts.map((u) => [u._id.toString(), { total: u.total, active: u.active }])
  );

  const enriched = tenants.map((t) => ({
    ...t.toJSON(),
    userStats: userCountMap[t._id.toString()] || { total: 0, active: 0 },
  }));

  sendSuccess(res, paginate(enriched, total, page, limit));
});

/** GET /api/superadmin/tenants/:id */
const getTenantDetail = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) throw new AppError('Tenant not found.', 404);

  const [userStats, recordCount] = await Promise.all([
    User.aggregate([
      { $match: { tenantId: tenant._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          admin: { $sum: { $cond: [{ $eq: ['$systemRole', 'admin'] }, 1, 0] } },
          superuser: { $sum: { $cond: [{ $eq: ['$systemRole', 'superuser'] }, 1, 0] } },
        },
      },
    ]),
    DynamicRecord.countDocuments({ tenantId: tenant._id, isDeleted: false }),
  ]);

  sendSuccess(res, {
    data: {
      ...tenant.toJSON(),
      userStats: userStats[0] || { total: 0, active: 0, admin: 0, superuser: 0 },
      recordCount,
    },
  });
});

/** POST /api/superadmin/tenants */
const createTenant = asyncHandler(async (req, res) => {
  const { name, slug, plan, settings } = req.body;
  if (!name?.trim()) throw new AppError('Name is required.', 400);

  const generatedSlug =
    slug?.trim() ||
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const existing = await Tenant.findOne({
    $or: [
      { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
      { slug: generatedSlug },
    ],
  });
  if (existing) throw new AppError('A tenant with this name or slug already exists.', 409);

  const selectedPlan = PLAN_LIMITS[plan] ? plan : 'free';

  const tenant = await Tenant.create({
    name: name.trim(),
    slug: generatedSlug,
    plan: selectedPlan,
    limits: PLAN_LIMITS[selectedPlan],
    settings: settings || {},
    createdBy: req.user._id,
  });

  await seedDefaultRoles(tenant._id);
  await seedStandardObjects(tenant._id, req.user._id);

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'tenant_create',
    resource: 'Tenant',
    resourceId: tenant._id,
    req,
  });

  sendSuccess(res, { data: tenant }, 'Tenant created', 201);
});

/** PUT /api/superadmin/tenants/:id */
const updateTenant = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) throw new AppError('Tenant not found.', 404);

  const { name, plan, settings, limits, features } = req.body;
  if (name !== undefined) tenant.name = name.trim();
  if (plan !== undefined) tenant.plan = plan;
  if (settings !== undefined)
    tenant.settings = { ...(tenant.settings?.toObject ? tenant.settings.toObject() : tenant.settings), ...settings };
  if (limits !== undefined)
    tenant.limits = { ...(tenant.limits?.toObject ? tenant.limits.toObject() : tenant.limits), ...limits };
  if (features !== undefined)
    tenant.features = { ...(tenant.features?.toObject ? tenant.features.toObject() : tenant.features), ...features };

  await tenant.save();

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'update',
    resource: 'Tenant',
    resourceId: tenant._id,
    req,
  });

  sendSuccess(res, { data: tenant }, 'Tenant updated');
});

/** PATCH /api/superadmin/tenants/:id/suspend */
const suspendTenant = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) throw new AppError('Tenant not found.', 404);
  if (tenant.status === 'suspended') throw new AppError('Already suspended.', 400);

  tenant.status = 'suspended';
  tenant.suspendedAt = new Date();
  tenant.suspendedReason = req.body.reason || '';
  await tenant.save();

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'tenant_suspend',
    resource: 'Tenant',
    resourceId: tenant._id,
    req,
  });

  sendSuccess(res, { data: tenant }, 'Tenant suspended');
});

/** PATCH /api/superadmin/tenants/:id/activate */
const activateTenant = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) throw new AppError('Tenant not found.', 404);

  tenant.status = 'active';
  tenant.suspendedAt = undefined;
  tenant.suspendedReason = undefined;
  await tenant.save();

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'update',
    resource: 'Tenant',
    resourceId: tenant._id,
    req,
  });

  sendSuccess(res, { data: tenant }, 'Tenant activated');
});

/** DELETE /api/superadmin/tenants/:id */
const deleteTenant = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) throw new AppError('Tenant not found.', 404);

  tenant.status = 'deleted';
  tenant.deletedAt = new Date();
  await tenant.save();

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'tenant_delete',
    resource: 'Tenant',
    resourceId: tenant._id,
    req,
  });

  sendSuccess(res, {}, 'Tenant deleted');
});

/** GET /api/superadmin/tenants/:id/users */
const getTenantUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ tenantId: req.params.id })
    .select('-password')
    .populate('role', 'name label')
    .sort({ firstName: 1 });
  sendSuccess(res, { data: users });
});

/** PATCH /api/superadmin/tenants/:id/users/:userId/status */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive', 'suspended'].includes(status)) {
    throw new AppError('Invalid status. Must be active, inactive, or suspended.', 400);
  }

  const user = await User.findOne({ _id: req.params.userId, tenantId: req.params.id });
  if (!user) throw new AppError('User not found in this tenant.', 404);

  user.status = status;
  await user.save();

  sendSuccess(res, { data: user }, 'User status updated');
});

/** GET /api/superadmin/users */
const listAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, tenantId, status, systemRole } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {};
  if (tenantId) query.tenantId = tenantId;
  if (status) query.status = status;
  if (systemRole) query.systemRole = systemRole;
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .populate('tenantId', 'name slug plan status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(query),
  ]);

  sendSuccess(res, paginate(users, total, page, limit));
});

/** GET /api/superadmin/audit-logs */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, tenantId, action, userId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {};
  if (tenantId) query.tenantId = tenantId;
  if (action) query.action = action;
  if (userId) query.userId = userId;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'firstName lastName email')
      .populate('tenantId', 'name slug'),
    AuditLog.countDocuments(query),
  ]);

  sendSuccess(res, paginate(logs, total, page, limit));
});

export {
  getGlobalStats,
  listAllTenants,
  getTenantDetail,
  createTenant,
  updateTenant,
  suspendTenant,
  activateTenant,
  deleteTenant,
  getTenantUsers,
  updateUserStatus,
  listAllUsers,
  getAuditLogs,
};
