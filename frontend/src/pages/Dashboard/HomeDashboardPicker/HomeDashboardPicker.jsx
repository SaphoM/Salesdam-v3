import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { getDashboards } from '../../../services/api/dashboards';
import styles from './HomeDashboardPicker.module.css';

export default function HomeDashboardPicker({ currentId, onSave, onClose }) {
  const [selected, setSelected] = useState(currentId || '');

  const { data: dashboards = [], isLoading: loading } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => getDashboards(),
  });

  return (
    <div className={styles.pickerOverlay} onClick={onClose}>
      <div className={styles.pickerModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.pickerHeader}>
          <span>Choose a dashboard to display</span>
          <button className={styles.pickerClose} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className={styles.pickerLoading}>
            <div className={styles.pickerSpinner} />
          </div>
        ) : (
          <div className={styles.pickerList}>
            <label className={styles.pickerItem}>
              <input
                type="radio"
                name="hd"
                value=""
                checked={selected === ''}
                onChange={() => setSelected('')}
              />
              <span className={styles.pickerItemLabel}>None</span>
            </label>

            {dashboards.map((d) => (
              <label key={d._id} className={styles.pickerItem}>
                <input
                  type="radio"
                  name="hd"
                  value={d._id}
                  checked={selected === d._id}
                  onChange={() => setSelected(d._id)}
                />
                <LayoutDashboard
                  size={15}
                  style={{ color: d.color || '#6366f1', flexShrink: 0 }}
                />
                <span className={styles.pickerItemLabel}>{d.name}</span>
              </label>
            ))}

            {dashboards.length === 0 && (
              <p className={styles.pickerEmpty}>
                No dashboards available.{' '}
                <Link to="/dashboards">Create one first.</Link>
              </p>
            )}
          </div>
        )}

        <div className={styles.pickerFooter}>
          <button className={styles.pickerCancel} onClick={onClose}>
            Cancel
          </button>

          <button
            className={styles.pickerSave}
            onClick={() => onSave(selected || null)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
