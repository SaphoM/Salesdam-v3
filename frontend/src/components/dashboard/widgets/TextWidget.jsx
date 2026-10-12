import React from 'react';
import styles from './Widget.module.css';

export default function TextWidget({ config }) {
  return (
    <div
      className={styles.textContent}
      style={{ background: config.backgroundColor || 'transparent' }}
    >
      {config.content || <span className={styles.unconfigured}>Add text content…</span>}
    </div>
  );
}
