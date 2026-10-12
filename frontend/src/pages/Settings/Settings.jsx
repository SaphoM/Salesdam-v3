import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  Bell,
  Settings as SettingsIcon,
  Building2,
  Moon,
  Sun,
  Shield,
  CreditCard,
  Key,
  Trash2,
  Plus,
  Check,
  AlertTriangle,
  Globe,
  Clock,
  DollarSign,
  Zap,
  BarChart2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import styles from './Settings.module.css';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'appearance', label: 'Appearance', icon: SettingsIcon },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const TIMEZONES = [
  'Africa/Johannesburg',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

const CURRENCIES = [
  { code: 'ZAR', label: 'South African Rand (ZAR)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
];

const PLAN_FEATURES = {
  starter: {
    name: 'Starter',
    price: 'Free',
    users: 1,
    records: '5,000',
    objects: 10,
    automations: 5,
  },
  basic: {
    name: 'Basic',
    price: 'R299/mo',
    users: 3,
    records: '10,000',
    objects: 15,
    automations: 10,
  },
  standard: {
    name: 'Standard',
    price: 'R799/mo',
    users: 10,
    records: '50,000',
    objects: 30,
    automations: 25,
  },
  enterprise: {
    name: 'Enterprise',
    price: 'R1,999/mo',
    users: 20,
    records: '200,000',
    objects: 100,
    automations: 100,
  },
};

export default function Settings() {
  const { tab = 'profile' } = useParams();
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useAppContext();

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    title: user?.title || '',
    department: user?.department || '',
    phone: user?.phone || '',
  });
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [wsForm, setWsForm] = useState({
    timezone: user?.preferences?.timezone || 'Africa/Johannesburg',
    currency: user?.preferences?.currency || 'ZAR',
  });
  const [notifForm, setNotifForm] = useState({
    emailOnCreate: user?.preferences?.notifications?.emailOnCreate ?? true,
    emailOnAssign: user?.preferences?.notifications?.emailOnAssign ?? true,
    emailOnComment: user?.preferences?.notifications?.emailOnComment ?? false,
    inAppOnCreate: user?.preferences?.notifications?.inAppOnCreate ?? true,
    inAppOnAssign: user?.preferences?.notifications?.inAppOnAssign ?? true,
  });
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    if (tab === 'security') loadSessions();
    if (tab === 'billing' || tab === 'workspace') loadTenant();
  }, [tab]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.get('/auth/sessions');
      setSessions(res.data.data || []);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadTenant = async () => {
    try {
      const res = await api.get('/auth/me');
      setTenant(res.data.data?.tenant);
    } catch {}
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/users/me/profile', profileForm);
      updateUser(res.data.data);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      toast.error('Minimum 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      toast.success(
        'Password changed. All other sessions have been signed out.',
      );
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleWsSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/users/me/profile', {
        preferences: { timezone: wsForm.timezone, currency: wsForm.currency },
      });
      updateUser(res.data.data);
      toast.success('Workspace preferences saved.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNotifSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/me/profile', {
        preferences: { notifications: notifForm },
      });
      toast.success('Notification preferences saved.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session revoked.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const plan = tenant?.plan || 'starter';
  const planInfo = PLAN_FEATURES[plan] || PLAN_FEATURES.starter;
  const usage = tenant?.usage || {};

  return (
    <Layout
      title="Settings"
      description="Configure your account, workspace, billing, and security preferences"
    >
      <div className={styles.page}>
        <h1 className={styles.title}>Settings</h1>
        <div className={styles.layout}>
          <nav className={styles.nav}>
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.id}
                  to={`/settings/${t.id}`}
                  className={`${styles.navItem} ${tab === t.id ? styles.active : ''}`}
                >
                  <Icon size={16} /> {t.label}
                </Link>
              );
            })}
          </nav>

          <div className={styles.content}>
            {/* ── Profile ── */}
            {tab === 'profile' && (
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>My Profile</h2>

                {/* Avatar placeholder */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  >
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div
                      style={{ fontSize: 13, color: 'var(--color-gray-500)' }}
                    >
                      {user?.email}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--color-gray-400)',
                        marginTop: 2,
                        textTransform: 'capitalize',
                      }}
                    >
                      {user?.systemRole}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileSave} className={styles.form}>
                  <div className={styles.row}>
                    {[
                      ['First Name', 'firstName'],
                      ['Last Name', 'lastName'],
                      ['Job Title', 'title'],
                      ['Department', 'department'],
                      ['Phone', 'phone'],
                    ].map(([lbl, key]) => (
                      <div key={key} className={styles.field}>
                        <label className={styles.label}>{lbl}</label>
                        <input
                          className={styles.input}
                          value={profileForm[key]}
                          onChange={(e) =>
                            setProfileForm((p) => ({
                              ...p,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <Button type="submit" loading={saving}>
                      Save Profile
                    </Button>
                  </div>
                </form>

                <hr className={styles.divider} />
                <h3 className={styles.subTitle}>Change Password</h3>
                <form onSubmit={handlePasswordChange} className={styles.form}>
                  {[
                    ['Current Password', 'currentPassword'],
                    ['New Password', 'newPassword'],
                    ['Confirm New Password', 'confirmPassword'],
                  ].map(([lbl, key]) => (
                    <div key={key} className={styles.field}>
                      <label className={styles.label}>{lbl}</label>
                      <input
                        type="password"
                        className={styles.input}
                        value={pwdForm[key]}
                        onChange={(e) =>
                          setPwdForm((p) => ({ ...p, [key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--color-gray-400)',
                      margin: '-8px 0 0',
                    }}
                  >
                    Minimum 8 characters. Changing your password will sign out
                    all other active sessions.
                  </p>
                  <div>
                    <Button type="submit" loading={saving}>
                      Change Password
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Workspace ── */}
            {tab === 'workspace' && (
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>Workspace Settings</h2>

                {tenant && (
                  <div
                    style={{
                      padding: 16,
                      background: 'var(--color-gray-50)',
                      borderRadius: 'var(--border-radius)',
                      marginBottom: 24,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Building2 size={20} color="var(--color-primary)" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{tenant.name}</div>
                      <div
                        style={{ fontSize: 12, color: 'var(--color-gray-500)' }}
                      >
                        Workspace slug: <code>{tenant.slug}</code>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleWsSave} className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      <Clock
                        size={14}
                        style={{ verticalAlign: 'middle', marginRight: 4 }}
                      />
                      Timezone
                    </label>
                    <select
                      className={styles.input}
                      value={wsForm.timezone}
                      onChange={(e) =>
                        setWsForm((p) => ({ ...p, timezone: e.target.value }))
                      }
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      <DollarSign
                        size={14}
                        style={{ verticalAlign: 'middle', marginRight: 4 }}
                      />
                      Default Currency
                    </label>
                    <select
                      className={styles.input}
                      value={wsForm.currency}
                      onChange={(e) =>
                        setWsForm((p) => ({ ...p, currency: e.target.value }))
                      }
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Button type="submit" loading={saving}>
                      Save Preferences
                    </Button>
                  </div>
                </form>

                {tenant && (
                  <>
                    <hr className={styles.divider} />
                    <h3 className={styles.subTitle}>Usage</h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                      }}
                    >
                      {[
                        {
                          label: 'Records',
                          used: usage.records || 0,
                          max: tenant.limits?.maxRecords || 5000,
                          icon: <BarChart2 size={16} />,
                        },
                        {
                          label: 'Users',
                          used: usage.users || 0,
                          max: tenant.limits?.maxUsers || 1,
                          icon: <Users size={16} />,
                        },
                        {
                          label: 'Objects',
                          used: usage.objects || 0,
                          max: tenant.limits?.maxObjects || 10,
                          icon: <Globe size={16} />,
                        },
                        {
                          label: 'Automations',
                          used: usage.automations || 0,
                          max: tenant.limits?.maxAutomations || 5,
                          icon: <Zap size={16} />,
                        },
                      ].map(({ label, used, max, icon }) => {
                        const pct = Math.min(
                          100,
                          Math.round((used / max) * 100),
                        );
                        return (
                          <div
                            key={label}
                            style={{
                              padding: 12,
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--border-radius)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontSize: 13,
                                  fontWeight: 500,
                                }}
                              >
                                {icon}
                                {label}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: 'var(--color-gray-500)',
                                }}
                              >
                                {used.toLocaleString()} / {max.toLocaleString()}
                              </span>
                            </div>
                            <div
                              style={{
                                height: 6,
                                background: 'var(--color-gray-100)',
                                borderRadius: 3,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  background:
                                    pct > 90
                                      ? '#ef4444'
                                      : pct > 70
                                        ? '#f59e0b'
                                        : 'var(--color-primary)',
                                  borderRadius: 3,
                                  transition: 'width 0.3s',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Appearance ── */}
            {tab === 'appearance' && (
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>Appearance</h2>
                <div className={styles.themeRow}>
                  <div>
                    <strong>Theme</strong>
                    <p className={styles.themeDesc}>
                      Choose between light and dark mode
                    </p>
                  </div>
                  <button className={styles.themeToggle} onClick={toggleTheme}>
                    {theme === 'light' ? (
                      <>
                        <Moon size={16} /> Dark mode
                      </>
                    ) : (
                      <>
                        <Sun size={16} /> Light mode
                      </>
                    )}
                  </button>
                </div>

                <hr className={styles.divider} />
                <h3 className={styles.subTitle}>Display Density</h3>
                <p style={{ fontSize: 13, color: 'var(--color-gray-500)' }}>
                  Compact, normal, and comfortable density options are coming
                  soon.
                </p>
              </div>
            )}

            {/* ── Security ── */}
            {tab === 'security' && (
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>Security</h2>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 14,
                    background: '#ecfdf5',
                    border: '1px solid #bbf7d0',
                    borderRadius: 'var(--border-radius)',
                    marginBottom: 20,
                  }}
                >
                  <Shield
                    size={18}
                    color="#16a34a"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#166534',
                        fontSize: 13,
                      }}
                    >
                      Your account is secured
                    </div>
                    <div
                      style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}
                    >
                      Sessions are stored server-side and expire after 24 hours
                      of inactivity. Changing your password invalidates all
                      other sessions.
                    </div>
                  </div>
                </div>

                <h3 className={styles.subTitle}>Active Sessions</h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-gray-500)',
                    marginBottom: 12,
                  }}
                >
                  These are the devices and browsers currently signed into your
                  account. Revoke any session you don't recognise.
                </p>

                {loadingSessions ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: 'center',
                      color: 'var(--color-gray-400)',
                    }}
                  >
                    Loading sessions…
                  </div>
                ) : sessions.length === 0 ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: 'center',
                      color: 'var(--color-gray-400)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    No session data available.
                  </div>
                ) : (
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {s.userAgent?.split('(')[0]?.trim() ||
                              'Unknown browser'}
                            {s.isCurrent && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 11,
                                  background: '#dcfce7',
                                  color: '#16a34a',
                                  padding: '2px 6px',
                                  borderRadius: 10,
                                }}
                              >
                                Current
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--color-gray-400)',
                              marginTop: 2,
                            }}
                          >
                            {s.ipAddress || 'Unknown IP'} · Last active{' '}
                            {s.lastAccessedAt
                              ? new Date(s.lastAccessedAt).toLocaleString()
                              : 'unknown'}
                          </div>
                        </div>
                        {!s.isCurrent && (
                          <button
                            onClick={() => revokeSession(s.id)}
                            style={{
                              padding: '4px 10px',
                              border: '1px solid var(--color-danger)',
                              borderRadius: 'var(--border-radius)',
                              background: 'none',
                              color: 'var(--color-danger)',
                              cursor: 'pointer',
                              fontSize: 12,
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <hr className={styles.divider} />
                <h3 className={styles.subTitle}>API Keys</h3>
                <p style={{ fontSize: 13, color: 'var(--color-gray-500)' }}>
                  Manage your API keys for programmatic access.{' '}
                  <Link
                    to="/integrations"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Manage API Keys →
                  </Link>
                </p>
              </div>
            )}

            {/* ── Notifications ── */}
            {tab === 'notifications' && (
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>Notification Preferences</h2>
                <form onSubmit={handleNotifSave} className={styles.form}>
                  <h3 className={styles.subTitle}>Email Notifications</h3>
                  {[
                    ['emailOnCreate', 'New record created and assigned to me'],
                    ['emailOnAssign', 'Record assigned to me'],
                    ['emailOnComment', 'Someone comments on a record I own'],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={notifForm[key]}
                        onChange={(e) =>
                          setNotifForm((p) => ({
                            ...p,
                            [key]: e.target.checked,
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}

                  <hr className={styles.divider} />
                  <h3 className={styles.subTitle}>In-App Notifications</h3>
                  {[
                    [
                      'inAppOnCreate',
                      'Show notification when a record is created',
                    ],
                    [
                      'inAppOnAssign',
                      'Show notification when a record is assigned to me',
                    ],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={notifForm[key]}
                        onChange={(e) =>
                          setNotifForm((p) => ({
                            ...p,
                            [key]: e.target.checked,
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}

                  <div>
                    <Button type="submit" loading={saving}>
                      Save Preferences
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Billing ── */}
            {tab === 'billing' && (
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>
                  Billing &amp; Subscription
                </h2>

                {/* Current plan */}
                <div
                  style={{
                    padding: 20,
                    border: '2px solid var(--color-primary)',
                    borderRadius: 'var(--border-radius-lg)',
                    marginBottom: 24,
                    background: 'var(--color-primary-light)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        Current Plan
                      </div>
                      <div
                        style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}
                      >
                        {planInfo.name}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                        }}
                      >
                        {planInfo.price}
                      </div>
                    </div>
                    <div
                      style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Active
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 8,
                    }}
                  >
                    {[
                      [
                        `${planInfo.users} user${planInfo.users > 1 ? 's' : ''}`,
                        'Seats',
                      ],
                      [planInfo.records, 'Records'],
                      [`${planInfo.objects} objects`, 'Custom Objects'],
                      [`${planInfo.automations} flows`, 'Automations'],
                    ].map(([val, lbl]) => (
                      <div key={lbl} style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{val}</span>
                        <span
                          style={{
                            color: 'var(--color-gray-600)',
                            marginLeft: 4,
                          }}
                        >
                          {lbl}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan comparison */}
                <h3 className={styles.subTitle}>Available Plans</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12,
                    marginBottom: 24,
                  }}
                >
                  {Object.entries(PLAN_FEATURES).map(([key, p]) => (
                    <div
                      key={key}
                      style={{
                        padding: 16,
                        border: `1px solid ${key === plan ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--border-radius)',
                        background:
                          key === plan
                            ? 'var(--color-primary-light)'
                            : 'var(--color-white)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        {key === plan && (
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--color-primary)',
                              fontWeight: 600,
                            }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          marginBottom: 10,
                        }}
                      >
                        {p.price}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          fontSize: 12,
                          color: 'var(--color-gray-600)',
                        }}
                      >
                        <span>
                          <Check
                            size={11}
                            style={{
                              color: '#16a34a',
                              marginRight: 4,
                              verticalAlign: 'middle',
                            }}
                          />
                          {p.users} user{p.users > 1 ? 's' : ''}
                        </span>
                        <span>
                          <Check
                            size={11}
                            style={{
                              color: '#16a34a',
                              marginRight: 4,
                              verticalAlign: 'middle',
                            }}
                          />
                          {p.records} records
                        </span>
                        <span>
                          <Check
                            size={11}
                            style={{
                              color: '#16a34a',
                              marginRight: 4,
                              verticalAlign: 'middle',
                            }}
                          />
                          {p.objects} custom objects
                        </span>
                        <span>
                          <Check
                            size={11}
                            style={{
                              color: '#16a34a',
                              marginRight: 4,
                              verticalAlign: 'middle',
                            }}
                          />
                          {p.automations} automation flows
                        </span>
                      </div>
                      {key !== plan && (
                        <button
                          style={{
                            marginTop: 12,
                            width: '100%',
                            padding: '7px 0',
                            border: '1px solid var(--color-primary)',
                            borderRadius: 'var(--border-radius)',
                            color: 'var(--color-primary)',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {key === 'starter' ? 'Downgrade' : 'Upgrade'} to{' '}
                          {p.name}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Payment info placeholder */}
                <h3 className={styles.subTitle}>Payment Method</h3>
                <div
                  style={{
                    padding: 16,
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      color: 'var(--color-gray-500)',
                      fontSize: 13,
                    }}
                  >
                    <CreditCard size={18} />
                    <span>No payment method on file</span>
                  </div>
                  <button
                    style={{
                      padding: '6px 14px',
                      border: '1px solid var(--color-primary)',
                      borderRadius: 'var(--border-radius)',
                      color: 'var(--color-primary)',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <Plus
                      size={12}
                      style={{ verticalAlign: 'middle', marginRight: 4 }}
                    />
                    Add Card
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--border-radius)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <AlertTriangle
                    size={16}
                    color="#d97706"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                  <div style={{ fontSize: 12, color: '#92400e' }}>
                    Billing is currently in preview mode. Plan changes and
                    payment processing will be enabled in a future release.
                    Contact your administrator to discuss custom pricing.
                  </div>
                </div>

                <hr className={styles.divider} />
                <h3 className={styles.subTitle}>Invoice History</h3>
                <div
                  style={{
                    padding: 20,
                    textAlign: 'center',
                    color: 'var(--color-gray-400)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: 13,
                  }}
                >
                  No invoices yet. Invoices will appear here once billing is
                  active.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
