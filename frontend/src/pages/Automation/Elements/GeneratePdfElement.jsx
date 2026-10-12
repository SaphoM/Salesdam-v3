import React, { useEffect, useState } from 'react';
import { Eye, FilePlus, X } from 'lucide-react';
import api from '../../../services/api.js';
import { Row, Sel, Inp } from './shared.jsx';
import styles from './GeneratePdfElement.module.css';

// ─── PDF Preview modal (screen flows only) ────────────────────────────────────
function PdfPreviewModal({ template, onClose }) {
  if (!template) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Preview: {template.name}</span>
          <button className={styles.modalClose} onClick={onClose}><X size={16} /></button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.previewNote}>
            This is a design-time preview. Merge fields will be replaced with real data when the flow runs.
          </p>
          <div className={styles.previewPage} style={{ padding: `${template.pageSettings?.marginTop ?? 40}px ${template.pageSettings?.marginRight ?? 40}px ${template.pageSettings?.marginBottom ?? 40}px ${template.pageSettings?.marginLeft ?? 40}px` }}>
            {template.pageSettings?.headerHtml && (
              <div className={styles.headerHtml} dangerouslySetInnerHTML={{ __html: template.pageSettings.headerHtml }} />
            )}
            {(template.blocks || []).sort((a, b) => a.order - b.order).map((block, i) => (
              <PreviewBlock key={block.id || i} block={block} />
            ))}
            {template.pageSettings?.footerHtml && (
              <div className={styles.footerHtml} dangerouslySetInnerHTML={{ __html: template.pageSettings.footerHtml }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewBlock({ block }) {
  const { type, config, style } = block;
  const s = style || {};
  const textStyle = {
    fontSize: (s.fontSize || 13) + 'px',
    fontWeight: s.bold ? 700 : 400,
    fontStyle: s.italic ? 'italic' : 'normal',
    textAlign: s.align || 'left',
    color: s.color || '#111827',
    marginTop: (s.marginTop || 0) + 'px',
    marginBottom: (s.marginBottom ?? 8) + 'px',
  };
  if (type === 'text')         return <div style={textStyle}>{config.content || ''}</div>;
  if (type === 'record_field') return (
    <div style={textStyle}>
      {config.showLabel !== false && <strong>{config.label || config.fieldApiName}: </strong>}
      <code style={{ color: '#6366f1', fontSize: '11px' }}>{`{${config.inputName}.${config.fieldApiName}}`}</code>
    </div>
  );
  if (type === 'datatable') return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '8px' }}>
      <thead>
        <tr>{(config.columns || []).map((c, i) => <th key={i} style={{ padding: '6px 8px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>{c.label || c.fieldApiName}</th>)}</tr>
      </thead>
      <tbody>
        <tr style={{ color: '#6366f1', fontFamily: 'monospace' }}>{(config.columns || []).map((c, i) => <td key={i} style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>{`{${config.inputName}[*].${c.fieldApiName}}`}</td>)}</tr>
      </tbody>
    </table>
  );
  if (type === 'image')       return <div style={{ marginBottom: '8px' }}><span style={{ display: 'inline-block', padding: '8px 12px', background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 4, fontSize: 12, color: '#64748b' }}>Image: {config.url || config.inputName || '…'}</span></div>;
  if (type === 'divider')     return <hr style={{ border: 'none', borderTop: `${config.thickness || 1}px solid ${config.color || '#e2e8f0'}`, margin: '8px 0' }} />;
  if (type === 'page_break')  return <div style={{ textAlign: 'center', fontSize: 11, color: '#dc2626', border: '1px dashed #fca5a5', padding: '4px', marginBottom: '8px', borderRadius: 4 }}>── Page Break ──</div>;
  if (type === 'spacer')      return <div style={{ height: (config.height || 24) + 'px' }} />;
  return null;
}

// ─── Main element config ──────────────────────────────────────────────────────
export default function GeneratePdfElement({ config, onChange, variables = [], fields = [], outputVariables = [], recordPageFields = [], flowType }) {
  const [templates, setTemplates]         = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewOpen, setPreviewOpen]     = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const isScreenFlow = flowType === 'screen_flow';

  useEffect(() => {
    api.get('/pdf-templates', { params: { limit: 200 } })
      .then(r => setTemplates(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!config.templateId) { setSelectedTemplate(null); return; }
    setLoadingTemplate(true);
    api.get(`/pdf-templates/${config.templateId}`)
      .then(r => setSelectedTemplate(r.data.data))
      .catch(() => setSelectedTemplate(null))
      .finally(() => setLoadingTemplate(false));
  }, [config.templateId]);

  const upd = (key, val) => onChange({ ...config, [key]: val });

  // Auto-reset input mappings when template changes
  const handleTemplateChange = (templateId) => {
    onChange({ ...config, templateId, inputMappings: {} });
  };

  const setMapping = (inputName, val) => {
    onChange({ ...config, inputMappings: { ...(config.inputMappings || {}), [inputName]: val } });
  };

  // Build variable options for mapping
  const recordVars = [
    ...variables.filter(v => ['record', 'text', 'number', 'date'].includes(v.dataType)).map(v => ({ value: `$${v.name}`, label: `Flow var — ${v.label || v.name}` })),
    ...outputVariables.map(v => ({ value: `$${v.name}`, label: `Created record — ${v.label || v.name}` })),
    ...(recordPageFields.length > 0 ? [{ value: 'record', label: 'Page record' }] : []),
  ];
  const collectionVars = variables.filter(v => v.dataType === 'collection').map(v => ({ value: `$${v.name}`, label: `Flow var — ${v.label || v.name}` }));

  return (
    <div className={styles.wrap}>
      {/* Template picker */}
      <Row label="PDF Template">
        <Sel
          value={config.templateId || ''}
          onChange={handleTemplateChange}
          placeholder="— Select PDF template —"
          options={templates.map(t => ({ value: t._id, label: t.name }))}
        />
      </Row>

      {/* Input mappings */}
      {selectedTemplate && (selectedTemplate.inputs || []).length > 0 && (
        <div className={styles.mappingsSection}>
          <div className={styles.mappingsTitle}>Input mappings</div>
          {selectedTemplate.inputs.map(inp => {
            const opts = inp.type === 'collection' ? collectionVars : recordVars;
            return (
              <Row key={inp.name} label={`${inp.label} ${inp.required ? '*' : ''}`} hint={`type: ${inp.type}${inp.objectApiName ? ` (${inp.objectApiName})` : ''}`}>
                {opts.length > 0 ? (
                  <Sel
                    value={(config.inputMappings || {})[inp.name] || ''}
                    onChange={v => setMapping(inp.name, v)}
                    placeholder={`— Map ${inp.label} —`}
                    options={opts}
                  />
                ) : (
                  <Inp
                    value={(config.inputMappings || {})[inp.name] || ''}
                    onChange={v => setMapping(inp.name, v)}
                    placeholder={inp.type === 'text' ? 'Value or {merge}' : 'No variables available'}
                  />
                )}
              </Row>
            );
          })}
        </div>
      )}

      {/* Output filename */}
      <Row label="Output filename" hint="Without .pdf extension — supports {merge} fields">
        <Inp
          value={config.fileName || ''}
          onChange={v => upd('fileName', v)}
          placeholder="e.g. Invoice_{record.name}"
        />
      </Row>

      {/* Save to Files */}
      <Row label="Save to Files">
        <div className={styles.checkRow}>
          <input
            type="checkbox"
            id="saveToFiles"
            checked={config.saveToFiles !== false}
            onChange={e => upd('saveToFiles', e.target.checked)}
          />
          <label htmlFor="saveToFiles" className={styles.checkLabel}>Save generated PDF to Files record</label>
        </div>
      </Row>

      {/* Related record for file */}
      {config.saveToFiles !== false && (
        <>
          <Row label="Relate file to object" hint="Object of the record this file belongs to">
            <Inp
              value={config.relatedObjectApiName || ''}
              onChange={v => upd('relatedObjectApiName', v)}
              placeholder="e.g. invoice, policy"
            />
          </Row>
          <Row label="Relate file to record ID" hint="Use {_id}, {$var._id}, or {record._id}">
            <Inp
              value={config.relatedRecordId || ''}
              onChange={v => upd('relatedRecordId', v)}
              placeholder="e.g. {_id}"
            />
          </Row>
          <Row label="Store file ID as variable" hint="Use {$varName} in later steps">
            <Inp
              value={config.fileOutputVariable || ''}
              onChange={v => upd('fileOutputVariable', v)}
              placeholder="e.g. generatedFile (optional)"
            />
          </Row>
        </>
      )}

      {/* Preview (screen flows only) */}
      {isScreenFlow && selectedTemplate && (
        <div className={styles.previewSection}>
          <button
            type="button"
            className={styles.previewBtn}
            onClick={() => setPreviewOpen(true)}
            disabled={loadingTemplate}
          >
            <Eye size={14} /> Preview template layout
          </button>
        </div>
      )}
      {!isScreenFlow && (
        <div className={styles.previewNote}>Preview is only available on screen flows</div>
      )}

      {previewOpen && selectedTemplate && (
        <PdfPreviewModal template={selectedTemplate} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
