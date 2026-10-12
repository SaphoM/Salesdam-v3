import React from 'react';
import { Save, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/common/Button/Button';
import styles from './EmailToCaseTab.module.css';

export default function EmailToCaseTab({ objectConfig, setObjectConfig, saving, onSave }) {
  if (!objectConfig) {
    return (
      <div className={styles.fieldsSection}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const update = (patch) =>
    setObjectConfig((p) => ({ ...p, emailToCase: { ...p.emailToCase, ...patch } }));

  return (
    <div className={styles.fieldsSection}>
      <div className={styles.fieldsHeader}>
        <div>
          <h3 className={styles.fieldsTitle}>Email to Case</h3>
          <p className={styles.subtitle}>
            Automatically create cases from inbound emails sent to your support address.
          </p>
        </div>
        <Button icon={<Save size={13} />} loading={saving} onClick={onSave}>
          Save
        </Button>
      </div>

      <div className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={objectConfig.emailToCase?.enabled ?? false}
                onChange={(e) => update({ enabled: e.target.checked })}
              />
              Enable Email to Case
            </label>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label className={styles.label}>Routing Email Address</label>
            <div className={styles.routingRow}>
              <input
                className={styles.input}
                value={objectConfig.emailToCase?.routingEmail || ''}
                readOnly
                style={{ background: 'var(--color-gray-50)', color: 'var(--color-gray-500)' }}
                placeholder="Auto-generated on save"
              />
              {objectConfig.emailToCase?.routingEmail && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(objectConfig.emailToCase.routingEmail);
                    toast.success('Copied!');
                  }}
                  className={styles.copyBtn}
                >
                  <Copy size={13} /> Copy
                </button>
              )}
            </div>
            <p className={styles.hint}>
              Forward or redirect inbound support emails to this address. A case will be created for
              each email received.
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Status</label>
            <input
              className={styles.input}
              value={objectConfig.emailToCase?.defaultStatus || 'New'}
              onChange={(e) => update({ defaultStatus: e.target.value })}
              placeholder="New"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Priority</label>
            <select
              className={styles.select}
              value={objectConfig.emailToCase?.defaultPriority || 'Medium'}
              onChange={(e) => update({ defaultPriority: e.target.value })}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={objectConfig.emailToCase?.useEmailSubjectAsSubject ?? true}
                onChange={(e) => update({ useEmailSubjectAsSubject: e.target.checked })}
              />
              Use email subject as case subject
            </label>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={objectConfig.emailToCase?.addEmailBodyAsDescription ?? true}
                onChange={(e) => update({ addEmailBodyAsDescription: e.target.checked })}
              />
              Add email body as case description
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
