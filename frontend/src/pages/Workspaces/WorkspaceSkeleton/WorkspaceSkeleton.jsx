import styles from './WorkspaceSkeleton.module.css';

const WorkspaceSkeleton = () => {
  return (
    <div className={styles.card}>
      {/* Top section with icon and meta */}
      <div className={styles.cardTop}>
        <div className={styles.iconSkeleton} />
        <div className={styles.metaSkeleton}>
          <div className={styles.nameSkeleton} />
          <div className={styles.slugSkeleton} />
        </div>
      </div>

      {/* Description skeleton */}
      <div className={styles.descriptionSkeleton} />

      {/* Stats skeleton */}
      <div className={styles.statsSkeleton}>
        <div className={styles.statSkeleton} />
        <div className={styles.statSkeleton} />
      </div>

      {/* Actions skeleton */}
      <div className={styles.actionsSkeleton}>
        <div className={styles.buttonSkeleton} />
        <div className={styles.buttonSkeleton} />
      </div>
    </div>
  );
};

export default WorkspaceSkeleton;
