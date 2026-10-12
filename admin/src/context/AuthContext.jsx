import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      const u = res.data.data?.user;
      if (!u || (u.systemRole !== 'admin' && u.systemRole !== 'superuser')) {
        setUser(null);
        localStorage.removeItem('admin_tenantId');
      } else {
        setUser(u);
        const tid = res.data.data?.tenant?._id;
        if (tid) localStorage.setItem('admin_tenantId', tid);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password, isAdminLogin: true });
    const u = res.data.data?.user;
    const t = res.data.data?.tenant;
    // if (!u || (u.systemRole !== 'admin' && u.systemRole !== 'superuser')) {
    //   throw new Error('You do not have access to the admin dashboard.');
    // }
    if (t?._id) localStorage.setItem('admin_tenantId', t._id);
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setUser(null);
    localStorage.removeItem('admin_tenantId');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
