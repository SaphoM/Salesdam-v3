import * as LucideIcons from 'lucide-react';
import { ArrowLeft, Save } from 'lucide-react';
import Button from '../../../../components/common/Button/Button';
import styles from '../RecordForm.module.css';

const RecordFormHeader = ({
  objMeta,
  objectApiName,
  isEdit,
  saving,
  onCancel,
}) => {
  const ObjIcon = LucideIcons[objMeta?.icon] || LucideIcons.Box;
  const pageTitle = isEdit
    ? `Edit ${objMeta?.label || objectApiName}`
    : `New ${objMeta?.label || objectApiName}`;

  return (
    <div className={styles.header}>
      <Button
        variant="ghost"
        size="sm"
        icon={<ArrowLeft size={16} />}
        onClick={onCancel}
        className={styles.backBtn}
      >
        Back
      </Button>
      <div className={styles.titleRow}>
        <div
          className={styles.objectIcon}
          style={{
            background: `${objMeta?.color || '#6366f1'}20`,
            color: objMeta?.color || '#6366f1',
          }}
        >
          <ObjIcon size={20} />
        </div>
        <h1 className={styles.title}>{pageTitle}</h1>
      </div>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          type="submit"
          form="record-form"
          icon={<Save size={14} />}
          loading={saving}
        >
          {isEdit ? 'Save Changes' : 'Create Record'}
        </Button>
      </div>
    </div>
  );
};

export default RecordFormHeader;
