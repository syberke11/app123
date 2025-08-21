import type { Database } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
   role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const getProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getProfile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await getProfile(user.id);
      setProfile(profileData);
      console.log('Profile refreshed:', profileData);
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.removeItem('supabase.auth.token');
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        // Clear any corrupted session data first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          await clearAuthData();
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          setUser(session.user);
          const profileData = await getProfile(session.user.id);
          setProfile(profileData);
        } else {
          // Clear any stale data
          await clearAuthData();
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        await clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (!session) {
            await clearAuthData();
          }
        }
        
        if (session?.user) {
          setUser(session.user);
          const profileData = await getProfile(session.user.id);
          setProfile(profileData);
        } else {
          setUser(null);
          setProfile(null);
          await clearAuthData();
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Terjadi kesalahan saat login' };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }
console.log('Insert function called');
      if (data.user) {
        // Create user profile
        console.log('Insert function called');
        const { error: profileError } = await supabase
  .from('users')
  .insert([{
    id: data.user.id,
    email,
    name,
    role: role as any,
    type: 'normal',
  }]);
console.log('DEBUG signup:', { email, password, name, role });

        if (profileError) {
          console.error('Insert user failed:', profileError);
          
          return { error: 'Gagal membuat profil pengguna' };
        }
console.log('DEBUG signup:', { email, password, name, role });

        // Initialize points for siswa
        if (role === 'siswa') {
          await supabase
            .from('siswa_poin')
            .insert([{
              siswa_id: data.user.id,
              total_poin: 0,
              poin_hafalan: 0,
              poin_quiz: 0,
            }]);
        }
      }

      return {};
    } catch (error) {
      return { error: 'Terjadi kesalahan saat mendaftar' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await clearAuthData();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      // Force clear even if signOut fails
      await clearAuthData();
      setUser(null);
      setProfile(null);
    }
  };

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
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