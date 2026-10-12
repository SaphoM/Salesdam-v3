import React from 'react';
import { Target } from 'lucide-react';
import GaugeChart from '../../../../components/charts/GaugeChart';
import styles from './QuarterlySalesTargetsChart.module.css';

const Q_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function QuarterlySalesTargetsChart({ data }) {
  const getCurrentYear = () => new Date().getFullYear();

  return (
    <div className={styles.gridQuarterly}>
      {Q_LABELS.map((q, i) => {
        const tgt = data?.quarterTargets?.[i] || 0;
        const act = data?.quarterActuals?.[i]?.value || 0;
        const pct = tgt > 0 ? Math.min(100, Math.round((act / tgt) * 100)) : 0;

        // Calculate date range for this quarter
        const startMonthIndex = (i * 3) % 12;
        const endMonthIndex = (startMonthIndex + 2) % 12;
        const startMonth = MONTH_NAMES[startMonthIndex];
        const endMonth = MONTH_NAMES[endMonthIndex];

        let endYear = getCurrentYear();
        if (endMonthIndex < startMonthIndex) {
          endYear = getCurrentYear() + 1;
        }

        const dateRange = `${startMonth} – ${endMonth} ${endYear}`;

        return (
          <div key={q} className={styles.card}>
            <div className={styles.cardHeader}>
              <Target size={18} className={styles.cardIcon} />
              <span className={styles.cardTitle}>{q} (Calendar)</span>
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
      })}
    </div>
  );
}
