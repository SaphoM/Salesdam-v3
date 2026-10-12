import { useState } from 'react';
import { AlertTriangle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { permanentlyDeleteTenant } from '../../services/api/admin';
import styles from './DeleteTenantModal.module.css';

const DeleteTenantModal = ({ tenant, isOpen, onClose, onSuccess }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !tenant) return null;

  const canDelete = confirmText === tenant.name;

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error('Please type the workspace name to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      await permanentlyDeleteTenant(tenant._id);
      toast.success('Workspace and all data permanently deleted');
      setConfirmText('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <AlertTriangle size={24} />
          </div>
          <h2 className={styles.title}>Delete Workspace</h2>
          <p className={styles.subtitle}>This action cannot be undone</p>
        </div>

        <div className={styles.content}>
          <div className={styles.warningSection}>
            <h3 className={styles.warningTitle}>This will permanently delete:</h3>
            <ul className={styles.warningList}>
              <li>All workspace data</li>
              <li>All users in this workspace</li>
              <li>All CRM objects and records</li>
              <li>All automations and dashboards</li>
              <li>Paystack subscription</li>
              <li>All audit logs</li>
            </ul>
          </div>

          <div className={styles.confirmSection}>
            <p className={styles.confirmText}>
              To confirm, type the workspace name: <strong>{tenant.name}</strong>
            </p>
            <input
              type="text"
              placeholder="Type workspace name..."
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={styles.input}
              disabled={isDeleting}
            />
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
            className={`${styles.deleteBtn} ${!canDelete ? styles.disabled : ''}`}
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader size={16} className={styles.spinner} />
                Deleting...
              </>
            ) : (
              'Delete Permanently'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTenantModal;
