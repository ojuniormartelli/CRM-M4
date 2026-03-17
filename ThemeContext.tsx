
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme, skipPersistence?: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initial state from localStorage if available
    const saved = localStorage.getItem('m4_theme');
    return (saved as Theme) || 'system';
  });

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const { data, error } = await supabase.from('m4_settings').select('theme').maybeSingle();
        if (error) {
          console.error('Error fetching theme from Supabase:', error);
          return;
        }
        if (data?.theme) {
          setThemeState(data.theme as Theme);
          localStorage.setItem('m4_theme', data.theme);
        }
      } catch (err) {
        console.error('Unexpected error fetching theme:', err);
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
      // Force style recalculation to ensure theme is applied correctly
      root.style.colorScheme = effectiveTheme;
      console.log(`[Theme] Applied ${effectiveTheme} (Source: ${currentTheme})`);
      
      // Also save to localStorage for faster initial load
      localStorage.setItem('m4_theme', currentTheme);
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

  const setTheme = async (newTheme: Theme, skipPersistence: boolean = false) => {
    setThemeState(newTheme);
    localStorage.setItem('m4_theme', newTheme);
    
    if (skipPersistence) return;

    // Persist to Supabase
    try {
      // Get settings first to ensure we have the right record
      const { data: settings, error: fetchError } = await supabase.from('m4_settings').select('id').maybeSingle();
      if (fetchError) throw fetchError;

      if (settings) {
        const { error: updateError } = await supabase.from('m4_settings').update({ theme: newTheme }).eq('id', settings.id);
        if (updateError) throw updateError;
      } else {
        // If no settings exist yet, create one
        const { error: insertError } = await supabase.from('m4_settings').insert({ 
          theme: newTheme,
          tenant_id: 'default-tenant'
        });
        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('Failed to save theme to Supabase:', err);
      // We don't alert here because it might be called in background, 
      // but the localStorage fallback already handles the immediate UI state.
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
