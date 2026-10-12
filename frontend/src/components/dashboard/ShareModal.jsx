import React, { useState, useEffect } from 'react';
import { Globe, Lock, Users, User } from 'lucide-react';
import Modal from '../common/Modal/Modal';
import Button from '../common/Button/Button';
import api from '../../services/api';
import styles from './ShareModal.module.css';

const ACCESS_OPTIONS = [
  { value: 'private',   label: 'Private',         desc: 'Only you can see this dashboard',          icon: Lock  },
  { value: 'workspace', label: 'Entire workspace', desc: 'Everyone in this workspace can view',      icon: Globe },
  { value: 'roles',     label: 'Specific roles',   desc: 'Users with selected roles can view',       icon: Users },
  { value: 'users',     label: 'Specific users',   desc: 'Only selected users can view',             icon: User  },
];

export default function ShareModal({ sharing: initialSharing, isOpen, onClose, onSave }) {
  const [sharing, setSharing] = useState(initialSharing || { access: 'private' });
  const [roles, setRoles]     = useState([]);
  const [users, setUsers]     = useState([]);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSharing(initialSharing || { access: 'private' });
    api.get('/roles').then(r => setRoles(r.data.data || [])).catch(() => {});
    api.get('/users').then(r => setUsers(r.data.data || [])).catch(() => {});
  }, [isOpen, initialSharing]);

  const set    = (key, val) => setSharing(s => ({ ...s, [key]: val }));
  const toggle = (key, id) => {
    const arr = sharing[key] || [];
    set(key, arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(sharing); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sharing Settings"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>Save</Button>
        </>
      }
    >
      <div className={styles.body}>
        {/* Access level */}
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Who can view this dashboard?</p>
          <div className={styles.options}>
            {ACCESS_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.option} ${sharing.access === opt.value ? styles.optionActive : ''}`}
                  onClick={() => set('access', opt.value)}
                >
                  <span className={styles.optionIcon}><Icon size={18} /></span>
                  <span className={styles.optionText}>
                    <strong>{opt.label}</strong>
                    <span>{opt.desc}</span>
                  </span>
                  <span className={`${styles.radio} ${sharing.access === opt.value ? styles.radioOn : ''}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Role picker */}
        {sharing.access === 'roles' && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Select roles</p>
            <div className={styles.pickList}>
              {roles.map(r => (
                <label key={r._id} className={styles.pickItem}>
                  <input type="checkbox" checked={(sharing.sharedWithRoles || []).includes(r._id)} onChange={() => toggle('sharedWithRoles', r._id)} />
                  {r.label || r.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* User picker */}
        {sharing.access === 'users' && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Select users</p>
            <div className={styles.pickList}>
              {users.map(u => (
                <label key={u._id} className={styles.pickItem}>
                  <input type="checkbox" checked={(sharing.sharedWithUsers || []).includes(u._id)} onChange={() => toggle('sharedWithUsers', u._id)} />
                  {u.firstName} {u.lastName} <span className={styles.email}>{u.email}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Edit access */}
        {sharing.access !== 'private' && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Edit access</p>
            <label className={styles.toggle}>
              <input type="checkbox" checked={!!sharing.allowEdit} onChange={e => set('allowEdit', e.target.checked)} />
              <span>Allow others to edit this dashboard</span>
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}
