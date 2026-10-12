import React from 'react';
import { BarChart2 } from 'lucide-react';
import GaugeChart from '../../../../components/charts/GaugeChart';
import { fmtDate } from '../../../../utils/dateUtils';
import styles from './QuarterlyOrdersTargetsChart.module.css';

export default function QuarterlyOrdersTargetsChart({ data }) {
  const currentQuarter = data?.currentQuarter || 0;
  const tgt = data?.quarterTargets?.[currentQuarter] || 0;
  const act = data?.quarterActuals?.[currentQuarter] || 0;
  const pct = tgt > 0 ? Math.round((act / tgt) * 100) : 0;
  const qStart = data?.currentQuarterStart ? fmtDate(data.currentQuarterStart) : '';
  const qEnd = data?.currentQuarterEnd ? fmtDate(data.currentQuarterEnd) : '';
  const dateRange = qStart && qEnd ? `${qStart} – ${qEnd}` : '';

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <BarChart2 size={18} className={styles.cardIcon} />
        <span className={styles.cardTitle}>Quarterly Orders Targets</span>
      </div>
      <div className={styles.gaugeWrap}>
        <GaugeChart
          title=""
          range={dateRange}
          percent={pct}
          value={act}
          target={tgt}
          color="var(--color-primary)"
          width={220}
        />
      </div>
    </div>
  );
}
