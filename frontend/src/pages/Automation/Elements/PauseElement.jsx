import React from 'react';
import { Inp, Sel, Row, ConditionBuilder } from './shared.jsx';
import styles from './PauseElement.module.css';

export default function PauseElement({ config, onChange, fields = [] }) {
  const set = (key, val) => onChange({ ...config, [key]: val });
  const resumeType = config.resumeType || 'time';

  return (
    <div className={styles.wrapper}>
      <Row label="Resume when">
        <Sel
          value={resumeType}
          onChange={v => set('resumeType', v)}
          options={[
            { value: 'time',      label: 'After a time delay'          },
            { value: 'condition', label: 'When conditions are met'     },
          ]}
        />
      </Row>

      {resumeType === 'time' && (
        <Row label="Delay duration">
          <div style={{ display: 'flex', gap: 8 }}>
            <Inp
              type="number"
              value={config.duration || 1}
              onChange={v => set('duration', parseInt(v) || 1)}
              style={{ width: 80 }}
            />
            <Sel
              value={config.unit || 'hours'}
              onChange={v => set('unit', v)}
              options={['minutes', 'hours', 'days', 'weeks']}
            />
          </div>
        </Row>
      )}

      {resumeType === 'condition' && (
        <Row label="Resume conditions" hint="Flow resumes when these are satisfied">
          <ConditionBuilder
            conditions={config.conditions || []}
            logic={config.logic}
            onLogicChange={v => set('logic', v)}
            onChange={v => set('conditions', v)}
            fields={fields}
          />
        </Row>
      )}

      <div className={styles.note}>
        The flow pauses here and resumes asynchronously. Only supported in Screen Flows.
      </div>
    </div>
  );
}
