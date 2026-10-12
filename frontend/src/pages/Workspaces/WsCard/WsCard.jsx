import styles from './WsCard.module.css';
import * as LucideIcons from 'lucide-react';
import { Edit2, Settings, Trash2, Star } from 'lucide-react';

const WsCard = ({ ws, onEdit, onDelete, onView }) => {
  const Icon = LucideIcons[ws.icon] || LucideIcons.Briefcase;

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div
          className={styles.wsIcon}
          style={{ background: `${ws.color}20`, color: ws.color }}
        >
          <Icon size={20} />
        </div>
        <div className={styles.wsMeta}>
          <span className={styles.wsName}>
            {ws.name}
            {ws.isDefault && (
              <span className={styles.defaultBadge}>
                <Star size={10} /> Default
              </span>
            )}
          </span>
          <span className={styles.wsSlug}>{ws.slug}</span>
        </div>
        {!ws.isDefault && (
          <button
            className={styles.danger}
            onClick={() => {
              onDelete(ws);
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>

      {ws.description && <p className={styles.wsDesc}>{ws.description}</p>}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{ws.memberIds?.length ?? 0}</span>
          <span className={styles.statLabel}>Members</span>
        </div>
        <div className={styles.stat}>
          <span
            className={`${styles.statusDot} ${ws.status === 'active' ? styles.active : styles.inactive}`}
          />
          <span className={styles.statLabel}>{ws.status}</span>
        </div>
      </div>

      <div className={styles.cardActions}>
        <button className={styles.editCardBtn} onClick={() => onEdit(ws)}>
          <Edit2 size={13} /> Quick Edit
        </button>
        <button className={styles.openBtn} onClick={() => onView(ws)}>
          <Settings size={13} /> Open
        </button>
      </div>
    </div>
  );
};

export default WsCard;
