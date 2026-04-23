
import React, { useState, useEffect } from 'react';
import { 
  FinanceTransaction, 
  FinanceTransactionType, 
  FinanceTransactionStatus,
  FinanceBankAccount
} from '../../types/finance';
import { X, Calendar, RefreshCcw, DollarSign, FileText } from 'lucide-react';

interface TransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Partial<FinanceTransaction>) => void;
  bankAccounts: FinanceBankAccount[];
}

const TransferForm: React.FC<TransferFormProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  bankAccounts
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<FinanceTransaction>>({
    type: FinanceTransactionType.TRANSFER,
    status: FinanceTransactionStatus.PAID,
    description: '',
    amount: 0,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    bank_account_id: '',
    destination_bank_account_id: ''
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        type: FinanceTransactionType.TRANSFER,
        status: FinanceTransactionStatus.PAID,
        description: '',
        amount: 0,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        bank_account_id: '',
        destination_bank_account_id: ''
      });
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    if (!formData.bank_account_id || !formData.destination_bank_account_id) {
      alert('Por favor, selecione as contas de origem e destino.');
      return;
    }

    if (formData.bank_account_id === formData.destination_bank_account_id) {
      alert('A conta de origem não pode ser a mesma que a conta de destino.');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      alert('Por favor, informe um valor válido para a transferência.');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        due_date: formData.issue_date, // For transfers, issue and due are usually same
        competence_date: formData.issue_date
      });
    } catch (error: any) {
      console.error('Error in TransferForm handleSubmit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center">
              <RefreshCcw size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Nova Transferência</h3>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Origem</label>
              <select
                required
                value={formData.bank_account_id || ''}
                onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
              >
                <option value="">Selecione...</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Destino</label>
              <select
                required
                value={formData.destination_bank_account_id || ''}
                onChange={(e) => setFormData({ ...formData, destination_bank_account_id: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
              >
                <option value="">Selecione...</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Valor</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Data</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Descrição (Opcional)</label>
            <div className="relative">
              <FileText size={16} className="absolute left-6 top-6 text-slate-400" />
              <textarea
                placeholder="Ex: Transferência entre contas"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose} 
              className="px-6 py-4 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-sm font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-6 py-4 bg-[#40C4FF] text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-100 hover:scale-105 transition-all disabled:opacity-50"
            >
              {isSaving ? 'TRANSFERINDO...' : 'Transferir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferForm;
