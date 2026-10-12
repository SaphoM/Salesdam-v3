import React from 'react';
import styles from './DashboardCard.module.css';

const DashboardCard = ({
  title,
  icon: Icon,
  subtitle,
  children,
  bodyClassName = '',
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        {Icon && <Icon size={18} className={styles.cardIcon} />}

        <h3 className={styles.cardTitle}>{title}</h3>

        {subtitle && <span className={styles.subLabel}>{subtitle}</span>}
      </div>

      <div className={`${styles.cardBody} ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default DashboardCard;
