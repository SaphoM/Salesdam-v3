import React from 'react';
import { TrendingUp, Calendar, Filter } from 'lucide-react';
import ChartCard from '../../../../components/ChartCard/ChartCard';
import Button from '../../../../components/common/Button/Button';
import styles from './ConvertedDealsCard.module.css';

export default function ConvertedDealsCard({
  convertedCount = 0,
  totalCount = 0,
  fromDate = '',
  toDate = '',
  onFromDateChange = () => {},
  onToDateChange = () => {},
  onApplyFilter = () => {},
  isFiltering = false,
}) {
  const conversionRate =
    totalCount > 0 ? ((convertedCount / totalCount) * 100).toFixed(1) : 0;

  return (
    <ChartCard icon={TrendingUp} title="Converted Deals">
      <div className={styles.cardBody}>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{convertedCount}</div>
          <div className={styles.metricLabel}>Total Converted</div>
        </div>

        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Conversion Rate</span>
            <span className={styles.detailValue}>{conversionRate}%</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Total Deals</span>
            <span className={styles.detailValue}>{totalCount}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Date Range</span>
            <span className={styles.detailValue}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {fromDate} to {toDate}
            </span>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.filterSection}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>From Date</label>
              <input
                type="date"
                className={styles.filterInput}
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                disabled={isFiltering}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>To Date</label>
              <input
                type="date"
                className={styles.filterInput}
                value={toDate}
                onChange={(e) => onToDateChange(e.target.value)}
                disabled={isFiltering}
              />
            </div>
          </div>
          <Button
            icon={<Filter size={14} />}
            onClick={onApplyFilter}
            disabled={isFiltering}
            loading={isFiltering}
            fullWidth
          >
            Apply Filter
          </Button>
        </div>
      </div>
    </ChartCard>
  );
}
