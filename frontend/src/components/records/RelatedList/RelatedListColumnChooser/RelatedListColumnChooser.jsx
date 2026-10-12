import { Check, X } from 'lucide-react';
import { withoutHelperFields } from '../../../../utils/fieldVisibility';
import styles from './RelatedListColumnChooser.module.css';

const RelatedListColumnChooser = ({
  allRelatedFields,
  draftCols,
  onToggleCol,
  onReset,
  onApply,
  defaultCols,
}) => {
  return (
    <div className={styles.colChooserPopup}>
      <div className={styles.colChooserHeader}>
        <span>Choose Columns</span>
        <button onClick={onApply} title="Close">
          <X size={14} />
        </button>
      </div>
      <div className={styles.colChooserList}>
        {withoutHelperFields(allRelatedFields)
          .filter((f) => !['_id', 'tenantId'].includes(f.apiName))
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((f) => {
            const selected = draftCols.includes(f.apiName);
            const disabled = !selected && draftCols.length >= 6;

            return (
              <div
                key={f.apiName}
                className={`${styles.colChooserItem} ${
                  selected ? styles.selected : ''
                } ${disabled ? styles.disabled : ''}`}
                onClick={() => {
                  if (!disabled) onToggleCol(f.apiName);
                }}
              >
                <div className={styles.colCheck}>
                  {selected && <Check size={12} />}
                </div>

                <span className={styles.colLabel}>{f.label}</span>

                <span className={styles.colType}>{f.type}</span>
              </div>
            );
          })}
      </div>
      <div className={styles.colChooserFooter}>
        <button className={styles.colReset} onClick={() => onReset()}>
          Reset
        </button>
        <button className={styles.colApply} onClick={onApply}>
          <Check size={12} /> Apply
        </button>
      </div>
    </div>
  );
};

export default RelatedListColumnChooser;
