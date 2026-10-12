import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Share2,
  Trash2,
  RefreshCw,
  Globe,
  Lock,
  Users,
  Filter,
  X,
  Plus,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthContext } from '../../context/AuthContext';
import Button from '../../components/common/Button/Button';
import WidgetCard from '../../components/dashboard/WidgetCard';
import ShareModal from '../../components/dashboard/ShareModal';
import Layout from '../../layout/Layout';
import styles from './DashboardView.module.css';

const UNIVERSAL_FIELDS = [
  { value: 'owner', label: 'Owner' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Updated Date' },
];

const DATE_FORMULAS = [
  { value: '$today', label: 'Today' },
  { value: '$yesterday', label: 'Yesterday' },
  { value: '$thisWeek', label: 'This Week' },
  { value: '$last7days', label: 'Last 7 Days' },
  { value: '$thisMonth', label: 'This Month' },
  { value: '$last30days', label: 'Last 30 Days' },
  { value: '$lastMonth', label: 'Last Month' },
  { value: '$thisQuarter', label: 'This Quarter' },
  { value: '$lastQuarter', label: 'Last Quarter' },
  { value: '$thisYear', label: 'This Year' },
  { value: '$lastYear', label: 'Last Year' },
];

const DATE_OPERATORS = [
  { value: 'is', label: 'is' },
  { value: 'before', label: 'before' },
  { value: 'after', label: 'after' },
  { value: 'between', label: 'between' },
];

const ACCESS_BADGE = {
  private: { icon: <Lock size={11} />, label: 'Private', cls: 'private' },
  workspace: {
    icon: <Globe size={11} />,
    label: 'Workspace',
    cls: 'workspace',
  },
  roles: { icon: <Users size={11} />, label: 'Roles', cls: 'roles' },
  users: { icon: <Users size={11} />, label: 'Users', cls: 'users' },
};

function makeChip(field = 'owner') {
  return {
    id: Date.now() + Math.random(),
    field,
    operator: 'is',
    value: '',
    value2: '',
  };
}

export default function DashboardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [dash, setDash] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [members, setMembers] = useState([]);
  const [chips, setChips] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dashRes, membersRes] = await Promise.all([
        api.get(`/dashboards/${id}`),
        api.get('/dashboards/members'),
      ]);
      const dashData = dashRes.data.data;
      setDash(dashData);
      setCanEdit(dashRes.data.canEdit);
      setMembers(membersRes.data.data || []);
      // Load saved filters
      const saved = dashData.savedFilters || [];
      setChips(
        saved.length
          ? saved.map((f) => ({ ...f, id: Date.now() + Math.random() }))
          : [],
      );
    } catch {
      toast.error('Dashboard not found');
      navigate('/dashboards');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this dashboard?')) return;
    try {
      await api.delete(`/dashboards/${id}`);
      toast.success('Deleted');
      navigate('/dashboards');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleShareSave = async (sharing) => {
    await api.put(`/dashboards/${id}/sharing`, sharing);
    toast.success('Sharing updated');
    setShareOpen(false);
    load();
  };

  const handleSaveFilters = async () => {
    setSaving(true);
    try {
      const toSave = chips
        .filter((c) => c.field && c.value)
        .map(({ field, operator, value, value2 }) => ({
          field,
          operator,
          value,
          value2,
        }));
      await api.put(`/dashboards/${id}`, { savedFilters: toSave });
      toast.success('Filters saved');
    } catch {
      toast.error('Failed to save filters');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Layout
        title="Dashboard"
        description="View your dashboard charts and widgets"
      >
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      </Layout>
    );
  if (!dash) return null;

  const access = ACCESS_BADGE[dash.sharing?.access || 'private'];
  const sortedWidgets = [...(dash.widgets || [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );

  // ─── Chip management ────────────────────────────────────────────────────────
  const addChip = () => {
    setChips((prev) => [...prev, makeChip('owner')]);
  };

  const removeChip = (chipId) =>
    setChips((prev) => prev.filter((c) => c.id !== chipId));

  const updateChip = (chipId, patch) =>
    setChips((prev) =>
      prev.map((c) => (c.id === chipId ? { ...c, ...patch } : c)),
    );

  // Non-owner fields can only appear once; owner can appear multiple times
  const usedSingletons = chips
    .filter((c) => c.field !== 'owner')
    .map((c) => c.field);

  const allSingletonsUsed = UNIVERSAL_FIELDS.filter(
    (f) => f.value !== 'owner',
  ).every((f) => usedSingletons.includes(f.value));

  const canAddMore = !allSingletonsUsed || true; // owner is always addable

  // ─── Merge into widget config ────────────────────────────────────────────────
  function mergeFilters(widget) {
    const active = chips.filter((c) => c.field && c.value !== '');
    if (active.length === 0) return widget;
    const merged = { ...widget, config: { ...widget.config } };
    // Pass as array for the new backend format, but keep widget's own filters
    const existingFilters = Array.isArray(widget.config?.filters)
      ? widget.config.filters
      : Object.entries(widget.config?.filters || {}).map(([field, value]) => ({
          field,
          operator: 'is',
          value,
          value2: '',
        }));
    merged.config.filters = [
      ...existingFilters,
      ...active.map(({ field, operator, value, value2 }) => ({
        field,
        operator,
        value,
        value2,
      })),
    ];
    return merged;
  }

  const hasUnsaved = (() => {
    const saved = dash.savedFilters || [];
    const current = chips
      .filter((c) => c.field && c.value)
      .map(({ field, operator, value, value2 }) => ({
        field,
        operator,
        value,
        value2,
      }));
    return JSON.stringify(saved) !== JSON.stringify(current);
  })();

  return (
    <Layout
      title="Dashboard"
      description="View your dashboard charts and widgets"
    >
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <Link to="/dashboards" className={styles.backLink}>
            <ArrowLeft size={16} /> Dashboards
          </Link>
          <div className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <div
                className={styles.dashIcon}
                style={{
                  background: `${dash.color || '#6366f1'}20`,
                  color: dash.color || '#6366f1',
                }}
              >
                <span style={{ fontSize: 20 }}>📊</span>
              </div>
              <div>
                <h1 className={styles.title}>{dash.name}</h1>
                {dash.description && (
                  <p className={styles.desc}>{dash.description}</p>
                )}
              </div>
              <span className={`${styles.badge} ${styles[access.cls]}`}>
                {access.icon} {access.label}
              </span>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.iconBtn}
                title="Refresh widgets"
                onClick={() => setRefreshKey((k) => k + 1)}
              >
                <RefreshCw size={16} />
              </button>
              <button
                className={styles.iconBtn}
                title="Add filter"
                onClick={addChip}
              >
                <Filter size={16} />
              </button>
              <button
                className={styles.iconBtn}
                title="Sharing settings"
                onClick={() => setShareOpen(true)}
              >
                <Share2 size={16} />
              </button>
              {canEdit && (
                <>
                  <Link to={`/dashboards/${id}/edit`}>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Edit2 size={13} />}
                    >
                      Edit
                    </Button>
                  </Link>
                  <button
                    className={`${styles.iconBtn} ${styles.danger}`}
                    title="Delete"
                    onClick={handleDelete}
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        {chips.length > 0 && (
          <div className={styles.filterBar}>
            <span className={styles.filterBarLabel}>
              <Filter size={13} /> Filters
            </span>
            {chips.map((chip, i) => {
              const isOwner = chip.field === 'owner';
              const isDate =
                chip.field === 'createdAt' || chip.field === 'updatedAt';
              const siblingFields = chips
                .filter((c) => c.id !== chip.id && c.field !== 'owner')
                .map((c) => c.field);

              return (
                <div key={chip.id} className={styles.filterChip}>
                  {i > 0 && <span className={styles.filterAnd}>AND</span>}

                  {/* Field selector */}
                  <select
                    className={styles.filterSelect}
                    value={chip.field}
                    onChange={(e) =>
                      updateChip(chip.id, {
                        field: e.target.value,
                        value: '',
                        value2: '',
                        operator: 'is',
                      })
                    }
                  >
                    {UNIVERSAL_FIELDS.map((f) => (
                      <option
                        key={f.value}
                        value={f.value}
                        disabled={
                          f.value !== 'owner' && siblingFields.includes(f.value)
                        }
                      >
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {/* Operator */}
                  {isDate && (
                    <select
                      className={styles.filterSelect}
                      value={chip.operator}
                      onChange={(e) =>
                        updateChip(chip.id, {
                          operator: e.target.value,
                          value2: '',
                        })
                      }
                    >
                      {DATE_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Value */}
                  {isOwner ? (
                    <select
                      className={styles.filterSelect}
                      value={chip.value}
                      onChange={(e) =>
                        updateChip(chip.id, { value: e.target.value })
                      }
                    >
                      <option value="">Any owner</option>
                      <option value="$currentUser">
                        Me — {user?.firstName} {user?.lastName}
                      </option>
                      {members
                        .filter(
                          (m) => m._id.toString() !== user?._id?.toString(),
                        )
                        .map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.firstName} {m.lastName}
                          </option>
                        ))}
                    </select>
                  ) : isDate ? (
                    <>
                      <select
                        className={styles.filterSelect}
                        value={chip.value}
                        onChange={(e) =>
                          updateChip(chip.id, { value: e.target.value })
                        }
                      >
                        <option value="">Any date</option>
                        {DATE_FORMULAS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      {chip.operator === 'between' && (
                        <>
                          <span className={styles.filterEq}>and</span>
                          <select
                            className={styles.filterSelect}
                            value={chip.value2}
                            onChange={(e) =>
                              updateChip(chip.id, { value2: e.target.value })
                            }
                          >
                            <option value="">end date</option>
                            {DATE_FORMULAS.map((d) => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </>
                  ) : null}

                  <button
                    className={styles.filterRemove}
                    onClick={() => removeChip(chip.id)}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            <button className={styles.addFilterBtn} onClick={addChip}>
              <Plus size={12} /> Add
            </button>

            {hasUnsaved && (
              <button
                className={styles.saveFiltersBtn}
                onClick={handleSaveFilters}
                disabled={saving}
              >
                <Save size={12} /> {saving ? 'Saving…' : 'Save filters'}
              </button>
            )}

            <button
              className={styles.clearFiltersBtn}
              onClick={() => setChips([])}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Widget grid */}
        {sortedWidgets.length === 0 ? (
          <div className={styles.empty}>
            <p>This dashboard has no widgets yet.</p>
            {canEdit && (
              <Link to={`/dashboards/${id}/edit`}>
                <Button icon={<Edit2 size={14} />}>Add Widgets</Button>
              </Link>
            )}
          </div>
        ) : (
          <div
            key={`${refreshKey}-${JSON.stringify(chips)}`}
            className={styles.grid}
          >
            {sortedWidgets.map((w) => (
              <WidgetCard
                key={w.widgetId}
                widget={mergeFilters(w)}
                editing={false}
              />
            ))}
          </div>
        )}

        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          sharing={dash.sharing}
          onSave={handleShareSave}
        />
      </div>
    </Layout>
  );
}
