import React from 'react';
import { Save, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/common/Button/Button';
import styles from './EmailToLeadTab.module.css';

export default function EmailToLeadTab({ objectConfig, setObjectConfig, saving, onSave }) {
  if (!objectConfig) {
    return (
      <div className={styles.fieldsSection}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const update = (patch) =>
    setObjectConfig((p) => ({ ...p, emailToLead: { ...p.emailToLead, ...patch } }));

  return (
    <div className={styles.fieldsSection}>
      <div className={styles.fieldsHeader}>
        <div>
          <h3 className={styles.fieldsTitle}>Email to Lead</h3>
          <p className={styles.subtitle}>
            Automatically create leads from inbound emails sent to your routing address.
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
                checked={objectConfig.emailToLead?.enabled ?? false}
                onChange={(e) => update({ enabled: e.target.checked })}
              />
              Enable Email to Lead
            </label>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label className={styles.label}>Routing Email Address</label>
            <div className={styles.routingRow}>
              <input
                className={styles.input}
                value={objectConfig.emailToLead?.routingEmail || ''}
                readOnly
                style={{ background: 'var(--color-gray-50)', color: 'var(--color-gray-500)' }}
                placeholder="Auto-generated on save"
              />
              {objectConfig.emailToLead?.routingEmail && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(objectConfig.emailToLead.routingEmail);
                    toast.success('Copied!');
                  }}
                  className={styles.copyBtn}
                >
                  <Copy size={13} /> Copy
                </button>
              )}
            </div>
            <p className={styles.hint}>
              Forward or redirect inbound emails to this address. A lead will be created for each
              email received.
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Status</label>
            <input
              className={styles.input}
              value={objectConfig.emailToLead?.defaultStatus || 'New'}
              onChange={(e) => update({ defaultStatus: e.target.value })}
              placeholder="New"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Lead Source</label>
            <input
              className={styles.input}
              value={objectConfig.emailToLead?.defaultLeadSource || 'Email'}
              onChange={(e) => update({ defaultLeadSource: e.target.value })}
              placeholder="Email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={objectConfig.emailToLead?.useEmailSubjectAsName ?? true}
                onChange={(e) => update({ useEmailSubjectAsName: e.target.checked })}
              />
              Use email subject as lead name
            </label>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={objectConfig.emailToLead?.addEmailBodyAsDescription ?? true}
                onChange={(e) => update({ addEmailBodyAsDescription: e.target.checked })}
              />
              Add email body as lead description
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
