# Registration Flow & Subscription Management Guide

## Registration Flow

### Entry Point: Login Page
User clicks "Register" button on login page → Navigates to `/register`

### Step 1: Method Selection Screen
**URL:** `/register`

Page displays "Create Your Account" with two options:
- **Microsoft Marketplace** → Redirects to external marketplace URL
- **Direct Registration** → Continues with multi-step form

### Step 2: Multi-Step Registration Form (if Direct Registration chosen)
**Steps:**
1. **Step 1: Create Your Account**
   - First Name, Last Name
   - Email Address, Phone
   - Company Name

2. **Step 2: Secure Your Account**
   - Username (email format)
   - Password, Confirm Password

3. **Step 3: Choose Your Plan**
   - Number of Employees
   - Select Plan (Starter, Basic, Standard, Professional)
   - Choose Debit Order Day (1-28)
   - Accept Terms & Conditions
   - Submit Registration

### Step 3: Email Verification
- User receives verification email
- Clicks link in email → Redirected to `/auth/verify?token=xxxxx`
- System verifies email
- Gets Paystack checkout URL

### Step 4: Payment
- User completes Paystack payment
- Redirected to `/payment/callback?reference=xxxxx`
- System verifies payment
- Account activated
- Auto-login
- Redirected to `/dashboard`

## Router Setup

Add these routes to your router configuration:

```javascript
// src/routes.jsx or your router file
import Register from '../pages/auth/Register';
import VerificationPage from '../pages/auth/VerificationPage';
import PaymentCallbackPage from '../pages/auth/PaymentCallbackPage';
import SubscriptionCancellation from '../pages/settings/SubscriptionCancellation';

const routes = [
  {
    path: '/register',
    element: <Register />
  },
  {
    path: '/auth/verify',
    element: <VerificationPage />
  },
  {
    path: '/payment/callback',
    element: <PaymentCallbackPage />
  },
  {
    path: '/settings/subscription/cancel',
    element: <SubscriptionCancellation />,
    private: true  // Requires authentication
  },
  // ... other routes
];
```

## Navigation Setup

### From Login Page
```javascript
<Link to="/register">Register</Link>
```

### From Dashboard
Add a link to subscription management (usually in settings):
```javascript
<Link to="/settings/subscription/cancel">Cancel Subscription</Link>
```

## API Endpoints

### Registration & Verification
```
POST   /api/auth/register-paystack        → register(form)
POST   /api/auth/verify-email              → verifyEmail({ token })
GET    /api/auth/verification-status       → getVerificationStatus({ email })
POST   /api/auth/verify-payment            → verify payment
```

### Subscription Management
```
GET    /api/subscription/current           → Get current subscription
GET    /api/subscription/cancellation-info → Get cancellation details
POST   /api/subscription/cancel            → Cancel subscription
POST   /api/subscription/reactivate        → Reactivate cancelled subscription
```

## Subscription Cancellation Flow

### Active Subscription
1. User navigates to `/settings/subscription/cancel`
2. See cancellation form with:
   - Warning about data loss after 30 days
   - Optional text area for cancellation reason
   - Buttons: "Keep My Subscription" or "Continue with Cancellation"
3. Click "Continue with Cancellation"
4. Confirmation dialog appears
5. Click "Yes, Cancel"
6. Backend:
   - Sets tenant status to 'deleted'
   - Deactivates all users in tenant
   - Records audit log with reason
7. User redirected to login page

### Cancelled Subscription (within 30 days)
1. User navigates to `/settings/subscription/cancel`
2. See "Subscription Cancelled" screen with:
   - Cancellation date
   - Days since cancellation
   - Days remaining until reactivation window closes
   - "Reactivate Subscription" button (if within 30 days)
3. Click "Reactivate Subscription"
4. Backend:
   - Sets tenant status back to 'active'
   - Reactivates requesting user
   - Records audit log
5. User redirected to dashboard

### Cancelled Subscription (after 30 days)
1. User navigates to `/settings/subscription/cancel`
2. See "Subscription Cancelled" screen with:
   - Information that reactivation window expired
   - "Register New Subscription" button
3. Click to register new subscription

## API Response Examples

### Cancel Subscription
**Request:**
```json
POST /api/subscription/cancel
{
  "reason": "Too expensive for our current needs"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully",
  "data": {
    "status": "cancelled",
    "message": "Your subscription has been cancelled"
  }
}
```

### Get Cancellation Info
**Response (Active):**
```json
{
  "success": true,
  "data": {
    "status": "active",
    "isCancelled": false,
    "plan": "standard",
    "registrationSource": "paystack"
  }
}
```

**Response (Cancelled, can reactivate):**
```json
{
  "success": true,
  "data": {
    "status": "deleted",
    "isCancelled": true,
    "deletedAt": "2026-07-14T10:30:00Z",
    "daysSinceCancellation": 5,
    "canReactivate": true,
    "reactivationDeadline": "2026-08-13T10:30:00Z",
    "plan": "standard"
  }
}
```

## User Experience Flow

### Sign-Up User
```
Login Page
    ↓
[Click Register]
    ↓
Method Selection Screen
    ├─ [Microsoft Marketplace] → External Marketplace
    └─ [Direct Registration]
         ↓
    Multi-Step Registration Form
         ↓ [Complete Form]
    Email Verification Screen
         ↓ [Check Email]
    Email Received
         ↓ [Click Link in Email]
    Auto-Redirected to Paystack
         ↓ [Complete Payment]
    Payment Callback
         ↓ [Payment Verified]
    Auto-Login
    Dashboard
```

### Active Subscriber
```
Dashboard
    ↓
[Click Cancel Subscription]
    ↓
Subscription Cancellation Page
    ├─ [Optional Feedback]
    ├─ [Keep Subscription] → Back to Dashboard
    └─ [Continue Cancellation]
         ↓
    Confirmation Dialog
    ├─ [No, Keep] → Back
    └─ [Yes, Cancel]
         ↓
    Subscription Cancelled
    Auto-Logout
    Login Page
```

### Cancelled Subscriber (within 30 days)
```
Login Page
    ↓
[Login]
    ↓
Dashboard (Limited Access)
    ↓
[Click Reactivate Subscription]
    ↓
[Reactivate Button]
    ↓
Subscription Reactivated
Dashboard (Full Access)
```

## File Locations

**Backend:**
- `backend/controllers/subscriptionController.js` - Subscription logic
- `backend/routes/subscription.js` - Subscription endpoints
- `backend/routes/auth.js` - Updated with registration endpoints
- `backend/app.js` - Routes registered

**Frontend:**
- `frontend/src/pages/auth/Register.jsx` - Registration component
- `frontend/src/pages/auth/VerificationPage.jsx` - Email verification
- `frontend/src/pages/auth/PaymentCallbackPage.jsx` - Payment callback
- `frontend/src/pages/settings/SubscriptionCancellation.jsx` - Cancellation
- `frontend/src/lib/api/authentication.js` - Auth API client
- `frontend/src/lib/api/subscription.js` - Subscription API client
- `frontend/src/lib/api/billing.js` - Billing API client

## Testing Checklist

- [ ] Click Register on login → See method selection screen
- [ ] Click Microsoft Marketplace → Redirected to marketplace
- [ ] Click Direct Registration → Multi-step form appears
- [ ] Fill out registration form step by step
- [ ] Click Submit → Email verification screen
- [ ] Receive verification email
- [ ] Click email link → Get redirected to Paystack
- [ ] Complete payment with test card
- [ ] Get redirected to payment callback
- [ ] See success message
- [ ] Auto-login to dashboard
- [ ] Navigate to subscription cancellation
- [ ] See warning and feedback form
- [ ] Click Continue with Cancellation
- [ ] See confirmation dialog
- [ ] Click Yes, Cancel
- [ ] Subscription cancelled, logged out
- [ ] Login again
- [ ] See reactivation option (within 30 days)
- [ ] Click Reactivate
- [ ] Subscription reactivated
- [ ] Access dashboard

## Security Notes

- All subscription endpoints require authentication
- Cancellation reason is optional (user feedback)
- Cancelled subscriptions can be reactivated within 30 days only
- After 30 days, requires new registration
- All cancellation actions are audit logged
- User data is soft-deleted (can be recovered within 30 days)
