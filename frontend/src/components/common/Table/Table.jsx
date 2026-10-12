import styles from './Table.module.css';
import { ChevronUp, ChevronDown } from 'lucide-react';
import TableSkeleton from '../TableSkeleton/TableSkeleton';

/** Floor for an auto-sized column, so 30 columns scroll instead of squashing. */
const DEFAULT_MIN_COLUMN_WIDTH = 160;
const CHECKBOX_COLUMN_WIDTH = 44;

const Table = ({
  columns,
  data,
  loading,
  // A background refetch. The rows stay on screen and a thin bar appears rather
  // than the whole table being swapped for a skeleton, so the list doesn't flash
  // every time it revalidates.
  refreshing = false,
  emptyMessage = 'No data found',
  onRowClick,
  sortField,
  sortOrder,
  onSort,
  selectedRows,
  onSelectRow,
  onSelectAll,
  // 'clip' truncates overlong cell text with an ellipsis, 'wrap' lets it flow
  // onto more lines. Either way the cell is width-bounded, so the table never
  // widens past the layout below.
  textWrap = 'clip',
  minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
}) => {
  const handleSort = (col) => {
    if (!col.sortable || !onSort) return;
    const newOrder =
      sortField === col.key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(col.key, newOrder);
  };

  const allSelected = data?.length > 0 && selectedRows?.length === data.length;

  // `table-layout: fixed` makes the columns divide a width we control instead of
  // being stretched by their longest value. This floor keeps them readable; the
  // wrapper scrolls horizontally once the columns no longer fit.
  const minWidth =
    columns.reduce(
      (sum, col) => sum + (Number.parseFloat(col.width) || minColumnWidth),
      0,
    ) + (onSelectRow ? CHECKBOX_COLUMN_WIDTH : 0);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {refreshing && <div className={styles.refreshBar} />}
      <div className={styles.wrapper}>
        <table
          className={`${styles.table} ${textWrap === 'wrap' ? styles.wrapText : styles.clipText}`}
          style={{ minWidth }}
        >
          <thead className={styles.thead}>
            <tr>
              {onSelectRow && (
                <th className={`${styles.th} ${styles.checkboxCell}`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.th} ${col.sortable ? styles.sortable : ''}`}
                  style={{ width: col.width }}
                  onClick={() => handleSort(col)}
                >
                  <span className={styles.thContent}>
                    <span className={styles.thLabel} title={col.header}>
                      {col.header}
                    </span>
                    {col.sortable && (
                      <span className={styles.sortIcons}>
                        <ChevronUp
                          size={12}
                          className={
                            sortField === col.key && sortOrder === 'asc'
                              ? styles.sortActive
                              : ''
                          }
                        />
                        <ChevronDown
                          size={12}
                          className={
                            sortField === col.key && sortOrder === 'desc'
                              ? styles.sortActive
                              : ''
                          }
                        />
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelectRow ? 1 : 0)}
                  className={styles.empty}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data?.map((row, i) => (
                <tr
                  key={row._id || row.id || i}
                  className={`${styles.tr} ${onRowClick ? styles.clickable : ''} ${selectedRows?.includes(row._id || row.id) ? styles.selected : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {onSelectRow && (
                    <td
                      className={`${styles.td} ${styles.checkboxCell}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedRows?.includes(row._id || row.id) || false
                        }
                        onChange={(e) =>
                          onSelectRow(row._id || row.id, e.target.checked)
                        }
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={styles.td}>
                      {/* The inner block is what clips or wraps — `td` itself
                          honours neither overflow nor text-overflow reliably. */}
                      <div className={styles.cell}>
                        {col.render
                          ? col.render(row[col.key], row)
                          : (row[col.key] ?? '—')}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
