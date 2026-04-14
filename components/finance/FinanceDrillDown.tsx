
import React from 'react';
import { FinanceTransaction, FinanceDreMode } from '../../types/finance';
import { financeUtils } from '../../utils/financeUtils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface FinanceDrillDownProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: FinanceTransaction[];
  title: string;
  mode: FinanceDreMode;
}

const FinanceDrillDown: React.FC<FinanceDrillDownProps> = ({ 
  isOpen, 
  onClose, 
  transactions, 
  title,
  mode
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Detalhamento de Lançamentos ({mode === 'competence' ? 'Competência' : 'Caixa'})
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-none">
          {transactions.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum lançamento encontrado.</p>
            </div>
          ) : (
            transactions.map((t) => (
              <div 
                key={t.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-blue-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {t.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{t.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium text-slate-400">
                        {format(parseISO(mode === 'competence' ? t.competence_date : t.paid_at!), 'dd/MM/yyyy')}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        {t.category?.name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${
                    t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {t.type === 'expense' ? '-' : ''}{financeUtils.formatCurrency(t.amount)}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">
                    {t.bank_account?.name}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total do Grupo</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {financeUtils.formatCurrency(transactions.reduce((acc, t) => acc + (t.type === 'expense' ? -Number(t.amount) : Number(t.amount)), 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDrillDown;
