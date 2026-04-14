
import React, { useState, useEffect } from 'react';
import { FinanceBankAccount, FinanceBankAccountType } from '../../types/finance';
import { X, Building2, Landmark, Wallet, CreditCard, Coins } from 'lucide-react';

interface BankAccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Partial<FinanceBankAccount>) => void;
  initialData?: Partial<FinanceBankAccount>;
}

const BankAccountForm: React.FC<BankAccountFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Partial<FinanceBankAccount>>({
    name: '',
    bank: '',
    type: FinanceBankAccountType.CHECKING,
    initial_balance: 0,
    initial_balance_date: new Date().toISOString().split('T')[0],
    is_active: true,
    currency: 'BRL',
    ...initialData
  });

  useEffect(() => {
    if (initialData) setFormData({ ...formData, ...initialData });
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {initialData?.id ? 'Editar Conta' : 'Nova Conta'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Disponibilidades</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Nome da Conta</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Itaú Principal"
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Banco</label>
                <input
                  type="text"
                  value={formData.bank}
                  onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                  placeholder="Ex: Itaú"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as FinanceBankAccountType })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value={FinanceBankAccountType.CHECKING}>Corrente</option>
                  <option value={FinanceBankAccountType.SAVINGS}>Poupança</option>
                  <option value={FinanceBankAccountType.CASH}>Caixa / Dinheiro</option>
                  <option value={FinanceBankAccountType.INVESTMENT}>Investimento</option>
                  <option value={FinanceBankAccountType.CREDIT_ACCOUNT}>Cartão de Crédito</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Saldo Inicial</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Data Saldo</label>
                <input
                  type="date"
                  value={formData.initial_balance_date}
                  onChange={(e) => setFormData({ ...formData, initial_balance_date: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all">
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            Salvar Conta
          </button>
        </div>
      </div>
    </div>
  );
};

export default BankAccountForm;
