import styles from './DashboardSkeleton.module.css';

const DashboardSkeleton = () => {
  return (
    <div className={styles.skeleton}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={`${styles.shimmer} ${styles.titleLine}`} />
          <div className={`${styles.shimmer} ${styles.subtitleLine}`} />
        </div>
        <div className={`${styles.shimmer} ${styles.headerAction}`} />
      </div>

      <div className={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.shimmer} ${styles.cardIcon}`} />
              <div className={styles.cardMeta}>
                <div className={`${styles.shimmer} ${styles.cardLabel}`} />
                <div className={`${styles.shimmer} ${styles.cardValue}`} />
              </div>
            </div>
            <div className={styles.cardBody}>
              <div
                className={`${styles.shimmer} ${styles.chartBar}`}
                style={{ height: '80px' }}
              />
              <div className={styles.chartRows}>
                {[70, 45, 85, 55, 90].map((w, j) => (
                  <div key={j} className={styles.chartRow}>
                    <div className={`${styles.shimmer} ${styles.chartLabel}`} />
                    <div
                      className={`${styles.shimmer} ${styles.chartLine}`}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.cardFooter}>
              <div className={`${styles.shimmer} ${styles.footerBadge}`} />
              <div className={`${styles.shimmer} ${styles.footerText}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardSkeleton;
