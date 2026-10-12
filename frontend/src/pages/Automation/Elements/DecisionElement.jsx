import React, { useState } from 'react';
import { Inp, Sel, Row, ConditionBuilder, genId } from './shared.jsx';
import styles from './DecisionElement.module.css';

export default function DecisionElement({
  config,
  onChange,
  fields = [],
  variables = [],
  outputVariables = [],
  recordPageFields = [],
  renderStepList,
}) {
  const outcomes = config.outcomes || [
    { id: genId(), label: 'Yes', conditions: [], logic: 'all', steps: [] },
    {
      id: genId(),
      label: 'Default Outcome',
      conditions: [],
      logic: 'all',
      steps: [],
      isDefault: true,
    },
  ];

  const [activeOutcome, setActiveOutcome] = useState(0);

  const updOutcome = (i, upd) =>
    onChange({
      ...config,
      outcomes: outcomes.map((o, idx) => (idx === i ? { ...o, ...upd } : o)),
    });

  const updOutcomeSteps = (i, steps) => updOutcome(i, { steps });

  const addOutcome = () => {
    const nonDefault = outcomes.filter((o) => !o.isDefault);
    const defOutcome = outcomes.find((o) => o.isDefault);
    const newOutcome = {
      id: genId(),
      label: `Outcome ${nonDefault.length + 1}`,
      conditions: [],
      logic: 'all',
      steps: [],
    };
    const newOutcomes = defOutcome
      ? [...nonDefault, newOutcome, defOutcome]
      : [...outcomes, newOutcome];
    onChange({ ...config, outcomes: newOutcomes });
    setActiveOutcome(newOutcomes.length - (defOutcome ? 2 : 1));
  };

  const delOutcome = (i) => {
    if (outcomes[i].isDefault) return;
    const newOutcomes = outcomes.filter((_, idx) => idx !== i);
    onChange({ ...config, outcomes: newOutcomes });
    setActiveOutcome(
      Math.max(0, Math.min(activeOutcome, newOutcomes.length - 1)),
    );
  };

  const active = outcomes[activeOutcome] || outcomes[0];
  const activeIdx = outcomes.indexOf(active);

  return (
    <div className={styles.wrapper}>
      <div className={styles.outcomeTabsRow}>
        <div className={styles.outcomeTabs}>
          {outcomes.map((o, i) => (
            <button
              key={o.id}
              className={`${styles.outcomeTab} ${i === activeOutcome ? styles.outcomeTabActive : ''} ${o.isDefault ? styles.outcomeTabDefault : ''}`}
              onClick={() => setActiveOutcome(i)}
            >
              {o.label || `Outcome ${i + 1}`}
              {!o.isDefault && outcomes.length > 2 && (
                <span
                  className={styles.outcomeTabDel}
                  onClick={(e) => {
                    e.stopPropagation();
                    delOutcome(i);
                  }}
                  title="Remove outcome"
                >
                  ×
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          className={styles.addOutcomeBtn}
          onClick={addOutcome}
          title="Add outcome"
        >
          + Outcome
        </button>
      </div>

      {active && (
        <div className={styles.outcomeBody}>
          <div className={styles.outcomeConfig}>
            <Row label="Outcome label">
              <Inp
                value={active.label || ''}
                onChange={(v) => updOutcome(activeIdx, { label: v })}
                placeholder="e.g. Account Found"
              />
            </Row>

            {!active.isDefault && (
              <Row
                label="Conditions"
                hint="This outcome is taken when ALL/ANY of these match"
              >
                <ConditionBuilder
                  conditions={active.conditions || []}
                  logic={active.logic}
                  onLogicChange={(v) => updOutcome(activeIdx, { logic: v })}
                  onChange={(v) => updOutcome(activeIdx, { conditions: v })}
                  fields={fields}
                  triggerFields={fields}
                  variables={variables}
                  outputVariables={outputVariables}
                  recordPageFields={recordPageFields}
                />
              </Row>
            )}

            {active.isDefault && (
              <div className={styles.defaultNote}>
                This outcome runs when no other outcome conditions match.
              </div>
            )}
          </div>

          <div className={styles.outcomeBranch}>
            <div className={styles.branchLabel}>
              Steps for: <strong>{active.label || 'this outcome'}</strong>
            </div>
            <div className={styles.nestedSteps}>
              {renderStepList ? (
                renderStepList(active.steps || [], (steps) =>
                  updOutcomeSteps(activeIdx, steps),
                )
              ) : (
                <p className={styles.noRenderer}>Step list unavailable.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
