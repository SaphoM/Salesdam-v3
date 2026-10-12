import React from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import Button from '../../../components/common/Button/Button';
import styles from './ConversionTab.module.css';

export default function ConversionTab({ objectConfig, setObjectConfig, saving, onSave }) {
  if (!objectConfig) {
    return (
      <div className={styles.fieldsSection}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const updateConversion = (patch) =>
    setObjectConfig((p) => ({
      ...p,
      conversionSettings: { ...p.conversionSettings, ...patch },
    }));

  const updateMapping = (idx, patch) =>
    setObjectConfig((p) => {
      const maps = [...(p.conversionSettings?.fieldMappings || [])];
      maps[idx] = { ...maps[idx], ...patch };
      return { ...p, conversionSettings: { ...p.conversionSettings, fieldMappings: maps } };
    });

  const addMapping = () =>
    setObjectConfig((p) => ({
      ...p,
      conversionSettings: {
        ...p.conversionSettings,
        fieldMappings: [
          ...(p.conversionSettings?.fieldMappings || []),
          { leadField: '', targetObject: 'contact', targetField: '' },
        ],
      },
    }));

  const removeMapping = (idx) =>
    setObjectConfig((p) => {
      const maps = (p.conversionSettings?.fieldMappings || []).filter((_, i) => i !== idx);
      return { ...p, conversionSettings: { ...p.conversionSettings, fieldMappings: maps } };
    });

  return (
    <div className={styles.fieldsSection}>
      <div className={styles.fieldsHeader}>
        <div>
          <h3 className={styles.fieldsTitle}>Lead Conversion Settings</h3>
          <p className={styles.subtitle}>
            Configure how leads are converted to contacts, clients, and opportunities.
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
                checked={objectConfig.conversionSettings?.enabled ?? true}
                onChange={(e) => updateConversion({ enabled: e.target.checked })}
              />
              Enable lead conversion
            </label>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Converted Status</label>
            <input
              className={styles.input}
              value={objectConfig.conversionSettings?.convertedStatus || 'Converted'}
              onChange={(e) => updateConversion({ convertedStatus: e.target.value })}
              placeholder="e.g. Converted"
            />
            <p className={styles.hint}>The lead status value that marks it as converted.</p>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={objectConfig.conversionSettings?.autoCreateOpportunity ?? false}
                onChange={(e) => updateConversion({ autoCreateOpportunity: e.target.checked })}
              />
              Auto-create opportunity on conversion
            </label>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={objectConfig.conversionSettings?.requireOpportunity ?? false}
                onChange={(e) => updateConversion({ requireOpportunity: e.target.checked })}
              />
              Require opportunity during conversion
            </label>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label className={styles.label}>Default Opportunity Name Template</label>
            <input
              className={styles.input}
              value={objectConfig.conversionSettings?.defaultOpportunityName || ''}
              onChange={(e) => updateConversion({ defaultOpportunityName: e.target.value })}
              placeholder="{company} - Opportunity"
            />
            <p className={styles.hint}>
              Use <code>{'{company}'}</code>, <code>{'{first_name}'}</code>,{' '}
              <code>{'{last_name}'}</code> as placeholders.
            </p>
          </div>
        </div>

        <div className={styles.mappingsSection}>
          <div className={styles.mappingsHeader}>
            <div>
              <h4 className={styles.mappingsTitle}>Field Mappings</h4>
              <p className={styles.hint}>
                Map lead fields to contact, client, or opportunity fields on conversion.
              </p>
            </div>
            <Button size="sm" icon={<Plus size={13} />} onClick={addMapping}>
              Add Mapping
            </Button>
          </div>

          {(objectConfig.conversionSettings?.fieldMappings || []).length === 0 && (
            <p className={styles.emptyMappings}>
              No field mappings defined. Add mappings to auto-populate converted records.
            </p>
          )}

          {(objectConfig.conversionSettings?.fieldMappings || []).map((mapping, idx) => (
            <div key={idx} className={styles.mappingRow}>
              <input
                className={styles.input}
                value={mapping.leadField}
                onChange={(e) => updateMapping(idx, { leadField: e.target.value })}
                placeholder="Lead field (e.g. email)"
              />
              <span className={styles.arrow}>→</span>
              <select
                className={styles.select}
                value={mapping.targetObject}
                onChange={(e) => updateMapping(idx, { targetObject: e.target.value })}
              >
                <option value="contact">Contact</option>
                <option value="client">Client</option>
                <option value="opportunity">Opportunity</option>
              </select>
              <input
                className={styles.input}
                value={mapping.targetField}
                onChange={(e) => updateMapping(idx, { targetField: e.target.value })}
                placeholder="Target field (e.g. email)"
              />
              <button onClick={() => removeMapping(idx)} className={styles.removeBtn}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
