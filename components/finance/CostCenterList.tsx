
import React from 'react';
import { FinanceCostCenter } from '../../types/finance';
import { Target, Plus, Edit, Trash2, Hash } from 'lucide-react';

interface CostCenterListProps {
  costCenters: FinanceCostCenter[];
  onEdit: (cc: FinanceCostCenter) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

const CostCenterList: React.FC<CostCenterListProps> = ({ costCenters, onEdit, onDelete, onNew }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Centros de Custo</h3>
        <button 
          onClick={onNew}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Novo Centro de Custo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {costCenters.map(cc => (
          <div key={cc.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative">
            <div className="absolute top-0 right-0 p-6 flex items-center gap-2">
              <button onClick={() => onEdit(cc)} className="p-2 text-slate-300 hover:text-blue-600 transition-all">
                <Edit size={18} />
              </button>
              <button onClick={() => onDelete(cc.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-2xl flex items-center justify-center">
                <Target size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white tracking-tight">{cc.name}</h4>
                {cc.code && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Hash size={10} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cc.code}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
              {cc.description || 'Sem descrição.'}
            </p>

            <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${cc.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                {cc.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CostCenterList;
