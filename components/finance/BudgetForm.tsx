
import React, { useState, useEffect } from 'react';
import { FinanceBudget, FinanceBudgetScenario } from '../../types/finance';
import { X, Save, Target } from 'lucide-react';

interface BudgetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<FinanceBudget>) => Promise<void>;
  initialData?: Partial<FinanceBudget>;
  title: string;
}

const BudgetForm: React.FC<BudgetFormProps> = ({ isOpen, onClose, onSave, initialData, title }) => {
  const [formData, setFormData] = useState<Partial<FinanceBudget>>({
    amount: 0,
    scenario: 'realistic' as FinanceBudgetScenario,
    period: new Date().toISOString().slice(0, 7),
    ...initialData
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData });
    }
  }, [initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative z-[10000]">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Definir Orçamento</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{title}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valor Orçado (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
              <input 
                type="number" 
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full pl-12 pr-6 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cenário</label>
            <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl">
              {(['optimistic', 'realistic', 'pessimistic'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFormData({ ...formData, scenario: s })}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.scenario === s 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {s === 'optimistic' ? 'Otimista' : s === 'realistic' ? 'Realista' : 'Pessimista'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Período</label>
            <input 
              type="month" 
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              className="w-full px-6 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetForm;
