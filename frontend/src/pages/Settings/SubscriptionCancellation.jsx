import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getCancellationInfo,
  cancelSubscription,
  reactivateSubscription,
} from '../../lib/api/subscription.js';
import Button from '../../components/common/Button/Button';
import { AlertTriangle, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import styles from './SubscriptionCancellation.module.css';

const SubscriptionCancellation = () => {
  const navigate = useNavigate();
  const [cancellationReason, setCancellationReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: cancellationInfo, isLoading } = useQuery({
    queryKey: ['cancellation-info'],
    queryFn: getCancellationInfo,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSubscription(cancellationReason),
    onSuccess: () => {
      toast.success('Your subscription has been cancelled');
      setTimeout(() => navigate('/login'), 2000);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateSubscription(),
    onSuccess: () => {
      toast.success('Your subscription has been reactivated');
      setTimeout(() => navigate('/dashboard'), 2000);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || 'Failed to reactivate subscription',
      );
    },
  });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading subscription information...</p>
      </div>
    );
  }

  // If subscription is cancelled
  if (cancellationInfo?.data?.isCancelled) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              icon={<ArrowLeft size={20} />}
            >
              Back
            </Button>
          </div>

          <div className={styles.content}>
            <CheckCircle size={64} className={styles.cancelledIcon} />
            <h1 className={styles.title}>Subscription Cancelled</h1>

            <div className={styles.info}>
              <p>
                Your subscription was cancelled on{' '}
                <strong>
                  {new Date(cancellationInfo.data.deletedAt).toLocaleDateString()}
                </strong>
              </p>
              <p className={styles.daysInfo}>
                Days since cancellation:{' '}
                <strong>{cancellationInfo.data.daysSinceCancellation}</strong>
              </p>
            </div>

            {cancellationInfo.data.canReactivate ? (
              <div className={styles.reactivateBox}>
                <Clock size={24} className={styles.clockIcon} />
                <h3>You can reactivate your subscription</h3>
                <p>
                  Your subscription can be reactivated until{' '}
                  <strong>
                    {new Date(
                      cancellationInfo.data.reactivationDeadline,
                    ).toLocaleDateString()}
                  </strong>
                </p>
                <p className={styles.daysRemaining}>
                  {30 - cancellationInfo.data.daysSinceCancellation} days remaining
                </p>

                <Button
                  variant="primary"
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                  className={styles.reactivateButton}
                >
                  {reactivateMutation.isPending
                    ? 'Reactivating...'
                    : 'Reactivate Subscription'}
                </Button>
              </div>
            ) : (
              <div className={styles.expiredBox}>
                <AlertTriangle size={24} className={styles.warningIcon} />
                <h3>Reactivation Period Expired</h3>
                <p>
                  The 30-day reactivation window has passed. You'll need to
                  register a new subscription to continue using Salesdam.
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/register')}
                  className={styles.registerButton}
                >
                  Register New Subscription
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If subscription is active
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/dashboard')}
            icon={<ArrowLeft size={20} />}
          >
            Back
          </Button>
        </div>

        <div className={styles.content}>
          <h1 className={styles.title}>Cancel Subscription</h1>
          <p className={styles.subtitle}>
            Your current plan: <strong>{cancellationInfo?.data?.plan}</strong>
          </p>

          {!showConfirmation ? (
            <div className={styles.cancellationForm}>
              <div className={styles.warningBox}>
                <AlertTriangle size={24} />
                <div>
                  <h3>Before you go...</h3>
                  <p>
                    If you cancel, you'll lose access to your data after 30
                    days. You can reactivate within that period.
                  </p>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Why are you cancelling? (Optional)</label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Your feedback helps us improve..."
                  rows={4}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/dashboard')}
                  className={styles.keepButton}
                >
                  Keep My Subscription
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowConfirmation(true)}
                  className={styles.cancelButton}
                >
                  Continue with Cancellation
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.confirmationBox}>
              <AlertTriangle size={48} className={styles.warningIcon} />
              <h2>Are you sure?</h2>
              <p>
                This action will cancel your subscription. You'll have 30 days
                to reactivate it before your data is deleted.
              </p>

              <div className={styles.confirmActions}>
                <Button
                  variant="secondary"
                  onClick={() => setShowConfirmation(false)}
                  className={styles.backButtonConfirm}
                >
                  No, Keep Subscription
                </Button>
                <Button
                  variant="primary"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className={styles.confirmCancelButton}
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCancellation;
