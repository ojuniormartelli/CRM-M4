import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { COLORS, ICONS } from '../constants';
import { Lead } from '../types';

interface DashboardProps {
  leads: Lead[];
  transactions: any[];
  tasks: any[];
}

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

const Dashboard: React.FC<DashboardProps> = ({ leads, transactions, tasks }) => {
  // Calculate dynamic metrics
  const totalLeads = leads.length;
  const activeClients = leads.filter(l => l.stageId === 'Onboarding' || l.stageId === 'Fechamento').length;
  const totalRevenue = leads.reduce((acc, l) => acc + (l.value || 0), 0);
  const pendingTasks = tasks.filter(t => t.status === 'Pendente').length;

  // Prepare chart data
  const chartData = [
    { name: 'Jan', mrr: 45000, leads: Math.floor(totalLeads * 0.1) },
    { name: 'Fev', mrr: 52000, leads: Math.floor(totalLeads * 0.15) },
    { name: 'Mar', mrr: 48000, leads: Math.floor(totalLeads * 0.12) },
    { name: 'Abr', mrr: 61000, leads: Math.floor(totalLeads * 0.2) },
    { name: 'Mai', mrr: 68000, leads: Math.floor(totalLeads * 0.25) },
    { name: 'Jun', mrr: totalRevenue > 0 ? totalRevenue : 75000, leads: totalLeads > 0 ? totalLeads : 32 },
  ];

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
        <StatCard title="Pipeline Total (Est.)" value={`R$ ${totalRevenue.toLocaleString()}`} change="+12%" icon={ICONS.Finance} color="blue" />
        <StatCard title="Clientes Ativos" value={activeClients || "42"} change="+3" icon={ICONS.Clients} color="emerald" />
        <StatCard title="Leads no Funil" value={totalLeads || "84"} change="+24%" icon={ICONS.Sales} color="amber" />
        <StatCard title="Tarefas Pendentes" value={pendingTasks || "7"} change="-2" icon={ICONS.Tasks} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Crescimento de Receita (MRR)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
              <BarChart data={chartData}>
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
            {tasks.slice(0, 3).map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-10 rounded-full ${t.priority === 'Alta' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.title}</p>
                    <p className="text-xs text-slate-500">Prazo: {new Date(t.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right text-xs font-medium text-slate-500">
                  {t.status}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-center text-slate-400 py-8">Nenhuma tarefa pendente.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Atividade Recente</h3>
          <div className="space-y-6">
            {leads.slice(-4).reverse().map((l, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                  {l.name[0]}
                </div>
                <div>
                  <p className="text-sm text-slate-800">
                    Novo lead cadastrado: <span className="font-bold">{l.name}</span> de <span className="font-semibold">{l.company || 'Empresa não informada'}</span>
                  </p>
                  <p className="text-xs text-slate-500">{new Date(l.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {leads.length === 0 && (
              <p className="text-center text-slate-400 py-8">Nenhuma atividade recente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
