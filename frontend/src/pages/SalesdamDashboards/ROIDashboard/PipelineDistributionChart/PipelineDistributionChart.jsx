import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import styles from '../ROIDashboard.module.css';

export default function PipelineDistributionChart({ data, formatCurrency }) {
  const pipeData = [
    { name: 'Won Pipeline', value: data?.wonRevenue || 0 },
    { name: 'Open Pipeline', value: data?.pipelineValue || 0 },
    { name: 'Lost', value: data?.lostRevenue || 0 },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <TrendingUp size={16} className={styles.cardIcon} />
        <span className={styles.cardTitle}>Pipeline Distribution</span>
      </div>
      <div className={styles.chartBody}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pipeData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              <Cell fill="#10b981" />
              <Cell fill="#6366f1" />
              <Cell fill="#ef4444" />
            </Pie>
            <Tooltip formatter={formatCurrency} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
