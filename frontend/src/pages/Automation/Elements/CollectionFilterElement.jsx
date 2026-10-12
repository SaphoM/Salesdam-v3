import React from 'react';
import { Inp, Sel, Row, ConditionBuilder } from './shared.jsx';
import styles from './CollectionFilterElement.module.css';

export default function CollectionFilterElement({ config, onChange, fields = [], variables = [] }) {
  const set = (key, val) => onChange({ ...config, [key]: val });

  const varOptions = variables.map(v => ({
    value: v.name,
    label: `${v.label || v.name} (${v.dataType})`,
  }));

  return (
    <div className={styles.wrapper}>
      <Row label="Input collection" hint="The collection variable to filter">
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

      <Row label="Output variable" hint="Store filtered results in this variable">
        <Inp
          value={config.outputVariable || ''}
          onChange={v => set('outputVariable', v)}
          placeholder="e.g. filteredContacts"
        />
      </Row>

      <Row label="Filter conditions" hint="Only include items where these conditions are met">
        <ConditionBuilder
          conditions={config.conditions || []}
          logic={config.logic}
          onLogicChange={v => set('logic', v)}
          onChange={v => set('conditions', v)}
          fields={fields}
        />
      </Row>
    </div>
  );
}
