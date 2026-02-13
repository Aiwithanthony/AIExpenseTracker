import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { signInWithApple } from '../services/oauth';

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  currency: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phoneNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
  appleLogin: () => Promise<void>;
  setUserAfterOAuth: (userData: User) => void;
  updateUser: (data: { name?: string; currency?: string }) => Promise<void>;
  // Note: googleLogin is now handled via useGoogleAuth hook in components
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// DEV MODE: Bypass authentication - Set to false to re-enable auth
const DEV_MODE = false; // Temporarily disabled to test Google Sign-In

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(
    DEV_MODE ? { id: 'dev-user', email: 'dev@test.com', name: 'Dev User', subscriptionTier: 'FREE', currency: 'USD' } : null
  );
  const [loading, setLoading] = useState(!DEV_MODE);

  useEffect(() => {
    if (DEV_MODE) {
      // Set a fake token for dev mode
      AsyncStorage.setItem('auth_token', 'dev-token');
      setLoading(false);
    } else {
      loadUser();
    }
  }, []);

  async function loadUser() {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        // Verify token by fetching current user
        try {
          const currentUser = await api.getCurrentUser() as User;
          setUser(currentUser);
        } catch (apiError) {
          // Token invalid, expired, or backend not available - clear storage
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user');
        }
      }
    } catch (error) {
      // Error reading storage - just clear it
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
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

  async function updateUser(data: { name?: string; currency?: string }) {
    const updated = await api.updateProfile(data);
    setUser((prev) => prev ? { ...prev, ...data } : prev);
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

