
import React, { useState } from 'react';
import { FinanceTransaction, FinanceBankAccount } from '../../types/finance';
import { X, CheckCircle2, Calendar, Building2 } from 'lucide-react';
import { financeUtils } from '../../utils/financeUtils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { paid_at: string, bank_account_id: string }) => void;
  transaction: FinanceTransaction;
  bankAccounts: FinanceBankAccount[];
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirm, transaction, bankAccounts }) => {
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState(transaction.bank_account_id || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Confirmar Baixa</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Liquidação de Lançamento</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lançamento</p>
            <p className="font-bold text-slate-900 dark:text-white">{transaction.description}</p>
            <p className={`text-lg font-black mt-2 ${financeUtils.getTypeColor(transaction.type)}`}>
              {financeUtils.formatCurrency(Number(transaction.amount))}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Data do Pagamento</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Conta de Liquidação</label>
              <div className="relative">
                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">Selecionar Conta</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          <button 
            onClick={() => onConfirm({ paid_at: paidAt, bank_account_id: bankAccountId })}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Confirmar Pagamento
          </button>
          <button onClick={onClose} className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest">
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
