import { ChevronDown, ChevronRight, Plus, Columns } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Button from '../../../common/Button/Button';
import styles from './RelatedListHeader.module.css';

const RelatedListHeader = ({
  collapsed,
  setCollapsed,
  objLabel,
  total,
  relatedObjectMeta,
  onColumnChooser,
  onCreateClick,
  showColChooser,
}) => {
  return (
    <div className={styles.header} onClick={() => setCollapsed((c) => !c)}>
      <span className={styles.toggle}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </span>
      <div
        className={styles.objIcon}
        style={{
          background: `${relatedObjectMeta?.color || '#6366f1'}20`,
          color: relatedObjectMeta?.color || '#6366f1',
        }}
      >
        {(() => {
          const IconComp =
            LucideIcons[relatedObjectMeta?.icon] || LucideIcons.Box;
          return <IconComp size={14} />;
        })()}
      </div>
      <span className={styles.title}>{objLabel}</span>
      <span className={styles.count}>{total}</span>
      <div
        className={styles.headerActions}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={`${styles.colBtn} ${showColChooser ? styles.active : ''}`}
          onClick={onColumnChooser}
          title="Choose columns"
        >
          <Columns size={13} />
        </button>
        <button
          className={styles.addBtn}
          onClick={onCreateClick}
          title={`New ${relatedObjectMeta?.label}`}
        >
          <Plus size={13} /> New
        </button>
      </div>
    </div>
  );
};

export default RelatedListHeader;
