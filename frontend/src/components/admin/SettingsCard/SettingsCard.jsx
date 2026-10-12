import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import styles from './SettingsCard.module.css';

export default function SettingsCard({ title, description, icon: Icon, color, href, onClick, isDangerous }) {
  const cardContent = (
    <>
      {Icon && (
        <div
          className={styles.cardIcon}
          style={{ background: `${color}18`, color }}
        >
          <Icon size={20} />
        </div>
      )}
      <div className={styles.cardBody}>
        <h4 className={styles.cardTitle}>{title}</h4>
        <p className={styles.cardDesc}>{description}</p>
      </div>
      <ChevronRight size={16} className={styles.cardArrow} />
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${styles.card} ${isDangerous ? styles.dangerous : ''}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link to={href} className={styles.card}>
      {cardContent}
    </Link>
  );
}
