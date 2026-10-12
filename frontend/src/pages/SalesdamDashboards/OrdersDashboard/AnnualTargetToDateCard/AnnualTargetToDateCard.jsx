import React from 'react';
import { Calendar, Save } from 'lucide-react';
import styles from './AnnualTargetToDateCard.module.css';

export default function AnnualTargetToDateCard({
  atd,
  formatCurrency,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onSave,
  saving,
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <Calendar size={18} className={styles.cardIcon} />
        <span className={styles.cardTitle}>Annual Target to Date</span>
      </div>
      <div className={styles.atdBody}>
        <div className={styles.atdAmount}>{formatCurrency(atd)}</div>
        <p className={styles.atdLabel}>Revenue in selected period</p>

        <div className={styles.dateFilterRow}>
          <div className={styles.dateFieldRow}>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>From Date</label>
              <input
                type="date"
                className={styles.dateInput}
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
              />
            </div>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>To Date</label>
              <input
                type="date"
                className={styles.dateInput}
                value={toDate}
                onChange={(e) => onToDateChange(e.target.value)}
              />
            </div>
          </div>
          <button
            className={styles.applyBtn}
            onClick={onSave}
            disabled={saving}
          >
            <Save size={13} /> {saving ? 'Saving…' : 'Apply & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
