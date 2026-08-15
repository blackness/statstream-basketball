import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const inputCls =
  'w-full px-4 py-3.5 bg-gray-900 border border-gray-700 rounded-xl text-sm ' +
  'font-semibold text-white placeholder:text-gray-600 placeholder:font-normal ' +
  'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition';

const VIEWS = {
  SIGN_IN:  'signin',
  SIGN_UP:  'signup',
  FORGOT:   'forgot',
  SENT:     'sent',
};

export default function AuthUI() {
  const navigate        = useNavigate();
  const { signIn, signUp, resetPassword } = useAuth();

  const [view,      setView]      = useState(VIEWS.SIGN_IN);
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [fullName,  setFullName]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [message,   setMessage]   = useState(null);

  const reset = () => { setError(null); setMessage(null); };

  const goTo = (v) => { reset(); setView(v); };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();
    setLoading(true);

    try {
      if (view === VIEWS.SIGN_IN) {
        await signIn(email, password);
        // Auth state change fires → PrivateApp re-renders → shows dashboard
      } else if (view === VIEWS.SIGN_UP) {
        await signUp(email, password, fullName);
        setMessage('Check your email for a verification link.');
      } else if (view === VIEWS.FORGOT) {
        await resetPassword(email);
        setView(VIEWS.SENT);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-900">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-white transition"
        >
          <ArrowLeft size={15} /> Home
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">SS</span>
          </div>
          <span className="font-black text-white text-sm">StatStream</span>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* ── Email sent state ── */}
          {view === VIEWS.SENT ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-950 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">📬</span>
              </div>
              <h2 className="text-xl font-black text-white mb-2">Check your email</h2>
              <p className="text-sm text-gray-500 mb-6">
                We sent a reset link to <span className="text-blue-400 font-bold">{email}</span>
              </p>
              <button
                onClick={() => goTo(VIEWS.SIGN_IN)}
                className="text-sm font-bold text-blue-500 hover:text-blue-400 transition"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/40">
                  <span className="text-3xl">🏀</span>
                </div>
                <h1 className="text-2xl font-black text-white mb-1">
                  {view === VIEWS.SIGN_IN  && 'Welcome back'}
                  {view === VIEWS.SIGN_UP  && 'Create account'}
                  {view === VIEWS.FORGOT   && 'Reset password'}
                </h1>
                <p className="text-sm text-gray-500">
                  {view === VIEWS.SIGN_IN  && 'Sign in to your dashboard'}
                  {view === VIEWS.SIGN_UP  && 'Start tracking stats today'}
                  {view === VIEWS.FORGOT   && "We'll send you a reset link"}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
                  <span className="flex-shrink-0 mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Success */}
              {message && (
                <div className="flex items-start gap-2.5 bg-emerald-950 border border-emerald-800 text-emerald-400 px-4 py-3 rounded-xl mb-5 text-sm">
                  <span className="flex-shrink-0 mt-0.5">✓</span>
                  <span>{message}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Full name — sign up only */}
                {view === VIEWS.SIGN_UP && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className={inputCls}
                      placeholder="Your name"
                      required
                      autoFocus
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="you@example.com"
                    required
                    autoFocus={view !== VIEWS.SIGN_UP}
                  />
                </div>

                {/* Password — not on forgot */}
                {view !== VIEWS.FORGOT && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Password
                      </label>
                      {view === VIEWS.SIGN_IN && (
                        <button
                          type="button"
                          onClick={() => goTo(VIEWS.FORGOT)}
                          className="text-[11px] text-blue-500 hover:text-blue-400 font-bold transition"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={`${inputCls} pr-12`}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {view === VIEWS.SIGN_UP && (
                      <p className="text-[11px] text-gray-600 mt-1.5">Minimum 6 characters</p>
                    )}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-sm transition active:scale-95 shadow-lg shadow-blue-900/30 mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Please wait...
                    </span>
                  ) : (
                    <>
                      {view === VIEWS.SIGN_IN  && 'Sign In'}
                      {view === VIEWS.SIGN_UP  && 'Create Account'}
                      {view === VIEWS.FORGOT   && 'Send Reset Link'}
                    </>
                  )}
                </button>
              </form>

              {/* Toggle sign in / sign up */}
              {view !== VIEWS.FORGOT && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    {view === VIEWS.SIGN_IN ? "Don't have an account? " : 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => goTo(view === VIEWS.SIGN_IN ? VIEWS.SIGN_UP : VIEWS.SIGN_IN)}
                      className="text-blue-500 hover:text-blue-400 font-bold transition"
                    >
                      {view === VIEWS.SIGN_IN ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>
              )}

              {view === VIEWS.FORGOT && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => goTo(VIEWS.SIGN_IN)}
                    className="text-sm font-bold text-gray-600 hover:text-white transition"
                  >
                    ← Back to sign in
                  </button>
                </div>
              )}

              {/* Footer */}
              {view === VIEWS.SIGN_UP && (
                <div className="mt-8 pt-6 border-t border-gray-900 text-center space-y-1.5">
                  <p className="text-xs text-gray-600">✦ Free · Unlimited teams · No credit card</p>
                  <p className="text-xs text-gray-700">Your data is encrypted and secure</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}