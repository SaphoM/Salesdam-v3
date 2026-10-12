import React, { useState, useEffect } from 'react';
import { FileText, Building2, MapPin, Landmark, Receipt, ClipboardList, FileCheck, AlignLeft, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { getFields } from '../../../services/api/objects';
import Button from '../../../components/common/Button/Button';
import ImageUpload from '../../../components/common/ImageUpload/ImageUpload';
import AdminSettingsPage from '../AdminSettingsPage';
import styles from '../AdminSettingsPage.module.css';

const Field = ({ label, hint, children }) => (
  <div className={styles.field}>
    <label className={styles.label}>{label}</label>
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

const CheckRow = ({ label, checked, onChange }) => (
  <label className={styles.checkRow}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

/** A single read-only value sourced from field metadata. */
const ReadOnlyField = ({ label, value, mono }) => (
  <div className={styles.field}>
    <label className={styles.label}>{label}</label>
    <div className={mono ? styles.readOnlyValueMono : styles.readOnlyValue}>
      {value === '' || value === null || value === undefined ? '—' : value}
    </div>
  </div>
);

/**
 * Numbering for quotes and invoices comes from the auto-number field on the
 * object (quote_number / invoice_number), not from tenant settings. This block
 * shows the live configuration and points at where it's actually edited.
 */
const NumberingPanel = ({ objectApiName, objectLabel, field, loading }) => {
  const setupLink = `/setup/objects/${objectApiName}?tab=fields`;

  if (loading) {
    return <p className={styles.hint}>Loading numbering configuration…</p>;
  }

  if (!field) {
    return (
      <p className={styles.hint}>
        No auto-number field found on the {objectLabel} object. Configure the{' '}
        <code>{objectApiName}_number</code> field under{' '}
        <Link to={setupLink}>Object Settings → {objectLabel} → Fields</Link>.
      </p>
    );
  }

  const padding = field.autoNumberPadding ?? 4;
  const startAt = field.autoNumberStartAt ?? 1;
  const preview = `${field.autoNumberPrefix ?? ''}${String(startAt).padStart(padding, '0')}`;

  return (
    <>
      <p className={styles.hint}>
        {objectLabel} numbering is controlled by the{' '}
        <code>{field.apiName}</code> field on the {objectLabel} object. Edit it
        under <Link to={setupLink}>Object Settings → {objectLabel} → Fields</Link>.
      </p>
      <div className={styles.grid2}>
        <ReadOnlyField label="Prefix" value={field.autoNumberPrefix} mono />
        <ReadOnlyField label="Digit Padding" value={padding} />
        <ReadOnlyField label="Starting Number" value={startAt} />
        <ReadOnlyField label="Next Number Format" value={preview} mono />
      </div>
    </>
  );
};

const DEFAULT = {
  companyName: '', website: '', emailAddress: '', phoneNumber: '', companyLogo: '',
  street: '', city: '', stateProvince: '', zipPostalCode: '', country: '',
  bankName: '', accountName: '', accountNumber: '',
  invoicePrefix: 'INV', invoiceStartingNumber: 1, invoiceNumberingFormat: '', defaultTaxRate: 0,
  quotePrefix: 'QUO', quoteStartingNumber: 1, quoteValidityDays: 30,
  invoiceTerms: '', quoteTerms: '', paymentInstructions: '', cancellationPolicy: '',
  invoiceFooter: '',
  showLogoOnDocuments: true, showBankingDetailsOnInvoices: true,
  showBankingDetailsOnQuotes: false, showTaxBreakdown: true, showDiscountField: false,
};

export default function InvoiceQuote() {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [locked,  setLocked]  = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [logoData, setLogoData] = useState(null);

  // Live auto-number configuration for the quote/invoice number fields, which is
  // what actually drives numbering.
  const [invoiceNumberField, setInvoiceNumberField] = useState(null);
  const [quoteNumberField, setQuoteNumberField] = useState(null);
  const [loadingNumbering, setLoadingNumbering] = useState(true);

  useEffect(() => {
    const pickAutoNumber = (fields, apiName) => {
      const list = Array.isArray(fields) ? fields : [];
      return (
        list.find((f) => f.apiName === apiName && f.type === 'auto_number') ||
        list.find((f) => f.type === 'auto_number') ||
        null
      );
    };

    Promise.all([
      getFields('invoice').catch(() => []),
      getFields('quote').catch(() => []),
    ])
      .then(([invoiceFields, quoteFields]) => {
        setInvoiceNumberField(pickAutoNumber(invoiceFields, 'invoice_number'));
        setQuoteNumberField(pickAutoNumber(quoteFields, 'quote_number'));
      })
      .finally(() => setLoadingNumbering(false));
  }, []);

  useEffect(() => {
    api.get('/admin/settings').then(res => {
      const tenant = res.data.data;
      if (!tenant?.features?.enableSalesdamFeatures) { setLocked(true); return; }
      const settings = tenant.invoiceQuoteSettings || {};
      setForm(prev => ({ ...prev, ...settings }));

      // If there's an existing logo URL, show it as a preview and keep it in form state
      if (settings.companyLogo) {
        setLogoData({
          preview: settings.companyLogo,
          fileName: 'Current Logo',
          isUrl: true,
        });
        // Ensure the logo URL is also in form state for the next save
        setForm(prev => ({ ...prev, companyLogo: settings.companyLogo }));
      }
    }).catch(() => toast.error('Failed to load settings.')).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleLogoChange = (imageData) => {
    setLogoData(imageData);
    set('companyLogo', imageData.file);
  };

  const handleLogoRemove = () => {
    setLogoData(null);
    set('companyLogo', '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const settingsData = { ...form };

      // Quote/invoice generation still refuses to run unless these are set, but
      // they're no longer editable here (numbering lives on the object's
      // auto-number field). Keep them populated so generation can't break.
      settingsData.invoicePrefix = settingsData.invoicePrefix || DEFAULT.invoicePrefix;
      settingsData.quotePrefix = settingsData.quotePrefix || DEFAULT.quotePrefix;

      // If there's a new logo file, convert to base64
      if (settingsData.companyLogo instanceof File) {
        const file = settingsData.companyLogo;
        const reader = new FileReader();

        await new Promise((resolve, reject) => {
          reader.onload = () => {
            settingsData.companyLogo = reader.result; // base64 data URL
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const res = await api.put('/admin/settings', {
        invoiceQuoteSettings: settingsData,
      });

      // Update the form with the returned settings, including the saved logo URL
      if (res.data?.data?.invoiceQuoteSettings) {
        const savedSettings = res.data.data.invoiceQuoteSettings;
        setForm(prev => ({ ...prev, ...savedSettings }));

        // Update logoData with the saved URL
        if (savedSettings.companyLogo) {
          setLogoData({
            preview: savedSettings.companyLogo,
            fileName: 'Current Logo',
            isUrl: true,
          });
        } else {
          setLogoData(null);
        }
      }

      toast.success('Invoice & Quote settings saved.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const SkeletonField = () => (
    <div className={styles.skeletonField}>
      <div className={styles.skeletonLabel} style={{ width: '120px' }} />
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
      title="Invoice & Quote Settings"
      description="Configure business information and document preferences"
      icon={FileText}
    >
      {loading ? (
        <div className={styles.skeletonContainer}>
          <SkeletonSection />
          <SkeletonSection />
          <SkeletonSection />
          <SkeletonSection />
          <SkeletonSection />
          <SkeletonSection />
          <SkeletonSection />
          <div style={{ height: '44px' }} />
        </div>
      ) : locked ? (
        <div className={styles.lockedPanel}>
          <FileText size={36} className={styles.lockedIcon} />
          <h3>Invoice &amp; Quote Settings</h3>
          <p>These settings require <strong>Salesdam Features</strong> to be enabled.</p>
          <p className={styles.lockedHint}>
            Go to <Link to="/admin/settings/other">Other Settings</Link> and enable "Salesdam Features" to unlock this section.
          </p>
        </div>
      ) : (
        <form className={styles.panel} onSubmit={handleSubmit}>
          <SectionBlock title="Company Information" icon={Building2}>
            <div className={styles.grid2}>
              <Field label="Company Name"><input className={styles.input} value={form.companyName} onChange={e => set('companyName', e.target.value)} /></Field>
              <Field label="Website"><input className={styles.input} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" /></Field>
              <Field label="Email Address"><input className={styles.input} type="email" value={form.emailAddress} onChange={e => set('emailAddress', e.target.value)} /></Field>
              <Field label="Phone Number"><input className={styles.input} value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} /></Field>
            </div>
            <ImageUpload
              label="Company Logo"
              hint="Upload your company logo image (PNG, JPG, GIF up to 5MB)"
              value={logoData}
              onChange={handleLogoChange}
              onRemove={handleLogoRemove}
            />
          </SectionBlock>
          <SectionBlock title="Business Address" icon={MapPin}>
            <div className={styles.grid2}>
              <Field label="Street"><input className={styles.input} value={form.street} onChange={e => set('street', e.target.value)} /></Field>
              <Field label="City"><input className={styles.input} value={form.city} onChange={e => set('city', e.target.value)} /></Field>
              <Field label="State / Province"><input className={styles.input} value={form.stateProvince} onChange={e => set('stateProvince', e.target.value)} /></Field>
              <Field label="Zip / Postal Code"><input className={styles.input} value={form.zipPostalCode} onChange={e => set('zipPostalCode', e.target.value)} /></Field>
              <Field label="Country"><input className={styles.input} value={form.country} onChange={e => set('country', e.target.value)} /></Field>
            </div>
          </SectionBlock>
          <SectionBlock title="Banking Details" icon={Landmark}>
            <div className={styles.grid2}>
              <Field label="Bank Name"><input className={styles.input} value={form.bankName} onChange={e => set('bankName', e.target.value)} /></Field>
              <Field label="Account Name"><input className={styles.input} value={form.accountName} onChange={e => set('accountName', e.target.value)} /></Field>
              <Field label="Account Number"><input className={styles.input} value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} /></Field>
            </div>
          </SectionBlock>
          <SectionBlock title="Invoice Configuration" icon={Receipt}>
            <NumberingPanel
              objectApiName="invoice"
              objectLabel="Invoice"
              field={invoiceNumberField}
              loading={loadingNumbering}
            />
            <div className={styles.grid2}>
              <Field label="Default Tax Rate (%)"><input className={styles.input} type="number" min="0" max="100" step="0.01" value={form.defaultTaxRate} onChange={e => set('defaultTaxRate', Number(e.target.value))} /></Field>
            </div>
          </SectionBlock>
          <SectionBlock title="Quote Configuration" icon={ClipboardList}>
            <NumberingPanel
              objectApiName="quote"
              objectLabel="Quote"
              field={quoteNumberField}
              loading={loadingNumbering}
            />
            <div className={styles.grid2}>
              <Field label="Quote Validity (Days)"><input className={styles.input} type="number" min="1" value={form.quoteValidityDays} onChange={e => set('quoteValidityDays', Number(e.target.value))} /></Field>
            </div>
          </SectionBlock>
          <SectionBlock title="Terms and Conditions" icon={FileCheck}>
            <Field label="Invoice Terms & Conditions"><textarea className={styles.textarea} rows={4} value={form.invoiceTerms} onChange={e => set('invoiceTerms', e.target.value)} /></Field>
            <Field label="Quote Terms & Conditions"><textarea className={styles.textarea} rows={4} value={form.quoteTerms} onChange={e => set('quoteTerms', e.target.value)} /></Field>
            <Field label="Payment Instructions"><textarea className={styles.textarea} rows={3} value={form.paymentInstructions} onChange={e => set('paymentInstructions', e.target.value)} /></Field>
            <Field label="Cancellation Policy"><textarea className={styles.textarea} rows={3} value={form.cancellationPolicy} onChange={e => set('cancellationPolicy', e.target.value)} /></Field>
          </SectionBlock>
          <SectionBlock title="Invoice Footer" icon={AlignLeft}>
            <Field label="Invoice Footer"><textarea className={styles.textarea} rows={3} value={form.invoiceFooter} onChange={e => set('invoiceFooter', e.target.value)} /></Field>
          </SectionBlock>
          <SectionBlock title="Display Preferences" icon={Eye}>
            <div className={styles.checkList}>
              <CheckRow label="Show Logo on Documents"           checked={form.showLogoOnDocuments}          onChange={v => set('showLogoOnDocuments', v)} />
              <CheckRow label="Show Banking Details on Invoices" checked={form.showBankingDetailsOnInvoices} onChange={v => set('showBankingDetailsOnInvoices', v)} />
              <CheckRow label="Show Banking Details on Quotes"   checked={form.showBankingDetailsOnQuotes}   onChange={v => set('showBankingDetailsOnQuotes', v)} />
              <CheckRow label="Show Tax Breakdown"               checked={form.showTaxBreakdown}             onChange={v => set('showTaxBreakdown', v)} />
              <CheckRow label="Show Discount Field"              checked={form.showDiscountField}            onChange={v => set('showDiscountField', v)} />
            </div>
          </SectionBlock>
          <div className={styles.formActions}>
            <Button type="submit" loading={saving}>Save Invoice &amp; Quote Settings</Button>
          </div>
        </form>
      )}
    </AdminSettingsPage>
  );
}
