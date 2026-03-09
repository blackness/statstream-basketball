import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const AuthUI = ({ onBrowseGames }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        setMessage('Success! Check your email for verification link.');
      } else {
        await signIn(email, password);
        setMessage('Signed in successfully!');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="14" width="3" height="7" rx="1" fill="white"/>
              <rect x="8" y="11" width="3" height="10" rx="1" fill="white"/>
              <rect x="13" y="8" width="3" height="13" rx="1" fill="white"/>
              <rect x="18" y="5" width="3" height="16" rx="1" fill="white"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-1">
            Stat<span className="text-blue-600">Stream</span>
          </h1>
          <p className="text-gray-500 text-sm">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            ✓ {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          {/* Submit Button - VERY VISIBLE */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Please wait...
              </span>
            ) : (
              <span>{isSignUp ? '🚀 CREATE ACCOUNT' : '🔐 SIGN IN'}</span>
            )}
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm hover:underline"
          >
            {isSignUp 
              ? '← Already have an account? Sign in' 
              : "Don't have an account? Sign up →"}
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              ✨ Free plan includes unlimited teams
            </p>
            <p className="text-xs text-gray-400">
              Your data is secure and encrypted
            </p>
            {onBrowseGames && (
              <button
                onClick={onBrowseGames}
                className="text-xs text-blue-500 hover:text-blue-600 hover:underline font-semibold mt-2 block w-full"
              >
                Browse games without signing in →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthUI;