
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FinanceTransaction, 
  FinanceBankAccount, 
  FinanceCategory, 
  FinanceCostCenter,
  FinanceTransactionType, 
  FinanceTransactionStatus,
  FinancePaymentMethod,
  FinanceBankAccountType,
  FinanceCategoryType,
  FinanceClassificationType
} from '../types/finance';
import { leadService } from '../services/leadService';
import { clientService } from '../services/clientService';
import { supabase } from '../lib/supabase';
import { isUUID } from '../lib/mappers';
import { financeService } from '../services/financeService';
import { financeUtils } from '../utils/financeUtils';
import { User } from '../types';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  Search,
  Download,
  LayoutGrid,
  List as ListIcon,
  Building2,
  Tag,
  Target,
  Users,
  AlertCircle,
  LayoutDashboard,
  BarChart3,
  LineChart,
  CreditCard,
  RefreshCcw,
  Calendar,
  CheckCheck
} from 'lucide-react';
import { servicesUtils } from '../utils/services';

// Sub-components
import FinanceDashboard from '../components/finance/FinanceDashboard';
import FinanceDreView from '../components/finance/FinanceDreView';
import FinancePerformanceView from '../components/finance/FinancePerformanceView';
import TransactionList from '../components/finance/TransactionList';
import TransactionForm from '../components/finance/TransactionForm';
import TransactionDetails from '../components/finance/TransactionDetails';
import PaymentModal from '../components/finance/PaymentModal';
import BankAccountList from '../components/finance/BankAccountList';
import BankAccountForm from '../components/finance/BankAccountForm';
import ConfirmModal from '../components/ConfirmModal';
import CategoryList from '../components/finance/CategoryList';
import CategoryForm from '../components/finance/CategoryForm';
import TransferForm from '../components/finance/TransferForm';
import CostCenterList from '../components/finance/CostCenterList';
import CostCenterForm from '../components/finance/CostCenterForm';
import PaymentMethodList from '../components/finance/PaymentMethodList';
import PaymentMethodForm from '../components/finance/PaymentMethodForm';

interface FinanceOrganizadorProps {
  currentUser?: User | null;
  activeTab?: string;
}

type FinanceTab = 'dashboard' | 'dre' | 'performance' | 'transactions' | 'accounts' | 'settings';
type FinanceSettingsTab = 'categories' | 'cost_centers' | 'payment_methods';

const FinanceOrganizador: React.FC<FinanceOrganizadorProps> = ({ currentUser, activeTab: externalActiveTab }) => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinanceBankAccount[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [costCenters, setCostCenters] = useState<FinanceCostCenter[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<FinancePaymentMethod[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientAccounts, setClientAccounts] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [activeSettingsTab, setActiveSettingsTab] = useState<FinanceSettingsTab>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Financial Filter States
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [filterAccountId, setFilterAccountId] = useState('all');
  const [filterCategoryId, setFilterCategoryId] = useState('all');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [isSyncingContracts, setIsSyncingContracts] = useState(false);
  
  // Modal States
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false);
  const [isTransferFormOpen, setIsTransferFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Partial<FinanceTransaction> | undefined>();
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [transactionToConfirm, setTransactionToConfirm] = useState<FinanceTransaction | null>(null);

  const [isBankAccountFormOpen, setIsBankAccountFormOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<Partial<FinanceBankAccount> | undefined>();

  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Partial<FinanceCategory> | undefined>();

  // Sync activeTab from props
  useEffect(() => {
    if (externalActiveTab) {
      if (externalActiveTab === 'finance_dashboard') setActiveTab('dashboard');
      else if (externalActiveTab === 'finance_transactions') setActiveTab('transactions');
      else if (externalActiveTab === 'finance_dre') setActiveTab('dre');
      else if (externalActiveTab === 'finance_performance') setActiveTab('performance');
      else if (externalActiveTab === 'finance_accounts') setActiveTab('accounts');
      else if (externalActiveTab === 'finance_categories') {
        setActiveTab('settings' as any);
        setActiveSettingsTab('categories');
      }
      else if (externalActiveTab === 'finance_cost_centers') {
        setActiveTab('settings' as any);
        setActiveSettingsTab('cost_centers');
      }
      else if (externalActiveTab === 'finance_payment_methods') {
        setActiveTab('settings' as any);
        setActiveSettingsTab('payment_methods');
      }
    }
  }, [externalActiveTab]);

  const [isCostCenterFormOpen, setIsCostCenterFormOpen] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<Partial<FinanceCostCenter> | undefined>();

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'account' | 'transaction' | 'category' | 'cost_center' | 'payment_method' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isPaymentMethodFormOpen, setIsPaymentMethodFormOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<Partial<FinancePaymentMethod> | undefined>();

  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    if (externalActiveTab && externalActiveTab.startsWith('finance_')) {
      const tab = externalActiveTab.replace('finance_', '') as any;
      
      const mainTabs: FinanceTab[] = ['dashboard', 'dre', 'performance', 'transactions', 'accounts', 'settings'];
      const settingsTabs: FinanceSettingsTab[] = ['categories', 'cost_centers', 'payment_methods'];

      if (mainTabs.includes(tab)) {
        setActiveTab(tab);
      } else if (settingsTabs.includes(tab)) {
        setActiveTab('settings');
        setActiveSettingsTab(tab);
      }
    }
  }, [externalActiveTab]);

  useEffect(() => {
    const workspaceId = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id');
    console.log('FinanceOrganizador: useEffect triggered. workspaceId:', workspaceId, 'currentUser loaded:', !!currentUser);
    
    if (workspaceId && isUUID(workspaceId)) {
      loadData();
    } else if (workspaceId && !isUUID(workspaceId)) {
      console.error('FinanceOrganizador: workspace_id inválido (não é UUID):', workspaceId);
      setIsLoading(false);
    } else if (!workspaceId && currentUser) {
      console.warn('FinanceOrganizador: currentUser loaded but no workspaceId found.');
      setIsLoading(false);
    }
  }, [currentUser?.workspace_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const workspaceId = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id');
      
      if (!workspaceId || !isUUID(workspaceId)) {
        setIsLoading(false);
        return;
      }

      // Load data with individual error handling to prevent one failure from blocking everything
      console.log('Finance: loadData starting for workspace:', workspaceId);
      const results = await Promise.allSettled([
        financeService.getTransactions(workspaceId),
        financeService.getBankAccounts(workspaceId),
        financeService.getCategories(workspaceId),
        financeService.getCostCenters(workspaceId),
        financeService.getPaymentMethods(workspaceId),
        leadService.getAll(workspaceId),
        financeService.getCompanies(workspaceId),
        financeService.getClientAccounts(workspaceId)
      ]);
      
      console.log('Finance: loadData fetches complete. Processing results...');
      
      const labels = ['Transactions', 'BankAccounts', 'Categories', 'CostCenters', 'PaymentMethods', 'Leads', 'Companies', 'ClientAccounts'];
      results.forEach((res, i) => {
        const label = labels[i];
        if (res.status === 'rejected') {
          console.error(`Finance: ${label} fetch REJECTED:`, res.reason);
        } else {
          console.log(`Finance: ${label} fetch FULFILLED, items:`, Array.isArray(res.value) ? res.value.length : 'not an array');
          if (Array.isArray(res.value) && res.value.length === 0) {
            console.warn(`Finance: ${label} returned an empty array. Check if table has data for specialized workspace ${workspaceId}.`);
          }
        }
      });

      if (results[0].status === 'fulfilled') setTransactions(results[0].value || []);
      if (results[1].status === 'fulfilled') setBankAccounts(results[1].value || []);
      if (results[2].status === 'fulfilled') setCategories(results[2].value || []);
      if (results[3].status === 'fulfilled') setCostCenters(results[3].value || []);
      if (results[4].status === 'fulfilled') setPaymentMethods(results[4].value || []);
      if (results[5].status === 'fulfilled') setLeads(results[5].value || []);
      if (results[6].status === 'fulfilled') setClients(results[6].value || []);
      if (results[7].status === 'fulfilled') setClientAccounts(results[7].value || []);
    } catch (error) {
      console.error('Finance: Error in loadData catch block:', error);
    } finally {
      setIsLoading(false);
      console.log('Finance: loadData finally block executed');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const workspaceId = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id');
      if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID inválido');

      switch (itemToDelete.type) {
        case 'account':
          await financeService.deleteBankAccount(itemToDelete.id, workspaceId);
          break;
        case 'transaction':
          await financeService.deleteTransaction(itemToDelete.id, workspaceId);
          break;
        case 'category':
          await financeService.deleteCategory(itemToDelete.id, workspaceId);
          break;
        case 'cost_center':
          await financeService.deleteCostCenter(itemToDelete.id, workspaceId);
          break;
        case 'payment_method':
          await financeService.deletePaymentMethod(itemToDelete.id, workspaceId);
          break;
      }
      
      await loadData();
      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (error: any) {
      console.error(`Error deleting ${itemToDelete.type}:`, error);
      const msg = error?.errorMessage || error?.message || 'Erro desconhecido';
      if (msg.includes('foreign key constraint')) {
        setDeleteError('Não é possível excluir este item pois existem outros registros vinculados a ele. Você deve excluir ou mover os registros vinculados primeiro.');
      } else {
        setDeleteError('Erro ao excluir: ' + msg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const totals = useMemo(() => {
    const income = transactions
      .filter(t => t.type === FinanceTransactionType.INCOME && t.status === FinanceTransactionStatus.PAID)
      .reduce((acc, t) => acc + Number(t.amount), 0);
    
    const expense = transactions
      .filter(t => t.type === FinanceTransactionType.EXPENSE && t.status === FinanceTransactionStatus.PAID)
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const balance = bankAccounts.reduce((acc, accnt) => acc + Number(accnt.current_balance), 0);
    
    const overdueCount = transactions.filter(t => t.status === FinanceTransactionStatus.OVERDUE).length;

    return { income, expense, balance, overdueCount };
  }, [transactions, bankAccounts]);

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // 1. Text Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        (t.description?.toLowerCase() || '').includes(q) ||
        (t.category?.name?.toLowerCase() || '').includes(q) ||
        (t.bank_account?.name?.toLowerCase() || '').includes(q) ||
        (t.notes?.toLowerCase() || '').includes(q)
      );
    }

    // 2. Type Filter
    if (filterType !== 'all') {
      list = list.filter(t => t.type === filterType);
    }

    // 3. Status Filter
    if (filterStatus !== 'all') {
      list = list.filter(t => t.status === filterStatus);
    }

    // 4. Bank Account Filter
    if (filterAccountId !== 'all') {
      list = list.filter(t => t.bank_account_id === filterAccountId);
    }

    // 5. Category Filter
    if (filterCategoryId !== 'all') {
      list = list.filter(t => t.category_id === filterCategoryId);
    }

    // 5b. Min & Max Amount Filter
    if (filterMinAmount !== '') {
      list = list.filter(t => Number(t.amount) >= Number(filterMinAmount));
    }
    if (filterMaxAmount !== '') {
      list = list.filter(t => Number(t.amount) <= Number(filterMaxAmount));
    }

    // 6. Time Period Filter
    const now = new Date();
    
    // Clear hours for today comparison
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (filterPeriod === 'today') {
      list = list.filter(t => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date + 'T12:00:00');
        return d >= startOfToday && d <= endOfToday;
      });
    } else if (filterPeriod === 'week') {
      // Find Sunday of this week
      const currentDay = now.getDay();
      const startOfWeek = new Date(startOfToday.getTime() - currentDay * 24 * 60 * 60 * 1000);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      
      list = list.filter(t => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date + 'T12:00:00');
        return d >= startOfWeek && d <= endOfWeek;
      });
    } else if (filterPeriod === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      list = list.filter(t => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date + 'T12:00:00');
        return d >= startOfMonth && d <= endOfMonth;
      });
    } else if (filterPeriod === 'custom') {
      if (filterStartDate) {
        const sd = new Date(`${filterStartDate}T00:00:00`);
        list = list.filter(t => t.due_date ? new Date(t.due_date + 'T12:00:00') >= sd : false);
      }
      if (filterEndDate) {
        const ed = new Date(`${filterEndDate}T23:59:59`);
        list = list.filter(t => t.due_date ? new Date(t.due_date + 'T12:00:00') <= ed : false);
      }
    }

    // Sort newer due dates first
    return list.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [
    transactions, 
    searchQuery, 
    filterType, 
    filterStatus, 
    filterAccountId, 
    filterCategoryId, 
    filterPeriod, 
    filterStartDate, 
    filterEndDate,
    filterMinAmount,
    filterMaxAmount
  ]);

  const handleSyncContracts = async () => {
    setIsSyncingContracts(true);
    try {
      const workspaceId = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id');
      if (!workspaceId || !isUUID(workspaceId)) {
        alert('Workspace ID inválido para sincronização.');
        return;
      }

      const syncResult = await financeService.syncContracts(workspaceId);

      if (syncResult.createdCount > 0) {
        alert(`Sucesso! ${syncResult.createdCount} novos lançamentos foram sincronizados e gerados com sucesso no Organizador Financeiro.`);
      } else {
        alert('Todos os contratos de suas Contas Contratadas já estão em dia e sincronizados!');
      }

      await loadData();
    } catch (e: any) {
      console.error('[handleSyncContracts] Error:', e);
      alert('Erro ao sincronizar contratos: ' + (e.message || 'Erro inesperado'));
    } finally {
      setIsSyncingContracts(false);
    }
  };

  const handleSaveTransaction = async (data: Partial<FinanceTransaction> & { change_reason?: string }) => {
    try {
      const workspaceId = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id');
      
      if (!workspaceId || !isUUID(workspaceId)) {
        alert('Sessão inválida: Workspace ID não encontrado. Por favor, faça login novamente.');
        return;
      }

      // Handle audit history if it's an update
      let updatedData = { ...data };
      if (data.id && data.change_reason) {
        const timestamp = new Date().toLocaleString('pt-BR');
        const userEmail = currentUser?.email || 'Usuário';
        const newLog = `[${timestamp}] ${userEmail}: ${data.change_reason}\n`;
        const existingHistory = selectedTransaction?.edit_history || '';
        updatedData.edit_history = newLog + existingHistory;
      }
      delete (updatedData as any).change_reason;

      if (updatedData.type === FinanceTransactionType.TRANSFER) {
        await financeService.createTransfer({
          description: updatedData.description || '',
          amount: updatedData.amount || 0,
          fromBankAccountId: updatedData.bank_account_id || '',
          toBankAccountId: updatedData.destination_bank_account_id || '',
          date: updatedData.due_date || new Date().toISOString().split('T')[0]
        }, workspaceId);
      } else if (updatedData.id) {
        await financeService.updateTransaction(updatedData.id, {
          ...updatedData,
          updated_by: currentUser?.id
        }, workspaceId);
      } else {
        await financeService.createTransaction(workspaceId, {
          ...updatedData,
          workspace_id: workspaceId,
          created_by: currentUser?.id,
          updated_by: currentUser?.id
        } as any);
      }
      setIsTransactionFormOpen(false);
      setIsTransferFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      const msg = error?.errorMessage || error?.message || 'Erro desconhecido';
      alert('Erro ao salvar lançamento: ' + msg);
      throw error;
    }
  };

  const handleConfirmPayment = async (data: { paid_at: string, bank_account_id: string }) => {
    if (!transactionToConfirm) return;
    try {
      const workspaceId = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id');
      if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID inválido');

      await financeService.confirmPayment(transactionToConfirm.id, {
        bankAccountId: data.bank_account_id,
        paidDate: data.paid_at,
        amount: Number(transactionToConfirm.amount)
      }, workspaceId);
      setIsPaymentModalOpen(false);
      setTransactionToConfirm(null);
      await loadData();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      alert('Erro ao confirmar pagamento: ' + (error.message || 'Erro desconhecido'));
      throw error;
    }
  };

  const handleSaveBankAccount = async (data: Partial<FinanceBankAccount>) => {
    console.log('handleSaveBankAccount triggered with data:', data);
    try {
      const workspaceId = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id');
      
      console.log('Using workspaceId:', workspaceId, 'isUUID:', workspaceId ? isUUID(workspaceId) : false);
      
      if (!workspaceId || !isUUID(workspaceId)) {
        alert('Sessão inválida: Workspace ID não encontrado. Por favor, faça login novamente.');
        return;
      }

      if (data.id) {
        console.log('Updating bank account:', data.id);
        await financeService.updateBankAccount(data.id, data, workspaceId);
      } else {
        console.log('Creating new bank account with workspaceId:', workspaceId);
        // Ensure balance and current_balance are set to initial_balance for new accounts
        await financeService.createBankAccount(workspaceId, { 
          ...data, 
          workspace_id: workspaceId,
          balance: data.initial_balance || 0,
          current_balance: data.initial_balance || 0
        });
      }
      
      console.log('Bank account saved successfully');
      setIsBankAccountFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving bank account:', error);
      
      // Try to extract a more useful error message if it's the JSON string from handleFirestoreError
      let displayMessage = error?.errorMessage || error?.message || 'Erro desconhecido';
      
      // If it's a JSON string (old format), try to parse it
      if (typeof error?.message === 'string' && error.message.startsWith('{')) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) displayMessage = parsed.error;
        } catch (e) {
          // Not JSON, use original message
        }
      }
      
      alert('Erro ao salvar conta bancária: ' + displayMessage);
      throw error; // Re-throw to let the form handle the loading state
    }
  };

  const handleSaveCategory = async (data: Partial<FinanceCategory>) => {
    try {
      const workspaceId = currentUser?.workspace_id;
      
      if (!workspaceId || !isUUID(workspaceId)) {
        alert('Sessão inválida: Workspace ID não encontrado. Por favor, faça login novamente.');
        return;
      }

      if (data.id) {
        await financeService.updateCategory(data.id, data, workspaceId);
      } else {
        await financeService.createCategory(workspaceId, { ...data, workspace_id: workspaceId });
      }
      setIsCategoryFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving category:', error);
      const msg = error?.errorMessage || error?.message || 'Erro desconhecido';
      alert('Erro ao salvar categoria: ' + msg);
      throw error;
    }
  };

  const handleSaveCostCenter = async (data: Partial<FinanceCostCenter>) => {
    try {
      const workspaceId = currentUser?.workspace_id;
      
      if (!workspaceId || !isUUID(workspaceId)) {
        alert('Sessão inválida: Workspace ID não encontrado. Por favor, faça login novamente.');
        return;
      }

      if (data.id) {
        await financeService.updateCostCenter(data.id, data, workspaceId);
      } else {
        await financeService.createCostCenter(workspaceId, { ...data, workspace_id: workspaceId });
      }
      setIsCostCenterFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving cost center:', error);
      const msg = error?.errorMessage || error?.message || 'Erro desconhecido';
      alert('Erro ao salvar centro de custo: ' + msg);
      throw error;
    }
  };

  const handleSavePaymentMethod = async (data: Partial<FinancePaymentMethod>) => {
    try {
      const workspaceId = currentUser?.workspace_id;
      
      if (!workspaceId || !isUUID(workspaceId)) {
        alert('Sessão inválida: Workspace ID não encontrado. Por favor, faça login novamente.');
        return;
      }

      if (data.id) {
        await financeService.updatePaymentMethod(data.id, data, workspaceId);
      } else {
        await financeService.createPaymentMethod(workspaceId, { ...data, workspace_id: workspaceId });
      }
      setIsPaymentMethodFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      const msg = error?.errorMessage || error?.message || 'Erro desconhecido';
      alert('Erro ao salvar método de pagamento: ' + msg);
      throw error;
    }
  };

  if (isLoading || (!currentUser?.workspace_id && !localStorage.getItem('m4_crm_workspace_id'))) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Carregando Finanças...</p>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Estamos preparando seus dados financeiros.</p>
        </div>
      </div>
    );
  }

  const workspaceId = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id');

  if (!workspaceId || !isUUID(workspaceId)) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-500 font-bold">Workspace não configurado.</p>
          <p className="text-slate-400 text-sm">Faça logout e login novamente para recarregar sua sessão.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Organizador Financeiro</h2>
          <p className="text-slate-500 font-medium">Gestão inteligente de fluxo de caixa e DRE empresarial.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setIsTransferFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all"
          >
            <RefreshCcw size={18} />
            Transferir
          </button>
          <button 
            onClick={() => {
              setSelectedTransaction(undefined);
              setIsTransactionFormOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            <Plus size={18} />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Summary Cards - Only show when not in dashboard */}
      {activeTab !== 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Wallet size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Total</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {financeUtils.formatCurrency(totals.balance)}
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receitas (Mês)</p>
            <h3 className="text-xl font-black text-emerald-600 tracking-tight">
              {financeUtils.formatCurrency(totals.income)}
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl flex items-center justify-center mb-4">
              <TrendingDown size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Despesas (Mês)</p>
            <h3 className="text-xl font-black text-rose-600 tracking-tight">
              {financeUtils.formatCurrency(totals.expense)}
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <LayoutGrid size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado</p>
            <h3 className={`text-xl font-black tracking-tight ${totals.income - totals.expense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {financeUtils.formatCurrency(totals.income - totals.expense)}
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <AlertCircle size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencidos</p>
            <h3 className="text-xl font-black text-amber-600 tracking-tight">
              {totals.overdueCount} <span className="text-xs font-bold text-slate-400">contas</span>
            </h3>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="animate-in fade-in duration-500">
        {isMigrating && (
          <div className="p-12 text-center space-y-4 bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] border border-blue-100 dark:border-blue-800 mb-8">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">Migrando dados financeiros...</p>
          </div>
        )}
        {activeTab === 'dashboard' && currentUser?.workspace_id && (
          <FinanceDashboard 
            workspaceId={currentUser.workspace_id} 
            categories={categories}
            costCenters={costCenters}
          />
        )}

        {activeTab === 'dre' && currentUser?.workspace_id && (
          <FinanceDreView 
            workspaceId={currentUser.workspace_id} 
            costCenters={costCenters}
          />
        )}

        {activeTab === 'performance' && currentUser?.workspace_id && (
          <FinancePerformanceView 
            workspaceId={currentUser.workspace_id} 
          />
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-3xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[280px]">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar lançamentos por descrição, observações..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-6 py-3 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSyncContracts}
                    disabled={isSyncingContracts}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer ${
                      isSyncingContracts 
                        ? 'bg-amber-550 cursor-not-allowed text-white/90' 
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-100 dark:shadow-none'
                    }`}
                    title="Gera os lançamentos automáticos de todos os clientes com contratos cadastrados que ainda não foram gerados"
                  >
                    <RefreshCcw size={14} className={isSyncingContracts ? 'animate-spin' : ''} />
                    {isSyncingContracts ? 'Sincronizando...' : '🔄 Sincronizar Contratos'}
                  </button>

                  <button 
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all cursor-pointer ${
                      showAdvancedFilters 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800' 
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600'
                    }`}
                  >
                    <Filter size={16} />
                    {showAdvancedFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
                  </button>
                </div>
              </div>

              {/* Advanced Filter Items */}
              {showAdvancedFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-350">
                  
                  {/* Period Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Período de Vencimento</label>
                    <select
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="all">📅 Todos os Períodos</option>
                      <option value="today">☀️ Diário (Hoje)</option>
                      <option value="week">📅 Semanal (Esta Semana)</option>
                      <option value="month">🗓️ Mensal (Este Mês)</option>
                      <option value="custom">⚙️ Personalizado (Datas)</option>
                    </select>
                  </div>

                  {/* Custom Date Filters */}
                  {filterPeriod === 'custom' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Data Inicial</label>
                        <input
                          type="date"
                          value={filterStartDate}
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Data Final</label>
                        <input
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {/* Type Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Fluxo Financeiro</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="all">🟢 Todos os Fluxos</option>
                      <option value="income">📈 Receitas (+)</option>
                      <option value="expense">📉 Despesas (-)</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status do Lançamento</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="all">🔍 Todos os Status</option>
                      <option value="paid">✅ Pago / Recebido</option>
                      <option value="pending">⏳ Pendente</option>
                      <option value="overdue">🚨 Vencido</option>
                    </select>
                  </div>

                  {/* Bank Account Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Conta Bancária</label>
                    <select
                      value={filterAccountId}
                      onChange={(e) => setFilterAccountId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="all">🏦 Todas as Contas</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Categoria</label>
                    <select
                      value={filterCategoryId}
                      onChange={(e) => setFilterCategoryId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="all">🏷️ Todas as Categorias</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Min Amount Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Valor Mínimo (R$)</label>
                    <input
                      type="number"
                      placeholder="Ex: 150"
                      value={filterMinAmount}
                      onChange={(e) => setFilterMinAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                    />
                  </div>

                  {/* Max Amount Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Valor Máximo (R$)</label>
                    <input
                      type="number"
                      placeholder="Ex: 5000"
                      value={filterMaxAmount}
                      onChange={(e) => setFilterMaxAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                    />
                  </div>

                  {/* Clear All Filters Button */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterPeriod('all');
                        setFilterStartDate('');
                        setFilterEndDate('');
                        setFilterType('all');
                        setFilterStatus('all');
                        setFilterAccountId('all');
                        setFilterCategoryId('all');
                        setFilterMinAmount('');
                        setFilterMaxAmount('');
                      }}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                      🧹 Limpar Todos os Filtros
                    </button>
                  </div>

                </div>
              )}
            </div>
            <TransactionList 
              transactions={filteredTransactions} 
              onView={(t) => {
                setSelectedTransaction(t);
                setIsTransactionDetailsOpen(true);
              }}
              onDelete={(id) => {
                setItemToDelete({ id, type: 'transaction' });
                setIsDeleteConfirmOpen(true);
                setDeleteError(null);
              }}
              onConfirm={(t) => {
                setTransactionToConfirm(t);
                setIsPaymentModalOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'accounts' && (
          <BankAccountList 
            accounts={bankAccounts} 
            onEdit={(a) => {
              setSelectedBankAccount(a);
              setIsBankAccountFormOpen(true);
            }}
            onDelete={(id) => {
              setItemToDelete({ id, type: 'account' });
              setIsDeleteConfirmOpen(true);
              setDeleteError(null);
            }}
            onNew={() => {
              setSelectedBankAccount(undefined);
              setIsBankAccountFormOpen(true);
            }}
          />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="animate-in fade-in duration-500">
              <div className="animate-in fade-in duration-500">
              {activeSettingsTab === 'categories' && (
                <CategoryList 
                  categories={categories} 
                  onEdit={(c) => {
                    setSelectedCategory(c);
                    setIsCategoryFormOpen(true);
                  }}
                  onDelete={(id) => {
                    setItemToDelete({ id, type: 'category' });
                    setIsDeleteConfirmOpen(true);
                    setDeleteError(null);
                  }}
                  onNew={(parentId) => {
                    setSelectedCategory({ parent_id: parentId });
                    setIsCategoryFormOpen(true);
                  }}
                />
              )}

              {activeSettingsTab === 'cost_centers' && (
                <CostCenterList 
                  costCenters={costCenters} 
                  onEdit={(cc) => {
                    setSelectedCostCenter(cc);
                    setIsCostCenterFormOpen(true);
                  }}
                  onDelete={(id) => {
                    setItemToDelete({ id, type: 'cost_center' });
                    setIsDeleteConfirmOpen(true);
                    setDeleteError(null);
                  }}
                  onNew={() => {
                    setSelectedCostCenter(undefined);
                    setIsCostCenterFormOpen(true);
                  }}
                />
              )}

              {activeSettingsTab === 'payment_methods' && (
                <PaymentMethodList 
                  methods={paymentMethods} 
                  onEdit={(pm) => {
                    setSelectedPaymentMethod(pm);
                    setIsPaymentMethodFormOpen(true);
                  }}
                  onDelete={(id) => {
                    setItemToDelete({ id, type: 'payment_method' });
                    setIsDeleteConfirmOpen(true);
                    setDeleteError(null);
                  }}
                  onNew={() => {
                    setSelectedPaymentMethod(undefined);
                    setIsPaymentMethodFormOpen(true);
                  }}
                />
              )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Modals */}
      <TransferForm 
        isOpen={isTransferFormOpen}
        onClose={() => setIsTransferFormOpen(false)}
        onSave={handleSaveTransaction}
        bankAccounts={bankAccounts}
      />
      
      <TransactionDetails 
        isOpen={isTransactionDetailsOpen}
        onClose={() => setIsTransactionDetailsOpen(false)}
        transaction={selectedTransaction as FinanceTransaction}
        onEdit={(t) => {
          setIsTransactionDetailsOpen(false);
          setSelectedTransaction(t);
          setIsTransactionFormOpen(true);
        }}
        onDelete={(id) => {
          setIsTransactionDetailsOpen(false);
          setItemToDelete({ id, type: 'transaction' });
          setIsDeleteConfirmOpen(true);
          setDeleteError(null);
        }}
      />

      <TransactionForm 
        isOpen={isTransactionFormOpen}
        onClose={() => setIsTransactionFormOpen(false)}
        onSave={handleSaveTransaction}
        onDelete={(id) => {
          setIsTransactionFormOpen(false);
          setItemToDelete({ id, type: 'transaction' });
          setIsDeleteConfirmOpen(true);
          setDeleteError(null);
        }}
        initialData={selectedTransaction}
        categories={categories}
        bankAccounts={bankAccounts}
        costCenters={costCenters}
        leads={leads}
        clients={clients}
        paymentMethods={paymentMethods}
      />

      {transactionToConfirm && (
        <PaymentModal 
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onConfirm={handleConfirmPayment}
          transaction={transactionToConfirm}
          bankAccounts={bankAccounts}
        />
      )}

      <BankAccountForm 
        isOpen={isBankAccountFormOpen}
        onClose={() => setIsBankAccountFormOpen(false)}
        onSave={handleSaveBankAccount}
        initialData={selectedBankAccount}
      />

      <CategoryForm 
        isOpen={isCategoryFormOpen}
        onClose={() => setIsCategoryFormOpen(false)}
        onSave={handleSaveCategory}
        initialData={selectedCategory}
        categories={categories}
      />

      <CostCenterForm 
        isOpen={isCostCenterFormOpen}
        onClose={() => setIsCostCenterFormOpen(false)}
        onSave={handleSaveCostCenter}
        initialData={selectedCostCenter}
      />

      <PaymentMethodForm 
        isOpen={isPaymentMethodFormOpen}
        onClose={() => setIsPaymentMethodFormOpen(false)}
        onSave={handleSavePaymentMethod}
        initialData={selectedPaymentMethod}
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Confirmar Exclusão"
        message={deleteError || "Deseja realmente excluir este item? Esta ação não poderá ser desfeita."}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setItemToDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
};

export default FinanceOrganizador;
