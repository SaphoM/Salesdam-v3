import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import Layout from '../../../layout/Layout';
import QuarterlySalesTargetsChart from './QuarterlySalesTargetsChart/QuarterlySalesTargetsChart';
import styles from './SalesDashboard.module.css';

const SalesDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/analytics/salesdam-sales')
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <Layout title="Sales Targets">
        <div className={styles.page}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Sales Targets</h1>
          </div>
        </div>
      </Layout>
    );

  return (
    <Layout
      title="Sales Targets"
      description="Quarterly sales targets"
    >
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Sales Targets</h1>
        </div>

        <div className={styles.chartContainer}>
          <QuarterlySalesTargetsChart data={data} />
        </div>
      </div>
    </Layout>
  );
}

export default SalesDashboard;
