import styles from './RelatedList.module.css';
import SkeletonLoader from '../../common/SkeletonLoader/SkeletonLoader';

const RelatedListSkeleton = ({ columnCount = 4 }) => {
  const rows = 5;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} style={{ width: 40 }} />
            {Array.from({ length: columnCount }).map((_, i) => (
              <th key={i} className={styles.th}>
                <SkeletonLoader width="80px" height="16px" />
              </th>
            ))}
            <th className={styles.th} style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className={styles.tr}>
              <td className={styles.td} style={{ width: 40 }} />
              {Array.from({ length: columnCount }).map((_, colIdx) => (
                <td key={colIdx} className={styles.td}>
                  <SkeletonLoader width="100%" height="14px" borderRadius="3px" />
                </td>
              ))}
              <td className={styles.td} style={{ width: 40 }} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RelatedListSkeleton;
