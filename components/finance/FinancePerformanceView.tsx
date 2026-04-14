
import React, { useState } from 'react';
import { useFinanceDre } from '../../hooks/useFinanceDre';
import { useFinanceDashboard } from '../../hooks/useFinanceDashboard';
import { useFinanceBudget } from '../../hooks/useFinanceBudget';
import { useFinanceKpis } from '../../hooks/useFinanceKpis';
import FinanceKpiCards from './FinanceKpiCards';
import BudgetTable from './BudgetTable';
import FinanceAlertsPanel from './FinanceAlertsPanel';
import BudgetForm from './BudgetForm';
import { FinanceBudget, FinanceBudgetScenario, FinanceDreLine } from '../../types/finance';
import { 
  TrendingUp, 
  Target, 
  AlertCircle, 
  Loader2, 
  AlertTriangle,
  RefreshCcw,
  BarChart,
  LineChart
} from 'lucide-react';
import { format } from 'date-fns';

interface FinancePerformanceViewProps {
  workspaceId: string;
}

const FinancePerformanceView: React.FC<FinancePerformanceViewProps> = ({ workspaceId }) => {
  const [scenario, setScenario] = useState<FinanceBudgetScenario>('realistic');
  const currentPeriod = format(new Date(), 'yyyy-MM');

  // Load DRE for KPIs
  const { dreData, loading: dreLoading, error: dreError, transactions } = useFinanceDre(workspaceId);
  
  // Load Dashboard for Cash Flow KPIs
  const { cashFlow, loading: dashLoading } = useFinanceDashboard(workspaceId);

  // Load Budgets
  const { budgets, loading: budgetLoading, saveBudget, refresh: refreshBudgets } = useFinanceBudget(workspaceId, undefined, scenario);

  // Calculate KPIs and Alerts
  const { kpis, alerts } = useFinanceKpis(dreData.lines, [], cashFlow, budgets);

  // Budget Form State
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<FinanceDreLine | null>(null);
  const [editingBudget, setEditingBudget] = useState<Partial<FinanceBudget> | undefined>();

  const handleEditBudget = (line: FinanceDreLine, currentBudget?: FinanceBudget) => {
    setSelectedLine(line);
    setEditingBudget(currentBudget || { dre_group: line.id, period: currentPeriod, scenario });
    setIsBudgetFormOpen(true);
  };

  const handleSaveBudget = async (data: Partial<FinanceBudget>) => {
    await saveBudget(data);
    setIsBudgetFormOpen(false);
    refreshBudgets();
  };

  const isLoading = dreLoading || dashLoading || budgetLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Processando performance financeira...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header & Scenario Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Performance & Planejamento</h3>
          <p className="text-xs font-medium text-slate-400 mt-1">Análise de indicadores, margens e controle orçamentário.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl">
          {(['optimistic', 'realistic', 'pessimistic'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                scenario === s 
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {s === 'optimistic' ? 'Otimista' : s === 'realistic' ? 'Realista' : 'Pessimista'}
            </button>
          ))}
        </div>
      </div>

      {/* Alertas */}
      <FinanceAlertsPanel alerts={alerts} />

      {/* KPI Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-4">
          <TrendingUp size={18} className="text-blue-600" />
          <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Indicadores de Resultado</h4>
        </div>
        <FinanceKpiCards kpis={kpis} />
      </div>

      {/* Orçado x Realizado */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-4">
          <Target size={18} className="text-blue-600" />
          <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Controle Orçamentário</h4>
        </div>
        <BudgetTable 
          dreLines={dreData.lines} 
          budgets={budgets} 
          onEditBudget={handleEditBudget}
        />
      </div>

      {/* Budget Form Modal */}
      <BudgetForm 
        isOpen={isBudgetFormOpen}
        onClose={() => setIsBudgetFormOpen(false)}
        onSave={handleSaveBudget}
        initialData={editingBudget}
        title={selectedLine?.label || ''}
      />
    </div>
  );
};

export default FinancePerformanceView;
