import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Plus, Search, X, AlertTriangle, ThumbsUp, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import styles from './IncidentList.module.css';

const PRIORITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#16a34a',
};

const PRIORITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const STATUS_BADGES = {
  open: { bg: '#fecaca', color: '#991b1b', label: 'Open' },
  in_progress: { bg: '#bfdbfe', color: '#1e40af', label: 'In Progress' },
  resolved: { bg: '#bbf7d0', color: '#166534', label: 'Resolved' },
  closed: { bg: '#e5e7eb', color: '#374151', label: 'Closed' },
};

export default function IncidentList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const sortBy = searchParams.get('sort') || 'createdAt';
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = 10;

  const updateSearchParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    // Reset to page 1 when filters change
    if (updates.search || updates.status || updates.priority || updates.sort) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', search, statusFilter, priorityFilter, sortBy, page],
    queryFn: async () => {
      const res = await api.get('/incidents', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          sortBy,
          page,
          limit,
        },
      });
      return res.data;
    },
  });

  const incidents = data?.data || [];
  const pagination = data?.pagination || {};

  const hasActiveFilters = search || statusFilter || priorityFilter;

  return (
    <Layout title="Incident Management" description="Report and track issues with the app">
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Incident Management</h1>
            <p className={styles.subtitle}>Report and track app issues</p>
          </div>
          <Link to="/incidents/new">
            <Button icon={<Plus size={14} />}>Report Issue</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className={styles.filterSection}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search incidents by title or description..."
              value={search}
              onChange={(e) => updateSearchParams({ search: e.target.value })}
              className={styles.searchInput}
            />
            {search && (
              <button
                onClick={() => updateSearchParams({ search: '' })}
                className={styles.clearButton}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className={styles.filterControls}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => updateSearchParams({ status: e.target.value })}
                className={styles.filterSelect}
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => updateSearchParams({ priority: e.target.value })}
                className={styles.filterSelect}
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => updateSearchParams({ sort: e.target.value })}
                className={styles.filterSelect}
              >
                <option value="createdAt">Latest</option>
                <option value="upvotes">Most Upvoted</option>
                <option value="priority">Priority</option>
                <option value="recent">Recently Updated</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => updateSearchParams({ search: '', status: '', priority: '', sort: '' })}
                className={styles.clearFiltersButton}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Tags */}
        {hasActiveFilters && (
          <div className={styles.activeTags}>
            {search && (
              <span className={styles.filterTag}>
                Search: "{search}"
                <button onClick={() => updateSearchParams({ search: '' })} className={styles.tagRemove}>
                  ×
                </button>
              </span>
            )}
            {statusFilter && (
              <span className={styles.filterTag}>
                Status: {statusFilter}
                <button onClick={() => updateSearchParams({ status: '' })} className={styles.tagRemove}>
                  ×
                </button>
              </span>
            )}
            {priorityFilter && (
              <span className={styles.filterTag}>
                Priority: {priorityFilter}
                <button onClick={() => updateSearchParams({ priority: '' })} className={styles.tagRemove}>
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* Incidents List */}
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        ) : incidents.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertTriangle size={40} />
            <p>No incidents found</p>
            {hasActiveFilters ? (
              <button
                onClick={() => updateSearchParams({ search: '', status: '', priority: '', sort: '' })}
                className={styles.linkButton}
              >
                Clear filters to see all incidents
              </button>
            ) : (
              <Link to="/incidents/new">
                <Button size="sm">Create your first report</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className={styles.incidentsList}>
              {incidents.map((incident) => (
                <Link
                  key={incident._id}
                  to={`/incidents/${incident._id}`}
                  className={styles.incidentCard}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.titleSection}>
                      <div
                        className={styles.priorityIndicator}
                        style={{ backgroundColor: PRIORITY_COLORS[incident.priority] }}
                      />
                      <div className={styles.titleContent}>
                        <h3 className={styles.cardTitle}>{incident.title}</h3>
                        <p className={styles.cardDescription}>{incident.description.substring(0, 100)}...</p>
                      </div>
                    </div>
                    <div
                      className={styles.statusBadge}
                      style={{
                        backgroundColor: STATUS_BADGES[incident.status].bg,
                        color: STATUS_BADGES[incident.status].color,
                      }}
                    >
                      {STATUS_BADGES[incident.status].label}
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.meta}>
                      <span className={styles.reporter}>
                        By {incident.reportedBy?.firstName} {incident.reportedBy?.lastName}
                      </span>
                      <span className={styles.date}>
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className={styles.stats}>
                      <span className={styles.stat}>
                        <ThumbsUp size={14} />
                        {incident.upvoteCount}
                      </span>
                      <span className={styles.stat}>
                        <MessageCircle size={14} />
                        {incident.commentCount || 0}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => updateSearchParams({ page: String(page - 1) })}
                  disabled={page === 1}
                  className={styles.paginationButton}
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>

                <div className={styles.pageInfo}>
                  Page <span className={styles.pageNumber}>{page}</span> of{' '}
                  <span className={styles.pageNumber}>{pagination.totalPages}</span>
                </div>

                <button
                  onClick={() => updateSearchParams({ page: String(page + 1) })}
                  disabled={page === pagination.totalPages}
                  className={styles.paginationButton}
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
