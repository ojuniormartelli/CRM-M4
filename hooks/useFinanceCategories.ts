import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from './useWorkspace';

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  is_active: boolean;
}

export function useFinanceCategories(type?: 'income' | 'expense') {
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      if (!workspaceId) return;

      try {
        const { data, error } = await supabase
          .from('m4_fin_categories')
          .select('id, name, type, is_active')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, [workspaceId]);

  useEffect(() => {
    if (!type) {
      setFilteredCategories(categories);
      return;
    }

    const filtered = categories.filter(cat => 
      cat.type === type || cat.type === 'both'
    );
    setFilteredCategories(filtered);
  }, [categories, type]);

  return { categories, filteredCategories, loading };
}
