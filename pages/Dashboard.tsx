import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { COLORS, ICONS } from '../constants';
import { Lead, Task, FunnelStatus } from '../types';
import { aiService } from '../services/aiService';
import { metricsUtils } from '../utils/metrics';

interface DashboardProps {
  leads: Lead[];
  transactions: any[];
  tasks: Task[];
}

const StatCard = ({ title, value, change, icon: Icon, color }: any) => {
  const changeNum = parseFloat(change.replace('%', ''));
  const isPositive = change.startsWith('+') || changeNum > 0;
  const isNeutral = change === '0%' || change === '—' || changeNum === 0;
  
  const textColor = isNeutral 
    ? 'text-slate-400' 
    : isPositive 
      ? 'text-emerald-600 dark:text-emerald-400' 
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-muted-foreground text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
          <p className={`text-xs mt-2 flex items-center gap-1 ${textColor}`}>
            {!isNeutral && (isPositive ? '▲' : '▼')} {change} vs mês anterior
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
          <Icon />
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ leads, transactions, tasks }) => {
  const [forecast, setForecast] = useState<{ predictedRevenue: number; confidence: number } | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  useEffect(() => {
    const getForecast = async () => {
      setIsForecasting(true);
      const result = await aiService.predictForecast(leads);
      setForecast(result);
      setIsForecasting(false);
    };
    if (leads.length > 0) {
      getForecast();
    }
  }, [leads]);

  // Use centralized metrics
  const metrics = metricsUtils.calculateMetrics(leads, tasks);
  const comparison = metricsUtils.getMonthlyComparison(leads);

  const formatChange = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(0)}%`;

  const myDayLeads = leads.filter(l => {
    const today = new Date().toISOString().split('T')[0];
    return l.next_action_date === today && metricsUtils.isActiveLead(l);
  });

  // Stale deals (no activity for > 5 days)
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const staleDeals = leads.filter(l => {
    const activityDate = l.last_activity_at ? new Date(l.last_activity_at) : new Date(l.created_at);
    return metricsUtils.isActiveLead(l) && activityDate < fiveDaysAgo;
  });

  // Prepare chart data
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleString('pt-BR', { month: 'short' });
  });

  const chartData = last6Months.map(month => {
    const monthLeads = leads.filter(l => {
      const d = new Date(l.created_at);
      return d.toLocaleString('pt-BR', { month: 'short' }) === month;
    });
    const monthRevenue = monthLeads
      .filter(metricsUtils.isWonLead)
      .reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    
    return {
      name: month,
      mrr: monthRevenue,
      leads: monthLeads.length
    };
  });

  // Dynamic Ranking
  const ranking = leads
    .filter(metricsUtils.isWonLead)
    .reduce((acc: any[], lead) => {
      const seller = lead.responsible_name || 'Sistema';
      const existing = acc.find(a => a.name === seller);
      if (existing) {
        existing.sales += 1;
        existing.revenue += Number(lead.value) || 0;
      } else {
        acc.push({ name: seller, sales: 1, revenue: Number(lead.value) || 0, img: `https://i.pravatar.cc/150?u=${seller}` });
      }
      return acc;
    }, [])
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  // Dynamic Meetings
  const upcomingMeetings = tasks
    .filter(t => (t.type === 'meeting' || t.type === 'call') && t.status !== 'Concluído')
    .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())
    .slice(0, 3);

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">Dashboard Comercial</h2>
          <p className="text-muted-foreground font-medium">Performance e métricas em tempo real.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase border border-emerald-100 dark:border-emerald-900/30">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Sincronizado
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Leads Ativos" value={metrics.activeLeads} change={formatChange(comparison.leadsChange)} icon={ICONS.Sales} color="blue" />
        <StatCard title="Ticket Médio" value={`R$ ${metrics.averageTicket.toLocaleString()}`} change="0%" icon={ICONS.TrendingUp} color="indigo" />
        <StatCard title="Fechado (Mês)" value={`R$ ${metrics.closedRevenue.toLocaleString()}`} change={formatChange(comparison.revenueChange)} icon={ICONS.Plus} color="emerald" />
        <StatCard title="Taxa Conversão" value={`${metrics.conversionRate.toFixed(1)}%`} change="0%" icon={ICONS.Automation} color="amber" />
        <StatCard title="Tarefas" value={metrics.pendingTasks} change="0%" icon={ICONS.Tasks} color="red" />
      </div>

      {myDayLeads.length > 0 && (
        <div className="bg-blue-600 dark:bg-blue-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 dark:shadow-none relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/20 rounded-lg">
                <ICONS.Clock width="20" height="20" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest">Meu Dia: {myDayLeads.length} Ações Prioritárias</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myDayLeads.slice(0, 3).map(lead => (
                <div key={lead.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl hover:bg-white/20 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg">{lead.company}</span>
                    <ICONS.ExternalLink width="14" height="14" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="font-black text-lg mb-1">{lead.name}</h4>
                  <p className="text-blue-100 text-xs font-bold mb-4 flex items-center gap-2">
                    <ICONS.Target width="12" height="12" /> {lead.next_action || 'Follow-up'}
                  </p>
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">R$ {Number(lead.value).toLocaleString()}</span>
                    <div className="px-2 py-0.5 bg-orange-400 text-white text-[8px] font-black rounded-md uppercase tracking-widest">Quente</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Forecast Banner */}
      <div className="p-8 bg-gradient-to-r from-indigo-600 to-blue-700 dark:from-indigo-900 dark:to-blue-900 rounded-[2.5rem] text-white shadow-2xl shadow-blue-100 dark:shadow-none relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-white/20 rounded-lg">
                 <ICONS.Automation width="20" height="20" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Sales Prediction</span>
             </div>
             <h2 className="text-3xl font-black tracking-tight mb-2">
               {isForecasting ? 'Analisando Pipeline...' : `R$ ${forecast?.predictedRevenue.toLocaleString() || '0'}`}
             </h2>
             <p className="text-blue-100 font-medium text-sm">
               Previsão de fechamento para os próximos 30 dias com <span className="text-white font-black">{Math.round((forecast?.confidence || 0) * 100)}% de confiança</span>.
             </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center px-6 py-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Leads Quentes</p>
              <p className="text-xl font-black">{leads.filter(l => l.temperature === 'Quente').length}</p>
            </div>
            <div className="text-center px-6 py-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Prob. Média</p>
              <p className="text-xl font-black">
                {leads.length > 0 ? Math.round(leads.reduce((acc, l) => acc + (l.probability || 0), 0) / leads.length) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {staleDeals.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-6 rounded-[2rem] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center">
              <ICONS.X width="24" height="24" />
            </div>
            <div>
              <h4 className="font-black text-red-900 dark:text-red-400 uppercase text-xs tracking-widest">Alerta de Negócios Parados</h4>
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">{staleDeals.length} negócios estão sem atividade há mais de 5 dias.</p>
            </div>
          </div>
          <button className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all">Ver Negócios</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
          <h3 className="text-lg font-black text-foreground mb-8 uppercase tracking-widest">Performance de Vendas</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} className="text-muted-foreground" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'currentColor', fontSize: 10, fontWeight: 800}} dy={10} className="text-muted-foreground" />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'currentColor', fontSize: 10, fontWeight: 800}} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  formatter={(value: any) => [`R$ ${value.toLocaleString()}`, 'Receita']}
                />
                <Line type="monotone" dataKey="mrr" stroke="var(--primary)" strokeWidth={4} dot={{ r: 6, fill: 'var(--primary)', strokeWidth: 4, stroke: 'var(--card)' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
          <h3 className="text-lg font-black text-foreground mb-8 uppercase tracking-widest">Ranking Vendedores</h3>
          <div className="space-y-6">
            {ranking.length > 0 ? ranking.map((v, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={v.img} className="w-12 h-12 rounded-2xl border-2 border-card shadow-md" alt={v.name} />
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-foreground text-card rounded-full flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">{v.name}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase">{v.sales} fechamentos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-primary">R$ {v.revenue.toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-xs font-bold uppercase text-center py-10">Nenhum fechamento este mês</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Próximas Reuniões</h3>
            <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">Ver Agenda</button>
          </div>
          <div className="space-y-4">
            {upcomingMeetings.length > 0 ? upcomingMeetings.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 bg-muted/50 rounded-[1.5rem] border border-border hover:border-primary/50 transition-all cursor-pointer group">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center text-muted-foreground group-hover:text-primary shadow-sm transition-all">
                    {t.type === 'meeting' ? <ICONS.Collaboration width="20" height="20" /> : <ICONS.Phone width="20" height="20" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">{t.title}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{new Date(t.due_date).toLocaleDateString()} às {new Date(t.due_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
                <ICONS.ChevronDown className="-rotate-90 text-muted-foreground/50" />
              </div>
            )) : (
              <p className="text-muted-foreground text-xs font-bold uppercase text-center py-10">Nenhuma reunião agendada</p>
            )}
          </div>
        </div>

        <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
          <h3 className="text-lg font-black text-foreground mb-8 uppercase tracking-widest">Atividade Recente</h3>
          <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {leads.slice(-4).reverse().map((l, idx) => (
              <div key={idx} className="flex gap-6 relative">
                <div className="w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-[10px] font-black text-primary z-10 shadow-sm">
                  {l.name[0]}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Novo lead <span className="font-black text-foreground">{l.name}</span> entrou no funil via <span className="font-black text-primary">{l.source || 'Site'}</span>
                  </p>
                  <p className="text-[10px] font-black text-muted-foreground uppercase mt-1">{new Date(l.created_at).toLocaleDateString()}</p>
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
