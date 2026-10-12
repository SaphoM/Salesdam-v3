import React from 'react';
import { Inp, Sel, Row } from './shared.jsx';
import styles from './CollectionSortElement.module.css';

export default function CollectionSortElement({ config, onChange, fields = [], variables = [] }) {
  const set = (key, val) => onChange({ ...config, [key]: val });
  const sortFields = config.sortFields || [{ field: '', direction: 'asc' }];

  const updSort = (i, key, val) => onChange({
    ...config,
    sortFields: sortFields.map((s, idx) => idx === i ? { ...s, [key]: val } : s),
  });

  const addSort = () => onChange({
    ...config,
    sortFields: [...sortFields, { field: '', direction: 'asc' }],
  });

  const delSort = (i) => onChange({
    ...config,
    sortFields: sortFields.filter((_, idx) => idx !== i),
  });

  const varOptions = variables.map(v => ({
    value: v.name,
    label: `${v.label || v.name} (${v.dataType})`,
  }));

  const fieldOptions = fields.map(f => ({ value: f.apiName, label: f.label }));

  return (
    <div className={styles.wrapper}>
      <Row label="Input collection">
        {varOptions.length > 0 ? (
          <Sel
            value={config.inputVariable || ''}
            onChange={v => set('inputVariable', v)}
            placeholder="— Select collection variable —"
            options={varOptions}
          />
        ) : (
          <Inp
            value={config.inputVariable || ''}
            onChange={v => set('inputVariable', v)}
            placeholder="e.g. {$contacts}"
          />
        )}
      </Row>

      <Row label="Output variable" hint="Can be same as input to sort in place">
        <Inp
          value={config.outputVariable || ''}
          onChange={v => set('outputVariable', v)}
          placeholder="e.g. sortedContacts"
        />
      </Row>

      <Row label="Sort by">
        <div className={styles.sortList}>
          {sortFields.map((s, i) => (
            <div key={i} className={styles.sortRow}>
              {fieldOptions.length > 0 ? (
                <Sel
                  value={s.field || ''}
                  onChange={v => updSort(i, 'field', v)}
                  placeholder="— Field —"
                  options={fieldOptions}
                />
              ) : (
                <Inp value={s.field || ''} onChange={v => updSort(i, 'field', v)} placeholder="Field name" />
              )}
              <Sel
                value={s.direction || 'asc'}
                onChange={v => updSort(i, 'direction', v)}
                options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]}
              />
              {sortFields.length > 1 && (
                <button className={styles.delBtn} onClick={() => delSort(i)}>×</button>
              )}
            </div>
          ))}
          <button className={styles.addBtn} onClick={addSort}>+ Add sort field</button>
        </div>
      </Row>

      <Row label="Nulls">
        <Sel
          value={config.nullsLast !== false ? 'last' : 'first'}
          onChange={v => set('nullsLast', v === 'last')}
          options={[
            { value: 'last',  label: 'Nulls last (default)' },
            { value: 'first', label: 'Nulls first'          },
          ]}
        />
      </Row>
    </div>
  );
}
