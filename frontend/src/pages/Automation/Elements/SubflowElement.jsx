import React, { useState, useEffect } from 'react';
import { Inp, Sel, Row } from './shared.jsx';
import api from '../../../services/api.js';
import styles from './SubflowElement.module.css';

export default function SubflowElement({ config, onChange, variables = [] }) {
  const [automations, setAutomations] = useState([]);
  const set = (key, val) => onChange({ ...config, [key]: val });

  useEffect(() => {
    api.get('/automations', { params: { limit: 100 } })
      .then(r => setAutomations((r.data.data || []).filter(a => a.isActive)))
      .catch(() => {});
  }, []);

  const inputMappings  = config.inputMappings  || [];
  const outputMappings = config.outputMappings || [];

  const updIn  = (i, k, v) => onChange({ ...config, inputMappings:  inputMappings.map((m, idx)  => idx === i ? { ...m, [k]: v } : m) });
  const updOut = (i, k, v) => onChange({ ...config, outputMappings: outputMappings.map((m, idx) => idx === i ? { ...m, [k]: v } : m) });

  return (
    <div className={styles.wrapper}>
      <Row label="Subflow" hint="The automation to call as a subflow">
        <Sel
          value={config.automationId || ''}
          onChange={v => set('automationId', v)}
          placeholder="— Select active automation —"
          options={automations.map(a => ({ value: a._id, label: a.name }))}
        />
      </Row>

      <Row label="Input mappings" hint="Pass values into the subflow">
        <div className={styles.mappingList}>
          {inputMappings.map((m, i) => (
            <div key={i} className={styles.mappingRow}>
              <Inp value={m.target || ''} onChange={v => updIn(i, 'target', v)} placeholder="Subflow variable" />
              <span className={styles.eq}>=</span>
              <Inp value={m.source || ''} onChange={v => updIn(i, 'source', v)} placeholder="{field} or {$variable}" />
              <button className={styles.delBtn} onClick={() => onChange({ ...config, inputMappings: inputMappings.filter((_, idx) => idx !== i) })}>×</button>
            </div>
          ))}
          <button className={styles.addBtn}
            onClick={() => onChange({ ...config, inputMappings: [...inputMappings, { target: '', source: '' }] })}>
            + Add input
          </button>
        </div>
      </Row>

      <Row label="Output mappings" hint="Receive values back from the subflow">
        <div className={styles.mappingList}>
          {outputMappings.map((m, i) => (
            <div key={i} className={styles.mappingRow}>
              <Inp value={m.source || ''} onChange={v => updOut(i, 'source', v)} placeholder="Subflow output var" />
              <span className={styles.eq}>→</span>
              <Inp value={m.target || ''} onChange={v => updOut(i, 'target', v)} placeholder="Local variable name" />
              <button className={styles.delBtn} onClick={() => onChange({ ...config, outputMappings: outputMappings.filter((_, idx) => idx !== i) })}>×</button>
            </div>
          ))}
          <button className={styles.addBtn}
            onClick={() => onChange({ ...config, outputMappings: [...outputMappings, { source: '', target: '' }] })}>
            + Add output
          </button>
        </div>
      </Row>
    </div>
  );
}
