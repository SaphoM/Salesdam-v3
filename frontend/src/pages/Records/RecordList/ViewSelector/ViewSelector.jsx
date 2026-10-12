import styles from './ViewSelector.module.css';
import { useRef, useEffect, useState } from 'react';
import {
  ListFilter as Filter,
  ChevronDown,
  Check,
  Plus,
  Pencil,
  Trash2,
  Users,
  Eye,
} from 'lucide-react';

/**
 * Saved-list-view picker. Views come from the API — the config-defined defaults
 * first (read-only), then the current user's own and shared views. Edit/delete
 * are only offered where the server said `canEdit`; everything else gets a
 * read-only look at its filters instead.
 */
const ViewSelector = ({
  views,
  activeViewKey,
  activeView,
  viewsError,
  onSelect,
  onCreate,
  onEdit,
  onInspect,
  onDelete,
}) => {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const defaultViews = views.filter((v) => v.isDefault);
  const myViews = views.filter((v) => !v.isDefault);

  // "All" is the neutral default, so anything else counts as an active filter.
  const isFiltered =
    !!activeView && (activeView.key !== 'all' || activeView.filters?.length > 0);

  const renderOption = (view) => {
    const isActive = view.key === activeViewKey;
    return (
      <div
        key={view.key}
        className={`${styles.optionRow} ${isActive ? styles.optionRowActive : ''}`}
      >
        <button
          className={styles.optionLabel}
          onClick={() => {
            onSelect(view);
            setOpen(false);
          }}
        >
          <span className={styles.optionName}>{view.name}</span>
          {view.isShared && !view.isDefault && (
            <span className={styles.sharedIcon} title="Shared with the workspace">
              <Users size={12} />
            </span>
          )}
          {isActive && <Check size={13} />}
        </button>
        {view.canEdit ? (
          <>
            <button
              className={styles.rowActionBtn}
              title="Edit view"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(view);
                setOpen(false);
              }}
            >
              <Pencil size={12} />
            </button>
            <button
              className={`${styles.rowActionBtn} ${styles.deleteBtn}`}
              title="Delete view"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(view);
              }}
            >
              <Trash2 size={12} />
            </button>
          </>
        ) : (
          // Standard views can't be changed, but their filters are worth
          // seeing — this opens the same builder, read-only.
          <button
            className={styles.rowActionBtn}
            title="View filters"
            onClick={(e) => {
              e.stopPropagation();
              onInspect(view);
              setOpen(false);
            }}
          >
            <Eye size={12} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={styles.viewSelector} ref={ref}>
      <button
        className={`${styles.viewBtn} ${isFiltered ? styles.active : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Filter size={14} />
        <span>{activeView?.name || 'All Records'}</span>
        <ChevronDown size={13} className={open ? styles.chevronOpen : ''} />
      </button>

      {open && (
        <div className={styles.dropdown}>
          {viewsError && (
            <div className={styles.errorNote}>
              Saved views couldn&apos;t be loaded.
            </div>
          )}

          {defaultViews.length > 0 && (
            <>
              <div className={styles.dropdownTitle}>Standard Views</div>
              {defaultViews.map(renderOption)}
            </>
          )}

          {myViews.length > 0 && (
            <>
              <div className={styles.divider} />
              <div className={styles.dropdownTitle}>My Views</div>
              {myViews.map(renderOption)}
            </>
          )}

          <div className={styles.divider} />
          <button
            className={styles.option}
            onClick={() => {
              onCreate();
              setOpen(false);
            }}
          >
            <Plus size={13} /> New List View...
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewSelector;
