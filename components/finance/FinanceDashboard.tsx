
import React from 'react';
import { useFinanceDashboard } from '../../hooks/useFinanceDashboard';
import FinanceSummaryCards from './FinanceSummaryCards';
import CashFlowCharts from './CashFlowCharts';
import CashFlowTable from './CashFlowTable';
import DashboardFilters from './DashboardFilters';
import { FinanceCategory, FinanceCostCenter } from '../../types/finance';
import { Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';

interface FinanceDashboardProps {
  workspaceId: string;
  categories: FinanceCategory[];
  costCenters: FinanceCostCenter[];
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ 
  workspaceId,
  categories,
  costCenters
}) => {
  const { 
    bankAccounts, 
    loading, 
    error, 
    filters, 
    setFilters, 
    stats, 
    cashFlow,
    refresh 
  } = useFinanceDashboard(workspaceId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando inteligência financeira...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 bg-rose-50 rounded-[2.5rem] border border-rose-100 text-center space-y-4">
        <AlertTriangle className="mx-auto text-rose-600" size={40} />
        <h3 className="text-lg font-black text-rose-900 tracking-tight">Ops! Algo deu errado.</h3>
        <p className="text-sm text-rose-600 font-medium">{error}</p>
        <button 
          onClick={refresh}
          className="px-6 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center gap-2 mx-auto"
        >
          <RefreshCcw size={16} />
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Filtros */}
      <DashboardFilters 
        filters={filters}
        setFilters={setFilters}
        bankAccounts={bankAccounts}
        categories={categories}
        costCenters={costCenters}
      />

      {/* Cards de Resumo */}
      <FinanceSummaryCards stats={stats} />

      {/* Gráficos */}
      <CashFlowCharts cashFlow={cashFlow} stats={stats} />

      {/* Tabela de Fluxo */}
      <CashFlowTable cashFlow={cashFlow} />

      {/* Alertas e Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.overdueCount > 0 && (
          <div className="bg-rose-50 p-6 rounded-[2.5rem] border border-rose-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900 tracking-tight">Atenção ao Fluxo de Caixa</h4>
              <p className="text-xs text-rose-700 font-medium mt-1">
                Existem {stats.overdueCount} lançamentos vencidos totalizando {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.overdueAmount)}. 
                Isso impacta negativamente sua projeção de saldo imediata.
              </p>
            </div>
          </div>
        )}

        {stats.next7DaysAmount > 0 && (
          <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
              <RefreshCcw size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-blue-900 tracking-tight">Próximos 7 Dias</h4>
              <p className="text-xs text-blue-700 font-medium mt-1">
                Você tem {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.next7DaysAmount)} previstos para vencer nos próximos 7 dias. 
                Certifique-se de ter saldo disponível.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceDashboard;
