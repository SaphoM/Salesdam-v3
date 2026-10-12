import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardSkeleton from '../../../components/dashboard/DashboardSkeleton/DashboardSkeleton';
import { getSalesdamHomeAnalytics } from '../../../services/api/analytics';
import AnnualRevenueTargetCard from './AnnualRevenueTargetCard/AnnualRevenueTargetCard';
import DealsAboutToCloseCard from './DealsAboutToCloseCard/DealsAboutToCloseCard';
import IncomeProjectionCard from './IncomeProjectionCard/IncomeProjectionCard';
import OrdersToDeliverCard from './OrdersToDeliverCard/OrdersToDeliverCard';
import styles from './HomeDashboard.module.css';

const HomeDashboard = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['salesdam-home-analytics'],
    queryFn: getSalesdamHomeAnalytics,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>Failed to load dashboard data.</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.grid2}>
        <AnnualRevenueTargetCard data={data} />
        <DealsAboutToCloseCard data={data} />
        <IncomeProjectionCard data={data} />
        <OrdersToDeliverCard data={data} />
      </div>
    </div>
  );
};

export default HomeDashboard;
