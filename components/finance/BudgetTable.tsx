
import React from 'react';
import { FinanceDreLine, FinanceBudget } from '../../types/finance';
import { financeUtils } from '../../utils/financeUtils';
import { ArrowUpRight, ArrowDownRight, Minus, Edit2 } from 'lucide-react';

interface BudgetTableProps {
  dreLines: FinanceDreLine[];
  budgets: FinanceBudget[];
  onEditBudget: (line: FinanceDreLine, currentBudget?: FinanceBudget) => void;
}

const BudgetTable: React.FC<BudgetTableProps> = ({ dreLines, budgets, onEditBudget }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Orçado x Realizado</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acompanhamento orçamentário por grupo</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50">
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grupo DRE</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Orçado</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Realizado</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Desvio (R$)</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Desvio (%)</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {dreLines.filter(l => !l.isSubtotal).map((line) => {
              const budget = budgets.find(b => b.dre_group === line.id || b.dre_group === line.group);
              const budgetAmount = budget?.amount || 0;
              const realizedAmount = Math.abs(line.amount);
              const deviation = realizedAmount - budgetAmount;
              const deviationPercent = budgetAmount !== 0 ? (deviation / budgetAmount) * 100 : 0;
              
              const isExpense = line.amount < 0;
              const isOverBudget = isExpense ? realizedAmount > budgetAmount : realizedAmount < budgetAmount;

              return (
                <tr key={line.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="px-8 py-4">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{line.label}</span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {financeUtils.formatCurrency(budgetAmount)}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className={`text-xs font-mono font-black ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {financeUtils.formatCurrency(realizedAmount)}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className={`text-xs font-mono font-bold ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {financeUtils.formatCurrency(deviation)}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {deviation !== 0 ? (
                        <>
                          {deviation > 0 ? <ArrowUpRight size={12} className={isOverBudget ? 'text-rose-500' : 'text-emerald-500'} /> : <ArrowDownRight size={12} className={isOverBudget ? 'text-rose-500' : 'text-emerald-500'} />}
                          <span className={`text-[10px] font-black ${isOverBudget ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {Math.abs(deviationPercent).toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <Minus size={12} className="text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <button 
                      onClick={() => onEditBudget(line, budget)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetTable;
