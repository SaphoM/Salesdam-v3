import styles from './WorkspaceManager.module.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from '../../services/api/workspaces';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import ColorPicker from '../../components/common/ColorPicker/ColorPicker';
import IconPicker from './IconPicker/IconPicker';
import WsCard from './WsCard/WsCard';
import WorkspaceSkeleton from './WorkspaceSkeleton/WorkspaceSkeleton';

const COLORS = [
  '#6366f1',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#0ea5e9',
  '#14b8a6',
  '#f97316',
  '#ec4899',
];

const BLANK = {
  name: '',
  description: '',
  color: '#6366f1',
  icon: 'Briefcase',
};

const WorkspaceManager = () => {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  // Fetch workspaces with React Query
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
    onError: () => toast.error('Failed to load workspaces.'),
  });

  const openNew = () => {
    setEditing(null);
    setForm(BLANK);
    setModalOpen(true);
  };
  const openEdit = (ws) => {
    setEditing(ws._id);
    setForm({
      name: ws.name,
      description: ws.description || '',
      color: ws.color || '#6366f1',
      icon: ws.icon || 'Briefcase',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateWorkspace(editing, form);
        toast.success('Workspace updated.');
      } else {
        await createWorkspace(form);
        toast.success('Workspace created.');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    } catch (err) {
      toast.error(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ws) => {
    if (
      !window.confirm(`Delete workspace "${ws.name}"? This cannot be undone.`)
    )
      return;
    try {
      await deleteWorkspace(ws._id);
      toast.success('Workspace deleted.');
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Workspaces</h1>
          <p className={styles.subtitle}>
            Workspaces are sub-divisions of your organisation. Users belong to
            one organisation but can be members of multiple workspaces.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button icon={<Plus size={14} />} onClick={openNew}>
            New Workspace
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {[1, 2, 3].map((i) => (
            <WorkspaceSkeleton key={i} />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div className={styles.empty}>
          <Briefcase size={48} className={styles.emptyIcon} />
          <h3>No workspaces yet</h3>
          <p>Create your first workspace to organise your team.</p>
          <Button onClick={openNew}>Create Workspace</Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {workspaces.map((ws) => (
            <WsCard
              key={ws._id}
              ws={ws}
              onEdit={openEdit}
              onDelete={handleDelete}
              onView={(ws) => navigate(`/workspaces/${ws._id}`)}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Workspace' : 'New Workspace'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
              Name *
            </label>
            <input
              className={styles.input}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Sales Team"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
              Description
            </label>
            <input
              className={styles.input}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="What is this workspace for?"
            />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <ColorPicker
              label="Color"
              value={form.color}
              onChange={(color) => setForm((p) => ({ ...p, color }))}
              allowCustom={true}
            />
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <label
                style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}
              >
                Icon
              </label>
              <IconPicker
                value={form.icon}
                onChange={(icon) => setForm((p) => ({ ...p, icon }))}
                color={form.color}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkspaceManager;
