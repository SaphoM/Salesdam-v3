import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import styles from './Widget.module.css';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const SHORT_LABEL = (v) => {
  if (v == null) return '';
  const s = String(v);
  return s.length > 14 ? s.slice(0, 12) + '…' : s;
};

export default function ChartWidget({ type, config }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!config.objectApiName || !config.groupBy) { setLoading(false); return; }
    setLoading(true);
    api.post('/dashboards/widget-data', { type, config })
      .then(res => { setData(res.data.data); setError(null); })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, [type, JSON.stringify(config)]);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;
  if (error)   return <div className={styles.error}><AlertCircle size={16} /> {error}</div>;
  if (!config.objectApiName || !config.groupBy)
    return <div className={styles.unconfigured}>Configure this widget</div>;

  const results = data?.results || [];

  if (type === 'pie_chart') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={results} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="70%" label={({ label }) => SHORT_LABEL(label)}>
            {results.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Legend formatter={SHORT_LABEL} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const ChartComp   = type === 'line_chart' ? LineChart : BarChart;
  const SeriesComp  = type === 'line_chart' ? Line     : Bar;
  const seriesProps = type === 'line_chart'
    ? { type: 'monotone', stroke: COLORS[0], strokeWidth: 2, dot: false }
    : { fill: COLORS[0] };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComp data={results} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickFormatter={SHORT_LABEL} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
        <Tooltip formatter={(v) => v.toLocaleString()} />
        <SeriesComp dataKey="value" {...seriesProps} />
      </ChartComp>
    </ResponsiveContainer>
  );
}
