# SMTP Troubleshooting Guide

## You're Getting Timeouts

The error "timeout of 30000ms exceeded" means the SMTP connection is taking too long to connect or send.

### Quick Fixes (Try These First):

1. **Check if you actually need SMTP**
   - If you're just testing locally → Remove SMTP env vars and use console logging
   - Only set SMTP vars if you have a real mail server configured

2. **Verify your SMTP credentials**
   ```bash
   # Check these are set in your .env
   echo $SMTP_HOST
   echo $SMTP_USER
   echo $SMTP_PASS
   ```

3. **Test SMTP connection manually**
   ```bash
   # Try telnet to your SMTP server (on Windows: Test-NetConnection)
   Test-NetConnection -ComputerName your-smtp-host.com -Port 587
   
   # Should show: TcpTestSucceeded : True
   ```

## SMTP Configuration Issues

### The Problem
You're in **production mode** with SMTP configured, but it's timing out during send. This usually means:

1. ❌ **Wrong SMTP settings**
   - Invalid hostname
   - Wrong port
   - Wrong authentication method

2. ❌ **Network/Firewall blocked**
   - ISP blocking port 587/465
   - Firewall not allowing SMTP traffic
   - Corporate network restrictions

3. ❌ **Server-side issues**
   - SMTP server is down
   - Account disabled/locked
   - Too many concurrent connections

## Solution Options

### Option A: Disable SMTP and Use Console Logging (Recommended for Development)

If you're still developing/testing, just remove SMTP environment variables:

```bash
# Clear these from your .env:
# SMTP_HOST=
# SMTP_USER=
# SMTP_PASS=
# SMTP_SERVICE=
```

Then restart the backend. Emails will log to console instead.

### Option B: Fix SMTP Configuration

**1. Use the correct credentials**

**Gmail (SMTP):**
```env
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SERVICE=gmail
SMTP_FROM=your-email@gmail.com
```

Note: Use **App Password** not your regular Google password. Get it from: https://myaccount.google.com/apppasswords

**SendGrid (Recommended):**
```env
NODE_ENV=production
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
SMTP_SERVICE=sendgrid
SMTP_FROM=noreply@yourcompany.com
```

**AWS SES:**
```env
NODE_ENV=production
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-username
SMTP_PASS=your-ses-password
SMTP_SERVICE=ses
SMTP_FROM=verified-email@yourcompany.com
```

**2. Test the connection**

Use this Node.js test script:

```javascript
// test-smtp.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || undefined,
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Error:', error);
  } else {
    console.log('✓ SMTP Connected Successfully');
    console.log('Ready to send emails');
  }
});
```

Run: `node test-smtp.js`

**3. Send a test email**

```javascript
const testEmail = {
  from: process.env.SMTP_FROM,
  to: 'test@example.com',
  subject: 'Test Email',
  text: 'This is a test',
};

transporter.sendMail(testEmail, (err, info) => {
  if (err) console.error('Send Error:', err);
  else console.log('Email sent:', info.response);
});
```

### Option C: Increase Timeout (Temporary)

Edit `backend/services/passwordResetService.js`:

```javascript
transporter = nodemailer.createTransport({
  // ... other settings
  connectionTimeout: 30000,  // 30 seconds
  socketTimeout: 30000,      // 30 seconds
});
```

(But this just delays the problem - fix the root cause instead)

## Port Selection Guide

| Port | Protocol | When to Use |
|------|----------|------------|
| **465** | SSL/TLS | Secure connection from start |
| **587** | STARTTLS | Upgrade to secure mid-connection |
| **25** | Plain text | Rarely used, risky |

**Common mistake:** Using port 587 with `secure: true` ❌

**Correct:** 
- Port 587 → `secure: false` ✅
- Port 465 → `secure: true` ✅

## What to Do Right Now

### Step 1: Check Current Setup
```bash
# What mode are you in?
echo $NODE_ENV  # Should be 'production' or 'development'

# What SMTP is configured?
echo $SMTP_HOST
echo $SMTP_USER
```

### Step 2: Remove SMTP If Testing
```bash
# In your .env, comment out these lines:
# SMTP_HOST=...
# SMTP_USER=...
# SMTP_PASS=...
# SMTP_SERVICE=...
```

Restart backend → Emails will log to console

### Step 3: Or Fix SMTP
- Verify credentials are correct
- Test with `test-smtp.js` script above
- Use correct port (587 or 465)
- Check firewall isn't blocking

## Still Stuck?

Run this diagnostic:

```bash
# Check what the backend is doing
grep -E "Using SMTP|Email send failed|console logging" /your/backend/logs

# Should show either:
# ✓ "Using SMTP for email sending"
# ✓ "Email send failed, falling back to console logging"
```

**If "Using SMTP" but times out:**
- SMTP settings are wrong
- Network is blocked
- SMTP server is down

**If "Using console logging":**
- Either SMTP not configured (good!)
- Or SMTP failed and fell back (also good!)

## Frontend Experience

After you fix this, when user sends reset link:

**If SMTP works:**
- ✅ Email sent to real mailbox
- ✅ Link arrives in inbox

**If SMTP fails → Falls back to console:**
- ✅ Link appears in backend console
- ✅ User can copy link from there
- ✅ No timeout error on frontend

## Questions?

Check:
1. Are you actually TRYING to use SMTP, or just testing?
2. Do you have valid SMTP credentials?
3. Is your ISP/firewall blocking port 587/465?
4. Is the SMTP server online and accepting connections?

Start with **Option A** (disable SMTP) if you're still developing. Switch to **Option B** when you're ready to send real emails.
