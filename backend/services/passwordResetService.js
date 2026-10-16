import crypto from 'crypto';
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class PasswordResetService {
  /**
   * Generate a secure password reset token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a reset token for storage. Only the hash is persisted; the raw token
   * is sent to the user by email and compared by re-hashing on lookup.
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
  }

  /**
   * Send password reset email with token
   */
  async sendPasswordResetEmail(email, token, appUrl = 'http://localhost:3000') {
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
          // connectionTimeout: 10000,
          // socketTimeout: 10000,
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
            // connectionTimeout: 10000,
            // socketTimeout: 10000,
          });
          logger.info('Using Ethereal Email for testing');
        } catch (err) {
          // Fallback: Log email to console if Ethereal Email is unavailable
          logger.info(`Ethereal Email unavailable (${err.message}), using console logging for emails`);
          return this.logEmailToConsole(email, token, appUrl);
        }
      } else {
        // Production without SMTP configured
        throw new Error('SMTP not configured for production. Set SMTP_HOST, SMTP_USER, SMTP_PASS');
      }

      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      const expiryHours = 2;

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
                background: #244c64;
                color: #fff;
                padding: 12px 30px;
                border-radius: 6px;
                text-decoration: none;
                margin: 20px 0;
              }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px; }
              .footer { font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hi ${email.split('@')[0]},</p>
                <p>We received a request to reset the password for your Salesdam account. Click the button below to create a new password:</p>
                <a href="${resetUrl}" class="button">Reset Your Password</a>
                <p>Or copy and paste this link in your browser:</p>
                <p><small>${resetUrl}</small></p>
                <div class="warning">
                  <strong>⚠️ Important:</strong> This link will expire in ${expiryHours} hours. If you didn't request a password reset, you can safely ignore this email.
                </div>
                <p><strong>Security tip:</strong> Never share your password reset link with anyone. Salesdam staff will never ask for your password.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Salesdam. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@salesdam.com',
        to: email,
        subject: 'Reset Your Salesdam Password',
        html: htmlContent,
      };

      try {
        const info = await transporter.sendMail(mailOptions);

        if (process.env.NODE_ENV === 'development') {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          logger.info(`Password reset email preview URL: ${previewUrl}`);
        }

        logger.info(`Password reset email sent to ${email}`);
        return true;
      } catch (sendError) {
        // If email sending fails (timeout, connection error, etc.), fall back to console logging
        logger.error(`Email send failed (${sendError.message}), falling back to console logging`);
        return this.logEmailToConsole(email, token, appUrl);
      }
    } catch (error) {
      logger.error('Failed to initialize password reset email:', error);
      throw error;
    }
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmationEmail(email, appUrl = 'http://localhost:3000') {
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
          connectionTimeout: 10000,
          socketTimeout: 10000,
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
            connectionTimeout: 10000,
            socketTimeout: 10000,
          });
          logger.info('Using Ethereal Email for testing');
        } catch (err) {
          // Fallback: Log email to console if Ethereal Email is unavailable
          logger.info(`Ethereal Email unavailable (${err.message}), using console logging for emails`);
          return this.logConfirmationEmailToConsole(email);
        }
      } else {
        // Production without SMTP configured
        throw new Error('SMTP not configured for production. Set SMTP_HOST, SMTP_USER, SMTP_PASS');
      }

      const loginUrl = `${appUrl}/login`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; padding: 20px; border-radius: 8px; text-align: center; }
              .content { padding: 20px 0; }
              .button {
                display: inline-block;
                background: #10b981;
                color: #fff;
                padding: 12px 30px;
                border-radius: 6px;
                text-decoration: none;
                margin: 20px 0;
              }
              .info-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin: 20px 0; border-radius: 4px; }
              .info-box p { color: #047857; margin: 0; }
              .footer { font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✓ Password Changed Successfully</h1>
              </div>
              <div class="content">
                <p>Hi ${email.split('@')[0]},</p>
                <p>Your Salesdam account password has been successfully changed. If you did not make this change, please contact support immediately.</p>

                <div class="info-box">
                  <p><strong>🔒 Security Notice:</strong> Your account is now secured with the new password you set.</p>
                </div>

                <p>You can now log in with your new password:</p>
                <a href="${loginUrl}" class="button">Go to Login</a>

                <div class="info-box">
                  <p><strong>What to do next:</strong> If you did not request this password change or believe your account has been compromised, please <strong>contact support immediately</strong>.</p>
                </div>

                <p><strong>Tips for keeping your account secure:</strong></p>
                <ul>
                  <li>Never share your password with anyone</li>
                  <li>Use a strong, unique password</li>
                  <li>Log out from other devices if you shared your account</li>
                  <li>Enable multi-factor authentication if available</li>
                </ul>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Salesdam. All rights reserved.</p>
                <p>This is an automated security email. Please do not reply to this message.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@salesdam.com',
        to: email,
        subject: 'Your Salesdam Password Has Been Changed',
        html: htmlContent,
      };

      try {
        const info = await transporter.sendMail(mailOptions);

        if (process.env.NODE_ENV === 'development') {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          logger.info(`Password reset confirmation email preview URL: ${previewUrl}`);
        }

        logger.info(`Password reset confirmation email sent to ${email}`);
        return true;
      } catch (sendError) {
        // If email sending fails (timeout, connection error, etc.), fall back to console logging
        logger.error(`Email send failed (${sendError.message}), falling back to console logging`);
        return this.logConfirmationEmailToConsole(email);
      }
    } catch (error) {
      logger.error('Failed to initialize password reset confirmation email:', error);
      // Don't throw - confirmation email is not critical to the reset flow
      return false;
    }
  }

  /**
   * Fallback for development: Log email content to console with reset link
   */
  logEmailToConsole(email, token, appUrl) {
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const emailContent = `
╔════════════════════════════════════════════════════════════════════╗
║                    📧 PASSWORD RESET EMAIL                         ║
╚════════════════════════════════════════════════════════════════════╝

TO: ${email}
SUBJECT: Reset Your Salesdam Password

───────────────────────────────────────────────────────────────────────

Hi ${email.split('@')[0]},

We received a request to reset the password for your Salesdam account.
Click the link below to create a new password:

🔗 RESET LINK (valid for 2 hours):
${resetUrl}

Or copy and paste this token:
TOKEN: ${token}

───────────────────────────────────────────────────────────────────────
⚠️  Security: Never share your password reset link with anyone.
───────────────────────────────────────────────────────────────────────
    `;

    logger.info(emailContent);
    console.log(emailContent); // Also print to console for visibility

    return true;
  }

  /**
   * Fallback for development: Log confirmation email to console
   */
  logConfirmationEmailToConsole(email) {
    const emailContent = `
╔════════════════════════════════════════════════════════════════════╗
║              📧 PASSWORD RESET CONFIRMATION EMAIL                  ║
╚════════════════════════════════════════════════════════════════════╝

TO: ${email}
SUBJECT: Your Salesdam Password Has Been Changed

───────────────────────────────────────────────────────────────────────

Hi ${email.split('@')[0]},

Your Salesdam account password has been successfully changed.

If you did not make this change, please contact support immediately.

🔒 Security Notice: Your account is now secured with the new password.

Tips for keeping your account secure:
• Never share your password with anyone
• Use a strong, unique password
• Log out from other devices if you shared your account
• Enable multi-factor authentication if available

───────────────────────────────────────────────────────────────────────
This is an automated security email. Do not reply to this message.
───────────────────────────────────────────────────────────────────────
    `;

    logger.info(emailContent);
    console.log(emailContent); // Also print to console for visibility

    return true;
  }
}

export default new PasswordResetService();
