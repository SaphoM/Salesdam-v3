import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Eye, EyeOff, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import styles from './EmailTemplateEditor.module.css';

// ─── Common merge fields available in all templates ───────────────────────────
const COMMON_FIELDS = [
  { token: '{firstName}', label: 'First Name' },
  { token: '{lastName}', label: 'Last Name' },
  { token: '{fullName}', label: 'Full Name' },
  { token: '{email}', label: 'Email' },
  { token: '{company}', label: 'Company' },
  { token: '{phone}', label: 'Phone' },
  { token: '{date}', label: "Today's Date" },
  { token: '{subject}', label: 'Subject' },
  { token: '{senderName}', label: 'Sender Name' },
  { token: '{unsubLink}', label: 'Unsubscribe Link' },
];

// ─── Merge field picker ───────────────────────────────────────────────────────
function MergeFieldPicker({ onInsert, extraFields = [] }) {
  const [open, setOpen] = useState(false);
  const allFields = [...COMMON_FIELDS, ...extraFields];
  return (
    <div className={styles.mergePickerWrap}>
      <button
        type="button"
        className={styles.mergeBtn}
        onClick={() => setOpen((o) => !o)}
      >
        {'{}'} Insert field
      </button>
      {open && (
        <div className={styles.mergeMenu}>
          <div className={styles.mergeMenuHeader}>
            Click to insert at cursor
          </div>
          {allFields.map((f) => (
            <button
              key={f.token}
              type="button"
              className={styles.mergeMenuItem}
              onClick={() => {
                onInsert(f.token);
                setOpen(false);
              }}
            >
              <code>{f.token}</code>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Text field with merge insert ─────────────────────────────────────────────
function MergeTextInput({ value, onChange, placeholder, rows, extraFields }) {
  const ref = useRef(null);
  const insert = (token) => {
    const el = ref.current;
    if (!el) {
      onChange((value || '') + token);
      return;
    }
    const s = el.selectionStart ?? (value || '').length;
    const e = el.selectionEnd ?? s;
    const next = (value || '').slice(0, s) + token + (value || '').slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + token.length;
      el.setSelectionRange(pos, pos);
    });
  };
  const props = {
    ref,
    value: value ?? '',
    onChange: (ev) => onChange(ev.target.value),
    placeholder,
    className: styles.inp,
  };
  return (
    <div className={styles.mergeInputWrap}>
      {rows > 1 ? (
        <textarea {...props} rows={rows} />
      ) : (
        <input {...props} type="text" />
      )}
      <MergeFieldPicker onInsert={insert} extraFields={extraFields} />
    </div>
  );
}

// ─── Live preview ─────────────────────────────────────────────────────────────
function LivePreview({ subject, bodyHtml, bodyText, useHtml }) {
  const interp = (str) =>
    (str || '').replace(/\{(\w+)\}/g, (_, k) => {
      const samples = {
        firstName: 'Jane',
        lastName: 'Doe',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        company: 'Acme Corp',
        phone: '+1 555 0100',
        date: new Date().toLocaleDateString(),
        subject: subject || '(subject)',
        senderName: 'Your Team',
        unsubLink: '#unsubscribe',
      };
      return samples[k] ?? `{${k}}`;
    });

  return (
    <div className={styles.preview}>
      <div className={styles.previewEmail}>
        <div className={styles.previewFrom}>
          <strong>From:</strong> Your CRM &lt;noreply@crm.local&gt;
        </div>
        <div className={styles.previewTo}>
          <strong>To:</strong> Jane Doe &lt;jane@example.com&gt;
        </div>
        <div className={styles.previewSubject}>
          <strong>Subject:</strong> {interp(subject) || <em>(no subject)</em>}
        </div>
        <hr className={styles.previewDivider} />
        {useHtml ? (
          <div
            className={styles.previewBody}
            dangerouslySetInnerHTML={{
              __html:
                interp(bodyHtml) ||
                '<p style="color:#94a3b8;font-style:italic">HTML body is empty</p>',
            }}
          />
        ) : (
          <pre className={styles.previewPlain}>
            {interp(bodyText) || '(plain text body is empty)'}
          </pre>
        )}
      </div>
    </div>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft('');
  };
  return (
    <div className={styles.tagInputWrap}>
      <div className={styles.tagList}>
        {tags.map((t) => (
          <span key={t} className={styles.tagChip}>
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== t))}
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className={styles.tagAdd}>
        <input
          className={styles.tagDraft}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add tag…"
        />
        <button type="button" className={styles.tagAddBtn} onClick={add}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────
export default function EmailTemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id && id !== 'new';

  const [form, setForm] = useState({
    name: '',
    subject: '',
    bodyText: '',
    bodyHtml: '',
    category: 'General',
    description: '',
    tags: [],
    isActive: true,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [bodyMode, setBodyMode] = useState('html'); // 'html' | 'text'
  const [showPreview, setShowPreview] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api
      .get('/email-templates/categories')
      .then((r) => setCategories(r.data.data || []))
      .catch(() => {});
    if (isEdit) {
      api
        .get(`/email-templates/${id}`)
        .then((r) => setForm(r.data.data))
        .catch(() => {
          toast.error('Template not found');
          navigate('/email-templates');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, navigate]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!form.subject.trim()) {
      toast.error('Subject is required.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/email-templates/${id}`, form);
        toast.success('Template saved.');
      } else {
        await api.post('/email-templates', form);
        toast.success('Template created.');
        navigate('/email-templates');
      }
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Layout
        title="Email Template Editor"
        description="Create and edit email templates"
      >
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      </Layout>
    );

  const extraFields = form.name
    ? [{ token: '{templateName}', label: form.name }]
    : [];

  return (
    <Layout
      title="Email Template Editor"
      description="Create and edit email templates"
    >
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <Link to="/email-templates" className={styles.backLink}>
            <ArrowLeft size={16} /> Templates
          </Link>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>
              {isEdit ? `Edit: ${form.name}` : 'New Template'}
            </h1>
            <div className={styles.headerActions}>
              <button
                className={`${styles.previewToggle} ${showPreview ? styles.previewOn : ''}`}
                onClick={() => setShowPreview((p) => !p)}
                title="Toggle preview"
              >
                {showPreview ? <Eye size={16} /> : <EyeOff size={16} />}
                {showPreview ? 'Hide preview' : 'Show preview'}
              </button>
              <Button
                icon={<Save size={13} />}
                loading={saving}
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`${styles.editorLayout} ${showPreview ? styles.withPreview : ''}`}
        >
          {/* ── Left panel: form ───────────────────────────────────────────── */}
          <div className={styles.formPanel}>
            {/* Metadata */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Template Details</div>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Name *</label>
                  <input
                    className={styles.inp}
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. Welcome Email"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Category</label>
                  <input
                    className={styles.inp}
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    list="cat-list"
                    placeholder="e.g. Sales"
                  />
                  <datalist id="cat-list">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className={styles.field} style={{ gridColumn: '1/-1' }}>
                  <label className={styles.label}>Description</label>
                  <input
                    className={styles.inp}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Internal notes about this template"
                  />
                </div>
                <div className={styles.field} style={{ gridColumn: '1/-1' }}>
                  <label className={styles.label}>Tags</label>
                  <TagInput
                    tags={form.tags || []}
                    onChange={(v) => set('tags', v)}
                  />
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Subject Line</div>
              <MergeTextInput
                value={form.subject}
                onChange={(v) => set('subject', v)}
                placeholder="e.g. Welcome, {firstName}! Here's what's next…"
                extraFields={extraFields}
              />
            </div>

            {/* Body */}
            <div className={styles.section}>
              <div className={styles.sectionTitleRow}>
                <span className={styles.sectionTitle}>Email Body</span>
                <div className={styles.bodyTabs}>
                  <button
                    type="button"
                    className={`${styles.bodyTab} ${bodyMode === 'html' ? styles.bodyTabActive : ''}`}
                    onClick={() => setBodyMode('html')}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    className={`${styles.bodyTab} ${bodyMode === 'text' ? styles.bodyTabActive : ''}`}
                    onClick={() => setBodyMode('text')}
                  >
                    Plain Text
                  </button>
                </div>
              </div>

              {bodyMode === 'html' ? (
                <>
                  <p className={styles.hint}>
                    Write HTML directly. Use <code>{'{field}'}</code> merge
                    tokens.
                  </p>
                  <MergeTextInput
                    value={form.bodyHtml}
                    onChange={(v) => set('bodyHtml', v)}
                    placeholder={
                      '<p>Hi {firstName},</p>\n<p>Welcome to {company}!</p>'
                    }
                    rows={16}
                    extraFields={extraFields}
                  />
                </>
              ) : (
                <>
                  <p className={styles.hint}>
                    Plain-text fallback for email clients that don't render
                    HTML.
                  </p>
                  <MergeTextInput
                    value={form.bodyText}
                    onChange={(v) => set('bodyText', v)}
                    placeholder={
                      'Hi {firstName},\n\nWelcome to {company}!\n\nBest,\n{senderName}'
                    }
                    rows={12}
                    extraFields={extraFields}
                  />
                </>
              )}
            </div>

            {/* Active toggle */}
            <div className={styles.section}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={!!form.isActive}
                  onChange={(e) => set('isActive', e.target.checked)}
                  style={{
                    accentColor: 'var(--color-primary)',
                    width: 15,
                    height: 15,
                  }}
                />
                <span>Active — available for use in automations</span>
              </label>
            </div>
          </div>

          {/* ── Right panel: live preview ──────────────────────────────────── */}
          {showPreview && (
            <div className={styles.previewPanel}>
              <div className={styles.previewHeader}>
                <span className={styles.sectionTitle}>Preview</span>
                <div className={styles.bodyTabs}>
                  <button
                    type="button"
                    className={`${styles.bodyTab} ${bodyMode === 'html' ? styles.bodyTabActive : ''}`}
                    onClick={() => setBodyMode('html')}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    className={`${styles.bodyTab} ${bodyMode === 'text' ? styles.bodyTabActive : ''}`}
                    onClick={() => setBodyMode('text')}
                  >
                    Text
                  </button>
                </div>
              </div>
              <p
                className={styles.hint}
                style={{ padding: '0 var(--spacing-4)' }}
              >
                Merge fields shown with sample values
              </p>
              <LivePreview
                subject={form.subject}
                bodyHtml={form.bodyHtml}
                bodyText={form.bodyText}
                useHtml={bodyMode === 'html'}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
