import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  ExternalLink,
  ChevronDown,
  Loader,
} from 'lucide-react';
import api from '../../../services/api';
import styles from './RoleLookup.module.css';

export default function RoleLookup({
  value,
  displayValue,
  onChange,
  placeholder = 'Search roles...',
  disabled,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState(displayValue || '');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (value && !displayValue) {
      api
        .get(`/roles/${value}`)
        .then((res) => {
          const role = res.data.data;
          setLabel(role.label || role.name);
        })
        .catch(() => setLabel(String(value).slice(-8)));
    } else if (!value) {
      setLabel('');
    }
  }, [value, displayValue]);

  const search = async (q) => {
    setLoading(true);
    try {
      const trimmed = q.trim();

      if (!trimmed) {
        const res = await api.get('/roles', {
          params: { limit: 50, sort: 'label' },
        });
        setResults(
          (res.data.data || []).map((r) => ({
            id: r._id,
            label: r.label || r.name,
            sublabel: r.description || r.name,
          })),
        );
        return;
      }

      const res = await api.get('/roles', {
        params: { limit: 50, search: trimmed },
      });
      setResults(
        (res.data.data || []).map((r) => ({
          id: r._id,
          label: r.label || r.name,
          sublabel: r.description || r.name,
        })),
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (item) => {
    setLabel(item.label);
    onChange(item.id, item.label);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setLabel('');
    onChange('', '');
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.wrapper} ${error ? styles.hasError : ''} ${disabled ? styles.disabled : ''}`}
    >
      <div className={styles.trigger} onClick={handleOpen}>
        {value ? (
          <span className={styles.selected}>
            <ExternalLink size={13} className={styles.selectedIcon} />
            <span className={styles.selectedLabel}>
              {(() => {
                const text = label || String(value);
                return text.length > 30 ? `${text.slice(0, 30)}…` : text;
              })()}
            </span>
          </span>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <div className={styles.triggerActions}>
          {value && !disabled && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
              title="Clear"
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

      {open && (
        <div className={styles.popup}>
          <div className={styles.searchRow}>
            <Search size={14} className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles..."
              autoComplete="off"
            />
            {loading && <span className={styles.spinner} />}
          </div>

          <div className={styles.resultList}>
            {results.length === 0 && !loading && (
              <div className={styles.empty}>
                {query ? `No results for "${query}"` : 'No roles found'}
              </div>
            )}
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.resultItem} ${item.id === value ? styles.active : ''}`}
                onClick={() => handleSelect(item)}
              >
                <div className={styles.resultInfo}>
                  <span className={styles.resultLabel}>{item.label}</span>
                  {item.sublabel && (
                    <span className={styles.resultSublabel}>
                      {item.sublabel}
                    </span>
                  )}
                </div>
                {item.id !== value && (
                  <span className={styles.resultId}>
                    {String(item.id).slice(-8)}
                  </span>
                )}
                {item.id === value && (
                  <span className={styles.resultCheck}>✓</span>
                )}
              </button>
            ))}
          </div>

          <div className={styles.popupFooter}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
