import styles from './ExternalObjects.module.css';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Globe, Eye, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import ExternalObjectModal from './ExternalObjectModal';
import SchemaModal from './SchemaModal';
import {
  getExternalObjects,
  deleteExternalObject,
} from '../../../services/api/externalObjects';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const ExternalObjects = ({
  extModalOpen,
  setExtModalOpen,
  editingExt,
  // setEditingExt,
  onEdit,
}) => {
  const [schemaModal, setSchemaModal] = useState(null);
  const [syncing, setSyncing] = useState(null); // extId being synced

  const {
    data: extObjects,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['external-objects'],
    queryFn: getExternalObjects,
    onError: () => toast.error('Failed to load external objects.'),
  });

  const handleFetchSchema = async (ext) => {
    toast.loading('Fetching schema…', { id: 'schema' });
    try {
      const res = await api.post(`/external-objects/${ext._id}/fetch-schema`, {
        url: ext.listEndpoint || ext.baseUrl,
        dataPath: ext.dataPath,
      });

      toast.dismiss('schema');

      setSchemaModal({
        extId: ext._id,
        ...res.data.data,
      });
    } catch (err) {
      toast.dismiss('schema');
      toast.error(err.message || 'Fetch failed.');
    }
  };

  const applySchema = async (extId, suggestions) => {
    try {
      await api.put(`/external-objects/${extId}`, {
        fieldMappings: suggestions,
      });

      const res = await api.post(`/external-objects/${extId}/provision-object`);

      toast.success(res.data.message || 'Object provisioned.');

      setSchemaModal(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Provision failed.');
    }
  };

  const handleDelete = async (ext) => {
    if (!window.confirm(`Delete "${ext.name}"?`)) return;

    try {
      await deleteExternalObject(ext._id);
      toast.success('Deleted.');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSync = async (ext) => {
    setSyncing(ext._id);
    try {
      const res = await api.post(`/external-objects/${ext._id}/sync`);
      toast.success(res.data.message || 'Sync complete.');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Sync failed.');
    } finally {
      setSyncing(null);
    }
  };

  if (isLoading) return <div className={styles.center}>Loading…</div>;

  if (!extObjects?.length) {
    return (
      <div className={styles.empty}>
        <Globe size={40} />
        <p>No external objects yet</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      <ExternalObjectModal
        isOpen={extModalOpen}
        onClose={() => setExtModalOpen(false)}
        editingObject={editingExt}
        onSuccess={refetch}
      />

      {extObjects.map((ext) => (
        <div key={ext._id} className={styles.card}>
          <div className={styles.row}>
            <div className={styles.icon}>
              <Globe size={18} />
            </div>

            <div className={styles.info}>
              <div className={styles.name}>{ext.name}</div>
              <div className={styles.url}>{ext.baseUrl}</div>
            </div>

            <div className={styles.actions}>
              {ext.objectApiName && (
                <Link to={`/o/${ext.objectApiName}`}>
                  <Eye size={14} />
                </Link>
              )}

              <button onClick={() => handleFetchSchema(ext)}>
                <Globe size={14} />
              </button>

              <button
                onClick={() => handleSync(ext)}
                disabled={syncing === ext._id}
              >
                <RefreshCw size={14} />
              </button>

              <button onClick={() => onEdit(ext)}>
                <Edit2 size={14} />
              </button>

              <button onClick={() => handleDelete(ext)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ✅ Schema Modal lives HERE now */}
      {schemaModal && (
        <SchemaModal
          schemaModal={schemaModal}
          setSchemaModal={setSchemaModal}
          onApply={applySchema}
        />
      )}
    </div>
  );
};

export default ExternalObjects;
