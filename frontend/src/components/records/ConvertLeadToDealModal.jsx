import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../common/Button/Button';
import Modal from '../common/Modal/Modal';
import LookupInput from '../forms/LookupInput/LookupInput';
import QuickCreateForm from '../forms/LookupInput/QuickCreateForm/QuickCreateForm';
import { getFormBundle } from '../../services/api/objects';
import api from '../../services/api';
import { useObjectPermissions } from '../../hooks/useObjectPermissions';
import { useAuthContext } from '../../context/AuthContext';
import { fuzzyMatchBest } from '../../utils/fuzzyMatch';
import styles from './ApprovalActions.module.css';

const ConvertLeadToDealModal = ({
  isOpen,
  onClose,
  lead,
  onConfirm,
  isLoading,
}) => {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [clientData, setClientData] = useState({
    name: lead?.client || '',
    owner: user?._id,
    phone: lead?.phone || lead?.telephone,
    email: lead?.email || '',
    description: lead?.category || '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const perms = useObjectPermissions('client');

  // Fetch client form fields with react-query
  const { data: formBundle = {}, isLoading: fieldsLoading } = useQuery({
    queryKey: ['formBundle', 'client'],
    queryFn: () => getFormBundle('client'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all clients for fuzzy matching
  const { data: clientsData = {}, isLoading: clientsLoading } = useQuery({
    queryKey: ['all-clients-for-match'],
    queryFn: async () => {
      const res = await api.get('/records/client', {
        params: { limit: 1000, page: 1 },
      });
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-match client when modal opens
  useEffect(() => {
    if (isOpen && lead?.client && clientsData?.length > 0 && !selectedAccount) {
      const bestMatch = fuzzyMatchBest(lead.client, clientsData, (item) => item.name || '');

      // Auto-select if match score is high enough (70% or better)
      if (bestMatch.score >= 70 && bestMatch.item) {
        setSelectedAccount(bestMatch.item._id || bestMatch.item.id);
      }
    }
  }, [isOpen, lead?.client, clientsData, selectedAccount]);

  const clientFields = (formBundle?.fields || [])
    .filter((f) => {
      // Show fields that:
      // 1. User has permission to edit
      // 2. Are not read-only
      // 3. Are not formula/rollup/auto-number fields
      return (
        perms.canEditField(f.apiName) &&
        !f.isReadOnly &&
        !['formula', 'rollup_summary', 'auto_number'].includes(f.type)
      );
    })
    .sort((a, b) => {
      // Sort by: required first, then by display order
      const aRequired = a.isRequired ? 0 : 1;
      const bRequired = b.isRequired ? 0 : 1;
      if (aRequired !== bRequired) return aRequired - bRequired;
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });

  const handleCreateClient = async () => {
    if (!clientData.name?.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/records/client', clientData);
      const newClientId = response.data?.data?.id || response.data?.data?._id;

      setSelectedAccount(newClientId);
      setShowCreateClient(false);
      toast.success('Client created successfully');

      // Invalidate client-related queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['records', 'client'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create client');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFieldChange = (fieldApiName, value) => {
    setClientData((prev) => ({
      ...prev,
      [fieldApiName]: value,
    }));
  };

  const handleConfirm = () => {
    if (!selectedAccount) {
      toast.error('Please select or create a client to link to this deal');
      return;
    }
    onConfirm(selectedAccount);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert Lead to Deal"
      size="lg"
    >
      <div className={styles.modalContent}>
        {!showCreateClient ? (
          <>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#666' }}>
                Lead Client: <strong>{lead?.client || '—'}</strong>
              </p>
              {selectedAccount && clientsData?.length > 0 && (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#059669' }}>
                  ✓ Matched to existing client
                </p>
              )}
            </div>

            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                }}
              >
                Client (Auto-matched)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <LookupInput
                    value={selectedAccount || ''}
                    onChange={(id) => setSelectedAccount(id)}
                    objectApiName="client"
                    displayField="name"
                    placeholder="Search clients..."
                    allowCreate={false}
                  />
                </div>
              </div>
            </div>

            <p
              style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}
            >
              Select an existing client or create a new one to link to this
              deal.
            </p>

            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setShowCreateClient(true)}
              >
                Create Client
              </Button>
              <Button
                variant="primary"
                loading={isLoading}
                onClick={handleConfirm}
              >
                Convert to Deal
              </Button>
            </div>
          </>
        ) : (
          <>
            <p style={{ marginBottom: '16px' }}>
              Create a new client for this deal
            </p>

            <div
              style={{
                maxHeight: '500px',
                overflowY: 'auto',
                marginBottom: '16px',
              }}
            >
              <QuickCreateForm
                fields={clientFields}
                createData={clientData}
                onFieldChange={handleFieldChange}
                isLoading={fieldsLoading}
              />
            </div>

            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateClient(false);
                  setClientData({
                    name: lead?.client || '',
                    owner: user?._id,
                    phone: lead?.phone || lead?.telephone,
                    email: lead?.email || '',
                    description: lead?.category || '',
                  });
                }}
              >
                Back
              </Button>
              <Button
                variant="primary"
                loading={isCreating}
                onClick={handleCreateClient}
              >
                Create & Continue
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ConvertLeadToDealModal;
