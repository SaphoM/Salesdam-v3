import styles from './BtnIconPicker.module.css';
import { useState } from 'react';
import BTN_ICONS from '../utils/BTN_ICONS';
import * as LucideIcons from 'lucide-react';

const BtnIconPicker = ({ label = 'Icon', value, onChange }) => {
  const [search, setSearch] = useState('');

  const filtered = BTN_ICONS.filter(
    (n) => !search || n.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>{label}</label>

      <div className={styles.container}>
        <input
          className={styles.searchInput}
          placeholder="Search icons…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.grid}>
          {filtered.map((name) => {
            const Icon = LucideIcons[name] || LucideIcons.Zap;
            const selected = value === name;

            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => onChange(name)}
                className={`${styles.iconButton} ${
                  selected ? styles.active : ''
                }`}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>

        {value &&
          (() => {
            const Ic = LucideIcons[value] || LucideIcons.Zap;
            return (
              <span className={styles.selectedValue}>
                <Ic size={12} /> {value}
              </span>
            );
          })()}
      </div>
    </div>
  );
};

export default BtnIconPicker;
