import styles from './PaymentCallback.module.css';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyTransaction } from '../../lib/api/billing.js';
import Button from '../../components/common/Button/Button';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const PaymentCallback = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | failed | error
  const [message, setMessage] = useState('');
  const reference = params.get('reference');

  useEffect(() => {
    const checkTransaction = async () => {
      if (!reference) {
        setStatus('error');
        setMessage('Missing payment reference. Please try again.');
        return;
      }

      try {
        const res = await verifyTransaction(reference);

        if (res.success) {
          setStatus('success');
          setMessage(
            'Payment verified successfully! We charged R1.00 to verify your banking details, and this amount will be refunded shortly. Your subscription will start on your chosen debit order day.',
          );
          // Auto-redirect to login after 5 seconds
          setTimeout(() => {
            window.location.href = '/login';
          }, 5000);
        } else {
          setStatus('error');
          setMessage(res.message || 'Unexpected response from server.');
        }
      } catch (err) {
        console.error('Error verifying transaction:', err);
        setStatus('error');
        setMessage(
          err.response?.data?.message ||
            'An error occurred verifying your payment. Please contact support.',
        );
      }
    };

    checkTransaction();
  }, [reference]);

  const renderIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle size={60} color="#22c55e" />;
      case 'failed':
        return <XCircle size={60} color="#ef4444" />;
      case 'error':
        return <AlertTriangle size={60} color="#f59e0b" />;
      default:
        return <Loader2 size={60} className={styles.spinner} />;
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {renderIcon()}
        <h2 className={styles.title}>
          {status === 'loading'
            ? 'Verifying Payment...'
            : status === 'success'
              ? 'Payment Successful'
              : status === 'failed'
                ? 'Payment Failed'
                : 'Verification Error'}
        </h2>
        <p className={styles.message}>{message}</p>

        {status === 'success' && (
          <p className={styles.redirect}>Redirecting to login...</p>
        )}

        {(status === 'failed' || status === 'error') && (
          <Button
            size="lg"
            onClick={() => (window.location.href = '/register')}
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
