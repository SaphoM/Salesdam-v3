import styles from './PaymentCallback.module.css';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/common/Button/Button';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const PaymentCallback = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');
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
        const res = await api.get(`/payment/verify/${reference}`);
        const data = res.data?.data || res.data;

        if (data?.status === 'success') {
          setStatus('success');
          setMessage('Payment verified successfully! Your subscription is now active.');
        } else if (data?.status === 'failed') {
          setStatus('failed');
          setMessage('The transaction failed. Please try again.');
        } else {
          setStatus('error');
          setMessage(data?.message || 'Unexpected response from server.');
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
          <Button variant="primary" onClick={() => (window.location.href = '/login')}>
            Go to Login
          </Button>
        )}

        {(status === 'failed' || status === 'error') && (
          <Button variant="ghost" onClick={() => (window.location.href = '/register')}>
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
