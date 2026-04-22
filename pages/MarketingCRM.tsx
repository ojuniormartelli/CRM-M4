
import React from 'react';
import { ICONS } from '../constants';
import { Lead } from '../types';

interface MarketingCRMProps {
  leads: Lead[];
  campaigns: any[];
}

const MarketingCRM: React.FC<MarketingCRMProps> = ({ leads, campaigns }) => {
  const totalAudience = leads.length;
  const emailAudience = leads.filter(l => l.email || l.contact_email || l.company_email).length;
  const whatsappAudience = leads.filter(l => l.whatsapp || l.contact_whatsapp || l.company_whatsapp).length;

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Marketing CRM</h2>
          <p className="text-slate-500">Crie campanhas automatizadas para sua base de {totalAudience} contatos.</p>
        </div>
        <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
          Criar Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <ICONS.Mail />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Audiência E-mail</p>
            <h4 className="text-xl font-black text-slate-800 dark:text-white">{emailAudience}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ICONS.MessageCircle />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Audiência WhatsApp</p>
            <h4 className="text-xl font-black text-slate-800 dark:text-white">{whatsappAudience}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-fuchsia-50 text-fuchsia-600 rounded-xl flex items-center justify-center">
            <ICONS.Automation />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Segmentos IA</p>
            <h4 className="text-xl font-black text-slate-800 dark:text-white">5</h4>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-white">Campanhas Recentes</h3>
          <div className="flex gap-2">
             <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">TODAS</span>
             <span className="px-3 py-1 text-slate-400 text-[10px] font-bold rounded-full">ATIVAS</span>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Nome da Campanha</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Cliques/Taxas</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                  Nenhuma campanha encontrada. Crie sua primeira campanha para começar!
                </td>
              </tr>
            ) : (
              campaigns.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-white text-sm">{c.name}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{c.type}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${c.status === 'Ativa' || c.status === 'Enviando' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex gap-4 items-center">
                       <span className="text-xs font-bold text-slate-800 dark:text-white">{c.click_rate}</span>
                       {c.sent_count > 0 && <span className="text-[10px] text-slate-400">Vol: {c.sent_count}</span>}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><ICONS.Search /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketingCRM;
