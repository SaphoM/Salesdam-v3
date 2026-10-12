import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle, XCircle, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Table from '../../components/common/Table/Table';
import Button from '../../components/common/Button/Button';
import styles from './TenantManagement.module.css';

export default function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTenants = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/tenants', { params: { page, limit: 50, search: search || undefined } });
      setTenants(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch (err) { toast.error('Failed to load tenants.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTenants(); }, [search]);

  const handleSuspend = async (tenant) => {
    if (!window.confirm(`Suspend workspace "${tenant.name}"?`)) return;
    try {
      await api.patch(`/admin/tenants/${tenant._id}/suspend`, { reason: 'Admin action' });
      toast.success('Tenant suspended.');
      fetchTenants();
    } catch (err) { toast.error(err.message); }
  };

  const handleActivate = async (tenant) => {
    try {
      await api.patch(`/admin/tenants/${tenant._id}/activate`);
      toast.success('Tenant activated.');
      fetchTenants();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (tenant) => {
    if (!window.confirm(`PERMANENTLY delete workspace "${tenant.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/tenants/${tenant._id}`);
      toast.success('Tenant deleted.');
      fetchTenants();
    } catch (err) { toast.error(err.message); }
  };

  const columns = [
    { key: 'name', header: 'Name', sortable: true, render: (val, row) => <div><strong>{val}</strong><div className={styles.slug}>{row.slug}</div></div> },
    { key: 'plan', header: 'Plan', render: val => <span className={styles.planBadge}>{val}</span> },
    { key: 'status', header: 'Status', render: val => (
      <span className={`${styles.statusBadge} ${val === 'active' ? styles.active : val === 'suspended' ? styles.suspended : styles.deleted}`}>{val}</span>
    )},
    { key: 'usage', header: 'Users', render: (val) => val?.users || 0 },
    { key: 'createdAt', header: 'Created', render: val => new Date(val).toLocaleDateString() },
    { key: '_id', header: 'Actions', render: (_, row) => (
      <div className={styles.rowActions}>
        {row.status === 'active' && <button className={styles.suspendBtn} onClick={() => handleSuspend(row)} title="Suspend"><XCircle size={16} /></button>}
        {row.status === 'suspended' && <button className={styles.activateBtn} onClick={() => handleActivate(row)} title="Activate"><CheckCircle size={16} /></button>}
        <button className={styles.deleteBtn} onClick={() => handleDelete(row)} title="Delete"><Trash2 size={16} /></button>
      </div>
    )},
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Building2 size={24} className={styles.icon} />
          <div>
            <h1 className={styles.title}>Tenant Management</h1>
            <p className={styles.subtitle}>{pagination.total || 0} workspaces</p>
          </div>
        </div>
        <div className={styles.actions}>
          <input className={styles.search} placeholder="Search tenants..." value={search} onChange={e => setSearch(e.target.value)} />
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => fetchTenants()}>Refresh</Button>
        </div>
      </div>
      <Table columns={columns} data={tenants} loading={loading} emptyMessage="No tenants found." />
    </div>
  );
}
