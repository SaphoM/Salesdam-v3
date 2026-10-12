import styles from './InlineCell.module.css';
import { useEffect, useState, useRef } from 'react';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import LookupInput from '../../../../components/forms/LookupInput/LookupInput';
import LookupDisplayCell from '../LookupDisplayCell/LookupDisplayCell';
import useCurrency from '../../../../hooks/useCurrency';
import { resolveDisplayType } from '../../../../utils/fieldDisplayType';

const InlineCell = ({ field, value, recordId, onSave }) => {
  const { symbol } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const editable =
    !field.isSystem && !field.isReadOnly && field.type !== 'auto_number';

  // `error` is a dependency so a rejected save puts the cursor back in the
  // input — the save was triggered by blur, so focus would otherwise be lost
  // just as the user needs to correct the value.
  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 30);
  }, [editing, error]);

  const startEdit = (e) => {
    e.stopPropagation();
    if (!editable) return;
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
    setDraft(value);
  };

  // Every editor routes changes through here so typing clears a rejection.
  const updateDraft = (v) => {
    setDraft(v);
    if (error) setError(null);
  };

  const commit = async (newVal) => {
    if (newVal === value) {
      setEditing(false);
      setError(null);
      return;
    }
    setSaving(true);
    try {
      await onSave(recordId, field.apiName, newVal);
      setEditing(false);
      setError(null);
    } catch (err) {
      // Keep the editor open with the rejected value and the reason, so a
      // duplicate value on a unique field can be corrected in place rather than
      // silently reverting.
      const message = err.message || 'Save failed.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Blur normally commits. Once a save has been rejected it must not, or
  // clicking away would retry the same bad value and re-toast on every blur.
  const commitOnBlur = () => {
    if (!error) commit(draft);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(draft);
    }
    if (e.key === 'Escape') cancel();
  };

  const renderDisplay = () => {
    if (value === null || value === undefined || value === '')
      return <span className={styles.empty}>{''}</span>;
    // Formula fields render as their declared return type — see resolveDisplayType.
    switch (resolveDisplayType(field)) {
      case 'lookup':
      case 'master_detail':
        return <LookupDisplayCell field={field} value={value} />;
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'currency':
        return `${symbol}${parseFloat(value).toLocaleString()}`;
      case 'percent':
        return `${value}%`;
      case 'picklist': {
        const pv = field.picklistValues?.find((p) => p.value === value);
        return (
          <span
            className={styles.badge}
            style={
              pv?.color ? { background: `${pv.color}20`, color: pv.color } : {}
            }
          >
            {pv?.label || value}
          </span>
        );
      }
      default:
        return String(value);
    }
  };

  if (saving) {
    return (
      <span className={styles.cellSaving}>
        <span className={styles.cellSpinner} />
      </span>
    );
  }

  if (editing) {
    const editorProps = {
      ref: inputRef,
      className: styles.inlineInput,
      value: draft ?? '',
      onKeyDown: handleKeyDown,
      onBlur: commitOnBlur,
    };

    let editor;
    switch (field.type) {
      case 'picklist':
        editor = (
          <select
            className={styles.inlineInput}
            value={draft ?? ''}
            onChange={(e) => updateDraft(e.target.value)}
            onBlur={commitOnBlur}
            onKeyDown={handleKeyDown}
            autoFocus
          >
            <option value="">—</option>
            {(field.picklistValues || [])
              .filter((p) => p.isActive !== false)
              .map((pv) => (
                <option key={pv.value} value={pv.value}>
                  {pv.label}
                </option>
              ))}
          </select>
        );
        break;
      case 'boolean':
        editor = (
          <select
            className={styles.inlineInput}
            value={String(draft ?? '')}
            onChange={(e) => {
              const v = e.target.value === 'true';
              updateDraft(v);
              commit(v);
            }}
            autoFocus
          >
            <option value="">—</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
        break;
      case 'date':
        editor = (
          <input
            type="date"
            className={styles.inlineInput}
            value={draft ? new Date(draft).toISOString().split('T')[0] : ''}
            onChange={(e) => updateDraft(e.target.value)}
            onBlur={commitOnBlur}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );
        break;
      case 'number':
      case 'currency':
      case 'percent':
        editor = (
          <input
            type="number"
            {...editorProps}
            onChange={(e) => updateDraft(e.target.value)}
            autoFocus
          />
        );
        break;
      case 'lookup':
      case 'master_detail':
        editor = (
          <div style={{ minWidth: 200 }}>
            <LookupInput
              value={draft ?? ''}
              onChange={(id) => {
                updateDraft(id);
                commit(id);
              }}
              objectApiName={field.lookupObjectApiName}
              displayField={field.lookupDisplayField || 'name'}
              placeholder={`Select ${field.lookupObjectApiName || 'record'}...`}
            />
          </div>
        );
        break;
      default:
        editor = (
          <input
            type="text"
            {...editorProps}
            onChange={(e) => updateDraft(e.target.value)}
            autoFocus
          />
        );
    }

    // `data-inline-editing` lets the surrounding table cell drop its clipping
    // while an editor is open, so lookup popups aren't cut off.
    return (
      <div
        className={styles.inlineEditor}
        data-inline-editing="true"
        data-error={error ? 'true' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {editor}
        {error && (
          <span className={styles.inlineError} role="alert" title={error}>
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${styles.inlineCell} ${editable ? styles.editableCell : ''}`}
    >
      <span className={styles.cellValue}>{renderDisplay()}</span>
      {editable && (
        <button
          type="button"
          className={styles.editIconBtn}
          title="Edit this field"
          onClick={(e) => {
            e.stopPropagation();
            startEdit(e);
          }}
        >
          <Pencil size={11} />
        </button>
      )}
    </div>
  );
};

export default InlineCell;
