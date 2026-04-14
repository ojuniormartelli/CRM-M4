
import React from 'react';
import { FinanceTransaction, FinanceTransactionType, FinanceTransactionStatus } from '../../types/finance';
import { financeUtils } from '../../utils/financeUtils';
import { MoreVertical, ArrowUpRight, ArrowDownLeft, Tag, Building2, Calendar, Repeat } from 'lucide-react';

interface TransactionListProps {
  transactions: FinanceTransaction[];
  onEdit: (t: FinanceTransaction) => void;
  onDelete: (id: string) => void;
  onConfirm: (t: FinanceTransaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onEdit, onDelete, onConfirm }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Descrição</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Conta</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-20 text-center">
                  <p className="text-slate-400 font-bold text-sm">Nenhum lançamento encontrado.</p>
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        transaction.type === FinanceTransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 
                        transaction.type === FinanceTransactionType.EXPENSE ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {transaction.type === FinanceTransactionType.INCOME ? <ArrowDownLeft size={18} /> : 
                         transaction.type === FinanceTransactionType.EXPENSE ? <ArrowUpRight size={18} /> : <Repeat size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{transaction.description}</p>
                          {transaction.is_recurring && <Repeat size={12} className="text-blue-500" />}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                          Venc: {financeUtils.formatDate(transaction.due_date)}
                          {transaction.paid_at && ` • Pago: ${financeUtils.formatDate(transaction.paid_at)}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{transaction.category?.name || 'Geral'}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{transaction.bank_account?.name || 'Caixa'}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <p className={`text-sm font-black ${financeUtils.getTypeColor(transaction.type)}`}>
                      {transaction.type === FinanceTransactionType.INCOME ? '+' : '-'} {financeUtils.formatCurrency(Number(transaction.amount))}
                    </p>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${financeUtils.getStatusColor(transaction.status)}`}>
                      {financeUtils.getStatusLabel(transaction.status)}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {transaction.status !== FinanceTransactionStatus.PAID && (
                        <button 
                          onClick={() => onConfirm(transaction)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                        >
                          Baixar
                        </button>
                      )}
                      <button 
                        onClick={() => onEdit(transaction)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;
