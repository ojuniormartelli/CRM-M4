
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
  const incomeCategories = categories.filter(c => 
    (c.type === FinanceCategoryType.INCOME || c.type === FinanceCategoryType.BOTH) && !c.parent_id
  );

  const expenseCategories = categories.filter(c => 
    (c.type === FinanceCategoryType.EXPENSE || c.type === FinanceCategoryType.BOTH) && !c.parent_id
  );

  const renderCategory = (category: FinanceCategory, depth = 0, currentFilteredList: FinanceCategory[]) => {
    const children = currentFilteredList.filter(c => c.parent_id === category.id);
    
    return (
      <div key={category.id} className="space-y-2">
        <div 
          className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-blue-200 transition-all group shadow-sm hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              category.type === FinanceCategoryType.INCOME ? 'bg-emerald-50 text-emerald-600' : 
              category.type === FinanceCategoryType.EXPENSE ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {category.type === FinanceCategoryType.INCOME ? <TrendingUp size={16} /> : 
               category.type === FinanceCategoryType.EXPENSE ? <TrendingDown size={16} /> : <Layers size={16} />}
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-[13px] uppercase tracking-tight">{category.name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{category.classification_type}</span>
                {category.impacts_dre && (
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] font-black uppercase tracking-widest">DRE: {category.dre_group}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button 
              onClick={() => onNew(category.id)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Subcategoria"
            >
              <Plus size={14} />
            </button>
            <button 
              onClick={() => onEdit(category)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <Edit size={14} />
            </button>
            <button 
              onClick={() => onDelete(category.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        {children.length > 0 && (
          <div className="ml-4 pl-4 border-l-2 border-slate-50 dark:border-slate-800 space-y-2">
            {children.map(child => renderCategory(child, depth + 1, currentFilteredList))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna de Receitas */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] block">Entradas</span>
              <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Receitas</h4>
            </div>
            <div className="h-px flex-1 bg-emerald-100 dark:bg-emerald-900/30 ml-4" />
          </div>
          
          <div className="space-y-3">
            {incomeCategories.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhuma receita cadastrada</p>
              </div>
            ) : (
              incomeCategories.map(cat => renderCategory(cat, 0, categories))
            )}
          </div>
        </div>

        {/* Coluna de Despesas */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
              <TrendingDown size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] block">Saídas</span>
              <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Despesas</h4>
            </div>
            <div className="h-px flex-1 bg-rose-100 dark:bg-rose-900/30 ml-4" />
          </div>

          <div className="space-y-3">
            {expenseCategories.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhuma despesa cadastrada</p>
              </div>
            ) : (
              expenseCategories.map(cat => renderCategory(cat, 0, categories))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryList;
