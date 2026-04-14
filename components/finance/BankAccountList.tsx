
import React from 'react';
import { FinanceBankAccount } from '../../types/finance';
import { financeUtils } from '../../utils/financeUtils';
import { Building2, Edit, Trash2, Plus, CreditCard, Wallet, Landmark } from 'lucide-react';

interface BankAccountListProps {
  accounts: FinanceBankAccount[];
  onEdit: (a: FinanceBankAccount) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

const BankAccountList: React.FC<BankAccountListProps> = ({ accounts, onEdit, onDelete, onNew }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Contas Bancárias e Caixas</h3>
        <button 
          onClick={onNew}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(account => (
          <div key={account.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 flex items-center gap-2">
              <button onClick={() => onEdit(account)} className="p-2 text-slate-300 hover:text-blue-600 transition-all">
                <Edit size={18} />
              </button>
              <button onClick={() => onDelete(account.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white tracking-tight">{account.name}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{account.bank || 'Caixa Interno'}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Atual</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {financeUtils.formatCurrency(Number(account.current_balance))}
              </h3>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${account.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                {account.is_active ? 'Ativa' : 'Inativa'}
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {account.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BankAccountList;
