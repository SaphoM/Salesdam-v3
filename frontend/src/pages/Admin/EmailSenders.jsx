import React, { useEffect, useState } from 'react';
import {
  Mail,
  Plus,
  Edit2,
  Trash2,
  Send,
  Check,
  X,
  Shield,
  Users,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import Layout from '../../layout/Layout';
import styles from './EmailSenders.module.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  replyTo: '',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  isDefault: false,
  isActive: true,
  availableTo: 'all',
  allowedUserIds: [],
};

export default function EmailSenders() {
  const [senders, setSenders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = new
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testModalId, setTestModalId] = useState(null);
  const [showPass, setShowPass] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, uRes] = await Promise.all([
        api.get('/email-senders'),
        api.get('/users', { params: { limit: 200 } }),
      ]);
      setSenders(sRes.data.data || []);
      setUsers(uRes.data.data || []);
    } catch {
      toast.error('Failed to load email senders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowPass(false);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s._id);
    setForm({
      name: s.name,
      email: s.email,
      replyTo: s.replyTo || '',
      smtpHost: s.smtpHost || '',
      smtpPort: s.smtpPort || 587,
      smtpSecure: s.smtpSecure || false,
      smtpUser: '', // never pre-fill credentials
      smtpPass: '',
      isDefault: s.isDefault,
      isActive: s.isActive,
      availableTo: s.availableTo || 'all',
      allowedUserIds: (s.allowedUserIds || []).map((u) => u._id || u),
    });
    setShowPass(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Email address is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.smtpUser) delete payload.smtpUser;
      if (!payload.smtpPass) delete payload.smtpPass;
      if (payload.availableTo !== 'specific_users') payload.allowedUserIds = [];

      if (editing) {
        await api.put(`/email-senders/${editing}`, payload);
        toast.success('Email sender updated.');
      } else {
        await api.post('/email-senders', payload);
        toast.success('Email sender created.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/email-senders/${id}`);
      toast.success('Deleted.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTest = async () => {
    if (!testTo.trim()) {
      toast.error('Enter a recipient email.');
      return;
    }
    setTesting(true);
    try {
      await api.post(`/email-senders/${testModalId}/test`, { to: testTo });
      toast.success(`Test email sent to ${testTo}`);
      setTestModalId(null);
      setTestTo('');
    } catch (err) {
      toast.error(err.message || 'Test failed.');
    } finally {
      setTesting(false);
    }
  };

  const toggleUser = (userId) => {
    setForm((p) => ({
      ...p,
      allowedUserIds: p.allowedUserIds.includes(userId)
        ? p.allowedUserIds.filter((id) => id !== userId)
        : [...p.allowedUserIds, userId],
    }));
  };

  return (
    <Layout
      title="Email Senders"
      description="Configure outbound email addresses and SMTP settings"
    >
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Email Senders</h1>
            <p className={styles.subtitle}>
              Configure the email addresses that automations and users can send
              mail from. Each sender has its own SMTP connection and access
              controls.
            </p>
          </div>
          <Button icon={<Plus size={15} />} onClick={openNew}>
            New Sender
          </Button>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        ) : senders.length === 0 ? (
          <div className={styles.empty}>
            <Mail size={40} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No email senders configured</p>
            <p className={styles.emptyDesc}>
              Add an email sender to enable outbound mail in automations.
            </p>
            <Button icon={<Plus size={15} />} onClick={openNew}>
              Add First Sender
            </Button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name / Address</th>
                  <th>SMTP Host</th>
                  <th>Available To</th>
                  <th>Status</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {senders.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div className={styles.senderInfo}>
                        <div
                          className={styles.senderAvatar}
                          style={{
                            background: s.isDefault
                              ? '#fef3c7'
                              : 'var(--color-primary-light)',
                            color: s.isDefault
                              ? '#b45309'
                              : 'var(--color-primary)',
                          }}
                        >
                          <Mail size={15} />
                        </div>
                        <div>
                          <div className={styles.senderName}>
                            {s.name}
                            {s.isDefault && (
                              <span className={styles.defaultBadge}>
                                <Star size={10} /> Default
                              </span>
                            )}
                          </div>
                          <div className={styles.senderEmail}>{s.email}</div>
                          {s.replyTo && (
                            <div className={styles.senderReply}>
                              Reply-to: {s.replyTo}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {s.smtpHost ? (
                        <span className={styles.smtpInfo}>
                          {s.smtpHost}:{s.smtpPort || 587}{' '}
                          {s.smtpSecure && (
                            <span className={styles.tlsBadge}>TLS</span>
                          )}
                        </span>
                      ) : (
                        <span className={styles.noSmtp}>Env vars</span>
                      )}
                    </td>
                    <td>
                      {s.availableTo === 'all' ? (
                        <span
                          className={styles.pill}
                          style={{ background: '#dcfce7', color: '#166534' }}
                        >
                          <Users size={11} /> All users
                        </span>
                      ) : (
                        <span
                          className={styles.pill}
                          style={{ background: '#eff6ff', color: '#1d4ed8' }}
                        >
                          <Shield size={11} /> {(s.allowedUserIds || []).length}{' '}
                          user{(s.allowedUserIds || []).length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={styles.pill}
                        style={{
                          background: s.isActive ? '#dcfce7' : '#fee2e2',
                          color: s.isActive ? '#166534' : '#991b1b',
                        }}
                      >
                        {s.isActive ? (
                          <>
                            <Check size={11} /> Active
                          </>
                        ) : (
                          <>
                            <X size={11} /> Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          className={styles.btnIcon}
                          title="Send test email"
                          onClick={() => {
                            setTestModalId(s._id);
                            setTestTo('');
                          }}
                        >
                          <Send size={13} />
                        </button>
                        <button
                          className={styles.btnIcon}
                          title="Edit"
                          onClick={() => openEdit(s)}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className={`${styles.btnIcon} ${styles.danger}`}
                          title="Delete"
                          onClick={() => handleDelete(s._id, s.name)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Create / Edit Modal ── */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Edit Email Sender' : 'New Email Sender'}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button loading={saving} onClick={handleSave}>
                {editing ? 'Save Changes' : 'Create Sender'}
              </Button>
            </>
          }
        >
          <div className={styles.formGrid}>
            {/* Identity */}
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Identity</h4>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Display Name *</label>
                  <input
                    className={styles.input}
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Support Team"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>From Email Address *</label>
                  <input
                    className={styles.input}
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="support@company.com"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Reply-To <span className={styles.opt}>(optional)</span>
                  </label>
                  <input
                    className={styles.input}
                    type="email"
                    value={form.replyTo}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, replyTo: e.target.value }))
                    }
                    placeholder="noreply@company.com"
                  />
                </div>
              </div>
            </div>

            {/* SMTP */}
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>SMTP Connection</h4>
              <p className={styles.sectionHint}>
                Leave blank to use the server's default SMTP environment
                variables.
              </p>
              <div className={styles.row}>
                <div className={styles.field} style={{ flex: 2 }}>
                  <label className={styles.label}>SMTP Host</label>
                  <input
                    className={styles.input}
                    value={form.smtpHost}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, smtpHost: e.target.value }))
                    }
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className={styles.field} style={{ flex: 1 }}>
                  <label className={styles.label}>Port</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={form.smtpPort}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        smtpPort: parseInt(e.target.value) || 587,
                      }))
                    }
                  />
                </div>
                <div className={styles.field} style={{ flex: 1 }}>
                  <label className={styles.label}>TLS / SSL</label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.smtpSecure}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, smtpSecure: e.target.checked }))
                      }
                    />
                    Secure (port 465)
                  </label>
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>SMTP Username</label>
                  <input
                    className={styles.input}
                    value={form.smtpUser}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, smtpUser: e.target.value }))
                    }
                    placeholder="your@email.com"
                    autoComplete="off"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>
                    SMTP Password
                    {editing && (
                      <span className={styles.opt}>
                        {' '}
                        (leave blank to keep existing)
                      </span>
                    )}
                  </label>
                  <div className={styles.passwordRow}>
                    <input
                      className={styles.input}
                      type={showPass ? 'text' : 'password'}
                      value={form.smtpPass}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, smtpPass: e.target.value }))
                      }
                      placeholder={
                        editing ? '••••••••' : 'App password or SMTP password'
                      }
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPass((s) => !s)}
                    >
                      {showPass ? <X size={14} /> : <Check size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Options</h4>
              <div className={styles.checkRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isDefault: e.target.checked }))
                    }
                  />
                  <span>Set as workspace default</span>
                  <span className={styles.opt}>
                    {' '}
                    — used when no sender is explicitly chosen
                  </span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isActive: e.target.checked }))
                    }
                  />
                  Active
                </label>
              </div>
            </div>

            {/* Access control */}
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Access Control</h4>
              <div className={styles.field}>
                <label className={styles.label}>
                  Make this sender available to
                </label>
                <select
                  className={styles.select}
                  value={form.availableTo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, availableTo: e.target.value }))
                  }
                >
                  <option value="all">All users in the workspace</option>
                  <option value="specific_users">Specific users only</option>
                </select>
              </div>

              {form.availableTo === 'specific_users' && (
                <div className={styles.userList}>
                  <p className={styles.sectionHint}>
                    Select which users can send from this address:
                  </p>
                  <div className={styles.userGrid}>
                    {users.map((u) => {
                      const checked = form.allowedUserIds.includes(u._id);
                      return (
                        <label
                          key={u._id}
                          className={`${styles.userChip} ${checked ? styles.userChipActive : ''}`}
                          onClick={() => toggleUser(u._id)}
                        >
                          <div className={styles.userAvatar}>
                            {u.firstName?.[0]}
                            {u.lastName?.[0]}
                          </div>
                          <div className={styles.userInfo}>
                            <span className={styles.userName}>
                              {u.firstName} {u.lastName}
                            </span>
                            <span className={styles.userEmail}>{u.email}</span>
                          </div>
                          {checked && (
                            <Check size={14} className={styles.userCheck} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {users.length === 0 && (
                    <p className={styles.sectionHint}>No users found.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* ── Test Email Modal ── */}
        <Modal
          isOpen={!!testModalId}
          onClose={() => setTestModalId(null)}
          title="Send Test Email"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setTestModalId(null)}>
                Cancel
              </Button>
              <Button
                icon={<Send size={14} />}
                loading={testing}
                onClick={handleTest}
              >
                Send Test
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p
              style={{
                fontSize: 13,
                color: 'var(--color-gray-600)',
                margin: 0,
              }}
            >
              A test email will be sent using this sender's SMTP settings to
              verify the configuration is working.
            </p>
            <div className={styles.field}>
              <label className={styles.label}>Recipient email address</label>
              <input
                className={styles.input}
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              />
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
