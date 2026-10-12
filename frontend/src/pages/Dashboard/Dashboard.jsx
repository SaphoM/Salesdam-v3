import styles from './Dashboard.module.css';
import React, { useState } from 'react';
import { SlidersHorizontal, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../hooks/useAuth';
import { getDashboardById } from '../../services/api/dashboards';
import { updateUserProfile } from '../../services/api/users';
import { getTimeOfDay } from '../../utils/dateUtils';

import Layout from '../../layout/Layout';
import WidgetCard from '../../components/dashboard/WidgetCard';
import HomeDashboard from '../SalesdamDashboards/HomeDashboard/HomeDashboard';
import HomeDashboardPicker from './HomeDashboardPicker/HomeDashboardPicker';
import DashboardSkeleton from '../../components/dashboard/DashboardSkeleton/DashboardSkeleton';

const Dashboard = () => {
  const { user, updateUser, tenant } = useAuth();
  const queryClient = useQueryClient();

  const showSalesdamHome =
    tenant?.features?.enableSalesdamFeatures &&
    tenant?.features?.salesdamHomeDashboard;

  const [pickerOpen, setPickerOpen] = useState(false);

  const homeDashboardId = user?.preferences?.homeDashboardId;

  const { data: homeDash = null, isLoading: isHomeDashLoading } = useQuery({
    queryKey: ['dashboard', homeDashboardId],
    queryFn: () => getDashboardById(homeDashboardId),
    enabled: Boolean(homeDashboardId),
  });

  // Guards against react-query v4's "isLoading stays true forever while
  // disabled" behavior when there's no homeDashboardId to fetch.
  const dashLoading = Boolean(homeDashboardId) && isHomeDashLoading;

  const savePreference = async (dashId) => {
    try {
      await updateUserProfile({
        preferences: {
          ...user?.preferences,
          homeDashboardId: dashId || null,
        },
      });

      updateUser({
        preferences: {
          ...user?.preferences,
          homeDashboardId: dashId || null,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      toast.success(
        dashId ? 'Dashboard pinned to home' : 'Charts section removed',
      );
    } catch {
      toast.error('Failed to save preference');
    } finally {
      setPickerOpen(false);
    }
  };

  const handlePickerSave = (dashId) => {
    savePreference(dashId || null);
  };

  if (dashLoading) {
    return (
      <Layout
        title="Dashboard"
        description="Overview of your CRM performance, recent activity, and key metrics"
      >
        <DashboardSkeleton />
      </Layout>
    );
  }

  return (
    <Layout
      title="Dashboard"
      description="Overview of your CRM performance, recent activity, and key metrics"
    >
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              Good {getTimeOfDay()}, {user?.firstName}
            </h1>

            <p className={styles.subtitle}>
              Here's what's happening in your workspace today.
            </p>
          </div>
        </div>

        {showSalesdamHome ? (
          <div className={styles.section}>
            <HomeDashboard />
          </div>
        ) : (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                {homeDash ? homeDash.name : 'Charts'}
              </h3>

              <button
                className={styles.configureBtn}
                onClick={() => setPickerOpen(true)}
              >
                <SlidersHorizontal size={14} /> Configure
              </button>
            </div>

            {dashLoading ? (
              <DashboardSkeleton />
            ) : homeDash ? (
              <div className={styles.widgetGrid}>
                {[...(homeDash.widgets || [])]
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((w) => (
                    <WidgetCard key={w.widgetId} widget={w} editing={false} />
                  ))}

                {homeDash.widgets?.length === 0 && (
                  <p
                    style={{
                      color: 'var(--color-gray-400)',
                      fontSize: 'var(--font-size-sm)',
                      margin: 0,
                    }}
                  >
                    This dashboard has no widgets yet.
                  </p>
                )}
              </div>
            ) : (
              <div className={styles.chartsPlaceholder}>
                <LayoutDashboard
                  size={32}
                  strokeWidth={1}
                  style={{ color: 'var(--color-gray-300)' }}
                />

                <p>Pin a dashboard here to see its charts on your home page.</p>

                <button
                  className={styles.pickerTrigger}
                  onClick={() => setPickerOpen(true)}
                >
                  Choose a dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {pickerOpen && (
        <HomeDashboardPicker
          currentId={homeDashboardId}
          onSave={handlePickerSave}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Layout>
  );
};

export default Dashboard;
