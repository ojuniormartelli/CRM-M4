
import React, { useState, useEffect } from 'react';
import { FinanceCostCenter } from '../../types/finance';
import { X, Target, Hash, FileText } from 'lucide-react';

interface CostCenterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cc: Partial<FinanceCostCenter>) => void;
  initialData?: Partial<FinanceCostCenter>;
}

const CostCenterForm: React.FC<CostCenterFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Partial<FinanceCostCenter>>({
    name: '',
    code: '',
    description: '',
    is_active: true,
    order: 0,
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
              {initialData?.id ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão Setorial</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Nome do Centro de Custo</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Marketing, Vendas, TI"
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Código (Opcional)</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: CC-001"
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Breve descrição do centro de custo..."
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
            className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            Salvar Centro de Custo
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostCenterForm;
