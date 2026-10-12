import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Clock, Download, AlertCircle, Trash2, History } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/common/Button/Button';
import AdminSettingsPage from '../AdminSettingsPage';
import { useAuth } from '../../../hooks/useAuth';
import {
  getAdminPlans,
  getSubscription,
  getPaymentDetails,
  getInvoices,
  getUpdatePaymentUrl,
  updateSubscriptionPlan,
  cancelSubscription,
} from '../../../lib/api/billing';
import styles from '../AdminSettingsPage.module.css';
import localStyles from './Billing.module.css';

const SectionBlock = ({ title, icon: Icon, children }) => (
  <div className={styles.sectionBlock}>
    <div className={styles.sectionBlockHeader}>
      {Icon && <Icon size={15} className={styles.sectionBlockIcon} />}
      <span>{title}</span>
    </div>
    <div className={styles.sectionBlockBody}>{children}</div>
  </div>
);

export default function Billing() {
  const { isSuperuser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, subData, paymentData, invoicesData] = await Promise.all([
        getAdminPlans(),
        getSubscription(),
        getPaymentDetails(),
        getInvoices(),
      ]);

      setPlans(plansData || []);
      setSubscription(subData);
      setCurrentPlan(subData?.plan);
      setPaymentDetails(paymentData);
      setInvoices(invoicesData?.data || []);
    } catch (err) {
      toast.error('Failed to load billing details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperuser) {
      loadData();
    }
  }, [isSuperuser]);

  const planIndex = (planId) => plans.findIndex(p => p.id === planId);

  const formatPrice = (plan) => {
    return `R ${Math.round(plan.amount).toLocaleString('en-ZA')}`;
  };

  const getPlanName = (planId) => {
    return plans.find(p => p.id === planId)?.name || 'Unknown Plan';
  };

  const handleChangePlan = async (planId) => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      await updateSubscriptionPlan(planId, plan.planCode);
      setCurrentPlan(planId);
      setSubscription({ ...subscription, plan: planId });
      toast.success(`Switched to ${plan.name} plan.`);
    } catch (err) {
      toast.error(err.message || 'Failed to update plan');
    }
  };

  const handleUpdatePaymentMethod = async () => {
    try {
      setUpdatingPayment(true);
      const url = await getUpdatePaymentUrl();
      if (url?.authorizationUrl) {
        window.open(url.authorizationUrl, '_blank');
      } else {
        toast.error('Failed to get Paystack checkout URL');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update payment method');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription(cancelReason);
      setShowCancelModal(false);
      await loadData();
      toast.success('Subscription cancelled successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to cancel subscription');
    }
  };

  if (!isSuperuser) {
    return (
      <AdminSettingsPage
        title="Billing & Subscription"
        description="Manage your subscription plan and billing details"
        icon={CreditCard}
        iconColor="#f59e0b"
      >
        <div className={styles.accessDenied} style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={40} style={{ marginBottom: '16px', color: '#ef4444' }} />
          <h2>Access Denied</h2>
          <p>Only workspace superusers can manage billing and subscriptions.</p>
        </div>
      </AdminSettingsPage>
    );
  }

  if (loading) {
    return (
      <AdminSettingsPage
        title="Billing & Subscription"
        description="Manage your subscription plan and billing details"
        icon={CreditCard}
        iconColor="#f59e0b"
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading subscription details...</div>
      </AdminSettingsPage>
    );
  }

  const isSubscriptionCancelled = subscription?.billing?.status === 'cancelled';

  return (
    <AdminSettingsPage
      title="Billing & Subscription"
      description="Manage your subscription plan and billing details"
      icon={CreditCard}
      iconColor="#f59e0b"
    >
      {/* Current Plan Status */}
      <div className={styles.panel}>
        <SectionBlock title="Current Plan" icon={CreditCard}>
          <div className={localStyles.currentPlanInfo}>
            <div className={localStyles.planStatus}>
              <div>
                <p className={localStyles.planStatusLabel}>Active Plan</p>
                <p className={localStyles.planStatusValue}>
                  {currentPlan ? getPlanName(currentPlan) : 'No active plan'}
                </p>
              </div>
              {subscription?.billing?.nextBillingDate && (
                <div>
                  <p className={localStyles.planStatusLabel}>Next Billing Date</p>
                  <p className={localStyles.planStatusValue}>
                    {new Date(subscription.billing.nextBillingDate).toLocaleDateString('en-ZA')}
                  </p>
                </div>
              )}
              <div>
                <p className={localStyles.planStatusLabel}>Status</p>
                <p className={localStyles.planStatusValue} style={{ color: isSubscriptionCancelled ? '#ef4444' : '#10b981' }}>
                  {isSubscriptionCancelled ? 'Cancelled' : 'Active'}
                </p>
              </div>
            </div>
          </div>
        </SectionBlock>
      </div>

      {/* Payment Details */}
      <div className={styles.panel}>
        <SectionBlock title="Payment Details" icon={CreditCard}>
          <div className={localStyles.paymentDetails}>
            <div className={localStyles.paymentSummary}>
              {paymentDetails ? (
                <div>
                  <p className={localStyles.paymentType}>
                    {paymentDetails.cardBrand} ending in {paymentDetails.cardLast4}
                    {paymentDetails.cardExp && ` (Expires: ${paymentDetails.cardExp})`}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUpdatePaymentMethod}
                    disabled={updatingPayment}
                  >
                    {updatingPayment ? 'Redirecting to Paystack...' : 'Update Payment Method'}
                  </Button>
                </div>
              ) : (
                <div>
                  <p className={localStyles.noPayment}>No payment method on file</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUpdatePaymentMethod}
                    disabled={updatingPayment}
                  >
                    {updatingPayment ? 'Redirecting to Paystack...' : 'Add Payment Method'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SectionBlock>
      </div>

      <div className={styles.panel}>
        {/* Plan cards */}
        <div className={localStyles.planGrid}>
          {plans.length > 0 ? (
            plans.map(plan => {
              const isActive = currentPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`${localStyles.planCard} ${isActive ? localStyles.planActive : ''}`}
                  style={isActive ? { borderColor: '#0066FF' } : {}}
                >
                  <div className={localStyles.planIcon} style={{ background: '#0066FF18', color: '#0066FF' }}>
                    <CreditCard size={20} />
                  </div>
                  <h3 className={localStyles.planName}>{plan.name}</h3>
                  <p className={localStyles.planDesc}>{plan.description || 'Salesdam subscription plan'}</p>
                  <div className={localStyles.planPrice}>
                    <span className={localStyles.planAmount}>{formatPrice(plan)}</span>
                    <span className={localStyles.planPeriod}>/{plan.interval}</span>
                  </div>
                  {isActive ? (
                    <div className={localStyles.activeBadge} style={{ color: '#0066FF', borderColor: '#0066FF' }}>
                      <CheckCircle size={14} /> Current Plan
                    </div>
                  ) : (
                    <Button
                      variant={currentPlan ? 'secondary' : 'primary'}
                      fullWidth
                      onClick={() => handleChangePlan(plan.id)}
                    >
                      {currentPlan && planIndex(plan.id) > planIndex(currentPlan) ? 'Upgrade' : 'Switch Plan'}
                    </Button>
                  )}
                </div>
              );
            })
          ) : (
            <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--color-gray-500)' }}>
              Loading plans...
            </p>
          )}
        </div>
      </div>

      {/* Cancel Subscription */}
      {!isSubscriptionCancelled && (
        <div className={styles.panel}>
          <SectionBlock title="Cancel Subscription" icon={AlertCircle}>
            <div className={localStyles.cancelSection}>
              <p className={localStyles.cancelWarning}>
                Cancelling your subscription will suspend your access to Salesdam and all associated services.
              </p>
              <Button
                variant="danger"
                icon={<Trash2 size={14} />}
                onClick={() => setShowCancelModal(true)}
              >
                Cancel Subscription
              </Button>
            </div>
          </SectionBlock>
        </div>
      )}

      {/* Invoice history */}
      <div className={styles.panel}>
        <SectionBlock title="Invoice History" icon={History}>
          {invoices.length > 0 ? (
            <table className={localStyles.invoiceTable}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.reference}>
                    <td className={localStyles.invoiceId}>{inv.id}</td>
                    <td>{new Date(inv.date).toLocaleDateString('en-ZA')}</td>
                    <td>R {inv.amount.toLocaleString('en-ZA')}</td>
                    <td>
                      <span className={`${localStyles.statusBadge} ${inv.status === 'Paid' ? localStyles.paid : localStyles.unpaid}`}>
                        {inv.status === 'Paid' ? <CheckCircle size={11} /> : <Clock size={11} />}
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <Button variant="ghost" size="sm" icon={<Download size={13} />}>PDF</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--color-gray-500)', textAlign: 'center', padding: '20px' }}>
              No invoices found
            </p>
          )}
        </SectionBlock>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className={localStyles.modalOverlay} onClick={() => setShowCancelModal(false)}>
          <div className={localStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={localStyles.modalHeader}>
              <AlertCircle size={20} style={{ color: '#ef4444' }} />
              <h2>Cancel Subscription</h2>
            </div>

            <div className={localStyles.modalBody}>
              <p className={localStyles.modalWarning}>
                This action will cancel your Salesdam subscription and suspend access to your workspace.
                This cannot be easily undone.
              </p>

              <div className={localStyles.formGroup}>
                <label>Tell us why you're cancelling (optional)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Your feedback helps us improve..."
                  className={localStyles.textarea}
                  rows={3}
                />
              </div>

              <div className={localStyles.modalActions}>
                <Button
                  variant="danger"
                  onClick={handleCancelSubscription}
                  icon={<Trash2 size={14} />}
                >
                  Yes, Cancel Subscription
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep Subscription
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminSettingsPage>
  );
}
