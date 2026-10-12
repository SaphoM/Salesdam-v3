# Admin App Setup Guide

## Overview
The Salesdam Admin App is a dedicated portal for the internal Salesdam team to manage tenants and investigate platform incidents. Users authenticate using their **username** and password, not email.

## Access

**Admin Login URL**: `/admin-login`

Example: `https://your-domain.com/admin-login`

## Authentication

### Admin User Requirements
- Must have `systemRole` set to `'admin'` or `'superuser'`
- Must have an active status
- Must have a username configured

### Login Flow
1. Navigate to `/admin-login`
2. Enter your admin username (lowercase, spaces removed)
3. Enter your password
4. System validates admin access
5. On success, redirected to `/internal-admin/incidents`

## Features

### Incident Monitoring Dashboard
**Route**: `/internal-admin/incidents` (requires superuser role)

Features:
- Real-time incident statistics (total, open, in-progress, critical)
- Incident search and filtering
- Quick status updates from dashboard
- Tenant information visibility
- Edit tracking and highlighting
- Upvote counts and impact analysis

### Incident Management
From the dashboard, admins can:
1. **View Incidents**: Click "View" button to see full incident details
2. **Update Status**: Change incident status directly from dropdown
   - Open
   - In Progress
   - Resolved
   - Closed
3. **Filter Incidents**: By status, priority, or search query
4. **Track Changes**: See which incidents have been edited

## Creating Admin Users

### Via Registration (for new tenants)
Admin users are created as the first user during tenant registration.

### Via Admin Panel (for existing tenants)
1. A superuser/admin can create additional admin users
2. Ensure the new user has:
   - Username set (unique, lowercase)
   - Admin role assigned
   - Active status

### Database Setup
```javascript
// Example: Create admin user
const adminUser = new User({
  tenantId: ObjectId,
  firstName: "John",
  lastName: "Admin",
  email: "john.admin@salesdam.com",
  username: "johnadmin",  // lowercase, no spaces
  password: hashedPassword,
  systemRole: "admin",
  status: "active"
});
```

## Security Features

### Access Control
- Admin login is restricted to users with `admin` or `superuser` roles
- All admin actions are audit-logged
- Session-based authentication required
- CORS-protected endpoints

### Audit Trail
All admin actions are recorded:
- Incident status changes
- User login attempts (success/failure)
- Incident updates and edits
- Comment management
- Timestamp and user tracking

### Rate Limiting
Admin login endpoint has rate limiting:
- Prevents brute force attacks
- Tracks failed login attempts
- Account lockout after multiple failures

## User Workflows

### Investigating an Incident
1. Log in to admin portal
2. View incident list with real-time data
3. Filter by priority (critical incidents first)
4. Click "View" to see full incident details
5. Review:
   - Full description
   - User comments and discussions
   - Upvote count (impact indicator)
   - Edit history (if modified)
   - Tenant information
6. Update status as investigation progresses
7. Add internal notes (if needed)

### Monitoring System Health
1. Dashboard stats show:
   - Total active incidents
   - Open incidents requiring immediate attention
   - In-progress incident count
   - Critical-priority incidents
2. Use filters to focus on specific areas
3. Sort by newest, most-upvoted, or highest-priority
4. Quick actions for status updates

## Admin User Roles

### Admin
- Can view all incidents
- Can update incident status
- Can add internal comments
- Can view tenant information
- Cannot modify system settings

### Superuser
- Can view all incidents
- Can update incident status
- Can add internal comments
- Can view tenant information
- Can manage other admin users
- Can access system settings

## Best Practices

### Username Conventions
- Lowercase letters and numbers only
- No spaces (remove before login)
- Descriptive but concise (e.g., `johnadmin`, `marias`, `teamlead`)
- Unique across the system

### Incident Investigation
1. Always check upvote count for impact assessment
2. Review related incidents before marking resolved
3. Add internal notes for future reference
4. Update status to "In Progress" when actively working
5. Mark as "Resolved" only when fix is confirmed

### Tenant Management
- Monitor incident frequency per tenant
- Identify patterns or recurring issues
- Escalate critical issues immediately
- Track incident resolution times

## Troubleshooting

### "Admin access required" Error
- Verify your username and password
- Check that your account has admin/superuser role
- Contact superuser to verify permissions

### Login Not Working
1. Verify username (should be lowercase, no spaces)
2. Confirm password is correct
3. Check account status (should be "active")
4. Wait before retrying (rate limiting may apply)

### Can't See Incidents
- Verify you're logged in to admin app
- Check URL is `/internal-admin/incidents`
- Ensure your role is admin or superuser
- Clear browser cache and try again

## Environment Variables

### For Deployment
Set these environment variables:
- `CORS_ORIGINS`: URLs where admin app runs (comma-separated)
- `JWT_SECRET`: For session tokens
- `MONGO_URI`: Database connection

Example:
```bash
CORS_ORIGINS=http://localhost:3000,https://admin.salesdam.com
```

## Support & Escalation

For issues or questions:
1. Check this guide
2. Review audit logs for context
3. Contact Salesdam support team
4. Submit incident for investigation

---

**Last Updated**: 2026-07-26
**Version**: 1.0
