import './styles/variables.css'
import './styles/global.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { AppProvider } from './context/AppContext';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Create a client.
// The defaults are deliberately quiet: React Query out of the box treats every
// query as stale immediately and refetches on window focus and reconnect, which
// made lists reload constantly. Refetching is driven by the query key changing
// or by an explicit invalidation after a mutation instead.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <AppProvider>
            <HelmetProvider>
              <QueryClientProvider client={queryClient}>
                <App />
                <Toaster
                  position="top-center"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--font-size-sm)',
                      borderRadius: 'var(--border-radius)',
                      boxShadow: 'var(--shadow-lg)',
                    },
                    success: {
                      iconTheme: { primary: '#22c55e', secondary: '#fff' },
                    },
                    error: {
                      iconTheme: { primary: '#ef4444', secondary: '#fff' },
                    },
                  }}
                />
              </QueryClientProvider>
            </HelmetProvider>
          </AppProvider>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
