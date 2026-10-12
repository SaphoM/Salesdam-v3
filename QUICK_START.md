# Quick Start: Registration System

## 5-Minute Setup

### 1. Backend Environment (.env)
```bash
PAYSTACK_SECRET_KEY=sk_test_xxxxx  # Get from https://paystack.com/dashboard
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your@ethereal.email    # Create free at https://www.ethereal.email
SMTP_PASS=your_password
SMTP_FROM=noreply@salesdam.com

APP_URL=http://localhost:3000,http://localhost:3001
```

### 2. Backend - No Code Changes Needed
All routes are already mounted in `app.js`. Just restart:
```bash
cd backend
npm run dev
```

### 3. Frontend - Add Routes
Add to your router configuration:

```javascript
// src/routes.jsx or router config file
import RegisterComplete from '../pages/auth/RegisterComplete';
import VerificationPage from '../pages/auth/VerificationPage';
import PaymentCallbackPage from '../pages/auth/PaymentCallbackPage';

const routes = [
  {
    path: '/register',
    element: <RegisterComplete />
  },
  {
    path: '/auth/verify',
    element: <VerificationPage />
  },
  {
    path: '/payment/callback',
    element: <PaymentCallbackPage />
  },
  // ... rest of routes
];
```

### 4. Update Navigation Links
```javascript
// Any place with a signup link
<Link to="/register">Sign Up</Link>
```

### 5. Start Frontend
```bash
cd frontend
npm start
```

## Test It

1. Go to http://localhost:3000/register
2. Click "Direct Registration"
3. Fill out form (use real email you can access)
4. Complete registration
5. Check email for verification link
6. Click link → Paystack checkout opens
7. Use test card: **4084084084084081**
8. Expiry: Any future date (e.g., 12/25)
9. CVV: Any 3 digits (e.g., 123)
10. Complete payment
11. Get redirected to dashboard

## File Locations

**Backend:**
- Services: `backend/services/emailVerificationService.js`, `paystackService.js`
- Controllers: `backend/controllers/registrationController.js`, `billingController.js`
- Routes: `backend/routes/registration.js`, `billing.js`
- Models: `backend/models/RegistrationToken.js` (NEW)

**Frontend:**
- Components: `frontend/src/pages/auth/RegisterComplete.jsx`, `VerificationPage.jsx`, `PaymentCallbackPage.jsx`
- API: `frontend/src/lib/api/registration.js`

## Key Endpoints

```
POST   /api/registration/paystack             → Start registration
POST   /api/registration/verify-email          → Verify email token
GET    /api/registration/verification-status   → Check verification status
POST   /api/registration/verify-payment        → Activate account after payment
GET    /api/billing/public-plans              → Get available plans
```

## What Happens Behind the Scenes

1. **Register**: Creates user (unverified) + tenant (pending) + sends email
2. **Verify Email**: Marks email verified + creates Paystack payment link
3. **Pay**: User pays on Paystack
4. **Callback**: System verifies payment + activates user/tenant + creates session
5. **Dashboard**: User auto-logged in and redirected

## Features

✅ Choose between Microsoft Marketplace or Paystack  
✅ Multi-step registration form  
✅ Email verification  
✅ Paystack payment integration  
✅ Automatic account activation  
✅ Auto-login after payment  
✅ Hub selection (Sales/Insurance)  
✅ Plan selection with pricing  
✅ Debit order day selection  
✅ Full audit logging  

## Troubleshooting

**Email not sending?**
- In dev: Check server logs for Ethereal Email preview link
- Check SMTP credentials in .env

**Paystack payment failing?**
- Use correct test card: 4084084084084081
- Check PAYSTACK_SECRET_KEY is correct
- Verify plans exist in Paystack dashboard

**User not logging in after payment?**
- Check server logs for errors
- Verify payment verification completed successfully
- Clear browser cookies and try again

**Need detailed docs?**
- See `REGISTRATION_SETUP.md` for complete guide
- See `REGISTRATION_IMPLEMENTATION.md` for technical details

## Next: Configuration & Customization

Once working, customize:
1. Plan pricing and names
2. Email template (in `emailVerificationService.js`)
3. Form fields and validation
4. Error messages
5. UI/styling (CSS modules included)
6. Analytics pixels (Pixel tracking ready)

Ready? Go to http://localhost:3000/register 🚀
