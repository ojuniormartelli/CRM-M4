
import { supabase } from '../lib/supabase';
import { isUUID } from '../lib/mappers';
import { 
  FinanceTransaction, 
  FinanceCategory, 
  FinanceBankAccount, 
  FinanceCostCenter,
  FinanceTransactionType,
  FinanceTransactionStatus
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

  // Ensure we have a string for the error message
  let errorMessage = 'Erro desconhecido';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    errorMessage = (error as any).message || (error as any).details || (error as any).error_description || JSON.stringify(error);
  } else if (error) {
    errorMessage = String(error);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
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
  
  // Create a clean error object that won't cause TypeErrors when accessed
  const finalError = new Error(errorMessage);
  (finalError as any).details = errInfo;
  (finalError as any).errorMessage = errorMessage; // Add this for compatibility with whatever is looking for it
  
  throw finalError;
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
          category:category_id(*),
          bank_account:bank_account_id(*),
          counterparty:counterparty_id(*),
          cost_center:cost_center_id(*)
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
      
      return (data || []).map(acc => ({
        ...acc,
        balance: Number(acc.balance) || 0,
        current_balance: Number(acc.balance) || 0
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_fin_bank_accounts');
      return [];
    }
  },

  // --- Client Accounts (Recurring Charges) ---
  async getClientAccounts(workspaceId: string): Promise<any[]> {
    if (!workspaceId || !isUUID(workspaceId)) {
      console.error('financeService.getClientAccounts: Missing or invalid workspaceId', workspaceId);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('m4_client_accounts')
        .select('*, company:m4_companies(name)')
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_client_accounts');
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
    console.log('financeService.deleteBankAccount: Deleting account with id:', id);
    try {
      const { error } = await supabase
        .from('m4_fin_bank_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('financeService.deleteBankAccount: Error deleting:', error);
        throw error;
      }
      console.log('financeService.deleteBankAccount: Success');
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
        .order('order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        // Fallback if 'order' column doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('m4_fin_categories')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('name', { ascending: true });
        
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
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
        .order('order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        // Fallback if 'order' column doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('m4_fin_cost_centers')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('name', { ascending: true });
        
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_fin_cost_centers');
      return [];
    }
  },

  async getCompanies(workspaceId: string): Promise<any[]> {
    if (!workspaceId || !isUUID(workspaceId)) {
      console.error('financeService.getCompanies: Missing or invalid workspaceId', workspaceId);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('m4_companies')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_companies');
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
        .select('balance')
        .eq('id', data.bank_account_id)
        .single();

      if (accError) throw accError;

      const newBalance = transaction.type === 'income' 
        ? Number(account.balance) + amount 
        : Number(account.balance) - amount;

      const { error: balanceError } = await supabase
        .from('m4_fin_bank_accounts')
        .update({ balance: newBalance })
        .eq('id', data.bank_account_id);

      if (balanceError) throw balanceError;

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_fin_transactions');
      throw error;
    }
  },

  async createTransfer(data: {
    workspace_id: string;
    description: string;
    amount: number;
    issue_date: string;
    due_date: string;
    paid_at?: string;
    source_bank_account_id: string;
    destination_bank_account_id: string;
    status: FinanceTransactionStatus | string;
    created_by: string;
  }): Promise<void> {
    try {
      // 1. Create Outflow (Transfer Exit)
      const outflow: Partial<FinanceTransaction> = {
        workspace_id: data.workspace_id,
        type: FinanceTransactionType.TRANSFER,
        status: data.status,
        description: `[TRANSFERÊNCIA] ${data.description}`,
        amount: data.amount,
        issue_date: data.issue_date,
        due_date: data.due_date,
        paid_at: data.paid_at,
        competence_date: data.issue_date,
        bank_account_id: data.source_bank_account_id,
        destination_bank_account_id: data.destination_bank_account_id,
        created_by: data.created_by,
        updated_by: data.created_by
      };

      const { data: outflowResult, error: outflowError } = await supabase
        .from('m4_fin_transactions')
        .insert([outflow])
        .select()
        .single();

      if (outflowError) throw outflowError;

      // 2. Create Inflow (Transfer Entry)
      const inflow: Partial<FinanceTransaction> = {
        workspace_id: data.workspace_id,
        type: FinanceTransactionType.TRANSFER,
        status: data.status,
        description: `[TRANSFERÊNCIA] ${data.description}`,
        amount: data.amount,
        issue_date: data.issue_date,
        due_date: data.due_date,
        paid_at: data.paid_at,
        competence_date: data.issue_date,
        bank_account_id: data.destination_bank_account_id,
        parent_transaction_id: outflowResult.id, // Link to the outflow
        created_by: data.created_by,
        updated_by: data.created_by
      };

      const { error: inflowError } = await supabase
        .from('m4_fin_transactions')
        .insert([inflow]);

      if (inflowError) throw inflowError;

      // 3. Update balances if status is PAID
      if (data.status === FinanceTransactionStatus.PAID) {
        // Source Account
        const { data: sourceAcc, error: sourceAccError } = await supabase
          .from('m4_fin_bank_accounts')
          .select('balance')
          .eq('id', data.source_bank_account_id)
          .single();
        
        if (sourceAccError) throw sourceAccError;

        await supabase
          .from('m4_fin_bank_accounts')
          .update({ balance: Number(sourceAcc.balance) - data.amount })
          .eq('id', data.source_bank_account_id);

        // Destination Account
        const { data: destAcc, error: destAccError } = await supabase
          .from('m4_fin_bank_accounts')
          .select('balance')
          .eq('id', data.destination_bank_account_id)
          .single();
        
        if (destAccError) throw destAccError;

        await supabase
          .from('m4_fin_bank_accounts')
          .update({ balance: Number(destAcc.balance) + data.amount })
          .eq('id', data.destination_bank_account_id);
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_fin_transactions');
      throw error;
    }
  }
};
