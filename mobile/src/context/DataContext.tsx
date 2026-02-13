import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  convertedAmount?: number;
  convertedCurrency?: string;
  merchant?: string;
  date: string;
  category?: {
    id: string;
    name: string;
  };
  type?: string;
}

interface DataContextType {
  expenses: Expense[];
  categories: any[];
  loading: boolean;
  refreshExpenses: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  getExpenseById: (id: string) => Expense | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshExpenses = React.useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data: any = await api.getExpenses({ limit: 100 });
      setExpenses((data?.expenses || []) as Expense[]);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshCategories = React.useCallback(async () => {
    if (!user) return;
    
    try {
      const cats = await api.getCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, [user]);

  // Preload data when user is logged in
  useEffect(() => {
    if (user) {
      // Preload in background (don't block UI)
      refreshExpenses();
      refreshCategories();
    } else {
      // Clear data when logged out
      setExpenses([]);
      setCategories([]);
    }
  }, [user, refreshExpenses, refreshCategories]);

  const getExpenseById = (id: string): Expense | undefined => {
    return expenses.find(exp => exp.id === id);
  };

  return (
    <DataContext.Provider
      value={{
        expenses,
        categories,
        loading,
        refreshExpenses,
        refreshCategories,
        getExpenseById,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

