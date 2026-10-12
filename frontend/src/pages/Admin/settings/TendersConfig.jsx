import React, { useState, useEffect } from 'react';
import { Search, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import AdminSettingsPage from '../AdminSettingsPage';
import Modal from '../../../components/common/Modal/Modal';
import styles from '../AdminSettingsPage.module.css';
import provinces from '../../../constants/tenderProvinces';
import tenderCategories from '../../../constants/tenderCategories';
import departments from '../../../constants/tenderDepartments';

const MultiSelectField = ({ label, value = [], options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (option) => {
    const newValue = value.includes(option)
      ? value.filter(v => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  return (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>{label}</label>
        <button
          onClick={() => setIsOpen(true)}
          className={styles.multiSelectButton}
        >
          <div className={styles.multiSelectContent}>
            {value.length === 0 ? (
              <span className={styles.placeholder}>{placeholder}</span>
            ) : (
              <div className={styles.selectedTags}>
                {value.map(v => (
                  <span key={v} className={styles.tag}>
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className={styles.count}>
            {value.length > 0 && `${value.length}`}
          </span>
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={label}
        size="md"
      >
        <div className={styles.multiSelectModal}>
          <div className={styles.searchContainer}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
              autoFocus
            />
          </div>

          <div className={styles.optionsList}>
            {filtered.map(option => (
              <label key={option} className={styles.optionItem}>
                <input
                  type="checkbox"
                  checked={value.includes(option)}
                  onChange={() => toggleOption(option)}
                  className={styles.checkbox}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              No options found
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default function TendersConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    fromDate: '',
    toDate: '',
    departments: [],
    provinces: [],
    categories: [],
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/admin/settings/tenders-config');
      if (res.data?.data) {
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load tenders config:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings/tenders-config', config);
      toast.success('Tenders configuration saved.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleMultiSelect = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AdminSettingsPage
      title="Tenders Config"
      description="Configure eTenders API filters for the Find Tenders page — Set Date Range, Departments, Provinces, and Categories to control which tenders are displayed"
      icon={Calendar}
      iconColor="#f59e0b"
    >
      {loading ? (
        <div className={styles.panel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ height: '60px', background: '#f9fafb', borderRadius: '8px' }} />
          <div style={{ height: '60px', background: '#f9fafb', borderRadius: '8px' }} />
          <div style={{ height: '60px', background: '#f9fafb', borderRadius: '8px' }} />
        </div>
      ) : (
        <div className={styles.panel}>
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Date Range Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>From Date</label>
                <input
                  type="date"
                  value={config.fromDate}
                  onChange={(e) => handleDateChange('fromDate', e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>To Date</label>
                <input
                  type="date"
                  value={config.toDate}
                  onChange={(e) => handleDateChange('toDate', e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            {/* Multi-Select Sections */}
            <MultiSelectField
              label="Departments"
              value={config.departments}
              options={departments}
              onChange={(val) => handleMultiSelect('departments', val)}
              placeholder="Select departments..."
            />

            <MultiSelectField
              label="Provinces"
              value={config.provinces}
              options={provinces}
              onChange={(val) => handleMultiSelect('provinces', val)}
              placeholder="Select provinces..."
            />

            <MultiSelectField
              label="Categories"
              value={config.categories}
              options={tenderCategories}
              onChange={(val) => handleMultiSelect('categories', val)}
              placeholder="Select categories..."
            />

            {/* Save Button */}
            <div className={styles.actions}>
              <button
                onClick={saveConfig}
                disabled={saving}
                className={styles.primaryButton}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSettingsPage>
  );
}
