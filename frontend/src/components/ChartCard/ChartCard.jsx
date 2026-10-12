import React from 'react';
import styles from './ChartCard.module.css';

export default function ChartCard({
  icon: Icon,
  title,
  children,
  isEmpty = false,
  headerAction = null,
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        {Icon && <Icon size={18} className={styles.cardIcon} />}
        <span className={styles.cardTitle}>{title}</span>
        {headerAction && <div className={styles.headerAction}>{headerAction}</div>}
      </div>
      <div className={styles.chartBody}>
        {isEmpty ? (
          <p className={styles.empty}>No data available.</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
