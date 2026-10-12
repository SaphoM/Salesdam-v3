# Registration System Setup Guide

Complete production-ready registration system with both Microsoft Marketplace and Paystack payment support.

## Features

- ✅ Two registration methods: Microsoft Marketplace & Direct (Paystack)
- ✅ Email verification flow
- ✅ Paystack payment integration
- ✅ Multi-step registration wizard
- ✅ Hub selection (Sales/Insurance) without switching between them
- ✅ Plan selection with pricing
- ✅ Debit order day selection
- ✅ Auto-login after payment verification
- ✅ Comprehensive audit logging

## Backend Setup

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx

# Email Configuration (for verification emails)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ethereal-user@ethereal.email
SMTP_PASS=your-ethereal-password
SMTP_FROM=noreply@salesdam.com

# App URL (for email verification links)
APP_URL=http://localhost:3000,https://yourdomain.com
```

**Getting Paystack Keys:**
1. Create a free Paystack account at https://paystack.com
2. Go to Settings → Developer
3. Copy your Secret Key (sk_live_...) and Public Key (pk_live_...)
4. Add to .env

### 2. Database Indexes

New models are created automatically. Run these migrations if needed:

```javascript
// Already handled by MongoDB auto-indexing:
// - RegistrationToken with TTL index for auto-deletion
// - Tenant with registrationSource field
// - User with status updates for pending_verification
```

### 3. Start Backend

```bash
cd backend
npm install
npm run dev
```

The server should now have these new endpoints:

- `POST /api/registration/paystack` - Start Paystack registration
- `POST /api/registration/verify-email` - Verify email token
- `GET /api/registration/verification-status` - Check verification status
- `POST /api/registration/verify-payment` - Verify Paystack payment
- `GET /api/billing/public-plans` - Get available plans

## Frontend Setup

### 1. Update Routes

Add new routes in your router configuration:

```javascript
// src/routes/AppRoutes.jsx or similar
import RegisterComplete from '../pages/auth/RegisterComplete';
import VerificationPage from '../pages/auth/VerificationPage';
import PaymentCallbackPage from '../pages/auth/PaymentCallbackPage';

export const routes = [
  {
    path: '/register',
    element: <RegisterComplete />,
  },
  {
    path: '/auth/verify',
    element: <VerificationPage />,
  },
  {
    path: '/payment/callback',
    element: <PaymentCallbackPage />,
  },
  // ... other routes
];
```

### 2. Update Navigation Links

If you have a "Sign Up" button, point it to `/register`:

```javascript
<Link to="/register">Sign Up</Link>
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm start
```

Frontend should be running at `http://localhost:3000`

## Registration Flow

### 1. Method Selection
User lands on `/register` and chooses:
- **Microsoft Marketplace**: Redirects to external marketplace
- **Direct Registration**: Proceeds with multi-step form

### 2. Microsoft Marketplace Flow
- User clicks Microsoft Marketplace option
- Redirected to Microsoft Azure Marketplace
- Microsoft handles account creation and billing
- User logs in after marketplace activation

### 3. Paystack Flow (Step-by-step)

**Step 1: Basic Information**
- First Name, Last Name
- Email, Phone
- Company Name

**Step 2: Account Security**
- Username (email format)
- Password + Confirm Password

**Step 3: Plan & Billing**
- Number of Employees
- Select Plan (Starter, Basic, Standard, Professional)
- Choose Debit Order Day (1-28)
- Accept Terms & Conditions
- Submit Registration

**Email Verification**
- User receives verification email
- Clicks link which verifies email
- Gets redirected to Paystack checkout

**Payment**
- User completes Paystack payment
- Redirected back to `/payment/callback`
- System verifies payment
- Account activated
- Auto-login and redirect to dashboard

## API Endpoints

### Registration

**POST /api/registration/paystack**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "username": "john@example.com",
  "password": "SecurePass123!",
  "phone": "+27123456789",
  "companyName": "Acme Corp",
  "employees": "5",
  "planId": "standard",
  "debitOrderDay": 1,
  "hub": "sales"
}
```

Response:
```json
{
  "success": true,
  "message": "Registration started. Verification email sent.",
  "data": {
    "registrationId": "...",
    "email": "john@example.com",
    "message": "Please verify your email to continue"
  }
}
```

### Email Verification

**POST /api/registration/verify-email**
```json
{
  "token": "verification-token-from-email"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "isVerified": true,
    "checkoutUrl": "https://checkout.paystack.com/...",
    "email": "john@example.com"
  }
}
```

### Payment Verification

**POST /api/registration/verify-payment**
```json
{
  "reference": "paystack-transaction-reference"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tenant": {
      "_id": "...",
      "name": "Acme Corp"
    }
  },
  "message": "Payment verified. Account activated."
}
```

### Public Plans

**GET /api/billing/public-plans**

Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "starter",
      "name": "Starter",
      "amount": 495,
      "description": "Perfect for solo entrepreneurs",
      "users": 1
    },
    ...
  ]
}
```

## Database Models

### RegistrationToken
Tracks registration tokens with auto-deletion after 24 hours:
```javascript
{
  userId: ObjectId,
  tenantId: ObjectId,
  token: String,
  emailVerified: Boolean,
  paymentVerified: Boolean,
  paystackReference: String,
  expiresAt: Date
}
```

### Tenant Updates
```javascript
{
  registrationSource: 'marketplace' | 'paystack' | 'manual',
  status: 'active' | 'suspended' | 'deleted' | 'pending_payment' | 'pending_verification',
  billing: {
    paystackReference: String,
    lastPaymentDate: Date,
    planActivatedDate: Date,
    nextBillingDate: Date
  }
}
```

### User Updates
```javascript
{
  status: 'active' | 'inactive' | 'pending' | 'pending_verification' | 'pending_payment' | 'suspended',
  emailVerified: Boolean
}
```

## Testing

### Test Paystack Payments

Paystack provides test cards in development mode:

```
Test Card Number: 4084084084084081
Expiry: Any future date (e.g., 12/25)
CVV: Any 3 digits (e.g., 123)
```

### Manual Testing Flow

1. **Register User**:
   ```bash
   curl -X POST http://localhost:5000/api/registration/paystack \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Test",
       "lastName": "User",
       "email": "test@example.com",
       "username": "test@example.com",
       "password": "TestPass123!",
       "phone": "+27123456789",
       "companyName": "Test Company",
       "employees": "1",
       "planId": "starter",
       "debitOrderDay": 1,
       "hub": "sales"
     }'
   ```

2. **Check Verification Email**:
   - In development, Ethereal Email provides a preview link
   - Check the server logs for the preview URL
   - Extract the token from the email link

3. **Verify Email**:
   ```bash
   curl -X POST http://localhost:5000/api/registration/verify-email \
     -H "Content-Type: application/json" \
     -d '{"token": "your-token-here"}'
   ```

4. **Get Checkout URL** and complete Paystack payment

5. **Verify Payment**:
   ```bash
   curl -X POST http://localhost:5000/api/registration/verify-payment \
     -H "Content-Type: application/json" \
     -d '{"reference": "paystack-reference"}'
   ```

## Security Checklist

- ✅ HTTPS enforced in production
- ✅ Passwords hashed with bcrypt (min 8 characters)
- ✅ Email verification prevents fake registrations
- ✅ Payment verified before account activation
- ✅ Rate limiting on registration endpoints
- ✅ CSRF protection via session middleware
- ✅ Input validation with Joi schemas
- ✅ Paystack webhook verification (optional webhook handler)
- ✅ Audit logging for all registration events
- ✅ Secure token generation and expiration

## Troubleshooting

### Email not sending
- Check SMTP credentials in .env
- In development, check Ethereal Email preview link in server logs
- Verify sender email is not marked as spam

### Paystack integration failing
- Verify PAYSTACK_SECRET_KEY is correct
- Check that plans exist in Paystack dashboard
- Test with Paystack test card provided above
- Check server logs for detailed error messages

### User not logging in after payment
- Check that payment status is 'success'
- Verify session is created properly
- Check cookie settings if HTTPS in production

### Email verification token expired
- Tokens expire after 24 hours
- User must re-register to get a new token
- Expired tokens are auto-deleted from database

## Deployment Checklist

- [ ] Add PAYSTACK_SECRET_KEY to production .env
- [ ] Update SMTP credentials for production email
- [ ] Set APP_URL to production domain
- [ ] Enable HTTPS everywhere
- [ ] Set NODE_ENV=production
- [ ] Configure Redis for production
- [ ] Set up MongoDB Atlas or similar
- [ ] Update CORS origins in app.js
- [ ] Set strong JWT_SECRET
- [ ] Enable rate limiting for production
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Test full registration flow in staging
- [ ] Set up backup and restore procedures

## Support

For issues or questions:
1. Check server logs: `npm run dev`
2. Check browser console for frontend errors
3. Verify all .env variables are set
4. Test endpoints with curl as shown above
5. Contact Paystack support for payment issues: https://support.paystack.com
