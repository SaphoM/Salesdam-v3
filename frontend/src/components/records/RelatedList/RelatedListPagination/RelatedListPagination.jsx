import styles from './RelatedListPagination.module.css';

const RelatedListPagination = ({
  total,
  page,
  pageSize,
  isLoading,
  onPrevClick,
  onNextClick,
}) => {
  const totalPages = Math.ceil(total / pageSize);

  if (total <= pageSize) {
    return null;
  }

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageBtn}
        disabled={page <= 1 || isLoading}
        onClick={onPrevClick}
      >
        ‹ Prev
      </button>
      <span className={styles.pageInfo}>
        {page} / {totalPages}
      </span>
      <button
        className={styles.pageBtn}
        disabled={page >= totalPages || isLoading}
        onClick={onNextClick}
      >
        Next ›
      </button>
    </div>
  );
};

export default RelatedListPagination;
