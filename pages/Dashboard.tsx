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
  const activeLeads = leads.filter(l => l.status === 'active' || !l.status).length;
  const wonLeads = leads.filter(l => l.status === 'won').length;
  const lostLeads = leads.filter(l => l.status === 'lost').length;
  
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';
  
  const totalRevenueForecast = leads
    .filter(l => l.status === 'active' || !l.status)
    .reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    
  const closedRevenueMonth = leads
    .filter(l => l.status === 'won')
    .reduce((acc, l) => acc + (Number(l.value) || 0), 0);

  const pendingTasks = tasks.filter(t => t.status === 'Pendente').length;
  
  // Stale deals (no activity for > 5 days)
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const staleDeals = leads.filter(l => {
    const activityDate = l.lastActivityAt ? new Date(l.lastActivityAt) : new Date(l.createdAt);
    return (l.status === 'active' || !l.status) && activityDate < fiveDaysAgo;
  });

  // Prepare chart data
  const chartData = [
    { name: 'Jan', mrr: 45000, leads: 12 },
    { name: 'Fev', mrr: 52000, leads: 18 },
    { name: 'Mar', mrr: 48000, leads: 15 },
    { name: 'Abr', mrr: 61000, leads: 22 },
    { name: 'Mai', mrr: 68000, leads: 28 },
    { name: 'Jun', mrr: closedRevenueMonth > 0 ? closedRevenueMonth : 75000, leads: totalLeads > 0 ? totalLeads : 32 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Comercial</h2>
          <p className="text-slate-500 font-medium">Performance e métricas em tempo real.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Sincronizado
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Leads Ativos" value={activeLeads} change="+12%" icon={ICONS.Sales} color="blue" />
        <StatCard title="Receita Prevista" value={`R$ ${totalRevenueForecast.toLocaleString()}`} change="+8%" icon={ICONS.Finance} color="indigo" />
        <StatCard title="Fechado (Mês)" value={`R$ ${closedRevenueMonth.toLocaleString()}`} change="+24%" icon={ICONS.Plus} color="emerald" />
        <StatCard title="Taxa Conversão" value={`${conversionRate}%`} change="+2%" icon={ICONS.Automation} color="amber" />
        <StatCard title="Tarefas" value={pendingTasks} change="-2" icon={ICONS.Tasks} color="red" />
      </div>

      {staleDeals.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <ICONS.X width="24" height="24" />
            </div>
            <div>
              <h4 className="font-black text-red-900 uppercase text-xs tracking-widest">Alerta de Negócios Parados</h4>
              <p className="text-red-700 text-sm font-medium">{staleDeals.length} negócios estão sem atividade há mais de 5 dias.</p>
            </div>
          </div>
          <button className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all">Ver Negócios</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-8 uppercase tracking-widest">Performance de Vendas</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
                  formatter={(value: any) => [`R$ ${value.toLocaleString()}`, 'Receita']}
                />
                <Line type="monotone" dataKey="mrr" stroke="#2563eb" strokeWidth={4} dot={{ r: 6, fill: '#2563eb', strokeWidth: 4, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-8 uppercase tracking-widest">Ranking Vendedores</h3>
          <div className="space-y-6">
            {[
              { name: 'Ana Silva', sales: 12, revenue: 45000, img: 'https://i.pravatar.cc/150?u=ana' },
              { name: 'Lucas M.', sales: 9, revenue: 38000, img: 'https://i.pravatar.cc/150?u=lucas' },
              { name: 'Carla R.', sales: 7, revenue: 29000, img: 'https://i.pravatar.cc/150?u=carla' },
              { name: 'João P.', sales: 5, revenue: 15000, img: 'https://i.pravatar.cc/150?u=joao' },
            ].map((v, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={v.img} className="w-12 h-12 rounded-2xl border-2 border-white shadow-md" alt={v.name} />
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{v.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{v.sales} fechamentos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-blue-600">R$ {v.revenue.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Próximas Reuniões</h3>
            <button className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline">Ver Agenda</button>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Apresentação Proposta - TechFlow', time: '14:30', date: 'Hoje', type: 'meeting' },
              { title: 'Follow-up - Agência Alpha', time: '16:00', date: 'Hoje', type: 'call' },
              { title: 'Kickoff - Projeto Beta', time: '09:00', date: 'Amanhã', type: 'meeting' },
            ].map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:border-blue-200 transition-all cursor-pointer group">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 shadow-sm transition-all">
                    {t.type === 'meeting' ? <ICONS.Collaboration width="20" height="20" /> : <ICONS.Phone width="20" height="20" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{t.title}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.date} às {t.time}</p>
                  </div>
                </div>
                <ICONS.ChevronDown className="-rotate-90 text-slate-300" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-8 uppercase tracking-widest">Atividade Recente</h3>
          <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {leads.slice(-4).reverse().map((l, idx) => (
              <div key={idx} className="flex gap-6 relative">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-[10px] font-black text-blue-600 z-10 shadow-sm">
                  {l.name[0]}
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">
                    Novo lead <span className="font-black text-slate-900">{l.name}</span> entrou no funil via <span className="font-black text-blue-600">{l.source || 'Site'}</span>
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{new Date(l.createdAt).toLocaleDateString()}</p>
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
