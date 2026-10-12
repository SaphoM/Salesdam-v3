import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Box, Check } from 'lucide-react';
import styles from './ObjectPickerInput.module.css';

/**
 * ObjectPickerInput — popup selector for choosing a CRM object (for Lookup fields).
 * Accepts a pre-loaded `objects` array and calls onChange(apiName, objectLabel).
 */
export default function ObjectPickerInput({ value, onChange, objects = [], placeholder = 'Select object...', disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const filtered = objects.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    o.apiName.toLowerCase().includes(query.toLowerCase())
  );

  const selected = objects.find(o => o.apiName === value);

  const handleSelect = (obj) => {
    onChange(obj.apiName, obj.label);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', '');
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`}
    >
      {/* Trigger */}
      <div
        className={`${styles.trigger} ${open ? styles.open : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
      >
        {selected ? (
          <div className={styles.selectedDisplay}>
            <div
              className={styles.selectedIcon}
              style={{ background: `${selected.color || '#6366f1'}20`, color: selected.color || '#6366f1' }}
            >
              <Box size={13} />
            </div>
            <div className={styles.selectedText}>
              <span className={styles.selectedLabel}>{selected.label}</span>
              <span className={styles.selectedApiName}>{selected.apiName}</span>
            </div>
          </div>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}

        <div className={styles.triggerRight}>
          {value && !disabled && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
              title="Clear selection"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          />
        </div>
      </div>

      {/* Popup */}
      {open && (
        <div className={styles.popup} role="listbox">
          {/* Search */}
          <div className={styles.searchRow}>
            <Search size={13} className={styles.searchIcon} />
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search objects..."
              autoComplete="off"
            />
            {query && (
              <button className={styles.clearSearch} onClick={() => setQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Object list */}
          <div className={styles.list}>
            {filtered.length === 0 ? (
              <div className={styles.empty}>
                {query ? `No objects matching "${query}"` : 'No objects available'}
              </div>
            ) : (
              filtered.map(obj => (
                <button
                  key={obj.apiName}
                  type="button"
                  role="option"
                  aria-selected={obj.apiName === value}
                  className={`${styles.item} ${obj.apiName === value ? styles.itemActive : ''}`}
                  onClick={() => handleSelect(obj)}
                >
                  {/* Object color dot + icon */}
                  <div
                    className={styles.itemIcon}
                    style={{ background: `${obj.color || '#6366f1'}20`, color: obj.color || '#6366f1' }}
                  >
                    <Box size={14} />
                  </div>

                  {/* Labels */}
                  <div className={styles.itemText}>
                    <span className={styles.itemLabel}>{obj.label}</span>
                    <span className={styles.itemApiName}>{obj.apiName}</span>
                  </div>

                  {/* Badges */}
                  <div className={styles.itemRight}>
                    {!obj.isCustom && (
                      <span className={styles.stdBadge}>Standard</span>
                    )}
                    {obj.apiName === value && (
                      <Check size={14} className={styles.checkIcon} />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer hint */}
          {objects.length > 0 && (
            <div className={styles.footer}>
              {filtered.length} of {objects.length} objects
            </div>
          )}
        </div>
      )}
    </div>
  );
}
