import React, { useState } from 'react';
import { useAuth } from '../../services/AuthContext';

const ResetPassword = () => {
  const { updatePassword, signOut } = useAuth();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [saving,    setSaving]    = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="14" width="3" height="7" rx="1" fill="white"/>
              <rect x="8" y="11" width="3" height="10" rx="1" fill="white"/>
              <rect x="13" y="8" width="3" height="13" rx="1" fill="white"/>
              <rect x="18" y="5" width="3" height="16" rx="1" fill="white"/>
            </svg>
          </div>
          <span className="font-black text-xl text-gray-900">Stat<span className="text-blue-600">Stream</span></span>
        </div>

        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Password Updated</h2>
            <p className="text-sm text-gray-500 mb-6">Your password has been changed successfully.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition"
            >
              Continue to App
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-gray-900 mb-1 text-center">Set New Password</h2>
            <p className="text-sm text-gray-500 mb-6 text-center">Choose a strong password for your account</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="At least 6 characters"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Repeat your password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-bold transition text-base"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>

              <button
                onClick={signOut}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Cancel — sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
