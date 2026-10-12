# Superuser Role Protection & Permission Management

## Overview

This document describes the implementation of:
1. **Superuser Role Protection** - The superuser role cannot be edited or deleted
2. **Permission Validation** - Ensures all app and object permissions are properly configured when users are created
3. **Migration Scripts** - Tools to update existing superuser roles and validate permissions

---

## 1. Superuser Role Protection

### What Changed

- Added `isEditable` field to the Role model (default: `true`)
- Superuser role is created with `isEditable: false`
- Updated role controller to prevent editing/deleting non-editable roles
- Both app-level and API-level protections in place

### Implementation Details

**Role Model** (`backend/models/Role.js`):
```javascript
isEditable: { type: Boolean, default: true }, // superuser role is not editable
```

**Role Controller** (`backend/controllers/roleController.js`):
- `updateRole()`: Checks `isEditable` before allowing updates
- `deleteRole()`: Checks `isEditable` before allowing deletion

### API Behavior

**Attempting to edit the superuser role returns:**
```json
{
  "status": "error",
  "message": "The Super User role cannot be edited.",
  "statusCode": 403
}
```

**Attempting to delete the superuser role returns:**
```json
{
  "status": "error",
  "message": "The Super User role cannot be deleted.",
  "statusCode": 403
}
```

---

## 2. Permission Validation on User Creation

### What Changed

- New `permissionValidationService.js` validates all user permissions
- User registration validates superuser has full permissions
- User creation by admin validates assigned role permissions
- Non-critical validation errors are logged but don't fail user creation

### Permission Validation Checks

The validation service checks:

**App Permissions:**
- canManageUsers
- canManageRoles
- canManageObjects
- canManageAutomations
- canManageIntegrations
- canViewAnalytics
- canManageAnalytics
- canViewAuditLog
- canManageTenantSettings
- canManageApiKeys
- canManageWebhooks

**Object Permissions:**
- Verifies all tenant's allowed objects have permissions configured
- For superuser, verifies full CRUD (create, read, update, delete) access

### Service API

**`validateUserPermissions(userId, tenantId)`**
- Validates a specific user's permissions
- Returns: `{ valid: boolean, errors: [], warnings: [] }`

**`validateTenantUserPermissions(tenantId)`**
- Validates all users in a tenant
- Returns summary with total users, valid/invalid counts, and issues

**`initializeUserPermissions(userId, tenantId)`**
- Called when a user is created
- Logs any permission issues but doesn't block user creation

### Example Output

```
User validation failed:
- errors: ["Superuser role must have all app permissions enabled"]
- warnings: ["Object permission for 'lead' is not configured"]
```

---

## 3. Migration Scripts

### Script 1: Grant All Permissions to Superuser

**Purpose:** Ensure superuser role has ALL permissions (recommended to run first)

**Usage:**
```bash
cd backend
MONGO_URI="your_connection_string" node scripts/grant-superuser-all-permissions.js
```

**What it does:**
- Connects to MongoDB
- Finds all superuser roles across all tenants
- Grants all app permissions (11 permissions)
- Grants full CRUD + import/export for all objects
- Sets data access to "all records"
- Marks role as non-editable
- Reports the number of roles updated

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Updated 5/5 superuser role(s) with full permissions

Superuser roles now have:
  ✓ All app permissions enabled
  ✓ Full CRUD access to all objects
  ✓ Import/export permissions
  ✓ All field-level view/edit access
  ✓ Protected from editing
```

### Script 2: Mark Superuser Role as Non-Editable

**Purpose:** Mark existing superuser roles as non-editable (creates backup if permissions not full)

**Usage:**
```bash
cd backend
MONGO_URI="your_connection_string" node scripts/mark-superuser-role-not-editable.js
```

**What it does:**
- Connects to MongoDB
- Finds all superuser roles across all tenants
- Sets `isEditable: false` for each
- Reports the number of roles updated

**Example Output:**
```
✓ Updated 5 superuser role(s)
✓ All superuser roles are now marked as non-editable
  - Tenant 507f1f77bcf86cd799439011: Super User (editable: false)
  - Tenant 507f1f77bcf86cd799439012: Super User (editable: false)
  ... (more tenants)
```

### Script 2: Validate All User Permissions

**Purpose:** Audit all users' permissions across all tenants and identify configuration issues

**Usage (Validation Only):**
```bash
cd backend
node scripts/validate-user-permissions.js
```

**Usage (Auto-Fix Mode):**
```bash
cd backend
node scripts/validate-user-permissions.js --fix
```

**What it does:**
- Connects to MongoDB
- Iterates through all tenants
- For each user, validates:
  - All required app permissions are configured
  - All tenant object permissions are configured
  - Superuser has full permissions
- Reports issues found
- (With `--fix`) Automatically corrects identified issues

**Example Output:**
```
━━━ Tenant: Acme Corp (507f1f77bcf86cd799439011) ━━━
  ✓ All 15 user(s) have valid permissions

━━━ Tenant: Beta Inc (507f1f77bcf86cd799439012) ━━━
  ⚠ 2/20 user(s) have permission issues
    User: john@beta.com (507f2f88bcf86cd799439013)
      - Superuser role must have all app permissions enabled
    User: jane@beta.com (507f2f89bcf86cd799439014)
      - Object permission for "lead" is not configured

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tenants: 2
Total Users: 35
Valid: 33 (94%)
Invalid: 2
Tenants with Issues: 1

Tenants with permission issues:
  - Beta Inc: 2 user(s)

⚠ Permission issues detected. Re-run with --fix to auto-correct.
```

---

## 4. UI Changes

### Role Management Page
- Superuser role now displays a "Read-Only" badge
- Edit button for superuser role is disabled with tooltip
- Delete button is hidden for non-editable roles

### Role Edit Form
- When opening superuser role for editing:
  - All form fields are disabled
  - Permission toggles are disabled and greyed out
  - Save button is hidden
  - "Read-Only" warning message appears at top
  - Toast notification informs user the role cannot be edited

### User Experience
- Users cannot accidentally modify superuser role
- Clear visual indicators show the role is protected
- Warning message on first view explains why
- User can still view all permissions (informational)

---

## 5. Role Service Updates

**Role Seeding** (`backend/services/roleService.js`):
- Superuser role now created with `isEditable: false`
- Admin, Standard User, and Read Only roles remain editable

```javascript
{
  name: 'superuser',
  label: 'Super User',
  description: 'Full system access - all objects, all tenants',
  isSystem: true,
  isEditable: false,  // ← NEW
  appPermissions: { /* all true */ },
  dataAccess: 'all',
}
```

---

## 6. Running the Scripts

### Prerequisites

- MongoDB running and accessible via `MONGO_URI` or `MONGODB_URI` environment variable
- Node.js 16+
- Backend dependencies installed (`npm install`)

### Step-by-step (Recommended Order)

1. **Grant all permissions to superuser roles (REQUIRED - run first):**
   ```bash
   cd backend
   npm install  # if not already done
   MONGO_URI="your_connection_string" node scripts/grant-superuser-all-permissions.js
   ```
   
   Or if using different env var:
   ```bash
   MONGODB_URI="your_connection_string" node scripts/grant-superuser-all-permissions.js
   ```

2. **Mark superuser roles as non-editable (one-time operation):**
   ```bash
   cd backend
   MONGO_URI="your_connection_string" node scripts/mark-superuser-role-not-editable.js
   ```

3. **Validate all permissions in your system:**
   ```bash
   cd backend
   MONGO_URI="your_connection_string" node scripts/validate-user-permissions.js
   ```

4. **Auto-fix any permission issues found:**
   ```bash
   cd backend
   MONGO_URI="your_connection_string" node scripts/validate-user-permissions.js --fix
   ```

---

## 7. Summary of Changes

### Backend Files Modified

1. **backend/models/Role.js**
   - Added `isEditable: boolean` field (default: true)

2. **backend/controllers/roleController.js**
   - Updated `updateRole()` to check `isEditable` before allowing updates
   - Updated `deleteRole()` to check `isEditable` before allowing deletion

3. **backend/services/roleService.js**
   - Updated superuser role creation with:
     - `isEditable: false` (protected)
     - `canImport: true` (full permissions)
     - Empty fieldPermissions array (access to all fields)

4. **backend/controllers/authController.js**
   - Added `validateUserPermissions()` call on user registration

5. **backend/controllers/userController.js**
   - Added `validateUserPermissions()` call on admin user creation

### Frontend Files Modified

1. **frontend/src/pages/Admin/RoleForm.jsx**
   - Added `isReadOnly` state to track non-editable roles
   - Disable all form inputs when `isReadOnly` is true
   - Hide save button when `isReadOnly` is true
   - Show warning message when opening non-editable role
   - Disable all permission toggles with visual feedback

2. **frontend/src/pages/Admin/RoleManagement.jsx**
   - Show "Read-Only" badge for non-editable roles
   - Disable edit button for non-editable roles
   - Hide delete button for non-editable roles
   - Add tooltip to explain why edit is disabled

### Backend New Files

1. **backend/services/permissionValidationService.js**
   - `validateUserPermissions(userId, tenantId)` - Validate specific user
   - `validateTenantUserPermissions(tenantId)` - Validate all users in tenant
   - `initializeUserPermissions(userId, tenantId)` - Initialize on user creation
   - Checks all app permissions and object permissions

2. **backend/scripts/grant-superuser-all-permissions.js**
   - Grants ALL permissions to superuser role
   - Sets isEditable to false
   - Configures all objects with CRUD + import/export
   - Must run before mark-superuser-role-not-editable.js

3. **backend/scripts/mark-superuser-role-not-editable.js**
   - Marks superuser roles as non-editable
   - Reports which roles were updated

4. **backend/scripts/validate-user-permissions.js**
   - Audits all users' permissions
   - Reports configuration issues
   - Optional auto-fix mode

---

## 7. Troubleshooting

### Permission validation fails on new registrations

If permission validation fails during registration:
1. Check the role has all app permissions configured
2. Check the tenant has allowedObjects set
3. Run validation script to identify specific issues: `node scripts/validate-user-permissions.js`

### Script connection errors

If scripts fail to connect:
1. Verify MongoDB is running
2. Check `MONGODB_URI` environment variable is set correctly
3. Test connection: `mongo "mongodb://localhost:27017/salesdam"`

### Superuser role changes not taking effect

- Changes apply immediately (no caching)
- Clear browser cache if changes don't appear in UI
- Verify in database: `db.roles.findOne({ name: 'superuser' })`

---

## 8. Best Practices

✅ **Do:**
- Run `validate-user-permissions.js` after bulk user imports
- Run migration scripts during maintenance windows
- Review permission warnings in logs after registration

❌ **Don't:**
- Try to edit superuser role through API (will be blocked)
- Create custom roles with `isEditable: false` (only for system roles)
- Skip permission validation for superuser accounts

---

## Questions or Issues?

- Check logs: `tail -f logs/error.log`
- Review validation output for specific permission issues
- Verify role configuration with: `db.roles.find({ name: 'superuser' })`
