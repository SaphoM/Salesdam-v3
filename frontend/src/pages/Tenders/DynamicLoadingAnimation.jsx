import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import styles from './Tenders.module.css';

const DynamicLoadingAnimation = () => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getLoadingMessage = () => {
    if (elapsedTime < 3) {
      return 'Finding tenders, please wait...';
    } else if (elapsedTime < 6) {
      return 'This may take a moment...';
    } else if (elapsedTime < 9) {
      return 'Still searching...';
    } else {
      return 'Almost there, hang tight...';
    }
  };

  return (
    <div className={styles.dynamicLoadingContainer}>
      <div className={styles.loadingContent}>
        <Loader size={48} className={styles.animatedLoader} />
        <p className={styles.loadingText}>{getLoadingMessage()}</p>
        <p className={styles.loadingTimer}>Elapsed time: {elapsedTime}s</p>
      </div>
    </div>
  );
};

export default DynamicLoadingAnimation;
