
import React from 'react';
import { ICONS } from '../constants';

const ContactCenter: React.FC = () => {
  const channels = [
    { name: 'WhatsApp', icon: ICONS.MessageCircle, status: 'Conectado', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { name: 'E-mail Agência', icon: ICONS.Mail, status: 'Sincronizado', color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: 'Telefonia IP', icon: ICONS.Phone, status: 'Pendente', color: 'text-amber-500', bg: 'bg-amber-50' },
    { name: 'Instagram DM', icon: ICONS.Automation, status: 'Conectado', color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
  ];

  const queues = [
    { customer: 'João Silva', time: '12:45', channel: 'WhatsApp', agent: 'Julia S.' },
    { customer: 'Beatriz Costa', time: '13:02', channel: 'E-mail', agent: 'Livre' },
    { customer: 'Marcos Paulo', time: '13:10', channel: 'WhatsApp', agent: 'Livre' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Contact Center</h2>
          <p className="text-slate-500">Comunicação omnichannel centralizada.</p>
        </div>
        <button className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-200">
          Configurar Canais
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {channels.map((ch, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className={`w-12 h-12 ${ch.bg} ${ch.color} rounded-xl flex items-center justify-center mb-4`}>
              <ch.icon />
            </div>
            <h3 className="font-bold text-slate-800">{ch.name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${ch.status === 'Conectado' || ch.status === 'Sincronizado' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{ch.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Fila de Atendimento</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Canal</th>
                <th className="px-6 py-4">Aguardando</th>
                <th className="px-6 py-4">Agente</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {queues.map((q, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{q.customer}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600">{q.channel}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{q.time}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${q.agent === 'Livre' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {q.agent}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 font-bold text-xs hover:underline">ASSUMIR</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">KPIs de Conversa</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold mb-2 uppercase">
                <span className="text-slate-500">SLA de Resposta</span>
                <span className="text-emerald-600">92%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[92%]"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-2 uppercase">
                <span className="text-slate-500">Canais Ativos</span>
                <span className="text-blue-600">3/4</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-[75%]"></div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Tempo Médio</p>
            <h4 className="text-2xl font-black text-slate-800">14min</h4>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactCenter;
