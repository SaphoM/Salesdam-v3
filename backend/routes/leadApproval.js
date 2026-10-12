import express from 'express';
import mongoose from 'mongoose';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';
import leadApprovalService from '../services/leadApprovalService.js';
import { requireAuth } from '../middleware/auth.js';
import { enforceTenant, injectTenantId } from '../middleware/tenant.js';
import DynamicRecord from '../models/DynamicRecord.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware to extract tenantId from request
router.use(requireAuth);
router.use(enforceTenant);
router.use(injectTenantId);

/**
 * POST /api/leads/:leadId/submit-for-approval
 * Submit a lead for manager approval
 */
router.post('/:leadId/submit-for-approval', asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const tenantId = req.tenantId;
  const userId = req.user._id;

  try {
    const result = await leadApprovalService.submitForApproval(tenantId, leadId, userId);
    sendSuccess(res, {
      message: 'Lead submitted for approval',
      data: result.toDataObject(),
    });
  } catch (err) {
    if (err.message.includes('do not have a manager')) {
      throw new AppError(err.message, 400);
    }
    throw err;
  }
}));

/**
 * POST /api/leads/:leadId/approve
 * Approve a lead (convert to deal)
 */
router.post('/:leadId/approve', asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const { clientId } = req.body;
  const tenantId = req.user.tenantId;
  const userId = req.user._id;

  // Verify the current user is the assigned approver
  const lead = await DynamicRecord.findOne({
    _id: leadId,
    tenantId,
    objectApiName: 'lead',
    isDeleted: false,
  });

  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const assignedApproverId = lead.getField('assigned_approver');
  if (assignedApproverId && assignedApproverId.toString() !== userId.toString()) {
    throw new AppError('Only the assigned approver can approve this lead', 403);
  }

  const result = await leadApprovalService.approveLead(tenantId, leadId, userId, clientId);

  sendSuccess(res, {
    message: 'Lead approved and converted to deal',
    data: {
      lead: result.lead.toDataObject(),
      deal: result.deal.toDataObject(),
    },
  });
}));

/**
 * POST /api/leads/:leadId/reject
 * Reject a lead
 */
router.post('/:leadId/reject', asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const { reason } = req.body;
  const tenantId = req.tenantId;
  const userId = req.user._id;

  // Verify the current user is the assigned approver
  const lead = await DynamicRecord.findOne({
    _id: leadId,
    tenantId,
    objectApiName: 'lead',
    isDeleted: false,
  });

  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const assignedApproverId = lead.getField('assigned_approver');
  if (assignedApproverId && assignedApproverId.toString() !== userId.toString()) {
    throw new AppError('Only the assigned approver can reject this lead', 403);
  }

  const result = await leadApprovalService.rejectLead(tenantId, leadId, userId, reason);

  sendSuccess(res, {
    message: 'Lead rejected',
    data: result.toDataObject(),
  });
}));

/**
 * POST /api/leads/:leadId/convert-to-deal
 * Convert a lead directly to deal (when approvals are not required)
 */
router.post('/:leadId/convert-to-deal', asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const { clientId } = req.body;
  const tenantId = req.tenantId;
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const lead = await DynamicRecord.findOne({
      _id: leadId,
      tenantId,
      objectApiName: 'lead',
      isDeleted: false,
    }).populate('ownerId', 'firstName lastName email').session(session);

    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    // Check if lead is already converted
    if (lead.getField('is_converted')) {
      throw new AppError('Lead has already been converted to a deal', 400);
    }

    const user = await User.findById(userId, 'firstName lastName email').session(session);

    // Convert lead to deal within transaction
    const deal = await leadApprovalService.convertLeadToDeal(tenantId, lead, user, clientId, session);

    // Update lead
    lead.setField('is_converted', true);
    lead.setField('related_deal_id', deal._id);
    await lead.save({ session });

    // Commit transaction
    await session.commitTransaction();

  // Send notification email to lead owner
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const dealUrl = `${appUrl}/o/deal/${deal._id}`;

  const leadTitle = lead.getField('title') || lead.getField('first_name') || 'Lead';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: #fff; padding: 20px; border-radius: 8px; text-align: center; }
          .content { padding: 20px 0; }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
            color: #fff !important;
            padding: 14px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 15px;
          }
          .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Lead Converted to Deal</h2>
          </div>
          <div class="content">
            <p>Hello ${lead.ownerId.firstName},</p>
            <p>Your lead <strong>"${leadTitle}"</strong> has been converted to a deal.</p>
            <p>You can now view and manage the deal.</p>
            <a href="${dealUrl}" class="button">View Deal</a>
          </div>
          <div class="footer">
            <p>This is an automated message from Salesdam. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

    // Send email after transaction commits
    await leadApprovalService.sendEmail(
      lead.ownerId.email,
      `Lead Converted to Deal: ${leadTitle}`,
      emailHtml
    );

    sendSuccess(res, {
      message: 'Lead converted to deal successfully',
      data: { deal: deal.toDataObject() },
    });
  } catch (err) {
    // Abort transaction on any error
    await session.abortTransaction();
    throw err;
  } finally {
    // End the session
    session.endSession();
  }
}));

/**
 * GET /api/leads/:leadId/approval-info
 * Get approval info for a lead (check if current user is approver)
 */
router.get('/:leadId/approval-info', asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const tenantId = req.tenantId;
  const userId = req.user._id;

  const lead = await DynamicRecord.findOne({
    _id: leadId,
    tenantId,
    objectApiName: 'lead',
    isDeleted: false,
  });

  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const approvalStatus = lead.getField('approval_status');
  const assignedApproverId = lead.getField('assigned_approver');
  const isCurrentUserApprover = assignedApproverId && assignedApproverId.toString() === userId.toString();

  sendSuccess(res, {
    data: {
      approvalStatus,
      assignedApproverId,
      isCurrentUserApprover,
      canApprove: isCurrentUserApprover && approvalStatus === 'Submitted for Approval',
      canReject: isCurrentUserApprover && approvalStatus === 'Submitted for Approval',
      canSubmitForApproval: approvalStatus !== 'Submitted for Approval' && approvalStatus !== 'Approved',
    },
  });
}));

export default router;
