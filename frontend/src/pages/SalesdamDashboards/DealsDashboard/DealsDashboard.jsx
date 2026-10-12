import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Layout from '../../../layout/Layout';
import DonutChartSkeleton from '../../../components/DonutChartSkeleton/DonutChartSkeleton';
import ConvertedDealsCardSkeleton from '../../../components/ConvertedDealsCardSkeleton/ConvertedDealsCardSkeleton';
import DealsSummaryChart from './DealsSummaryChart/DealsSummaryChart';
import ConvertedDealsCard from './ConvertedDealsCard/ConvertedDealsCard';
import styles from './DealsDashboard.module.css';

const DealsDashboard = () => {
  const [fromDate, setFromDate] = useState('2026-03-01');
  const [toDate, setToDate] = useState('2027-02-28');
  const [isFiltering, setIsFiltering] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryFn: async () => {
      const dealsResponse = await api.get('/records/deal', {
        params: {
          fields: [
            'name',
            'stage',
            'order_value',
            'sales_rep',
            'is_converted',
            'converted_date',
            'createdAt',
          ],
          limit: 5000,
        },
      });

      const deals = dealsResponse.data?.data || [];

      // Try to fetch user names to map sales_rep IDs
      let userMap = {};
      try {
        const userResponse = await api.get('/records/user', {
          params: {
            fields: ['firstName', 'lastName'],
            limit: 1000,
          },
        });

        const users = userResponse.data?.data || [];
        users.forEach((user) => {
          userMap[user.id] = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        });
      } catch (error) {
        // If user fetch fails, continue without user names
        console.warn('Could not fetch user names:', error.message);
      }

      // Enrich deals with sales rep names
      return deals.map((deal) => ({
        ...deal,
        sales_rep_name: userMap[deal.sales_rep] || deal.sales_rep || 'Unassigned',
      }));
    },
    queryKey: ['deals-dashboard', fromDate, toDate],
    staleTime: 1000 * 60 * 5,
  });

  const handleApplyFilter = async () => {
    setIsFiltering(true);
    try {
      await refetch();
      toast.success('Filters applied');
    } catch {
      toast.error('Failed to apply filters');
    } finally {
      setIsFiltering(false);
    }
  };

  if (isLoading) {
    return (
      <Layout title="Deals Dashboard">
        <div className={styles.page}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Deals Dashboard</h1>
          </div>

          <div className={styles.grid2}>
            <DonutChartSkeleton />
            <ConvertedDealsCardSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  const filteredDeals = (data || []).filter((deal) => {
    const createdDate = new Date(deal.createdAt);
    const filterFrom = new Date(fromDate);
    const filterTo = new Date(toDate);
    return createdDate >= filterFrom && createdDate <= filterTo;
  });

  const convertedDeals = filteredDeals.filter((d) => d.is_converted);

  return (
    <Layout
      title="Deals Dashboard"
      description="Deals pipeline analysis and performance metrics"
    >
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Deals Dashboard</h1>
        </div>

        <div className={styles.grid2}>
          <DealsSummaryChart deals={filteredDeals} />
          <ConvertedDealsCard
            convertedCount={convertedDeals.length}
            totalCount={filteredDeals.length}
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onApplyFilter={handleApplyFilter}
            isFiltering={isFiltering}
          />
        </div>
      </div>
    </Layout>
  );
}

export default DealsDashboard;
