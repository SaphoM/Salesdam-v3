import styles from './ValidationBuilder.module.css';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';

// ─── Config: which validation options each type supports ─────────────────────
const TYPE_CONFIG = {
  text: {
    sections: ['common', 'text'],
  },
  textarea: {
    sections: ['common', 'text'],
  },
  richtext: {
    sections: ['common', 'text'],
  },
  number: {
    sections: ['common', 'number'],
  },
  currency: {
    sections: ['common', 'number'],
  },
  percent: {
    sections: ['common', 'number'],
  },
  date: {
    sections: ['commonRequired', 'date'],
  },
  datetime: {
    sections: ['commonRequired', 'date'],
  },
  boolean: {
    sections: ['boolean'],
  },
  picklist: {
    sections: ['commonRequired', 'picklist'],
  },
  multipicklist: {
    sections: ['commonRequired', 'multipicklist'],
  },
  email: {
    sections: ['common', 'email'],
  },
  phone: {
    sections: ['common', 'phone'],
  },
  url: {
    sections: ['common', 'url'],
  },
  lookup: {
    sections: ['commonRequired', 'lookup'],
  },
  master_detail: {
    sections: ['commonRequired', 'lookup'],
  },
};

// ─── Tiny primitives ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label className={styles.toggle}>
      <span className={styles.toggleTrack} data-on={checked}>
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.toggleThumb} />
      </span>
      {label && <span className={styles.toggleLabel}>{label}</span>}
    </label>
  );
}

function NumInput({ value, onChange, placeholder, min, max, step = 1 }) {
  return (
    <input
      type="number"
      className={styles.numInput}
      value={value ?? ''}
      onChange={(e) =>
        onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))
      }
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
    />
  );
}

function TextInput({ value, onChange, placeholder, mono }) {
  return (
    <input
      type="text"
      className={[styles.textInput, mono ? styles.mono : '']
        .filter(Boolean)
        .join(' ')}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      placeholder={placeholder}
    />
  );
}

function TagList({ values = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
    }
    setDraft('');
  };
  return (
    <div className={styles.tagList}>
      <div className={styles.tags}>
        {values.map((v) => (
          <span key={v} className={styles.tag}>
            {v}
            <button
              type="button"
              className={styles.tagRemove}
              onClick={() => onChange(values.filter((x) => x !== v))}
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className={styles.tagInput}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder || 'Type and press Enter'}
          className={styles.textInput}
        />
        <button type="button" className={styles.tagAdd} onClick={add}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowMeta}>
        <span className={styles.rowLabel}>{label}</span>
        {hint && <span className={styles.rowHint}>{hint}</span>}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}

// ─── Section renderers ────────────────────────────────────────────────────────
function CommonSection({ v, set }) {
  return (
    <>
      <Row label="Required" hint="Field must have a value">
        <Toggle
          checked={v.required}
          onChange={(val) => set('required', val || undefined)}
        />
      </Row>
      <Row label="Unique" hint="No two records can share this value">
        <Toggle
          checked={v.unique}
          onChange={(val) => set('unique', val || undefined)}
        />
      </Row>
    </>
  );
}

function CommonRequiredSection({ v, set }) {
  return (
    <Row label="Required" hint="Field must have a value">
      <Toggle
        checked={v.required}
        onChange={(val) => set('required', val || undefined)}
      />
    </Row>
  );
}

function TextSection({ v, set }) {
  return (
    <>
      <Row label="Min length" hint="Minimum character count">
        <NumInput
          value={v.minLength}
          onChange={(val) => set('minLength', val)}
          placeholder="e.g. 3"
          min={0}
        />
      </Row>
      <Row label="Max length" hint="Maximum character count">
        <NumInput
          value={v.maxLength}
          onChange={(val) => set('maxLength', val)}
          placeholder="e.g. 255"
          min={1}
        />
      </Row>
      <Row label="Regex pattern" hint="Must match this pattern">
        <TextInput
          value={v.regex}
          onChange={(val) => set('regex', val)}
          placeholder="^[A-Z].*"
          mono
        />
      </Row>
      {v.regex && (
        <Row label="Regex error message">
          <TextInput
            value={v.regexMessage}
            onChange={(val) => set('regexMessage', val)}
            placeholder="Enter a valid value"
          />
        </Row>
      )}
      <Row label="Auto-trim" hint="Strip leading/trailing whitespace">
        <Toggle
          checked={v.trim}
          onChange={(val) => set('trim', val || undefined)}
        />
      </Row>
    </>
  );
}

function NumberSection({ v, set }) {
  return (
    <>
      <Row label="Minimum" hint="Smallest allowed value">
        <NumInput
          value={v.min}
          onChange={(val) => set('min', val)}
          placeholder="e.g. 0"
          step="any"
        />
      </Row>
      <Row label="Maximum" hint="Largest allowed value">
        <NumInput
          value={v.max}
          onChange={(val) => set('max', val)}
          placeholder="e.g. 100000"
          step="any"
        />
      </Row>
      <Row label="Decimal places" hint="Max number of decimal digits">
        <NumInput
          value={v.precision}
          onChange={(val) => set('precision', val)}
          placeholder="e.g. 2"
          min={0}
          max={18}
        />
      </Row>
      <Row label="Positive only" hint="Value must be greater than 0">
        <Toggle
          checked={v.positiveOnly}
          onChange={(val) => set('positiveOnly', val || undefined)}
        />
      </Row>
      <Row label="Allow negative" hint="Permit values below zero">
        <Toggle
          checked={v.allowNegative !== false}
          onChange={(val) => set('allowNegative', val ? undefined : false)}
        />
      </Row>
    </>
  );
}

function DateSection({ v, set }) {
  return (
    <>
      <Row label="Min date">
        <input
          type="date"
          className={styles.textInput}
          value={
            v.minDate ? new Date(v.minDate).toISOString().split('T')[0] : ''
          }
          onChange={(e) => set('minDate', e.target.value || undefined)}
        />
      </Row>
      <Row label="Max date">
        <input
          type="date"
          className={styles.textInput}
          value={
            v.maxDate ? new Date(v.maxDate).toISOString().split('T')[0] : ''
          }
          onChange={(e) => set('maxDate', e.target.value || undefined)}
        />
      </Row>
      <Row label="Disable past" hint="Only current and future dates">
        <Toggle
          checked={v.disablePast}
          onChange={(val) => set('disablePast', val || undefined)}
        />
      </Row>
      <Row label="Disable future" hint="Only past and current dates">
        <Toggle
          checked={v.disableFuture}
          onChange={(val) => set('disableFuture', val || undefined)}
        />
      </Row>
    </>
  );
}

function BooleanSection({ v, set }) {
  return (
    <Row label="Required" hint="Checkbox must be explicitly checked">
      <Toggle
        checked={v.required}
        onChange={(val) => set('required', val || undefined)}
      />
    </Row>
  );
}

function PicklistSection({ v, set }) {
  return (
    <Row
      label="Restrict to values"
      hint="If set, only these values are accepted (leave empty to allow all picklist values)"
    >
      <TagList
        values={v.allowedValues || []}
        onChange={(vals) =>
          set('allowedValues', vals.length ? vals : undefined)
        }
      />
    </Row>
  );
}

function MultipicklistSection({ v, set }) {
  return (
    <>
      <Row label="Min selections">
        <NumInput
          value={v.minSelections}
          onChange={(val) => set('minSelections', val)}
          placeholder="e.g. 1"
          min={0}
        />
      </Row>
      <Row label="Max selections">
        <NumInput
          value={v.maxSelections}
          onChange={(val) => set('maxSelections', val)}
          placeholder="e.g. 5"
          min={1}
        />
      </Row>
      <Row label="Restrict to values" hint="Only these values accepted">
        <TagList
          values={v.allowedValues || []}
          onChange={(vals) =>
            set('allowedValues', vals.length ? vals : undefined)
          }
        />
      </Row>
    </>
  );
}

function EmailSection({ v, set }) {
  return (
    <>
      <Row label="Domain whitelist" hint="Only these domains accepted">
        <TagList
          values={v.domainWhitelist || []}
          onChange={(vals) =>
            set('domainWhitelist', vals.length ? vals : undefined)
          }
          placeholder="e.g. company.com"
        />
      </Row>
      <Row label="Domain blacklist" hint="These domains are rejected">
        <TagList
          values={v.domainBlacklist || []}
          onChange={(vals) =>
            set('domainBlacklist', vals.length ? vals : undefined)
          }
          placeholder="e.g. tempmail.com"
        />
      </Row>
      <Row label="Regex pattern" hint="Additional format check">
        <TextInput
          value={v.regex}
          onChange={(val) => set('regex', val)}
          placeholder="custom regex"
          mono
        />
      </Row>
    </>
  );
}

function PhoneSection({ v, set }) {
  return (
    <>
      <Row label="Min digits" hint="After stripping non-numeric characters">
        <NumInput
          value={v.minLength}
          onChange={(val) => set('minLength', val)}
          placeholder="e.g. 7"
          min={1}
        />
      </Row>
      <Row label="Max digits">
        <NumInput
          value={v.maxLength}
          onChange={(val) => set('maxLength', val)}
          placeholder="e.g. 15"
          min={1}
        />
      </Row>
      <Row label="Regex pattern" hint="Full number format check">
        <TextInput
          value={v.regex}
          onChange={(val) => set('regex', val)}
          placeholder="^\+?[0-9\s\-\(\)]+$"
          mono
        />
      </Row>
      {v.regex && (
        <Row label="Regex error message">
          <TextInput
            value={v.regexMessage}
            onChange={(val) => set('regexMessage', val)}
            placeholder="Enter a valid phone number"
          />
        </Row>
      )}
    </>
  );
}

function UrlSection({ v, set }) {
  return (
    <>
      <Row label="Require HTTPS" hint="URL must start with https://">
        <Toggle
          checked={v.mustBeHttps}
          onChange={(val) => set('mustBeHttps', val || undefined)}
        />
      </Row>
      <Row label="Regex pattern">
        <TextInput
          value={v.regex}
          onChange={(val) => set('regex', val)}
          placeholder="custom regex"
          mono
        />
      </Row>
    </>
  );
}

function LookupSection({ v, set }) {
  return (
    <Row
      label="Cascade delete"
      hint="Delete related records when this record is deleted"
    >
      <Toggle
        checked={v.cascadeDelete}
        onChange={(val) => set('cascadeDelete', val || undefined)}
      />
    </Row>
  );
}

const SECTION_MAP = {
  common: CommonSection,
  commonRequired: CommonRequiredSection,
  text: TextSection,
  number: NumberSection,
  date: DateSection,
  boolean: BooleanSection,
  picklist: PicklistSection,
  multipicklist: MultipicklistSection,
  email: EmailSection,
  phone: PhoneSection,
  url: UrlSection,
  lookup: LookupSection,
};

// ─── ValidationBuilder ────────────────────────────────────────────────────────
/**
 * Props:
 *   field              FieldMeta object (needs .type, .label, .apiName)
 *   validations        Current validations config object
 *   formulaValidation  { expression, errorMessage }
 *   onChange           (validations) => void
 */
const ValidationBuilder = ({
  field,
  validations = {},
  formulaValidation = {},
  readOnly = false,
  onChange,
}) => {
  const set = (key, val) => {
    if (readOnly) return;
    const next = { ...validations };
    if (val === undefined || val === null || val === false) {
      delete next[key];
    } else {
      next[key] = val;
    }
    onChange(next);
  };

  const config = TYPE_CONFIG[field.type] || { sections: ['common'] };

  // `required` and `unique` have two homes: the structured `validations` object
  // and the authoritative top-level isRequired/isUnique columns on FieldMeta
  // (which the engine treats as an override). Seeded and system fields set only
  // the top-level flags, so reading `validations` alone showed these toggles as
  // off for every system field. Fall back to the flags for display.
  const v = {
    ...validations,
    required: validations.required ?? field.isRequired ?? undefined,
    unique: validations.unique ?? field.isUnique ?? undefined,
  };

  // Count active rules for badge
  const activeCount =
    Object.keys(v).filter(
      (k) =>
        v[k] !== undefined &&
        v[k] !== false &&
        (Array.isArray(v[k]) ? v[k].length > 0 : true),
    ).length + (formulaValidation.expression ? 1 : 0);

  return (
    <div className={styles.builder} data-readonly={readOnly || undefined}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>Validations</span>
        {activeCount > 0 && (
          <span className={styles.badge}>{activeCount} active</span>
        )}
        {readOnly && (
          <span className={styles.readOnlyNote}>
            Managed by the platform — read only
          </span>
        )}
      </div>

      {/* Type-specific sections */}
      <div className={styles.body}>
        {config.sections.map((sectionKey) => {
          const SectionComp = SECTION_MAP[sectionKey];
          if (!SectionComp) return null;
          return <SectionComp key={sectionKey} v={v} set={set} />;
        })}
      </div>
    </div>
  );
};

export default ValidationBuilder;
