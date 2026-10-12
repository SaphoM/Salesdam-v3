import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import useCurrency from '../../../hooks/useCurrency';
import Layout from '../../../layout/Layout';
import IncomeProjectionChart from './IncomeProjectionChart/IncomeProjectionChart';
import ProfitMarginTrendChart from './ProfitMarginTrendChart/ProfitMarginTrendChart';
import RevenuePerMonthChart from './RevenuePerMonthChart/RevenuePerMonthChart';
import styles from './AccountingDashboard.module.css';

const ChartSkeleton = () => (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <div className={styles.skeletonIcon} />
      <div className={styles.skeletonTitle} />
    </div>
    <div className={styles.chartBody}>
      <div className={styles.skeletonBars} />
    </div>
  </div>
);

const AccountingDashboard = () => {
  const { symbol } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState('');

  const formatCurrency = (n) => {
    if (n == null) return 'ÔÇö';
    if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${symbol}${(n / 1_000).toFixed(0)}K`;
    return `${symbol}${Number(n).toLocaleString('en-ZA')}`;
  };

  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const response = await api.get('/analytics/salesdam-clients');
      const dashboardData = response.data?.data;
      const incomeData = dashboardData?.incomeProjectionData || [];
      if (incomeData.length > 0 && !selectedMonth) {
        setSelectedMonth(incomeData[0].month);
      }
      return dashboardData;
    },
    queryKey: ['accounting-dashboard'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading)
    return (
      <Layout title="Accounting Dashboard">
        <div className={styles.page}>
          <div className={styles.grid2}>
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <ChartSkeleton />
        </div>
      </Layout>
    );

  return (
    <Layout
      title="Accounting Dashboard"
      description="Income projection, profit margin analysis, and year-over-year revenue comparison"
    >
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Accounting Dashboard</h1>
        </div>

        <div className={styles.grid2}>
          <IncomeProjectionChart
            data={data?.incomeProjectionData || []}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            formatCurrency={formatCurrency}
            fiscalYearStartMonth={data?.financialYearStartMonth || 1}
          />
          <ProfitMarginTrendChart />
        </div>

        <RevenuePerMonthChart
          data={data?.revenueComparisonData || []}
          formatCurrency={formatCurrency}
          fiscalYearStartMonth={data?.financialYearStartMonth || 1}
        />
      </div>
    </Layout>
  );
}

export default AccountingDashboard;
