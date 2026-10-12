import styles from './AddUserModal.module.css';
import { useState, useEffect, useCallback } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';
import LookupInput from '../../../components/forms/LookupInput/LookupInput';
import RoleLookup from '../../../components/forms/RoleLookup/RoleLookup';

const AddUserModal = ({ isOpen, onClose, onSuccess, api }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    confirmPassword: '',
    password: '',
    sendWelcomeEmail: true,
    manager: '',
    role: '',
  });

  const [saving, setSaving] = useState(false);
  const [defaultRoleLoaded, setDefaultRoleLoaded] = useState(false);

  const loadDefaultRole = useCallback(async () => {
    if (defaultRoleLoaded || form.role) return;
    try {
      const res = await api.get('/roles', { params: { limit: 1000 } });
      const roles = res.data.data || [];
      if (roles.length > 0) {
        const defaultRole = roles.find((r) => r.isDefault) || roles[0];
        setForm((prev) => ({ ...prev, role: defaultRole._id }));
        setDefaultRoleLoaded(true);
      }
    } catch {
      // Silently fail
    }
  }, [api, defaultRoleLoaded, form.role]);

  useEffect(() => {
    if (isOpen) {
      loadDefaultRole();
    }
  }, [isOpen, loadDefaultRole]);

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.role) {
      onSuccess('Role is required', true);
      return;
    }

    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      onSuccess('Passwords do not match', true);
      return;
    }

    // Validate username format if provided (must be valid email)
    if (form.username) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.username)) {
        onSuccess('Username must be a valid email address.', true);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password || undefined,
        sendWelcomeEmail: form.sendWelcomeEmail,
      };

      if (form.username) payload.username = form.username;
      if (form.manager) payload.manager = form.manager;
      if (form.role) payload.role = form.role;

      await api.post('/users', payload);

      onSuccess(
        'User created.' + (form.sendWelcomeEmail ? ' Password creation email sent.' : ''),
      );

      setForm({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        sendWelcomeEmail: false,
        manager: '',
        role: '',
      });

      onClose();
    } catch (err) {
      onSuccess(err.response?.data?.message || err.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add User"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSubmit}>
            Create User
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>First Name *</label>
            <input
              className={styles.input}
              value={form.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="John"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Last Name *</label>
            <input
              className={styles.input}
              value={form.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Doe"
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Email *</label>
          <input
            type="email"
            className={styles.input}
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="john.doe@example.com"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Username</label>
          <input
            type="email"
            className={styles.input}
            value={form.username}
            onChange={(e) => handleChange('username', e.target.value)}
            placeholder="user@example.com"
          />
          <p className={styles.fieldHint}>Must be a valid email format (optional)</p>
        </div>

        <div className={styles.divider}>
          <span>Password Setup</span>
        </div>

        <div className={styles.passwordOption}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              checked={!form.sendWelcomeEmail}
              onChange={() => {
                handleChange('sendWelcomeEmail', false);
                handleChange('password', '');
                handleChange('confirmPassword', '');
              }}
            />
            <div>
              <strong>Set password now</strong>
              <p>Create a password for immediate access</p>
            </div>
          </label>
        </div>

        {!form.sendWelcomeEmail && (
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Password *</label>
              <input
                type="password"
                className={styles.input}
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirm Password *</label>
              <input
                type="password"
                className={styles.input}
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
          </div>
        )}

        <div className={styles.passwordOption}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              checked={form.sendWelcomeEmail}
              onChange={() => {
                handleChange('sendWelcomeEmail', true);
                handleChange('password', '');
                handleChange('confirmPassword', '');
              }}
            />
            <div>
              <strong>Send password creation email</strong>
              <p>User receives a link to set their own password</p>
            </div>
          </label>
        </div>

        <div className={styles.divider}>
          <span>Assignment</span>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Role *</label>
            <RoleLookup
              value={form.role}
              onChange={(id) => handleChange('role', id)}
              placeholder="Search roles..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Manager</label>
            <LookupInput
              value={form.manager}
              onChange={(id) => handleChange('manager', id)}
              objectApiName="user"
              displayField="firstName"
              placeholder="Search managers..."
              allowCreate={false}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddUserModal;
