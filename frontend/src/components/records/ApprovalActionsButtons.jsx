import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import Button from '../common/Button/Button';
import Modal from '../common/Modal/Modal';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ConvertLeadToDealModal from './ConvertLeadToDealModal';
import styles from './ApprovalActions.module.css';

const ApprovalActionsButtons = ({ leadId, lead, approvalStatus, isCurrentUserApprover, onSuccess }) => {
  const navigate = useNavigate();
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const canApprove = isCurrentUserApprover && approvalStatus === 'Submitted for Approval';
  const canReject = isCurrentUserApprover && approvalStatus === 'Submitted for Approval';

  const handleApproveClick = () => {
    setShowApproveModal(false);
    setShowConvertModal(true);
  };

  const handleApprove = async (clientId) => {
    setLoadingApprove(true);
    try {
      const response = await api.post(`/leads/${leadId}/approve`, { clientId });
      const dealId = response.data?.data?.deal?._id || response.data?.data?.deal?.id;
      toast.success('Lead approved and converted to deal');
      onSuccess?.();
      setShowConvertModal(false);
      if (dealId) {
        navigate(`/o/deal/${dealId}`);
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to approve lead';
      toast.error(message);
    } finally {
      setLoadingApprove(false);
    }
  };

  const handleReject = async () => {
    setLoadingReject(true);
    try {
      await api.post(`/leads/${leadId}/reject`, {
        reason: rejectionReason,
      });
      toast.success('Lead rejected');
      onSuccess?.();
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to reject lead';
      toast.error(message);
    } finally {
      setLoadingReject(false);
    }
  };

  if (!canApprove && !canReject) return null;

  return (
    <>
      {canApprove && (
        <Button
          variant="success"
          size="sm"
          icon={<Check size={14} />}
          onClick={() => setShowApproveModal(true)}
        >
          Approve
        </Button>
      )}

      {canReject && (
        <Button
          variant="danger"
          size="sm"
          icon={<X size={14} />}
          onClick={() => setShowRejectModal(true)}
        >
          Reject
        </Button>
      )}

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Lead"
        size="lg"
      >
        <div className={styles.modalContent}>
          <p>Are you sure you want to approve this lead?</p>
          <p className={styles.note}>
            The lead will be converted to a deal and the owner will be notified.
          </p>
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              onClick={() => setShowApproveModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleApproveClick}
            >
              Continue
            </Button>
          </div>
        </div>
      </Modal>

      {/* Convert Lead to Deal Modal */}
      <ConvertLeadToDealModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        lead={lead}
        onConfirm={handleApprove}
        isLoading={loadingApprove}
      />

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Lead"
        size="lg"
      >
        <div className={styles.modalContent}>
          <p>Are you sure you want to reject this lead?</p>
          <textarea
            className={styles.reasonInput}
            placeholder="Optional: Enter the reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <p className={styles.note}>
            The owner will be notified and can make updates if needed.
          </p>
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={loadingReject}
              onClick={handleReject}
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ApprovalActionsButtons;
