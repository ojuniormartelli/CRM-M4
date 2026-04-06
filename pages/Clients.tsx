import React, { useState } from 'react';
import { ICONS } from '../constants';
import { Client, User } from '../types';
import { supabase } from '../lib/supabase';

interface ClientsProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  currentUser: User | null;
}

const Clients: React.FC<ClientsProps> = ({ clients, setClients, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Base de Clientes</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gestão de contas e relacionamento.</p>
        </div>
        <div className="relative">
          <ICONS.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18" />
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none w-80 shadow-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                {client.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-lg">{client.name}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{client.company}</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <ICONS.Mail width="16" height="16" />
                <span className="text-sm font-bold">{client.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <ICONS.Phone width="16" height="16" />
                <span className="text-sm font-bold">{client.phone}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-800">
              <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                client.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                {client.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
              <button className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest hover:underline">Ver Detalhes</button>
            </div>
          </div>
        ))}
        {filteredClients.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-700 mx-auto">
              <ICONS.Clients width="40" height="40" />
            </div>
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
