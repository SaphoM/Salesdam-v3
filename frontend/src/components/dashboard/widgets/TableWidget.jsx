import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import styles from './Widget.module.css';

function fmt(v) {
  if (v == null) return '—';
  if (v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v))) {
    return new Date(v).toLocaleDateString();
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

export default function TableWidget({ config }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!config.objectApiName) { setLoading(false); return; }
    setLoading(true);
    api.post('/dashboards/widget-data', { type: 'table', config })
      .then(res => { setData(res.data.data); setError(null); })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, [JSON.stringify(config)]);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;
  if (error)   return <div className={styles.error}><AlertCircle size={16} /> {error}</div>;
  if (!config.objectApiName) return <div className={styles.unconfigured}>Configure this widget</div>;

  const cols = config.columns || [];
  const rows = data?.rows || [];

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {cols.map(col => (
              <th key={col} className={styles.th}>
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td className={styles.empty} colSpan={cols.length}>No records</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className={styles.tr}>
              {cols.map(col => (
                <td key={col} className={styles.td}>{fmt(row[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
