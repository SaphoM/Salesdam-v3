import React from 'react';
import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button/Button';
import AdminSettingsPage from '../AdminSettingsPage';
import styles from '../AdminSettingsPage.module.css';
import localStyles from './EmailConfiguration.module.css';

export default function EmailConfiguration() {
  return (
    <AdminSettingsPage
      title="Email Configuration"
      description="Configure outbound email senders and SMTP settings"
      icon={Mail}
    >
      <div className={styles.panel}>
        <div className={localStyles.emailRedirect}>
          <Mail size={40} className={localStyles.emailIcon} />
          <h3>Manage Email Senders</h3>
          <p>Configure your outbound SMTP senders, sender addresses, and email delivery settings on the Email Senders page.</p>
          <Button icon={<Mail size={15} />} to="/admin/email-senders" onClick={() => window.location.href = '/admin/email-senders'}>
            Go to Email Senders
          </Button>
        </div>
      </div>
    </AdminSettingsPage>
  );
}
