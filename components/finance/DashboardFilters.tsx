
import React from 'react';
import { FinanceDashboardFilters, FinanceBankAccount, FinanceCategory, FinanceCostCenter } from '../../types/finance';
import { Calendar, Filter, Landmark, Tag, Target } from 'lucide-react';
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';

interface DashboardFiltersProps {
  filters: FinanceDashboardFilters;
  setFilters: (f: FinanceDashboardFilters) => void;
  bankAccounts: FinanceBankAccount[];
  categories: FinanceCategory[];
  costCenters: FinanceCostCenter[];
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({ 
  filters, 
  setFilters, 
  bankAccounts,
  categories,
  costCenters
}) => {
  const setQuickPeriod = (days: number) => {
    const start = new Date();
    const end = addDays(start, days);
    setFilters({
      ...filters,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
      <div className="flex flex-wrap items-center gap-6">
        {/* Período */}
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Período</label>
            <div className="flex gap-2">
              {[30, 60, 90].map(days => (
                <button 
                  key={days}
                  onClick={() => setQuickPeriod(days)}
                  className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
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

        {/* Conta Bancária */}
        <div className="min-w-[180px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Conta</label>
          <div className="relative">
            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select 
              value={filters.bankAccountId || ''}
              onChange={(e) => setFilters({ ...filters, bankAccountId: e.target.value || undefined })}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
            >
              <option value="">Todas as Contas</option>
              {bankAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Categoria */}
        <div className="min-w-[180px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Categoria</label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select 
              value={filters.categoryId || ''}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value || undefined })}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
            >
              <option value="">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
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

        {/* Modo */}
        <div className="min-w-[140px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Modo</label>
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
            {(['realized', 'projected', 'combined'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilters({ ...filters, mode })}
                className={`flex-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  filters.mode === mode 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {mode === 'realized' ? 'Real' : mode === 'projected' ? 'Proj' : 'Comb'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
