
import React, { useState, useEffect } from 'react';
import { FinanceCounterparty, FinanceCounterpartyType } from '../../types/finance';
import { X, Users, Mail, Phone, FileText, Info } from 'lucide-react';

interface CounterpartyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cp: Partial<FinanceCounterparty>) => void;
  initialData?: Partial<FinanceCounterparty>;
}

const CounterpartyForm: React.FC<CounterpartyFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const defaultValues: Partial<FinanceCounterparty> = {
    name: '',
    type: FinanceCounterpartyType.SUPPLIER,
    document: '',
    email: '',
    phone: '',
    notes: ''
  };

  const [formData, setFormData] = useState<Partial<FinanceCounterparty>>(defaultValues);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...defaultValues, ...initialData });
    } else {
      setFormData(defaultValues);
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error in CounterpartyForm handleSubmit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {initialData?.id ? 'Editar Contraparte' : 'Nova Contraparte'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Cadastro de Terceiros</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Nome / Razão Social</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Fornecedor de Energia S.A."
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as FinanceCounterpartyType })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value={FinanceCounterpartyType.CUSTOMER}>Cliente</option>
                  <option value={FinanceCounterpartyType.SUPPLIER}>Fornecedor</option>
                  <option value={FinanceCounterpartyType.EMPLOYEE}>Colaborador</option>
                  <option value={FinanceCounterpartyType.PARTNER}>Parceiro</option>
                  <option value={FinanceCounterpartyType.OTHER}>Outro</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">CPF / CNPJ</label>
                <input
                  type="text"
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@empresa.com"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Notas adicionais..."
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all">
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                SALVANDO...
              </>
            ) : (
              'Salvar Contraparte'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CounterpartyForm;
