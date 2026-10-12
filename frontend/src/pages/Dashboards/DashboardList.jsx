import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Folder,
  FolderOpen,
  LayoutDashboard,
  MoreHorizontal,
  Edit2,
  Trash2,
  Share2,
  Globe,
  Lock,
  Users,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import Layout from '../../layout/Layout';
import styles from './DashboardList.module.css';

const ACCESS_ICONS = {
  private: <Lock size={12} />,
  workspace: <Globe size={12} />,
  roles: <Users size={12} />,
  users: <Users size={12} />,
};

// ─── Create/Edit Dashboard Modal ─────────────────────────────────────────────
function DashboardFormModal({ isOpen, onClose, onSave, folders, initial }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    folderId: '',
    icon: 'LayoutDashboard',
    color: '#6366f1',
  });

  useEffect(() => {
    setForm(
      initial
        ? {
            name: initial.name,
            description: initial.description || '',
            folderId: initial.folderId?._id || '',
            icon: initial.icon || 'LayoutDashboard',
            color: initial.color || '#6366f1',
          }
        : {
            name: '',
            description: '',
            folderId: '',
            icon: 'LayoutDashboard',
            color: '#6366f1',
          },
    );
  }, [initial, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? 'Edit Dashboard' : 'New Dashboard'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)}>Save</Button>
        </>
      }
    >
      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Name *</label>
          <input
            className={styles.formInput}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Sales Overview"
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Folder</label>
          <select
            className={styles.formInput}
            value={form.folderId}
            onChange={(e) =>
              setForm((f) => ({ ...f, folderId: e.target.value }))
            }
          >
            <option value="">No folder</option>
            {folders.map((fl) => (
              <option key={fl._id} value={fl._id}>
                {fl.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formField} style={{ gridColumn: '1/-1' }}>
          <label className={styles.formLabel}>Description</label>
          <textarea
            className={styles.formInput}
            rows={2}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Optional description"
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Colour</label>
          <input
            type="color"
            className={styles.colorInput}
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Create Folder Modal ──────────────────────────────────────────────────────
function FolderFormModal({ isOpen, onClose, onSave, initial }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  useEffect(() => {
    setName(initial?.name || '');
    setColor(initial?.color || '#6366f1');
  }, [initial, isOpen]);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? 'Edit Folder' : 'New Folder'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave({ name, color })}>Save</Button>
        </>
      }
    >
      <div className={styles.formGrid}>
        <div className={styles.formField} style={{ gridColumn: '1/-1' }}>
          <label className={styles.formLabel}>Name *</label>
          <input
            className={styles.formInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Colour</label>
          <input
            type="color"
            className={styles.colorInput}
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Dashboard card ───────────────────────────────────────────────────────────
function DashCard({ dash, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.card}>
      <div
        className={styles.cardColor}
        style={{ background: dash.color || '#6366f1' }}
      />
      <div className={styles.cardBody}>
        <div
          className={styles.cardIcon}
          style={{ color: dash.color || '#6366f1' }}
        >
          <LayoutDashboard size={20} />
        </div>
        <div className={styles.cardInfo}>
          <Link to={`/dashboards/${dash._id}`} className={styles.cardName}>
            {dash.name}
          </Link>
          {dash.description && (
            <p className={styles.cardDesc}>{dash.description}</p>
          )}
          <div className={styles.cardMeta}>
            <span className={styles.accessBadge}>
              {ACCESS_ICONS[dash.sharing?.access || 'private']}
              {dash.sharing?.access || 'private'}
            </span>
            <span className={styles.cardDate}>
              {new Date(dash.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className={styles.cardActions}>
          <Link to={`/dashboards/${dash._id}/edit`}>
            <button className={styles.cardBtn} title="Edit">
              <Edit2 size={14} />
            </button>
          </Link>
          <div style={{ position: 'relative' }}>
            <button
              className={styles.cardBtn}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className={styles.cardMenu}>
                <button
                  className={styles.cardMenuItem}
                  onClick={() => {
                    onEdit(dash);
                    setMenuOpen(false);
                  }}
                >
                  <Edit2 size={13} /> Rename
                </button>
                <button
                  className={`${styles.cardMenuItem} ${styles.danger}`}
                  onClick={() => {
                    onDelete(dash._id);
                    setMenuOpen(false);
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardList() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState({});

  const [dashModal, setDashModal] = useState(false);
  const [folderModal, setFolderModal] = useState(false);
  const [editingDash, setEditingDash] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);

  const load = async () => {
    try {
      const [dRes, fRes] = await Promise.all([
        api.get('/dashboards'),
        api.get('/dashboard-folders'),
      ]);
      setDashboards(dRes.data.data || []);
      setFolders(fRes.data.data || []);
      // Default-open all folders
      const init = {};
      (fRes.data.data || []).forEach((f) => {
        init[f._id] = true;
      });
      setOpenFolders(init);
    } catch {
      toast.error('Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateDash = async (form) => {
    if (!form.name) return toast.error('Name is required');
    try {
      const res = await api.post('/dashboards', form);
      toast.success('Dashboard created');
      setDashModal(false);
      navigate(`/dashboards/${res.data.data._id}/edit`);
    } catch {
      toast.error('Failed to create');
    }
  };

  const handleUpdateDash = async (form) => {
    try {
      await api.put(`/dashboards/${editingDash._id}`, form);
      toast.success('Updated');
      setEditingDash(null);
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDeleteDash = async (id) => {
    if (!window.confirm('Delete this dashboard?')) return;
    try {
      await api.delete(`/dashboards/${id}`);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleCreateFolder = async (form) => {
    if (!form.name) return toast.error('Name is required');
    try {
      await api.post('/dashboard-folders', form);
      toast.success('Folder created');
      setFolderModal(false);
      load();
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleUpdateFolder = async (form) => {
    try {
      await api.put(`/dashboard-folders/${editingFolder._id}`, form);
      toast.success('Folder updated');
      setEditingFolder(null);
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDeleteFolder = async (id) => {
    if (!window.confirm('Delete folder? Dashboards will be moved out.')) return;
    try {
      await api.delete(`/dashboard-folders/${id}`);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleFolder = (id) => setOpenFolders((o) => ({ ...o, [id]: !o[id] }));

  // Group dashboards by folder
  const inFolder = (fId) =>
    dashboards.filter((d) => d.folderId?._id === fId || d.folderId === fId);
  const noFolder = dashboards.filter((d) => !d.folderId);

  if (loading)
    return (
      <Layout
        title="Dashboards"
        description="View and manage your custom dashboards"
      >
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      </Layout>
    );

  return (
    <Layout
      title="Dashboards"
      description="View and manage your custom dashboards"
    >
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Dashboards</h1>
            <p className={styles.subtitle}>
              Build and share custom dashboards with widgets
            </p>
          </div>
          <div className={styles.headerActions}>
            <Button
              variant="secondary"
              icon={<Folder size={14} />}
              onClick={() => {
                setEditingFolder(null);
                setFolderModal(true);
              }}
            >
              New Folder
            </Button>
            <Button
              icon={<Plus size={14} />}
              onClick={() => {
                setEditingDash(null);
                setDashModal(true);
              }}
            >
              New Dashboard
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Folders */}
          {folders.map((folder) => {
            const items = inFolder(folder._id);
            const isOpen = openFolders[folder._id];
            return (
              <div key={folder._id} className={styles.folderGroup}>
                <div className={styles.folderHeader}>
                  <button
                    className={styles.folderToggle}
                    onClick={() => toggleFolder(folder._id)}
                  >
                    {isOpen ? (
                      <FolderOpen size={18} style={{ color: folder.color }} />
                    ) : (
                      <Folder size={18} style={{ color: folder.color }} />
                    )}
                    <span className={styles.folderName}>{folder.name}</span>
                    <span className={styles.folderCount}>{items.length}</span>
                    {isOpen ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                  <div className={styles.folderActions}>
                    <button
                      className={styles.folderBtn}
                      title="Rename folder"
                      onClick={() => {
                        setEditingFolder(folder);
                        setFolderModal(true);
                      }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className={`${styles.folderBtn} ${styles.danger}`}
                      title="Delete folder"
                      onClick={() => handleDeleteFolder(folder._id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className={styles.cardGrid}>
                    {items.length === 0 && (
                      <div className={styles.emptyFolder}>
                        No dashboards in this folder
                      </div>
                    )}
                    {items.map((d) => (
                      <DashCard
                        key={d._id}
                        dash={d}
                        onEdit={(dash) => {
                          setEditingDash(dash);
                          setDashModal(true);
                        }}
                        onDelete={handleDeleteDash}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* No-folder dashboards */}
          {noFolder.length > 0 && (
            <div className={styles.folderGroup}>
              {folders.length > 0 && (
                <div className={styles.unfolderedLabel}>Other Dashboards</div>
              )}
              <div className={styles.cardGrid}>
                {noFolder.map((d) => (
                  <DashCard
                    key={d._id}
                    dash={d}
                    onEdit={(dash) => {
                      setEditingDash(dash);
                      setDashModal(true);
                    }}
                    onDelete={handleDeleteDash}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {dashboards.length === 0 && (
            <div className={styles.empty}>
              <LayoutDashboard size={48} strokeWidth={1} />
              <h3>No dashboards yet</h3>
              <p>Create your first dashboard to start tracking what matters.</p>
              <Button
                icon={<Plus size={14} />}
                onClick={() => setDashModal(true)}
              >
                New Dashboard
              </Button>
            </div>
          )}
        </div>

        {/* Modals */}
        <DashboardFormModal
          isOpen={dashModal}
          onClose={() => {
            setDashModal(false);
            setEditingDash(null);
          }}
          folders={folders}
          onSave={editingDash ? handleUpdateDash : handleCreateDash}
          initial={editingDash}
        />
        <FolderFormModal
          isOpen={folderModal}
          onClose={() => {
            setFolderModal(false);
            setEditingFolder(null);
          }}
          onSave={editingFolder ? handleUpdateFolder : handleCreateFolder}
          initial={editingFolder}
        />
      </div>
    </Layout>
  );
}
