import React from 'react';
import { TrendingUp } from 'lucide-react';
import DashboardCard from '../../../../components/dashboard/DashboardCard/DashboardCard';
import { formatRands } from '../../../../utils/currencyUtils';
import styles from './IncomeProjectionCard.module.css';

export default function IncomeProjectionCard({ data }) {
  return (
    <DashboardCard title="Income Projection" icon={TrendingUp}>
      <div className={styles.projBody}>
        <div className={styles.projValue}>
          {formatRands(data.incomeProjection)}
        </div>
        <p className={styles.projDesc}>
          Weighted pipeline value based on deal stages
        </p>
      </div>
    </DashboardCard>
  );
}
