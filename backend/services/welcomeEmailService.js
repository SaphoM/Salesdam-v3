import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class WelcomeEmailService {
  async getSmtpTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_SERVICE) {
      return nodemailer.createTransport({
        service: process.env.SMTP_SERVICE,
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    if (process.env.NODE_ENV === 'development') {
      try {
        const testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
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
      } catch (err) {
        logger.warn('Ethereal Email unavailable, emails will be logged to console');
        return null;
      }
    }

    throw new Error('SMTP not configured');
  }

  async sendWelcomeEmail(email, firstName, companyName, appUrl = 'http://localhost:3000') {
    try {
      const transporter = await this.getSmtpTransporter();
      if (!transporter) {
        logger.info(`Welcome email (dev console): To: ${email}, Company: ${companyName}`);
        this.logWelcomeEmailToConsole(email, firstName, companyName, appUrl);
        return;
      }

      const loginUrl = `${appUrl}/login`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #244c64 0%, #2d5a7b 100%); color: #fff; padding: 30px 20px; border-radius: 8px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 30px 0; }
              .feature-box { background: #f5f5f5; border-left: 4px solid #244c64; padding: 15px; margin: 15px 0; border-radius: 4px; }
              .feature-box h3 { margin-top: 0; color: #244c64; }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #244c64 0%, #2d5a7b 100%);
                color: #fff !important;
                padding: 14px 32px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: bold;
                margin-top: 20px;
              }
              .cta-section { text-align: center; margin: 30px 0; }
              .footer { font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px; text-align: center; }
              ul { margin: 10px 0; padding-left: 20px; }
              li { margin: 8px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Salesdam!</h1>
              </div>
              <div class="content">
                <p>Hi ${firstName},</p>
                <p>Thank you for registering with Salesdam! We're thrilled to have you on board.</p>

                <p><strong>Your ${companyName} workspace is now active and ready to use.</strong></p>

                <div class="feature-box">
                  <h3>Getting Started</h3>
                  <p>Your Salesdam account includes:</p>
                  <ul>
                    <li>Customizable sales pipeline management</li>
                    <li>Lead and deal tracking</li>
                    <li>Account and contact management</li>
                    <li>Order and quote management</li>
                    <li>Real-time analytics and reporting</li>
                    <li>Team collaboration tools</li>
                  </ul>
                </p>
              </div>

                <div class="feature-box">
                  <h3>Need Help?</h3>
                  <p>Check out our documentation and guides to get the most out of Salesdam. Our support team is also here to help!</p>
                </div>

                <div class="cta-section">
                  <a href="${loginUrl}" class="button">Log In to Your Workspace</a>
                </div>

                <p>If you have any questions or need support, don't hesitate to reach out to our team.</p>
                <p>Happy selling!</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Salesdam. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@salesdam.com',
        to: email,
        subject: `Welcome to Salesdam, ${firstName}!`,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV === 'development') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        logger.info(`Welcome email preview URL: ${previewUrl}`);
      }

      logger.info(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error('Failed to send welcome email:', error.message);
      throw error;
    }
  }

  logWelcomeEmailToConsole(email, firstName, companyName, appUrl) {
    const loginUrl = `${appUrl}/login`;
    const emailContent = `
╔════════════════════════════════════════════════════════════════════╗
║                    WELCOME EMAIL                                   ║
╚════════════════════════════════════════════════════════════════════╝

TO: ${email}
SUBJECT: Welcome to Salesdam, ${firstName}!

───────────────────────────────────────────────────────────────────────

Hi ${firstName},

Thank you for registering with Salesdam! We're thrilled to have you on board.

Your ${companyName} workspace is now active and ready to use.

Your Salesdam account includes:
• Customizable sales pipeline management
• Lead and deal tracking
• Account and contact management
• Order and quote management
• Real-time analytics and reporting
• Team collaboration tools

LOG IN: ${loginUrl}

───────────────────────────────────────────────────────────────────────
© ${new Date().getFullYear()} Salesdam. All rights reserved.
───────────────────────────────────────────────────────────────────────
    `;

    logger.info(emailContent);
    console.log(emailContent);
  }
}

export default new WelcomeEmailService();
