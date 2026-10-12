# Email Configuration Guide

## Overview

The Salesdam backend supports three email sending modes:

1. **SMTP Configuration** (Priority 1) - Send real emails via your mail server
2. **Ethereal Email** (Priority 2) - Free test email service (development only)
3. **Console Logging** (Priority 3) - Print emails to console (fallback)

## Email Priority Order

```
┌─────────────────────────────────────────┐
│ 1. SMTP Configured?                     │
│    ✓ Yes → Send real emails            │
│    ✗ No → Continue                      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. Development Mode?                    │
│    ✓ Yes → Try Ethereal Email          │
│    ✗ No → Error (production needs SMTP)│
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. Ethereal Email Available?            │
│    ✓ Yes → Send test email             │
│    ✗ No → Fall back to console logging │
└─────────────────────────────────────────┘
```

## Option 1: Send Real Emails in Development

Configure SMTP environment variables to send real emails from your mail provider.

### Gmail Setup (Example)

1. Enable 2-Step Verification on your Google account
2. Create an App Password: https://myaccount.google.com/apppasswords
3. Set environment variables in `.env`:

```bash
# Development with real Gmail
NODE_ENV=development
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourcompany.com
APP_URL=http://localhost:3000
```

### Other Email Providers

**Microsoft 365 / Outlook:**
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
SMTP_FROM=noreply@company.com
```

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-key
SMTP_FROM=noreply@yourcompany.com
```

**AWS SES:**
```bash
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-username
SMTP_PASS=your-ses-password
SMTP_FROM=verified-sender@yourcompany.com
```

## Option 2: Use Ethereal Email (Default Development)

Ethereal Email is a free, fully automated fake SMTP service for testing email sending.

**Configuration:**
- No setup needed!
- Just don't configure SMTP variables
- Run in development mode

**What happens:**
1. Backend automatically creates a test account on Ethereal Email
2. Sends test emails to that account
3. Console logs a preview URL: `https://ethereal.email/message/...`
4. Click the URL to see the sent email

**Example Console Output:**
```
[info]: Email preview URL: https://ethereal.email/message/xxxxxxxxxxxxxxxxxxxx
```

## Option 3: Console Logging (Fallback)

When both SMTP and Ethereal Email are unavailable, emails are logged to console.

**Configuration:**
- No setup needed!
- This is the automatic fallback

**What happens:**
1. Email content is printed to console in formatted boxes
2. Reset link or verification link is visible in output
3. Copy the link and paste in browser

**Example Console Output:**
```
╔════════════════════════════════════════════════════════════════════╗
║                    📧 PASSWORD RESET EMAIL                         ║
╚════════════════════════════════════════════════════════════════════╝

TO: user@example.com
SUBJECT: Reset Your Salesdam Password

🔗 RESET LINK (valid for 2 hours):
http://localhost:3000/reset-password?token=abc123...

TOKEN: abc123...
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SMTP_HOST` | No* | SMTP server hostname | smtp.gmail.com |
| `SMTP_PORT` | No* | SMTP port (default: 587) | 587 |
| `SMTP_SECURE` | No* | Use TLS (true/false) | false |
| `SMTP_USER` | No* | Email account username | user@gmail.com |
| `SMTP_PASS` | No* | Email account password | app-password-123 |
| `SMTP_FROM` | No | From address (default: noreply@salesdam.com) | noreply@company.com |
| `APP_URL` | No | Frontend URL for links | http://localhost:3000 |
| `NODE_ENV` | No | Environment (development/production) | development |

\* All SMTP variables must be set together to enable real email sending

## Testing Email Flows

### Test Password Reset
```bash
1. Navigate to login page
2. Click "Forgot your password?"
3. Enter username
4. Check console for email preview link or reset link
5. Click link to reset password
```

### Test Email Verification
```bash
1. Register a new account
2. Check console for email preview link or verification link
3. Click link to verify email
```

## Common Issues

### "unable to get local issuer certificate"
- **Cause:** SSL verification failing with Ethereal Email
- **Solution:** Use SMTP instead or wait for internet connection
- **Already fixed:** Added fallback to console logging

### "ECONNREFUSED"
- **Cause:** Can't connect to email server
- **Solution:** 
  - Check internet connection
  - Verify SMTP credentials
  - Use console logging fallback
- **Already fixed:** Automatic fallback to console logging

### "SMTP not configured for production"
- **Cause:** Running in production mode without SMTP setup
- **Solution:** Set SMTP environment variables before deploying

### Ethereal Email preview URL doesn't work
- **Cause:** Ethereal Email is sometimes unreachable
- **Solution:** Use SMTP instead or copy the reset token from console

## Best Practices

### Development
✅ Use Ethereal Email by default (no setup needed)
✅ Switch to SMTP if you need real emails to test actual mailbox
✅ Use console logging for quick testing without network

### Staging
✅ Configure SMTP to match production settings
✅ Test with real mailbox to catch email template issues
✅ Monitor email delivery rates

### Production
✅ Always configure SMTP with proper credentials
✅ Use transactional email service (SendGrid, AWS SES, etc.)
✅ Monitor email deliverability
✅ Have backup SMTP provider configured

## Security Notes

⚠️ **Never commit `.env` file with passwords to git**
⚠️ **Use environment variables for all credentials**
⚠️ **In production, use dedicated email service with API keys**
⚠️ **Gmail: Use App Passwords, not account password**
⚠️ **AWS SES: Use IAM credentials, not root account**

## Testing Without Network

If you're working offline or Ethereal Email is unreachable:

1. Don't configure SMTP variables
2. Emails will automatically log to console
3. Copy the reset/verification link from console
4. Paste in browser to continue testing

This ensures a smooth development experience regardless of network availability!
