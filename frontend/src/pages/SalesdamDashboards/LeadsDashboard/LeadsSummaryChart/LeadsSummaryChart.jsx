import React from 'react';
import { UserPlus } from 'lucide-react';
import ChartCard from '../../../../components/ChartCard/ChartCard';
import DonutChart from '../../../../components/DonutChart/DonutChart';

const DEFAULT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#4793AF', '#FFC470', '#DD5746'];

const STATUS_LABELS = {
  open: 'Open',
  contacted: 'Contacted',
  unqualified: 'Unqualified',
  qualified: 'Qualified',
};

export default function LeadsSummaryChart({ leads = [] }) {
  const statusCounts = {};

  leads.forEach((lead) => {
    const status = lead.status || 'open';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
  }));

  return (
    <ChartCard icon={UserPlus} title="Leads Summary" isEmpty={chartData.length === 0}>
      <DonutChart data={chartData} colors={DEFAULT_COLORS} />
    </ChartCard>
  );
}
