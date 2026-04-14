
import React from 'react';
import { CashFlowEntry } from '../../types/finance';
import { financeUtils } from '../../utils/financeUtils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CashFlowTableProps {
  cashFlow: CashFlowEntry[];
}

const CashFlowTable: React.FC<CashFlowTableProps> = ({ cashFlow }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 dark:border-slate-800">
        <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Detalhamento Diário</h4>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo de caixa analítico</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50">
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Entradas</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saídas</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Resultado</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acumulado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {cashFlow.map((entry, index) => (
              <tr key={index} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-all group">
                <td className="px-8 py-4">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {format(parseISO(entry.date), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  <p className="text-[10px] font-medium text-slate-400 capitalize">
                    {format(parseISO(entry.date), "EEEE", { locale: ptBR })}
                  </p>
                </td>
                <td className="px-8 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    entry.type === 'realized' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {entry.type === 'realized' ? 'Realizado' : 'Projetado'}
                  </span>
                </td>
                <td className="px-8 py-4 text-right">
                  <span className={`text-xs font-bold ${entry.entries > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {entry.entries > 0 ? financeUtils.formatCurrency(entry.entries) : '-'}
                  </span>
                </td>
                <td className="px-8 py-4 text-right">
                  <span className={`text-xs font-bold ${entry.exits > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {entry.exits > 0 ? financeUtils.formatCurrency(entry.exits) : '-'}
                  </span>
                </td>
                <td className="px-8 py-4 text-right">
                  <span className={`text-xs font-black ${entry.result > 0 ? 'text-emerald-600' : entry.result < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {financeUtils.formatCurrency(entry.result)}
                  </span>
                </td>
                <td className="px-8 py-4 text-right">
                  <span className={`text-xs font-black ${entry.accumulated < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                    {financeUtils.formatCurrency(entry.accumulated)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashFlowTable;
