import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Target } from 'lucide-react';
import api from '../../../services/api';
import Layout from '../../../layout/Layout';
import GaugeChart from '../../../components/charts/GaugeChart';
import ChartCardSkeleton from '../../../components/ChartCardSkeleton/ChartCardSkeleton';
import styles from './RevenueDashboard.module.css';

const Q_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const RevenueDashboard = () => {
  const [data, setData] = useState(null);

  const { isLoading } = useQuery({
    queryFn: async () => {
      const [ordersRes, settingsRes] = await Promise.all([
        api.get('/analytics/salesdam-orders'),
        api.get('/admin/settings'),
      ]);
      setData({
        orders: ordersRes.data?.data,
        settings: settingsRes.data?.data,
      });
      return ordersRes.data?.data;
    },
    queryKey: ['revenue-targets'],
    staleTime: 1000 * 60 * 5,
  });

  const getCurrentYear = () => new Date().getFullYear();

  const getDateRange = (quarterIndex) => {
    const startMonthIndex = (quarterIndex * 3) % 12;
    const endMonthIndex = (startMonthIndex + 2) % 12;
    const startMonth = MONTH_NAMES[startMonthIndex];
    const endMonth = MONTH_NAMES[endMonthIndex];

    let endYear = getCurrentYear();
    if (endMonthIndex < startMonthIndex) {
      endYear = getCurrentYear() + 1;
    }

    return `${startMonth} ÔÇô ${endMonth} ${endYear}`;
  };

  if (isLoading) {
    return (
      <Layout title="Revenue Targets Dashboard">
        <div className={styles.page}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Revenue Targets</h1>
          </div>

          <div className={styles.gridQuarterly}>
            <ChartCardSkeleton />
            <ChartCardSkeleton />
            <ChartCardSkeleton />
            <ChartCardSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  const quarterActuals = data?.orders?.quarterActuals || [0, 0, 0, 0];
  const revenueTargetsConfig = data?.settings?.revenueTargets || { q1: 0, q2: 0, q3: 0, q4: 0 };

  return (
    <Layout
      title="Revenue Targets Dashboard"
      description="Quarterly revenue targets and actuals"
    >
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Revenue Targets</h1>
        </div>

        <div className={styles.gridQuarterly}>
          {Q_LABELS.map((q, i) => {
            const qKey = `q${i + 1}`;
            const target = revenueTargetsConfig[qKey] || 0;
            const actual = quarterActuals[i] || 0;
            const percent = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
            const dateRange = getDateRange(i);

            return (
              <div key={q} className={styles.card}>
                <div className={styles.cardHeader}>
                  <Target size={18} className={styles.cardIcon} />
                  <span className={styles.cardTitle}>{q} (Calendar)</span>
                </div>
                <div className={styles.gaugeWrap}>
                  <GaugeChart
                    title=""
                    range={dateRange}
                    percent={percent}
                    value={actual}
                    target={target}
                    color="var(--color-primary)"
                    width={220}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default RevenueDashboard;
