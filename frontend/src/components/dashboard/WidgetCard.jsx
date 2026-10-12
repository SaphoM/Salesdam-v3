import React from 'react';
import { Settings2, Trash2, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import MetricWidget from './widgets/MetricWidget';
import ChartWidget  from './widgets/ChartWidget';
import TableWidget  from './widgets/TableWidget';
import TextWidget   from './widgets/TextWidget';
import styles from './WidgetCard.module.css';

const SIZE_ORDER = ['col-4', 'col-6', 'col-8', 'col-12'];
const HEIGHT_ORDER = ['compact', 'normal', 'tall'];

const HEIGHT_PX = { compact: 160, normal: 260, tall: 400 };

function WidgetBody({ widget }) {
  const { type, config, title } = widget;
  switch (type) {
    case 'metric':    return <MetricWidget config={config} title={title} />;
    case 'bar_chart':
    case 'line_chart':
    case 'pie_chart': return <ChartWidget type={type} config={config} />;
    case 'table':     return <TableWidget config={config} />;
    case 'text':      return <TextWidget  config={config} />;
    default:          return <div style={{ padding: 16, color: 'gray' }}>Unknown widget type</div>;
  }
}

export default function WidgetCard({ widget, editing, onEdit, onDelete, onResize, onMove, totalWidgets }) {
  const colSpan = parseInt((widget.size || 'col-6').split('-')[1]);
  const height  = HEIGHT_PX[widget.height || 'normal'];

  const sizeIdx   = SIZE_ORDER.indexOf(widget.size || 'col-6');
  const heightIdx = HEIGHT_ORDER.indexOf(widget.height || 'normal');

  return (
    <div
      className={`${styles.card} ${editing ? styles.editing : ''}`}
      style={{ gridColumn: `span ${colSpan}`, height }}
    >
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>{widget.title || widget.type?.replace(/_/g, ' ')}</span>
        {editing && (
          <div className={styles.controls}>
            {/* Move left */}
            <button className={styles.ctrl} title="Move left" onClick={() => onMove(widget.widgetId, -1)} disabled={widget.order === 0}>
              <ChevronLeft size={13} />
            </button>
            {/* Move right */}
            <button className={styles.ctrl} title="Move right" onClick={() => onMove(widget.widgetId, 1)} disabled={widget.order >= totalWidgets - 1}>
              <ChevronRight size={13} />
            </button>
            {/* Shrink / grow width */}
            <button className={styles.ctrl} title="Shrink width" onClick={() => onResize(widget.widgetId, 'size', SIZE_ORDER[Math.max(0, sizeIdx - 1)])} disabled={sizeIdx === 0}>
              <Minimize2 size={13} />
            </button>
            <button className={styles.ctrl} title="Grow width" onClick={() => onResize(widget.widgetId, 'size', SIZE_ORDER[Math.min(SIZE_ORDER.length - 1, sizeIdx + 1)])} disabled={sizeIdx === SIZE_ORDER.length - 1}>
              <Maximize2 size={13} />
            </button>
            {/* Configure */}
            <button className={`${styles.ctrl} ${styles.primary}`} title="Configure" onClick={() => onEdit(widget)}>
              <Settings2 size={13} />
            </button>
            {/* Delete */}
            <button className={`${styles.ctrl} ${styles.danger}`} title="Remove" onClick={() => onDelete(widget.widgetId)}>
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className={styles.body} style={{ height: height - 40 }}>
        <WidgetBody widget={widget} />
      </div>
    </div>
  );
}
