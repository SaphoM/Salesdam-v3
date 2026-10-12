/**
 * UserForm — edit a user with hardcoded fields from the User model.
 * Navigated to from UserDetail (/admin/users/:id/edit).
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/common/Button/Button';
import LookupInput from '../../components/forms/LookupInput/LookupInput';
import RoleLookup from '../../components/forms/RoleLookup/RoleLookup';
import Layout from '../../layout/Layout';
import styles from '../Records/RecordDetail/RecordDetail.module.css';
import formStyles from '../Records/RecordForm/RecordForm.module.css';

// Email format validation (username must follow email format)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmailFormat = (value) => EMAIL_REGEX.test(value || '');

const USER_FIELDS = [
  { apiName: 'firstName', label: 'First Name', type: 'text', isRequired: true, section: 'Personal Info' },
  { apiName: 'lastName', label: 'Last Name', type: 'text', isRequired: true, section: 'Personal Info' },
  { apiName: 'email', label: 'Email', type: 'email', isRequired: true, section: 'Personal Info' },
  { apiName: 'phone', label: 'Phone', type: 'phone', section: 'Personal Info' },
  { apiName: 'username', label: 'Username', type: 'email', helpText: 'Must follow email format (e.g., user@example.com)', section: 'Account' },
  { apiName: 'title', label: 'Title', type: 'text', section: 'Professional' },
  { apiName: 'department', label: 'Department', type: 'text', section: 'Professional' },
  { apiName: 'gender', label: 'Gender', type: 'picklist', picklistValues: [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ], section: 'Personal Info' },
  { apiName: 'role', label: 'Role', type: 'role', section: 'Account' },
  { apiName: 'manager', label: 'Manager', type: 'lookup', section: 'Account' },
  { apiName: 'status', label: 'Status', type: 'picklist', picklistValues: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ], section: 'Account' },
];

const FieldInput = ({ field, value, onChange }) => {
  const handleChange = (e) => {
    const val =
      e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(field.apiName, val);
  };

  // Special: role field → role lookup
  if (field.apiName === 'role') {
    // Extract ID if role is an object
    const roleId = typeof value === 'object' && value?._id ? value._id : value;
    const roleLabel = typeof value === 'object' && value?.label ? value.label : undefined;
    return (
      <RoleLookup
        value={roleId}
        displayValue={roleLabel}
        onChange={(id) => onChange(field.apiName, id)}
      />
    );
  }

  // Special: manager field → user lookup
  if (field.apiName === 'manager') {
    // Extract ID if manager is an object
    const managerId = typeof value === 'object' && value?._id ? value._id : value;
    const managerLabel = typeof value === 'object' && value?.firstName ? `${value.firstName} ${value.lastName}` : undefined;
    return (
      <LookupInput
        value={managerId ?? ''}
        displayValue={managerLabel}
        onChange={(id) => onChange(field.apiName, id)}
        objectApiName="user"
        displayField="firstName"
        placeholder="Search managers..."
        allowCreate={false}
      />
    );
  }

  switch (field.type) {
    case 'textarea':
    case 'richtext':
      return (
        <textarea
          className={formStyles.textarea}
          value={value ?? ''}
          onChange={handleChange}
          rows={4}
          placeholder={field.helpText || ''}
        />
      );
    case 'boolean':
      return (
        <label className={formStyles.checkboxLabel}>
          <input type="checkbox" checked={!!value} onChange={handleChange} />
          <span>{field.label}</span>
        </label>
      );
    case 'picklist':
      return (
        <select
          className={formStyles.select}
          value={value ?? ''}
          onChange={handleChange}
        >
          <option value="">-- Select --</option>
          {(field.picklistValues || [])
            .filter((p) => p.isActive !== false)
            .map((pv) => (
              <option key={pv.value} value={pv.value}>
                {pv.label}
              </option>
            ))}
        </select>
      );
    case 'lookup':
    case 'master_detail':
      return (
        <LookupInput
          value={value ?? ''}
          onChange={(id) => onChange(field.apiName, id)}
          objectApiName={field.lookupObjectApiName}
          displayField={field.lookupDisplayField || 'name'}
          placeholder={`Search ${field.lookupObjectApiName || 'records'}...`}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          className={formStyles.input}
          value={value ? new Date(value).toISOString().split('T')[0] : ''}
          onChange={handleChange}
        />
      );
    case 'email':
      return (
        <input
          type="email"
          className={formStyles.input}
          value={value ?? ''}
          onChange={handleChange}
        />
      );
    case 'phone':
      return (
        <input
          type="tel"
          className={formStyles.input}
          value={value ?? ''}
          onChange={handleChange}
        />
      );
    case 'number':
    case 'currency':
    case 'percent':
      return (
        <input
          type="number"
          className={formStyles.input}
          value={value ?? ''}
          onChange={handleChange}
        />
      );
    default:
      return (
        <input
          type="text"
          className={formStyles.input}
          value={value ?? ''}
          onChange={handleChange}
          maxLength={field.maxLength}
          placeholder={field.helpText || ''}
        />
      );
  }
};

export default function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/admin/users/${id}`);
    }
  };

  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/users/${id}`);
        setFormData(res.data.data);
      } catch {
        toast.error('Failed to load user.');
        navigate('/admin/users');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleChange = (apiName, value) =>
    setFormData((p) => ({ ...p, [apiName]: value }));

  const handleSubmit = async (e) => {
    e?.preventDefault();

    // Validate username format if provided
    if (formData.username && !isValidEmailFormat(formData.username)) {
      toast.error('Username must follow email format (e.g., user@example.com)');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/users/${id}/record`, formData);
      toast.success('User updated.');
      navigate(`/admin/users/${id}`);
    } catch (err) {
      toast.error(err.message || 'Save failed.');
    } finally {
      setSaving(false);
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

  if (loading)
    return (
      <Layout title="Edit User">
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      </Layout>
    );

  const title =
    `${formData.firstName || ''} ${formData.lastName || ''}`.trim() ||
    formData.email ||
    'User';
  const sections = buildSections();

  return (
    <Layout title={`Edit ${title}`} description="Edit user details">
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.breadcrumb}>
            <button
              onClick={goBack}
              className={styles.breadcrumbLink}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ArrowLeft size={16} /> Back to user
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
              <h1 className={styles.title}>Edit {title}</h1>
            </div>
            <div className={styles.actions}>
              <Link to={`/admin/users/${id}`}>
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </Link>
              <Button
                size="sm"
                icon={<Save size={14} />}
                loading={saving}
                onClick={handleSubmit}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
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
                        <label className={formStyles.label}>
                          {field.label}
                          {field.isRequired && (
                            <span className={formStyles.required}> *</span>
                          )}
                        </label>
                        <FieldInput
                          field={field}
                          value={formData[field.apiName]}
                          onChange={handleChange}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.sidebar}>
              <div className={styles.metaSection}>
                <h4 className={styles.metaTitle}>User Account</h4>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-gray-500)',
                    margin: 0,
                  }}
                >
                  Editing user profile for <strong>{title}</strong>.<br />
                  <br />
                  Update user information including role assignment, manager, and
                  other profile details.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
