import React from 'react';
import styles from './DonutChartSkeleton.module.css';

export default function DonutChartSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.skeletonIcon} />
        <div className={styles.skeletonTitle} />
      </div>
      <div className={styles.chartBody}>
        <div className={styles.chartContainer}>
          <div className={styles.donutCircle} />
          <div className={styles.legendContainer}>
            <div className={styles.legendItem} />
            <div className={styles.legendItem} />
            <div className={styles.legendItem} />
            <div className={styles.legendItem} />
          </div>
        </div>
      </div>
    </div>
  );
}
