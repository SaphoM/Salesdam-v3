import React, { useState, useEffect } from 'react';
import { Inp, Sel, Row, ConditionBuilder } from './shared.jsx';
import api from '../../../services/api.js';
import styles from './DeleteRecordsElement.module.css';

export default function DeleteRecordsElement({ config, onChange, objects = [], variables = [] }) {
  const [objFields, setObjFields] = useState([]);
  const set = (key, val) => onChange({ ...config, [key]: val });
  const mode = config.mode || 'trigger_record';

  useEffect(() => {
    if (mode !== 'query' || !config.objectApiName) { setObjFields([]); return; }
    api.get(`/objects/${config.objectApiName}`)
      .then(r => setObjFields((r.data.data?.fields || []).sort((a, b) => a.displayOrder - b.displayOrder)))
      .catch(() => setObjFields([]));
  }, [mode, config.objectApiName]);

  const varOptions = variables
    .filter(v => v.dataType === 'Record' || v.dataType === 'Record Collection')
    .map(v => ({ value: v.name, label: `${v.label || v.name} (${v.dataType})` }));

  return (
    <div className={styles.wrapper}>
      <Row label="Delete mode">
        <Sel
          value={mode}
          onChange={v => onChange({ ...config, mode: v })}
          options={[
            { value: 'trigger_record', label: 'Delete the trigger record'         },
            { value: 'collection',     label: 'Delete from a collection variable' },
            { value: 'query',          label: 'Query and delete matching records'  },
          ]}
        />
      </Row>

      {mode === 'collection' && (
        <Row label="Collection variable" hint="Delete all records in this variable">
          {varOptions.length > 0 ? (
            <Sel
              value={config.collectionVariable || ''}
              onChange={v => set('collectionVariable', v)}
              placeholder="— Select variable —"
              options={varOptions}
            />
          ) : (
            <Inp
              value={config.collectionVariable || ''}
              onChange={v => set('collectionVariable', v)}
              placeholder="{$variableName}"
            />
          )}
        </Row>
      )}

      {mode === 'query' && (
        <>
          <Row label="Object">
            <Sel
              value={config.objectApiName || ''}
              onChange={v => onChange({ ...config, objectApiName: v, filters: [] })}
              placeholder="— Select object —"
              options={objects.map(o => ({ value: o.apiName, label: o.label }))}
            />
          </Row>
          {config.objectApiName && (
            <Row label="Filter conditions" hint="Delete records matching these conditions">
              <ConditionBuilder
                conditions={config.filters || []}
                onChange={v => set('filters', v)}
                fields={objFields}
              />
            </Row>
          )}
        </>
      )}

      {mode === 'trigger_record' && (
        <div className={styles.notice}>
          Deletes the record that triggered this automation. Use with caution.
        </div>
      )}
    </div>
  );
}
