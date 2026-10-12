import styles from './ColumnChooser.module.css';
import { useMemo, useState } from 'react';
import {
  X,
  Check,
  Search,
  ChevronUp,
  ChevronDown,
  Plus,
  RotateCcw,
} from 'lucide-react';
import Button from '../../../../components/common/Button/Button';
import { MAX_COLUMNS } from '../listViewConstants';

/**
 * Two-pane column picker: everything available on the left, the ordered set
 * that will actually render on the right.
 *
 * Order matters — the selected pane is the exact left-to-right order of the
 * table, and it is what gets persisted when the view is saved.
 *
 * @param {Array}  columnCatalog - selectable field descriptors ({ apiName, label, type })
 * @param {Array}  selected      - ordered apiNames currently shown
 * @param {Array}  viewColumns   - the active view's own columns, for "Reset"
 * @param {Function} onChange    - called with the new ordered apiName array
 * @param {Function} onClose
 */
const ColumnChooser = ({
  columnCatalog,
  selected,
  viewColumns,
  onChange,
  onClose,
}) => {
  const [draft, setDraft] = useState(selected);
  const [query, setQuery] = useState('');

  const byApiName = useMemo(() => {
    const map = new Map();
    columnCatalog.forEach((f) => map.set(f.apiName, f));
    return map;
  }, [columnCatalog]);

  const selectedFields = draft
    .map((apiName) => byApiName.get(apiName) || { apiName, label: apiName })
    .filter(Boolean);

  const needle = query.trim().toLowerCase();
  const available = columnCatalog.filter((f) => {
    if (draft.includes(f.apiName)) return false;
    if (!needle) return true;
    return (
      (f.label || '').toLowerCase().includes(needle) ||
      f.apiName.toLowerCase().includes(needle)
    );
  });

  const atCap = draft.length >= MAX_COLUMNS;
  const remaining = MAX_COLUMNS - draft.length;

  const add = (apiName) => {
    setDraft((prev) =>
      prev.includes(apiName) || prev.length >= MAX_COLUMNS
        ? prev
        : [...prev, apiName],
    );
  };

  const remove = (apiName) =>
    setDraft((prev) => prev.filter((c) => c !== apiName));

  const move = (index, delta) =>
    setDraft((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addAllVisible = () =>
    setDraft((prev) => [
      ...prev,
      ...available.slice(0, MAX_COLUMNS - prev.length).map((f) => f.apiName),
    ]);

  const clearAll = () => setDraft([]);

  const resetToView = () => setDraft(viewColumns || []);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Choose Columns</span>
        <span
          className={`${styles.counter} ${atCap ? styles.counterAtCap : ''}`}
          title={`A view can show at most ${MAX_COLUMNS} columns`}
        >
          {draft.length} / {MAX_COLUMNS}
        </span>
        <button className={styles.closeBtn} onClick={onClose} title="Close">
          <X size={16} />
        </button>
      </div>

      <div className={styles.searchRow}>
        <Search size={14} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="text"
          value={query}
          placeholder="Search fields..."
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className={styles.searchClear}
            onClick={() => setQuery('')}
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className={styles.panes}>
        <div className={styles.pane}>
          <div className={styles.paneHeader}>
            <span>Available ({available.length})</span>
            <button
              className={styles.linkBtn}
              onClick={addAllVisible}
              disabled={atCap || available.length === 0}
            >
              Add all
            </button>
          </div>
          <div className={styles.list}>
            {available.length === 0 ? (
              <div className={styles.emptyPane}>
                {needle ? 'No matching fields.' : 'All fields are selected.'}
              </div>
            ) : (
              available.map((f) => (
                <button
                  key={f.apiName}
                  className={styles.availableItem}
                  onClick={() => add(f.apiName)}
                  disabled={atCap}
                  title={
                    atCap
                      ? `Remove a column first — the maximum is ${MAX_COLUMNS}`
                      : `Add ${f.label || f.apiName}`
                  }
                >
                  <Plus size={13} className={styles.addIcon} />
                  <span className={styles.itemLabel}>
                    {f.label || f.apiName}
                  </span>
                  <span className={styles.itemType}>{f.type}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={styles.pane}>
          <div className={styles.paneHeader}>
            <span>Shown, in order ({draft.length})</span>
            <button
              className={styles.linkBtn}
              onClick={clearAll}
              disabled={draft.length === 0}
            >
              Clear all
            </button>
          </div>
          <div className={styles.list}>
            {selectedFields.length === 0 ? (
              <div className={styles.emptyPane}>
                Pick at least one column to show.
              </div>
            ) : (
              selectedFields.map((f, i) => (
                <div key={f.apiName} className={styles.selectedItem}>
                  <span className={styles.position}>{i + 1}</span>
                  <span className={styles.itemLabel}>
                    {f.label || f.apiName}
                  </span>
                  <div className={styles.itemActions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      title="Move left"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      className={styles.iconBtn}
                      onClick={() => move(i, 1)}
                      disabled={i === selectedFields.length - 1}
                      title="Move right"
                    >
                      <ChevronDown size={13} />
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.removeBtn}`}
                      onClick={() => remove(f.apiName)}
                      title="Remove column"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.hint}>
          {atCap
            ? `Maximum of ${MAX_COLUMNS} columns reached.`
            : `${remaining} more column${remaining === 1 ? '' : 's'} available.`}
        </span>
        <div className={styles.footerActions}>
          {viewColumns?.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={resetToView}
            >
              Reset
            </Button>
          )}
          <Button
            size="sm"
            icon={<Check size={13} />}
            disabled={draft.length === 0}
            onClick={() => {
              onChange(draft);
              onClose();
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ColumnChooser;
