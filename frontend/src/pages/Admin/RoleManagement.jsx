import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Shield, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import styles from './RoleManagement.module.css';

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const rolesRes = await api.get('/roles');
      setRoles(rolesRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleDelete = async (role) => {
    if (role.isSystem) {
      toast.error('System roles cannot be deleted.');
      return;
    }
    if (!window.confirm(`Delete role "${role.label}"?`)) return;
    try {
      await api.delete(`/roles/${role._id}`);
      toast.success('Role deleted.');
      fetchRoles();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Layout
      title="Roles"
      description="Define roles and permissions for your team"
    >
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Role Management</h1>
          <Link to="/admin/roles/new">
            <Button icon={<Plus size={14} />}>
              New Role
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        ) : (
          <div className={styles.roleList}>
            {roles.map((role) => (
              <div key={role._id} className={styles.roleCard}>
                <div className={styles.roleIcon}>
                  <Shield size={20} />
                </div>
                <div className={styles.roleInfo}>
                  <div className={styles.roleName}>
                    {role.label}
                    {role.isEditable === false && (
                      <span className={styles.systemBadge} title="This role cannot be edited" style={{ backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #0ea5e9' }}>Read-Only</span>
                    )}
                    {role.isSystem && (
                      <span className={styles.systemBadge}>System</span>
                    )}
                    {role.isDefault && (
                      <span className={styles.defaultBadge}>Default</span>
                    )}
                  </div>
                  <div className={styles.roleApiName}>{role.name}</div>
                  {role.description && (
                    <div className={styles.roleDesc}>{role.description}</div>
                  )}
                  {role.objectPermissions?.length > 0 && (
                    <div className={styles.roleObjectCount}>
                      {role.objectPermissions.length} object permission
                      {role.objectPermissions.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className={styles.roleActions}>
                  <Link to={`/admin/roles/${role._id}/edit`}>
                    <button className={styles.editBtn} title={role.isEditable === false ? "View permissions" : "Edit role"}>
                      {role.isEditable === false ? <Eye size={14} /> : <Edit2 size={14} />}
                    </button>
                  </Link>
                  {!role.isSystem && role.isEditable !== false && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(role)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
