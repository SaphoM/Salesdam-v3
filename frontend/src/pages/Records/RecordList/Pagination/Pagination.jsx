import styles from './Pagination.module.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const getPageNumbers = (page, totalPages) => {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
  if (page >= totalPages - 3)
    return [
      1,
      '...',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  return [1, '...', page - 1, page, page + 1, '...', totalPages];
};

const Pagination = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  if (!totalPages || totalPages <= 0) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <div className={styles.pagination}>
      <div className={styles.pageInfo}>
        <span className={styles.pageInfoLabel}>Rows per page</span>
        <select
          className={styles.pageSizeSelect}
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className={styles.pageInfoDivider} />
        <span className={styles.totalCount}>
          {total?.toLocaleString()} total
        </span>
      </div>

      <div className={styles.pageControls}>
        <button
          className={styles.pageBtn}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>

        <div className={styles.pageNumbers}>
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>
                …
              </span>
            ) : (
              <button
                key={p}
                className={`${styles.pageNumBtn} ${p === page ? styles.pageNumActive : ''}`}
                onClick={() => p !== page && onPageChange(p)}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <button
          className={styles.pageBtn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
