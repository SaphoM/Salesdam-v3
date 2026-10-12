import { useEffect, useState } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import styles from './ExternalObjectModal.module.css';

const EMPTY_EXT = {
  name: '',
  description: '',
  objectApiName: '',
  baseUrl: '',
  listEndpoint: '',
  dataPath: '',
  idField: 'id',
  authType: 'none',
  credentials: {},
  fieldMappings: [],
};

const ExternalObjectModal = ({ isOpen, onClose, editingObject, onSuccess }) => {
  const [form, setForm] = useState(EMPTY_EXT);
  const [saving, setSaving] = useState(false);

  const isEdit = !!editingObject;

  // Populate form when editing
  useEffect(() => {
    if (editingObject) {
      setForm({
        name: editingObject.name,
        description: editingObject.description || '',
        objectApiName: editingObject.objectApiName || '',
        baseUrl: editingObject.baseUrl,
        listEndpoint: editingObject.listEndpoint || '',
        dataPath: editingObject.dataPath || '',
        idField: editingObject.idField || 'id',
        authType: editingObject.authType || 'none',
        credentials: {},
        fieldMappings: editingObject.fieldMappings || [],
      });
    } else {
      setForm(EMPTY_EXT);
    }
  }, [editingObject, isOpen]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateCredential = (key, value) => {
    setForm((prev) => ({
      ...prev,
      credentials: { ...prev.credentials, [key]: value },
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    if (!form.baseUrl.trim()) return toast.error('Base URL is required');
    if (!form.objectApiName.trim())
      return toast.error('Object API name is required');

    setSaving(true);

    try {
      if (isEdit) {
        await api.put(`/external-objects/${editingObject._id}`, form);
        toast.success('External object updated');
      } else {
        await api.post('/external-objects', form);
        toast.success('External object created');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit External Object' : 'New External Object'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSave}>
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <div className={styles.grid2}>
          <div>
            <label>Name *</label>
            <input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>

          <div>
            <label>Object API Name *</label>
            <input
              value={form.objectApiName}
              disabled={isEdit}
              onChange={(e) =>
                updateField(
                  'objectApiName',
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                )
              }
            />
          </div>
        </div>

        <div>
          <label>Base URL *</label>
          <input
            value={form.baseUrl}
            onChange={(e) => updateField('baseUrl', e.target.value)}
          />
        </div>

        <div className={styles.grid3}>
          <div>
            <label>Data Path</label>
            <input
              value={form.dataPath}
              onChange={(e) => updateField('dataPath', e.target.value)}
            />
          </div>

          <div>
            <label>ID Field</label>
            <input
              value={form.idField}
              onChange={(e) => updateField('idField', e.target.value)}
            />
          </div>

          <div>
            <label>Auth Type</label>
            <select
              value={form.authType}
              onChange={(e) => updateField('authType', e.target.value)}
            >
              <option value="none">None</option>
              <option value="bearer">Bearer</option>
              <option value="api_key">API Key</option>
              <option value="basic">Basic</option>
            </select>
          </div>
        </div>

        {/* Auth Fields */}
        {form.authType === 'bearer' && (
          <div>
            <label>Bearer Token</label>
            <input
              type="password"
              value={form.credentials?.token || ''}
              onChange={(e) => updateCredential('token', e.target.value)}
            />
          </div>
        )}

        {form.authType === 'api_key' && (
          <div className={styles.grid2}>
            <div>
              <label>Header Name</label>
              <input
                value={form.credentials?.apiKeyHeader || ''}
                onChange={(e) =>
                  updateCredential('apiKeyHeader', e.target.value)
                }
              />
            </div>

            <div>
              <label>API Key</label>
              <input
                type="password"
                value={form.credentials?.apiKey || ''}
                onChange={(e) => updateCredential('apiKey', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExternalObjectModal;
