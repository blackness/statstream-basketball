import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/supabase';

const AuthUI = ({ onBrowseGames }) => {
  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const { signIn, signUp } = useAuth();

  // Use supabase directly for password reset
  const handleForgotPassword = async () => {
    setError(null); setMessage(null);
    if (!email) { setError('Enter your email address first'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMessage('Password reset email sent — check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null); setMessage(null);
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      if (mode === 'signUp') {
        await signUp(email, password, fullName);
        setMessage('Success! Check your email for a verification link.');
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setError(null); setMessage(null); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="14" width="3" height="7" rx="1" fill="white"/>
              <rect x="8" y="11" width="3" height="10" rx="1" fill="white"/>
              <rect x="13" y="8" width="3" height="13" rx="1" fill="white"/>
              <rect x="18" y="5" width="3" height="16" rx="1" fill="white"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-1">Stat<span className="text-blue-600">Stream</span></h1>
          <p className="text-gray-500 text-sm">
            {mode === 'signUp' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Sign in to continue'}
          </p>
        </div>

        {error && <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">⚠️ {error}</div>}
        {message && <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">✓ {message}</div>}

        {/* Forgot password mode */}
        {mode === 'forgot' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                placeholder="you@example.com"
              />
            </div>
            <button onClick={handleForgotPassword} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-4 rounded-lg font-bold text-base transition">
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
            <button onClick={() => { setMode('signIn'); reset(); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
              ← Back to sign in
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {mode === 'signUp' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base"
                  placeholder="John Doe" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base"
                placeholder="••••••••" />
              {mode === 'signIn' && (
                <button onClick={() => { setMode('forgot'); reset(); }}
                  className="text-xs text-blue-500 hover:text-blue-700 mt-1 font-semibold">
                  Forgot password?
                </button>
              )}
            </div>

            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-lg">
              {loading ? 'Please wait...' : mode === 'signUp' ? '🚀 CREATE ACCOUNT' : '🔐 SIGN IN'}
            </button>

            <div className="text-center">
              <button onClick={() => { setMode(mode === 'signUp' ? 'signIn' : 'signUp'); reset(); }}
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm hover:underline">
                {mode === 'signUp' ? '← Already have an account? Sign in' : "Don't have an account? Sign up →"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 text-center space-y-2">
          <p className="text-xs text-gray-500">✨ Free plan includes unlimited teams</p>
          <p className="text-xs text-gray-400">Your data is secure and encrypted</p>
          {onBrowseGames && (
            <button onClick={onBrowseGames} className="text-xs text-blue-500 hover:text-blue-600 hover:underline font-semibold mt-2 block w-full">
              Browse games without signing in →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthUI;