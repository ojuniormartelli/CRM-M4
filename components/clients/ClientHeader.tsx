import React from 'react';
import { M4Client } from '../../types';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface ClientHeaderProps {
  activeClient: M4Client;
  onBack: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({
  activeClient,
  onBack,
  onArchive,
  onDelete,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-start gap-5">
        <button
          onClick={onBack}
          className="p-3 bg-slate-50 hover:bg-slate-150 rounded-2xl text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-all self-center"
          title="Voltar para a listagem"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeClient.company_name}
            </h2>
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
              activeClient.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
              activeClient.status === 'paused' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
              'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            }`}>
              {activeClient.status === 'active' ? 'Ativo' : activeClient.status === 'paused' ? 'Pausado' : 'Churn'}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1 flex items-center gap-3">
            <span>Início do Contrato: <strong className="text-slate-800 dark:text-white">{activeClient.contract_start_date ? format(new Date(activeClient.contract_start_date), 'dd/MM/yyyy') : 'Não definido'}</strong></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span>MRR Mensal: <strong className="text-slate-950 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeClient.monthly_value || 0)}</strong></span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {activeClient.status !== 'churned' && (
          <button
            onClick={onArchive}
            className="px-5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all dark:bg-amber-950/20 dark:text-amber-400"
          >
            Arquivar Conta
          </button>
        )}
        <button
          onClick={onDelete}
          className="px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all dark:bg-rose-950/20 dark:text-rose-400"
        >
          Excluir Cliente
        </button>
      </div>
    </div>
  );
};
