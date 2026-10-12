import React from 'react';
import { Sel, Row, MergeInput } from './shared.jsx';
import styles from './shared.module.css';

const TARGET_TYPES = [
  { value: 'record_list', label: 'Record List' },
  { value: 'record_detail', label: 'Record Detail' },
];

export default function NavigateElement({
  config,
  onChange,
  fields = [],
  objects = [],
  variables = [],
  outputVariables = [],
}) {
  const set = (key, val) => onChange({ ...config, [key]: val });

  return (
    <div className={styles.cfgSection}>
      <Row label="Navigate to">
        <Sel
          value={config.targetType || 'record_list'}
          onChange={(v) => onChange({ ...config, targetType: v, recordId: '' })}
          options={TARGET_TYPES}
        />
      </Row>

      <Row label="Object">
        <Sel
          value={config.objectApiName || ''}
          onChange={(v) => set('objectApiName', v)}
          placeholder="— Select object —"
          options={objects.map((o) => ({ value: o.apiName, label: o.label }))}
        />
      </Row>

      {(config.targetType || 'record_list') === 'record_detail' && (
        <Row
          label="Record ID"
          hint="The ID of the record to navigate to. Use {_id} for the trigger record."
        >
          <MergeInput
            value={config.recordId || ''}
            onChange={(v) => set('recordId', v)}
            placeholder="{_id}"
            fields={fields}
            variables={variables}
            outputVariables={outputVariables}
          />
        </Row>
      )}
    </div>
  );
}
