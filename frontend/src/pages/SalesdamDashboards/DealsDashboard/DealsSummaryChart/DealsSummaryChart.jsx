import React from 'react';
import { BarChart2 } from 'lucide-react';
import ChartCard from '../../../../components/ChartCard/ChartCard';
import DonutChart from '../../../../components/DonutChart/DonutChart';

const DEFAULT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#4793AF', '#FFC470', '#DD5746'];

const STAGE_LABELS = {
  work_in_progress: 'Work in Progress',
  submitted: 'Submitted',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

export default function DealsSummaryChart({ deals = [] }) {
  const stageCounts = {};

  deals.forEach((deal) => {
    const stage = deal.stage || 'work_in_progress';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  });

  const chartData = Object.entries(stageCounts).map(([stage, count]) => ({
    name: STAGE_LABELS[stage] || stage,
    value: count,
  }));

  return (
    <ChartCard icon={BarChart2} title="Deals Summary" isEmpty={chartData.length === 0}>
      <DonutChart data={chartData} colors={DEFAULT_COLORS} />
    </ChartCard>
  );
}
