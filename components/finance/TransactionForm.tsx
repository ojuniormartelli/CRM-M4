
import React, { useState, useEffect } from 'react';
import { 
  FinanceTransaction, 
  FinanceTransactionType, 
  FinanceTransactionStatus,
  FinanceCategory,
  FinanceBankAccount,
  FinanceCounterparty,
  FinanceCostCenter
} from '../../types/finance';
import { X, Calendar, Tag, Building2, Users, Info, Repeat } from 'lucide-react';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Partial<FinanceTransaction>) => void;
  initialData?: Partial<FinanceTransaction>;
  categories: FinanceCategory[];
  bankAccounts: FinanceBankAccount[];
  counterparties: FinanceCounterparty[];
  costCenters: FinanceCostCenter[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData,
  categories,
  bankAccounts,
  counterparties,
  costCenters
}) => {
  const [formData, setFormData] = useState<Partial<FinanceTransaction>>({
    type: FinanceTransactionType.EXPENSE,
    status: FinanceTransactionStatus.PENDING,
    description: '',
    amount: 0,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    competence_date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurrence_frequency: 'monthly',
    recurrence_interval: 1,
    ...initialData
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData });
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {initialData?.id ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Financeiro Empresarial</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-none">
          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: FinanceTransactionType.INCOME })}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                formData.type === FinanceTransactionType.INCOME 
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600' 
                : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
              }`}
            >
              <TrendingUp size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Receita</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: FinanceTransactionType.EXPENSE })}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                formData.type === FinanceTransactionType.EXPENSE 
                ? 'border-rose-500 bg-rose-50 text-rose-600' 
                : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
              }`}
            >
              <TrendingDown size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Despesa</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Descrição</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Pagamento Fornecedor X"
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as FinanceTransactionStatus })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value={FinanceTransactionStatus.PENDING}>Pendente</option>
                  <option value={FinanceTransactionStatus.PAID}>Pago / Recebido</option>
                  <option value={FinanceTransactionStatus.DRAFT}>Rascunho</option>
                  <option value={FinanceTransactionStatus.CANCELED}>Cancelado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Emissão</label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Vencimento</label>
                <input
                  type="date"
                  required
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Competência</label>
                <input
                  type="date"
                  required
                  value={formData.competence_date}
                  onChange={(e) => setFormData({ ...formData, competence_date: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Conta Bancária</label>
                <select
                  required
                  value={formData.bank_account_id}
                  onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">Selecionar Conta</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Categoria</label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">Selecionar Categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Contraparte</label>
                <select
                  value={formData.counterparty_id}
                  onChange={(e) => setFormData({ ...formData, counterparty_id: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">Selecionar Favorecido</option>
                  {counterparties.map(cp => (
                    <option key={cp.id} value={cp.id}>{cp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Centro de Custo</label>
                <select
                  value={formData.cost_center_id}
                  onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">Selecionar Centro de Custo</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recurrence */}
            <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Repeat size={18} className="text-blue-600" />
                  <span className="text-sm font-black text-blue-900 dark:text-blue-400 uppercase tracking-widest">Recorrência</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_recurring: !formData.is_recurring })}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.is_recurring ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_recurring ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
              
              {formData.is_recurring && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 block">Frequência</label>
                    <select
                      value={formData.recurrence_frequency}
                      onChange={(e) => setFormData({ ...formData, recurrence_frequency: e.target.value as any })}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 block">Intervalo</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.recurrence_interval}
                      onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}
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
            Salvar Lançamento
          </button>
        </div>
      </div>
    </div>
  );
};

const TrendingUp = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
);

const TrendingDown = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
);

export default TransactionForm;
