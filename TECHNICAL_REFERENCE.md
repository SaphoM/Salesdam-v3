# Technical Reference: Registration System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Register   │→ │ Verify Email │→ │Payment Callback  │  │
│  │  Component   │  │  Component   │  │   Component      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         ↓                  ↓                    ↓            │
└─────────────────────────────────────────────────────────────┘
         ↓                  ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Routes                              │
│  POST /registration/paystack                               │
│  POST /registration/verify-email                           │
│  POST /registration/verify-payment                         │
│  GET  /billing/public-plans                                │
└─────────────────────────────────────────────────────────────┘
         ↓                  ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│                    Controllers                              │
│  ┌────────────────────┐  ┌──────────────────────────────┐  │
│  │RegistrationCtrl   │  │   BillingController           │  │
│  │ - register()       │  │ - getPublicPlans()            │  │
│  │ - verifyEmail()    │  │ - verifyTransaction()         │  │
│  │ - verifyPayment()  │  │                               │  │
│  └────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ↓                  ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│                    Services                                 │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │EmailVerificationSrv  │  │ PaystackService          │   │
│  │ - generateToken()    │  │ - initializePayment()    │   │
│  │ - verifyToken()      │  │ - verifyTransaction()    │   │
│  │ - sendEmail()        │  │ - getPlans()             │   │
│  └──────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↓                  ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│                 External Services                           │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │   SMTP/Email         │  │  Paystack Payment API    │   │
│  │ (Ethereal in dev)    │  │ (api.paystack.co)        │   │
│  └──────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↓                  ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    User      │  │    Tenant    │  │RegistrationToken│  │
│  │ (pending_v)  │  │ (pending_p)  │  │  (24h expiry)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## State Machine: User Registration

```
START
  │
  ├─→ METHOD SELECTION
  │   ├─→ Marketplace → External Redirect
  │   └─→ Paystack → Continue
  │
  ├─→ STEP 1: BASIC INFO
  │   └─→ Validate & Store (Form Only)
  │
  ├─→ STEP 2: SECURITY
  │   └─→ Validate Passwords
  │
  ├─→ STEP 3: PLAN
  │   └─→ Submit Registration
  │
  ├─→ USER_CREATED
  │   Status: pending_verification
  │   └─→ Send Email (token expires 24h)
  │
  ├─→ EMAIL_VERIFICATION_SENT
  │   └─→ User clicks email link
  │
  ├─→ EMAIL_VERIFIED
  │   Status: pending_payment
  │   └─→ Initialize Paystack payment
  │
  ├─→ PAYMENT_IN_PROGRESS
  │   └─→ User completes payment
  │
  ├─→ PAYMENT_VERIFIED
  │   Status: active
  │   └─→ Create session
  │
  └─→ LOGGED_IN → Dashboard
```

## Database Schema Changes

### RegistrationToken (NEW)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  tenantId: ObjectId (ref: Tenant),
  token: String (unique, indexed),
  emailVerified: Boolean (default: false),
  paymentVerified: Boolean (default: false),
  paystackReference: String,
  createdAt: Date,
  updatedAt: Date,
  expiresAt: Date (TTL index: auto-delete)
}
```

### Tenant (UPDATED)
```javascript
{
  // ... existing fields ...
  status: String (enum: [..., 'pending_payment', 'pending_verification']),
  registrationSource: String (enum: ['marketplace', 'paystack', 'manual']),
  billing: {
    // ... existing fields ...
    paystackReference: String,      // Transaction reference
    lastPaymentDate: Date,          // When payment was made
    planActivatedDate: Date,        // When plan became active
    nextBillingDate: Date           // Next scheduled charge
  }
}
```

### User (UPDATED)
```javascript
{
  // ... existing fields ...
  status: String (enum: [..., 'pending_verification', 'pending_payment']),
  emailVerified: Boolean (existing)
}
```

## API Request/Response Examples

### 1. POST /api/registration/paystack
**Request:**
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

**Response (201):**
```json
{
  "success": true,
  "message": "Registration started. Verification email sent.",
  "data": {
    "registrationId": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "message": "Please verify your email to continue"
  }
}
```

### 2. POST /api/registration/verify-email
**Request:**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "isVerified": true,
    "checkoutUrl": "https://checkout.paystack.com/abc123xyz...",
    "email": "john@example.com"
  }
}
```

### 3. POST /api/registration/verify-payment
**Request:**
```json
{
  "reference": "4918192821"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment verified. Account activated.",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tenant": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Acme Corp"
    }
  }
}
```

### 4. GET /api/billing/public-plans
**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "starter",
      "name": "Starter",
      "amount": 495,
      "description": "Perfect for solo entrepreneurs",
      "users": 1,
      "features": ["Custom objects", "Automations"]
    },
    {
      "_id": "standard",
      "name": "Standard",
      "amount": 1485,
      "description": "For growing businesses",
      "users": 10,
      "features": ["Custom objects", "Automations", "API Access"]
    }
  ]
}
```

## Error Handling

### Status Codes
- **200 OK**: Successful request
- **201 Created**: Resource created
- **400 Bad Request**: Validation error, missing fields
- **409 Conflict**: Duplicate email, company name, or username
- **423 Locked**: Account locked (too many failed attempts)

### Error Response Format
```json
{
  "success": false,
  "message": "Descriptive error message",
  "data": null
}
```

## Security Measures

### 1. Token Management
- **Generation**: `crypto.randomBytes(32).toString('hex')`
- **Storage**: In-memory Map (can use Redis)
- **Expiration**: 24 hours
- **Auto-deletion**: Via TTL index
- **One-time use**: Token deleted after verification

### 2. Password Security
- **Hashing**: bcryptjs (10 salt rounds)
- **Validation**: Min 8 chars (enforced at validation layer)
- **Confirmation**: Must match confirm password
- **Display**: Never in response/logs

### 3. Email Verification
- **Required before payment**: Prevents spam registrations
- **Link expiration**: 24 hours
- **Rate limiting**: Via express-rate-limit middleware
- **Resend**: Via verification-status endpoint

### 4. Payment Verification
- **Server-side**: Verified via Paystack API
- **Reference tracking**: Stored in database
- **One-time activation**: Can't replay payment
- **Signature verification**: Optional webhook verification

### 5. Database
- **User emails**: Unique per tenant
- **Tenant names**: Global unique
- **Input sanitization**: Via mongo-sanitize
- **Validation**: Joi schema validation

### 6. API Security
- **Rate limiting**: 500 requests/15 min global, stricter on auth
- **CORS**: Restricted to configured domains
- **CSRF protection**: Via session middleware
- **Headers**: Helmet security headers
- **Compression**: gzip compression enabled

## Email Template

Sent from `emailVerificationService.sendVerificationEmail()`:

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { 
        background: linear-gradient(135deg, #244c64 0%, #2d5a7b 100%);
        color: #fff;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
      }
      .button {
        display: inline-block;
        background: #244c64;
        color: #fff;
        padding: 12px 30px;
        border-radius: 6px;
        text-decoration: none;
      }
      .footer {
        font-size: 12px;
        color: #666;
        border-top: 1px solid #ddd;
        padding-top: 20px;
        margin-top: 40px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>Verify Your Email</h1></div>
      <div class="content">
        <p>Hi [username],</p>
        <p>Thank you for registering with Salesdam!</p>
        <a href="[verification_link]" class="button">Verify Email</a>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create this account, ignore this email.</p>
      </div>
      <div class="footer">© 2026 Salesdam. All rights reserved.</div>
    </div>
  </body>
</html>
```

## Paystack Integration

### API Calls Made by System

1. **Initialize Payment**
```javascript
POST https://api.paystack.co/transaction/initialize
Authorization: Bearer {PAYSTACK_SECRET_KEY}
Content-Type: application/json

{
  "email": "user@example.com",
  "amount": 149500,  // in cents (R1495)
  "metadata": {
    "userId": "507f...",
    "tenantId": "507f...",
    "planId": "standard"
  }
}
```

2. **Verify Transaction**
```javascript
GET https://api.paystack.co/transaction/verify/{reference}
Authorization: Bearer {PAYSTACK_SECRET_KEY}
```

### Response Handling
```javascript
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123...",
    "access_code": "abc123",
    "reference": "4918192821"
  }
}
```

## Testing with Paystack Test Cards

**Successful Payment:**
- Card: 4084084084084081
- Expiry: Any future date
- CVV: Any 3 digits
- Result: ✅ Successful

**Failed Payment:**
- Card: 5525897623456731
- Expiry: Any future date
- CVV: Any 3 digits
- Result: ❌ Failed (for testing error handling)

## Environment Variables Reference

```bash
# Required
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...

# Email (choose one approach)
# Option 1: Production SMTP
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=password

# Option 2: Development (Ethereal)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=generated@ethereal.email
SMTP_PASS=generated_password

# General
SMTP_FROM=noreply@salesdam.com
APP_URL=http://localhost:3000,https://yourdomain.com

# Optional
NODE_ENV=development
JWT_SECRET=your-secret
REDIS_URL=redis://localhost:6379
```

## Performance Considerations

- **Email Service**: Async, doesn't block registration
- **Token Cleanup**: Runs periodically, or can use Redis TTL
- **Payment Verification**: Fast webhook integration optional
- **Database Indexes**: TTL on RegistrationToken, compound on User
- **Caching**: Plans can be cached (24hr TTL)

## Monitoring & Logging

All operations logged via `auditLogger`:
- Registration started
- Email verified
- Payment verified
- Account activated

Errors logged via `logger.error()` with context.

## Deployment Notes

1. **SSL/TLS**: HTTPS required for production
2. **CORS**: Update origins in app.js for your domain
3. **Database**: Use MongoDB Atlas or equivalent
4. **Redis**: Use managed Redis (ElastiCache, Redis Cloud)
5. **Email**: Use SendGrid, Mailgun, or similar
6. **Monitoring**: Set up Sentry or similar for error tracking
7. **Backup**: Regular database backups
8. **Secrets**: Never commit .env files, use managed secrets
