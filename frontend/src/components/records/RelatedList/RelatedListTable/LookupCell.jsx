import { useState, useEffect } from 'react';
import api from '../../../../services/api';

// Lookup cache shared across instances
const _lookupCache = new Map();

const resolveLookupLabel = (objectApiName, id, displayField = 'name') => {
  if (!id) return Promise.resolve('—');
  const key = `${objectApiName}:${id}`;
  if (_lookupCache.has(key)) return _lookupCache.get(key);

  const promise = (async () => {
    try {
      if (objectApiName === 'user') {
        const res = await api.get(`/users/${id}/public-profile`);
        const u = res.data.data;
        return `${u.firstName} ${u.lastName}`;
      } else {
        const res = await api.get(`/records/${objectApiName}/${id}`);
        const rec = res.data.data;
        return (
          rec[displayField] ||
          (rec.first_name
            ? `${rec.first_name || ''} ${rec.last_name || ''}`.trim()
            : null) ||
          rec.name ||
          String(id).slice(-8)
        );
      }
    } catch {
      return String(id).slice(-8);
    }
  })();

  _lookupCache.set(key, promise);
  return promise;
};

const LookupCell = ({ field, value }) => {
  const [label, setLabel] = useState(null);

  useEffect(() => {
    if (!value || !field.lookupObjectApiName) {
      setLabel('—');
      return;
    }
    let cancelled = false;
    resolveLookupLabel(
      field.lookupObjectApiName,
      value,
      field.lookupDisplayField || 'name',
    ).then((l) => {
      if (!cancelled) setLabel(l);
    });
    return () => {
      cancelled = true;
    };
  }, [value, field.lookupObjectApiName, field.lookupDisplayField]);

  if (!value) return '—';
  if (label === null)
    return (
      <span style={{ color: 'var(--color-gray-400)', fontStyle: 'italic' }}>
        …
      </span>
    );
  return <span>{label}</span>;
};

export default LookupCell;
