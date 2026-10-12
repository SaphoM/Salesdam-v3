import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import useCurrency from '../../../hooks/useCurrency';
import Layout from '../../../layout/Layout';
import QuarterlyOrdersTargetsChart from './QuarterlyOrdersTargetsChart/QuarterlyOrdersTargetsChart';
import AnnualTargetToDateCard from './AnnualTargetToDateCard/AnnualTargetToDateCard';
import TotalRevenuePerMonthChart from './TotalRevenuePerMonthChart/TotalRevenuePerMonthChart';
import styles from './OrdersDashboard.module.css';

const toDateStr = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const GaugeSkeleton = () => (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <div className={styles.skeletonIcon} />
      <div className={styles.skeletonTitle} />
    </div>
    <div className={styles.gaugeWrap}>
      <div className={styles.skeletonGauge} />
    </div>
  </div>
);

const FormSkeleton = () => (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <div className={styles.skeletonIcon} />
      <div className={styles.skeletonTitle} />
    </div>
    <div className={styles.atdBody}>
      <div className={styles.skeletonAmount} />
      <div className={styles.skeletonLabel} />
      <div className={styles.skeletonDateRow} />
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <div className={styles.skeletonIcon} />
      <div className={styles.skeletonTitle} />
    </div>
    <div className={styles.chartBody}>
      <div className={styles.skeletonBars}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={styles.skeletonBar}
            style={{ height: `${30 + ((i * 7) % 51)}%` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const OrdersDashboard = () => {
  const { symbol } = useCurrency();
  const queryClient = useQueryClient();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [saving, setSaving] = useState(false);

  const formatCurrency = (n) => {
    if (n == null) return 'ÔÇö';
    if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${symbol}${(n / 1_000).toFixed(0)}K`;
    return `${symbol}${Number(n).toLocaleString('en-ZA')}`;
  };

  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const response = await api.get('/analytics/salesdam-orders');
      const dashboardData = response.data?.data;
      if (dashboardData) {
        setFromDate(toDateStr(dashboardData.annualToDateFrom));
        setToDate(toDateStr(dashboardData.annualToDateTo));
      }
      return dashboardData;
    },
    queryKey: ['orders-dashboard'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.put('/analytics/salesdam-dashboard-config', {
        annualTargetFromDate: fromDate,
        annualTargetToDate: toDate,
      });
      toast.success('Date range saved.');
      await queryClient.refetchQueries({ queryKey: ['orders-dashboard'] });
    } catch {
      toast.error('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading)
    return (
      <Layout title="Orders Dashboard">
        <div className={styles.page}>
          <div className={styles.grid2}>
            <GaugeSkeleton />
            <FormSkeleton />
          </div>
          <ChartSkeleton />
        </div>
      </Layout>
    );

  const monthlyComparisonData = data?.monthlyComparisonData || [];
  const atd = data?.annualToDate || 0;

  return (
    <Layout
      title="Orders Dashboard"
      description="Quarterly orders performance and annual revenue tracking"
    >
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Orders Dashboard</h1>
        </div>

        <div className={styles.grid2}>
          <QuarterlyOrdersTargetsChart data={data} />
          <AnnualTargetToDateCard
            atd={atd}
            formatCurrency={formatCurrency}
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onSave={saveConfig}
            saving={saving}
          />
        </div>

        <TotalRevenuePerMonthChart
          data={monthlyComparisonData}
          formatCurrency={formatCurrency}
          fiscalYearStartMonth={data?.financialYearStartMonth || 1}
        />
      </div>
    </Layout>
  );
}

export default OrdersDashboard;
