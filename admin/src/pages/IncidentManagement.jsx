import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  LayoutGrid,
  LayoutList,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import './IncidentManagement.css';

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

const PRIORITY_ICONS = {
  critical: <Zap size={14} />,
  high: <AlertCircle size={14} />,
  medium: <Clock size={14} />,
  low: <CheckCircle size={14} />,
};

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#fecaca', bgColor: '#fef2f2' },
  in_progress: { label: 'In Progress', color: '#bfdbfe', bgColor: '#eff6ff' },
  resolved: { label: 'Resolved', color: '#bbf7d0', bgColor: '#f0fdf4' },
  closed: { label: 'Closed', color: '#e5e7eb', bgColor: '#f9fafb' },
};

export default function IncidentManagement() {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('table');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [draggedIncident, setDraggedIncident] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/incidents/admin/all?limit=500');
      setIncidents(res.data.data?.data || []);
    } catch (err) {
      toast.error('Failed to load incidents');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (incidentId, status) => {
    try {
      setIsUpdatingStatus(true);
      await api.patch(`/incidents/${incidentId}`, { status });
      setIncidents(incidents.map(i => i._id === incidentId ? { ...i, status } : i));
      toast.success('Incident status updated');
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const closeIncident = async () => {
    if (!selectedIncident) return;
    try {
      setIsClosing(true);
      await api.patch(`/incidents/${selectedIncident._id}/close`, {
        resolutionNotes: resolutionNote,
      });
      setIncidents(incidents.map(i =>
        i._id === selectedIncident._id ? { ...i, status: 'closed' } : i
      ));
      setSelectedIncident(null);
      setResolutionNote('');
      toast.success('Incident closed successfully');
    } catch (err) {
      toast.error('Failed to close incident');
    } finally {
      setIsClosing(false);
    }
  };

  const getFilteredAndSortedIncidents = () => {
    let filtered = incidents.filter(i => {
      const statusMatch = filterStatus === 'all' || i.status === filterStatus;
      const priorityMatch = filterPriority === 'all' || i.priority === filterPriority;
      return statusMatch && priorityMatch;
    });

    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'createdAt') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  };

  const handleDragStart = (incident) => {
    setDraggedIncident(incident);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnColumn = (status) => {
    if (draggedIncident && draggedIncident.status !== status) {
      updateStatus(draggedIncident._id, status);
      setDraggedIncident(null);
    }
  };

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const filteredIncidents = getFilteredAndSortedIncidents();
  const stats = {
    open: incidents.filter(i => i.status === 'open').length,
    in_progress: incidents.filter(i => i.status === 'in_progress').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    closed: incidents.filter(i => i.status === 'closed').length,
  };

  const groupedIncidents = {
    open: filteredIncidents.filter(i => i.status === 'open'),
    in_progress: filteredIncidents.filter(i => i.status === 'in_progress'),
    resolved: filteredIncidents.filter(i => i.status === 'resolved'),
    closed: filteredIncidents.filter(i => i.status === 'closed'),
  };

  return (
    <div className="incident-management">
      {/* Header */}
      <div className="im-header">
        <div className="im-title">
          <AlertTriangle size={28} />
          <h1>Incident Management</h1>
        </div>

        <div className="im-controls">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${view === 'table' ? 'active' : ''}`}
              onClick={() => setView('table')}
              title="Table view"
            >
              <LayoutList size={18} />
            </button>
            <button
              className={`toggle-btn ${view === 'kanban' ? 'active' : ''}`}
              onClick={() => setView('kanban')}
              title="Kanban view"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="im-stats">
        <div className="stat-card">
          <div className="stat-label">Open</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {stats.open}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Progress</div>
          <div className="stat-value" style={{ color: '#ea580c' }}>
            {stats.in_progress}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resolved</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {stats.resolved}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Closed</div>
          <div className="stat-value" style={{ color: '#6b7280' }}>
            {stats.closed}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading incidents...</p>
        </div>
      ) : view === 'table' ? (
        // TABLE VIEW
        <div className="table-view">
          <div className="table-controls">
            <div className="filter-group">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="incidents-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('priority')} className="sortable">
                    <div className="header-content">
                      Priority
                      {sortBy === 'priority' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => toggleSort('title')} className="sortable">
                    <div className="header-content">
                      Title
                      {sortBy === 'title' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                  <th>App / Workspace</th>
                  <th>Reporter</th>
                  <th onClick={() => toggleSort('status')} className="sortable">
                    <div className="header-content">
                      Status
                      {sortBy === 'status' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                  <th onClick={() => toggleSort('createdAt')} className="sortable">
                    <div className="header-content">
                      Created
                      {sortBy === 'createdAt' && (
                        sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      No incidents found
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map(incident => (
                    <tr key={incident._id} className="incident-row">
                      <td>
                        <span
                          className="priority-badge"
                          style={{ backgroundColor: PRIORITY_COLORS[incident.priority] }}
                        >
                          {PRIORITY_ICONS[incident.priority]}
                          {PRIORITY_LABELS[incident.priority]}
                        </span>
                      </td>
                      <td className="title-cell">{incident.title}</td>
                      <td className="tenant-cell">
                        <span className="tenant-badge">{incident.tenantId?.name || 'Unknown'}</span>
                      </td>
                      <td className="reporter-cell">
                        {incident.reportedBy?.firstName} {incident.reportedBy?.lastName}
                      </td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: STATUS_CONFIG[incident.status].bgColor }}>
                          {STATUS_CONFIG[incident.status].label}
                        </span>
                      </td>
                      <td className="date-cell">
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="action-btn view-btn"
                          onClick={() => setSelectedIncident(incident)}
                          title="View details"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // KANBAN VIEW
        <div className="kanban-view">
          <div className="kanban-board">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <div
                key={status}
                className="kanban-column"
                onDragOver={handleDragOver}
                onDrop={() => handleDropOnColumn(status)}
              >
                <div className="column-header">
                  <div className="column-title">
                    <span className="column-label">{config.label}</span>
                    <span className="column-count">{groupedIncidents[status].length}</span>
                  </div>
                </div>

                <div className="column-cards">
                  {groupedIncidents[status].map(incident => (
                    <div
                      key={incident._id}
                      className="kanban-card"
                      draggable
                      onDragStart={() => handleDragStart(incident)}
                      onClick={() => setSelectedIncident(incident)}
                    >
                      <div className="card-header">
                        <span
                          className="priority-indicator"
                          style={{ backgroundColor: PRIORITY_COLORS[incident.priority] }}
                          title={PRIORITY_LABELS[incident.priority]}
                        />
                        <span className="card-id">INC-{incident._id.slice(-6).toUpperCase()}</span>
                      </div>
                      <h3 className="card-title">{incident.title}</h3>
                      <p className="card-description">{incident.description}</p>
                      <div className="card-footer">
                        <span className="reporter-name">
                          {incident.reportedBy?.firstName}
                        </span>
                        <span className="card-date">
                          {new Date(incident.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedIncident && (
        <div className="modal-overlay" onClick={() => setSelectedIncident(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedIncident.title}</h2>
              <button onClick={() => setSelectedIncident(null)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Description</h3>
                <p>{selectedIncident.description}</p>
              </div>

              <div className="detail-row">
                <div className="detail-col">
                  <span className="label">Priority</span>
                  <span
                    className="priority-value"
                    style={{ color: PRIORITY_COLORS[selectedIncident.priority] }}
                  >
                    {PRIORITY_LABELS[selectedIncident.priority]}
                  </span>
                </div>
                <div className="detail-col">
                  <span className="label">Status</span>
                  <span className="status-value">{STATUS_CONFIG[selectedIncident.status].label}</span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-col">
                  <span className="label">App / Workspace</span>
                  <span className="value">{selectedIncident.tenantId?.name || 'Unknown'}</span>
                </div>
                <div className="detail-col">
                  <span className="label">Reporter</span>
                  <span className="value">
                    {selectedIncident.reportedBy?.firstName} {selectedIncident.reportedBy?.lastName}
                    <br />
                    <small>{selectedIncident.reportedBy?.email}</small>
                  </span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-col">
                  <span className="label">Created</span>
                  <span className="value">
                    {new Date(selectedIncident.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedIncident.tags?.length > 0 && (
                <div className="detail-section">
                  <h3>Tags</h3>
                  <div className="tags-list">
                    {selectedIncident.tags.map(tag => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedIncident.status !== 'closed' && (
                <div className="detail-section">
                  <h3>Resolution Notes</h3>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Add notes about the resolution..."
                    className="resolution-textarea"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedIncident.status !== 'closed' && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      updateStatus(
                        selectedIncident._id,
                        selectedIncident.status === 'open' ? 'in_progress' : 'resolved'
                      )
                    }
                    disabled={isUpdatingStatus}
                  >
                    {selectedIncident.status === 'open'
                      ? 'Move to In Progress'
                      : 'Move to Resolved'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={closeIncident}
                    disabled={isClosing}
                  >
                    <Send size={16} />
                    {isClosing ? 'Closing...' : 'Close Incident'}
                  </button>
                </>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedIncident(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
