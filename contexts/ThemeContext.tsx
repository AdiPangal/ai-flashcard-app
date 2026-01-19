import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  backgroundLighter: string;
  border: string;
  borderActive: string;
  
  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  
  // Brand
  brandPrimary: string;
  brandPrimaryPressed: string;
  brandPrimaryDark: string;
  
  // Status
  success: string;
  successBackground: string;
  error: string;
  errorBackground: string;
  
  // Special
  activeButton: string;
  disabledBackground: string;
  disabledText: string;
}

const darkTheme: ThemeColors = {
  // Backgrounds - keep current dark mode colors
  background: '#121212',
  backgroundSecondary: '#1e1e1e',
  backgroundTertiary: '#1a1a1a',
  backgroundLighter: '#2a2a2a',
  border: '#3a3a3a',
  borderActive: '#1374b9',
  
  // Text
  textPrimary: '#e0e0e0',
  textSecondary: '#6b6b6b',
  textTertiary: '#a0a0a0',
  
  // Brand
  brandPrimary: '#1374b9',
  brandPrimaryPressed: '#0d5a8a',
  brandPrimaryDark: '#1a2a3a',
  
  // Status
  success: '#4caf50',
  successBackground: '#1a3a1a',
  error: '#f44336',
  errorBackground: '#3a1a1a',
  
  // Special
  activeButton: '#464646',
  disabledBackground: '#1e1e1e',
  disabledText: '#6b6b6b',
};

const lightTheme: ThemeColors = {
  // Backgrounds - mapped from COLOR_PALETTE.md (reduced by 10 for each RGB component)
  background: '#f5f5f5', // #ffffff -> rgb(255,255,255) -> rgb(245,245,245)
  backgroundSecondary: '#ebebeb', // #f5f5f5 -> rgb(245,245,245) -> rgb(235,235,235)
  backgroundTertiary: '#f0f0f0', // #fafafa -> rgb(250,250,250) -> rgb(240,240,240)
  backgroundLighter: '#d6d6d6', // #e0e0e0 -> rgb(224,224,224) -> rgb(214,214,214)
  border: '#b3b3b3', // #bdbdbd -> rgb(189,189,189) -> rgb(179,179,179)
  borderActive: '#1374b9',
  
  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textTertiary: '#9e9e9e',
  
  // Brand - keep consistent
  brandPrimary: '#1374b9',
  brandPrimaryPressed: '#0d5a8a',
  brandPrimaryDark: '#B9CCDF',
  
  // Status - keep consistent, adjust backgrounds
  success: '#4caf50',
  successBackground: '#e8f5e9',
  error: '#f44336',
  errorBackground: '#ffebee',
  
  // Special
  activeButton: '#e0e0e0',
  disabledBackground: '#f5f5f5',
  disabledText: '#9e9e9e',
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { userId, db } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, [userId, db]);

  const loadThemePreference = async () => {
    if (!userId || !db) {
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const preferences = userData.preferences || {};
        const darkMode = preferences.darkMode !== undefined ? preferences.darkMode : true;
        setTheme(darkMode ? 'dark' : 'light');
      } else {
        // Default to dark mode if no preference exists
        setTheme('dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // Default to dark mode on error
      setTheme('dark');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);

    // Save to Firestore
    if (userId && db) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          'preferences.darkMode': newTheme === 'dark',
        });
      } catch (error) {
        console.error('Error saving theme preference:', error);
        // Revert on error
        setTheme(theme);
      }
    }
  };

  const colors = theme === 'dark' ? darkTheme : lightTheme;

  const value: ThemeContextType = {
    theme,
    colors,
    toggleTheme,
    loading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
