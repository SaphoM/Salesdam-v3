import styles from './Verification.module.css';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const Verification = () => {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [countdown, setCountdown] = useState(5);

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['verifyEmail', token],
    queryFn: async () => {
      if (!token) {
        throw new Error('Missing token');
      }

      const res = await api.post('/auth/verify-email', { token });

      return res.data;
    },
    enabled: !!token,
    retry: false,
  });

  // Support both:
  // response.data.data
  // and response.data
  const verificationData = data?.data || data;

  const registrationType = verificationData?.registrationType;
  const checkoutUrl = verificationData?.checkoutUrl;

  // Only Paystack registrations should go to checkout
  const isPaystackRegistration = registrationType === 'paystack';

  useEffect(() => {
    // Do nothing unless:
    // 1. Email verification succeeded
    // 2. Registration was made through Paystack
    // 3. A checkout URL was returned
    if (!isSuccess || !isPaystackRegistration || !checkoutUrl) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);

          window.location.href = checkoutUrl;

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSuccess, isPaystackRegistration, checkoutUrl]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {/* Verifying */}
        {isLoading && <p className={styles.info}>Verifying your email...</p>}

        {/* Verification successful */}
        {isSuccess && (
          <>
            <h2 className={styles.title}>Email Verified</h2>

            {/* Paystack registration */}
            {isPaystackRegistration && checkoutUrl ? (
              <>
                <p className={styles.subtitle}>
                  Your email has been verified successfully. Redirecting you to
                  complete your subscription checkout...
                </p>

                <div className={styles.countdown}>
                  <p className={styles.countdownText}>
                    Redirecting in {countdown} second
                    {countdown !== 1 ? 's' : ''}...
                  </p>
                </div>

                <div className={styles.actionContainer}>
                  <p className={styles.helperText}>
                    If you're not redirected automatically, click the button
                    below:
                  </p>

                  <a href={checkoutUrl} className={styles.manualButton}>
                    Go to Checkout
                  </a>
                </div>
              </>
            ) : (
              /* Manual registration */
              <>
                <p className={styles.subtitle}>
                  Your email has been verified successfully. You can now sign in
                  to your account.
                </p>

                <div className={styles.actionContainer}>
                  <a href="/login" className={styles.manualButton}>
                    Continue to Login
                  </a>
                </div>
              </>
            )}
          </>
        )}

        {/* Verification failed */}
        {isError && (
          <>
            <h2 className={styles.title}>Verification Failed</h2>

            <p className={styles.subtitle}>
              This link is invalid or has expired. Please register again.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Verification;
