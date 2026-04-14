
import React, { useState } from 'react';
import { useFinanceDre } from '../../hooks/useFinanceDre';
import FinanceDreTable from './FinanceDreTable';
import FinanceDrillDown from './FinanceDrillDown';
import { FinanceCostCenter, FinanceDreLine } from '../../types/finance';
import { 
  Calendar, 
  Filter, 
  Target, 
  ArrowLeftRight, 
  History, 
  Loader2, 
  AlertTriangle,
  RefreshCcw,
  Download
} from 'lucide-react';
import { getTransactionsForCategory } from '../../utils/financeDreUtils';
import { parseISO } from 'date-fns';

interface FinanceDreViewProps {
  workspaceId: string;
  costCenters: FinanceCostCenter[];
}

const FinanceDreView: React.FC<FinanceDreViewProps> = ({ 
  workspaceId,
  costCenters
}) => {
  const { 
    loading, 
    error, 
    filters, 
    setFilters, 
    dreData, 
    transactions,
    refresh 
  } = useFinanceDre(workspaceId);

  const [drillDownLine, setDrillDownLine] = useState<FinanceDreLine | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Consolidando DRE Gerencial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 bg-rose-50 rounded-[2.5rem] border border-rose-100 text-center space-y-4">
        <AlertTriangle className="mx-auto text-rose-600" size={40} />
        <h3 className="text-lg font-black text-rose-900 tracking-tight">Erro ao processar DRE</h3>
        <p className="text-sm text-rose-600 font-medium">{error}</p>
        <button 
          onClick={refresh}
          className="px-6 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center gap-2 mx-auto"
        >
          <RefreshCcw size={16} />
          Recarregar
        </button>
      </div>
    );
  }

  const drillDownTransactions = drillDownLine?.categoryIds 
    ? getTransactionsForCategory(
        transactions, 
        drillDownLine.categoryIds, 
        filters.mode, 
        parseISO(filters.startDate), 
        parseISO(filters.endDate)
      )
    : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Filtros da DRE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          {/* Período */}
          <div className="flex-1 min-w-[240px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Período de Análise</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <span className="text-slate-300 font-bold">até</span>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Modo: Competência vs Caixa */}
          <div className="min-w-[160px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Regime</label>
            <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setFilters({ ...filters, mode: 'competence' })}
                className={`flex-1 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  filters.mode === 'competence' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Competência
              </button>
              <button
                onClick={() => setFilters({ ...filters, mode: 'cash' })}
                className={`flex-1 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  filters.mode === 'cash' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Caixa
              </button>
            </div>
          </div>

          {/* Comparativo */}
          <div className="min-w-[180px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Comparativo</label>
            <div className="relative">
              <History className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <select 
                value={filters.comparisonMode}
                onChange={(e) => setFilters({ ...filters, comparisonMode: e.target.value as any })}
                className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
              >
                <option value="none">Sem Comparação</option>
                <option value="previous_period">Período Anterior</option>
                <option value="previous_year">Ano Anterior (YoY)</option>
              </select>
            </div>
          </div>

          {/* Centro de Custo */}
          <div className="min-w-[180px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Centro de Custo</label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <select 
                value={filters.costCenterId || ''}
                onChange={(e) => setFilters({ ...filters, costCenterId: e.target.value || undefined })}
                className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
              >
                <option value="">Todos os Centros</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela DRE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">DRE Gerencial</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {dreData.periodLabel} {filters.comparisonMode !== 'none' && `vs ${dreData.comparisonLabel}`}
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-all">
            <Download size={14} />
            Exportar PDF
          </button>
        </div>
        
        <FinanceDreTable 
          lines={dreData.lines} 
          comparisonMode={filters.comparisonMode}
          onDrillDown={(line) => setDrillDownLine(line)}
        />
      </div>

      {/* Drill Down */}
      <FinanceDrillDown 
        isOpen={!!drillDownLine}
        onClose={() => setDrillDownLine(null)}
        transactions={drillDownTransactions}
        title={drillDownLine?.label || ''}
        mode={filters.mode}
      />
    </div>
  );
};

export default FinanceDreView;
