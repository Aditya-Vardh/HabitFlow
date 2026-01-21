import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  // returns a URL string if Supabase returns one (for manual redirect), otherwise performs redirect itself
  signInWithGoogle: () => Promise<string | void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let hasResponded = false;

    // Set a timeout to handle cases where Supabase is not configured
    timeoutId = setTimeout(() => {
      if (isMounted && !hasResponded) {
        console.warn('Auth session check timed out - Supabase may not be configured');
        setLoading(false);
        hasResponded = true;
      }
    }, 5000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
        hasResponded = true;
        clearTimeout(timeoutId);
      }
    }).catch((error) => {
      console.warn('Error getting session:', error);
      if (isMounted) {
        setLoading(false);
        hasResponded = true;
        clearTimeout(timeoutId);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
        hasResponded = true;
        clearTimeout(timeoutId);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Update user state immediately
      setUser(data.user);
      setLoading(false);

      // Create profile
      type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
      const profileData: ProfileInsert = {
        id: data.user.id,
        email: data.user.email!,
        full_name: fullName,
        username: email.split('@')[0],
        // ensure history starts now for existing/new signups
        history_started_at: new Date().toISOString(),
      };
      const { error: profileError } = await supabase
        .from('profiles')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(profileData as any);

      if (profileError) throw profileError;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    // Update user state immediately
    if (data.user) {
      setUser(data.user);
      setLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    // Prefer an explicit site URL configured in VITE_SITE_URL; fall back to the app origin.
    const redirectTo = (import.meta.env.VITE_SITE_URL as string) || window.location.origin;
    if (!redirectTo) {
      throw new Error('Missing redirect target; set VITE_SITE_URL or run the app from a logical origin.');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
          include_granted_scopes: 'true',
        },
      },
    });

    if (error) {
      // Provide a clearer actionable error when provider is not enabled
      const msg = (error as any)?.message || '';
      if (/unsupported provider/i.test(msg) || /provider is not enabled/i.test(msg)) {
        throw new Error('Google provider is not enabled in Supabase. Enable it under Authentication → Providers and configure Google OAuth credentials and redirect URI.');
      }
      throw error;
    }

    const redirectUrl: string | undefined = (data as any)?.url;
    return redirectUrl;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
