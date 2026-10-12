import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const ACTIVE_WORKSPACE_KEY = 'activeWorkspaceId';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [workspaces, setWorkspaces] = useState([]); // workspaces user belongs to
  const [activeWorkspace, setActiveWorkspace] = useState(null); // currently selected
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({});

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      const { user: userData, tenant: tenantData } = res.data.data;
      // Keep localStorage in sync so the API interceptor sends the correct X-Tenant-ID
      if (tenantData?._id)
        localStorage.setItem('tenantId', String(tenantData._id));

      // Ensure tenant has operating currency with fallback
      const enrichedTenant = {
        ...tenantData,
        operatingCurrency: tenantData?.operatingCurrency || {
          code: 'ZAR',
          name: 'South African Rand',
          symbol: 'R',
        },
      };

      setUser(userData);
      setTenant(enrichedTenant);

      // Workspaces this user belongs to (populated by getMe)
      const userWorkspaces = userData?.workspaces || [];
      setWorkspaces(userWorkspaces);

      const activeWorkspaceId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);

      const activeWs = activeWorkspaceId
        ? userWorkspaces.find(
            (w) =>
              w._id === activeWorkspaceId ||
              w._id?.toString() === activeWorkspaceId,
          )
        : userWorkspaces.find((w) => w.isDefault) || userWorkspaces[0] || null;
      setActiveWorkspace(activeWs || null);

      buildPermissions(userData);
    } catch (err) {
      setUser(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const buildPermissions = (userData) => {
    if (!userData) return;

    // Safely resolve role name
    const roleName = userData.role?.name?.toLowerCase?.();

    const perms = {
      roleName,
    };

    // Superuser / Admin privileges
    if (roleName === 'superuser' || roleName === 'admin') {
      perms.isAdmin = true;
      perms.canManageUsers = true;
      perms.canManageRoles = true;
      perms.canManageObjects = true;
      perms.canManageAutomations = true;
      perms.canManageIntegrations = true;
      perms.canViewAnalytics = true;
      perms.canManageAnalytics = true;
      perms.canViewAuditLog = true;
      perms.canManageTenantSettings = true;
      perms.canManageApiKeys = true;
      perms.canManageWebhooks = true;
    }

    // Merge role-level app permissions (additive)
    if (userData.role?.appPermissions) {
      Object.entries(userData.role.appPermissions).forEach(([key, val]) => {
        if (val) perms[key] = true;
      });
    }

    setPermissions(perms);
  };

  const login = async (username, password, tenantId) => {
    const res = await api.post('/auth/login', { username, password, tenantId });
    const { user: userData, tenant: tenantData } = res.data.data;
    if (tenantData?._id)
      localStorage.setItem('tenantId', String(tenantData._id));
    setUser(userData);
    setTenant(tenantData);
    buildPermissions(userData);
    // Workspaces are loaded in full by the subsequent /auth/me call from fetchMe
    await fetchMe();
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    const { user: userData, tenant: tenantData } = res.data.data;
    if (tenantData?._id)
      localStorage.setItem('tenantId', String(tenantData._id));
    setUser(userData);
    setTenant(tenantData);
    buildPermissions(userData);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('tenantId');
    setUser(null);
    setTenant(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setPermissions({});
  };

  const switchWorkspace = (workspaceId) => {
    const ws = workspaces.find(
      (w) => w._id === workspaceId || w._id?.toString() === workspaceId,
    );
    if (ws) {
      setActiveWorkspace(ws);
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
    }
  };

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const hasPermission = (key) => {
    const userRoleName = user?.role?.name?.toLowerCase();

    if (userRoleName === 'superuser') return true;
    return !!permissions[key];
  };

  const canAccessObject = (objectApiName, action = 'read') => {
    const userRoleName = user?.role?.name?.toLowerCase();
    if (userRoleName === 'superuser' || userRoleName === 'admin') return true;
    if (!user?.role) return false;
    return user.role.can && user.role.can(action, objectApiName);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        loading,
        permissions,
        workspaces,
        activeWorkspace,
        login,
        register,
        logout,
        switchWorkspace,
        updateUser,
        fetchMe,
        hasPermission,
        canAccessObject,
        isAuthenticated: !!user,
        isSuperuser: user?.role?.name?.toLowerCase() === 'superuser',
        isAdmin: ['superuser', 'admin'].includes(
          user?.role?.name?.toLowerCase(),
        ),
        // Expose common permissions directly for convenience
        canManageUsers: permissions.canManageUsers,
        canManageRoles: permissions.canManageRoles,
        canManageObjects: permissions.canManageObjects,
        canManageAutomations: permissions.canManageAutomations,
        canManageIntegrations: permissions.canManageIntegrations,
        canViewAnalytics: permissions.canViewAnalytics,
        canManageAnalytics: permissions.canManageAnalytics,
        canViewAuditLog: permissions.canViewAuditLog,
        canManageTenantSettings: permissions.canManageTenantSettings,
        canManageApiKeys: permissions.canManageApiKeys,
        canManageWebhooks: permissions.canManageWebhooks,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
