
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FinanceTransaction, 
  FinanceBankAccount, 
  FinanceCategory, 
  FinanceCostCenter,
  FinanceCounterparty,
  FinanceTransactionType, 
  FinanceTransactionStatus,
  FinancePaymentMethod,
  FinanceBankAccountType,
  FinanceCategoryType,
  FinanceClassificationType
} from '../types/finance';
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
  RefreshCcw
} from 'lucide-react';

// Sub-components
import FinanceDashboard from '../components/finance/FinanceDashboard';
import FinanceDreView from '../components/finance/FinanceDreView';
import FinancePerformanceView from '../components/finance/FinancePerformanceView';
import TransactionList from '../components/finance/TransactionList';
import TransactionForm from '../components/finance/TransactionForm';
import PaymentModal from '../components/finance/PaymentModal';
import BankAccountList from '../components/finance/BankAccountList';
import BankAccountForm from '../components/finance/BankAccountForm';
import CategoryList from '../components/finance/CategoryList';
import CategoryForm from '../components/finance/CategoryForm';
import CostCenterList from '../components/finance/CostCenterList';
import CostCenterForm from '../components/finance/CostCenterForm';
import CounterpartyList from '../components/finance/CounterpartyList';
import CounterpartyForm from '../components/finance/CounterpartyForm';
import PaymentMethodList from '../components/finance/PaymentMethodList';
import PaymentMethodForm from '../components/finance/PaymentMethodForm';

interface FinanceOrganizadorProps {
  currentUser?: User | null;
  activeTab?: string;
}

type FinanceTab = 'dashboard' | 'dre' | 'performance' | 'transactions' | 'accounts' | 'settings';
type FinanceSettingsTab = 'categories' | 'cost_centers' | 'counterparties' | 'payment_methods';

const FinanceOrganizador: React.FC<FinanceOrganizadorProps> = ({ currentUser, activeTab: externalActiveTab }) => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinanceBankAccount[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [costCenters, setCostCenters] = useState<FinanceCostCenter[]>([]);
  const [counterparties, setCounterparties] = useState<FinanceCounterparty[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<FinancePaymentMethod[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [activeSettingsTab, setActiveSettingsTab] = useState<FinanceSettingsTab>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Partial<FinanceTransaction> | undefined>();
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [transactionToConfirm, setTransactionToConfirm] = useState<FinanceTransaction | null>(null);

  const [isBankAccountFormOpen, setIsBankAccountFormOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<Partial<FinanceBankAccount> | undefined>();

  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Partial<FinanceCategory> | undefined>();

  const [isCostCenterFormOpen, setIsCostCenterFormOpen] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<Partial<FinanceCostCenter> | undefined>();

  const [isCounterpartyFormOpen, setIsCounterpartyFormOpen] = useState(false);
  const [selectedCounterparty, setSelectedCounterparty] = useState<Partial<FinanceCounterparty> | undefined>();

  const [isPaymentMethodFormOpen, setIsPaymentMethodFormOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<Partial<FinancePaymentMethod> | undefined>();

  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    if (externalActiveTab && externalActiveTab.startsWith('finance_')) {
      const tab = externalActiveTab.replace('finance_', '') as any;
      
      const mainTabs: FinanceTab[] = ['dashboard', 'dre', 'performance', 'transactions', 'accounts', 'settings'];
      const settingsTabs: FinanceSettingsTab[] = ['categories', 'cost_centers', 'counterparties', 'payment_methods'];

      if (mainTabs.includes(tab)) {
        setActiveTab(tab);
      } else if (settingsTabs.includes(tab)) {
        setActiveTab('settings');
        setActiveSettingsTab(tab);
      }
    }
  }, [externalActiveTab]);

  useEffect(() => {
    if (currentUser?.workspace_id) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const workspaceId = currentUser?.workspace_id;
      
      if (!workspaceId || !isUUID(workspaceId)) {
        console.warn('FinanceOrganizador: Invalid or missing workspaceId from currentUser. Skipping data load.', workspaceId);
        setIsLoading(false);
        return;
      }

      const [transData, accountsData, catsData, ccData, cpData, pmData] = await Promise.all([
        financeService.getTransactions(workspaceId),
        financeService.getBankAccounts(workspaceId),
        financeService.getCategories(workspaceId),
        financeService.getCostCenters(workspaceId),
        financeService.getCounterparties(workspaceId),
        financeService.getPaymentMethods(workspaceId)
      ]);
      setTransactions(transData);
      setBankAccounts(accountsData);
      setCategories(catsData);
      setCostCenters(ccData);
      setCounterparties(cpData);
      setPaymentMethods(pmData);

      // Auto-migrate if new tables are empty but old ones might have data
      if (accountsData.length === 0 && catsData.length === 0) {
        checkAndMigrate(workspaceId);
      }
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndMigrate = async (workspaceId: string) => {
    try {
      // Check if old tables have data
      const [{ data: oldAccounts }, { data: oldCats }, { data: oldPMs }] = await Promise.all([
        supabase.from('m4_bank_accounts').select('*').eq('workspace_id', workspaceId),
        supabase.from('m4_finance_categories').select('*').eq('workspace_id', workspaceId),
        supabase.from('m4_payment_methods').select('*').eq('workspace_id', workspaceId)
      ]);

      if ((oldAccounts?.length || 0) > 0 || (oldCats?.length || 0) > 0) {
        if (confirm('Detectamos dados financeiros da versão anterior. Deseja importar para o novo Organizador Financeiro?')) {
          setIsMigrating(true);
          
          // Migrate Accounts
          if (oldAccounts) {
            for (const acc of oldAccounts) {
              await financeService.createBankAccount({
                workspace_id: workspaceId,
                name: acc.name,
                bank: acc.bank,
                type: FinanceBankAccountType.CHECKING,
                initial_balance: acc.balance || 0,
                initial_balance_date: new Date().toISOString().split('T')[0],
                current_balance: acc.balance || 0,
                is_active: acc.is_active !== false,
                currency: 'BRL'
              });
            }
          }

          // Migrate Categories
          if (oldCats) {
            for (const cat of oldCats) {
              await financeService.createCategory({
                workspace_id: workspaceId,
                name: cat.name,
                type: cat.type === 'income' ? FinanceCategoryType.INCOME : FinanceCategoryType.EXPENSE,
                level: 0,
                order: 0,
                is_active: true,
                impacts_dre: true,
                classification_type: FinanceClassificationType.OPERATIONAL
              });
            }
          }

          // Migrate Payment Methods
          if (oldPMs) {
            for (const pm of oldPMs) {
              await financeService.createPaymentMethod({
                workspace_id: workspaceId,
                name: pm.name,
                is_active: pm.is_active !== false
              });
            }
          }

          setIsMigrating(false);
          loadData();
          alert('Migração concluída com sucesso!');
        }
      }
    } catch (error) {
      console.error('Migration error:', error);
      setIsMigrating(false);
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
    return transactions.filter(t => 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.counterparty?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transactions, searchQuery]);

  const handleSaveTransaction = async (data: Partial<FinanceTransaction>) => {
    try {
      const workspaceId = currentUser?.workspace_id;
      
      if (!workspaceId || !isUUID(workspaceId)) {
        alert('Sessão inválida: Workspace ID não encontrado. Por favor, faça login novamente.');
        return;
      }

      if (data.id) {
        await financeService.updateTransaction(data.id, data);
      } else {
        await financeService.createTransaction({
          ...data,
          workspace_id: workspaceId,
          created_by: currentUser?.id,
          updated_by: currentUser?.id
        });
      }
      setIsTransactionFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      alert('Erro ao salvar lançamento: ' + (error.message || 'Erro desconhecido'));
      throw error;
    }
  };

  const handleConfirmPayment = async (data: { paid_at: string, bank_account_id: string }) => {
    if (!transactionToConfirm) return;
    try {
      await financeService.confirmPayment(transactionToConfirm.id, data);
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
      const workspaceId = currentUser?.workspace_id;
      
      console.log('Using workspaceId:', workspaceId, 'isUUID:', workspaceId ? isUUID(workspaceId) : false);
      
      if (!workspaceId || !isUUID(workspaceId)) {
        alert('Sessão inválida: Workspace ID não encontrado. Por favor, faça login novamente.');
        return;
      }

      if (data.id) {
        console.log('Updating bank account:', data.id);
        await financeService.updateBankAccount(data.id, data);
      } else {
        console.log('Creating new bank account with workspaceId:', workspaceId);
        // Ensure current_balance is set to initial_balance for new accounts
        await financeService.createBankAccount({ 
          ...data, 
          workspace_id: workspaceId,
          current_balance: data.initial_balance || 0
        });
      }
      
      console.log('Bank account saved successfully');
      setIsBankAccountFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving bank account:', error);
      
      // Try to extract a more useful error message if it's the JSON string from handleFirestoreError
      let displayMessage = error.message || 'Erro desconhecido';
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) displayMessage = parsed.error;
      } catch (e) {
        // Not JSON, use original message
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
        await financeService.updateCategory(data.id, data);
      } else {
        await financeService.createCategory({ ...data, workspace_id: workspaceId });
      }
      setIsCategoryFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert('Erro ao salvar categoria: ' + (error.message || 'Erro desconhecido'));
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
        await financeService.updateCostCenter(data.id, data);
      } else {
        await financeService.createCostCenter({ ...data, workspace_id: workspaceId });
      }
      setIsCostCenterFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving cost center:', error);
      alert('Erro ao salvar centro de custo: ' + (error.message || 'Erro desconhecido'));
      throw error;
    }
  };

  const handleSaveCounterparty = async (data: Partial<FinanceCounterparty>) => {
    try {
      const workspaceId = currentUser?.workspace_id;
      
      if (!workspaceId || !isUUID(workspaceId)) {
        alert('Sessão inválida: Workspace ID não encontrado. Por favor, faça login novamente.');
        return;
      }

      if (data.id) {
        await financeService.updateCounterparty(data.id, data);
      } else {
        await financeService.createCounterparty({ ...data, workspace_id: workspaceId });
      }
      setIsCounterpartyFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving counterparty:', error);
      alert('Erro ao salvar contraparte: ' + (error.message || 'Erro desconhecido'));
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
        await financeService.updatePaymentMethod(data.id, data);
      } else {
        await financeService.createPaymentMethod({ ...data, workspace_id: workspaceId });
      }
      setIsPaymentMethodFormOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      alert('Erro ao salvar método de pagamento: ' + (error.message || 'Erro desconhecido'));
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all">
            <Download size={18} />
            Exportar
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

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 w-fit rounded-2xl">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('dre')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dre' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <BarChart3 size={16} />
          DRE
        </button>
        <button 
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'performance' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <LineChart size={16} />
          Performance
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'transactions' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ListIcon size={16} />
          Lançamentos
        </button>
        <button 
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'accounts' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Building2 size={16} />
          Contas
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Plus size={16} />
          Configurações
        </button>
      </div>

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
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar lançamentos..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all w-80"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-all">
                <Filter size={18} />
                Filtros Avançados
              </button>
            </div>
            <TransactionList 
              transactions={filteredTransactions} 
              onEdit={(t) => {
                setSelectedTransaction(t);
                setIsTransactionFormOpen(true);
              }}
              onDelete={async (id) => {
                if (confirm('Deseja excluir este lançamento?')) {
                  await financeService.deleteTransaction(id);
                  loadData();
                }
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
            onDelete={async (id) => {
              if (confirm('Deseja excluir esta conta?')) {
                await financeService.deleteBankAccount(id);
                loadData();
              }
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 w-fit rounded-2xl">
                  <button 
                    onClick={() => setActiveSettingsTab('categories')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSettingsTab === 'categories' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Tag size={14} />
                    Categorias
                  </button>
                  <button 
                    onClick={() => setActiveSettingsTab('cost_centers')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSettingsTab === 'cost_centers' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Target size={14} />
                    Centros de Custo
                  </button>
                  <button 
                    onClick={() => setActiveSettingsTab('payment_methods')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSettingsTab === 'payment_methods' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <CreditCard size={14} />
                    Métodos
                  </button>
                  <button 
                    onClick={() => setActiveSettingsTab('counterparties')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSettingsTab === 'counterparties' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Users size={14} />
                    Contrapartes
                  </button>
                </div>

                <button 
                  onClick={() => checkAndMigrate(currentUser?.workspace_id || '')}
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-all"
                >
                  <RefreshCcw size={14} />
                  Importar Dados Antigos
                </button>
              </div>

              <div className="animate-in fade-in duration-500">
              {activeSettingsTab === 'categories' && (
                <CategoryList 
                  categories={categories} 
                  onEdit={(c) => {
                    setSelectedCategory(c);
                    setIsCategoryFormOpen(true);
                  }}
                  onDelete={async (id) => {
                    if (confirm('Deseja excluir esta categoria?')) {
                      await financeService.deleteCategory(id);
                      loadData();
                    }
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
                  onDelete={async (id) => {
                    if (confirm('Deseja excluir este centro de custo?')) {
                      await financeService.deleteCostCenter(id);
                      loadData();
                    }
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
                  onDelete={async (id) => {
                    if (confirm('Deseja excluir este método de pagamento?')) {
                      await financeService.deletePaymentMethod(id);
                      loadData();
                    }
                  }}
                  onNew={() => {
                    setSelectedPaymentMethod(undefined);
                    setIsPaymentMethodFormOpen(true);
                  }}
                />
              )}

              {activeSettingsTab === 'counterparties' && (
                <CounterpartyList 
                  counterparties={counterparties} 
                  onEdit={(cp) => {
                    setSelectedCounterparty(cp);
                    setIsCounterpartyFormOpen(true);
                  }}
                  onDelete={async (id) => {
                    if (confirm('Deseja excluir esta contraparte?')) {
                      await financeService.deleteCounterparty(id);
                      loadData();
                    }
                  }}
                  onNew={() => {
                    setSelectedCounterparty(undefined);
                    setIsCounterpartyFormOpen(true);
                  }}
                />
              )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TransactionForm 
        isOpen={isTransactionFormOpen}
        onClose={() => setIsTransactionFormOpen(false)}
        onSave={handleSaveTransaction}
        initialData={selectedTransaction}
        categories={categories}
        bankAccounts={bankAccounts}
        counterparties={counterparties}
        costCenters={costCenters}
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

      <CounterpartyForm 
        isOpen={isCounterpartyFormOpen}
        onClose={() => setIsCounterpartyFormOpen(false)}
        onSave={handleSaveCounterparty}
        initialData={selectedCounterparty}
      />

      <PaymentMethodForm 
        isOpen={isPaymentMethodFormOpen}
        onClose={() => setIsPaymentMethodFormOpen(false)}
        onSave={handleSavePaymentMethod}
        initialData={selectedPaymentMethod}
      />
    </div>
  );
};

export default FinanceOrganizador;
