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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phoneNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
  appleLogin: () => Promise<void>;
  setUserAfterOAuth: (userData: User) => void;
  updateUser: (data: { name?: string; currency?: string; whatsappNumber?: string }) => Promise<void>;
  // Note: googleLogin is now handled via useGoogleAuth hook in components
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function register(email: string, password: string, name: string, phoneNumber?: string) {
    const response = await api.register(email, password, name, phoneNumber);
    setUser(response.user);
  }

  async function logout() {
    await api.logout();
    clearScreenCache();
    setUser(null);
  }

  async function appleLogin() {
    const response = await signInWithApple();
    setUser(response.user);
  }

  // Helper function to set user after OAuth login (called from components)
  function setUserAfterOAuth(userData: User) {
    setUser(userData);
  }

  async function updateUser(data: { name?: string; currency?: string; whatsappNumber?: string }) {
    await api.updateProfile(data);
    setUser((prev) => (prev ? { ...prev, ...data } : prev));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, appleLogin, setUserAfterOAuth, updateUser }}>
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
