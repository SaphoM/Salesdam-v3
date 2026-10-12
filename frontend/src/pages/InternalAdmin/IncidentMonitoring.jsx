import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Filter,
  Search,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import styles from './IncidentMonitoring.module.css';

const STATUS_COLORS = {
  open: '#dc2626',
  in_progress: '#2563eb',
  resolved: '#16a34a',
  closed: '#6b7280',
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#16a34a',
};

export default function IncidentMonitoring() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['internal-incidents', search, statusFilter, priorityFilter],
    queryFn: async () => {
      const res = await api.get('/incidents', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          limit: 1000,
        },
      });
      return res.data?.data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ incidentId, status }) => {
      const res = await api.patch(`/incidents/${incidentId}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-incidents'] });
      toast.success('Incident updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update'),
  });

  const stats = {
    total: incidents?.length || 0,
    open: incidents?.filter((i) => i.status === 'open').length || 0,
    inProgress: incidents?.filter((i) => i.status === 'in_progress').length || 0,
    critical: incidents?.filter((i) => i.priority === 'critical').length || 0,
  };

  if (isLoading) {
    return (
      <Layout title="Incident Monitoring">
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Incident Monitoring"
      description="Monitor and manage platform incidents"
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Incident Monitoring</h1>
            <p className={styles.subtitle}>
              Platform-wide incident tracking and management
            </p>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <AlertTriangle size={24} color="#dc2626" />
              <span className={styles.statLabel}>Total Incidents</span>
            </div>
            <p className={styles.statValue}>{stats.total}</p>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <Clock size={24} color="#ea580c" />
              <span className={styles.statLabel}>Open</span>
            </div>
            <p className={styles.statValue}>{stats.open}</p>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <TrendingUp size={24} color="#2563eb" />
              <span className={styles.statLabel}>In Progress</span>
            </div>
            <p className={styles.statValue}>{stats.inProgress}</p>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <AlertTriangle size={24} color="#dc2626" />
              <span className={styles.statLabel}>Critical</span>
            </div>
            <p className={styles.statValue}>{stats.critical}</p>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Incidents Table */}
        {incidents && incidents.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Tenant</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reported By</th>
                  <th>Upvotes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident._id}>
                    <td className={styles.titleCell}>
                      <span
                        className={styles.priorityDot}
                        style={{ backgroundColor: PRIORITY_COLORS[incident.priority] }}
                      />
                      {incident.title}
                      {incident.isEdited && <span className={styles.editedTag}>Edited</span>}
                    </td>
                    <td>{incident.tenantId?.name || 'Unknown'}</td>
                    <td>
                      <span
                        className={styles.priorityBadge}
                        style={{ backgroundColor: PRIORITY_COLORS[incident.priority] + '20' }}
                      >
                        {incident.priority}
                      </span>
                    </td>
                    <td>
                      <select
                        value={incident.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            incidentId: incident._id,
                            status: e.target.value,
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                        className={styles.statusSelect}
                        style={{ borderLeftColor: STATUS_COLORS[incident.status] }}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td>
                      {incident.reportedBy?.firstName} {incident.reportedBy?.lastName}
                    </td>
                    <td>{incident.upvoteCount}</td>
                    <td>
                      <Button
                        size="xs"
                        onClick={() =>
                          window.open(`/incidents/${incident._id}`, '_blank')
                        }
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <CheckCircle size={48} />
            <p>No incidents found</p>
            <span className={styles.emptySubtext}>All systems operational</span>
          </div>
        )}
      </div>
    </Layout>
  );
}
