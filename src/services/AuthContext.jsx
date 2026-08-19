import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '../services/auth';
import { supabase } from '../../supabase';

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
  const [user,        setUser]        = useState(null);
  const [session,     setSession]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [isCloudMode, setIsCloudMode] = useState(false);

  // ✅ useRef at top level — NOT inside useEffect
  const lastAuthEvent = useRef(null);

  useEffect(() => {
    const cloudMode = isSupabaseConfigured();
    setIsCloudMode(cloudMode);

    if (!cloudMode) {
      console.warn('⚠️ Running in LOCAL MODE - Supabase not configured');
      setLoading(false);
      return;
    }

    // Get initial session
    authService.getSession().then((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // ✅ Capture the return value so we can unsubscribe
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);

      // Skip duplicate SIGNED_IN for same session
      if (event === 'SIGNED_IN' && lastAuthEvent.current === 'SIGNED_IN') return;
      lastAuthEvent.current = event;

      setSession(session);
      setUser(session?.user ?? null);
    });

    // ✅ Cleanup now works because authListener is defined
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, fullName) => {
    return await authService.signUp(email, password, fullName);
  };

  const signIn = async (email, password) => {
    return await authService.signIn(email, password);
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/app`,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
  };

  const value = {
    user,
    session,
    loading,
    isCloudMode,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;