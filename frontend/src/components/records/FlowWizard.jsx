/**
 * FlowWizard
 *
 * Renders a screen_flow one screen at a time with Next/Previous/Submit
 * navigation. Calls POST /automations/:id/run-action to start, then
 * POST /automations/:id/run-action/resume for each subsequent screen.
 *
 * Props:
 *   automationId  — Automation._id
 *   record        — flat record object (may be null)
 *   fields        — FieldMeta array for this object
 *   objectApiName — string
 *   onDone        — called when flow completes { toasts, updatedCount, createdCount }
 *   onClose       — called when user dismisses mid-flow
 */
import React, { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LookupInput from '../forms/LookupInput/LookupInput';
import { useAuth } from '../../hooks/useAuth';
import styles from './FlowWizard.module.css';

// ─── Field renderer ────────────────────────────────────────────────────────────
function FlowField({ comp, value, onChange, fields, hasError }) {
  const cfg = comp.config || {};
  const meta = fields?.find(
    (f) => f.apiName === (comp.apiName || comp.config?.fieldApiName),
  );

  const baseProps = {
    id: comp.id,
    className: `${styles.input}${hasError ? ` ${styles.inputError}` : ''}`,
    value: value ?? '',
    onChange: (e) => onChange(e.target.value),
    placeholder: cfg.placeholder || '',
    required: !!cfg.required,
  };

  switch (comp.type) {
    case 'text_input':
      return <input type="text" {...baseProps} />;

    case 'email_input':
      return <input type="email" {...baseProps} />;

    case 'phone_input':
      return <input type="tel" {...baseProps} />;

    case 'password_input':
      return <input type="password" {...baseProps} />;

    case 'number_input':
      return (
        <input
          type="number"
          {...baseProps}
          min={cfg.min}
          max={cfg.max}
          onChange={(e) =>
            onChange(e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      );

    case 'text_area':
      return (
        <textarea
          className={`${styles.textarea}${hasError ? ` ${styles.inputError}` : ''}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={cfg.placeholder || ''}
          rows={4}
          required={!!cfg.required}
        />
      );

    case 'checkbox':
      return (
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className={styles.checkboxInput}
          />
          <span>{cfg.checkboxLabel || comp.label}</span>
        </label>
      );

    case 'picklist': {
      const options = cfg.options || meta?.picklistValues || [];
      return (
        <select
          className={`${styles.select}${hasError ? ` ${styles.inputError}` : ''}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={!!cfg.required}
        >
          <option value="">— Select —</option>
          {options.map((o, i) => (
            <option key={i} value={o.value ?? o}>
              {o.label ?? o}
            </option>
          ))}
        </select>
      );
    }

    case 'multi_picklist': {
      const options = cfg.options || meta?.picklistValues || [];
      const selected = Array.isArray(value) ? value : value ? [value] : [];
      const toggle = (v) => {
        const next = selected.includes(v)
          ? selected.filter((x) => x !== v)
          : [...selected, v];
        onChange(next);
      };
      return (
        <div className={styles.multiPicklist}>
          {options.map((o, i) => {
            const v = o.value ?? o;
            return (
              <label key={i} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selected.includes(v)}
                  onChange={() => toggle(v)}
                  className={styles.checkboxInput}
                />
                <span>{o.label ?? o}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case 'radio_group': {
      const options = cfg.options || [];
      return (
        <div className={styles.radioGroup}>
          {options.map((o, i) => {
            const v = o.value ?? o;
            return (
              <label key={i} className={styles.radioLabel}>
                <input
                  type="radio"
                  name={comp.id}
                  value={v}
                  checked={value === v}
                  onChange={() => onChange(v)}
                  className={styles.radioInput}
                />
                <span>{o.label ?? o}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case 'checkbox_group': {
      const options = cfg.options || [];
      const selected = Array.isArray(value) ? value : [];
      const toggle = (v) => {
        const next = selected.includes(v)
          ? selected.filter((x) => x !== v)
          : [...selected, v];
        onChange(next);
      };
      return (
        <div className={styles.checkboxGroup}>
          {options.map((o, i) => {
            const v = o.value ?? o;
            return (
              <label key={i} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selected.includes(v)}
                  onChange={() => toggle(v)}
                  className={styles.checkboxInput}
                />
                <span>{o.label ?? o}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case 'date_picker':
      return <input type="date" {...baseProps} />;

    case 'datetime_picker':
      return <input type="datetime-local" {...baseProps} />;

    case 'time_picker':
      return <input type="time" {...baseProps} />;

    case 'slider':
      return (
        <div className={styles.sliderWrap}>
          <input
            type="range"
            className={styles.slider}
            value={value ?? cfg.min ?? 0}
            min={cfg.min ?? 0}
            max={cfg.max ?? 100}
            step={cfg.step ?? 1}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className={styles.sliderVal}>{value ?? cfg.min ?? 0}</span>
        </div>
      );

    case 'toggle_switch':
      return (
        <label className={styles.toggleLabel}>
          <span
            className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
            onClick={() => onChange(!value)}
          >
            <span className={styles.toggleThumb} />
          </span>
          <span>{value ? 'On' : 'Off'}</span>
        </label>
      );

    case 'lookup_field':
      return (
        <LookupInput
          value={value || ''}
          displayValue={undefined}
          onChange={(id, label) => onChange(id)}
          objectApiName={
            cfg.objectApiName ||
            cfg.lookupObjectApiName ||
            meta?.lookupObjectApiName ||
            ''
          }
          displayField={cfg.displayField || meta?.lookupDisplayField || 'name'}
          placeholder={cfg.placeholder || 'Search...'}
        />
      );

    default:
      return null;
  }
}

// ─── Display-only component renderer ──────────────────────────────────────────
function DisplayComp({ comp, record, formData, user }) {
  const cfg = comp.config || {};
  const userFlat = user
    ? {
        _id: String(user._id || ''),
        id: String(user._id || ''),
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
        email: user.email || '',
        systemRole: user.systemRole || '',
      }
    : {};
  const interp = (s) => {
    if (!s) return '';
    return String(s).replace(/\{(\$?[\w.]+)\}/g, (_, k) => {
      if (k.startsWith('record.')) return String(record?.[k.slice(7)] ?? '');
      if (k.startsWith('user.')) return String(userFlat[k.slice(5)] ?? '');
      if (k.startsWith('$User.')) return String(userFlat[k.slice(6)] ?? '');
      return String(formData?.[k] ?? record?.[k] ?? '');
    });
  };

  switch (comp.type) {
    case 'display_text':
      return (
        <p className={styles.displayText}>
          {interp(cfg.content || cfg.text || '')}
        </p>
      );
    case 'rich_text':
      return (
        <div
          className={styles.richText}
          dangerouslySetInnerHTML={{ __html: interp(cfg.content || '') }}
        />
      );
    case 'section_header':
      return (
        <h4 className={styles.sectionHeader}>{cfg.label || comp.label}</h4>
      );
    case 'image':
      return cfg.src ? (
        <img src={cfg.src} alt={cfg.alt || ''} className={styles.image} />
      ) : null;
    case 'spacer':
      return <div style={{ height: cfg.height || 24 }} />;
    default:
      return null;
  }
}

const INPUT_TYPES = new Set([
  'text_input',
  'text_area',
  'number_input',
  'email_input',
  'phone_input',
  'password_input',
  'checkbox',
  'checkbox_group',
  'radio_group',
  'picklist',
  'multi_picklist',
  'date_picker',
  'datetime_picker',
  'time_picker',
  'slider',
  'toggle_switch',
  'lookup_field',
]);

const NAV_TYPES = new Set(['next_button', 'prev_button', 'submit_button']);

// Renders a single component — handles columns recursively
function RenderComp({
  comp,
  formData,
  onChange,
  record,
  fields,
  user,
  fieldErrors = {},
}) {
  if (NAV_TYPES.has(comp.type)) return null;

  const cfg = comp.config || {};

  if (comp.type === 'columns') {
    const numCols = cfg.numCols || 2;
    const colArrays = cfg.columns || Array.from({ length: numCols }, () => []);
    return (
      <div>
        {comp.label && <h4 className={styles.columnsLabel}>{comp.label}</h4>}
        <div
          className={styles.columnsRow}
          style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}
        >
          {Array.from({ length: numCols }, (_, ci) => (
            <div key={ci} className={styles.columnCell}>
              {(colArrays[ci] || []).map((sub) => (
                <RenderComp
                  key={sub.id}
                  comp={sub}
                  formData={formData}
                  onChange={onChange}
                  record={record}
                  fields={fields}
                  user={user}
                  fieldErrors={fieldErrors}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (INPUT_TYPES.has(comp.type)) {
    const apiName = comp.apiName || cfg.apiName;
    const errMsg = apiName ? fieldErrors[apiName] : undefined;
    return (
      <div className={styles.fieldWrap}>
        {comp.label && (
          <label className={styles.fieldLabel} htmlFor={comp.id}>
            {comp.label}
            {cfg.required && <span className={styles.required}>*</span>}
          </label>
        )}
        <FlowField
          comp={comp}
          value={apiName ? formData[apiName] : undefined}
          onChange={(v) => {
            if (apiName) {
              onChange(apiName, v);
            }
          }}
          fields={fields}
          hasError={!!errMsg}
        />
        {errMsg && <span className={styles.fieldError}>{errMsg}</span>}
        {!errMsg && cfg.helpText && (
          <span className={styles.helpText}>{cfg.helpText}</span>
        )}
      </div>
    );
  }

  return (
    <DisplayComp comp={comp} record={record} formData={formData} user={user} />
  );
}

// ─── Single screen renderer ────────────────────────────────────────────────────
function ScreenForm({
  screen,
  formData,
  onChange,
  record,
  fields,
  user,
  fieldErrors = {},
}) {
  const components = [...(screen.components || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  return (
    <div className={styles.screenForm}>
      {screen.title && screen.showTitle !== false && (
        <h3 className={styles.screenTitle}>{screen.title}</h3>
      )}
      <div className={styles.grid}>
        {components.map((comp) => {
          if (NAV_TYPES.has(comp.type)) return null;
          const span =
            comp.type === 'columns'
              ? 12
              : Math.min(12, Math.max(1, parseInt(comp.cols) || 12));
          return (
            <div key={comp.id} style={{ gridColumn: `span ${span}` }}>
              <RenderComp
                comp={comp}
                formData={formData}
                onChange={onChange}
                record={record}
                fields={fields}
                user={user}
                fieldErrors={fieldErrors}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Footer buttons ────────────────────────────────────────────────────────────
function FooterButtons({
  screen,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onSubmit,
  submitting,
}) {
  const components = screen.components || [];

  // Find custom button configs from the screen
  const nextBtn = components.find((c) => c.type === 'next_button');
  const prevBtn = components.find((c) => c.type === 'prev_button');
  const submitBtn = components.find((c) => c.type === 'submit_button');

  const nextLabel = nextBtn?.config?.buttonLabel || nextBtn?.label || 'Next';
  const prevLabel =
    prevBtn?.config?.buttonLabel || prevBtn?.label || 'Previous';
  const submitLabel =
    submitBtn?.config?.buttonLabel || submitBtn?.label || 'Submit';

  return (
    <div className={styles.footer}>
      <div className={styles.footerLeft}>
        {!isFirst && (
          <button
            className={styles.btnSecondary}
            onClick={onPrev}
            disabled={submitting}
          >
            <ChevronLeft size={14} /> {prevLabel}
          </button>
        )}
      </div>
      <div className={styles.footerRight}>
        {isLast ? (
          <button
            className={styles.btnPrimary}
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader size={14} className={styles.spin} />
            ) : (
              <Check size={14} />
            )}
            {submitLabel}
          </button>
        ) : (
          <button
            className={styles.btnPrimary}
            onClick={onNext}
            disabled={submitting}
          >
            {nextLabel} <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// Extract default values from screen components into a formData seed (recurses into columns)
function seedDefaults(screen) {
  const defaults = {};
  const collect = (comps) => {
    (comps || []).forEach((comp) => {
      if (comp.type === 'columns') {
        (comp.config?.columns || []).forEach((col) => collect(col));
        return;
      }
      const apiName = comp.apiName || comp.config?.apiName;
      const defaultVal = comp.config?.defaultValue;
      if (apiName && defaultVal !== undefined && defaultVal !== '') {
        defaults[apiName] = defaultVal;
      }
    });
  };
  collect(screen.components);
  return defaults;
}

// Collect all required input fields from a screen (recurses into columns)
function collectRequired(screen) {
  const required = []; // [{ apiName, label }]
  const collect = (comps) => {
    (comps || []).forEach((comp) => {
      if (comp.type === 'columns') {
        (comp.config?.columns || []).forEach((col) => collect(col));
        return;
      }
      if (!INPUT_TYPES.has(comp.type)) return;
      if (!comp.config?.required) return;
      const apiName = comp.apiName || comp.config?.apiName;
      if (apiName) required.push({ apiName, label: comp.label || apiName });
    });
  };
  collect(screen.components);
  return required;
}

// Returns { [apiName]: errorMessage } for any required fields that are empty
function validateScreen(screen, formData) {
  const errors = {};
  collectRequired(screen).forEach(({ apiName, label }) => {
    const val = formData[apiName];
    const empty =
      val === undefined ||
      val === null ||
      val === '' ||
      (Array.isArray(val) && val.length === 0);
    if (empty) errors[apiName] = `${label} is required`;
  });
  return errors;
}

// ─── Navigate helper ───────────────────────────────────────────────────────────
function buildNavPath(nav) {
  if (!nav?.objectApiName) return null;
  if (nav.targetType === 'record_detail' && nav.recordId) {
    return `/o/${nav.objectApiName}/${nav.recordId}`;
  }
  return `/o/${nav.objectApiName}`;
}

// ─── Main FlowWizard ───────────────────────────────────────────────────────────
export default function FlowWizard({
  automationId,
  record,
  fields = [],
  objectApiName,
  onDone,
  onClose,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  // history = [{ screen, resumeNodeId, ctx }]
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null); // { screen, resumeNodeId, ctx }
  const [formData, setFormData] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);

  const start = useCallback(async () => {
    setStarting(true);
    try {
      const res = await api.post(`/automations/${automationId}/run-action`, {
        recordId: record?._id || record?.id || null,
        objectApiName,
        contextData: record || {},
      });
      const data = res.data.data;
      if (data.status === 'screen') {
        setCurrent({
          screen: data.screen,
          resumeNodeId: data.resumeNodeId,
          ctx: data.ctx || {},
        });
        setStarted(true);
        setFormData(seedDefaults(data.screen));
      } else if (data.status === 'navigate') {
        (data.toasts || []).forEach((t) =>
          (toast[t.type] || toast.success)(t.message),
        );
        onDone?.(data);
        const path = buildNavPath(data.navigate);
        if (path) navigate(path);
      } else {
        // No screens — flow completed immediately
        (data.toasts || []).forEach((t) =>
          (toast[t.type] || toast.success)(t.message),
        );
        onDone?.(data);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to start flow',
      );
    } finally {
      setStarting(false);
    }
  }, [automationId, record, objectApiName, onDone]);

  // Auto-start the flow as soon as the wizard mounts
  useEffect(() => {
    start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldChange = (apiName, value) => {
    setFormData((prev) => ({ ...prev, [apiName]: value }));
    // Clear the error for this field as soon as the user edits it
    if (fieldErrors[apiName]) {
      setFieldErrors((prev) => {
        const n = { ...prev };
        delete n[apiName];
        return n;
      });
    }
  };

  const handleNext = async () => {
    if (!current) return;
    // Validate required fields before proceeding
    const errs = validateScreen(current.screen, formData);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await api.post(
        `/automations/${automationId}/run-action/resume`,
        {
          resumeNodeId: current.resumeNodeId,
          formData,
          ctx: current.ctx,
          recordId: record?._id || record?.id || null,
          objectApiName,
          contextData: record || {},
        },
      );
      const data = res.data.data;
      if (data.status === 'screen') {
        setHistory((h) => [...h, current]);
        setCurrent({
          screen: data.screen,
          resumeNodeId: data.resumeNodeId,
          ctx: data.ctx || {},
        });
        setFormData(seedDefaults(data.screen));
        setFieldErrors({});
      } else if (data.status === 'navigate') {
        (data.toasts || []).forEach((t) =>
          (toast[t.type] || toast.success)(t.message),
        );
        onDone?.(data);
        const path = buildNavPath(data.navigate);
        if (path) navigate(path);
      } else {
        // Flow complete
        (data.toasts || []).forEach((t) =>
          (toast[t.type] || toast.success)(t.message),
        );
        if (data.updatedCount)
          toast.success(
            `${data.updatedCount} record${data.updatedCount > 1 ? 's' : ''} updated.`,
          );
        if (data.createdCount)
          toast.success(
            `${data.createdCount} record${data.createdCount > 1 ? 's' : ''} created.`,
          );
        (data.errors || []).forEach((e) => toast.error(e));
        onDone?.(data);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to proceed',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrev = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCurrent(prev);
    setFormData({});
    setFieldErrors({});
  };

  if (!started) {
    return (
      <div className={styles.startWrap}>
        <Loader size={20} className={styles.spin} />
      </div>
    );
  }

  if (!current) return null;

  const isFirst = history.length === 0;
  const isLast = !current.resumeNodeId;

  return (
    <div className={styles.wizard}>
      <ScreenForm
        screen={current.screen}
        formData={formData}
        onChange={handleFieldChange}
        record={record}
        fields={fields}
        user={user}
        fieldErrors={fieldErrors}
      />
      <FooterButtons
        screen={current.screen}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={handlePrev}
        onNext={handleNext}
        onSubmit={handleNext}
        submitting={submitting}
      />
    </div>
  );
}
