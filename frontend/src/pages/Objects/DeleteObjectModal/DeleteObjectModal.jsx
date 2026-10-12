import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';
import styles from './DeleteObjectModal.module.css';

/**
 * Confirmation modal for permanently deleting a custom object.
 *
 * Deleting an object cascades to every field, every record, and every reference
 * to it, so the user has to type the object's API name before the delete button
 * unlocks.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Object} object - the object being deleted ({ label, apiName, ... })
 * @param {Function} onConfirm - async; performs the delete
 * @param {number} [fieldCount] - shown in the impact list when known
 */
const DeleteObjectModal = ({
  isOpen,
  onClose,
  object,
  onConfirm,
  fieldCount,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [wasOpen, setWasOpen] = useState(isOpen);

  // Clear the typed confirmation whenever the modal is reopened, so a previous
  // attempt can't leave the delete button pre-unlocked. Derived during render
  // rather than in an effect to avoid a cascading render pass.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setConfirmText('');
      setDeleting(false);
    }
  }

  if (!object) return null;

  const canDelete = confirmText.trim() === object.apiName && !deleting;

  const handleConfirm = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await onConfirm();
    } catch {
      // The caller surfaces the error; keep the modal open so the user can
      // retry or cancel.
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={deleting ? () => {} : onClose}
      title={`Delete ${object.label}?`}
      size="md"
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!canDelete}
            loading={deleting}
          >
            Delete permanently
          </Button>
        </div>
      }
    >
      <div className={styles.warning}>
        <AlertTriangle size={18} className={styles.warningIcon} />
        <div>
          <strong>This cannot be undone.</strong> Deleting this object
          permanently removes it and everything attached to it.
        </div>
      </div>

      <p className={styles.intro}>The following will be deleted:</p>
      <ul className={styles.list}>
        <li>
          <strong>All records</strong> stored against{' '}
          <code>{object.apiName}</code>
        </li>
        <li>
          <strong>
            All fields
            {typeof fieldCount === 'number' ? ` (${fieldCount})` : ''}
          </strong>{' '}
          and their configuration
        </li>
        <li>Page layouts, custom tabs and auto-number counters</li>
        <li>
          References in <strong>workspaces</strong>, sidebar{' '}
          <strong>object groups</strong>, and role permissions
        </li>
      </ul>

      <label className={styles.confirmLabel}>
        Type <code className={styles.apiName}>{object.apiName}</code> to
        confirm
      </label>
      <input
        className={styles.confirmInput}
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={object.apiName}
        disabled={deleting}
        autoComplete="off"
        spellCheck="false"
      />
    </Modal>
  );
};

export default DeleteObjectModal;
