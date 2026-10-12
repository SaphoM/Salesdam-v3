import React, { useState, useEffect } from 'react';
import { Info, MapPin, Search as SearchIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Button from '../../../components/common/Button/Button';
import AdminSettingsPage from '../AdminSettingsPage';
import { searchCurrencies, CURRENCIES } from '../../../constants/currencies';
import styles from '../AdminSettingsPage.module.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const Field = ({ label, hint, required, children }) => (
  <div className={styles.field}>
    <label className={styles.label}>
      {label}
      {required && <span className={styles.required}>*</span>}
    </label>
    {hint && <p className={styles.hint}>{hint}</p>}
    {children}
  </div>
);

const SectionBlock = ({ title, icon: Icon, children }) => (
  <div className={styles.sectionBlock}>
    <div className={styles.sectionBlockHeader}>
      {Icon && <Icon size={15} className={styles.sectionBlockIcon} />}
      <span>{title}</span>
    </div>
    <div className={styles.sectionBlockBody}>{children}</div>
  </div>
);

export default function CompanyInfo() {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({
    companyName: '', namePrefix: '', email: '', phone: '', vatNumber: '',
    description: '', website: '', financialYearStartMonth: 1,
    currency: { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    address: { street: '', city: '', province: '', zipCode: '', country: '' },
  });
  const [currencySearch, setCurrencySearch] = useState('');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [filteredCurrencies, setFilteredCurrencies] = useState(CURRENCIES);

  useEffect(() => {
    api.get('/admin/settings').then(res => {
      const tenant = res.data.data;
      if (tenant) {
        const companyProfile = tenant.companyProfile || {};
        setForm(prev => ({
          ...prev,
          companyName: companyProfile.companyName || tenant.name || '',
          namePrefix: companyProfile.namePrefix || '',
          email: companyProfile.email || '',
          phone: companyProfile.phone || '',
          vatNumber: companyProfile.vatNumber || '',
          description: companyProfile.description || '',
          website: companyProfile.website || '',
          financialYearStartMonth: companyProfile.financialYearStartMonth || 1,
          currency: tenant.operatingCurrency || { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
          address: {
            street: companyProfile.address?.street || '',
            city: companyProfile.address?.city || '',
            province: companyProfile.address?.province || '',
            zipCode: companyProfile.address?.zipCode || '',
            country: companyProfile.address?.country || '',
          },
        }));
      }
    }).catch(() => toast.error('Failed to load settings.')).finally(() => setLoading(false));
  }, []);

  // Filter currencies when search changes
  useEffect(() => {
    setFilteredCurrencies(searchCurrencies(currencySearch));
  }, [currencySearch]);

  const set     = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setAddr = (k, v) => setForm(p => ({ ...p, address: { ...p.address, [k]: v } }));

  const handleCurrencySelect = (currency) => {
    setForm(p => ({ ...p, currency }));
    setCurrencySearch('');
    setCurrencyDropdownOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        companyProfile: {
          companyName: form.companyName,
          namePrefix: form.namePrefix,
          email: form.email,
          phone: form.phone,
          vatNumber: form.vatNumber,
          description: form.description,
          website: form.website,
          financialYearStartMonth: form.financialYearStartMonth,
          address: form.address,
        },
        operatingCurrency: form.currency,
      });
      toast.success('Company information saved.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const SkeletonField = () => (
    <div className={styles.skeletonField}>
      <div className={styles.skeletonLabel} />
      <div className={styles.skeletonInput} />
    </div>
  );

  const SkeletonSection = () => (
    <div className={styles.skeletonSectionBlock}>
      <div className={styles.skeletonSectionBlockHeader} />
      <div className={styles.skeletonSectionBlockBody}>
        <div className={styles.skeletonGrid2}>
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
        </div>
      </div>
    </div>
  );

  return (
    <AdminSettingsPage
      title="Company Information"
      description="Manage your company details, branding, and profile settings"
      icon={Info}
    >
      {loading ? (
        <div className={styles.skeletonContainer}>
          <div className={styles.skeletonGrid2}>
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
          </div>
          <div className={styles.skeletonField}>
            <div className={styles.skeletonLabel} />
            <div className={styles.skeletonTextarea} />
          </div>
          <SkeletonSection />
          <div style={{ height: '44px' }} />
        </div>
      ) : (
        <form className={styles.panel} onSubmit={handleSubmit}>
          <div className={styles.grid2}>
            <Field label="Company Name" required>
              <input className={styles.input} value={form.companyName} onChange={e => set('companyName', e.target.value)} />
            </Field>
            <Field label="Name Prefix" required>
              <input className={styles.input} value={form.namePrefix} onChange={e => set('namePrefix', e.target.value)} placeholder="e.g. Inc., Ltd." />
            </Field>
            <Field label="Email" required>
              <input className={styles.input} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Phone" required>
              <input className={styles.input} value={form.phone} onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field label="Website" required>
              <input className={styles.input} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
            </Field>
            <Field label="VAT Number">
              <input className={styles.input} value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder="e.g. ZA123456789" />
            </Field>
            <Field label="Financial Year Start Month" required>
              <select className={styles.input} value={form.financialYearStartMonth} onChange={e => set('financialYearStartMonth', Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description" required>
            <textarea className={styles.textarea} rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>
          <SectionBlock title="Address" icon={MapPin}>
            <div className={styles.grid2}>
              <Field label="Street" required>
                <input className={styles.input} value={form.address.street} onChange={e => setAddr('street', e.target.value)} />
              </Field>
              <Field label="City" required>
                <input className={styles.input} value={form.address.city} onChange={e => setAddr('city', e.target.value)} />
              </Field>
              <Field label="Province" required>
                <input className={styles.input} value={form.address.province} onChange={e => setAddr('province', e.target.value)} />
              </Field>
              <Field label="Zip Code" required>
                <input className={styles.input} value={form.address.zipCode} onChange={e => setAddr('zipCode', e.target.value)} />
              </Field>
              <Field label="Country" required>
                <select className={styles.input} value={form.address.country} onChange={e => setAddr('country', e.target.value)}>
                  <option value="">-- Select Country --</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
            </div>
          </SectionBlock>
          <Field label="Operating Currency (Org-wide)" required>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Search currency by name or code (e.g., ZAR or South African Rand)"
                    value={currencySearch}
                    onChange={e => {
                      setCurrencySearch(e.target.value);
                      setCurrencyDropdownOpen(true);
                    }}
                    onFocus={() => setCurrencyDropdownOpen(true)}
                    style={{ width: '100%' }}
                  />
                  {currencySearch && (
                    <button
                      type="button"
                      onClick={() => setCurrencySearch('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    minWidth: '80px',
                    textAlign: 'center',
                    fontWeight: '500',
                  }}
                >
                  {form.currency.symbol}
                </div>
              </div>
              {currencyDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 10,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {filteredCurrencies.length > 0 ? (
                    filteredCurrencies.map((currency) => (
                      <button
                        key={currency.code}
                        type="button"
                        onClick={() => handleCurrencySelect(currency)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          textAlign: 'left',
                          background: form.currency.code === currency.code ? '#f0f0f0' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 150ms ease',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                        onMouseEnter={(e) => (e.target.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.target.style.background = form.currency.code === currency.code ? '#f0f0f0' : 'transparent')}
                      >
                        <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                          {currency.code} - {currency.symbol}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                          {currency.name}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>
                      No currencies found
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '6px' }}>
              Selected currency: <strong>{form.currency.name} ({form.currency.code})</strong> - This will be used org-wide for all currency displays.
            </div>
          </Field>
          <div className={styles.formActions}>
            <Button type="submit" loading={saving}>Save Company Information</Button>
          </div>
        </form>
      )}
    </AdminSettingsPage>
  );
}
