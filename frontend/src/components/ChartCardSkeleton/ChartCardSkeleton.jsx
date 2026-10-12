import React from 'react';
import styles from './ChartCardSkeleton.module.css';

export default function ChartCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.skeletonIcon} />
        <div className={styles.skeletonTitle} />
      </div>
      <div className={styles.chartBody}>
        <div className={styles.skeletonContent}>
          <div className={styles.skeletonBar} style={{ width: '100%' }} />
          <div className={styles.skeletonBar} style={{ width: '95%' }} />
          <div className={styles.skeletonBar} style={{ width: '88%' }} />
          <div className={styles.skeletonBar} style={{ width: '92%' }} />
          <div className={styles.skeletonBar} style={{ width: '85%' }} />
        </div>
      </div>
    </div>
  );
}
