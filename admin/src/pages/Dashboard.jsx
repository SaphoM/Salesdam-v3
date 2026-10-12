import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Database, Activity,
  TrendingUp, Clock, CheckCircle2, AlertTriangle,
  Zap, AlertCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api.js';
import StatCard from '../components/StatCard.jsx';
import Badge from '../components/Badge.jsx';
import './Dashboard.css';

const PLAN_COLORS = {
  free: '#64748b',
  starter: '#3b82f6',
  basic: '#6366f1',
  standard: '#6366f1',
  enterprise: '#f59e0b',
};

const PRIORITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#16a34a',
};

const PRIORITY_ICONS = {
  critical: <Zap size={14} />,
  high: <AlertCircle size={14} />,
  medium: <Clock size={14} />,
  low: <CheckCircle2 size={14} />,
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/superadmin/stats'),
      api.get('/incidents/admin/all?limit=5'),
    ])
      .then(([statsRes, incidentsRes]) => {
        setStats(statsRes.data.data);
        setIncidents(incidentsRes.data.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dash-loading">
        <span className="spinner" />
      </div>
    );
  }

  if (!stats) return <div className="dash-error">Failed to load stats.</div>;

  const { tenants, users, records, sessions, planDistribution, topTenants, recentActivity } = stats;

  const planData = (planDistribution || []).map((p) => ({
    name: p._id || 'unknown',
    value: p.count,
    fill: PLAN_COLORS[p._id] || '#64748b',
  }));

  const topTenantsBar = (topTenants || []).map((t) => ({
    name: t.name.length > 14 ? t.name.slice(0, 14) + '…' : t.name,
    users: t.userCount || 0,
    records: t.usage?.records || 0,
  }));

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-sub">Platform-wide metrics at a glance</p>
        </div>
      </div>

      {/* Stat grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Tenants"
          value={tenants.total}
          sub={`${tenants.active} active · ${tenants.suspended} suspended`}
          icon={Building2}
          color="accent"
        />
        <StatCard
          label="New This Month"
          value={tenants.newThisMonth}
          sub="tenants registered"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          label="Total Users"
          value={users.total}
          sub={`${users.active} active`}
          icon={Users}
          color="green"
        />
        <StatCard
          label="Total Records"
          value={records.total?.toLocaleString()}
          sub="across all tenants"
          icon={Database}
          color="yellow"
        />
        <StatCard
          label="Active Sessions"
          value={sessions.active}
          sub="live right now"
          icon={Activity}
          color="accent"
        />
        <StatCard
          label="Deleted Tenants"
          value={tenants.deleted}
          sub="soft-deleted"
          icon={CheckCircle2}
          color="red"
        />
      </div>

      <div className="charts-row">
        {/* Plan distribution */}
        <div className="chart-card">
          <div className="chart-card__title">Plan Distribution</div>
          {planData.length === 0 ? (
            <div className="chart-empty">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {planData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v, n) => [v, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="plan-legend">
            {planData.map((p) => (
              <div key={p.name} className="legend-item">
                <span className="legend-dot" style={{ background: p.fill }} />
                <span className="legend-label">{p.name}</span>
                <span className="legend-val">{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top tenants by users */}
        <div className="chart-card chart-card--wide">
          <div className="chart-card__title">Top Tenants by Users</div>
          {topTenantsBar.length === 0 ? (
            <div className="chart-empty">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topTenantsBar} margin={{ top: 4, right: 10, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
                <Bar dataKey="users" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="records" fill="var(--green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top tenants table */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">Top Tenants</span>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/tenants')}>View all</button>
        </div>
        <div className="tenant-list">
          {(topTenants || []).map((t) => (
            <div key={t._id} className="tenant-row" onClick={() => navigate(`/tenants/${t._id}`)}>
              <div className="tenant-name">{t.name}</div>
              <div className="tenant-meta">
                <Badge value={t.plan} />
                <Badge value={t.status} />
              </div>
              <div className="tenant-stats">
                <span><Users size={12} /> {t.userCount ?? 0} users</span>
                <span><Database size={12} /> {(t.usage?.records || 0).toLocaleString()} records</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="section-card">
        <div className="section-header">
          <div className="section-title-group">
            <AlertTriangle size={18} className="section-icon" />
            <span className="section-title">Recent Incidents</span>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/incidents')}>
            View all
          </button>
        </div>
        <div className="incidents-list">
          {incidents.length === 0 ? (
            <div className="incidents-empty">No incidents</div>
          ) : (
            incidents.map((incident) => (
              <div
                key={incident._id}
                className="incident-row"
                onClick={() => navigate('/incidents')}
              >
                <div className="incident-priority">
                  <span
                    className="priority-dot"
                    style={{ backgroundColor: PRIORITY_COLORS[incident.priority] }}
                    title={incident.priority}
                  />
                </div>
                <div className="incident-content">
                  <div className="incident-title">{incident.title}</div>
                  <div className="incident-meta">
                    <span className="incident-tenant">{incident.tenantId?.name || 'Unknown'}</span>
                    <span className="incident-reporter">
                      {incident.reportedBy?.firstName}
                    </span>
                  </div>
                </div>
                <div className="incident-status">
                  <span
                    className={`status-badge status-${incident.status}`}
                  >
                    {incident.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="incident-date">
                  {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">Recent Activity</span>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/audit-logs')}>View all</button>
        </div>
        <div className="activity-list">
          {(recentActivity || []).map((log) => (
            <div key={log._id} className="activity-row">
              <div className="activity-action">
                <span className="activity-dot" />
                <span className="activity-verb">{log.action}</span>
                <span className="activity-resource">{log.resource}</span>
              </div>
              <div className="activity-meta">
                <span className="activity-user">
                  {log.userId?.firstName} {log.userId?.lastName}
                </span>
                {log.tenantId?.name && (
                  <span className="activity-tenant">· {log.tenantId.name}</span>
                )}
                <span className="activity-time">
                  <Clock size={11} />
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
          {(recentActivity || []).length === 0 && (
            <div className="activity-empty">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}
