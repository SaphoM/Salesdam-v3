import styles from './WorkspaceObjectGroupsSkeleton.module.css';

const WorkspaceObjectGroupsSkeleton = () => {
  const skeletonGroups = Array.from({ length: 2 });

  return (
    <div className={styles.panel}>
      {/* Header skeleton */}
      <div className={styles.header}>
        <div className={styles.titleSkeleton} />
        <div className={styles.descriptionSkeleton} />
      </div>

      {/* Groups skeleton */}
      <div className={styles.groupsList}>
        {skeletonGroups.map((_, i) => (
          <div key={i} className={styles.groupCard}>
            {/* Group header skeleton */}
            <div className={styles.groupHeader}>
              <div className={styles.expandBtnSkeleton} />
              <div className={styles.groupNameSkeleton} />
              <div className={styles.countSkeleton} />
              <div className={styles.deleteBtnSkeleton} />
            </div>

            {/* Group content with object cards skeleton */}
            <div className={styles.groupContent}>
              <div className={styles.objectGrid}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className={styles.objectCard}>
                    <div className={styles.iconSkeleton} />
                    <div className={styles.infoPart}>
                      <div className={styles.nameSkeleton} />
                      <div className={styles.apiSkeleton} />
                    </div>
                    <div className={styles.checkSkeleton} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add group section skeleton */}
      <div className={styles.addGroupSkeleton} />

      {/* Actions skeleton */}
      <div className={styles.actionSkeleton} />
    </div>
  );
};

export default WorkspaceObjectGroupsSkeleton;
