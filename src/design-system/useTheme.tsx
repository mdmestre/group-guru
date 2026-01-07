/**
 * useTheme - Hook for theme management
 * 
 * Provides light/dark mode switching and theme context
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { lightMode, darkMode, colors, theme } from './theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  colors: typeof colors;
  theme: typeof theme;
  currentTheme: typeof lightMode | typeof darkMode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Check localStorage or system preference
    const stored = localStorage.getItem('theme-mode');
    if (stored) return stored as ThemeMode;

    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    // Update DOM
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.classList.toggle('dark', mode === 'dark');
    
    // Update localStorage
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  const currentTheme = mode === 'light' ? lightMode : darkMode;

  const value: ThemeContextType = {
    mode,
    toggleTheme,
    colors,
    theme,
    currentTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default useTheme;
