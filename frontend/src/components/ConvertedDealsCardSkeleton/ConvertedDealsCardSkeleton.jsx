import React from 'react';
import styles from './ConvertedDealsCardSkeleton.module.css';

export default function ConvertedDealsCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.skeletonIcon} />
        <div className={styles.skeletonTitle} />
      </div>
      <div className={styles.cardBody}>
        <div className={styles.filterSection}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <div className={styles.skeletonLabel} />
              <div className={styles.skeletonInput} />
            </div>
            <div className={styles.filterGroup}>
              <div className={styles.skeletonLabel} />
              <div className={styles.skeletonInput} />
            </div>
          </div>
          <div className={styles.skeletonButton} />
        </div>

        <div className={styles.divider} />

        <div className={styles.metric}>
          <div className={styles.skeletonMetricValue} />
          <div className={styles.skeletonMetricLabel} />
        </div>

        <div className={styles.details}>
          <div className={styles.detailRow} />
          <div className={styles.detailRow} />
          <div className={styles.detailRow} />
        </div>
      </div>
    </div>
  );
}
