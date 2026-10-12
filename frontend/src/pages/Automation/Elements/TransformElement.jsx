import React from 'react';
import { Inp, Sel, Row } from './shared.jsx';
import styles from './TransformElement.module.css';

const TRANSFORMS = [
  { value: 'none',      label: 'No transform (copy)'    },
  { value: 'uppercase', label: 'UPPERCASE'               },
  { value: 'lowercase', label: 'lowercase'               },
  { value: 'trim',      label: 'Trim whitespace'         },
  { value: 'toString',  label: 'Convert to Text'         },
  { value: 'toNumber',  label: 'Convert to Number'       },
  { value: 'toDate',    label: 'Convert to Date'         },
  { value: 'toBoolean', label: 'Convert to Boolean'      },
  { value: 'round',     label: 'Round (number)'          },
  { value: 'abs',       label: 'Absolute value'          },
];

export default function TransformElement({ config, onChange, variables = [] }) {
  const mappings = config.mappings || [];
  const set = (key, val) => onChange({ ...config, [key]: val });

  const addMapping = () => onChange({
    ...config,
    mappings: [...mappings, { id: `m_${Date.now()}`, source: '', target: '', transform: 'none' }],
  });

  const updMapping = (i, field, val) => onChange({
    ...config,
    mappings: mappings.map((m, idx) => idx === i ? { ...m, [field]: val } : m),
  });

  const delMapping = (i) => onChange({
    ...config,
    mappings: mappings.filter((_, idx) => idx !== i),
  });

  const varOptions = variables.map(v => ({ value: v.name, label: `${v.label || v.name} (${v.dataType})` }));

  return (
    <div className={styles.wrapper}>
      <Row label="Input collection" hint="Source collection variable to transform">
        {varOptions.length > 0 ? (
          <Sel
            value={config.inputVariable || ''}
            onChange={v => set('inputVariable', v)}
            placeholder="— Select input variable —"
            options={varOptions}
          />
        ) : (
          <Inp
            value={config.inputVariable || ''}
            onChange={v => set('inputVariable', v)}
            placeholder="{$variableName} or field reference"
          />
        )}
      </Row>

      <Row label="Output variable" hint="Store transformed data here">
        <Inp
          value={config.outputVariable || ''}
          onChange={v => set('outputVariable', v)}
          placeholder="New variable name (e.g. transformedList)"
        />
      </Row>

      <Row label="Field mappings" hint="Map source fields to target fields with optional transforms">
        <div className={styles.mappingList}>
          {mappings.length === 0 && (
            <p className={styles.empty}>No mappings — all fields will be copied as-is.</p>
          )}
          {mappings.map((m, i) => (
            <div key={m.id || i} className={styles.mappingRow}>
              <input
                className={styles.fieldInput}
                value={m.source || ''}
                onChange={e => updMapping(i, 'source', e.target.value)}
                placeholder="Source field"
              />
              <span className={styles.arrow}>→</span>
              <input
                className={styles.fieldInput}
                value={m.target || ''}
                onChange={e => updMapping(i, 'target', e.target.value)}
                placeholder="Target field"
              />
              <select
                className={styles.transformSel}
                value={m.transform || 'none'}
                onChange={e => updMapping(i, 'transform', e.target.value)}
              >
                {TRANSFORMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button className={styles.delBtn} onClick={() => delMapping(i)}>×</button>
            </div>
          ))}
          <button className={styles.addBtn} onClick={addMapping}>+ Add mapping</button>
        </div>
      </Row>
    </div>
  );
}
