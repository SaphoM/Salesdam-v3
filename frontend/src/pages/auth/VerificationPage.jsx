import styles from './Verification.module.css';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { verifyEmail } from '../../lib/api/registration';

const Verification = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [countdown, setCountdown] = useState(5);

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['verifyEmail', token],
    queryFn: async () => {
      if (!token) throw new Error('Missing token');
      return await verifyEmail({ token });
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (!isSuccess) return;

    const checkoutUrl = data?.data?.checkoutUrl || data?.checkoutUrl;
    console.log('Verification data:', data);
    console.log('Checkout URL:', checkoutUrl);

    if (!checkoutUrl) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          console.log('Redirecting to:', checkoutUrl);
          window.location.href = checkoutUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSuccess, data]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {isLoading && <p className={styles.info}>Verifying your email...</p>}

        {isSuccess && (
          <>
            <h2 className={styles.title}>Email Verified ✓</h2>
            <p className={styles.subtitle}>
              Redirecting you to complete your subscription checkout...
            </p>
            <div className={styles.countdown}>
              <p className={styles.countdownText}>
                Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
            </div>
            {(data?.data?.checkoutUrl || data?.checkoutUrl) && (
              <div className={styles.actionContainer}>
                <p className={styles.helperText}>
                  If you're not redirected automatically, click the button below:
                </p>
                <a
                  href={data?.data?.checkoutUrl || data?.checkoutUrl}
                  className={styles.manualButton}
                >
                  Go to Checkout
                </a>
              </div>
            )}
            {!data?.data?.checkoutUrl && !data?.checkoutUrl && (
              <div className={styles.errorContainer}>
                <p className={styles.errorText}>
                  ⚠️ Unable to load checkout. Please try registering again or contact support.
                </p>
              </div>
            )}
          </>
        )}

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
