import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/AuthContext';
import AuthUI from './services/AuthUI';
import LiveGameTracker from './LiveGameTracker';
import PublicHome from './pages/PublicHome';
import TeamPage from './pages/TeamPage';
import LiveGamePage from './pages/LiveGamePage';
import { ToastContainer, useToast } from './components/Shared/Toast';
import PlayerPage from './pages/PlayerPage';

function PrivateApp() {
  const { user, loading } = useAuth();
  const toast = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthUI />;

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <LiveGameTracker user={user} toast={toast} />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"           element={<PublicHome />} />
          <Route path="/team/:slug" element={<TeamPage />} />
          <Route path="/game/:id"   element={<LiveGamePage />} />
          <Route path="/app"        element={<PrivateApp />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
          <Route path="/player/:id" element={<PlayerPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;