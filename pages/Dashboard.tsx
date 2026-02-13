
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { COLORS, ICONS } from '../constants';

const data = [
  { name: 'Jan', mrr: 45000, leads: 12 },
  { name: 'Fev', mrr: 52000, leads: 18 },
  { name: 'Mar', mrr: 48000, leads: 15 },
  { name: 'Abr', mrr: 61000, leads: 22 },
  { name: 'Mai', mrr: 68000, leads: 28 },
  { name: 'Jun', mrr: 75000, leads: 32 },
];

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        <p className={`text-xs mt-2 flex items-center gap-1 ${change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
          {change.startsWith('+') ? '▲' : '▼'} {change} vs mês anterior
        </p>
      </div>
      <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
        <Icon />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
          <p className="text-slate-500">Bem-vindo de volta à M4 Marketing Digital.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
            <ICONS.Calendar /> Últimos 30 dias
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-200">
            Gerar Relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Receita Recorrente (MRR)" value="R$ 75.000,00" change="+12%" icon={ICONS.Finance} color="blue" />
        <StatCard title="Clientes Ativos" value="42" change="+3" icon={ICONS.Clients} color="emerald" />
        <StatCard title="Leads no Funil" value="84" change="+24%" icon={ICONS.Sales} color="amber" />
        <StatCard title="Tarefas em Atraso" value="7" change="-2" icon={ICONS.Tasks} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Crescimento de Receita (MRR)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`R$ ${value.toLocaleString()}`, 'MRR']}
                />
                <Line type="monotone" dataKey="mrr" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 4, fill: COLORS.primary }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Leads Gerados por Mês</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="leads" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Tarefas Urgentes</h3>
            <button className="text-blue-600 text-sm font-semibold hover:underline">Ver todas</button>
          </div>
          <div className="space-y-4">
            {[
              { task: "Otimização Campanha Meta - Loja XYZ", client: "Loja XYZ", due: "Hoje", priority: "Alta" },
              { task: "Reunião de Onboarding", client: "Tech Solutions", due: "Amanhã", priority: "Urgente" },
              { task: "Aprovação de Criativos", client: "Bio Green", due: "Hoje", priority: "Alta" },
            ].map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-10 rounded-full ${t.priority === 'Urgente' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.task}</p>
                    <p className="text-xs text-slate-500">{t.client}</p>
                  </div>
                </div>
                <div className="text-right text-xs font-medium text-slate-500">
                  Vence: {t.due}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Atividade Recente</h3>
          <div className="space-y-6">
            {[
              { user: "Admin", action: "moveu lead", target: "Tech Solutions", time: "10m atrás" },
              { user: "Financeiro", action: "confirmou pagamento", target: "Loja ABC", time: "1h atrás" },
              { user: "Gestor Ads", action: "concluiu tarefa", target: "Otimização Semanal", time: "2h atrás" },
              { user: "Admin", action: "cadastrou novo lead", target: "Restaurante Gourmet", time: "4h atrás" },
            ].map((a, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {a.user[0]}
                </div>
                <div>
                  <p className="text-sm text-slate-800">
                    <span className="font-bold">{a.user}</span> {a.action} <span className="font-semibold">{a.target}</span>
                  </p>
                  <p className="text-xs text-slate-500">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
