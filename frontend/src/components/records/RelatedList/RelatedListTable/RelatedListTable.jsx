import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import useCurrency from '../../../../hooks/useCurrency';
import { resolveDisplayType } from '../../../../utils/fieldDisplayType';
import ActionMenu from '../ActionMenu';
import LookupCell from './LookupCell';
import styles from './RelatedListTable.module.css';

const RelatedListTable = ({
  records,
  displayFields,
  relatedObjectMeta,
  onEdit,
  onDelete,
  perms,
  navigate,
}) => {
  const { symbol } = useCurrency();

  const renderCellValue = (field, value) => {
    if (value === null || value === undefined || value === '') return '—';
    // Formula fields render as their declared return type — see resolveDisplayType.
    switch (resolveDisplayType(field)) {
      case 'lookup':
      case 'master_detail':
        return <LookupCell field={field} value={value} />;
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'currency':
        return `${symbol}${parseFloat(value).toLocaleString()}`;
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'picklist': {
        const pv = field.picklistValues?.find((p) => p.value === value);
        return (
          <span
            className={styles.badge}
            style={
              pv?.color ? { background: `${pv.color}20`, color: pv.color } : {}
            }
          >
            {pv?.label || value}
          </span>
        );
      }
      default:
        return String(value).length > 40
          ? String(value).slice(0, 40) + '…'
          : String(value);
    }
  };

  if (records.length === 0) {
    return null;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} style={{ width: 40 }} />
            {displayFields?.map((f) => (
              <th key={f.apiName} className={styles.th}>
                {f.label}
              </th>
            ))}
            <th className={styles.th} style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {records.map((row) => {
            const rowId = row.id || row._id;
            return (
              <tr
                key={rowId}
                className={styles.tr}
                onClick={() =>
                  navigate(`/o/${relatedObjectMeta?.apiName}/${rowId}`)
                }
              >
                <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                  <ActionMenu
                    onEdit={() => onEdit(rowId)}
                    onDelete={() => onDelete(rowId)}
                    canEdit={perms?.canUpdate}
                    canDelete={perms?.canDelete}
                  />
                </td>
                {displayFields.map((f) => (
                  <td key={f.apiName} className={styles.td}>
                    {renderCellValue(f, row[f.apiName])}
                  </td>
                ))}
                <td className={styles.td}>
                  <Link
                    to={`/o/${relatedObjectMeta?.apiName}/${rowId}`}
                    className={styles.openLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RelatedListTable;
