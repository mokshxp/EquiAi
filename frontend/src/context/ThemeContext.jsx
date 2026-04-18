import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Read from localStorage on first load
    try { return localStorage.getItem('equiai-theme') === 'dark'; }
    catch { return false; }
  });

  useEffect(() => {
    // Apply data-theme to <html> so CSS variables cascade everywhere
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    // Persist preference
    try { localStorage.setItem('equiai-theme', isDark ? 'dark' : 'light'); }
    catch {}
  }, [isDark]);

  const toggle = () => setIsDark(p => !p);

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
