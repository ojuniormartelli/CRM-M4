
import React from 'react';
import { FinanceCategory, FinanceCategoryType } from '../../types/finance';
import { Tag, Plus, ChevronRight, Edit, Trash2, TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface CategoryListProps {
  categories: FinanceCategory[];
  onEdit: (c: FinanceCategory) => void;
  onDelete: (id: string) => void;
  onNew: (parentId?: string) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, onEdit, onDelete, onNew }) => {
  const rootCategories = categories.filter(c => !c.parent_id);

  const renderCategory = (category: FinanceCategory, depth = 0) => {
    const children = categories.filter(c => c.parent_id === category.id);
    
    return (
      <div key={category.id} className="space-y-2">
        <div 
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 transition-all group"
          style={{ marginLeft: `${depth * 2}rem` }}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              category.type === FinanceCategoryType.INCOME ? 'bg-emerald-50 text-emerald-600' : 
              category.type === FinanceCategoryType.EXPENSE ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {category.type === FinanceCategoryType.INCOME ? <TrendingUp size={18} /> : 
               category.type === FinanceCategoryType.EXPENSE ? <TrendingDown size={18} /> : <Layers size={18} />}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{category.name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{category.classification_type}</span>
                {category.impacts_dre && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-widest">DRE: {category.dre_group}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
            <button 
              onClick={() => onNew(category.id)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Nova Subcategoria"
            >
              <Plus size={16} />
            </button>
            <button 
              onClick={() => onEdit(category)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <Edit size={16} />
            </button>
            <button 
              onClick={() => onDelete(category.id)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {children.map(child => renderCategory(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Plano de Categorias</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Estrutura para DRE e Fluxo de Caixa</p>
        </div>
        <button 
          onClick={() => onNew()}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Nova Categoria
        </button>
      </div>

      <div className="space-y-4">
        {rootCategories.length === 0 ? (
          <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-400 font-bold text-sm">Nenhuma categoria cadastrada.</p>
          </div>
        ) : (
          rootCategories.map(cat => renderCategory(cat))
        )}
      </div>
    </div>
  );
};

export default CategoryList;
