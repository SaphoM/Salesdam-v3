import nodemailer from 'nodemailer';
import DynamicRecord from '../models/DynamicRecord.js';
import logger from '../utils/logger.js';

class DealConversionEmailService {
  async getSmtpTransporter() {
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_SERVICE
    ) {
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

    return null;
  }

  async sendDealConversionEmails(
    dealRecord,
    orderRecord,
    tenantId,
    appUrl = 'http://localhost:3000',
  ) {
    try {
      const transporter = await this.getSmtpTransporter();

      // Collect recipient emails
      const recipients = await this.collectRecipients(dealRecord, tenantId);

      if (recipients.length === 0) {
        logger.warn('No recipients found for deal conversion email notification');
        return;
      }

      const emailContent = this.generateEmailContent(
        dealRecord,
        orderRecord,
        appUrl,
      );

      // Send to each recipient
      for (const recipient of recipients) {
        try {
          if (!transporter) {
            logger.info(
              `Deal conversion email (dev console): To: ${recipient.email}`,
            );
            this.logEmailToConsole(recipient, dealRecord, orderRecord, appUrl);
            continue;
          }

          const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@salesdam.com',
            to: recipient.email,
            subject: `Deal "${dealRecord.getField('name')}" Converted to Order`,
            html: emailContent(recipient.firstName),
          };

          const info = await transporter.sendMail(mailOptions);

          if (process.env.NODE_ENV === 'development') {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            logger.info(
              `Deal conversion email preview URL: ${previewUrl}`,
            );
          }

          logger.info(
            `Deal conversion email sent to ${recipient.email} for deal ${dealRecord._id}`,
          );
        } catch (error) {
          logger.error(
            `Failed to send deal conversion email to ${recipient.email}:`,
            error.message,
          );
        }
      }
    } catch (error) {
      logger.error('Failed to send deal conversion emails:', error.message);
      // Don't throw — email failures shouldn't block the conversion
    }
  }

  async collectRecipients(dealRecord, tenantId) {
    const recipients = new Map(); // Use Map to deduplicate by email

    try {
      // Get sales rep
      const salesRepId = dealRecord.getField('sales_rep');
      if (salesRepId) {
        try {
          const salesRep = await DynamicRecord.findOne({
            _id: salesRepId,
            tenantId,
            objectApiName: 'user',
            isDeleted: false,
          });
          if (salesRep?.getField('email')) {
            const email = salesRep.getField('email');
            recipients.set(email, {
              email,
              firstName: salesRep.getField('firstName') || 'Sales Rep',
              role: 'Sales Rep',
            });
          }
        } catch (e) {
          logger.warn('Failed to fetch sales rep:', e.message);
        }
      }

      // Get deal owner
      if (dealRecord.ownerId) {
        try {
          const owner = await DynamicRecord.findOne({
            _id: dealRecord.ownerId,
            tenantId,
            objectApiName: 'user',
            isDeleted: false,
          });
          if (owner?.getField('email')) {
            const email = owner.getField('email');
            recipients.set(email, {
              email,
              firstName: owner.getField('firstName') || 'User',
              role: 'Deal Owner',
            });
          }
        } catch (e) {
          logger.warn('Failed to fetch deal owner:', e.message);
        }
      }

      // Get client contact if available
      const clientId = dealRecord.getField('client');
      if (clientId) {
        try {
          // First get the client record to find the primary contact
          const client = await DynamicRecord.findOne({
            _id: clientId,
            tenantId,
            objectApiName: 'client',
            isDeleted: false,
          });

          if (client && client.getField('primary_contact')) {
            const contactId = client.getField('primary_contact');
            const contact = await DynamicRecord.findOne({
              _id: contactId,
              tenantId,
              objectApiName: 'contact',
              isDeleted: false,
            });
            if (contact?.getField('email')) {
              const email = contact.getField('email');
              recipients.set(email, {
                email,
                firstName: contact.getField('firstName') || 'Client',
                role: 'Client Contact',
              });
            }
          }
        } catch (e) {
          logger.warn('Failed to fetch client contact:', e.message);
        }
      }
    } catch (error) {
      logger.error('Error collecting email recipients:', error.message);
    }

    return Array.from(recipients.values());
  }

  generateEmailContent(dealRecord, orderRecord, appUrl) {
    const dealName = dealRecord.getField('name') || 'Deal';
    const orderValue =
      orderRecord.getField('order_value') || dealRecord.getField('order_value');
    const projectCode = dealRecord.getField('project_code') || 'N/A';
    const endUser = dealRecord.getField('end_user') || 'N/A';
    const orderNumber = orderRecord.getField('order_number') || orderRecord._id;
    const orderUrl = `${appUrl}/objects/order/${orderRecord._id}`;
    const dealUrl = `${appUrl}/objects/deal/${dealRecord._id}`;
    const formattedValue = orderValue
      ? new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
        }).format(orderValue)
      : 'N/A';

    return (firstName) => `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; padding: 30px 20px; border-radius: 8px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px 0; }
            .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .success-box h3 { margin-top: 0; color: #059669; }
            .details-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 6px; }
            .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: #fff !important;
              padding: 14px 32px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
              margin: 10px 5px 10px 0;
            }
            .button-secondary {
              display: inline-block;
              background: #e5e7eb;
              color: #374151 !important;
              padding: 14px 32px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
              margin: 10px 5px 10px 0;
            }
            .cta-section { margin: 30px 0; }
            .footer { font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px; text-align: center; }
            .footer p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Deal Converted to Order ✓</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>Great news! Your deal has been successfully converted to an order.</p>

              <div class="success-box">
                <h3>Conversion Complete</h3>
                <p>The deal "<strong>${dealName}</strong>" has been converted to Order <strong>#${orderNumber}</strong> with all associated line items.</p>
              </div>

              <div class="details-box">
                <h3 style="margin-top: 0; color: #111827;">Order Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Deal Name:</span>
                  <span class="detail-value">${dealName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Order Number:</span>
                  <span class="detail-value">#${orderNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Order Value:</span>
                  <span class="detail-value">${formattedValue}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Project Code:</span>
                  <span class="detail-value">${projectCode}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">End User:</span>
                  <span class="detail-value">${endUser}</span>
                </div>
              </div>

              <div class="cta-section">
                <a href="${orderUrl}" class="button">View Order</a>
                <a href="${dealUrl}" class="button-secondary">View Deal</a>
              </div>

              <p>All line items from the deal have been automatically transferred to the order. You can now proceed with fulfillment and delivery.</p>
              <p>If you have any questions, please reach out to your team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Salesdam. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  logEmailToConsole(recipient, dealRecord, orderRecord, appUrl) {
    const dealName = dealRecord.getField('name') || 'Deal';
    const orderNumber = orderRecord.getField('order_number') || orderRecord._id;
    const orderValue =
      orderRecord.getField('order_value') || dealRecord.getField('order_value');
    const projectCode = dealRecord.getField('project_code') || 'N/A';
    const endUser = dealRecord.getField('end_user') || 'N/A';
    const formattedValue = orderValue
      ? new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
        }).format(orderValue)
      : 'N/A';

    const emailContent = `
╔════════════════════════════════════════════════════════════════════╗
║              DEAL CONVERSION EMAIL NOTIFICATION                   ║
╚════════════════════════════════════════════════════════════════════╝

TO: ${recipient.email}
SUBJECT: Deal "${dealName}" Converted to Order

───────────────────────────────────────────────────────────────────────

Hi ${recipient.firstName},

Great news! Your deal has been successfully converted to an order.

CONVERSION COMPLETE
The deal "${dealName}" has been converted to Order #${orderNumber} with all
associated line items.

ORDER DETAILS:
  • Deal Name: ${dealName}
  • Order Number: #${orderNumber}
  • Order Value: ${formattedValue}
  • Project Code: ${projectCode}
  • End User: ${endUser}

QUICK LINKS:
  • View Order: ${appUrl}/objects/order/${orderRecord._id}
  • View Deal: ${appUrl}/objects/deal/${dealRecord._id}

All line items from the deal have been automatically transferred to the order.
You can now proceed with fulfillment and delivery.

───────────────────────────────────────────────────────────────────────
© ${new Date().getFullYear()} Salesdam. All rights reserved.
───────────────────────────────────────────────────────────────────────
    `;

    logger.info(emailContent);
    console.log(emailContent);
  }
}

export default new DealConversionEmailService();
