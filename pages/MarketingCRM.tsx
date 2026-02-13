
import React from 'react';
import { ICONS } from '../constants';

const MarketingCRM: React.FC = () => {
  const campaigns = [
    { name: 'Reativação de Leads Antigos', type: 'E-mail', status: 'Enviando', sent: 1240, open: '24%', click: '3.2%' },
    { name: 'Promoção Black November', type: 'Meta Ads', status: 'Ativa', sent: '-', open: '-', click: '1.8% CTR' },
    { name: 'Lançamento Tech Solutions', type: 'WhatsApp', status: 'Agendada', sent: 0, open: '-', click: '-' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Marketing CRM</h2>
          <p className="text-slate-500">Crie campanhas automatizadas para sua base.</p>
        </div>
        <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-100">
          Criar Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <ICONS.Mail />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">E-mails Enviados</p>
            <h4 className="text-xl font-black text-slate-800">45.230</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ICONS.MessageCircle />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp disparados</p>
            <h4 className="text-xl font-black text-slate-800">8.940</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-fuchsia-50 text-fuchsia-600 rounded-xl flex items-center justify-center">
            <ICONS.Automation />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Automações Ativas</p>
            <h4 className="text-xl font-black text-slate-800">12</h4>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Campanhas Recentes</h3>
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
            {campaigns.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-800 text-sm">{c.name}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-500">{c.type}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${c.status === 'Ativa' || c.status === 'Enviando' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <div className="flex gap-4 items-center">
                     <span className="text-xs font-bold text-slate-800">{c.click}</span>
                     {c.sent !== '-' && <span className="text-[10px] text-slate-400">Vol: {c.sent}</span>}
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><ICONS.Search /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketingCRM;
