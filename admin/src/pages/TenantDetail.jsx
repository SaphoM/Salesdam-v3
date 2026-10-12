import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Edit2, Trash2, PauseCircle, PlayCircle, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../services/api.js';
import Badge from '../components/Badge.jsx';
import Table from '../components/Table.jsx';
import Modal from '../components/Modal.jsx';
import './Page.css';
import './TenantDetail.css';

const PLANS = ['free', 'starter', 'basic', 'standard', 'enterprise'];
const PLAN_LIMITS = {
  free:       { maxUsers: 1,  maxRecords: 1000,   maxObjects: 5,   maxAutomations: 2   },
  starter:    { maxUsers: 1,  maxRecords: 5000,   maxObjects: 10,  maxAutomations: 5   },
  basic:      { maxUsers: 3,  maxRecords: 10000,  maxObjects: 15,  maxAutomations: 10  },
  standard:   { maxUsers: 10, maxRecords: 50000,  maxObjects: 30,  maxAutomations: 25  },
  enterprise: { maxUsers: 20, maxRecords: 200000, maxObjects: 100, maxAutomations: 100 },
};

function UsageBar({ label, used, max }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const cls = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : '';
  return (
    <div className="usage-bar-wrap">
      <div className="usage-bar-label">
        <span>{label}</span>
        <span>{used?.toLocaleString()} / {max?.toLocaleString()}</span>
      </div>
      <div className="usage-bar">
        <div className={`usage-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null); // { action, label }
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, uRes] = await Promise.all([
        api.get(`/superadmin/tenants/${id}`),
        api.get(`/superadmin/tenants/${id}/users`),
      ]);
      setTenant(tRes.data.data);
      setUsers(uRes.data.data || []);
    } catch {
      toast.error('Failed to load tenant');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    setEditForm({
      name: tenant.name,
      plan: tenant.plan,
      'settings.timezone': tenant.settings?.timezone || 'UTC',
      'settings.currency': tenant.settings?.currency || 'USD',
      'settings.language': tenant.settings?.language || 'en',
      maxUsers: tenant.limits?.maxUsers,
      maxRecords: tenant.limits?.maxRecords,
      maxObjects: tenant.limits?.maxObjects,
      maxAutomations: tenant.limits?.maxAutomations,
      aiOnboarding: tenant.features?.aiOnboarding,
      customObjects: tenant.features?.customObjects,
      automations: tenant.features?.automations,
      analytics: tenant.features?.analytics,
      apiAccess: tenant.features?.apiAccess,
      webhooks: tenant.features?.webhooks,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const planLimits = PLAN_LIMITS[editForm.plan] || {};
      await api.put(`/superadmin/tenants/${id}`, {
        name: editForm.name,
        plan: editForm.plan,
        settings: {
          timezone: editForm['settings.timezone'],
          currency: editForm['settings.currency'],
          language: editForm['settings.language'],
        },
        limits: {
          maxUsers: Number(editForm.maxUsers) || planLimits.maxUsers,
          maxRecords: Number(editForm.maxRecords) || planLimits.maxRecords,
          maxObjects: Number(editForm.maxObjects) || planLimits.maxObjects,
          maxAutomations: Number(editForm.maxAutomations) || planLimits.maxAutomations,
        },
        features: {
          aiOnboarding: editForm.aiOnboarding,
          customObjects: editForm.customObjects,
          automations: editForm.automations,
          analytics: editForm.analytics,
          apiAccess: editForm.apiAccess,
          webhooks: editForm.webhooks,
        },
      });
      toast.success('Tenant updated');
      setEditing(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action) => {
    setWorking(true);
    try {
      if (action === 'suspend') {
        await api.patch(`/superadmin/tenants/${id}/suspend`);
        toast.success('Tenant suspended');
      } else if (action === 'activate') {
        await api.patch(`/superadmin/tenants/${id}/activate`);
        toast.success('Tenant activated');
      } else if (action === 'delete') {
        await api.delete(`/superadmin/tenants/${id}`);
        toast.success('Tenant deleted');
        navigate('/tenants');
        return;
      }
      setShowConfirm(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setWorking(false);
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      await api.patch(`/superadmin/tenants/${id}/users/${userId}/status`, { status });
      toast.success('User status updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <div className="list-loading"><span className="spinner" /></div>;
  if (!tenant) return <div style={{ color: 'var(--text3)', padding: 20 }}>Tenant not found.</div>;

  const { userStats = {}, recordCount = 0 } = tenant;

  const userColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (u) => (
        <div>
          <div style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</div>
        </div>
      ),
    },
    {
      key: 'systemRole',
      label: 'Role',
      width: 100,
      render: (u) => <Badge value={u.systemRole} />,
    },
    {
      key: 'status',
      label: 'Status',
      width: 100,
      render: (u) => <Badge value={u.status} />,
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      width: 130,
      render: (u) => u.lastLogin
        ? <span style={{ fontSize: 12, color: 'var(--text3)' }}>{format(new Date(u.lastLogin), 'dd MMM yyyy')}</span>
        : <span style={{ fontSize: 12, color: 'var(--text3)' }}>Never</span>,
    },
    {
      key: 'actions',
      label: '',
      width: 120,
      render: (u) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {u.status !== 'active' && (
            <button
              className="btn btn-sm btn-success"
              onClick={(e) => { e.stopPropagation(); updateUserStatus(u._id, 'active'); }}
            >
              Activate
            </button>
          )}
          {u.status === 'active' && (
            <button
              className="btn btn-sm btn-warning"
              onClick={(e) => { e.stopPropagation(); updateUserStatus(u._id, 'suspended'); }}
            >
              Suspend
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="detail-back" onClick={() => navigate('/tenants')}>
        <ChevronLeft size={16} /> Back to Tenants
      </div>

      <div className="detail-header">
        <div>
          <div className="detail-title-row">
            <h1 className="detail-title">{tenant.name}</h1>
            <Badge value={tenant.status} />
            <Badge value={tenant.plan} />
          </div>
          <div className="detail-meta">
            /{tenant.slug} · Created {format(new Date(tenant.createdAt), 'dd MMM yyyy')}
          </div>
        </div>
        <div className="detail-actions">
          {!editing ? (
            <button className="btn btn-secondary btn-sm" onClick={startEdit}>
              <Edit2 size={14} /> Edit
            </button>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                <X size={14} /> Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
          {tenant.status === 'active' && (
            <button
              className="btn btn-warning btn-sm"
              onClick={() => setShowConfirm({ action: 'suspend', label: 'Suspend Tenant' })}
            >
              <PauseCircle size={14} /> Suspend
            </button>
          )}
          {tenant.status === 'suspended' && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => setShowConfirm({ action: 'activate', label: 'Activate Tenant' })}
            >
              <PlayCircle size={14} /> Activate
            </button>
          )}
          {tenant.status !== 'deleted' && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowConfirm({ action: 'delete', label: 'Delete Tenant' })}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Usage summary */}
      <div className="info-grid">
        <div className="info-card">
          <div className="info-card__label">Users</div>
          <div className="info-card__value">{userStats.total ?? 0}</div>
          <div className="info-card__sub">{userStats.active ?? 0} active · {userStats.admin ?? 0} admin</div>
        </div>
        <div className="info-card">
          <div className="info-card__label">Records</div>
          <div className="info-card__value">{(recordCount || 0).toLocaleString()}</div>
          <div className="info-card__sub">of {(tenant.limits?.maxRecords || 0).toLocaleString()} limit</div>
        </div>
        <div className="info-card">
          <div className="info-card__label">Objects</div>
          <div className="info-card__value">{tenant.usage?.objects ?? 0}</div>
          <div className="info-card__sub">of {tenant.limits?.maxObjects ?? 0} limit</div>
        </div>
        <div className="info-card">
          <div className="info-card__label">Storage</div>
          <div className="info-card__value">{(tenant.usage?.storageUsedMB ?? 0).toFixed(1)} MB</div>
          <div className="info-card__sub">of {tenant.limits?.storageGB ?? 1} GB</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'users', 'limits', 'features'].map((t) => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="section-box">
          <div className="section-box-header"><span className="section-box-title">Details</span></div>
          <div className="section-box-body">
            {editing ? (
              <div className="fields-grid">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Plan</label>
                  <select className="form-select" value={editForm.plan || 'free'} onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}>
                    {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <input className="form-input" value={editForm['settings.timezone'] || ''} onChange={(e) => setEditForm({ ...editForm, 'settings.timezone': e.target.value })} placeholder="UTC" />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <input className="form-input" value={editForm['settings.currency'] || ''} onChange={(e) => setEditForm({ ...editForm, 'settings.currency': e.target.value })} placeholder="USD" />
                </div>
                <div className="form-group">
                  <label className="form-label">Language</label>
                  <input className="form-input" value={editForm['settings.language'] || ''} onChange={(e) => setEditForm({ ...editForm, 'settings.language': e.target.value })} placeholder="en" />
                </div>
              </div>
            ) : (
              <div className="fields-grid">
                {[
                  ['Name', tenant.name],
                  ['Slug', `/${tenant.slug}`],
                  ['Plan', tenant.plan],
                  ['Status', tenant.status],
                  ['Timezone', tenant.settings?.timezone],
                  ['Currency', tenant.settings?.currency],
                  ['Language', tenant.settings?.language],
                  ['Domain', tenant.domain || '—'],
                  ['Phone', tenant.phone || '—'],
                  ['Employees', tenant.numberOfEmployees || '—'],
                  ['Created', format(new Date(tenant.createdAt), 'dd MMM yyyy HH:mm')],
                  ['Updated', format(new Date(tenant.updatedAt), 'dd MMM yyyy HH:mm')],
                ].map(([label, val]) => (
                  <div key={label} className="field-row">
                    <div className="field-label">{label}</div>
                    <div className="field-value" style={{ textTransform: 'capitalize' }}>{val || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div>
          <Table columns={userColumns} rows={users} emptyMsg="No users for this tenant" />
        </div>
      )}

      {/* Limits tab */}
      {tab === 'limits' && (
        <div className="section-box">
          <div className="section-box-header"><span className="section-box-title">Usage &amp; Limits</span></div>
          <div className="section-box-body">
            {editing ? (
              <div className="fields-grid">
                {['maxUsers', 'maxRecords', 'maxObjects', 'maxAutomations'].map((key) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{key}</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editForm[key] ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="usage-bars">
                <UsageBar label="Users" used={userStats.total ?? 0} max={tenant.limits?.maxUsers ?? 0} />
                <UsageBar label="Records" used={recordCount ?? 0} max={tenant.limits?.maxRecords ?? 0} />
                <UsageBar label="Objects" used={tenant.usage?.objects ?? 0} max={tenant.limits?.maxObjects ?? 0} />
                <UsageBar label="Automations" used={tenant.usage?.automations ?? 0} max={tenant.limits?.maxAutomations ?? 0} />
                <UsageBar
                  label="Storage (MB)"
                  used={tenant.usage?.storageUsedMB ?? 0}
                  max={(tenant.limits?.storageGB ?? 1) * 1024}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Features tab */}
      {tab === 'features' && (
        <div className="section-box">
          <div className="section-box-header"><span className="section-box-title">Feature Flags</span></div>
          <div className="section-box-body">
            <div className="features-grid">
              {Object.entries(tenant.features || {}).map(([key, val]) => (
                <div key={key} className="feature-row">
                  <div className="feature-info">
                    <div className="feature-key">{key}</div>
                  </div>
                  {editing ? (
                    <input
                      type="checkbox"
                      checked={!!editForm[key]}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.checked })}
                      className="feature-toggle"
                    />
                  ) : (
                    <span className={`feature-status ${val ? 'on' : 'off'}`}>
                      {val ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm action modal */}
      {showConfirm && (
        <Modal title={showConfirm.label} onClose={() => setShowConfirm(null)} width={400}>
          <p style={{ color: 'var(--text2)', marginBottom: 20, fontSize: 14 }}>
            Are you sure you want to <strong>{showConfirm.action}</strong> tenant <strong>{tenant.name}</strong>?
            {showConfirm.action === 'delete' && (
              <span style={{ color: 'var(--red)', display: 'block', marginTop: 6 }}>
                This will soft-delete the tenant. It cannot be undone easily.
              </span>
            )}
          </p>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setShowConfirm(null)}>
              Cancel
            </button>
            <button
              className={`btn ${showConfirm.action === 'delete' ? 'btn-danger' : showConfirm.action === 'suspend' ? 'btn-warning' : 'btn-success'}`}
              onClick={() => runAction(showConfirm.action)}
              disabled={working}
            >
              {working ? 'Working…' : `Yes, ${showConfirm.action}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
