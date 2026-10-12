import styles from './WorkspaceObjectsSkeleton.module.css';

const WorkspaceObjectsSkeleton = () => {
  const skeletonCards = Array.from({ length: 6 });

  return (
    <div className={styles.container}>
      {/* Header skeleton */}
      <div className={styles.header}>
        <div>
          <div className={styles.titleSkeleton} />
          <div className={styles.descriptionSkeleton} />
        </div>
        <div className={styles.buttonSkeleton} />
      </div>

      {/* Grid of object card skeletons */}
      <div className={styles.objectGrid}>
        {skeletonCards.map((_, i) => (
          <div key={i} className={styles.objectCard}>
            <div className={styles.iconSkeleton} />
            <div className={styles.infoPart}>
              <div className={styles.nameSkeleton} />
              <div className={styles.apiSkeleton} />
            </div>
            <div className={styles.checkSkeleton} />
          </div>
        ))}
      </div>

      {/* Footer skeleton */}
      <div className={styles.footerSkeleton} />
    </div>
  );
};

export default WorkspaceObjectsSkeleton;
