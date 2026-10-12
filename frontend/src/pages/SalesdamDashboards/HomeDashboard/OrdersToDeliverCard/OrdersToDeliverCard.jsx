import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import DashboardCard from '../../../../components/dashboard/DashboardCard/DashboardCard';
import { fmtDate } from '../../../../utils/dateUtils';
import styles from './OrdersToDeliverCard.module.css';

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

export default function OrdersToDeliverCard({ data }) {
  const MAX_ORDERS = 8;
  const displayedOrders = data.ordersToDeliver.slice(0, MAX_ORDERS);
  const hasMore = data.ordersToDeliver.length > MAX_ORDERS;

  return (
    <DashboardCard
      title="Orders To Be Delivered In The Next 10 Days"
      icon={Package}
      subtitle="Next 10 days"
    >
      <div className={styles.tableWrap}>
        {data.ordersToDeliver.length === 0 ? (
          <p className={styles.empty}>No orders due in the next 10 days.</p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Delivery Date</th>
                  <th>Countdown</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link
                        to={`/o/order/${o.id}`}
                        className={styles.link}
                      >
                        {o.name || '(no name)'}
                      </Link>
                    </td>
                    <td>{o.client || '—'}</td>
                    <td>{fmtDate(o.deliveryDate)}</td>
                    <td>
                      <CountdownBadge days={o.countdown} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <p className={styles.moreIndicator}>
                +{data.ordersToDeliver.length - MAX_ORDERS} more orders
              </p>
            )}
          </>
        )}
      </div>
    </DashboardCard>
  );
}
