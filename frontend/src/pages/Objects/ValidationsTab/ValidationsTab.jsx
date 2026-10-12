import React from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import Button from '../../../components/common/Button/Button';
import styles from './ValidationsTab.module.css';

// `isActive` defaults to true in the ObjectMeta schema, so only an explicit
// false disables a rule — a rule saved before the flag existed is still active.
// This must match runObjectValidationRules in backend/services/validationService.js.
const isRuleActive = (rule) => rule.isActive !== false;

export default function ValidationsTab({
  validationRules,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onToggleRule,
  saving = false,
}) {
  const activeCount = validationRules.filter(isRuleActive).length;

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Validation Rules</h3>
          <p className={styles.subtitle}>
            Checked every time a record is saved. Each rule describes the condition
            you want to <strong>prevent</strong> — when its expression evaluates to
            true the save is blocked and the error message is shown. Changes here
            save immediately.
          </p>
        </div>
        <Button
          size="sm"
          icon={<Plus size={14} />}
          onClick={onAddRule}
          disabled={saving}
        >
          Add Rule
        </Button>
      </div>

      {validationRules.length === 0 ? (
        <div className={styles.emptyState}>
          <ShieldCheck size={22} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No validation rules yet</p>
          <p className={styles.emptyBody}>
            Add a rule to block saves that break your business logic. Write the
            condition to reject — for example{' '}
            <code className={styles.inlineCode}>ISBLANK(client_number)</code> to
            require a client number, or{' '}
            <code className={styles.inlineCode}>amount &lt;= discount</code> to
            require the amount to exceed the discount.
          </p>
        </div>
      ) : (
        <>
          <p className={styles.summary}>
            {activeCount} of {validationRules.length}{' '}
            {validationRules.length === 1 ? 'rule' : 'rules'} enforced on save
            {activeCount < validationRules.length && (
              <span className={styles.summaryMuted}>
                {' '}
                · {validationRules.length - activeCount} inactive
              </span>
            )}
          </p>

          <ul className={styles.list}>
            {validationRules.map((rule, i) => {
              const active = isRuleActive(rule);
              return (
                <li
                  key={rule.id || rule._id || i}
                  className={`${styles.card} ${active ? '' : styles.cardInactive}`}
                >
                  <div className={styles.cardHead}>
                    <button
                      type="button"
                      className={styles.ruleName}
                      onClick={() => onEditRule(i, rule)}
                      disabled={saving}
                    >
                      {rule.name || <span className={styles.untitled}>Untitled rule</span>}
                    </button>

                    <div className={styles.cardActions}>
                      <span
                        className={`${styles.badge} ${active ? styles.badgeActive : styles.badgeInactive}`}
                      >
                        {active ? 'Active' : 'Inactive'}
                      </span>

                      {/* A real switch rather than a checkbox, so screen readers
                          announce the on/off state rather than "checked". */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={active}
                        aria-label={`${active ? 'Deactivate' : 'Activate'} rule ${rule.name || 'Untitled'}`}
                        title={
                          active
                            ? 'Enforced on save — click to stop enforcing'
                            : 'Not enforced — click to start enforcing'
                        }
                        className={`${styles.switch} ${active ? styles.switchOn : ''}`}
                        onClick={() => onToggleRule(i, !active)}
                        disabled={saving}
                      >
                        <span className={styles.switchKnob} />
                      </button>

                      <button
                        type="button"
                        title="Edit rule"
                        aria-label={`Edit rule ${rule.name || 'Untitled'}`}
                        onClick={() => onEditRule(i, rule)}
                        className={styles.iconBtn}
                        disabled={saving}
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        title="Delete rule"
                        aria-label={`Delete rule ${rule.name || 'Untitled'}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete rule "${rule.name || 'Untitled'}"? Records will no longer be checked against it.`,
                            )
                          ) {
                            onDeleteRule(i);
                          }
                        }}
                        className={`${styles.iconBtn} ${styles.deleteBtn}`}
                        disabled={saving}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {rule.description && (
                    <p className={styles.description}>{rule.description}</p>
                  )}

                  {/* Labelling the two halves "Blocks save when" / "Message"
                      spells out the rule's direction, which a bare expression
                      column left the reader to infer — and getting it backwards
                      is the single easiest mistake to make here. */}
                  <div className={styles.rule}>
                    <span className={styles.ruleLabel}>Blocks save when</span>
                    <code className={styles.expression}>
                      {rule.expression || (
                        <span className={styles.missing}>no expression</span>
                      )}
                    </code>
                  </div>

                  <div className={styles.rule}>
                    <span className={styles.ruleLabel}>Message</span>
                    <span className={styles.errorMessage}>
                      <AlertTriangle size={13} className={styles.errorIcon} />
                      {rule.errorMessage || (
                        <span className={styles.missing}>no error message</span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
