
import React, { useState, useEffect } from 'react';
import { FinanceCategory, FinanceCategoryType, FinanceClassificationType } from '../../types/finance';
import { X, Tag, Layers, TrendingUp, TrendingDown } from 'lucide-react';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Partial<FinanceCategory>) => void;
  initialData?: Partial<FinanceCategory>;
  categories: FinanceCategory[];
}

const CategoryForm: React.FC<CategoryFormProps> = ({ isOpen, onClose, onSave, initialData, categories }) => {
  const [isSaving, setIsSaving] = useState(false);
  const defaultValues: Partial<FinanceCategory> = {
    name: '',
    type: FinanceCategoryType.EXPENSE,
    classification_type: FinanceClassificationType.OPERATIONAL,
    impacts_dre: true,
    dre_group: 'Despesas Operacionais',
    is_active: true,
    level: 1,
    order: 0,
    parent_id: undefined
  };

  const [formData, setFormData] = useState<Partial<FinanceCategory>>(defaultValues);

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
      console.error('Error in CategoryForm handleSubmit:', error);
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
              {initialData?.id ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Plano de Contas</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Nome da Categoria</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Aluguel, Vendas, Marketing"
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Tipo de Categoria</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: FinanceCategoryType.INCOME })}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    formData.type === FinanceCategoryType.INCOME 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600' 
                    : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <TrendingUp size={18} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Receita</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: FinanceCategoryType.EXPENSE })}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    formData.type === FinanceCategoryType.EXPENSE 
                    ? 'border-rose-500 bg-rose-50 text-rose-600' 
                    : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <TrendingDown size={18} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Despesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: FinanceCategoryType.BOTH })}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    formData.type === FinanceCategoryType.BOTH 
                    ? 'border-blue-500 bg-blue-50 text-blue-600' 
                    : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <Layers size={18} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Ambos</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Classificação DRE</label>
              <select
                value={formData.classification_type || FinanceClassificationType.OPERATIONAL}
                onChange={(e) => setFormData({ ...formData, classification_type: e.target.value as FinanceClassificationType })}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value={FinanceClassificationType.OPERATIONAL}>Operacional</option>
                <option value={FinanceClassificationType.NON_OPERATIONAL}>Não Operacional</option>
                <option value={FinanceClassificationType.FINANCIAL}>Financeiro</option>
                <option value={FinanceClassificationType.TAX}>Tributário</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Categoria Pai (Opcional)</label>
              <select
                value={formData.parent_id || ''}
                onChange={(e) => {
                  const parent = categories.find(c => c.id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    parent_id: e.target.value || undefined,
                    level: parent ? parent.level + 1 : 1
                  });
                }}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Nenhuma (Raiz)</option>
                {categories.filter(c => c.id !== initialData?.id).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <input
                type="checkbox"
                id="impacts_dre"
                checked={formData.impacts_dre}
                onChange={(e) => setFormData({ ...formData, impacts_dre: e.target.checked })}
                className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="impacts_dre" className="text-xs font-bold text-blue-900 dark:text-blue-400 uppercase tracking-widest cursor-pointer">Impacta DRE</label>
            </div>

            {formData.impacts_dre && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Grupo DRE</label>
                <select
                  value={formData.dre_group || ''}
                  onChange={(e) => setFormData({ ...formData, dre_group: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="Receita Bruta">Receita Bruta</option>
                  <option value="Deduções">Deduções</option>
                  <option value="Custos (CPV/CSP)">Custos (CPV/CSP)</option>
                  <option value="Despesas Operacionais">Despesas Operacionais</option>
                  <option value="Despesas Financeiras">Despesas Financeiras</option>
                  <option value="Impostos">Impostos</option>
                </select>
              </div>
            )}
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
              'Salvar Categoria'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryForm;
