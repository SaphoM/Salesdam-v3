import React, { useState, useEffect } from 'react';
import { ArrowLeft, HardDrive, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import Layout from '../../../layout/Layout';
import styles from './StorageUsage.module.css';

const StorageUsage = () => {
  const navigate = useNavigate();
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStorageUsage();
  }, []);

  const fetchStorageUsage = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/storage-usage');
      setStorageData(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load storage usage');
      console.error('Failed to load storage usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = () => {
    if (!storageData || !storageData.plan_limit) return 0;
    return Math.min((storageData.used / storageData.plan_limit) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return '#dc2626'; // Red
    if (percentage >= 70) return '#f97316'; // Orange
    return '#10b981'; // Green
  };

  if (loading) {
    return (
      <Layout title="Storage Usage" description="View workspace storage consumption">
        <div className={styles.page}>
          <div className={styles.header}>
            <button className={styles.backButton} onClick={() => navigate('/admin/settings')}>
              <ArrowLeft size={16} />
              Back to Settings
            </button>
          </div>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading storage data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Storage Usage" description="View workspace storage consumption">
        <div className={styles.page}>
          <div className={styles.header}>
            <button className={styles.backButton} onClick={() => navigate('/admin/settings')}>
              <ArrowLeft size={16} />
              Back to Settings
            </button>
          </div>
          <div className={styles.error}>
            <AlertCircle size={40} />
            <h2>Error Loading Storage Data</h2>
            <p>{error}</p>
            <button className={styles.retryButton} onClick={fetchStorageUsage}>
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const percentage = getUsagePercentage();
  const progressColor = getProgressColor();

  return (
    <Layout title="Storage Usage" description="View workspace storage consumption">
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate('/admin/settings')}>
            <ArrowLeft size={16} />
            Back to Settings
          </button>
          <div>
            <h1 className={styles.title}>
              <HardDrive size={28} />
              Storage Usage
            </h1>
            <p className={styles.description}>
              Monitor your workspace storage consumption by object type
            </p>
          </div>
        </div>

        <div className={styles.container}>
          {/* Summary Card */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <label>Used Storage</label>
                <div className={styles.summaryValue}>
                  {formatBytes(storageData.used)}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <label>Plan Limit</label>
                <div className={styles.summaryValue}>
                  {formatBytes(storageData.plan_limit)}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <label>Remaining</label>
                <div className={styles.summaryValue}>
                  {formatBytes(storageData.plan_limit - storageData.used)}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <label>Usage</label>
                <div className={styles.summaryValue}>
                  {percentage.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: progressColor,
                  }}
                />
              </div>
              {percentage >= 90 && (
                <div className={styles.warning}>
                  ⚠️ Storage usage is high. Consider archiving or deleting unused records.
                </div>
              )}
            </div>
          </div>

          {/* Storage Breakdown by Object */}
          <div className={styles.breakdownCard}>
            <h2 className={styles.breakdownTitle}>Storage by Object</h2>
            <div className={styles.breakdownTable}>
              <div className={styles.tableHeader}>
                <div>Object</div>
                <div>Active Records</div>
                <div>Deleted Records</div>
                <div>Storage Used</div>
              </div>
              <div className={styles.tableBody}>
                {storageData.objects && storageData.objects.length > 0 ? (
                  storageData.objects.map((obj, idx) => {
                    return (
                      <div key={idx} className={styles.tableRow}>
                        <div className={styles.objectName} title={obj.object_name}>
                          {obj.object_name}
                        </div>
                        <div className={styles.recordCount}>
                          {obj.active_record_count.toLocaleString()}
                        </div>
                        <div className={styles.deletedCount}>
                          {obj.deleted_record_count > 0 ? (
                            <span className={styles.deletedBadge}>
                              {obj.deleted_record_count.toLocaleString()}
                            </span>
                          ) : (
                            '—'
                          )}
                        </div>
                        <div className={styles.storageSize}>
                          {formatBytes(obj.bytes)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>
                    No storage data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Information */}
          <div className={styles.infoBox}>
            <div className={styles.infoContent}>
              <h3>Storage Information</h3>
              <ul>
                <li>Storage usage includes all record data, attachments, and system overhead</li>
                <li>Usage is calculated in real-time and updated periodically</li>
                <li>Large attachments and files significantly impact storage consumption</li>
                <li>Contact support if you need to increase your storage plan limit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StorageUsage;
