import React from 'react';
import { Target } from 'lucide-react';
import GaugeChart from '../../../../components/charts/GaugeChart';
import DashboardCard from '../../../../components/dashboard/DashboardCard/DashboardCard';
import { fmtDate } from '../../../../utils/dateUtils';
import styles from './AnnualRevenueTargetCard.module.css';

export default function AnnualRevenueTargetCard({ data }) {
  const fyFrom = fmtDate(data.fyStart);
  const fyTo = fmtDate(data.fyEnd);
  const range = `${fyFrom} – ${fyTo}`;

  return (
    <DashboardCard title="Annual Revenue Target" icon={Target}>
      <div className={styles.cardBody}>
        <GaugeChart
          title=""
          range={range}
          percent={data.revenuePercent}
          value={data.revenueActual}
          target={data.annualTarget}
          color="var(--color-primary)"
          width={220}
        />
      </div>
    </DashboardCard>
  );
}
