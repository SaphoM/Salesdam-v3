import React, { useState, useEffect } from 'react';
import { Target, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Button from '../../../components/common/Button/Button';
import AdminSettingsPage from '../AdminSettingsPage';
import styles from '../AdminSettingsPage.module.css';

const Field = ({ label, children }) => (
  <div className={styles.field}>
    <label className={styles.label}>{label}</label>
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

export default function SalesTargets() {
  const [loading, setLoading]           = useState(true);
  const [saving,  setSaving]            = useState(false);
  const [revenueTargets, setRevenue]    = useState({ q1: '', q2: '', q3: '', q4: '' });
  const [salesTargets,   setSales]      = useState({ q1: '', q2: '', q3: '', q4: '' });

  useEffect(() => {
    api.get('/admin/settings').then(res => {
      const d = res.data.data;
      if (d.revenueTargets) setRevenue({ q1: d.revenueTargets.q1 ?? '', q2: d.revenueTargets.q2 ?? '', q3: d.revenueTargets.q3 ?? '', q4: d.revenueTargets.q4 ?? '' });
      if (d.salesTargets)   setSales({   q1: d.salesTargets.q1   ?? '', q2: d.salesTargets.q2   ?? '', q3: d.salesTargets.q3   ?? '', q4: d.salesTargets.q4   ?? '' });
    }).catch(() => toast.error('Failed to load settings.')).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        revenueTargets: { q1: Number(revenueTargets.q1) || 0, q2: Number(revenueTargets.q2) || 0, q3: Number(revenueTargets.q3) || 0, q4: Number(revenueTargets.q4) || 0 },
        salesTargets:   { q1: Number(salesTargets.q1)   || 0, q2: Number(salesTargets.q2)   || 0, q3: Number(salesTargets.q3)   || 0, q4: Number(salesTargets.q4)   || 0 },
      });
      toast.success('Targets saved.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const SkeletonField = () => (
    <div className={styles.skeletonField}>
      <div className={styles.skeletonLabel} style={{ width: '100px' }} />
      <div className={styles.skeletonInput} />
    </div>
  );

  return (
    <AdminSettingsPage
      title="Revenue & Sales Targets"
      description="Set quarterly revenue and sales targets for your team"
      icon={Target}
    >
      {loading ? (
        <div className={styles.skeletonContainer}>
          <div className={styles.skeletonSectionBlock}>
            <div className={styles.skeletonSectionBlockHeader} />
            <div className={styles.skeletonSectionBlockBody}>
              <div className={styles.skeletonGrid4}>
                <SkeletonField />
                <SkeletonField />
                <SkeletonField />
                <SkeletonField />
              </div>
            </div>
          </div>
          <div className={styles.skeletonSectionBlock}>
            <div className={styles.skeletonSectionBlockHeader} />
            <div className={styles.skeletonSectionBlockBody}>
              <div className={styles.skeletonGrid4}>
                <SkeletonField />
                <SkeletonField />
                <SkeletonField />
                <SkeletonField />
              </div>
            </div>
          </div>
          <div style={{ height: '44px' }} />
        </div>
      ) : (
        <form className={styles.panel} onSubmit={handleSubmit}>
          <SectionBlock title="Revenue Targets" icon={Receipt}>
            <div className={styles.grid4}>
              {['q1', 'q2', 'q3', 'q4'].map((q, i) => (
                <Field key={q} label={`Q${i + 1} Target (R)`}>
                  <input
                    className={styles.input}
                    type="number" min="0"
                    value={revenueTargets[q]}
                    onChange={e => setRevenue(p => ({ ...p, [q]: e.target.value }))}
                    placeholder="0"
                  />
                </Field>
              ))}
            </div>
          </SectionBlock>
          <SectionBlock title="Sales Targets" icon={Target}>
            <div className={styles.grid4}>
              {['q1', 'q2', 'q3', 'q4'].map((q, i) => (
                <Field key={q} label={`Q${i + 1} Target`}>
                  <input
                    className={styles.input}
                    type="number" min="0"
                    value={salesTargets[q]}
                    onChange={e => setSales(p => ({ ...p, [q]: e.target.value }))}
                    placeholder="0"
                  />
                </Field>
              ))}
            </div>
          </SectionBlock>
          <div className={styles.formActions}>
            <Button type="submit" loading={saving}>Save Targets</Button>
          </div>
        </form>
      )}
    </AdminSettingsPage>
  );
}
