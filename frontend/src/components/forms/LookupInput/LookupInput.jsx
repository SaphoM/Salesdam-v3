import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  ExternalLink,
  ChevronDown,
  Plus,
  Loader,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { extractServerErrors } from '../../../utils/serverErrors';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import QuickCreateForm from './QuickCreateForm/QuickCreateForm';
import styles from './LookupInput.module.css';

/**
 * LookupInput — searchable popup for relationship fields.
 * Shows a modal-like dropdown with live search against the target object.
 */
export default function LookupInput({
  value, // current record ID
  displayValue, // current display label (pre-fetched name)
  onChange, // (id, displayLabel) => void
  objectApiName, // target object to search
  displayField = 'name',
  placeholder = 'Search...',
  disabled,
  error,
  allowCreate, // show "+ New" button; defaults to true for non-user lookups
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState(displayValue || '');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Quick-create state
  const [creating, setCreating] = useState(false);
  const [createFields, setCreateFields] = useState([]); // FieldMeta for the form
  const [createData, setCreateData] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isUserLookup = objectApiName === 'user' || objectApiName === 'users';
  const canCreate = allowCreate !== false && !isUserLookup;

  // Fetch display label when value changes externally
  useEffect(() => {
    if (value && !displayValue && objectApiName) {
      if (isUserLookup) {
        api
          .get(`/users/${value}`)
          .then((res) => {
            const u = res.data.data;
            setLabel(`${u.firstName} ${u.lastName}`);
          })
          .catch(() => setLabel(String(value).slice(-8)));
      } else {
        api
          .get(`/records/${objectApiName}/${value}`)
          .then((res) => {
            const data = res.data.data;
            const name =
              data[displayField] ||
              (data.first_name
                ? `${data.first_name || ''} ${data.last_name || ''}`.trim()
                : null) ||
              data.name ||
              String(value).slice(-8);
            setLabel(name);
          })
          .catch(() => setLabel(String(value).slice(-8)));
      }
    } else if (!value) {
      setLabel('');
    }
  }, [value, displayValue, objectApiName, displayField, isUserLookup]);

  const search = useCallback(
    async (q) => {
      if (!objectApiName) return;
      setLoading(true);
      try {
        if (isUserLookup) {
          // Special case: search workspace users via /api/users
          const res = await api.get('/users', {
            params: { search: q || undefined, status: 'active', limit: 20 },
          });
          setResults(
            (res.data.data || []).map((u) => ({
              id: u._id,
              label: `${u.firstName} ${u.lastName}`,
              sublabel: u.email,
              record: u,
            })),
          );
        } else {
          const trimmed = q.trim();
          // When no query: list all records directly (no regex filter)
          // When typing: use suggest (regex on display field)
          if (!trimmed) {
            const res = await api.get(`/records/${objectApiName}`, {
              params: { limit: 20, sort: '-createdAt' },
            });
            setResults(
              (res.data.data || []).map((r) => {
                const label =
                  r[displayField] ||
                  (r.first_name
                    ? `${r.first_name || ''} ${r.last_name || ''}`.trim()
                    : null) ||
                  r.name ||
                  String(r.id || r._id).slice(-8);
                return { id: r.id || r._id, label };
              }),
            );
            return;
          }
          // Has query — use suggest (fast regex on display field)
          try {
            const res = await api.get('/search/suggest', {
              params: {
                q: trimmed,
                object: objectApiName,
                field: displayField,
                limit: 15,
              },
            });
            setResults(res.data.data || []);
          } catch {
            const res = await api.get(`/records/${objectApiName}`, {
              params: { limit: 20, search: trimmed || undefined },
            });
            setResults(
              (res.data.data || []).map((r) => ({
                id: r.id || r._id,
                label:
                  r[displayField] ||
                  (r.first_name
                    ? `${r.first_name || ''} ${r.last_name || ''}`.trim()
                    : null) ||
                  r.name ||
                  String(r.id || r._id).slice(-8),
              })),
            );
          }
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [objectApiName, displayField, isUserLookup],
  );

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, open, search]);

  const handleOpenCreate = async () => {
    setOpen(false); // close the search dropdown
    setCreating(true);
    setCreateData({});
    setCreateLoading(true);
    try {
      const res = await api.get(`/objects/${objectApiName}`);
      const fields = (res.data.data?.fields || [])
        .filter(
          (f) =>
            !f.isReadOnly &&
            !['formula', 'rollup_summary', 'auto_number'].includes(f.type),
        )
        .sort((a, b) => {
          // Sort by: required first, then by display order
          const aRequired = a.isRequired ? 0 : 1;
          const bRequired = b.isRequired ? 0 : 1;
          if (aRequired !== bRequired) return aRequired - bRequired;
          return (a.displayOrder ?? 99) - (b.displayOrder ?? 99);
        });
      setCreateFields(fields);
      const defaults = {};
      fields.forEach((f) => {
        if (f.defaultValue !== undefined && f.defaultValue !== null)
          defaults[f.apiName] = f.defaultValue;
      });
      setCreateData(defaults);
    } catch {
      setCreateFields([]);
    } finally {
      setCreateLoading(false);
    }
  };

  // Escape closes the create overlay
  useEffect(() => {
    if (!creating) return;
    const handler = (e) => {
      if (e.key === 'Escape') setCreating(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [creating]);

  const handleCreateFieldChange = (apiName, val) => {
    setCreateData((prev) => ({ ...prev, [apiName]: val }));
    setCreateErrors((prev) =>
      prev[apiName] ? { ...prev, [apiName]: '' } : prev,
    );
  };

  const handleCreateSave = async () => {
    setCreateSaving(true);
    setCreateErrors({});
    try {
      const res = await api.post(`/records/${objectApiName}`, createData);
      const record = res.data.data;
      const newLabel =
        record[displayField] ||
        (record.first_name
          ? `${record.first_name || ''} ${record.last_name || ''}`.trim()
          : null) ||
        record.name ||
        String(record.id || record._id).slice(-8);
      setLabel(newLabel);
      onChange(record.id || record._id, newLabel);
      setOpen(false);
      setCreating(false);
    } catch (err) {
      // Keep the overlay open and mark the offending inputs — a duplicate value
      // on a unique field is fixable in place, and a blocking alert() hid which
      // field was actually at fault.
      const { fieldErrors, message } = extractServerErrors(err, createFields);
      setCreateErrors(fieldErrors);
      toast.error(message);
    } finally {
      setCreateSaving(false);
    }
  };

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setCreating(false);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (item) => {
    const id = item.id;
    const record = item.record || item;

    setLabel(item.label);
    onChange(id, record);

    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setLabel('');
    onChange('', '');
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`${styles.wrapper} ${error ? styles.hasError : ''} ${disabled ? styles.disabled : ''}`}
      >
        {/* Trigger */}
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

        {/* Search dropdown */}
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
                placeholder={`Search ${objectApiName || 'records'}...`}
                autoComplete="off"
              />
              {loading && <span className={styles.spinner} />}
            </div>

            <div className={styles.resultList}>
              {results.length === 0 && !loading && (
                <div className={styles.empty}>
                  {query
                    ? `No results for "${query}"`
                    : `No ${objectApiName || 'records'} found`}
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
              {canCreate && (
                <button
                  type="button"
                  className={styles.createBtn}
                  onClick={handleOpenCreate}
                >
                  <Plus size={13} /> New {objectApiName}
                </button>
              )}
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

      {/* Create modal using Modal component */}
      <Modal
        isOpen={creating}
        onClose={() => setCreating(false)}
        title={`New ${objectApiName?.charAt(0).toUpperCase()}${objectApiName?.slice(1)}`}
        size="lg"
        footer={
          <div
            style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}
          >
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              icon={createSaving ? <Loader size={14} /> : <Plus size={14} />}
              onClick={handleCreateSave}
              disabled={createSaving || createLoading}
              loading={createSaving}
            >
              Create & select
            </Button>
          </div>
        }
      >
        <QuickCreateForm
          fields={createFields}
          createData={createData}
          errors={createErrors}
          onFieldChange={handleCreateFieldChange}
          isLoading={createLoading}
        />
      </Modal>
    </>
  );
}
