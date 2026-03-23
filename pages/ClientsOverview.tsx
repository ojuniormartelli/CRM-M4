
import React from 'react';
import { Company, Contact } from '../types';
import { ICONS } from '../constants';

interface ClientsOverviewProps {
  companies: Company[];
  contacts: Contact[];
  setActiveTab: (tab: string) => void;
  onNewCompany: () => void;
}

const ClientsOverview: React.FC<ClientsOverviewProps> = ({ companies, contacts, setActiveTab, onNewCompany }) => {
  const recentCompanies = [...companies]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Base de Clientes</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Visão Geral e Resumo</p>
        </div>
        <button 
          onClick={onNewCompany}
          className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-1"
        >
          <ICONS.Plus /> NOVA EMPRESA
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none space-y-8 pb-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ICONS.Clients width="32" height="32" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Empresas</p>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white">{companies.length}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ICONS.User width="32" height="32" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Contatos</p>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white">{contacts.length}</h3>
            </div>
          </div>
        </div>

        {/* Recent Companies */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Empresas Recentes</h3>
            <button 
              onClick={() => setActiveTab('companies')}
              className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
            >
              Ver Todas
            </button>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {recentCompanies.length > 0 ? (
              recentCompanies.map(company => (
                <div key={company.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-black">
                      {company.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{company.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black">{company.segment || 'Geral'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('companies')}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <ICONS.ArrowRight width="18" height="18" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-slate-400 font-bold italic">Nenhuma empresa cadastrada</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => setActiveTab('companies')}
            className="bg-slate-900 dark:bg-blue-600 p-8 rounded-[2.5rem] text-white flex items-center justify-between group hover:scale-[1.02] transition-all"
          >
            <div>
              <h4 className="text-xl font-black uppercase tracking-tight">Lista de Empresas</h4>
              <p className="text-blue-400 dark:text-blue-100 text-xs font-bold mt-1">Gerenciar cadastros jurídicos</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ICONS.ArrowRight />
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('contacts')}
            className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:scale-[1.02] transition-all"
          >
            <div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Lista de Contatos</h4>
              <p className="text-slate-400 text-xs font-bold mt-1">Gerenciar pessoas e decisores</p>
            </div>
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center group-hover:bg-slate-100 dark:group-hover:bg-slate-600 transition-colors text-slate-400">
              <ICONS.ArrowRight />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientsOverview;
