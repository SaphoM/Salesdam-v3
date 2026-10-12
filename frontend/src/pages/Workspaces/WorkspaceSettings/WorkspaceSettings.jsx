import styles from './WorkspaceSettings.module.css';
import { Save } from 'lucide-react';
import Button from '../../../components/common/Button/Button';

const WorkspaceSettings = ({ form, setForm, saving, onSave }) => {
  return (
    <div className={styles.panel}>
      <div className={styles.sectionTitle}>Workspace Settings</div>

      <div className={styles.formGrid}>
        {/* Name */}
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={form.name || ''}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>

        {/* Description */}
        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <input
            className={styles.input}
            value={form.description || ''}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="What is this workspace for?"
          />
        </div>

        {/* Color */}
        <div className={styles.field}>
          <label className={styles.label}>Color</label>
          <input
            type="color"
            className={styles.colorInput}
            value={form.color || '#6366f1'}
            onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
          />
        </div>

        {/* Default */}
        <div className={styles.field}>
          <label className={styles.label}>Set as default</label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.isDefault || false}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  isDefault: e.target.checked,
                }))
              }
            />
            Default workspace (available to all users)
          </label>
        </div>
      </div>

      <div className={styles.saveRow}>
        <Button icon={<Save size={14} />} loading={saving} onClick={onSave}>
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default WorkspaceSettings;
