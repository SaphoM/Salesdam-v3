import React from 'react';
import { Inp, Sel, Row, MergeInput } from './shared.jsx';
import styles from './AssignmentElement.module.css';

const ASSIGNMENT_OPS = [
  { value: 'equals',   label: 'Equals (set)'    },
  { value: 'add',      label: 'Add'             },
  { value: 'subtract', label: 'Subtract'        },
  { value: 'multiply', label: 'Multiply by'     },
  { value: 'divide',   label: 'Divide by'       },
  { value: 'concat',   label: 'Concat (append)' },
  { value: 'prepend',  label: 'Prepend'         },
];

export default function AssignmentElement({ config, onChange, variables = [], fields = [], relatedFields = {} }) {
  const assignments = config.assignments || [];

  const add = () => onChange({
    ...config,
    assignments: [...assignments, { variable: '', operator: 'equals', value: '' }],
  });

  const upd = (i, field, val) => onChange({
    ...config,
    assignments: assignments.map((a, idx) => idx === i ? { ...a, [field]: val } : a),
  });

  const del = (i) => onChange({
    ...config,
    assignments: assignments.filter((_, idx) => idx !== i),
  });

  const varOptions = variables.map(v => ({ value: v.name, label: `${v.label || v.name} (${v.dataType})` }));

  return (
    <div className={styles.wrapper}>
      <Row label="Assignments" hint="Set or update flow variable values">
        <div className={styles.assignList}>
          {assignments.length === 0 && (
            <p className={styles.empty}>No assignments yet — add one below.</p>
          )}
          {assignments.map((a, i) => (
            <div key={i} className={styles.assignRow}>
              <div className={styles.varCell}>
                {varOptions.length > 0 ? (
                  <select className={styles.sel} value={a.variable || ''} onChange={e => upd(i, 'variable', e.target.value)}>
                    <option value="">— Variable —</option>
                    {varOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input className={styles.sel} value={a.variable || ''} onChange={e => upd(i, 'variable', e.target.value)} placeholder="Variable name" />
                )}
              </div>
              <select className={styles.opSel} value={a.operator || 'equals'} onChange={e => upd(i, 'operator', e.target.value)}>
                {ASSIGNMENT_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <MergeInput
                value={a.value || ''}
                onChange={v => upd(i, 'value', v)}
                placeholder="Value, {field} or {$var}"
                fields={fields}
                variables={variables}
                relatedFields={relatedFields}
              />
              <button className={styles.delBtn} onClick={() => del(i)} title="Remove">×</button>
            </div>
          ))}
          <button className={styles.addBtn} onClick={add}>+ Add assignment</button>
        </div>
      </Row>
      {variables.length === 0 && (
        <p className={styles.hint}>
          No flow variables defined. Go to the <strong>Variables</strong> tab to add some.
        </p>
      )}
    </div>
  );
}
