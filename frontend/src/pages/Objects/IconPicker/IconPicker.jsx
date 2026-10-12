import React from 'react';
import * as LucideIcons from 'lucide-react';
import styles from './IconPicker.module.css';

const LUCIDE_ICONS = [
  'Box', 'Building2', 'User', 'Users', 'TrendingUp', 'CheckSquare',
  'Star', 'Heart', 'Package', 'Briefcase', 'Globe', 'Tag', 'Layers',
  'FileText', 'ShoppingCart', 'DollarSign', 'Truck', 'Home', 'Phone',
  'Mail', 'Calendar', 'Clock', 'Flag', 'Wrench', 'Cpu', 'Database',
  'BarChart2', 'PieChart', 'Activity', 'Award', 'BookOpen', 'Clipboard',
  'Map', 'Target', 'Zap',
];

export default function IconPicker({ value, onChange }) {
  return (
    <div className={styles.grid}>
      {LUCIDE_ICONS.map((name) => {
        const Icon = LucideIcons[name] || LucideIcons.Box;
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            title={name}
            onClick={() => onChange(name)}
            className={`${styles.iconBtn} ${selected ? styles.selected : ''}`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
