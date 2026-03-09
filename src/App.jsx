import React from 'react';
import { AuthProvider, useAuth } from './services/AuthContext';
import LiveGameTracker from './LiveGameTracker';
import { ToastContainer, useToast } from './components/Shared/Toast';

function AppContent() {
  const { user, loading } = useAuth();
  const toast = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Always render LiveGameTracker — handles both logged-in and logged-out states
  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <LiveGameTracker user={user} toast={toast} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
