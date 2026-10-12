/**
 * UserDetail — displays a user record with hardcoded fields from the User model.
 * Navigated to from UserManagement (/admin/users/:id).
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import {
  ArrowLeft,
  Edit2,
  Clock,
  KeyRound,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import Layout from '../../layout/Layout';
import styles from '../Records/RecordDetail/RecordDetail.module.css';

const USER_FIELDS = [
  { apiName: 'firstName', label: 'First Name', section: 'Personal Info' },
  { apiName: 'lastName', label: 'Last Name', section: 'Personal Info' },
  { apiName: 'email', label: 'Email', section: 'Personal Info', type: 'email' },
  { apiName: 'phone', label: 'Phone', section: 'Personal Info', type: 'phone' },
  { apiName: 'title', label: 'Title', section: 'Professional' },
  { apiName: 'department', label: 'Department', section: 'Professional' },
  { apiName: 'gender', label: 'Gender', section: 'Personal Info' },
  { apiName: 'username', label: 'Username', section: 'Account' },
  { apiName: 'role', label: 'Role', section: 'Account', type: 'lookup' },
  { apiName: 'manager', label: 'Manager', section: 'Account', type: 'lookup' },
  { apiName: 'status', label: 'Status', section: 'Account' },
];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/admin/users');
    }
  };

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/users/${id}`);
        setRecord(res.data.data);
      } catch {
        toast.error('Failed to load user.');
        navigate('/admin/users');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const renderValue = (field, value) => {
    if (value === null || value === undefined || value === '')
      return <span className={styles.empty}>—</span>;

    // Handle lookup fields
    if (field.type === 'lookup') {
      if (typeof value === 'object' && value !== null) {
        // If it's already populated (has nested data)
        if (value.name) return value.name;
        if (value.firstName && value.lastName) return `${value.firstName} ${value.lastName}`;
        if (value.firstName) return value.firstName;
        return value.label || String(value._id || value.id).slice(-8);
      }
      // If it's just an ID string
      return String(value).slice(-8);
    }

    switch (field.type) {
      case 'email':
        return <a href={`mailto:${value}`}>{value}</a>;
      case 'phone':
        return <a href={`tel:${value}`}>{value}</a>;
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
    }
  };

  const buildSections = () => {
    const grouped = {};
    USER_FIELDS.forEach((f) => {
      const sec = f.section || 'Information';
      if (!grouped[sec]) grouped[sec] = [];
      grouped[sec].push(f);
    });
    return Object.entries(grouped).map(([label, fs]) => ({
      id: label,
      label,
      fields: fs,
    }));
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Minimum 8 characters.');
      return;
    }
    setResetting(true);
    try {
      await api.post(`/users/${id}/reset-password`, { newPassword });
      toast.success('Password reset. User sessions have been invalidated.');
      setResetModal(false);
      setNewPassword('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted.');
      navigate('/admin/users');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading)
    return (
      <Layout title="User">
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      </Layout>
    );

  const title =
    `${record?.firstName || ''} ${record?.lastName || ''}`.trim() ||
    record?.email ||
    'User';
  const sections = buildSections();

  return (
    <Layout title={title} description="View user details">
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.breadcrumb}>
            <button
              onClick={goBack}
              className={styles.breadcrumbLink}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div className={styles.titleRow}>
              <div
                className={styles.objectIcon}
                style={{ background: '#6366f120', color: '#6366f1' }}
              >
                <LucideIcons.User size={20} />
              </div>
              <h1 className={styles.title}>{title}</h1>
            </div>
            <div className={styles.actions}>
              {isAdmin && (
                <Button
                  variant=""
                  size="sm"
                  icon={<KeyRound size={14} />}
                  onClick={() => {
                    setNewPassword('');
                    setResetModal(true);
                  }}
                >
                  Reset Password
                </Button>
              )}
              <Link to={`/admin/users/${id}/edit`}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Edit2 size={14} />}
                >
                  Edit
                </Button>
              </Link>
              {isAdmin && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => setDeleteModal(true)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.mainPanel}>
            {sections.map((section) => (
              <div key={section.id} className={styles.section}>
                <h3 className={styles.sectionTitle}>{section.label}</h3>
                <div
                  className={styles.fieldGrid}
                  style={{
                    gridTemplateColumns: 'repeat(2, 1fr)',
                  }}
                >
                  {section.fields.map((field) => (
                    <div
                      key={field.apiName}
                      className={styles.fieldItem}
                    >
                      <label className={styles.fieldLabel}>
                        {field.label}
                      </label>
                      <div className={styles.fieldValue}>
                        {renderValue(field, record?.[field.apiName])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sidebar}>
            <div className={styles.metaSection}>
              <h4 className={styles.metaTitle}>Account Info</h4>
              <div className={styles.metaItem}>
                <Clock size={14} className={styles.metaIcon} />
                <div>
                  <span className={styles.metaLabel}>Member since</span>
                  <span className={styles.metaValue}>
                    {record?.createdAt
                      ? new Date(record.createdAt).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
              </div>
              {record?.role && (
                <div className={styles.metaItem}>
                  <LucideIcons.Shield size={14} className={styles.metaIcon} />
                  <div>
                    <span className={styles.metaLabel}>Role</span>
                    <span className={styles.metaValue}>
                      {typeof record.role === 'object' ? record.role.name : record.role}
                    </span>
                  </div>
                </div>
              )}
              {record?.manager && (
                <div className={styles.metaItem}>
                  <LucideIcons.Users size={14} className={styles.metaIcon} />
                  <div>
                    <span className={styles.metaLabel}>Manager</span>
                    <span className={styles.metaValue}>
                      {typeof record.manager === 'object'
                        ? `${record.manager.firstName} ${record.manager.lastName}`
                        : record.manager}
                    </span>
                  </div>
                </div>
              )}
              <div className={styles.metaItem}>
                <LucideIcons.CheckCircle
                  size={14}
                  className={styles.metaIcon}
                />
                <div>
                  <span className={styles.metaLabel}>Status</span>
                  <span
                    className={styles.metaValue}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {record?.status || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Modal
          isOpen={resetModal}
          onClose={() => setResetModal(false)}
          title="Reset Password"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setResetModal(false)}>
                Cancel
              </Button>
              <Button loading={resetting} onClick={handleResetPassword}>
                Reset Password
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
              Set a new password for{' '}
              <strong>
                {record?.firstName} {record?.lastName}
              </strong>
              . Their active sessions will be invalidated and they will need to
              log in again.
            </p>
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                New Password
              </label>
              <input
                type="password"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: 14,
                }}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                autoFocus
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          title="Delete User"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleting}
                onClick={handleDelete}
                icon={<Trash2 size={14} />}
              >
                Delete User
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
              Are you sure you want to delete{' '}
              <strong>
                {record?.firstName} {record?.lastName}
              </strong>
              ? This action cannot be undone.
            </p>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
