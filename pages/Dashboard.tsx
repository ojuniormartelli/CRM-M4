import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { COLORS, ICONS } from '../constants';
import { Lead, Task, FunnelStatus, Pipeline } from '../types';
import { aiService } from '../services/aiService';
import { metricsUtils } from '../utils/metrics';
import { alertsUtils } from '../utils/alerts';
import { goalsUtils } from '../utils/goals';

// New Components
import { AlertsPanel } from '../components/Dashboard/AlertsPanel';
import { PipelineSelector } from '../components/Dashboard/PipelineSelector';
import { GoalTracker } from '../components/Dashboard/GoalTracker';
import { ForecastBreakdown } from '../components/Dashboard/ForecastBreakdown';
import { PerformanceScorecard } from '../components/Dashboard/PerformanceScorecard';
import { StageConversionChart } from '../components/Dashboard/StageConversionChart';
import { SourceAnalytics } from '../components/Dashboard/SourceAnalytics';

interface DashboardProps {
  leads: Lead[];
  transactions: any[];
  tasks: Task[];
  pipelines: Pipeline[];
}

const StatCard = ({ title, value, change, icon: Icon, color }: any) => {
  const changeNum = typeof change === 'string' ? parseFloat(change.replace('%', '')) : change;
  const isPositive = typeof change === 'string' ? (change.startsWith('+') || changeNum > 0) : changeNum > 0;
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

const Dashboard: React.FC<DashboardProps> = ({ leads, transactions, tasks, pipelines }) => {
  const [forecast, setForecast] = useState<{ predictedRevenue: number; confidence: number } | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(() => {
    return localStorage.getItem('m4_selected_pipeline_id');
  });

  const handlePipelineSelect = (id: string | null) => {
    setSelectedPipelineId(id);
    if (id) {
      localStorage.setItem('m4_selected_pipeline_id', id);
    } else {
      localStorage.removeItem('m4_selected_pipeline_id');
    }
  };

  // Filtered Data
  const filteredLeads = useMemo(() => {
    if (!selectedPipelineId) return leads;
    return leads.filter(l => l.pipeline_id === selectedPipelineId);
  }, [leads, selectedPipelineId]);

  const filteredPipelines = useMemo(() => {
    if (!selectedPipelineId) return pipelines;
    return pipelines.filter(p => p.id === selectedPipelineId);
  }, [pipelines, selectedPipelineId]);

  useEffect(() => {
    const getForecast = async () => {
      setIsForecasting(true);
      const result = await aiService.predictForecast(filteredLeads, filteredPipelines);
      setForecast(result);
      setIsForecasting(false);
    };
    if (filteredLeads.length > 0) {
      getForecast();
    }
  }, [filteredLeads, filteredPipelines]);

  // Use centralized metrics with filtered data
  const metrics = useMemo(() => metricsUtils.calculateMetrics(filteredLeads, tasks, filteredPipelines), [filteredLeads, tasks, filteredPipelines]);
  const comparison = useMemo(() => metricsUtils.getMonthlyComparison(filteredLeads, filteredPipelines), [filteredLeads, filteredPipelines]);
  const velocityScore = useMemo(() => metricsUtils.getVelocityScore(filteredLeads, filteredPipelines), [filteredLeads, filteredPipelines]);
  const churnRate = useMemo(() => metricsUtils.getChurnRate(filteredLeads, filteredPipelines), [filteredLeads, filteredPipelines]);

  const formatChange = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(0)}%`;

  const myDayLeads = filteredLeads.filter(l => {
    const today = new Date().toISOString().split('T')[0];
    return l.next_action_date === today && metricsUtils.isActiveLead(l, filteredPipelines);
  });

  // Prepare chart data
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleString('pt-BR', { month: 'short' });
  });

  const chartData = last6Months.map(month => {
    const monthLeads = filteredLeads.filter(l => {
      const d = new Date(l.created_at);
      return d.toLocaleString('pt-BR', { month: 'short' }) === month;
    });
    const monthRevenue = monthLeads
      .filter(l => metricsUtils.isWonLead(l, filteredPipelines))
      .reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    
    return {
      name: month,
      mrr: monthRevenue,
      leads: monthLeads.length
    };
  });

  // Dynamic Meetings
  const upcomingMeetings = tasks
    .filter(t => (t.type === 'meeting' || t.type === 'call') && t.status !== 'Concluído')
    .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())
    .slice(0, 3);

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">Dashboard Comercial</h2>
          <p className="text-muted-foreground font-medium">Performance e métricas em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PipelineSelector 
            pipelines={pipelines} 
            selectedPipelineId={selectedPipelineId} 
            onSelect={handlePipelineSelect} 
          />
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase border border-emerald-100 dark:border-emerald-900/30">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Sincronizado
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <StatCard title="Leads Ativos" value={metrics.activeLeads} change={formatChange(comparison.leadsChange)} icon={ICONS.Sales} color="blue" />
        <StatCard title="Ticket Médio" value={`R$ ${metrics.averageTicket.toLocaleString()}`} change="0%" icon={ICONS.TrendingUp} color="indigo" />
        <StatCard title="Fechado (Mês)" value={`R$ ${metrics.closedRevenue.toLocaleString()}`} change={formatChange(comparison.revenueChange)} icon={ICONS.Plus} color="emerald" />
        <StatCard title="Taxa Conversão" value={`${metrics.conversionRate.toFixed(1)}%`} change="0%" icon={ICONS.Automation} color="amber" />
        <StatCard title="Velocity" value={`${velocityScore} dias`} change="—" icon={ICONS.Clock} color="purple" />
        <StatCard title="Churn Rate" value={`${churnRate.toFixed(1)}%`} change="—" icon={ICONS.X} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AlertsPanel leads={filteredLeads} pipelines={filteredPipelines} />
        </div>
        <div>
          <GoalTracker leads={filteredLeads} pipelines={filteredPipelines} monthlyGoal={80000} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
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
        </div>
        <div>
          <ForecastBreakdown leads={filteredLeads} pipelines={filteredPipelines} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <StageConversionChart leads={filteredLeads} pipelines={filteredPipelines} />
        <SourceAnalytics leads={filteredLeads} pipelines={filteredPipelines} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <PerformanceScorecard leads={filteredLeads} pipelines={filteredPipelines} />
        </div>
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
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'Sem data'} às {t.due_date ? new Date(t.due_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </p>
                  </div>
                </div>
                <ICONS.ChevronDown className="-rotate-90 text-muted-foreground/50" />
              </div>
            )) : (
              <p className="text-muted-foreground text-xs font-bold uppercase text-center py-10">Nenhuma reunião agendada</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Forecast Banner - Simplified as it's now integrated in ForecastBreakdown but kept for visual impact */}
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
               Previsão de fechamento baseada em inteligência artificial com <span className="text-white font-black">{Math.round((forecast?.confidence || 0) * 100)}% de confiança</span>.
             </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center px-6 py-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Leads Quentes</p>
              <p className="text-xl font-black">{filteredLeads.filter(l => l.temperature === 'Quente').length}</p>
            </div>
            <div className="text-center px-6 py-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-1">Prob. Média</p>
              <p className="text-xl font-black">
                {filteredLeads.length > 0 ? Math.round(filteredLeads.reduce((acc, l) => acc + (l.probability || 0), 0) / filteredLeads.length) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
