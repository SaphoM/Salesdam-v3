import React, { useState, useEffect } from 'react';
import {
  Settings, Search, PieChart, Package, Users,
  TrendingUp, DollarSign, Target, BarChart2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import AdminSettingsPage from '../AdminSettingsPage';
import styles from '../AdminSettingsPage.module.css';
import { useAuth } from '../../../hooks/useAuth';

const SALESDAM_SUB = [
  { key: 'salesdamFindTenders',      label: 'Find Tenders',      desc: 'Adds a Find Tenders sidebar item to browse available tenders.',               icon: Search },
  { key: 'salesdamHomeDashboard',    label: 'Home Dashboard',    desc: 'Shows the Salesdam home dashboard on the main page.',                         icon: PieChart },
  { key: 'salesdamOrdersDashboard',  label: 'Orders Dashboard',  desc: 'Quarterly orders targets, annual target to date, and monthly revenue chart.',  icon: Package },
  { key: 'salesdamAccountDashboard', label: 'Account Dashboard', desc: 'Account distribution by type and industry.',                                   icon: Users },
  { key: 'salesdamDealsDashboard',   label: 'Deals Dashboard',   desc: 'Pipeline stages, deal values, and monthly new deal trends.',                   icon: TrendingUp },
  { key: 'salesdamLeadsDashboard',   label: 'Leads Dashboard',   desc: 'Lead distribution by status, source and rating.',                              icon: Users },
  { key: 'salesdamRevenueDashboard', label: 'Revenue Targets',   desc: 'Annual revenue target gauge and monthly revenue chart.',                       icon: DollarSign },
  { key: 'salesdamSalesDashboard',   label: 'Sales Targets',     desc: 'Quarterly sales target gauges and top reps leaderboard.',                      icon: Target },
  { key: 'salesdamROIDashboard',     label: 'ROI Dashboard',     desc: 'Win rates, lead conversion, and pipeline distribution.',                       icon: BarChart2 },
];

const DEFAULT_FEATURES = {
  enableSalesdamFeatures:    false,
  salesdamFindTenders:       false,
  salesdamHomeDashboard:     false,
  salesdamOrdersDashboard:   false,
  salesdamAccountDashboard:  false,
  salesdamDealsDashboard:    false,
  salesdamLeadsDashboard:    false,
  salesdamRevenueDashboard:  false,
  salesdamSalesDashboard:    false,
  salesdamROIDashboard:      false,
};

const ToggleRow = ({ label, desc, checked, onChange, disabled }) => (
  <div className={`${styles.featureToggleCard} ${disabled ? styles.toggleDisabled : ''}`}>
    <div className={styles.featureToggleInfo}>
      <strong className={styles.featureToggleLabel}>{label}</strong>
      {desc && <p className={styles.featureToggleDesc}>{desc}</p>}
    </div>
    <label className={styles.toggle}>
      <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} />
      <span className={styles.toggleSlider} />
    </label>
  </div>
);

export default function OtherSettings() {
  const { fetchMe } = useAuth();
  const [loading,  setLoading]  = useState(true);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);

  useEffect(() => {
    api.get('/admin/settings').then(res => {
      const f = res.data.data?.features;
      if (f) setFeatures(prev => ({ ...prev, ...f }));
    }).catch(() => toast.error('Failed to load settings.')).finally(() => setLoading(false));
  }, []);

  const toggleFeature = async (key, val) => {
    setFeatures(prev => ({ ...prev, [key]: val }));
    try {
      await api.put('/admin/settings', { features: { [key]: val } });
      await fetchMe();
      const label = key === 'enableSalesdamFeatures' ? 'Salesdam Features' : key.replace('salesdam', '').replace(/([A-Z])/g, ' $1').trim();
      toast.success(val ? `${label} enabled.` : `${label} disabled.`);
    } catch (err) {
      setFeatures(prev => ({ ...prev, [key]: !val }));
      toast.error(err?.response?.data?.message || 'Failed to update feature.');
    }
  };

  const SkeletonToggle = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f9fafb' }}>
      <div style={{ flex: 1 }}>
        <div style={{ height: '16px', width: '200px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px' }} />
        <div style={{ height: '12px', width: '300px', background: '#e2e8f0', borderRadius: '4px' }} />
      </div>
      <div style={{ width: '44px', height: '24px', background: '#e2e8f0', borderRadius: '24px' }} />
    </div>
  );

  return (
    <AdminSettingsPage
      title="Other Settings"
      description="Miscellaneous platform and feature flag settings"
      icon={Settings}
      iconColor="#8b5cf6"
    >
      {loading ? (
        <div className={styles.panel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SkeletonToggle />
          <SkeletonToggle />
          <SkeletonToggle />
          <SkeletonToggle />
        </div>
      ) : (
        <div className={styles.panel}>
          <ToggleRow
            label="Enable Salesdam Features"
            desc="Master switch. Unlocks Invoice & Quote Settings, Find Tenders, and all Salesdam dashboards below."
            checked={features.enableSalesdamFeatures}
            onChange={v => toggleFeature('enableSalesdamFeatures', v)}
          />
          {features.enableSalesdamFeatures && (
            <div className={styles.subToggles}>
              <div className={styles.subTogglesLabel}>Salesdam Sub-Features</div>
              {SALESDAM_SUB.map(({ key, label, desc }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  desc={desc}
                  checked={features[key] || false}
                  onChange={v => toggleFeature(key, v)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </AdminSettingsPage>
  );
}
