import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import api from '../services/api';
import { useAuthContext } from './AuthContext';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light',
  );
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications?unreadOnly=false&limit=10');
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (e) {}
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const toggleTheme = () =>
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <AppContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        theme,
        toggleTheme,
        setTheme,
        notifications,
        unreadCount,
        fetchNotifications,
        markNotificationRead,
        markAllRead,
        globalSearchOpen,
        setGlobalSearchOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

export default AppContext;
