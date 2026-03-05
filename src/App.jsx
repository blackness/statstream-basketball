import React from 'react';
import { AuthProvider, useAuth } from './services/AuthContext';
import AuthUI from './services/AuthUI';

function AppContent() {
  const { user, loading } = useAuth();

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

  if (!user) {
    return <AuthUI />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-gray-900 mb-4">
          Welcome to Stat<span className="text-blue-600">Stream</span>!
        </h1>
        <p className="text-gray-600 mb-4">Email: {user.email}</p>
        <p className="text-green-600 font-bold">✅ Authentication working!</p>
      </div>
    </div>
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