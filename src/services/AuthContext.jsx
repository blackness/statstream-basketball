import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { supabase } from '@/supabase';

const isSupabaseConfigured = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(supabaseUrl && supabaseKey);
};

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user,               setUser]               = useState(null);
  const [session,            setSession]            = useState(null);
  const [loading,            setLoading]            = useState(true);
  const [isCloudMode,        setIsCloudMode]        = useState(false);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  useEffect(() => {
    const cloudMode = isSupabaseConfigured();
    console.log('🔍 Supabase Config Check:');
    console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    console.log('Cloud Mode:', cloudMode);
    setIsCloudMode(cloudMode);

    if (!cloudMode) {
      console.warn('⚠️ Running in LOCAL MODE - Supabase not configured');
      setLoading(false);
      return;
    }

    // Handle token in URL hash (password reset links)
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const access_token  = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type          = params.get('type');
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(() => {
          window.history.replaceState(null, '', window.location.pathname);
          if (type === 'recovery') setNeedsPasswordReset(true);
        });
      }
    }

    // Get initial session
    authService.getSession().then((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: authListener } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (event === 'PASSWORD_RECOVERY') {
          setNeedsPasswordReset(true);
        }
      }
    );

    return () => { authListener?.subscription.unsubscribe(); };
  }, []);

  const signUp = async (email, password, fullName) => authService.signUp(email, password, fullName);
  const signIn = async (email, password) => authService.signIn(email, password);
  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setNeedsPasswordReset(false);
    return { error };
  };

  const value = {
    user, session, loading, isCloudMode,
    needsPasswordReset, setNeedsPasswordReset,
    signUp, signIn, signOut, updatePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
