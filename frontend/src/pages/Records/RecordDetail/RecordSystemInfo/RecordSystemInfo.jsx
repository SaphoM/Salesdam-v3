import styles from '../RecordDetail.module.css';

const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const RecordSystemInfo = ({ record }) => {
  return (
    <div className={styles.systemInfoSection}>
      <h3 className={styles.sectionTitle}>System Information</h3>
      <div className={styles.systemInfoGrid}>
        <div className={styles.systemInfoItem}>
          <span className={styles.systemInfoLabel}>Created</span>
          <span className={styles.systemInfoValue}>
            {formatDateTime(record.createdAt)}
          </span>
        </div>
        <div className={styles.systemInfoItem}>
          <span className={styles.systemInfoLabel}>Last Modified</span>
          <span className={styles.systemInfoValue}>
            {formatDateTime(record.updatedAt)}
          </span>
        </div>
        {record.createdBy && (
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoLabel}>Created By</span>
            <span className={styles.systemInfoValue}>
              {record.createdBy.firstName} {record.createdBy.lastName}
            </span>
          </div>
        )}
        {record.lastModifiedBy && (
          <div className={styles.systemInfoItem}>
            <span className={styles.systemInfoLabel}>Last Modified By</span>
            <span className={styles.systemInfoValue}>
              {record.lastModifiedBy.firstName} {record.lastModifiedBy.lastName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordSystemInfo;
