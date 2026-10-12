import { useState } from 'react';
import {
  Search,
  RefreshCw,
  Calendar,
  Building2,
  Loader,
  FileText,
  Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Layout from '../../layout/Layout';
import TenderDialog from './TendersDialog/TenderDialog';
import Button from '../../components/common/Button/Button';
import TextWrapToggle from '../../components/common/TextWrapToggle/TextWrapToggle';
import useTextWrap from '../../hooks/useTextWrap';
import DynamicLoadingAnimation from './DynamicLoadingAnimation';
import styles from './Tenders.module.css';

const STATUS_COLORS = {
  Open: { bg: '#dcfce7', color: '#15803d' },
  'Closing Soon': { bg: '#fef3c7', color: '#d97706' },
  Closed: { bg: '#fee2e2', color: '#dc2626' },
  Awarded: { bg: '#dbeafe', color: '#1d4ed8' },
};

export default function Tenders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  // Shared with the record list, and kept in the URL (?wrap=).
  const [textWrap, setTextWrap] = useTextWrap();

  const {
    data: tenders = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryFn: async () => {
      try {
        // eTenders upstream is often slow; allow more time than the global 30s default
        const res = await api.get('/tenders/search', { timeout: 60000 });
        return res.data?.data || [];
      } catch (err) {
        const errorMsg = err?.message || 'Failed to fetch tenders';
        const isTimeout = errorMsg.includes('timeout') || err?.status === 408;

        if (isTimeout) {
          toast.error('Request timeout. The API server is slow. Please retry.');
          throw new Error(
            'The eTenders API is taking longer than expected. Please try again.',
          );
        } else {
          toast.error(errorMsg);
          throw new Error('Failed to load tenders. Please try again.');
        }
      }
    },
    queryKey: ['tenders'],
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = tenders.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.tenderNumber?.toLowerCase().includes(q) ||
      t.client?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    );
  });

  const refresh = () => {
    refetch();
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const getDaysToClose = (closingDate) => {
    if (!closingDate) return null;
    const diff = Math.ceil((new Date(closingDate) - new Date()) / 86400000);
    return diff;
  };

  return (
    <Layout
      title="Find Tenders"
      description="Browse available government and public tenders"
    >
      <div className={styles.page}>
        {isLoading ? (
          <DynamicLoadingAnimation />
        ) : (
          <>
            <div className={styles.pageHeader}>
              <div>
                <h1 className={styles.pageTitle}>Find Tenders</h1>
                <p className={styles.pageDesc}>
                  Browse available tenders. Click a title to view full details.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={
                  <RefreshCw
                    size={15}
                    className={isLoading ? styles.spinning : ''}
                  />
                }
                onClick={refresh}
                loading={isLoading}
              >
                Refresh
              </Button>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
              <div className={styles.searchWrap}>
                <Search size={15} className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  placeholder="Search by title, number, client or category"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <TextWrapToggle value={textWrap} onChange={setTextWrap} />
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  padding: 'var(--spacing-4)',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--border-radius)',
                  color: '#991b1b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{error.message}</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={refresh}
                  loading={isLoading}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Results count */}
            {!error && (
              <div className={styles.resultCount}>
                {isLoading ? (
                  <Loader size={14} className={styles.spinning} />
                ) : null}
                <span>
                  {filtered.length} tender{filtered.length !== 1 ? 's' : ''}{' '}
                  found
                </span>
              </div>
            )}

            {/* Table */}
            {!error && (
              <div className={styles.tableWrap}>
                <table
                  className={`${styles.table} ${textWrap === 'wrap' ? styles.wrapText : styles.clipText}`}
                >
                  <thead>
                    <tr>
                      <th>Technical Scope</th>
                      <th>Client</th>
                      <th>Category</th>
                      <th>Closing Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyRow}>
                          <FileText size={28} />
                          <p>No tenders match your search.</p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((tender) => {
                        const daysLeft = getDaysToClose(tender.closingDate);
                        const statusStyle =
                          STATUS_COLORS[tender.status] || STATUS_COLORS['Open'];
                        return (
                          <tr key={tender.id} className={styles.row}>
                            <td data-label="Title">
                              <div className={styles.titleCell}>
                                <div>
                                  <Button
                                    variant="link"
                                    className={styles.titleBtn}
                                    onClick={() => setSelected(tender)}
                                  >
                                    {tender.description ||
                                      tender.title ||
                                      'Untitled Tender'}
                                  </Button>
                                  {tender.tenderNumber && (
                                    <span className={styles.tenderNum}>
                                      {tender.tenderNumber}
                                    </span>
                                  )}
                                </div>
                                {tender.linkedLeadId && (
                                  <button
                                    className={styles.linkedLeadLink}
                                    onClick={() =>
                                      navigate(`/o/lead/${tender.linkedLeadId}`)
                                    }
                                    title="View potential lead"
                                  >
                                    <Link2 size={13} />
                                    View potential lead
                                  </button>
                                )}
                                {tender.linkedDealId && (
                                  <button
                                    className={styles.linkedLeadLink}
                                    onClick={() =>
                                      navigate(`/o/deal/${tender.linkedDealId}`)
                                    }
                                    title="View potential deal"
                                  >
                                    <Link2 size={13} />
                                    View potential deal
                                  </button>
                                )}
                              </div>
                            </td>
                            <td data-label="Client">
                              <div className={styles.clientCell}>
                                <Building2 size={13} />
                                {/* Wrapped so it can clip or wrap — a bare text
                                  node in a flex row can't be styled. */}
                                <span className={styles.clientName}>
                                  {tender.client}
                                </span>
                              </div>
                            </td>
                            <td data-label="Category">
                              <span className={styles.category}>
                                {tender.category}
                              </span>
                            </td>
                            <td data-label="Closing Date">
                              <div className={styles.dateCell}>
                                <Calendar size={13} />
                                <span>{formatDate(tender.closingDate)}</span>
                                {daysLeft !== null && (
                                  <span
                                    className={`${styles.countdown} ${daysLeft <= 7 ? styles.urgent : daysLeft <= 14 ? styles.soon : ''}`}
                                  >
                                    {daysLeft < 0
                                      ? 'Closed'
                                      : daysLeft === 0
                                        ? 'Today'
                                        : `${daysLeft}d`}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td data-label="Status">
                              <span
                                className={styles.statusBadge}
                                style={{
                                  background: statusStyle.bg,
                                  color: statusStyle.color,
                                }}
                              >
                                {tender.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <TenderDialog tender={selected} onClose={() => setSelected(null)} />
      )}
    </Layout>
  );
}
