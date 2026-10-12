import styles from './ActionButtonModal.module.css';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';
import BtnIconPicker from './BtnIconPicker/BtnIconPicker';
import BtnColorPicker from './BtnColorPicker/BtnColorPicker';
import { getAutomations } from '../../../services/api/automations';
import {
  createActionButton,
  updateActionButton,
} from '../../../services/api/actionButtons';

const DEFAULT_BTN = {
  label: '',
  icon: 'Zap',
  variant: 'secondary',
  color: '',
  location: 'record_detail',
  resultMode: 'popup',
  automationId: '',
  confirmMessage: '',
};

const ActionButtonModal = ({
  objectApiName,
  isOpen,
  onClose,
  editingIndex,
  initialData,
}) => {
  const queryClient = useQueryClient();

  const [btnForm, setBtnForm] = useState(DEFAULT_BTN);

  const { data: flows } = useQuery({
    queryKey: ['button-automations'],
    queryFn: () => getAutomations({ type: 'screen_flow' }),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setBtnForm(
        initialData ? { ...DEFAULT_BTN, ...initialData } : { ...DEFAULT_BTN },
      );
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    if (!btnForm.label.trim()) {
      toast.error('Button label is required.');
      return;
    }

    try {
      if (editingIndex !== null) {
        await updateActionButton(objectApiName, btnForm._id, btnForm);
      } else {
        await createActionButton(objectApiName, btnForm);
      }
      toast.success(
        editingIndex !== null
          ? 'Action button updated successfully.'
          : 'Action button created successfully.',
      );
      queryClient.invalidateQueries({
        queryKey: ['action-buttons', objectApiName],
      });
    } catch (err) {
      toast.error(err.message || 'Failed to save action button.');
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingIndex !== null
          ? `Edit Button: ${btnForm.label || 'Untitled'}`
          : 'New Action Button'
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editingIndex !== null ? 'Save Changes' : 'Add Button'}
          </Button>
        </>
      }
    >
      <div className={styles.grid}>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>Button Label *</label>
          <input
            className={styles.input}
            value={btnForm.label}
            onChange={(e) =>
              setBtnForm((p) => ({ ...p, label: e.target.value }))
            }
            placeholder="e.g. Send Email"
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <BtnIconPicker
            label="Button Icon"
            value={btnForm.icon || 'Zap'}
            onChange={(icon) => setBtnForm((p) => ({ ...p, icon }))}
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <BtnColorPicker
            label="Button Color"
            value={btnForm.color || ''}
            onChange={(color) => setBtnForm((p) => ({ ...p, color }))}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Variant</label>
          <select
            className={styles.select}
            value={btnForm.variant || 'secondary'}
            onChange={(e) =>
              setBtnForm((p) => ({ ...p, variant: e.target.value }))
            }
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="ghost">Ghost</option>
            <option value="danger">Danger</option>
            <option value="success">Success</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Show on</label>
          <select
            className={styles.select}
            value={btnForm.location || 'record_detail'}
            onChange={(e) =>
              setBtnForm((p) => ({ ...p, location: e.target.value }))
            }
          >
            <option value="record_detail">Record Detail page</option>
            <option value="record_list">Record List (bulk action)</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Result display</label>
          <select
            className={styles.select}
            value={btnForm.resultMode || 'popup'}
            onChange={(e) =>
              setBtnForm((p) => ({ ...p, resultMode: e.target.value }))
            }
          >
            <option value="popup">Popup / Screen flow</option>
            <option value="toast_only">Toast notification only</option>
            <option value="inline">Inline (no modal)</option>
          </select>
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>Automation / Screen Flow</label>
          <select
            className={styles.select}
            value={btnForm.automationId || ''}
            onChange={(e) =>
              setBtnForm((p) => ({ ...p, automationId: e.target.value }))
            }
          >
            <option value="">— None —</option>
            {flows?.map((f) => (
              <option key={f?._id} value={f?._id}>
                {f?.name}
              </option>
            ))}
          </select>
          <p className={styles.smallHint}>
            Select the screen flow or automation this button will trigger.
          </p>
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>
            Confirmation message <span className={styles.hint}>(optional)</span>
          </label>
          <input
            className={styles.input}
            value={btnForm.confirmMessage || ''}
            onChange={(e) =>
              setBtnForm((p) => ({ ...p, confirmMessage: e.target.value }))
            }
            placeholder="Are you sure you want to perform this action?"
          />
          <p className={styles.smallHint}>
            If set, a confirmation dialog is shown before the action runs.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ActionButtonModal;
