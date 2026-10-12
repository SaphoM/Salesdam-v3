import Workspace from '../models/Workspace.js';
import User from '../models/User.js';

const DEFAULT_OBJECT_GROUPS = [
  {
    name: 'Sales',
    objectApiNames: ['lead', 'deal', 'order', 'product'],
  },
  {
    name: 'Customers',
    objectApiNames: ['client', 'contact'],
  },
  {
    name: 'Activities',
    objectApiNames: ['task', 'case'],
  },
];

/**
 * Create the default "Sales Hub" workspace with predefined object groups
 * Called during user registration to set up the initial workspace
 */
export const createDefaultWorkspace = async (tenantId, userId) => {
  const existingDefault = await Workspace.findOne({
    tenantId,
    isDefault: true,
  });

  if (existingDefault) {
    return existingDefault;
  }

  // Default allowed objects for Sales Hub
  const defaultAllowedObjects = [
    'client',
    'contact',
    'lead',
    'deal',
    'order',
    'product',
    'task',
    'case',
  ];

  const workspace = await Workspace.create({
    tenantId,
    name: 'Sales Hub',
    apiName: 'sales_hub',
    description: 'Default workspace for managing sales activities',
    color: '#6366f1',
    icon: 'Briefcase',
    isDefault: true,
    status: 'active',
    allowedObjects: defaultAllowedObjects,
    objectGroups: DEFAULT_OBJECT_GROUPS,
    memberIds: [userId],
    createdBy: userId,
  });

  // Sync user's workspaceIds
  await User.updateOne(
    { _id: userId },
    { $addToSet: { workspaceIds: workspace._id } },
  );

  return workspace;
};
