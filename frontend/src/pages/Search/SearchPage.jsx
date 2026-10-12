import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, User, Box } from 'lucide-react';
import api from '../../services/api';
import Layout from '../../layout/Layout';
import styles from './SearchPage.module.css';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState({ records: [], users: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const doSearch = async (q) => {
    if (!q || q.trim().length < 2) {
      setResults({ records: [], users: [], total: 0 });
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/search', { params: { q: q.trim() } });
      setResults(res.data.data || { records: [], users: [], total: 0 });
    } catch (err) {
      setResults({ records: [], users: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      doSearch(q);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
      doSearch(query.trim());
    }
  };

  const recordLabel = (r) => {
    // Use recordName from backend (based on configured nameFieldApiName)
    if (r.recordName) {
      return r.recordName;
    }

    // Fallback: try common name patterns
    const data = r.data || {};
    if (data.name) return data.name;
    if (data.first_name || data.last_name) {
      return `${data.first_name || ''} ${data.last_name || ''}`.trim();
    }
    if (data.title) return data.title;
    if (data.company_name) return data.company_name;

    return `${r.objectLabel} Record`;
  };

  return (
    <Layout title="Search" description="Search across all your CRM records">
      <div className={styles.page}>
        <h1 className={styles.title}>Search</h1>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <Search size={18} className={styles.searchIcon} />
          <input
            autoFocus
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search records, users..."
          />
          <button type="submit" className={styles.searchBtn}>
            Search
          </button>
        </form>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        )}

        {!loading && results.total === 0 && query && (
          <div className={styles.empty}>No results for "{query}"</div>
        )}

        {!loading && results.records.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Records ({results.records.length})
            </h3>
            <div className={styles.resultList}>
              {results.records.map((r) => (
                <Link
                  key={r.id}
                  to={`/o/${r.objectApiName}/${r.id}`}
                  className={styles.result}
                >
                  <div className={styles.resultIcon}>
                    <Box size={16} />
                  </div>
                  <div className={styles.resultContent}>
                    <span className={styles.resultName}>{recordLabel(r)}</span>
                    <span className={styles.resultMeta}>
                      {r.objectLabel} ·{' '}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && results.users.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Users ({results.users.length})
            </h3>
            <div className={styles.resultList}>
              {results.users.map((u) => (
                <div key={u._id} className={styles.result}>
                  <div className={styles.resultIcon}>
                    <User size={16} />
                  </div>
                  <div className={styles.resultContent}>
                    <span className={styles.resultName}>
                      {u.firstName} {u.lastName}
                    </span>
                    <span className={styles.resultMeta}>
                      {u.email} {u.title ? `· ${u.title}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
