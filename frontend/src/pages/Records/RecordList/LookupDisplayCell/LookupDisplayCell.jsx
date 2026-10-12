import styles from './LookupDisplayCell.module.css';
import { useEffect, useState } from 'react';
import resolveLookupLabel from '../../utils/resolveRecordListLookupLabel';

const LookupDisplayCell = ({ field, value }) => {
  const [label, setLabel] = useState(null);

  useEffect(() => {
    if (!value || !field.lookupObjectApiName) {
      setLabel('');
      return;
    }
    let cancelled = false;
    resolveLookupLabel(
      field.lookupObjectApiName,
      value,
      field.lookupDisplayField || 'name',
    ).then((l) => {
      if (!cancelled) setLabel(l);
    });
    return () => {
      cancelled = true;
    };
  }, [value, field.lookupObjectApiName, field.lookupDisplayField]);

  if (!value) return <span className={styles.empty}>—</span>;
  if (label === null) return <span className={styles.resolving}>…</span>;
  return <span>{label}</span>;
};

export default LookupDisplayCell;
