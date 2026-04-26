
import { supabase } from '../lib/supabase';
import { mappers, isUUID } from '../lib/mappers';
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

  async createTransaction(data: Partial<FinanceTransaction>): Promise<FinanceTransaction> {
    try {
      const payload = mappers.transaction(data);
      
      const { data: result, error } = await supabase
        .from('m4_fin_transactions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Update balance if created as PAID
      if (result.status === 'paid' && result.bank_account_id) {
        const { data: account, error: accError } = await supabase
          .from('m4_fin_bank_accounts')
          .select('balance, current_balance')
          .eq('id', result.bank_account_id)
          .single();
        
        if (!accError && account) {
          const amount = Number(result.amount);
          const newBalance = result.type === 'income' 
            ? Number(account.balance) + amount
            : Number(account.balance) - amount;
          
          await supabase
            .from('m4_fin_bank_accounts')
            .update({ 
              balance: newBalance,
              current_balance: newBalance
            })
            .eq('id', result.bank_account_id);
        }
      }

      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_fin_transactions');
      throw error;
    }
  },

  async updateTransaction(id: string, data: Partial<FinanceTransaction>): Promise<FinanceTransaction> {
    try {
      // 1. Get existing transaction to check status and values BEFORE update
      const { data: existing, error: fetchError } = await supabase
        .from('m4_fin_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Transação não encontrada');

      const payload = mappers.transaction(data);

      // 2. Track changes for history
      const changes: string[] = [];
      const now = new Date().toLocaleString('pt-BR');
      
      if (data.description && data.description !== existing.description) 
        changes.push(`Descrição: "${existing.description}" -> "${data.description}"`);
      if (data.amount !== undefined && Number(data.amount) !== Number(existing.amount)) 
        changes.push(`Valor: ${existing.amount} -> ${data.amount}`);
      if (data.status && data.status !== existing.status) 
        changes.push(`Status: ${existing.status} -> ${data.status}`);
      if (data.bank_account_id && data.bank_account_id !== existing.bank_account_id) 
        changes.push(`Conta Bancária alterada`);
      if (data.due_date && data.due_date !== existing.due_date) 
        changes.push(`Vencimento: ${existing.due_date} -> ${data.due_date}`);
      
      if (changes.length > 0) {
        const historyEntry = `\n[${now}] Alterações:\n- ${changes.join('\n- ')}`;
        payload.edit_history = (existing.edit_history || '') + historyEntry;
      }

      // 3. Perform the update
      const { data: result, error: updateError } = await supabase
        .from('m4_fin_transactions')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 3. Handle Balance updates if needed
      // Logic: If status changed to PAID or if it was PAID and values (amount/bank/type) changed
      const wasPaid = existing.status === 'paid';
      const isPaid = result.status === 'paid';
      
      const amountChanged = Number(existing.amount) !== Number(result.amount);
      const accountChanged = existing.bank_account_id !== result.bank_account_id;
      const typeChanged = existing.type !== result.type;

      if (wasPaid || isPaid) {
        // Revert old effect if it was paid
        if (wasPaid && existing.bank_account_id) {
          const { data: oldAcc, error: oldAccError } = await supabase
            .from('m4_fin_bank_accounts')
            .select('balance, current_balance')
            .eq('id', existing.bank_account_id)
            .single();
          
          if (!oldAccError && oldAcc) {
            const oldAmount = Number(existing.amount);
            const revertedBalance = existing.type === 'income' 
              ? Number(oldAcc.balance) - oldAmount
              : Number(oldAcc.balance) + oldAmount;
            
            await supabase
              .from('m4_fin_bank_accounts')
              .update({ 
                balance: revertedBalance,
                current_balance: revertedBalance
              })
              .eq('id', existing.bank_account_id);
          }
        }

        // Apply new effect if it is now paid
        if (isPaid && result.bank_account_id) {
          const { data: newAcc, error: newAccError } = await supabase
            .from('m4_fin_bank_accounts')
            .select('balance, current_balance')
            .eq('id', result.bank_account_id)
            .single();
          
          if (!newAccError && newAcc) {
            const newAmount = Number(result.amount);
            const appliedBalance = result.type === 'income'
              ? Number(newAcc.balance) + newAmount
              : Number(newAcc.balance) - newAmount;
            
            await supabase
              .from('m4_fin_bank_accounts')
              .update({ 
                balance: appliedBalance,
                current_balance: appliedBalance
              })
              .eq('id', result.bank_account_id);
          }
        }
      }

      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_fin_transactions');
      throw error;
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    try {
      // 1. Get the transaction before deleting to check if it's paid
      const { data: transaction, error: fetchError } = await supabase
        .from('m4_fin_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (!fetchError && transaction && transaction.status === 'paid' && transaction.bank_account_id) {
        // Revert balance effect
        const { data: account, error: accError } = await supabase
          .from('m4_fin_bank_accounts')
          .select('balance, current_balance')
          .eq('id', transaction.bank_account_id)
          .single();
        
        if (!accError && account) {
          const amount = Number(transaction.amount);
          const revertedBalance = transaction.type === 'income' 
            ? Number(account.balance) - amount
            : Number(account.balance) + amount;
          
          await supabase
            .from('m4_fin_bank_accounts')
            .update({ 
              balance: revertedBalance,
              current_balance: revertedBalance
            })
            .eq('id', transaction.bank_account_id);
        }
      }

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
        .eq('is_active', true) // Added active filter
        .order('name');

      if (error) throw error;
      
      return (data || []).map(acc => ({
        ...acc,
        balance: Number(acc.balance) || 0,
        current_balance: Number(acc.current_balance ?? acc.balance) || 0
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_fin_bank_accounts');
      return [];
    }
  },

  async getCreditCards(workspaceId: string): Promise<FinanceBankAccount[]> {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    try {
      const { data, error } = await supabase
        .from('m4_fin_bank_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .eq('type', 'credit_account')
        .order('name');

      if (error) throw error;
      
      return (data || []).map(acc => ({
        ...acc,
        balance: Number(acc.balance) || 0,
        current_balance: Number(acc.current_balance ?? acc.balance) || 0
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

      if (error) {
        // Silent fail if table missing (waiting for setup)
        if (error.message?.includes('schema cache')) {
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      // Only log if it's not a schema cache error
      if (!(error as any)?.message?.includes('schema cache')) {
        handleFirestoreError(error, OperationType.LIST, 'm4_client_accounts');
      }
      return [];
    }
  },

  async createBankAccount(account: Partial<FinanceBankAccount>): Promise<FinanceBankAccount> {
    try {
      const payload = mappers.bankAccount(account);
      console.log('financeService.createBankAccount: Payload:', payload);
      
      const { data, error } = await supabase
        .from('m4_fin_bank_accounts')
        .insert([payload])
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
      const payload = mappers.bankAccount(account);
      const { data, error } = await supabase
        .from('m4_fin_bank_accounts')
        .update(payload)
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
        .eq('is_active', true) // Added active filter
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
        .eq('is_active', true) // Added active filter
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
        .eq('is_active', true) // Added active filter
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
        .select('balance, current_balance')
        .eq('id', data.bank_account_id)
        .single();

      if (accError) throw accError;

      const newBalance = transaction.type === 'income' 
        ? Number(account.balance) + amount 
        : Number(account.balance) - amount;

      const { error: balanceError } = await supabase
        .from('m4_fin_bank_accounts')
        .update({ 
          balance: newBalance,
          current_balance: newBalance
        })
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
      const outflowPayload = mappers.transaction({
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
      } as any);

      const { data: outflowResult, error: outflowError } = await supabase
        .from('m4_fin_transactions')
        .insert([outflowPayload])
        .select()
        .single();

      if (outflowError) throw outflowError;

      // 2. Create Inflow (Transfer Entry)
      const inflowPayload = mappers.transaction({
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
      } as any);

      const { error: inflowError } = await supabase
        .from('m4_fin_transactions')
        .insert([inflowPayload]);

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
