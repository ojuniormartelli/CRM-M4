
import React from 'react';
import { FinancePaymentMethod } from '../../types/finance';
import { Edit2, Trash2, Plus, CreditCard } from 'lucide-react';

interface PaymentMethodListProps {
  methods: FinancePaymentMethod[];
  onEdit: (method: FinancePaymentMethod) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

const PaymentMethodList: React.FC<PaymentMethodListProps> = ({ methods, onEdit, onDelete, onNew }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Métodos de Pagamento</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Formas aceitas e utilizadas</p>
        </div>
        <button 
          onClick={onNew}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          Novo Método
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {methods.map((method) => (
          <div key={method.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white tracking-tight">{method.name}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${method.is_active ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {method.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onEdit(method)}
                  className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-xl transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => onDelete(method.id)}
                  className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {methods.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 mx-auto shadow-sm">
              <CreditCard size={32} />
            </div>
            <div>
              <p className="text-slate-900 dark:text-white font-black tracking-tight">Nenhum método cadastrado</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Comece criando seu primeiro método de pagamento</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodList;
