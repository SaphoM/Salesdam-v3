import { useState, useCallback, useRef } from 'react';
import api from '../services/api';

const useSearch = () => {
  const [results, setResults] = useState({ records: [], users: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);

  const search = useCallback(async (q, options = {}) => {
    if (!q || q.trim().length < 2) {
      setResults({ records: [], users: [], total: 0 });
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/search', { params: { q: q.trim(), ...options } });
        setResults(res.data.data || { records: [], users: [], total: 0 });
      } catch (err) {
        setResults({ records: [], users: [], total: 0 });
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const suggest = useCallback(async (q, objectApiName, field = 'name') => {
    if (!q || q.length < 1) return [];
    try {
      const res = await api.get('/search/suggest', { params: { q, object: objectApiName, field } });
      return res.data.data || [];
    } catch {
      return [];
    }
  }, []);

  const clear = () => {
    setResults({ records: [], users: [], total: 0 });
    setQuery('');
  };

  return { results, loading, query, setQuery, search, suggest, clear };
};

export default useSearch;
