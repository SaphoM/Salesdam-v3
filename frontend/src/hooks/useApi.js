import { useState, useCallback } from 'react';
import api from '../services/api';

/**
 * useApi - Generic hook for making API calls with loading/error state.
 */
const useApi = (apiFunc) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc(...args);
      setData(result.data);
      return result.data;
    } catch (err) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  return { data, loading, error, execute };
};

/**
 * usePaginatedApi - Hook for paginated list queries.
 */
export const usePaginatedApi = (endpoint, initialParams = {}) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetch = useCallback(async (overrideParams = {}) => {
    setLoading(true);
    setError(null);
    const mergedParams = { ...params, ...overrideParams };
    try {
      const res = await api.get(endpoint, { params: mergedParams });
      setData(res.data.data || []);
      if (res.data.pagination) setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, params]);

  const goToPage = (page) => {
    setParams(prev => ({ ...prev, page }));
  };

  return { data, pagination, loading, error, fetch, setParams, goToPage };
};

export default useApi;
