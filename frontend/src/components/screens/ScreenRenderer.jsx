import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import styles from './ScreenRenderer.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function resolve(path, record, sourceData) {
  if (!path) return '';
  // {sourceName.key.subKey} — pull from sourceData
  const srcMatch = path.match(/^\{(\w+)\.(.+)\}$/);
  if (srcMatch) {
    const [, src, key] = srcMatch;
    const obj = sourceData[src];
    if (!obj) return '';
    return key.split('.').reduce((o, k) => o?.[k], obj) ?? '';
  }
  // {fieldName} — pull from record
  const fieldMatch = path.match(/^\{(\w+)\}$/);
  if (fieldMatch) return record?.[fieldMatch[1]] ?? '';
  // Plain value with interpolation
  return path.replace(/\{(\w+)\}/g, (_, k) => record?.[k] ?? '');
}

// ─── Component renderers ──────────────────────────────────────────────────────
function RenderHeading({ config }) {
  return <h3 className={styles.heading}>{config.text}</h3>;
}

function RenderText({ config, record }) {
  const text = config.text?.replace(/\{(\w+)\}/g, (_, k) => record?.[k] ?? '') ?? '';
  return <p className={styles.text}>{text}</p>;
}

function RenderFieldValue({ config, record, fields }) {
  const meta  = fields.find(f => f.apiName === config.field);
  const value = record?.[config.field];
  const label = config.label || meta?.label || config.field;
  return (
    <div className={styles.fieldValue}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldVal}>{value == null ? '—' : String(value)}</span>
    </div>
  );
}

function RenderMetric({ config, record, sourceData }) {
  const value = resolve(config.valuePath, record, sourceData);
  return (
    <div className={styles.metric}>
      <span className={styles.metricVal}>{value ?? '—'}</span>
      {config.label && <span className={styles.metricLabel}>{config.label}</span>}
    </div>
  );
}

function RenderDataTable({ config, sourceData }) {
  const rows    = sourceData[config.source];
  const columns = (config.columns || '').split(',').map(c => c.trim()).filter(Boolean);
  if (!Array.isArray(rows)) return <p className={styles.noData}>No data from source "{config.source}"</p>;
  if (!columns.length) return null;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{columns.map(c => <th key={c} className={styles.th}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td className={styles.empty} colSpan={columns.length}>No records</td></tr>}
          {rows.map((row, i) => (
            <tr key={i} className={styles.tr}>
              {columns.map(c => <td key={c} className={styles.td}>{row[c] != null ? String(row[c]) : '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RenderFieldList({ config, record, fields }) {
  const keys = (config.fields || '').split(',').map(k => k.trim()).filter(Boolean);
  return (
    <div className={styles.fieldList}>
      {keys.map(k => {
        const meta = fields.find(f => f.apiName === k);
        return (
          <div key={k} className={styles.fieldValue}>
            <span className={styles.fieldLabel}>{meta?.label || k}</span>
            <span className={styles.fieldVal}>{record?.[k] != null ? String(record[k]) : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

function RenderBadge({ config, record, fields }) {
  const value = record?.[config.field];
  const meta  = fields.find(f => f.apiName === config.field);
  const pv    = meta?.picklistValues?.find(p => p.value === value);
  const label = config.label || meta?.label || config.field;
  return (
    <div className={styles.fieldValue}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.badge} style={pv?.color ? { background: `${pv.color}20`, color: pv.color } : {}}>
        {pv?.label || value || '—'}
      </span>
    </div>
  );
}

// ─── ScreenRenderer ───────────────────────────────────────────────────────────
/**
 * Props:
 *   screenId  — ID of the CustomScreen to load and render
 *   record    — flat record data object
 *   fields    — array of FieldMeta for this object
 */
export default function ScreenRenderer({ screenId, record, fields }) {
  const [screen, setScreen]         = useState(null);
  const [sourceData, setSourceData] = useState({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (!screenId) return;
    api.get(`/custom-screens/${screenId}`)
      .then(r => setScreen(r.data.data))
      .catch(() => setError('Failed to load screen'))
      .finally(() => setLoading(false));
  }, [screenId]);

  // Fetch data sources once screen is loaded
  useEffect(() => {
    if (!screen || !screen.dataSources?.length) return;
    api.post(`/custom-screens/${screenId}/fetch-data`, { recordData: { ...record, recordId: record._id || record.id } })
      .then(r => setSourceData(r.data.data || {}))
      .catch(() => {});
  }, [screen, screenId, record]);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;
  if (error)   return <div className={styles.error}><AlertCircle size={16} /> {error}</div>;
  if (!screen) return null;

  const sorted = [...(screen.components || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className={styles.screen}>
      {screen.dataSources?.length > 0 && error && (
        <div className={styles.srcError}><AlertCircle size={14} /> Some data sources failed to load</div>
      )}
      <div className={styles.grid}>
        {sorted.map(comp => {
          const span = comp.cols || 12;
          return (
            <div key={comp.id} className={styles.comp} style={{ gridColumn: `span ${span}` }}>
              {comp.type === 'heading'    && <RenderHeading config={comp.config} />}
              {comp.type === 'text'       && <RenderText    config={comp.config} record={record} />}
              {comp.type === 'separator'  && <hr className={styles.separator} />}
              {comp.type === 'field_value'&& <RenderFieldValue config={comp.config} record={record} fields={fields} />}
              {comp.type === 'metric'     && <RenderMetric  config={comp.config} record={record} sourceData={sourceData} />}
              {comp.type === 'data_table' && <RenderDataTable config={comp.config} sourceData={sourceData} />}
              {comp.type === 'field_list' && <RenderFieldList config={comp.config} record={record} fields={fields} />}
              {comp.type === 'badge'      && <RenderBadge   config={comp.config} record={record} fields={fields} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
