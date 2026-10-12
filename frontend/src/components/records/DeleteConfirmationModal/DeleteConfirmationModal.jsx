import { AlertTriangle, Loader } from 'lucide-react';
import styles from './DeleteConfirmationModal.module.css';

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  recordCount = 1,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <AlertTriangle size={24} />
          </div>
          <h2 className={styles.title}>Delete Record{recordCount > 1 ? 's' : ''}</h2>
          <p className={styles.subtitle}>This action cannot be undone</p>
        </div>

        <div className={styles.content}>
          <div className={styles.warningSection}>
            <p className={styles.warningText}>
              {recordCount === 1
                ? 'This will permanently delete this record and all associated data.'
                : `This will permanently delete ${recordCount.toLocaleString()} record(s) and all associated data.`}
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className={styles.deleteBtn}
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader size={16} className={styles.spinner} />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
