import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Layout from '../../layout/Layout';
import styles from './AdminSettingsPage.module.css';

export default function AdminSettingsPage({
  title,
  description,
  icon: Icon,
  iconColor = 'var(--color-primary)',
  children,
}) {
  return (
    <Layout title={title} description={description}>
      <div className={styles.page}>
        <Link to="/admin/settings" className={styles.backLink}>
          <ChevronLeft size={14} />
          Admin Settings
        </Link>
        <div className={styles.pageHeader}>
          <div
            className={styles.headerIcon}
            style={{ background: `${iconColor}18`, color: iconColor }}
          >
            {Icon && <Icon size={22} />}
          </div>
          <div>
            <h1 className={styles.pageTitle}>{title}</h1>
            {description && <p className={styles.pageDesc}>{description}</p>}
          </div>
        </div>
        {children}
      </div>
    </Layout>
  );
}
