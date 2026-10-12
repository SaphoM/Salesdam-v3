import React, { useState, useRef } from 'react';
import {
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Columns,
} from 'lucide-react';
import { Inp, Sel, Row, MergeInput, genId } from './shared.jsx';
import styles from './ScreenElement.module.css';

// ─── Palette definition ───────────────────────────────────────
const PALETTE = [
  {
    group: 'Input',
    color: '#0891b2',
    items: [
      { type: 'text_input', label: 'Text Input' },
      { type: 'text_area', label: 'Text Area' },
      { type: 'number_input', label: 'Number Input' },
      { type: 'email_input', label: 'Email Input' },
      { type: 'phone_input', label: 'Phone Input' },
      { type: 'password_input', label: 'Password Input' },
      { type: 'checkbox', label: 'Checkbox' },
      { type: 'checkbox_group', label: 'Checkbox Group' },
      { type: 'radio_group', label: 'Radio Buttons' },
      { type: 'picklist', label: 'Picklist' },
      { type: 'multi_picklist', label: 'Multi-Select Picklist' },
      { type: 'date_picker', label: 'Date Picker' },
      { type: 'datetime_picker', label: 'Date/Time Picker' },
      { type: 'time_picker', label: 'Time Picker' },
      { type: 'file_upload', label: 'File Upload' },
      { type: 'lookup_field', label: 'Lookup Field' },
    ],
  },
  {
    group: 'Display',
    color: '#7c3aed',
    items: [
      { type: 'display_text', label: 'Display Text' },
      { type: 'rich_text', label: 'Rich Text / HTML' },
      { type: 'image', label: 'Image' },
      { type: 'section_header', label: 'Section Header' },
      { type: 'record_display', label: 'Record Display' },
      { type: 'data_table', label: 'Data Table' },
    ],
  },
  {
    group: 'Navigation',
    color: '#059669',
    items: [
      { type: 'next_button', label: 'Next Button' },
      { type: 'prev_button', label: 'Previous Button' },
      { type: 'submit_button', label: 'Submit Button' },
    ],
  },
  {
    group: 'Layout',
    color: '#b45309',
    items: [
      { type: 'section', label: 'Section' },
      { type: 'columns', label: 'Columns' },
      { type: 'spacer', label: 'Spacer' },
    ],
  },
  {
    group: 'Advanced',
    color: '#db2777',
    items: [
      { type: 'address_field', label: 'Address Field' },
      { type: 'slider', label: 'Slider' },
      { type: 'toggle_switch', label: 'Toggle Switch' },
    ],
  },
];

// Flat lookups
const TYPE_COLOR = {};
const TYPE_LABEL = {};
PALETTE.forEach((g) =>
  g.items.forEach((it) => {
    TYPE_COLOR[it.type] = g.color;
    TYPE_LABEL[it.type] = it.label;
  }),
);

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
  'file_upload',
  'lookup_field',
  'address_field',
  'slider',
  'toggle_switch',
]);

const OPTIONS_TYPES = new Set([
  'checkbox_group',
  'radio_group',
  'picklist',
  'multi_picklist',
]);

// ─── Options editor ───────────────────────────────────────────
function OptionsEditor({ options = [], onChange }) {
  const add = () => onChange([...options, { label: '', value: '' }]);
  const upd = (i, k, v) =>
    onChange(options.map((o, idx) => (idx === i ? { ...o, [k]: v } : o)));
  const del = (i) => onChange(options.filter((_, idx) => idx !== i));
  return (
    <div>
      {options.map((opt, i) => (
        <div key={i} className={styles.optRow}>
          <Inp
            value={opt.label}
            onChange={(v) => upd(i, 'label', v)}
            placeholder="Label"
          />
          <Inp
            value={opt.value}
            onChange={(v) => upd(i, 'value', v)}
            placeholder="Value"
          />
          <button className={styles.iconBtn} onClick={() => del(i)}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button className={styles.addLink} onClick={add}>
        <Plus size={11} /> Add option
      </button>
    </div>
  );
}

// ─── Per-component config ─────────────────────────────────────
function ComponentConfig({
  comp,
  onChange,
  fields = [],
  objects = [],
  variables = [],
  outputVariables = [],
  recordPageFields = [],
}) {
  const cfg = comp.config || {};
  const set = (k, v) => onChange({ ...comp, config: { ...cfg, [k]: v } });
  const isInput = INPUT_TYPES.has(comp.type);
  const isBtn = ['next_button', 'prev_button', 'submit_button'].includes(
    comp.type,
  );

  return (
    <div className={styles.compConfig}>
      <Row label="Label">
        <Inp
          value={comp.label || ''}
          onChange={(v) => onChange({ ...comp, label: v })}
          placeholder="Label shown to user"
        />
      </Row>

      {isInput && (
        <Row label="API Name" hint="Variable name to store user input">
          <Inp
            value={comp.apiName || ''}
            onChange={(v) => onChange({ ...comp, apiName: v })}
            placeholder="e.g. firstName"
          />
        </Row>
      )}

      <Row label="Width">
        <Sel
          value={String(comp.cols || 12)}
          onChange={(v) => onChange({ ...comp, cols: parseInt(v) })}
          options={[
            { value: '4', label: '1/3 width' },
            { value: '6', label: '1/2 width' },
            { value: '8', label: '2/3 width' },
            { value: '12', label: 'Full width' },
          ]}
        />
      </Row>

      {/* Required */}
      {isInput && (
        <Row label="Required">
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={!!cfg.required}
              onChange={(e) => set('required', e.target.checked)}
            />
            Required field
          </label>
        </Row>
      )}

      {/* Placeholder */}
      {[
        'text_input',
        'text_area',
        'number_input',
        'email_input',
        'phone_input',
        'password_input',
      ].includes(comp.type) && (
        <Row label="Placeholder">
          <Inp
            value={cfg.placeholder || ''}
            onChange={(v) => set('placeholder', v)}
            placeholder="Hint text inside input"
          />
        </Row>
      )}

      {/* Default value */}
      {isInput &&
        !OPTIONS_TYPES.has(comp.type) &&
        !['file_upload', 'lookup_field'].includes(comp.type) && (
          <Row label="Default value">
            <MergeInput
              value={cfg.defaultValue || ''}
              onChange={(v) => set('defaultValue', v)}
              placeholder="Pre-filled value or {field_name}"
              fields={fields}
              variables={variables}
              outputVariables={outputVariables}
              recordPageFields={recordPageFields}
            />
          </Row>
        )}

      {/* Options list */}
      {OPTIONS_TYPES.has(comp.type) && (
        <Row label="Options">
          <OptionsEditor
            options={cfg.options || []}
            onChange={(v) => set('options', v)}
          />
        </Row>
      )}

      {/* Number / Slider min/max/step */}
      {['number_input', 'slider'].includes(comp.type) && (
        <>
          <Row label="Min value">
            <Inp
              type="number"
              value={cfg.min ?? ''}
              onChange={(v) => set('min', v === '' ? undefined : Number(v))}
              placeholder="Minimum"
            />
          </Row>
          <Row label="Max value">
            <Inp
              type="number"
              value={cfg.max ?? ''}
              onChange={(v) => set('max', v === '' ? undefined : Number(v))}
              placeholder="Maximum"
            />
          </Row>
          {comp.type === 'slider' && (
            <Row label="Step">
              <Inp
                type="number"
                value={cfg.step ?? ''}
                onChange={(v) => set('step', v === '' ? undefined : Number(v))}
                placeholder="e.g. 1"
              />
            </Row>
          )}
        </>
      )}

      {/* Image */}
      {comp.type === 'image' && (
        <>
          <Row label="Image URL">
            <Inp
              value={cfg.src || ''}
              onChange={(v) => set('src', v)}
              placeholder="https://..."
            />
          </Row>
          <Row label="Alt text">
            <Inp
              value={cfg.alt || ''}
              onChange={(v) => set('alt', v)}
              placeholder="Description"
            />
          </Row>
        </>
      )}

      {/* Rich text / Display text content */}
      {['rich_text', 'display_text'].includes(comp.type) && (
        <Row label="Content">
          <MergeInput
            value={cfg.content || ''}
            onChange={(v) => set('content', v)}
            rows={4}
            placeholder={
              comp.type === 'rich_text'
                ? '<p>HTML content — supports {field_name}</p>'
                : 'Text content — supports {field_name}'
            }
            fields={fields}
            variables={variables}
            outputVariables={outputVariables}
            recordPageFields={recordPageFields}
          />
        </Row>
      )}

      {/* Lookup / Record display / Data table object */}
      {['lookup_field', 'record_display', 'data_table'].includes(comp.type) && (
        <Row label="Object">
          <Sel
            value={cfg.objectApiName || ''}
            onChange={(v) => set('objectApiName', v)}
            placeholder="— Select object —"
            options={objects.map((o) => ({ value: o.apiName, label: o.label }))}
          />
        </Row>
      )}

      {/* Data table columns */}
      {comp.type === 'data_table' && (
        <Row label="Columns" hint="Comma-separated field API names">
          <Inp
            value={cfg.columns || ''}
            onChange={(v) => set('columns', v)}
            placeholder="name, email, phone"
          />
        </Row>
      )}

      {/* Columns layout count */}
      {comp.type === 'columns' && (
        <Row label="Columns">
          <Sel
            value={String(cfg.numCols || 2)}
            onChange={(v) => set('numCols', parseInt(v))}
            options={[
              { value: '2', label: '2 columns' },
              { value: '3', label: '3 columns' },
              { value: '4', label: '4 columns' },
            ]}
          />
        </Row>
      )}

      {/* Spacer height */}
      {comp.type === 'spacer' && (
        <Row label="Height (px)">
          <Inp
            type="number"
            value={cfg.height || 24}
            onChange={(v) => set('height', parseInt(v) || 24)}
            placeholder="24"
          />
        </Row>
      )}

      {/* Button label */}
      {isBtn && (
        <Row label="Button label">
          <Inp
            value={cfg.buttonLabel || ''}
            onChange={(v) => set('buttonLabel', v)}
            placeholder={
              comp.type === 'submit_button'
                ? 'Submit'
                : comp.type === 'next_button'
                  ? 'Next'
                  : 'Previous'
            }
          />
        </Row>
      )}

      {/* Help text */}
      {isInput && (
        <Row label="Help text">
          <Inp
            value={cfg.helpText || ''}
            onChange={(v) => set('helpText', v)}
            placeholder="Instructions shown below the field"
          />
        </Row>
      )}

      {/* Validation */}
      {isInput && (
        <Row
          label="Validation rule"
          hint="Expression that must be true to submit"
        >
          <Inp
            value={cfg.validationRule || ''}
            onChange={(v) => set('validationRule', v)}
            placeholder="{value} != '' && {value}.length > 2"
          />
        </Row>
      )}
      {isInput && cfg.validationRule && (
        <Row label="Error message">
          <Inp
            value={cfg.validationMessage || ''}
            onChange={(v) => set('validationMessage', v)}
            placeholder="Shown when validation fails"
          />
        </Row>
      )}

      {/* Visibility rule — all components */}
      <Row
        label="Visibility rule"
        hint="Show only when this expression is true; empty = always visible"
      >
        <Inp
          value={cfg.visibilityRule || ''}
          onChange={(v) => set('visibilityRule', v)}
          placeholder="{firstName} != ''"
        />
      </Row>
    </div>
  );
}

// ─── Column drop zone (one column inside a columns container) ────────────────
function ColumnDropZone({
  colIndex,
  items,
  onDrop,
  onDragOver,
  onDragLeave,
  dragOverCol,
  fromPalette,
  draggingRef,
  onItemChange,
  onItemDelete,
  onItemMove,
  fields,
  objects,
  variables,
  outputVariables,
  recordPageFields,
}) {
  const isOver = dragOverCol === colIndex;

  return (
    <div
      className={`${styles.columnZone} ${isOver ? styles.columnZoneOver : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver(colIndex);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onDragLeave();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(colIndex);
      }}
    >
      <div className={styles.columnZoneLabel}>Column {colIndex + 1}</div>
      {items.length === 0 && (
        <div className={styles.columnDropHint}>Drop here</div>
      )}
      {items.map((comp, i) => (
        <div
          key={comp.id}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            draggingRef.current = { colIndex, itemIndex: i };
            fromPalette.current = null;
          }}
          className={styles.compSlot}
        >
          <ComponentCard
            comp={comp}
            index={i}
            total={items.length}
            onChange={(upd) => onItemChange(colIndex, i, upd)}
            onDelete={() => onItemDelete(colIndex, i)}
            onMove={(_, dir) => onItemMove(colIndex, i, dir)}
            fields={fields}
            objects={objects}
            variables={variables}
            outputVariables={outputVariables}
            recordPageFields={recordPageFields}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Columns container card ───────────────────────────────────
function ColumnsContainer({
  comp,
  index,
  total,
  onChange,
  onDelete,
  onMove,
  fields,
  objects,
  variables,
  outputVariables,
  recordPageFields,
  fromPalette,
}) {
  const [expanded, setExpanded] = useState(false);
  const numCols = comp.config?.numCols || 2;
  const columns =
    comp.config?.columns || Array.from({ length: numCols }, () => []);
  // Ensure columns array matches numCols
  const normalizedCols = Array.from(
    { length: numCols },
    (_, i) => columns[i] || [],
  );

  const [dragOverCol, setDragOverCol] = useState(null);
  const draggingRef = useRef(null); // { colIndex, itemIndex } or null for palette

  const setColumns = (newCols) =>
    onChange({ ...comp, config: { ...comp.config, columns: newCols } });

  const handleNumColsChange = (n) => {
    const newCols = Array.from(
      { length: n },
      (_, i) => normalizedCols[i] || [],
    );
    onChange({
      ...comp,
      config: { ...comp.config, numCols: n, columns: newCols },
    });
  };

  const onDrop = (dropColIndex) => {
    if (fromPalette.current) {
      const newItem = {
        id: genId(),
        type: fromPalette.current,
        label: TYPE_LABEL[fromPalette.current] || fromPalette.current,
        apiName: '',
        cols: 12,
        config: {},
      };
      const newCols = normalizedCols.map((col, ci) =>
        ci === dropColIndex ? [...col, newItem] : col,
      );
      setColumns(newCols);
      fromPalette.current = null;
    } else if (draggingRef.current) {
      const { colIndex: srcCol, itemIndex: srcIdx } = draggingRef.current;
      const newCols = normalizedCols.map((col) => [...col]);
      const [item] = newCols[srcCol].splice(srcIdx, 1);
      newCols[dropColIndex].push(item);
      setColumns(newCols);
      draggingRef.current = null;
    }
    setDragOverCol(null);
  };

  const onItemChange = (colIdx, itemIdx, upd) => {
    const newCols = normalizedCols.map((col, ci) =>
      ci === colIdx ? col.map((it, ii) => (ii === itemIdx ? upd : it)) : col,
    );
    setColumns(newCols);
  };
  const onItemDelete = (colIdx, itemIdx) => {
    const newCols = normalizedCols.map((col, ci) =>
      ci === colIdx ? col.filter((_, ii) => ii !== itemIdx) : col,
    );
    setColumns(newCols);
  };
  const onItemMove = (colIdx, itemIdx, dir) => {
    const col = [...normalizedCols[colIdx]];
    const ni = itemIdx + dir;
    if (ni < 0 || ni >= col.length) return;
    [col[itemIdx], col[ni]] = [col[ni], col[itemIdx]];
    setColumns(normalizedCols.map((c, ci) => (ci === colIdx ? col : c)));
  };

  const color = '#b45309';
  return (
    <div className={styles.compCard} style={{ borderLeftColor: color }}>
      <div
        className={styles.compCardHeader}
        onClick={() => setExpanded((e) => !e)}
      >
        <span className={styles.grip}>
          <GripVertical size={14} />
        </span>
        <span
          className={styles.compTypeBadge}
          style={{ background: `${color}18`, color }}
        >
          <Columns size={11} style={{ display: 'inline', marginRight: 3 }} />
          Columns
        </span>
        <span className={styles.compLabel}>
          {comp.label || `${numCols}-Column Layout`}
        </span>
        <div className={styles.compMeta} />
        <div
          className={styles.compActions}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.iconBtn}
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
          >
            ↑
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
          >
            ↓
          </button>
          <button
            className={`${styles.iconBtn} ${styles.dangerBtn}`}
            onClick={() => onDelete(index)}
          >
            <Trash2 size={12} />
          </button>
        </div>
        <span className={styles.chevron}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </div>

      {expanded && (
        <div className={styles.compCardBody}>
          <Row label="Label">
            <Inp
              value={comp.label || ''}
              onChange={(v) => onChange({ ...comp, label: v })}
              placeholder="Section label"
            />
          </Row>
          <Row label="Columns">
            <Sel
              value={String(numCols)}
              onChange={(v) => handleNumColsChange(parseInt(v))}
              options={[
                { value: '2', label: '2 columns' },
                { value: '3', label: '3 columns' },
                { value: '4', label: '4 columns' },
              ]}
            />
          </Row>
          <div
            className={styles.columnsGrid}
            style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}
          >
            {normalizedCols.map((colItems, ci) => (
              <ColumnDropZone
                key={ci}
                colIndex={ci}
                items={colItems}
                onDrop={onDrop}
                onDragOver={setDragOverCol}
                onDragLeave={() => setDragOverCol(null)}
                dragOverCol={dragOverCol}
                fromPalette={fromPalette}
                draggingRef={draggingRef}
                onItemChange={onItemChange}
                onItemDelete={onItemDelete}
                onItemMove={onItemMove}
                fields={fields}
                objects={objects}
                variables={variables}
                outputVariables={outputVariables}
                recordPageFields={recordPageFields}
              />
            ))}
          </div>
          <p className={styles.columnsHint}>
            Drag components from the palette directly into a column.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Single component card on canvas ─────────────────────────
function ComponentCard({
  comp,
  index,
  total,
  onChange,
  onDelete,
  onMove,
  fields,
  objects,
  variables,
  outputVariables,
  recordPageFields,
}) {
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLOR[comp.type] || '#64748b';

  return (
    <div className={styles.compCard} style={{ borderLeftColor: color }}>
      <div
        className={styles.compCardHeader}
        onClick={() => setExpanded((e) => !e)}
      >
        <span className={styles.grip}>
          <GripVertical size={14} />
        </span>
        <span
          className={styles.compTypeBadge}
          style={{ background: `${color}18`, color }}
        >
          {TYPE_LABEL[comp.type] || comp.type}
        </span>
        <span className={styles.compLabel}>
          {comp.label || TYPE_LABEL[comp.type]}
        </span>
        <div className={styles.compMeta}>
          {comp.config?.visibilityRule && (
            <Eye
              size={12}
              title="Has visibility rule"
              style={{ color: '#0891b2' }}
            />
          )}
          {comp.config?.required && (
            <span className={styles.requiredDot} title="Required">
              *
            </span>
          )}
        </div>
        <div
          className={styles.compActions}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.iconBtn}
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
          >
            ↑
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
          >
            ↓
          </button>
          <button
            className={`${styles.iconBtn} ${styles.dangerBtn}`}
            onClick={() => onDelete(index)}
          >
            <Trash2 size={12} />
          </button>
        </div>
        <span className={styles.chevron}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </div>
      {expanded && (
        <div className={styles.compCardBody}>
          <ComponentConfig
            comp={comp}
            onChange={onChange}
            fields={fields}
            objects={objects}
            variables={variables}
            outputVariables={outputVariables}
            recordPageFields={recordPageFields}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main screen element ──────────────────────────────────────
export default function ScreenElement({
  config,
  onChange,
  fields = [],
  objects = [],
  variables = [],
  outputVariables = [],
  recordPageFields = [],
}) {
  const components = config.components || [];
  const draggingIdx = useRef(null);
  const fromPalette = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const addComp = (type, atIndex) => {
    const comp = {
      id: genId(),
      type,
      label: TYPE_LABEL[type] || type,
      apiName: '',
      cols: 12,
      config: {},
    };
    const idx = atIndex != null ? atIndex : components.length;
    onChange({
      ...config,
      components: [...components.slice(0, idx), comp, ...components.slice(idx)],
    });
  };

  const updComp = (i, upd) =>
    onChange({
      ...config,
      components: components.map((c, idx) => (idx === i ? upd : c)),
    });
  const delComp = (i) =>
    onChange({
      ...config,
      components: components.filter((_, idx) => idx !== i),
    });
  const movComp = (i, dir) => {
    const ni = i + dir;
    if (ni < 0 || ni >= components.length) return;
    const next = [...components];
    [next[i], next[ni]] = [next[ni], next[i]];
    onChange({ ...config, components: next });
  };

  // Drag from palette
  const onPaletteDragStart = (type) => {
    fromPalette.current = type;
    draggingIdx.current = null;
  };
  // Drag within canvas
  const onCardDragStart = (i) => {
    draggingIdx.current = i;
    fromPalette.current = null;
  };

  const onDragOver = (e, i) => {
    e.preventDefault();
    setDragOverIdx(i);
  };
  const onDragLeave = () => setDragOverIdx(null);

  const onDropOnCard = (e, dropIdx) => {
    e.preventDefault();
    e.stopPropagation();
    if (fromPalette.current) {
      addComp(fromPalette.current, dropIdx);
    } else if (draggingIdx.current != null && draggingIdx.current !== dropIdx) {
      const next = [...components];
      const [item] = next.splice(draggingIdx.current, 1);
      next.splice(dropIdx, 0, item);
      onChange({ ...config, components: next });
    }
    draggingIdx.current = null;
    fromPalette.current = null;
    setDragOverIdx(null);
  };

  const onDropCanvas = (e) => {
    e.preventDefault();
    if (fromPalette.current) {
      addComp(fromPalette.current);
      fromPalette.current = null;
    }
    setDragOverIdx(null);
  };

  return (
    <div className={styles.screenBuilder}>
      {/* ── Palette ── */}
      <div className={styles.palette}>
        <div className={styles.paletteTitle}>Components</div>
        <div className={styles.paletteScroll}>
          {PALETTE.map((group) => (
            <div key={group.group} className={styles.paletteGroup}>
              <div
                className={styles.paletteGroupLabel}
                style={{ color: group.color }}
              >
                {group.group}
              </div>
              {group.items.map((item) => (
                <div
                  key={item.type}
                  className={styles.paletteItem}
                  draggable
                  onDragStart={() => onPaletteDragStart(item.type)}
                  style={{ '--item-color': group.color }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className={styles.canvas}>
        <Row label="Screen title">
          <Inp
            value={config.title || ''}
            onChange={(v) => onChange({ ...config, title: v })}
            placeholder="e.g. Customer Details"
          />
        </Row>
        <Row label="Show title">
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={config.showTitle !== false}
              onChange={(e) =>
                onChange({ ...config, showTitle: e.target.checked })
              }
            />
            Display title on screen
          </label>
        </Row>

        <div
          className={styles.dropZone}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropCanvas}
        >
          {components.length === 0 && (
            <div className={styles.dropHint}>
              Drag components from the palette to build this screen
            </div>
          )}

          {components.map((comp, i) => (
            <div
              key={comp.id}
              draggable={comp.type !== 'columns'}
              onDragStart={
                comp.type !== 'columns' ? () => onCardDragStart(i) : undefined
              }
              onDragOver={
                comp.type !== 'columns' ? (e) => onDragOver(e, i) : undefined
              }
              onDragLeave={comp.type !== 'columns' ? onDragLeave : undefined}
              onDrop={
                comp.type !== 'columns' ? (e) => onDropOnCard(e, i) : undefined
              }
              className={`${styles.compSlot} ${dragOverIdx === i ? styles.compSlotOver : ''}`}
            >
              {comp.type === 'columns' ? (
                <ColumnsContainer
                  comp={comp}
                  index={i}
                  total={components.length}
                  onChange={(upd) => updComp(i, upd)}
                  onDelete={delComp}
                  onMove={movComp}
                  fields={fields}
                  objects={objects}
                  variables={variables}
                  outputVariables={outputVariables}
                  recordPageFields={recordPageFields}
                  fromPalette={fromPalette}
                />
              ) : (
                <ComponentCard
                  comp={comp}
                  index={i}
                  total={components.length}
                  onChange={(upd) => updComp(i, upd)}
                  onDelete={delComp}
                  onMove={movComp}
                  fields={fields}
                  objects={objects}
                  variables={variables}
                  outputVariables={outputVariables}
                  recordPageFields={recordPageFields}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
