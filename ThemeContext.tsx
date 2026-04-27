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
    const saved = localStorage.getItem('m4_theme');
    return (saved as Theme) || 'system';
  });

  // Busca tema do Supabase filtrando pelo workspace correto via RLS
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('m4_settings')
          .select('theme')
          .maybeSingle();
        if (error) return;
        if (data?.theme) {
          setThemeState(data.theme as Theme);
          localStorage.setItem('m4_theme', data.theme);
        }
      } catch {
        // silencioso: usa localStorage como fallback
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
        const prefersDark =
          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
      }
      root.classList.add(effectiveTheme);
      root.style.colorScheme = effectiveTheme;
      localStorage.setItem('m4_theme', currentTheme);
    };

    applyTheme(theme);

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
    try {
      const { data: settings, error: fetchError } = await supabase
        .from('m4_settings')
        .select('id')
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (settings) {
        await supabase
          .from('m4_settings')
          .update({ theme: newTheme })
          .eq('id', settings.id);
      } else {
        // Cria configuracao com workspace_id via RLS (nao usa tenant_id fixo)
        await supabase.from('m4_settings').insert({ theme: newTheme });
      }
    } catch {
      // silencioso: localStorage ja preserva o estado local
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
