import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ThumbsUp,
  MessageCircle,
  ArrowLeft,
  Trash2,
  Edit,
  Reply,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getIncident,
  upvoteIncident,
  addComment,
  deleteComment,
  updateIncident,
  addReply,
  deleteReply,
  editIncident,
  closeIncident,
} from '../../services/api/incidents';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import styles from './IncidentDetail.module.css';

const PRIORITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#16a34a',
};

const STATUS_BADGES = {
  open: { bg: '#fecaca', color: '#991b1b', label: 'Open' },
  in_progress: { bg: '#bfdbfe', color: '#1e40af', label: 'In Progress' },
  resolved: { bg: '#bbf7d0', color: '#166534', label: 'Resolved' },
  closed: { bg: '#e5e7eb', color: '#374151', label: 'Closed' },
};

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');
  const [editingStatus, setEditingStatus] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedComments, setExpandedComments] = useState({});
  const [isEditingIncident, setIsEditingIncident] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => getIncident(id),
    select: (res) => res.data?.data,
  });

  const incident = data || {};
  const comments = incident.comments || [];
  const isAdmin = user?.systemRole === 'admin';
  const isReporter = user?._id === incident.reportedBy?._id;

  const upvoteMutation = useMutation({
    mutationFn: () => upvoteIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident upvoted');
    },
    onError: (err) => toast.error(err?.message || 'Failed to upvote'),
  });

  const commentMutation = useMutation({
    mutationFn: (data) => addComment(id, data),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Comment added');
    },
    onError: (err) => toast.error(err?.message || 'Failed to add comment'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => deleteComment(id, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Comment deleted');
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete comment'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => updateIncident(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setEditingStatus(null);
      toast.success('Incident status updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update status'),
  });

  const addReplyMutation = useMutation({
    mutationFn: ({ commentId, data }) => addReply(id, commentId, data),
    onSuccess: () => {
      setReplyText('');
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Reply added');
    },
    onError: (err) => toast.error(err?.message || 'Failed to add reply'),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: ({ commentId, replyId }) => deleteReply(id, commentId, replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Reply deleted');
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete reply'),
  });

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    commentMutation.mutate({
      content: commentText,
    });
  };

  const handleAddReply = (commentId) => {
    if (!replyText.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }
    addReplyMutation.mutate({
      commentId,
      data: { content: replyText },
    });
  };

  const toggleCommentExpanded = (commentId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const editIncidentMutation = useMutation({
    mutationFn: (data) => editIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setIsEditingIncident(false);
      toast.success('Incident updated successfully');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update incident'),
  });

  const closeIncidentMutation = useMutation({
    mutationFn: () => closeIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident closed');
    },
    onError: (err) => toast.error(err?.message || 'Failed to close incident'),
  });

  const handleEditIncident = () => {
    if (!editedTitle.trim() || !editedDescription.trim()) {
      toast.error('Title and description are required');
      return;
    }
    editIncidentMutation.mutate({
      title: editedTitle,
      description: editedDescription,
      priority: incident.priority,
    });
  };

  if (isLoading) {
    return (
      <Layout title="Incident">
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !incident._id) {
    return (
      <Layout title="Incident">
        <div className={styles.container}>
          <button onClick={() => navigate('/incidents')} className={styles.backButton}>
            <ArrowLeft size={18} />
            Back to Incidents
          </button>
          <div className={styles.errorState}>
            <p>Incident not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  const hasUpvoted = incident.upvotedBy?.some((u) => u._id === user?._id);

  return (
    <Layout title={incident.title}>
      <div className={styles.container}>
        <button onClick={() => navigate('/incidents')} className={styles.backButton}>
          <ArrowLeft size={18} />
          Back to Incidents
        </button>

        <div className={styles.mainContent}>
          {/* Incident Header */}
          <div className={styles.incidentHeader}>
            <div className={styles.titleSection}>
              <div
                className={styles.priorityIndicator}
                style={{ backgroundColor: PRIORITY_COLORS[incident.priority] }}
              />
              <div className={styles.titleContent}>
                <h1 className={styles.title}>{incident.title}</h1>
                <p className={styles.meta}>
                  Reported by {incident.reportedBy?.firstName} {incident.reportedBy?.lastName}
                  {' • '}
                  {new Date(incident.createdAt).toLocaleDateString()}
                  {incident.isEdited && (
                    <>
                      {' • '}
                      <span className={styles.editedBadge}>
                        Edited {new Date(incident.editedAt).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <div
                className={styles.statusBadge}
                style={{
                  backgroundColor: STATUS_BADGES[incident.status].bg,
                  color: STATUS_BADGES[incident.status].color,
                }}
              >
                {STATUS_BADGES[incident.status].label}
              </div>
              {user?._id === incident.reportedBy?._id && incident.status !== 'closed' && (
                <>
                  <button
                    onClick={() => {
                      if (!isEditingIncident) {
                        setEditedTitle(incident.title);
                        setEditedDescription(incident.description);
                      }
                      setIsEditingIncident(!isEditingIncident);
                    }}
                    className={styles.actionButton}
                    title="Edit incident"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => closeIncidentMutation.mutate()}
                    disabled={closeIncidentMutation.isPending}
                    className={styles.actionButton}
                    title="Close incident"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Edit Form */}
          {isEditingIncident && user?._id === incident.reportedBy?._id && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Edit Incident</h2>
              <div className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label>Title</label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className={styles.formInput}
                    maxLength={200}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className={styles.formTextarea}
                    rows={6}
                  />
                </div>
                <div className={styles.formActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsEditingIncident(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditIncident}
                    disabled={editIncidentMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Description</h2>
            <p className={styles.description}>{incident.description}</p>
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Admin Controls</h2>
              <div className={styles.adminControls}>
                <div className={styles.controlGroup}>
                  <label>Status</label>
                  <select
                    value={incident.status}
                    onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                    disabled={updateStatusMutation.isPending}
                    className={styles.statusSelect}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Engagement Stats */}
          <div className={styles.section}>
            <div className={styles.engagementStats}>
              <button
                onClick={() => upvoteMutation.mutate()}
                disabled={upvoteMutation.isPending}
                className={`${styles.statButton} ${hasUpvoted ? styles.active : ''}`}
              >
                <ThumbsUp size={16} />
                <span>{incident.upvoteCount || 0} Upvotes</span>
              </button>
              <div className={styles.statButton}>
                <MessageCircle size={16} />
                <span>{comments.length} Comments</span>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Comments & Discussion</h2>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className={styles.commentForm}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add your comment or update here..."
                className={styles.commentInput}
                rows={3}
              />
              <div className={styles.formActions}>
                <Button
                  type="submit"
                  disabled={commentMutation.isPending || !commentText.trim()}
                  size="sm"
                >
                  Post Comment
                </Button>
              </div>
            </form>

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className={styles.noComments}>
                <p>No comments yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              <div className={styles.commentsList}>
                {comments.map((comment) => {
                  const isCommentOwner = user?._id === comment.author?._id;
                  const hasReplies = comment.replies?.length > 0;
                  const isExpanded = expandedComments[comment._id];

                  return (
                    <div key={comment._id} className={styles.commentItem}>
                      <div className={styles.commentHeader}>
                        <div className={styles.authorInfo}>
                          <p className={styles.authorName}>
                            {comment.author?.firstName} {comment.author?.lastName}
                          </p>
                          <p className={styles.commentTime}>
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className={styles.commentActions}>
                          <button
                            onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                            className={styles.replyButton}
                            title="Reply to comment"
                          >
                            <Reply size={14} />
                            Reply
                          </button>
                          {(isCommentOwner || isAdmin) && (
                            <button
                              onClick={() => deleteCommentMutation.mutate(comment._id)}
                              disabled={deleteCommentMutation.isPending}
                              className={styles.deleteButton}
                              title="Delete comment"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className={styles.commentContent}>{comment.content}</p>

                      {/* Reply Form */}
                      {replyingTo === comment._id && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddReply(comment._id);
                          }}
                          className={styles.replyForm}
                        >
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className={styles.replyInput}
                            rows={2}
                          />
                          <div className={styles.replyActions}>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={addReplyMutation.isPending || !replyText.trim()}
                            >
                              Post Reply
                            </Button>
                          </div>
                        </form>
                      )}

                      {/* Replies */}
                      {hasReplies && (
                        <div className={styles.repliesContainer}>
                          <button
                            onClick={() => toggleCommentExpanded(comment._id)}
                            className={styles.showRepliesButton}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {comment.replies.filter((r) => !r.isDeleted).length} Replies
                          </button>

                          {isExpanded && (
                            <div className={styles.repliesList}>
                              {comment.replies
                                .filter((r) => !r.isDeleted)
                                .map((reply) => (
                                  <div key={reply._id} className={styles.replyItem}>
                                    <div className={styles.replyHeader}>
                                      <div className={styles.replyAuthorInfo}>
                                        <p className={styles.replyAuthorName}>
                                          {reply.author?.firstName} {reply.author?.lastName}
                                        </p>
                                        <p className={styles.replyTime}>
                                          {new Date(reply.createdAt).toLocaleString()}
                                        </p>
                                      </div>
                                      {(user?._id === reply.author?._id || isAdmin) && (
                                        <button
                                          onClick={() =>
                                            deleteReplyMutation.mutate({
                                              commentId: comment._id,
                                              replyId: reply._id,
                                            })
                                          }
                                          disabled={deleteReplyMutation.isPending}
                                          className={styles.deleteButton}
                                          title="Delete reply"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                    <p className={styles.replyContent}>{reply.content}</p>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
