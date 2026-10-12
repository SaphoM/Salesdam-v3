import styles from './RecordTable.module.css';
import { useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import api from '../../../../services/api';
import Table from '../../../../components/common/Table/Table';
import TableSkeleton from '../../../../components/common/TableSkeleton/TableSkeleton';
import InlineCell from '../InlineCell/InlineCell';
import { extractServerErrors } from '../../../../utils/serverErrors';

/** Root columns come back populated, so render the person rather than the id. */
const renderUser = (value) => {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  const name = [value.firstName, value.lastName].filter(Boolean).join(' ');
  return name || value.email || '—';
};

const renderRootValue = (field, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (field.type === 'datetime') return new Date(value).toLocaleString();
  if (field.type === 'user') return renderUser(value);
  return String(value);
};

/** Plain-text fallback used by the mobile cards. */
const asText = (field, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (field.isRoot) return renderRootValue(field, value);
  if (typeof value === 'object') return renderUser(value);
  return String(value);
};

const RecordTable = ({
  objectApiName,
  records,
  loading,
  refreshing,
  textWrap,
  objectLabel,
  displayFields,
  sort,
  setSort,
  setPage,
  selected,
  setSelected,
  // For inline save cache updates — the exact key RecordList queries with, so
  // an inline edit patches the right cache entry.
  queryClient,
  recordsQueryKey,
}) => {
  const navigate = useNavigate();

  const handleInlineSave = useCallback(
    async (recordId, fieldApiName, newValue) => {
      try {
        await api.patch(`/records/${objectApiName}/${recordId}`, {
          [fieldApiName]: newValue,
        });
      } catch (err) {
        // Surface the server's reason — axios sets err.message to the generic
        // "Request failed with status code 400", so a duplicate value on a
        // unique field used to read as a meaningless HTTP error.
        const { fieldErrors, message } = extractServerErrors(err, [
          { apiName: fieldApiName },
        ]);
        throw new Error(fieldErrors[fieldApiName] || message);
      }

      queryClient.setQueryData(recordsQueryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          records: prev.records.map((r) =>
            (r.id || r._id) === recordId
              ? { ...r, [fieldApiName]: newValue }
              : r,
          ),
        };
      });
    },
    [objectApiName, queryClient, recordsQueryKey],
  );

  const handleSort = (field, order) => {
    setSort({ field, order });
    setPage(1);
  };
  const handleRowClick = (row) =>
    navigate(`/o/${objectApiName}/${row.id || row._id}`);

  const handleSelectRow = (id, checked) =>
    setSelected((prev) =>
      checked ? [...prev, id] : prev.filter((s) => s !== id),
    );

  const handleSelectAll = (checked) =>
    setSelected(checked ? records.map((r) => r.id || r._id) : []);

  // Columns follow the order of `displayFields`, which is the active view's
  // ordered column list — never the field definition order.
  const columns = displayFields.map((f) => ({
    key: f.apiName,
    header: f.label,
    sortable:
      f.isRoot ||
      (f.isSortable !== false &&
        !['lookup', 'master_detail', 'boolean'].includes(f.type)),
    render: f.isRoot
      ? (val) => renderRootValue(f, val)
      : (val, row) => (
          <InlineCell
            field={f}
            value={val}
            recordId={row.id || row._id}
            onSave={handleInlineSave}
            onClick={() => navigate(`/o/${objectApiName}/${row.id || row._id}`)}
          />
        ),
  }));

  return (
    <>
      {/* Desktop table */}
      <div className={styles.tableWrapper}>
        <Table
          columns={columns}
          data={records}
          loading={loading}
          refreshing={refreshing}
          textWrap={textWrap}
          emptyMessage={`No ${objectLabel.toLowerCase()} found.`}
          sortField={sort.field}
          sortOrder={sort.order}
          onSort={handleSort}
          onRowClick={handleRowClick}
          selectedRows={selected}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
        />
      </div>

      {/* Mobile card view */}
      <div className={styles.mobileCards}>
        {loading ? (
          <TableSkeleton />
        ) : records.length === 0 ? (
          <div className={styles.emptyState}>
            No {objectLabel.toLowerCase()} found.
          </div>
        ) : (
          records.map((row) => {
            const rowId = row.id || row._id;
            const titleField = displayFields[0];
            const titleVal = titleField ? row[titleField.apiName] : rowId;
            return (
              <div
                key={rowId}
                className={`${styles.mobileCard} ${selected.includes(rowId) ? styles.selected : ''}`}
                onClick={() => navigate(`/o/${objectApiName}/${rowId}`)}
              >
                <div className={styles.mobileCardHeader}>
                  <input
                    type="checkbox"
                    className={styles.mobileCardCheck}
                    checked={selected.includes(rowId)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectRow(rowId, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className={styles.mobileCardTitle}>
                    {(titleField ? asText(titleField, titleVal) : null) ||
                      `#${String(rowId).slice(-6)}`}
                  </span>
                  <Link
                    to={`/o/${objectApiName}/${rowId}/edit`}
                    className={styles.mobileCardEdit}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Pencil size={12} /> Edit
                  </Link>
                </div>
                <div className={styles.mobileCardFields}>
                  {displayFields.slice(0, 4).map((f) => (
                    <div key={f.apiName} className={styles.mobileCardField}>
                      <span className={styles.mobileCardLabel}>{f.label}</span>
                      <span className={styles.mobileCardValue}>
                        {asText(f, row[f.apiName])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default RecordTable;
