
import { supabase } from '../lib/supabase';
import { FinanceBudget } from '../types/finance';

export const financeBudgetService = {
  async getBudgets(workspaceId: string, filters?: { period?: string, scenario?: string }) {
    let query = supabase
      .from('m4_fin_budgets')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (filters?.period) query = query.eq('period', filters.period);
    if (filters?.scenario) query = query.eq('scenario', filters.scenario);

    const { data, error } = await query;
    if (error) throw error;
    return data as FinanceBudget[];
  },

  async saveBudget(budget: Partial<FinanceBudget>) {
    const payload = {
      workspace_id: budget.workspace_id,
      category_id: budget.category_id,
      dre_group: budget.dre_group,
      cost_center_id: budget.cost_center_id,
      period: budget.period,
      amount: budget.amount,
      scenario: budget.scenario || 'realistic',
      updated_at: new Date().toISOString()
    };

    // Upsert logic: if we have an ID, update; otherwise, we might want to check if a budget already exists for this combo
    // For simplicity, let's assume the UI provides the ID if editing, or we insert new.
    if (budget.id) {
      const { data, error } = await supabase
        .from('m4_fin_budgets')
        .update(payload)
        .eq('id', budget.id)
        .select()
        .single();
      if (error) throw error;
      return data as FinanceBudget;
    } else {
      const { data, error } = await supabase
        .from('m4_fin_budgets')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as FinanceBudget;
    }
  },

  async deleteBudget(id: string) {
    const { error } = await supabase
      .from('m4_fin_budgets')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
