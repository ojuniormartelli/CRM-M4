
import { useState, useEffect } from 'react';
import { financeBudgetService } from '../services/financeBudgetService';
import { FinanceBudget, FinanceBudgetScenario } from '../types/finance';

export const useFinanceBudget = (workspaceId: string, period?: string, scenario: FinanceBudgetScenario = 'realistic') => {
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBudgets = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const data = await financeBudgetService.getBudgets(workspaceId, { period, scenario });
      setBudgets(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading budgets:', err);
      setError('Erro ao carregar orçamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [workspaceId, period, scenario]);

  const saveBudget = async (budget: Partial<FinanceBudget>) => {
    try {
      const saved = await financeBudgetService.saveBudget({ ...budget, workspace_id: workspaceId });
      setBudgets(prev => {
        const index = prev.findIndex(b => b.id === saved.id);
        if (index >= 0) {
          const newBudgets = [...prev];
          newBudgets[index] = saved;
          return newBudgets;
        }
        return [...prev, saved];
      });
      return saved;
    } catch (err) {
      console.error('Error saving budget:', err);
      throw err;
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await financeBudgetService.deleteBudget(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting budget:', err);
      throw err;
    }
  };

  return {
    budgets,
    loading,
    error,
    saveBudget,
    deleteBudget,
    refresh: loadBudgets
  };
};
