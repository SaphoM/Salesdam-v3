import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { getObjects } from '../services/api/objects';
import { useAuthContext } from './AuthContext';

const TenantContext = createContext(null);

export const TenantProvider = ({ children }) => {
  const { tenant, isAuthenticated } = useAuthContext();
  const [objects, setObjects] = useState([]);
  const [loadingObjects, setLoadingObjects] = useState(false);

  const fetchObjects = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingObjects(true);
    try {
      const res = await getObjects({ navOnly: 'false' });
      setObjects(res || []);
    } catch (err) {
      // Silently fail
    } finally {
      setLoadingObjects(false);
    }
  }, [isAuthenticated]);

  // Re-run whenever the active tenant changes (workspace switch reloads correct object list)
  useEffect(() => {
    if (isAuthenticated) {
      fetchObjects();
    } else {
      setObjects([]);
    }
  }, [isAuthenticated, fetchObjects, tenant?._id]);

  const getObject = (apiName) => objects.find((o) => o.apiName === apiName);

  const refreshObjects = () => fetchObjects();

  return (
    <TenantContext.Provider
      value={{
        tenant,
        objects,
        loadingObjects,
        getObject,
        refreshObjects,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = () => {
  const ctx = useContext(TenantContext);
  if (!ctx)
    throw new Error('useTenantContext must be used within TenantProvider');
  return ctx;
};

export default TenantContext;
