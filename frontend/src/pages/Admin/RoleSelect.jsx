/**
 * RoleSelect — a dropdown that fetches roles from /api/roles and renders them
 * as a select. Used wherever a role ObjectId needs to be chosen.
 */
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function RoleSelect({ value, onChange, className }) {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    api.get('/roles').then(r => setRoles(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <select
      style={{
        width: '100%', padding: '8px 12px',
        border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)',
        fontSize: 'var(--font-size-sm)', background: 'var(--color-gray-50)',
        color: 'var(--color-gray-800)',
      }}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      className={className}
    >
      <option value="">— No role assigned —</option>
      {roles.map(r => (
        <option key={r._id} value={r._id}>{r.label} ({r.name})</option>
      ))}
    </select>
  );
}
