import React, { useState } from 'react';
import styles from './VariablesPanel.module.css';

const DATA_TYPES = [
  'Text', 'Number', 'Boolean', 'Date', 'DateTime',
  'Currency', 'Record', 'Record Collection',
];

const TYPE_COLORS = {
  Text:               { bg: '#e0f2fe', color: '#0284c7' },
  Number:             { bg: '#fef3c7', color: '#b45309' },
  Boolean:            { bg: '#f0fdf4', color: '#16a34a' },
  Date:               { bg: '#faf5ff', color: '#7c3aed' },
  DateTime:           { bg: '#f5f3ff', color: '#6d28d9' },
  Currency:           { bg: '#fff7ed', color: '#c2410c' },
  Record:             { bg: '#eff6ff', color: '#1d4ed8' },
  'Record Collection':{ bg: '#f0f9ff', color: '#0369a1' },
};

const emptyVar = () => ({
  id: `var_${Date.now()}`,
  name: '',
  label: '',
  dataType: 'Text',
  objectApiName: '',
  isInput: false,
  isOutput: false,
  defaultValue: '',
});

function TypeBadge({ type }) {
  const style = TYPE_COLORS[type] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span className={styles.typeBadge} style={{ background: style.bg, color: style.color }}>
      {type}
    </span>
  );
}

function VariableForm({ variable, onChange, onCancel, onSave, objects = [] }) {
  const needsObject = variable.dataType === 'Record' || variable.dataType === 'Record Collection';

  const set = (key, val) => onChange({ ...variable, [key]: val });

  const handleNameChange = (val) => {
    const apiName = val.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]+/, '');
    set('name', apiName);
    if (!variable.label) set('label', val);
  };

  return (
    <div className={styles.varForm}>
      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label className={styles.fieldLabel}>API Name <span className={styles.required}>*</span></label>
          <input
            className={styles.input}
            value={variable.name || ''}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="e.g. accountList"
          />
          <span className={styles.fieldHint}>camelCase, no spaces</span>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel}>Label</label>
          <input
            className={styles.input}
            value={variable.label || ''}
            onChange={e => set('label', e.target.value)}
            placeholder="e.g. Account List"
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel}>Data Type <span className={styles.required}>*</span></label>
          <select className={styles.input} value={variable.dataType || 'Text'} onChange={e => set('dataType', e.target.value)}>
            {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {needsObject && (
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Object</label>
            <select className={styles.input} value={variable.objectApiName || ''} onChange={e => set('objectApiName', e.target.value)}>
              <option value="">— Select object —</option>
              {objects.map(o => <option key={o.apiName} value={o.apiName}>{o.label}</option>)}
            </select>
          </div>
        )}

        {!needsObject && (
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Default value</label>
            <input
              className={styles.input}
              value={variable.defaultValue || ''}
              onChange={e => set('defaultValue', e.target.value)}
              placeholder="Optional default"
            />
          </div>
        )}
      </div>

      <div className={styles.ioRow}>
        <label className={styles.checkLabel}>
          <input type="checkbox" checked={!!variable.isInput} onChange={e => set('isInput', e.target.checked)} />
          <span>Available for input</span>
          <span className={styles.ioHint}>Can be passed in when launching the flow</span>
        </label>
        <label className={styles.checkLabel}>
          <input type="checkbox" checked={!!variable.isOutput} onChange={e => set('isOutput', e.target.checked)} />
          <span>Available for output</span>
          <span className={styles.ioHint}>Returned when the flow ends</span>
        </label>
      </div>

      <div className={styles.formActions}>
        <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button
          className={styles.saveBtn}
          onClick={onSave}
          disabled={!variable.name}
        >
          Save variable
        </button>
      </div>
    </div>
  );
}

export default function VariablesPanel({ variables = [], onChange, objects = [] }) {
  const [editing, setEditing] = useState(null);   // null | 'new' | index
  const [draft, setDraft] = useState(null);

  const startNew = () => {
    setDraft(emptyVar());
    setEditing('new');
  };

  const startEdit = (i) => {
    setDraft({ ...variables[i] });
    setEditing(i);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
  };

  const saveNew = () => {
    if (!draft?.name) return;
    onChange([...variables, draft]);
    cancelEdit();
  };

  const saveEdit = () => {
    if (!draft?.name) return;
    onChange(variables.map((v, i) => i === editing ? draft : v));
    cancelEdit();
  };

  const deleteVar = (i) => {
    onChange(variables.filter((_, idx) => idx !== i));
    if (editing === i) cancelEdit();
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelTitle}>Flow Variables</div>
          <div className={styles.panelSubtitle}>
            Variables store data during the flow and can be referenced with <code>{'{$variableName}'}</code>
          </div>
        </div>
        {editing === null && (
          <button className={styles.newBtn} onClick={startNew}>+ New Variable</button>
        )}
      </div>

      {editing === 'new' && (
        <div className={styles.newFormWrap}>
          <div className={styles.newFormTitle}>New Variable</div>
          <VariableForm
            variable={draft}
            onChange={setDraft}
            onCancel={cancelEdit}
            onSave={saveNew}
            objects={objects}
          />
        </div>
      )}

      {variables.length === 0 && editing !== 'new' && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>{'{x}'}</div>
          <div className={styles.emptyText}>No variables defined yet.</div>
          <div className={styles.emptyHint}>Variables store data your flow can read and write during execution.</div>
          <button className={styles.newBtn} onClick={startNew}>+ New Variable</button>
        </div>
      )}

      {variables.length > 0 && (
        <div className={styles.varList}>
          {variables.map((v, i) => (
            <div key={v.id || i}>
              {editing === i ? (
                <div className={styles.editFormWrap}>
                  <VariableForm
                    variable={draft}
                    onChange={setDraft}
                    onCancel={cancelEdit}
                    onSave={() => saveEdit()}
                    objects={objects}
                  />
                </div>
              ) : (
                <div className={styles.varRow}>
                  <div className={styles.varMain}>
                    <code className={styles.varName}>{`{$${v.name}}`}</code>
                    {v.label && v.label !== v.name && (
                      <span className={styles.varLabel}>{v.label}</span>
                    )}
                  </div>
                  <div className={styles.varMeta}>
                    <TypeBadge type={v.dataType} />
                    {v.objectApiName && (
                      <span className={styles.varObject}>{v.objectApiName}</span>
                    )}
                    {v.isInput  && <span className={styles.ioBadge}>IN</span>}
                    {v.isOutput && <span className={styles.ioBadge} style={{ background: '#dcfce7', color: '#16a34a' }}>OUT</span>}
                  </div>
                  <div className={styles.varActions}>
                    <button className={styles.editBtn} onClick={() => startEdit(i)}>Edit</button>
                    <button className={styles.delBtn}  onClick={() => deleteVar(i)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
