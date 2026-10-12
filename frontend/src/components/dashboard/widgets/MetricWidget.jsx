import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import useCurrency from '../../../hooks/useCurrency';
import styles from './Widget.module.css';

export default function MetricWidget({ config, title }) {
  const { symbol } = useCurrency();

  const formatValue = (value) => {
    if (value == null) return '—';
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    if (config.format === 'currency') {
      return (
        (config.prefix || symbol) +
        num.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      );
    }
    if (config.format === 'percent') {
      return num.toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%';
    }
    return (
      (config.prefix || '') +
      num.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
      (config.suffix || '')
    );
  };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!config?.objectApiName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .post('/dashboards/widget-data', { type: 'metric', config })
      .then((res) => {
        setData(res.data.data);
        setError(null);
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, [JSON.stringify(config)]);

  if (loading)
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  if (error)
    return (
      <div className={styles.error}>
        <AlertCircle size={16} /> {error}
      </div>
    );
  if (!config?.objectApiName)
    return <div className={styles.unconfigured}>Configure this widget</div>;

  const value = data?.value ?? 0;
  const trend = data?.trend;

  return (
    <div className={styles.metric}>
      <div className={styles.metricValue}>{formatValue(value, config)}</div>
      {config?.label && (
        <div className={styles.metricLabel}>{config?.label}</div>
      )}
      {trend != null && (
        <div
          className={`${styles.metricTrend} ${trend > 0 ? styles.up : trend < 0 ? styles.down : styles.flat}`}
        >
          {trend > 0 ? (
            <TrendingUp size={14} />
          ) : trend < 0 ? (
            <TrendingDown size={14} />
          ) : (
            <Minus size={14} />
          )}
          <span>{Math.abs(trend).toFixed(1)}% vs last period</span>
        </div>
      )}
    </div>
  );
}
