import React from 'react';
import { Inp, Sel, Row, MergeInput } from './shared.jsx';
import styles from './FormulaElement.module.css';

const DATA_TYPES = ['Text', 'Number', 'Boolean', 'Date', 'DateTime', 'Currency'];

const FORMULA_HELP = [
  { fn: 'IF(cond, yes, no)',    desc: 'Conditional value'            },
  { fn: 'UPPER({field})',       desc: 'Uppercase text'               },
  { fn: 'LOWER({field})',       desc: 'Lowercase text'               },
  { fn: 'LEN({field})',         desc: 'String length'                },
  { fn: 'CONCAT(a, b)',         desc: 'Combine strings'              },
  { fn: 'ROUND(n, digits)',      desc: 'Round number'                 },
  { fn: 'TODAY()',              desc: 'Current date'                 },
  { fn: 'NOW()',                desc: 'Current datetime'             },
  { fn: 'YEAR({dateField})',    desc: 'Extract year'                 },
  { fn: 'MONTH({dateField})',   desc: 'Extract month'                },
];

export default function FormulaElement({ config, onChange, fields = [], variables = [], relatedFields = {} }) {
  const set = (key, val) => onChange({ ...config, [key]: val });

  const varOptions = variables.map(v => ({
    value: v.name,
    label: `${v.label || v.name} (${v.dataType})`,
  }));

  return (
    <div className={styles.wrapper}>
      <Row label="Output variable" hint="Store result in this flow variable">
        {varOptions.length > 0 ? (
          <Sel
            value={config.outputVariable || ''}
            onChange={v => set('outputVariable', v)}
            placeholder="— Select variable —"
            options={varOptions}
          />
        ) : (
          <Inp
            value={config.outputVariable || ''}
            onChange={v => set('outputVariable', v)}
            placeholder="Variable name (define in Variables tab)"
          />
        )}
      </Row>

      <Row label="Data type" hint="Type of the formula result">
        <Sel
          value={config.dataType || 'Text'}
          onChange={v => set('dataType', v)}
          options={DATA_TYPES}
        />
      </Row>

      <Row label="Formula" hint="Use {field}, {$variable}, and functions">
        <MergeInput
          value={config.formula || ''}
          onChange={v => set('formula', v)}
          rows={3}
          placeholder="e.g. UPPER({firstName}) & ' ' & {lastName}"
          fields={fields}
          variables={variables}
          relatedFields={relatedFields}
        />
      </Row>

      <details className={styles.helpToggle}>
        <summary className={styles.helpSummary}>Formula functions reference</summary>
        <div className={styles.helpGrid}>
          {FORMULA_HELP.map(h => (
            <div key={h.fn} className={styles.helpRow}>
              <code className={styles.fn}>{h.fn}</code>
              <span className={styles.desc}>{h.desc}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
