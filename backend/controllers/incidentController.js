import Incident from '../models/Incident.js';
import IncidentComment from '../models/IncidentComment.js';
import User from '../models/User.js';
import { asyncHandler, sendSuccess, AppError, paginate } from '../utils/errors.js';
import { audit } from '../utils/auditLogger.js';
import logger from '../utils/logger.js';
import incidentNotificationService from '../services/incidentNotificationService.js';

// GET /api/admin/incidents - List all incidents across all tenants (admin only)
const getAllIncidents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, priority, search, sortBy = 'createdAt' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {
    isDeleted: false,
  };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const sortOptions = {
    createdAt: { createdAt: -1 },
    upvotes: { upvoteCount: -1 },
    priority: { priority: 1 },
    recent: { updatedAt: -1 },
  };

  const [incidents, total] = await Promise.all([
    Incident.find(query)
      .populate('reportedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('tenantId', 'name')
      .sort(sortOptions[sortBy] || sortOptions.createdAt)
      .skip(skip)
      .limit(parseInt(limit)),
    Incident.countDocuments(query),
  ]);

  sendSuccess(res, paginate(incidents, total, page, limit));
});

// GET /api/incidents - List incidents
const getIncidents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, priority, search, sortBy = 'createdAt' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {
    tenantId: req.tenantId,
    isDeleted: false,
  };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const sortOptions = {
    createdAt: { createdAt: -1 },
    upvotes: { upvoteCount: -1 },
    priority: { priority: 1 },
    recent: { updatedAt: -1 },
  };

  const [incidents, total] = await Promise.all([
    Incident.find(query)
      .populate('reportedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .sort(sortOptions[sortBy] || sortOptions.createdAt)
      .skip(skip)
      .limit(parseInt(limit)),
    Incident.countDocuments(query),
  ]);

  sendSuccess(res, paginate(incidents, total, page, limit));
});

// GET /api/incidents/:id - Get incident details
const getIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
    isDeleted: false,
  })
    .populate('reportedBy', 'firstName lastName email avatar')
    .populate('assignedTo', 'firstName lastName email avatar')
    .populate('upvotedBy', 'firstName lastName email');

  if (!incident) {
    throw new AppError('Incident not found', 404);
  }

  const comments = await IncidentComment.find({
    incidentId: req.params.id,
    isDeleted: false,
  })
    .populate('author', 'firstName lastName email avatar')
    .sort({ createdAt: 1 });

  sendSuccess(res, { data: { ...incident.toJSON(), comments } });
});

// POST /api/incidents - Create new incident
const createIncident = asyncHandler(async (req, res) => {
  const { title, description, priority = 'medium', attachments = [] } = req.body;

  if (!title?.trim()) throw new AppError('Title is required', 400);
  if (!description?.trim()) throw new AppError('Description is required', 400);

  const incident = await Incident.create({
    tenantId: req.tenantId,
    title: title.trim(),
    description: description.trim(),
    priority,
    reportedBy: req.user._id,
    createdBy: req.user._id,
    attachments,
  });

  const populated = await incident.populate('reportedBy', 'firstName lastName email');

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'incident_create',
    resource: 'Incident',
    resourceId: incident._id,
    req,
    metadata: { priority, title },
  });

  sendSuccess(res, { data: populated }, 'Incident created successfully', 201);
});

// PATCH /api/incidents/:id - Update incident
const updateIncident = asyncHandler(async (req, res) => {
  const { status, priority, assignedTo, resolutionNotes, tags } = req.body;

  const incident = await Incident.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
    isDeleted: false,
  });

  if (!incident) throw new AppError('Incident not found', 404);

  if (status) incident.status = status;
  if (priority) incident.priority = priority;
  if (assignedTo) incident.assignedTo = assignedTo;
  if (resolutionNotes) incident.resolutionNotes = resolutionNotes;
  if (tags) incident.tags = tags;

  if (status === 'resolved' && !incident.resolvedAt) {
    incident.resolvedAt = new Date();
  }

  incident.lastModifiedBy = req.user._id;
  await incident.save();

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'incident_update',
    resource: 'Incident',
    resourceId: incident._id,
    req,
    metadata: { status, priority },
  });

  sendSuccess(res, { data: incident }, 'Incident updated');
});

// POST /api/incidents/:id/upvote - Upvote an incident
const upvoteIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
    isDeleted: false,
  });

  if (!incident) throw new AppError('Incident not found', 404);

  const userId = req.user._id;
  const hasUpvoted = incident.upvotedBy.includes(userId);

  if (hasUpvoted) {
    incident.upvotedBy = incident.upvotedBy.filter((id) => !id.equals(userId));
    incident.upvoteCount = Math.max(0, incident.upvoteCount - 1);
  } else {
    incident.upvotedBy.push(userId);
    incident.upvoteCount += 1;
  }

  await incident.save();

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'incident_upvote',
    resource: 'Incident',
    resourceId: incident._id,
    req,
  });

  sendSuccess(res, { data: incident }, hasUpvoted ? 'Upvote removed' : 'Incident upvoted');
});

// POST /api/incidents/:id/comments - Add comment
const addComment = asyncHandler(async (req, res) => {
  const { content, attachments = [] } = req.body;

  if (!content?.trim()) throw new AppError('Comment content is required', 400);

  const incident = await Incident.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
    isDeleted: false,
  });

  if (!incident) throw new AppError('Incident not found', 404);

  const comment = await IncidentComment.create({
    tenantId: req.tenantId,
    incidentId: req.params.id,
    content: content.trim(),
    attachments,
    author: req.user._id,
    createdBy: req.user._id,
  });

  const populated = await comment.populate('author', 'firstName lastName email avatar');

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'incident_comment_create',
    resource: 'IncidentComment',
    resourceId: comment._id,
    req,
  });

  sendSuccess(res, { data: populated }, 'Comment added', 201);
});

// DELETE /api/incidents/:id/comments/:commentId - Delete comment
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await IncidentComment.findOne({
    _id: req.params.commentId,
    incidentId: req.params.id,
    tenantId: req.tenantId,
  });

  if (!comment) throw new AppError('Comment not found', 404);

  if (!comment.author.equals(req.user._id) && req.user.systemRole !== 'admin') {
    throw new AppError('Unauthorized to delete this comment', 403);
  }

  comment.isDeleted = true;
  await comment.save();

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'incident_comment_delete',
    resource: 'IncidentComment',
    resourceId: comment._id,
    req,
  });

  sendSuccess(res, {}, 'Comment deleted');
});

// PATCH /api/incidents/:id/edit - Edit incident (reporter or admin only)
const editIncident = asyncHandler(async (req, res) => {
  const { title, description, priority, attachments } = req.body;

  const incident = await Incident.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
    isDeleted: false,
  });

  if (!incident) throw new AppError('Incident not found', 404);

  // Only reporter or admin can edit
  if (!incident.reportedBy.equals(req.user._id) && req.user.systemRole !== 'admin') {
    throw new AppError('Only the reporter or admin can edit this incident', 403);
  }

  // Track changes
  const changes = {};
  if (title && title !== incident.title) {
    changes.title = incident.title;
    incident.title = title;
  }
  if (description && description !== incident.description) {
    changes.description = incident.description.substring(0, 50);
    incident.description = description;
  }
  if (priority && priority !== incident.priority) {
    changes.priority = incident.priority;
    incident.priority = priority;
  }
  if (attachments && attachments.length > 0) {
    incident.attachments = attachments;
  }

  // Mark as edited
  if (Object.keys(changes).length > 0) {
    incident.isEdited = true;
    incident.editedAt = new Date();
    incident.editHistory.push({
      editedBy: req.user._id,
      changes,
    });
  }

  incident.lastModifiedBy = req.user._id;
  await incident.save();

  await incident.populate('reportedBy', 'firstName lastName email');
  await incident.populate('assignedTo', 'firstName lastName email');

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'incident_edit',
    resource: 'Incident',
    resourceId: incident._id,
    req,
    metadata: { changedFields: Object.keys(changes) },
  });

  sendSuccess(res, { data: incident }, 'Incident updated successfully');
});

// PATCH /api/incidents/:id/close - Close incident (reporter or admin only)
const closeIncident = asyncHandler(async (req, res) => {
  const { resolutionNotes } = req.body;

  const incident = await Incident.findOne({
    _id: req.params.id,
    tenantId: req.tenantId,
    isDeleted: false,
  });

  if (!incident) throw new AppError('Incident not found', 404);

  // Only reporter or admin can close
  if (!incident.reportedBy.equals(req.user._id) && req.user.systemRole !== 'admin') {
    throw new AppError('Only the reporter or admin can close this incident', 403);
  }

  incident.status = 'closed';
  incident.lastModifiedBy = req.user._id;
  if (resolutionNotes) incident.resolutionNotes = resolutionNotes;
  await incident.save();

  await incident.populate('reportedBy', 'firstName lastName email');
  await incident.populate('assignedTo', 'firstName lastName email');

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'incident_close',
    resource: 'Incident',
    resourceId: incident._id,
    req,
  });

  // Send notification email and in-app notification to reporter
  incidentNotificationService.notifyIncidentClosed(incident).catch(err => {
    logger.error('Failed to send incident closed notification:', err);
  });

  sendSuccess(res, { data: incident }, 'Incident closed successfully');
});

// POST /api/incidents/:id/comments/:commentId/replies - Add reply to comment
const addReply = asyncHandler(async (req, res) => {
  const { content, attachments = [] } = req.body;

  if (!content?.trim()) throw new AppError('Reply content is required', 400);

  const comment = await IncidentComment.findOne({
    _id: req.params.commentId,
    incidentId: req.params.id,
    tenantId: req.tenantId,
    isDeleted: false,
  });

  if (!comment) throw new AppError('Comment not found', 404);

  const reply = {
    content: content.trim(),
    attachments,
    author: req.user._id,
  };

  comment.replies.push(reply);
  await comment.save();

  const populated = await comment.populate({
    path: 'replies.author',
    select: 'firstName lastName email avatar',
  });

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'incident_reply_create',
    resource: 'IncidentComment',
    resourceId: comment._id,
    req,
  });

  sendSuccess(res, { data: { comment: populated, reply: reply } }, 'Reply added', 201);
});

// DELETE /api/incidents/:id/comments/:commentId/replies/:replyId - Delete reply
const deleteReply = asyncHandler(async (req, res) => {
  const comment = await IncidentComment.findOne({
    _id: req.params.commentId,
    incidentId: req.params.id,
    tenantId: req.tenantId,
  });

  if (!comment) throw new AppError('Comment not found', 404);

  const reply = comment.replies.id(req.params.replyId);
  if (!reply) throw new AppError('Reply not found', 404);

  if (!reply.author.equals(req.user._id) && req.user.systemRole !== 'admin') {
    throw new AppError('Unauthorized to delete this reply', 403);
  }

  reply.isDeleted = true;
  await comment.save();

  await audit({
    tenantId: req.tenantId,
    userId: req.user._id,
    action: 'incident_reply_delete',
    resource: 'IncidentComment',
    resourceId: comment._id,
    req,
  });

  sendSuccess(res, {}, 'Reply deleted');
});

export {
  getIncidents,
  getAllIncidents,
  getIncident,
  createIncident,
  updateIncident,
  upvoteIncident,
  addComment,
  deleteComment,
  addReply,
  deleteReply,
  editIncident,
  closeIncident,
};
