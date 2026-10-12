import SkeletonLoader from '../../../components/common/SkeletonLoader/SkeletonLoader';
import styles from './RecordDetail.module.css';
import skeletonStyles from './RecordDetailSkeleton.module.css';

const RecordDetailSkeleton = () => {
  return (
    <div className={styles.page}>
      {/* Header Section */}
      <div className={styles.header}>
        {/* Back button skeleton */}
        <div style={{ marginBottom: '16px' }}>
          <SkeletonLoader width="60px" height="16px" borderRadius="4px" />
        </div>

        {/* Title row skeleton */}
        <div className={styles.titleRow}>
          <div className={styles.objectIcon}>
            <SkeletonLoader width="100%" height="100%" borderRadius="6px" />
          </div>
          <div style={{ flex: 1 }}>
            <SkeletonLoader width="70%" height="28px" borderRadius="4px" />
          </div>
        </div>

        {/* Action buttons skeleton */}
        <div className={styles.actions}>
          <SkeletonLoader width="100px" height="36px" borderRadius="4px" />
          <SkeletonLoader width="100px" height="36px" borderRadius="4px" />
          <SkeletonLoader width="100px" height="36px" borderRadius="4px" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className={skeletonStyles.tabsContainer}>
        <SkeletonLoader width="80px" height="16px" borderRadius="3px" />
        <SkeletonLoader width="80px" height="16px" borderRadius="3px" />
        <SkeletonLoader width="80px" height="16px" borderRadius="3px" />
      </div>

      {/* Body Section */}
      <div className={styles.body}>
        {/* Main Panel */}
        <div className={styles.mainPanel}>
          {/* Section 1 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle} style={{ width: '180px', height: '14px', background: 'linear-gradient(90deg, #e5e7eb 0%, #d1d5db 50%, #e5e7eb 100%)', backgroundSize: '200% 100%', animation: 'shimmerLoader 1.5s infinite' }} />
            <div className={styles.fieldGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`field-${i}`} className={styles.fieldItem}>
                  <SkeletonLoader width="100px" height="12px" borderRadius="3px" />
                  <div style={{ marginTop: '8px' }}>
                    <SkeletonLoader width="100%" height="28px" borderRadius="4px" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle} style={{ width: '140px', height: '14px', background: 'linear-gradient(90deg, #e5e7eb 0%, #d1d5db 50%, #e5e7eb 100%)', backgroundSize: '200% 100%', animation: 'shimmerLoader 1.5s infinite' }} />
            <div className={styles.fieldGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`field2-${i}`} className={styles.fieldItem}>
                  <SkeletonLoader width="90px" height="12px" borderRadius="3px" />
                  <div style={{ marginTop: '8px' }}>
                    <SkeletonLoader width="100%" height="28px" borderRadius="4px" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Info Section */}
          <div className={styles.systemInfoSection}>
            <div style={{ width: '140px', height: '14px', marginBottom: '16px', background: 'linear-gradient(90deg, #e5e7eb 0%, #d1d5db 50%, #e5e7eb 100%)', backgroundSize: '200% 100%', animation: 'shimmerLoader 1.5s infinite' }} />
            <div className={styles.systemInfoGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`sysinfo-${i}`} className={styles.systemInfoItem}>
                  <SkeletonLoader width="80px" height="11px" borderRadius="3px" />
                  <div style={{ marginTop: '8px' }}>
                    <SkeletonLoader width="100%" height="16px" borderRadius="3px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          {/* Meta section 1 */}
          <div className={styles.metaSection}>
            <div style={{ width: '140px', height: '14px', marginBottom: '16px', background: 'linear-gradient(90deg, #e5e7eb 0%, #d1d5db 50%, #e5e7eb 100%)', backgroundSize: '200% 100%', animation: 'shimmerLoader 1.5s infinite' }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`meta-${i}`} className={styles.metaItem}>
                <div style={{ width: '14px', height: '14px', marginTop: '2px', flexShrink: 0, background: 'linear-gradient(90deg, #e5e7eb 0%, #d1d5db 50%, #e5e7eb 100%)', backgroundSize: '200% 100%', animation: 'shimmerLoader 1.5s infinite', borderRadius: '3px' }} />
                <div style={{ flex: 1 }}>
                  <SkeletonLoader width="80%" height="11px" borderRadius="3px" />
                  <div style={{ marginTop: '6px' }}>
                    <SkeletonLoader width="100%" height="14px" borderRadius="3px" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Meta section 2 */}
          <div className={styles.metaSection} style={{ marginTop: '16px' }}>
            <div style={{ width: '160px', height: '14px', marginBottom: '16px', background: 'linear-gradient(90deg, #e5e7eb 0%, #d1d5db 50%, #e5e7eb 100%)', backgroundSize: '200% 100%', animation: 'shimmerLoader 1.5s infinite' }} />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={`meta2-${i}`} className={styles.metaItem}>
                <div style={{ width: '14px', height: '14px', marginTop: '2px', flexShrink: 0, background: 'linear-gradient(90deg, #e5e7eb 0%, #d1d5db 50%, #e5e7eb 100%)', backgroundSize: '200% 100%', animation: 'shimmerLoader 1.5s infinite', borderRadius: '3px' }} />
                <div style={{ flex: 1 }}>
                  <SkeletonLoader width="70%" height="11px" borderRadius="3px" />
                  <div style={{ marginTop: '6px' }}>
                    <SkeletonLoader width="90%" height="14px" borderRadius="3px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmerLoader {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default RecordDetailSkeleton;
