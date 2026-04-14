
import { supabase } from '../lib/supabase';
import { 
  FinanceTransaction, 
  FinanceCategory, 
  FinanceBankAccount, 
  FinanceCounterparty, 
  FinanceCostCenter 
} from '../types/finance';

export const financeService = {
  // Transactions
  async getTransactions(workspaceId: string, filters?: any) {
    let query = supabase
      .from('m4_fin_transactions')
      .select(`
        *,
        category:m4_fin_categories(*),
        bank_account:m4_fin_bank_accounts(*),
        counterparty:m4_fin_counterparties(*),
        cost_center:m4_fin_cost_centers(*)
      `)
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: false });

    if (filters?.startDate) query = query.gte('due_date', filters.startDate);
    if (filters?.endDate) query = query.lte('due_date', filters.endDate);
    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data as FinanceTransaction[];
  },

  async createTransaction(transaction: Partial<FinanceTransaction>) {
    // Whitelist sanitization
    const payload = {
      workspace_id: transaction.workspace_id,
      type: transaction.type,
      status: transaction.status,
      description: transaction.description,
      amount: transaction.amount,
      issue_date: transaction.issue_date,
      due_date: transaction.due_date,
      paid_at: transaction.paid_at,
      competence_date: transaction.competence_date,
      bank_account_id: transaction.bank_account_id,
      destination_bank_account_id: transaction.destination_bank_account_id,
      counterparty_id: transaction.counterparty_id,
      category_id: transaction.category_id,
      cost_center_id: transaction.cost_center_id,
      payment_method: transaction.payment_method,
      reference_code: transaction.reference_code,
      notes: transaction.notes,
      attachment_url: transaction.attachment_url,
      is_recurring: transaction.is_recurring || false,
      recurrence_group_id: transaction.recurrence_group_id,
      recurrence_frequency: transaction.recurrence_frequency,
      recurrence_interval: transaction.recurrence_interval,
      recurrence_end_date: transaction.recurrence_end_date,
      parent_transaction_id: transaction.parent_transaction_id,
      generation_mode: transaction.generation_mode || 'manual',
      created_by: transaction.created_by,
      updated_by: transaction.updated_by
    };

    const { data, error } = await supabase
      .from('m4_fin_transactions')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as FinanceTransaction;
  },

  async updateTransaction(id: string, transaction: Partial<FinanceTransaction>) {
    const { data, error } = await supabase
      .from('m4_fin_transactions')
      .update(transaction)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FinanceTransaction;
  },

  async deleteTransaction(id: string) {
    const { error } = await supabase
      .from('m4_fin_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async confirmPayment(id: string, data: { paid_at: string, bank_account_id: string }) {
    const { data: updated, error } = await supabase
      .from('m4_fin_transactions')
      .update({
        status: 'paid',
        paid_at: data.paid_at,
        bank_account_id: data.bank_account_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated as FinanceTransaction;
  },

  // Bank Accounts
  async getBankAccounts(workspaceId: string) {
    const { data, error } = await supabase
      .from('m4_fin_bank_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (error) throw error;
    return data as FinanceBankAccount[];
  },

  async createBankAccount(account: Partial<FinanceBankAccount>) {
    const payload = {
      workspace_id: account.workspace_id,
      name: account.name,
      bank: account.bank,
      type: account.type,
      initial_balance: account.initial_balance || 0,
      initial_balance_date: account.initial_balance_date || new Date().toISOString().split('T')[0],
      color: account.color,
      icon: account.icon,
      is_active: account.is_active !== false,
      currency: account.currency || 'BRL',
      current_balance: account.initial_balance || 0
    };

    const { data, error } = await supabase
      .from('m4_fin_bank_accounts')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as FinanceBankAccount;
  },

  async updateBankAccount(id: string, account: Partial<FinanceBankAccount>) {
    const { data, error } = await supabase
      .from('m4_fin_bank_accounts')
      .update(account)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FinanceBankAccount;
  },

  async deleteBankAccount(id: string) {
    const { error } = await supabase
      .from('m4_fin_bank_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Categories
  async getCategories(workspaceId: string) {
    const { data, error } = await supabase
      .from('m4_fin_categories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('order');

    if (error) throw error;
    return data as FinanceCategory[];
  },

  async createCategory(category: Partial<FinanceCategory>) {
    const payload = {
      workspace_id: category.workspace_id,
      name: category.name,
      type: category.type,
      parent_id: category.parent_id,
      level: category.level || 1,
      order: category.order || 0,
      is_active: category.is_active !== false,
      impacts_dre: category.impacts_dre !== false,
      dre_group: category.dre_group,
      classification_type: category.classification_type
    };

    const { data, error } = await supabase
      .from('m4_fin_categories')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as FinanceCategory;
  },

  async updateCategory(id: string, category: Partial<FinanceCategory>) {
    const { data, error } = await supabase
      .from('m4_fin_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FinanceCategory;
  },

  async deleteCategory(id: string) {
    const { error } = await supabase
      .from('m4_fin_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Counterparties
  async getCounterparties(workspaceId: string) {
    const { data, error } = await supabase
      .from('m4_fin_counterparties')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');

    if (error) throw error;
    return data as FinanceCounterparty[];
  },

  async createCounterparty(counterparty: Partial<FinanceCounterparty>) {
    const payload = {
      workspace_id: counterparty.workspace_id,
      name: counterparty.name,
      type: counterparty.type,
      document: counterparty.document,
      email: counterparty.email,
      phone: counterparty.phone,
      notes: counterparty.notes
    };

    const { data, error } = await supabase
      .from('m4_fin_counterparties')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as FinanceCounterparty;
  },

  async updateCounterparty(id: string, counterparty: Partial<FinanceCounterparty>) {
    const { data, error } = await supabase
      .from('m4_fin_counterparties')
      .update(counterparty)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FinanceCounterparty;
  },

  async deleteCounterparty(id: string) {
    const { error } = await supabase
      .from('m4_fin_counterparties')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Cost Centers
  async getCostCenters(workspaceId: string) {
    const { data, error } = await supabase
      .from('m4_fin_cost_centers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('order');

    if (error) throw error;
    return data as FinanceCostCenter[];
  },

  async createCostCenter(costCenter: Partial<FinanceCostCenter>) {
    const payload = {
      workspace_id: costCenter.workspace_id,
      name: costCenter.name,
      code: costCenter.code,
      description: costCenter.description,
      is_active: costCenter.is_active !== false,
      order: costCenter.order || 0
    };

    const { data, error } = await supabase
      .from('m4_fin_cost_centers')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as FinanceCostCenter;
  },

  async updateCostCenter(id: string, costCenter: Partial<FinanceCostCenter>) {
    const { data, error } = await supabase
      .from('m4_fin_cost_centers')
      .update(costCenter)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FinanceCostCenter;
  },

  async deleteCostCenter(id: string) {
    const { error } = await supabase
      .from('m4_fin_cost_centers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
