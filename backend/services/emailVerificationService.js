import crypto from 'crypto';
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailVerificationService {
  constructor() {
    this.verificationTokens = new Map(); // In production, use Redis
  }

  /**
   * Generate and store verification token
   */
  generateToken(email) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    this.verificationTokens.set(token, {
      email,
      expiresAt,
      verified: false,
    });

    return token;
  }

  /**
   * Verify token and return email
   */
  verifyToken(token) {
    const data = this.verificationTokens.get(token);

    if (!data) {
      return null;
    }

    if (new Date() > data.expiresAt) {
      this.verificationTokens.delete(token);
      return null;
    }

    data.verified = true;
    this.verificationTokens.set(token, data);

    return data;
  }

  /**
   * Check if email is verified
   */
  isEmailVerified(email) {
    for (const [token, data] of this.verificationTokens.entries()) {
      if (data.email === email && data.verified && new Date() <= data.expiresAt) {
        return true;
      }
    }
    return false;
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email, token, appUrl = 'http://localhost:3000') {
    try {
      let transporter;

      // Check if SMTP is configured (works in both production and development)
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_SERVICE) {
        transporter = nodemailer.createTransport({
          service: process.env.SMTP_SERVICE,
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        logger.info('Using SMTP for email sending');
      } else if (process.env.NODE_ENV === 'development') {
        // Development: try Ethereal Email (free) first
        try {
          logger.info('Attempting to connect to Ethereal Email...');
          const testAccount = await Promise.race([
            nodemailer.createTestAccount({ requestsTimeout: 8000 }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Ethereal timeout')), 10000)
            ),
          ]);

          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          });
          logger.info('Using Ethereal Email for testing');
        } catch (err) {
          // Fallback: Log email to console if Ethereal Email is unavailable
          logger.info(`Ethereal Email unavailable (${err.message}), using console logging for emails`);
          return this.logEmailToConsole(email, token, appUrl, 'verification');
        }
      } else {
        // Production without SMTP configured
        throw new Error('SMTP not configured for production. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_SERVICE');
      }

      const verificationUrl = `${appUrl}/auth/verify?token=${token}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #244c64 0%, #2d5a7b 100%); color: #fff; padding: 20px; border-radius: 8px; text-align: center; }
              .content { padding: 20px 0; }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #244c64 0%, #2d5a7b 100%);
                color: #fff !important;
                padding: 14px 32px;
                border-radius: 6px;
                text-decoration: none !important;
                margin: 20px 0;
                font-weight: 600;
                font-size: 16px;
                border: none;
              }
              a.button {
                color: #fff !important;
                text-decoration: none !important;
              }
              a.button:hover {
                color: #fff !important;
              }
              a.button:visited {
                color: #fff !important;
              }
              .info-box { background: #ecf3f7; border-left: 4px solid #244c64; padding: 12px; margin: 20px 0; border-radius: 4px; }
              .footer { font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Verify Your Email</h1>
              </div>
              <div class="content">
                <p>Hi ${email.split('@')[0]},</p>
                <p>Thank you for registering with Salesdam! To complete your registration, please verify your email address by clicking the button below:</p>
                <a href="${verificationUrl}" class="button" style="display: inline-block; background: linear-gradient(135deg, #244c64 0%, #2d5a7b 100%); color: #fff !important; padding: 14px 32px; border-radius: 6px; text-decoration: none !important; font-weight: 600; font-size: 16px;">Verify Email Address</a>
                <p>Or copy and paste this link in your browser:</p>
                <p><small>${verificationUrl}</small></p>
                <div class="info-box">
                  <strong>⏰ Important:</strong> This link will expire in 24 hours.
                </div>
                <p>If you didn't create this account, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Salesdam. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@salesdam.com',
        to: email,
        subject: 'Verify Your Salesdam Account',
        html: htmlContent,
      };

      try {
        const info = await transporter.sendMail(mailOptions);

        if (process.env.NODE_ENV === 'development' && process.env.NODE_ENV !== 'production') {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl) {
            logger.info(`Email preview URL: ${previewUrl}`);
          }
        }

        logger.info(`Verification email sent to ${email}`);
        return true;
      } catch (sendError) {
        // If email sending fails (timeout, connection error, etc.), fall back to console logging
        logger.error(`Email send failed (${sendError.message}), falling back to console logging`);
        return this.logEmailToConsole(email, token, appUrl, 'verification');
      }
    } catch (error) {
      logger.error('Failed to initialize verification email:', error);
      throw error;
    }
  }

  /**
   * Clean up expired tokens periodically
   */
  cleanupExpiredTokens() {
    const now = new Date();
    for (const [token, data] of this.verificationTokens.entries()) {
      if (now > data.expiresAt) {
        this.verificationTokens.delete(token);
      }
    }
  }

  /**
   * Fallback for development: Log email content to console
   */
  logEmailToConsole(email, token, appUrl, type = 'verification') {
    const verificationUrl = `${appUrl}/auth/verify?token=${token}`;

    const emailContent = `
╔════════════════════════════════════════════════════════════════════╗
║                   📧 EMAIL VERIFICATION EMAIL                      ║
╚════════════════════════════════════════════════════════════════════╝

TO: ${email}
SUBJECT: Verify Your Salesdam Account

───────────────────────────────────────────────────────────────────────

Hi ${email.split('@')[0]},

Thank you for registering with Salesdam! To complete your registration
and access your account, please verify your email address by clicking
the link below:

🔗 VERIFICATION LINK (valid for 24 hours):
${verificationUrl}

Or copy and paste this token:
TOKEN: ${token}

───────────────────────────────────────────────────────────────────────
⚠️  If you didn't create this account, please ignore this email.
───────────────────────────────────────────────────────────────────────
    `;

    logger.info(emailContent);
    console.log(emailContent); // Also print to console for visibility

    return true;
  }
}

export default new EmailVerificationService();
