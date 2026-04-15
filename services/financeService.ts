
import { supabase } from '../lib/supabase';
import { isUUID } from '../lib/mappers';
import { 
  FinanceTransaction, 
  FinanceCategory, 
  FinanceBankAccount, 
  FinanceCounterparty, 
  FinanceCostCenter 
} from '../types/finance';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const workspaceId = localStorage.getItem('m4_crm_workspace_id');
  const userId = localStorage.getItem('m4_crm_user_id');

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userId || 'unknown',
      workspaceId,
      isWorkspaceIdValid: workspaceId ? isUUID(workspaceId) : false
    },
    operationType,
    path
  };
  
  if (workspaceId && !isUUID(workspaceId)) {
    console.warn(`CRITICAL: workspaceId "${workspaceId}" is NOT a valid UUID. This will cause Supabase errors.`);
  }

  if (!workspaceId) {
    console.warn(`CRITICAL: workspaceId is MISSING. This will cause Supabase errors.`);
  }

  console.error('Finance Service Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const financeService = {
  // --- Transactions ---
  async getTransactions(workspaceId: string, filters?: any): Promise<FinanceTransaction[]> {
    if (!workspaceId || !isUUID(workspaceId)) {
      console.error('financeService.getTransactions: Missing or invalid workspaceId', workspaceId);
      return [];
    }

    try {
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
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_fin_transactions');
      return [];
    }
  },

  async createTransaction(transaction: Partial<FinanceTransaction>): Promise<FinanceTransaction> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_fin_transactions');
      throw error;
    }
  },

  async updateTransaction(id: string, transaction: Partial<FinanceTransaction>): Promise<FinanceTransaction> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_transactions')
        .update(transaction)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_fin_transactions');
      throw error;
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('m4_fin_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_fin_transactions');
    }
  },

  // --- Bank Accounts ---
  async getBankAccounts(workspaceId: string): Promise<FinanceBankAccount[]> {
    if (!workspaceId || !isUUID(workspaceId)) {
      console.error('financeService.getBankAccounts: Missing or invalid workspaceId', workspaceId);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('m4_fin_bank_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_fin_bank_accounts');
      return [];
    }
  },

  async createBankAccount(account: Partial<FinanceBankAccount>): Promise<FinanceBankAccount> {
    const config = (supabase as any).supabaseUrl;
    console.log('financeService.createBankAccount: Target URL:', config);
    console.log('financeService.createBankAccount: Payload:', account);
    try {
      const { data, error } = await supabase
        .from('m4_fin_bank_accounts')
        .insert([account])
        .select()
        .single();

      if (error) {
        console.error('financeService.createBankAccount: Supabase Error:', error);
        throw error;
      }
      
      console.log('financeService.createBankAccount: Success:', data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_fin_bank_accounts');
      throw error;
    }
  },

  async updateBankAccount(id: string, account: Partial<FinanceBankAccount>): Promise<FinanceBankAccount> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_bank_accounts')
        .update(account)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_fin_bank_accounts');
      throw error;
    }
  },

  async deleteBankAccount(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('m4_fin_bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_fin_bank_accounts');
    }
  },

  // --- Categories ---
  async getCategories(workspaceId: string): Promise<FinanceCategory[]> {
    if (!workspaceId || !isUUID(workspaceId)) {
      console.error('financeService.getCategories: Missing or invalid workspaceId', workspaceId);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('m4_fin_categories')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_fin_categories');
      return [];
    }
  },

  async createCategory(category: Partial<FinanceCategory>): Promise<FinanceCategory> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_fin_categories');
      throw error;
    }
  },

  async updateCategory(id: string, category: Partial<FinanceCategory>): Promise<FinanceCategory> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_fin_categories');
      throw error;
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('m4_fin_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_fin_categories');
    }
  },

  // --- Cost Centers ---
  async getCostCenters(workspaceId: string): Promise<FinanceCostCenter[]> {
    if (!workspaceId || !isUUID(workspaceId)) {
      console.error('financeService.getCostCenters: Missing or invalid workspaceId', workspaceId);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('m4_fin_cost_centers')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_fin_cost_centers');
      return [];
    }
  },

  async createCostCenter(costCenter: Partial<FinanceCostCenter>): Promise<FinanceCostCenter> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_cost_centers')
        .insert([costCenter])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_fin_cost_centers');
      throw error;
    }
  },

  async updateCostCenter(id: string, costCenter: Partial<FinanceCostCenter>): Promise<FinanceCostCenter> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_cost_centers')
        .update(costCenter)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_fin_cost_centers');
      throw error;
    }
  },

  async deleteCostCenter(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('m4_fin_cost_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_fin_cost_centers');
    }
  },

  // --- Counterparties ---
  async getCounterparties(workspaceId: string): Promise<FinanceCounterparty[]> {
    if (!workspaceId || !isUUID(workspaceId)) {
      console.error('financeService.getCounterparties: Missing or invalid workspaceId', workspaceId);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('m4_fin_counterparties')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_fin_counterparties');
      return [];
    }
  },

  async createCounterparty(counterparty: Partial<FinanceCounterparty>): Promise<FinanceCounterparty> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_counterparties')
        .insert([counterparty])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_fin_counterparties');
      throw error;
    }
  },

  async updateCounterparty(id: string, counterparty: Partial<FinanceCounterparty>): Promise<FinanceCounterparty> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_counterparties')
        .update(counterparty)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_fin_counterparties');
      throw error;
    }
  },

  async deleteCounterparty(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('m4_fin_counterparties')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_fin_counterparties');
    }
  },

  // --- Payment Methods ---
  async getPaymentMethods(workspaceId: string): Promise<any[]> {
    if (!workspaceId || !isUUID(workspaceId)) {
      console.error('financeService.getPaymentMethods: Missing or invalid workspaceId', workspaceId);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('m4_fin_payment_methods')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_fin_payment_methods');
      return [];
    }
  },

  async createPaymentMethod(method: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_payment_methods')
        .insert([method])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_fin_payment_methods');
      throw error;
    }
  },

  async updatePaymentMethod(id: string, method: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('m4_fin_payment_methods')
        .update(method)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_fin_payment_methods');
      throw error;
    }
  },

  async deletePaymentMethod(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('m4_fin_payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_fin_payment_methods');
    }
  },

  async confirmPayment(id: string, data: { paid_at: string, bank_account_id: string }): Promise<void> {
    try {
      // 1. Get the transaction to know the amount and type
      const { data: transaction, error: fetchError } = await supabase
        .from('m4_fin_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!transaction) throw new Error('Transação não encontrada');

      // 2. Update the transaction status
      const { error: updateError } = await supabase
        .from('m4_fin_transactions')
        .update({
          status: 'paid',
          paid_at: data.paid_at,
          bank_account_id: data.bank_account_id
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // 3. Update the bank account balance
      const amount = Number(transaction.amount);
      const { data: account, error: accError } = await supabase
        .from('m4_fin_bank_accounts')
        .select('current_balance')
        .eq('id', data.bank_account_id)
        .single();

      if (accError) throw accError;

      const newBalance = transaction.type === 'income' 
        ? Number(account.current_balance) + amount 
        : Number(account.current_balance) - amount;

      const { error: balanceError } = await supabase
        .from('m4_fin_bank_accounts')
        .update({ current_balance: newBalance })
        .eq('id', data.bank_account_id);

      if (balanceError) throw balanceError;

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_fin_transactions');
      throw error;
    }
  }
};
