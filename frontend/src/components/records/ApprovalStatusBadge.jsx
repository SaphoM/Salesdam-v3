import styles from './ApprovalStatusBadge.module.css';

const ApprovalStatusBadge = ({ status }) => {
  if (!status) return null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'submitted for approval':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    return status || 'Pending';
  };

  return (
    <div
      className={styles.badge}
      style={{
        backgroundColor: `${getStatusColor(status)}20`,
        color: getStatusColor(status),
        borderColor: getStatusColor(status),
      }}
    >
      {getStatusLabel(status)}
    </div>
  );
};

export default ApprovalStatusBadge;
