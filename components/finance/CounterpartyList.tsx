
import React from 'react';
import { FinanceCounterparty } from '../../types/finance';
import { Users, Plus, Edit, Trash2, Mail, Phone, FileText } from 'lucide-react';

interface CounterpartyListProps {
  counterparties: FinanceCounterparty[];
  onEdit: (cp: FinanceCounterparty) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

const CounterpartyList: React.FC<CounterpartyListProps> = ({ counterparties, onEdit, onDelete, onNew }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Contrapartes</h3>
        <button 
          onClick={onNew}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Nova Contraparte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {counterparties.map(cp => (
          <div key={cp.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative">
            <div className="absolute top-0 right-0 p-6 flex items-center gap-2">
              <button onClick={() => onEdit(cp)} className="p-2 text-slate-300 hover:text-blue-600 transition-all">
                <Edit size={18} />
              </button>
              <button onClick={() => onDelete(cp.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white tracking-tight">{cp.name}</h4>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cp.type}</span>
              </div>
            </div>

            <div className="space-y-3">
              {cp.document && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText size={14} className="text-slate-400" />
                  <span className="font-medium">{cp.document}</span>
                </div>
              )}
              {cp.email && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Mail size={14} className="text-slate-400" />
                  <span className="font-medium">{cp.email}</span>
                </div>
              )}
              {cp.whatsapp && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone size={14} className="text-slate-400" />
                  <span className="font-medium">{cp.whatsapp}</span>
                </div>
              )}
            </div>

            {cp.notes && (
              <p className="mt-4 text-[10px] text-slate-400 font-medium line-clamp-1 italic">
                "{cp.notes}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CounterpartyList;
