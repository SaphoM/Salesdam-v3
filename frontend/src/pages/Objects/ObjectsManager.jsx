import styles from './ObjectsManager.module.css';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import CRMObjects from './CRMObjects/CRMObjects';
import ExternalObjects from './ExternalObjects/ExternalObjects';

const ObjectsManager = () => {
  const { canManageObjects, canManageIntegrations } = useAuth();

  // External objects state
  const [extModalOpen, setExtModalOpen] = useState(false);
  const [editingExt, setEditingExt] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'objects'; // 'objects' | 'external'

  const openExtNew = () => {
    setEditingExt(null);
    setExtModalOpen(true);
  };

  const openExtEdit = (ext) => {
    setEditingExt(ext);
    setExtModalOpen(true);
  };

  const handleNewObject = () => {
    if (!canManageObjects) {
      toast.error('You do not have permission to create objects.');
      return;
    }
    window.location.href = '/setup/objects/new';
  };

  const handleNewExternalObject = () => {
    if (!canManageIntegrations) {
      toast.error('You do not have permission to manage external objects.');
      return;
    }
    openExtNew();
  };

  return (
    <Layout
      title="Object Settings"
      description="Define and manage custom data objects and their fields"
    >
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Object Settings</h1>
            <p className={styles.subtitle}>
              Define custom data models for your CRM
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {activeTab === 'objects' && (
              <>
                {canManageObjects && (
                  <Link to="/setup/schema-builder">
                    <Button variant="secondary" icon={<GitBranch size={14} />}>
                      Schema Builder
                    </Button>
                  </Link>
                )}
                {canManageObjects ? (
                  <Button icon={<Plus size={14} />} onClick={handleNewObject}>
                    New Object
                  </Button>
                ) : (
                  <Button icon={<Plus size={14} />} disabled title="No permission to create objects">
                    New Object
                  </Button>
                )}
              </>
            )}
            {activeTab === 'external' && (
              canManageIntegrations ? (
                <Button icon={<Plus size={14} />} onClick={handleNewExternalObject}>
                  New External Object
                </Button>
              ) : (
                <Button icon={<Plus size={14} />} disabled title="No permission to manage external objects">
                  New External Object
                </Button>
              )
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '2px solid var(--border-color)',
            marginBottom: 'var(--spacing-5)',
          }}
        >
          {[
            ['objects', 'CRM Objects'],
            ['external', 'External Objects'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSearchParams({ tab: id })}
              style={{
                padding: '8px 20px',
                fontWeight: 500,
                fontSize: 14,
                border: 'none',
                borderBottom: `2px solid ${activeTab === id ? 'var(--color-primary)' : 'transparent'}`,
                marginBottom: -2,
                background: 'none',
                cursor: 'pointer',
                color:
                  activeTab === id
                    ? 'var(--color-primary)'
                    : 'var(--color-gray-500)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── CRM Objects tab ── */}
        {activeTab === 'objects' && <CRMObjects />}

        {/* ── External Objects tab ── */}
        {activeTab === 'external' && (
          <ExternalObjects
            editingExt={editingExt}
            extModalOpen={extModalOpen}
            setEditingExt={setEditingExt}
            setExtModalOpen={setExtModalOpen}
            onEdit={openExtEdit}
          />
        )}
      </div>
    </Layout>
  );
};

export default ObjectsManager;
