import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Layout from '../../../layout/Layout';
import DonutChartSkeleton from '../../../components/DonutChartSkeleton/DonutChartSkeleton';
import ConvertedLeadsCardSkeleton from '../../../components/ConvertedDealsCardSkeleton/ConvertedDealsCardSkeleton';
import LeadsSummaryChart from './LeadsSummaryChart/LeadsSummaryChart';
import ConvertedLeadsCard from './ConvertedLeadsCard/ConvertedLeadsCard';
import styles from './LeadsDashboard.module.css';

const LeadsDashboard = () => {
  const [fromDate, setFromDate] = useState('2026-03-01');
  const [toDate, setToDate] = useState('2027-02-28');
  const [isFiltering, setIsFiltering] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryFn: async () => {
      const response = await api.get('/records/lead', {
        params: {
          fields: [
            'first_name',
            'status',
            'converted_date',
            'createdAt',
          ],
          limit: 5000,
        },
      });
      return response.data?.data || [];
    },
    queryKey: ['leads-dashboard', fromDate, toDate],
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
      <Layout title="Leads Dashboard">
        <div className={styles.page}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Leads Dashboard</h1>
          </div>

          <div className={styles.grid2}>
            <DonutChartSkeleton />
            <ConvertedLeadsCardSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  const filteredLeads = (data || []).filter((lead) => {
    const createdDate = new Date(lead.createdAt);
    const filterFrom = new Date(fromDate);
    const filterTo = new Date(toDate);
    return createdDate >= filterFrom && createdDate <= filterTo;
  });

  const convertedLeads = filteredLeads.filter((l) => l.converted_date);

  return (
    <Layout
      title="Leads Dashboard"
      description="Leads pipeline analysis and conversion metrics"
    >
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Leads Dashboard</h1>
        </div>

        <div className={styles.grid2}>
          <LeadsSummaryChart leads={filteredLeads} />
          <ConvertedLeadsCard
            convertedCount={convertedLeads.length}
            totalCount={filteredLeads.length}
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
};

export default LeadsDashboard;
