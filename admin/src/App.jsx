import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tenants from './pages/Tenants.jsx';
import TenantDetail from './pages/TenantDetail.jsx';
import Users from './pages/Users.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import IncidentManagement from './pages/IncidentManagement.jsx';

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><span className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Public({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><span className="spinner" /></div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#1e2534', color: '#e2e8f0', border: '1px solid #2a3244' },
          }}
        />
        <Routes>
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route
            path="/"
            element={<Guard><Layout /></Guard>}
          >
            <Route index element={<Dashboard />} />
            <Route path="incidents" element={<IncidentManagement />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="tenants/:id" element={<TenantDetail />} />
            <Route path="users" element={<Users />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
