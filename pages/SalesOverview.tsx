
import React from 'react';
import { Lead, Pipeline } from '../types';
import { ICONS } from '../constants';

interface SalesOverviewProps {
  leads: Lead[];
  pipelines: Pipeline[];
  setActiveTab: (tab: string) => void;
  onNewLead: () => void;
}

const SalesOverview: React.FC<SalesOverviewProps> = ({ leads, pipelines, setActiveTab, onNewLead }) => {
  const activeLeads = leads.filter(l => l.status !== 'won' && l.status !== 'lost');
  
  const totalValue = activeLeads.reduce((acc, lead) => acc + (lead.value || 0), 0);
  
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Pipelines de Vendas</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Visão Geral e Desempenho</p>
        </div>
        <button 
          onClick={onNewLead}
          className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-1"
        >
          <ICONS.Plus /> NOVO LEAD
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none space-y-8 pb-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ICONS.Sales width="32" height="32" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads Ativos</p>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white">{activeLeads.length}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ICONS.Transactions width="32" height="32" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor em Pipeline</p>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
              </h3>
            </div>
          </div>
        </div>

        {/* Pipelines List */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight ml-2">Seus Funis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pipelines.map(pipeline => {
              const pipelineLeads = activeLeads.filter(l => l.pipeline_id === pipeline.id);
              const pipelineValue = pipelineLeads.reduce((acc, l) => acc + (l.value || 0), 0);
              
              return (
                <button 
                  key={pipeline.id}
                  onClick={() => setActiveTab(`pipeline_${pipeline.id}`)}
                  className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-blue-500 dark:hover:border-blue-400 transition-all text-left group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                      <ICONS.Sales width="20" height="20" />
                    </div>
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                      {pipelineLeads.length} leads
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{pipeline.name}</h4>
                  <p className="text-slate-400 text-xs font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pipelineValue)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Leads Recentes</h3>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {recentLeads.length > 0 ? (
              recentLeads.map(lead => (
                <div key={lead.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-black">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{lead.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                      lead.status === 'won' ? 'bg-emerald-50 text-emerald-600' :
                      lead.status === 'lost' ? 'bg-rose-50 text-rose-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-slate-400 font-bold italic">Nenhum lead cadastrado</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOverview;
