import React, { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, Trash2, CalendarClock } from 'lucide-react';
import { Inp, Sel, Row } from './shared.jsx';
import styles from './ScheduledPathCard.module.css';

const OFFSET_UNITS = [
  { value: 'hours',  label: 'Hours'  },
  { value: 'days',   label: 'Days'   },
  { value: 'weeks',  label: 'Weeks'  },
  { value: 'months', label: 'Months' },
];

const SYSTEM_DATE_FIELDS = [
  { apiName: 'createdAt',  label: 'Created Date'       },
  { apiName: 'updatedAt',  label: 'Last Modified Date' },
  { apiName: 'triggerTime',label: 'When Flow Is Triggered' },
];

/**
 * ScheduledPathCard
 *
 * Renders a single scheduled path — timing config at the top,
 * then a nested step list for what executes at that time.
 *
 * Props:
 *   path          — { id, label, offsetNumber, offsetUnit, offsetDirection, offsetField, steps }
 *   index         — position in the paths array
 *   total         — total number of paths (for move buttons)
 *   dateFields    — date/datetime fields from the trigger object
 *   onMove        — (index, dir) => void
 *   onChange      — (updatedPath) => void
 *   onDelete      — () => void
 *   renderStepList — (steps, onChange) => JSX  (provided by FlowBuilder)
 */
export default function ScheduledPathCard({
  path,
  index,
  total,
  dateFields = [],
  onMove,
  onChange,
  onDelete,
  renderStepList,
}) {
  const [expanded, setExpanded] = useState(true);

  const set = (key, val) => onChange({ ...path, [key]: val });

  // All date fields available for offsetFrom
  const fieldOptions = [
    ...SYSTEM_DATE_FIELDS,
    ...dateFields.filter(f =>
      !SYSTEM_DATE_FIELDS.find(s => s.apiName === f.apiName)
    ).map(f => ({ apiName: f.apiName, label: f.label })),
  ];

  const timingSummary = () => {
    const n    = path.offsetNumber || 1;
    const unit = (path.offsetUnit || 'days');
    const dir  = path.offsetDirection === 'before' ? 'before' : 'after';
    const base = fieldOptions.find(f => f.apiName === (path.offsetField || 'createdAt'))?.label || 'Created Date';
    return `${n} ${unit} ${dir} ${base}`;
  };

  return (
    <div className={`${styles.card} ${expanded ? styles.cardExpanded : ''}`}>
      {/* ── Header ── */}
      <div className={styles.header} onClick={() => setExpanded(e => !e)}>
        <span className={styles.headerIcon}><CalendarClock size={16} /></span>
        <div className={styles.headerMeta}>
          <span className={styles.headerLabel}>{path.label || `Scheduled Path ${index + 1}`}</span>
          {!expanded && (
            <span className={styles.headerSummary}>
              <Clock size={11} /> {timingSummary()}
            </span>
          )}
        </div>
        <div className={styles.headerActions} onClick={e => e.stopPropagation()}>
          <button className={styles.actionBtn} onClick={() => onMove(index, -1)} disabled={index === 0} title="Move up">
            <ChevronUp size={13} />
          </button>
          <button className={styles.actionBtn} onClick={() => onMove(index, 1)} disabled={index === total - 1} title="Move down">
            <ChevronDown size={13} />
          </button>
          <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={onDelete} title="Delete path">
            <Trash2 size={13} />
          </button>
        </div>
        <span className={styles.chevron}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </div>

      {expanded && (
        <div className={styles.body}>
          {/* ── Timing config ── */}
          <div className={styles.timingSection}>
            <div className={styles.timingSectionTitle}>
              <Clock size={13} /> When to run this path
            </div>

            <Row label="Path name">
              <Inp
                value={path.label || ''}
                onChange={v => set('label', v)}
                placeholder={`e.g. Send Follow-Up Email`}
              />
            </Row>

            <Row label="Run after / before">
              <div className={styles.timingRow}>
                <input
                  type="number"
                  className={styles.numberInput}
                  min={1}
                  value={path.offsetNumber || 1}
                  onChange={e => set('offsetNumber', Math.max(1, parseInt(e.target.value) || 1))}
                />
                <Sel
                  value={path.offsetUnit || 'days'}
                  onChange={v => set('offsetUnit', v)}
                  options={OFFSET_UNITS}
                />
                <Sel
                  value={path.offsetDirection || 'after'}
                  onChange={v => set('offsetDirection', v)}
                  options={[
                    { value: 'after',  label: 'after'  },
                    { value: 'before', label: 'before' },
                  ]}
                />
                <Sel
                  value={path.offsetField || 'createdAt'}
                  onChange={v => set('offsetField', v)}
                  options={fieldOptions.map(f => ({ value: f.apiName, label: f.label }))}
                />
              </div>
            </Row>

            <div className={styles.timingPreview}>
              <Clock size={12} />
              <span>This path runs <strong>{path.offsetNumber || 1} {path.offsetUnit || 'days'} {path.offsetDirection === 'before' ? 'before' : 'after'}</strong> the <strong>{fieldOptions.find(f => f.apiName === (path.offsetField || 'createdAt'))?.label || 'Created Date'}</strong> of each matching record.</span>
            </div>
          </div>

          {/* ── Steps ── */}
          <div className={styles.stepsSection}>
            <div className={styles.stepsSectionTitle}>
              <span>Steps — run at scheduled time</span>
              <span className={styles.stepsCount}>{(path.steps || []).length} step{(path.steps || []).length !== 1 ? 's' : ''}</span>
            </div>
            <div className={styles.stepsBody}>
              {renderStepList
                ? renderStepList(path.steps || [], (steps) => set('steps', steps))
                : <p className={styles.noRenderer}>Step list unavailable.</p>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
