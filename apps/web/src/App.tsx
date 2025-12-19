import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivacyProvider } from './context/PrivacyContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Layout } from './components/Layout';
import * as authService from './services/authService';
import { ModelStatus } from './components/ModelStatus';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--primary)' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  const handleLogout = async () => {
    localStorage.removeItem('activeJobId');
    await authService.logout();
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/" />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard user={user!} onLogout={handleLogout} />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};


import { preloadModel } from './services/localAiService';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PrivacyProvider>
        <AppContent />
      </PrivacyProvider>
    </AuthProvider>
  );
};

// Extracted inner component to use hooks
const AppContent: React.FC = () => {
  const { user } = useAuth();

  // Preload model once user is authenticated
  React.useEffect(() => {
    if (user) {
      preloadModel().catch(console.error);
    }
  }, [user]);

  return (
    <BrowserRouter>
      <AppRoutes />
      <ModelStatus />
    </BrowserRouter>
  );
};

export default App;