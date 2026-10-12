import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getIncidents,
  updateIncident,
} from '../../services/api/incidents';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import styles from './IncidentManagement.module.css';

const STATUS_BADGES = {
  open: { bg: '#fecaca', color: '#991b1b', label: 'Open' },
  in_progress: { bg: '#bfdbfe', color: '#1e40af', label: 'In Progress' },
  resolved: { bg: '#bbf7d0', color: '#166534', label: 'Resolved' },
  closed: { bg: '#e5e7eb', color: '#374151', label: 'Closed' },
};

const PRIORITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#16a34a',
};

export default function IncidentManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-incidents', statusFilter, priorityFilter],
    queryFn: async () => {
      const res = await getIncidents({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        limit: 100,
      });
      return res.data?.data || [];
    },
  });

  const incidents = data || [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => updateIncident(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident status updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update'),
  });

  const unresolvedCount = incidents.filter(
    (i) => i.status !== 'resolved' && i.status !== 'closed'
  ).length;

  const stats = [
    {
      label: 'Total Incidents',
      value: incidents.length,
      color: '#6366f1',
    },
    {
      label: 'Unresolved',
      value: unresolvedCount,
      color: '#dc2626',
    },
    {
      label: 'In Progress',
      value: incidents.filter((i) => i.status === 'in_progress').length,
      color: '#2563eb',
    },
    {
      label: 'Critical Priority',
      value: incidents.filter((i) => i.priority === 'critical').length,
      color: '#ea580c',
    },
  ];

  return (
    <Layout title="Incident Management" description="Manage and investigate incidents">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Incident Management</h1>
          <p className={styles.subtitle}>
            Monitor and manage all reported incidents
          </p>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statCard}>
              <p className={styles.statLabel}>{stat.label}</p>
              <p
                className={styles.statValue}
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className={styles.filterBar}>
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
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        ) : incidents.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No incidents found</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reporter</th>
                  <th>Upvotes</th>
                  <th>Comments</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident._id}>
                    <td className={styles.titleCell}>
                      <div className={styles.titleContent}>
                        <div
                          className={styles.priorityIndicator}
                          style={{ backgroundColor: PRIORITY_COLORS[incident.priority] }}
                        />
                        <span>{incident.title}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.priorityBadge}>
                        {incident.priority.charAt(0).toUpperCase() + incident.priority.slice(1)}
                      </span>
                    </td>
                    <td>
                      <select
                        value={incident.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            id: incident._id,
                            status: e.target.value,
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                        className={styles.statusSelect}
                        style={{
                          backgroundColor: STATUS_BADGES[incident.status]?.bg,
                          color: STATUS_BADGES[incident.status]?.color,
                        }}
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
                    <td className={styles.centered}>{incident.upvoteCount || 0}</td>
                    <td className={styles.centered}>{incident.comments?.length || 0}</td>
                    <td className={styles.dateCell}>
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Button
                        size="xs"
                        onClick={() => window.location.href = `/incidents/${incident._id}`}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
