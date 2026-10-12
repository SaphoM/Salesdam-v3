import styles from './Sidebar.module.css';

const SkeletonNavItem = ({ collapsed }) => (
  <div className={styles.navItem} style={{ pointerEvents: 'none' }}>
    <span className={styles.navIcon}>
      <div className={styles.skeleton} style={{ width: 20, height: 20, borderRadius: 4 }} />
    </span>
    {!collapsed && (
      <span className={styles.navLabel}>
        <div className={styles.skeleton} style={{ width: 100, height: 14 }} />
      </span>
    )}
  </div>
);

const SkeletonNavGroup = ({ collapsed }) => (
  <div className={styles.navGroup}>
    <button
      className={styles.navGroupToggle}
      style={{ pointerEvents: 'none', opacity: 0.6 }}
    >
      <span className={styles.navGroupIcon}>
        <div className={styles.skeleton} style={{ width: 14, height: 14, borderRadius: 2 }} />
      </span>
      {!collapsed && (
        <span className={styles.navLabel}>
          <div className={styles.skeleton} style={{ width: 80, height: 14 }} />
        </span>
      )}
    </button>
    {!collapsed && (
      <div className={styles.navGroupChildren}>
        {[1, 2, 3].map((i) => (
          <SkeletonNavItem key={i} collapsed={false} />
        ))}
      </div>
    )}
  </div>
);

export { SkeletonNavItem, SkeletonNavGroup };
