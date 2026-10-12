import React from 'react';
import { Inp, Sel, Row } from './shared.jsx';
import styles from './LoopElement.module.css';

export default function LoopElement({ config, onChange, variables = [], renderStepList }) {
  const set = (key, val) => onChange({ ...config, [key]: val });

  const varOptions = variables
    .filter(v => v.dataType === 'Record Collection' || v.dataType === 'Text')
    .map(v => ({ value: v.name, label: `${v.label || v.name} (${v.dataType})` }));

  const allVarOptions = variables.map(v => ({
    value: v.name,
    label: `${v.label || v.name} (${v.dataType})`,
  }));

  return (
    <div className={styles.wrapper}>
      <Row label="Collection to loop" hint="The variable holding the list of records/values to iterate">
        {allVarOptions.length > 0 ? (
          <Sel
            value={config.collectionVariable || ''}
            onChange={v => set('collectionVariable', v)}
            placeholder="— Select collection variable —"
            options={allVarOptions}
          />
        ) : (
          <Inp
            value={config.collectionVariable || ''}
            onChange={v => set('collectionVariable', v)}
            placeholder="e.g. {$contacts} or variable name"
          />
        )}
      </Row>

      <Row label="Loop variable name" hint="Name for the current iteration item inside the loop">
        <Inp
          value={config.iterationVariable || ''}
          onChange={v => set('iterationVariable', v)}
          placeholder="e.g. currentContact"
        />
      </Row>

      <Row label="Loop direction">
        <Sel
          value={config.direction || 'first_to_last'}
          onChange={v => set('direction', v)}
          options={[
            { value: 'first_to_last', label: 'First to last'  },
            { value: 'last_to_first', label: 'Last to first'  },
          ]}
        />
      </Row>

      <div className={styles.loopBody}>
        <div className={styles.loopBodyHeader}>
          <span className={styles.loopIcon}>↻</span>
          <span className={styles.loopBodyLabel}>
            Loop body — runs for each item in{' '}
            <code>{config.collectionVariable ? `{$${config.collectionVariable}}` : '(collection)'}</code>
          </span>
        </div>
        <div className={styles.loopBodyContent}>
          {renderStepList
            ? renderStepList(config.steps || [], (steps) => set('steps', steps))
            : <p className={styles.noRenderer}>Step list unavailable.</p>
          }
        </div>
      </div>

      {config.iterationVariable && (
        <div className={styles.hint}>
          Inside the loop body, use <code>{`{$${config.iterationVariable}}`}</code> to reference the current item.
        </div>
      )}
    </div>
  );
}
