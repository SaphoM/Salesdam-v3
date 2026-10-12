import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import DashboardCard from '../../../../components/dashboard/DashboardCard/DashboardCard';
import { fmtDate } from '../../../../utils/dateUtils';
import styles from './DealsAboutToCloseCard.module.css';

const CountdownBadge = ({ days }) => {
  if (days == null) return null;
  const cls =
    days <= 3
      ? styles.urgentBadge
      : days <= 7
        ? styles.soonBadge
        : styles.okBadge;
  return (
    <span className={cls}>
      {days === 0 ? 'Today' : days < 0 ? 'Overdue' : `${days}d`}
    </span>
  );
};

export default function DealsAboutToCloseCard({ data }) {
  const MAX_DEALS = 8;
  const displayedDeals = data.openDeals.slice(0, MAX_DEALS);
  const hasMore = data.openDeals.length > MAX_DEALS;

  return (
    <DashboardCard
      title="Deals About to Close"
      icon={Clock}
      subtitle="Work in Progress • Next 10 days"
    >
      <div className={styles.tableWrap}>
        {data.openDeals.length === 0 ? (
          <p className={styles.empty}>
            No deals closing in the next 10 days.
          </p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Closing Date</th>
                  <th>Countdown</th>
                </tr>
              </thead>
              <tbody>
                {displayedDeals.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link
                        to={`/o/deal/${d.id}`}
                        className={styles.link}
                      >
                        {d.name || '(no name)'}
                      </Link>
                    </td>
                    <td>{d.client || '—'}</td>
                    <td>{fmtDate(d.closingDate)}</td>
                    <td>
                      <CountdownBadge days={d.countdown} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <p className={styles.moreIndicator}>
                +{data.openDeals.length - MAX_DEALS} more deals
              </p>
            )}
          </>
        )}
      </div>
    </DashboardCard>
  );
}
