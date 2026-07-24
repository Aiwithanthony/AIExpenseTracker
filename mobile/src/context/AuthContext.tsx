import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { signInWithApple } from '../services/oauth';
import { clearScreenCache } from '../hooks/useCachedFetch';

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  currency: string;
  whatsappNumber?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** True right after account creation until the profile step (name +
   *  currency) is completed — the navigator shows SetupProfile instead of
   *  the main app while set. Persisted so a mid-setup app kill resumes it. */
  needsSetup: boolean;
  completeSetup: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, phoneNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
  appleLogin: () => Promise<void>;
  setUserAfterOAuth: (userData: User, isNewUser?: boolean) => void;
  updateUser: (data: { name?: string; currency?: string; whatsappNumber?: string }) => Promise<void>;
  // Note: googleLogin is now handled via useGoogleAuth hook in components
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SETUP_FLAG_KEY = 'needs_profile_setup';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  async function markNeedsSetup() {
    setNeedsSetup(true);
    await AsyncStorage.setItem(SETUP_FLAG_KEY, '1').catch(() => {});
  }

  async function completeSetup() {
    setNeedsSetup(false);
    await AsyncStorage.removeItem(SETUP_FLAG_KEY).catch(() => {});
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) {
        return;
      }

      // Show the cached user immediately so the app works offline / while the
      // network is briefly unavailable.
      const cachedUser = JSON.parse(userStr) as User;
      setUser(cachedUser);

      // Resume an interrupted profile-setup step (app killed mid-onboarding).
      const setupFlag = await AsyncStorage.getItem(SETUP_FLAG_KEY);
      if (setupFlag === '1') setNeedsSetup(true);

      // Then confirm the session in the background.
      try {
        const currentUser = (await api.getCurrentUser()) as User;
        setUser(currentUser);
        await AsyncStorage.setItem('user', JSON.stringify(currentUser));
      } catch (apiError: any) {
        // Only sign the user out on a genuine auth failure. On network errors
        // (server down, no connectivity) keep the cached session so a temporary
        // outage doesn't log the user out.
        const message: string = apiError?.message || '';
        const isAuthFailure = message.toLowerCase().includes('session expired');
        if (isAuthFailure) {
          await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user']);
          setUser(null);
        }
      }
    } catch {
      // Corrupt storage — clear it.
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user']);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await api.login(email, password);
    setUser(response.user);
  }

  async function register(email: string, password: string, name?: string, phoneNumber?: string) {
    const response = await api.register(email, password, name, phoneNumber);
    await markNeedsSetup();
    setUser(response.user);
  }

  async function logout() {
    await api.logout();
    clearScreenCache();
    await completeSetup();
    setUser(null);
  }

  async function appleLogin() {
    const response = await signInWithApple();
    if ((response as any)?.isNewUser) await markNeedsSetup();
    setUser(response.user);
  }

  // Helper function to set user after OAuth login (called from components)
  function setUserAfterOAuth(userData: User, isNewUser?: boolean) {
    if (isNewUser) markNeedsSetup().catch(() => {});
    setUser(userData);
  }

  async function updateUser(data: { name?: string; currency?: string; whatsappNumber?: string }) {
    await api.updateProfile(data);
    setUser((prev) => (prev ? { ...prev, ...data } : prev));
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, needsSetup, completeSetup, login, register, logout, appleLogin, setUserAfterOAuth, updateUser }}
    >
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
