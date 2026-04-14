
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FinanceTransaction, 
  FinanceBankAccount, 
  FinanceCategory, 
  FinanceCostCenter,
  FinanceCounterparty,
  FinanceTransactionType, 
  FinanceTransactionStatus 
} from '../types/finance';
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
  LineChart
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

interface FinanceOrganizadorProps {
  currentUser?: User | null;
  activeTab?: string;
}

type FinanceTab = 'dashboard' | 'dre' | 'performance' | 'transactions' | 'accounts' | 'categories' | 'cost_centers' | 'counterparties';

const FinanceOrganizador: React.FC<FinanceOrganizadorProps> = ({ currentUser, activeTab: externalActiveTab }) => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinanceBankAccount[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [costCenters, setCostCenters] = useState<FinanceCostCenter[]>([]);
  const [counterparties, setCounterparties] = useState<FinanceCounterparty[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
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

  useEffect(() => {
    if (externalActiveTab && externalActiveTab.startsWith('finance_')) {
      const tab = externalActiveTab.replace('finance_', '') as FinanceTab;
      // Map some names if they differ
      const tabMap: Record<string, FinanceTab> = {
        'accounts': 'accounts',
        'categories': 'categories',
        'cost_centers': 'cost_centers',
        'counterparties': 'counterparties',
        'dashboard': 'dashboard',
        'dre': 'dre',
        'performance': 'performance',
        'transactions': 'transactions'
      };
      if (tabMap[tab]) {
        setActiveTab(tabMap[tab]);
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
      const workspaceId = currentUser!.workspace_id!;
      const [transData, accountsData, catsData, ccData, cpData] = await Promise.all([
        financeService.getTransactions(workspaceId),
        financeService.getBankAccounts(workspaceId),
        financeService.getCategories(workspaceId),
        financeService.getCostCenters(workspaceId),
        financeService.getCounterparties(workspaceId)
      ]);
      setTransactions(transData);
      setBankAccounts(accountsData);
      setCategories(catsData);
      setCostCenters(ccData);
      setCounterparties(cpData);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setIsLoading(false);
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
      if (data.id) {
        await financeService.updateTransaction(data.id, data);
      } else {
        await financeService.createTransaction({
          ...data,
          workspace_id: currentUser!.workspace_id!,
          created_by: currentUser!.id,
          updated_by: currentUser!.id
        });
      }
      setIsTransactionFormOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleConfirmPayment = async (data: { paid_at: string, bank_account_id: string }) => {
    if (!transactionToConfirm) return;
    try {
      await financeService.confirmPayment(transactionToConfirm.id, data);
      setIsPaymentModalOpen(false);
      setTransactionToConfirm(null);
      loadData();
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

  const handleSaveBankAccount = async (data: Partial<FinanceBankAccount>) => {
    try {
      if (data.id) {
        await financeService.updateBankAccount(data.id, data);
      } else {
        await financeService.createBankAccount({ ...data, workspace_id: currentUser!.workspace_id! });
      }
      setIsBankAccountFormOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving bank account:', error);
    }
  };

  const handleSaveCategory = async (data: Partial<FinanceCategory>) => {
    try {
      if (data.id) {
        await financeService.updateCategory(data.id, data);
      } else {
        await financeService.createCategory({ ...data, workspace_id: currentUser!.workspace_id! });
      }
      setIsCategoryFormOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleSaveCostCenter = async (data: Partial<FinanceCostCenter>) => {
    try {
      if (data.id) {
        await financeService.updateCostCenter(data.id, data);
      } else {
        await financeService.createCostCenter({ ...data, workspace_id: currentUser!.workspace_id! });
      }
      setIsCostCenterFormOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving cost center:', error);
    }
  };

  const handleSaveCounterparty = async (data: Partial<FinanceCounterparty>) => {
    try {
      if (data.id) {
        await financeService.updateCounterparty(data.id, data);
      } else {
        await financeService.createCounterparty({ ...data, workspace_id: currentUser!.workspace_id! });
      }
      setIsCounterpartyFormOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving counterparty:', error);
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
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 w-fit rounded-2xl">
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
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Tag size={16} />
          Categorias
        </button>
        <button 
          onClick={() => setActiveTab('cost_centers')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cost_centers' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Target size={16} />
          Centros de Custo
        </button>
        <button 
          onClick={() => setActiveTab('counterparties')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'counterparties' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={16} />
          Contrapartes
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-500">
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

        {activeTab === 'categories' && (
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

        {activeTab === 'cost_centers' && (
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

        {activeTab === 'counterparties' && (
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
    </div>
  );
};

export default FinanceOrganizador;
