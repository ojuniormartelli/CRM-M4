import React, { useState } from 'react';
import { Lead, Pipeline, Task, User } from '../../types';
import { alertsUtils, AlertItem } from '../../utils/alerts';
import { 
  AlertTriangle, Calendar, Phone, Mail, CheckCircle2, AlertCircle, 
  Sparkles, Flame, Clock, ChevronRight, CheckSquare, Zap, Target, HelpCircle 
} from 'lucide-react';

interface AlertsPanelProps {
  leads: Lead[];
  pipelines: Pipeline[];
  tasks: Task[];
  currentUser: User | null;
  setActiveTab: (tab: string) => void;
  onFilterChange?: (mode: 'all' | 'my_day') => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ 
  leads, 
  pipelines, 
  tasks, 
  currentUser, 
  setActiveTab, 
  onFilterChange 
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'diarios' | 'semanais' | 'mensais'>('diarios');
  const [visibleCount, setVisibleCount] = useState<number>(5);

  const { diarios, semanais, mensais } = alertsUtils.getUserAlerts(leads, tasks, pipelines, currentUser);

  const getActiveList = (): AlertItem[] => {
    switch (selectedSubTab) {
      case 'diarios': return diarios;
      case 'semanais': return semanais;
      case 'mensais': return mensais;
      default: return diarios;
    }
  };

  const currentList = getActiveList();

  const handleActionClick = (alert: AlertItem) => {
    if (alert.linkTab === 'sales') {
      if (alert.type === 'hot_lead') {
        onFilterChange?.('all');
      } else if (alert.status === 'atrasado') {
        onFilterChange?.('my_day');
      } else {
        onFilterChange?.('all');
      }
      setActiveTab('sales');
    } else if (alert.linkTab === 'tasks') {
      setActiveTab('tasks');
    }
  };

  // Helper to render type-specific icons
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Phone className="w-5 h-5 text-blue-500" />;
      case 'task':
        return <CheckSquare className="w-5 h-5 text-indigo-500" />;
      case 'lead_followup':
        return <Target className="w-5 h-5 text-emerald-500" />;
      case 'deal_closing':
        return <Sparkles className="w-5 h-5 text-amber-500" />;
      case 'inactive_lead':
        return <Clock className="w-5 h-5 text-slate-500" />;
      case 'hot_lead':
        return <Flame className="w-5 h-5 text-rose-500 animate-pulse" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  // Helper for priority badges
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'Urgente':
      case 'Urgent':
        return 'bg-red-50 dark:bg-red-900/25 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30';
      case 'Alta':
        return 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/20';
      case 'Média':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/20';
      case 'Baixa':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-500';
    }
  };

  // Helper for status styling
  const getStatusBadge = (alert: AlertItem) => {
    if (alert.status === 'atrasado') {
      return (
        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
          Atrasado {alert.daysOverdue ? `há ${alert.daysOverdue}d` : ''}
        </span>
      );
    }
    if (alert.status === 'hoje') {
      return (
        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
          Hoje
        </span>
      );
    }
    if (alert.status === 'breve') {
      return (
        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
          Esta Semana
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40">
        Este Mês
      </span>
    );
  };

  // Empty state copy selector
  const getEmptyStateContent = () => {
    switch (selectedSubTab) {
      case 'diarios':
        return {
          title: 'Nenhum alerta para hoje!',
          desc: 'Excelente trabalho! Sua rotina operacional e seus follow-ups estão 100% em dia hoje.',
          emoji: '🎉'
        };
      case 'semanais':
        return {
          title: 'Agenda limpa para esta semana!',
          desc: 'Não há novos compromissos, prazos ou reuniões registradas para os próximos dias.',
          emoji: '📅'
        };
      case 'mensais':
        return {
          title: 'Nenhuma pendência para este mês!',
          desc: 'Todas as metas, ativações e compromissos táticos do mês foram cobertos e resolvidos.',
          emoji: '✨'
        };
    }
  };

  const emptyState = getEmptyStateContent();

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground tracking-wide uppercase">Central de Alertas</h3>
            <p className="text-xs text-muted-foreground font-medium">Follow-ups, tarefas e reuniões agendadas</p>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-border p-1 bg-muted/40 rounded-xl font-sans">
        <button
          onClick={() => { setSelectedSubTab('diarios'); setVisibleCount(5); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
            selectedSubTab === 'diarios' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Diário
          {diarios.length > 0 && (
            <span className="flex h-5 min-w-[20px] px-1 items-center justify-center text-[10px] font-black rounded-full bg-rose-500 text-white animate-pulse">
              {diarios.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setSelectedSubTab('semanais'); setVisibleCount(5); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
            selectedSubTab === 'semanais' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Semanal
          {semanais.length > 0 && (
            <span className="flex h-5 min-w-[20px] px-1 items-center justify-center text-[10px] font-black rounded-full bg-amber-500 text-white">
              {semanais.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setSelectedSubTab('mensais'); setVisibleCount(5); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
            selectedSubTab === 'mensais' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Mensal
          {mensais.length > 0 && (
            <span className="flex h-5 min-w-[20px] px-1 items-center justify-center text-[10px] font-black rounded-full bg-blue-500 text-white">
              {mensais.length}
            </span>
          )}
        </button>
      </div>

      {/* Alerts list */}
      <div className="space-y-3 min-h-[220px]">
        {currentList.length > 0 ? (
          <>
            {currentList.slice(0, visibleCount).map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 rounded-xl border border-border/80 bg-muted/20 hover:border-primary/40 dark:hover:border-primary/30 transition-all flex items-start gap-4 group cursor-pointer`}
                onClick={() => handleActionClick(alert)}
              >
                {/* Specific Icon Block */}
                <div className="p-3 bg-card rounded-xl shadow-sm border border-border shrink-0 flex items-center justify-center">
                  {getAlertIcon(alert.type)}
                </div>

                {/* Content Block */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status badge */}
                    {getStatusBadge(alert)}

                    {/* Priority badge */}
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider ${getPriorityBadgeClass(alert.priority)}`}>
                      {alert.priority}
                    </span>

                    {/* Due Date Indicator */}
                    <span className="text-[10px] font-bold text-muted-foreground font-mono ml-auto">
                      {alert.date}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-foreground uppercase tracking-wide group-hover:text-primary transition-colors truncate">
                      {alert.title}
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-0.5 line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                </div>

                <div className="self-center p-1.5 rounded-lg bg-card border border-border opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-4 h-4 text-primary" />
                </div>
              </div>
            ))}

            {/* Pagination / Expand controls */}
            {currentList.length > visibleCount && (
              <button
                onClick={() => setVisibleCount(prev => prev + 5)}
                className="w-full py-3 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-border/50"
              >
                Ver mais alertas (+{currentList.length - visibleCount})
              </button>
            )}
          </>
        ) : (
          /* Empty state block */
          <div className="flex flex-col items-center justify-center text-center p-10 bg-muted/10 border border-dashed border-border rounded-xl min-h-[220px]">
            <span className="text-4xl mb-3">{emptyState?.emoji}</span>
            <h4 className="text-sm font-black text-foreground uppercase tracking-wider">{emptyState?.title}</h4>
            <p className="text-xs text-muted-foreground font-medium max-w-xs mt-1.5 leading-relaxed">
              {emptyState?.desc}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
