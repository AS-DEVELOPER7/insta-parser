'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
});

export const THEMES = [
  { id: 'dark', name: 'Dark', description: 'Sleek dark theme' },
  { id: 'light', name: 'Light', description: 'Clean light theme' },
  { id: 'system', name: 'System', description: 'Sync with device preferences' },
];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');

  const applyTheme = (targetTheme) => {
    const root = document.documentElement;
    let isDark = targetTheme === 'dark';

    if (targetTheme === 'system') {
      isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('instavault_theme') || 'dark';
    setThemeState(saved);
    applyTheme(saved);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const current = localStorage.getItem('instavault_theme') || 'dark';
      if (current === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('instavault_theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
