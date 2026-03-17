
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const fetchTheme = async () => {
      const { data } = await supabase.from('m4_settings').select('theme').maybeSingle();
      if (data?.theme) {
        setThemeState(data.theme as Theme);
      }
    };
    fetchTheme();
  }, []);

  useEffect(() => {
    const applyTheme = (currentTheme: Theme) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      
      let effectiveTheme: 'light' | 'dark';
      
      if (currentTheme === 'light') {
        effectiveTheme = 'light';
      } else if (currentTheme === 'dark') {
        effectiveTheme = 'dark';
      } else {
        // currentTheme === 'system'
        const prefersDark = window.matchMedia && 
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
      }
      
      root.classList.add(effectiveTheme);
      console.log(`[Theme] Applied ${effectiveTheme} (Source: ${currentTheme})`);
    };

    applyTheme(theme);

    // If system theme is selected, listen for changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    // Persist to Supabase
    try {
      // Get settings first to ensure we have the right record
      const { data: settings } = await supabase.from('m4_settings').select('id').maybeSingle();
      if (settings) {
        await supabase.from('m4_settings').update({ theme: newTheme }).eq('id', settings.id);
      }
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
