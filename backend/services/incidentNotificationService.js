import nodemailer from 'nodemailer';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';

class IncidentNotificationService {
  async sendIncidentClosedEmail(incident, recipient) {
    try {
      let transporter;

      if (
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.SMTP_SERVICE
      ) {
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
      } else if (process.env.NODE_ENV === 'development') {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: testAccount,
        });
      } else {
        logger.warn('No email configuration found for incident notification');
        return;
      }

      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const incidentUrl = `${appUrl}/incidents/${incident._id}`;

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Incident Resolved</h1>
            </div>

            <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; margin-top: 0;">Hi ${recipient.firstName},</p>

              <p style="font-size: 14px; line-height: 1.6; color: #666;">
                We're pleased to inform you that your reported incident has been resolved.
              </p>

              <div style="background: white; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #333;">
                  ${incident.title}
                </h3>
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
                  ${incident.description}
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
                  <div>
                    <span style="color: #999;">Priority:</span>
                    <span style="font-weight: 600; color: #333; text-transform: capitalize;">
                      ${incident.priority}
                    </span>
                  </div>
                  <div>
                    <span style="color: #999;">Status:</span>
                    <span style="font-weight: 600; color: #333; text-transform: capitalize;">
                      ${incident.status}
                    </span>
                  </div>
                </div>
              </div>

              ${
                incident.resolutionNotes
                  ? `
                <div style="background: #f0f9ff; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">Resolution Notes:</h4>
                  <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.6;">
                    ${incident.resolutionNotes}
                  </p>
                </div>
              `
                  : ''
              }

              <a href="${incidentUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">
                View Incident
              </a>

              <p style="font-size: 12px; color: #999; margin-bottom: 0;">
                If you have any questions about this incident, please contact our support team.
              </p>
            </div>

            <div style="text-align: center; padding: 16px; font-size: 12px; color: #999; border-top: 1px solid #e5e7eb; margin-top: 24px;">
              <p style="margin: 0;">
                © ${new Date().getFullYear()} Salesdam. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `;

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM,
        to: recipient.email,
        subject: `Incident Resolved: ${incident.title}`,
        html: htmlContent,
      });

      logger.info(`Incident closed email sent to ${recipient.email}`, { messageId: info.messageId });
      return info;
    } catch (error) {
      logger.error('Failed to send incident closed email:', error);
      throw error;
    }
  }

  async createIncidentNotification(userId, incident, type = 'incident_closed') {
    try {
      const notificationContent = {
        incident_closed: {
          title: `Incident Resolved: ${incident.title}`,
          message: `Your reported incident has been resolved.`,
          type: 'incident_closed',
        },
        incident_status_changed: {
          title: `Incident Status Changed: ${incident.title}`,
          message: `Status changed to ${incident.status}`,
          type: 'incident_status_changed',
        },
      };

      const content = notificationContent[type];

      const notification = await Notification.create({
        userId,
        title: content.title,
        message: content.message,
        type: content.type,
        resourceId: incident._id,
        resourceType: 'Incident',
        isRead: false,
      });

      return notification;
    } catch (error) {
      logger.error('Failed to create incident notification:', error);
      throw error;
    }
  }

  async notifyIncidentClosed(incident) {
    try {
      if (!incident.reportedBy) {
        logger.warn('Incident has no reportedBy user');
        return;
      }

      const reporter = await incident.populate('reportedBy');

      if (!reporter) {
        logger.warn('Could not find incident reporter');
        return;
      }

      await Promise.all([
        this.sendIncidentClosedEmail(incident, reporter.reportedBy),
        this.createIncidentNotification(reporter.reportedBy._id, incident, 'incident_closed'),
      ]);

      logger.info(`Incident closed notifications sent for incident ${incident._id}`);
    } catch (error) {
      logger.error('Failed to send incident closed notifications:', error);
    }
  }
}

export default new IncidentNotificationService();
