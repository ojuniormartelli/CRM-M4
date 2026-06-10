import React, { useState } from 'react';
import { Lead, Pipeline, Task, User } from '../../types';
import { alertsUtils, AlertItem } from '../../utils/alerts';
import { supabase } from '../../lib/supabase';
import { 
  AlertTriangle, Calendar, Phone, Mail, CheckCircle2, AlertCircle, 
  Sparkles, Flame, Clock, ChevronRight, CheckSquare, Zap, Target, 
  HelpCircle, User as UserIcon, Briefcase, ChevronDown 
} from 'lucide-react';

interface AlertsPanelProps {
  leads: Lead[];
  pipelines: Pipeline[];
  tasks: Task[];
  currentUser: User | null;
  setActiveTab: (tab: string) => void;
  onFilterChange?: (mode: 'all' | 'my_day') => void;
  clients?: any[];
  setSelectedClientId?: (id: string | null) => void;
  setSelectedLeadId?: (id: string | null) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ 
  leads, 
  pipelines, 
  tasks, 
  currentUser, 
  setActiveTab, 
  onFilterChange,
  clients,
  setSelectedClientId,
  setSelectedLeadId
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'hoje' | 'esta_semana' | 'proxima_semana' | 'geral_atrasados'>('hoje');
  const [visibleCount, setVisibleCount] = useState<number>(5);
  const [users, setUsers] = useState<User[]>([]);
  const [localClients, setLocalClients] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);

  // Fetch users for responsible name mapping
  React.useEffect(() => {
    supabase.from('m4_users').select('*').eq('status', 'active').then(({ data }) => {
      if (data) setUsers(data);
    });
  }, []);

  // Fetch interactions for more accurate inactivity alerts
  React.useEffect(() => {
    const workspaceId = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id');
    if (workspaceId) {
      supabase.from('m4_interactions').select('*').eq('workspace_id', workspaceId).then(({ data }) => {
        if (data) setInteractions(data);
      });
    }
  }, [currentUser]);

  // Soft fallback for clients
  React.useEffect(() => {
    if (!clients) {
      supabase.from('m4_clients').select('*').then(({ data }) => {
        if (data) setLocalClients(data);
      });
    }
  }, [clients]);

  const activeClients = clients || localClients;
  const { hoje, estaSemana, proximaSemana, geralAtrasados } = alertsUtils.getUserAlerts(
    leads, 
    tasks, 
    pipelines, 
    currentUser, 
    activeClients, 
    users,
    interactions
  );

  const getActiveList = (): AlertItem[] => {
    switch (selectedSubTab) {
      case 'hoje': return hoje;
      case 'esta_semana': return estaSemana;
      case 'proxima_semana': return proximaSemana;
      case 'geral_atrasados': return geralAtrasados;
      default: return hoje;
    }
  };

  const currentList = getActiveList();

  const handleActionClick = (alert: AlertItem) => {
    if (alert.linkTab === 'clients' && alert.entityId) {
      setSelectedClientId?.(alert.entityId);
      setActiveTab('clients');
    } else if (alert.linkTab === 'sales' && alert.entityId) {
      setSelectedLeadId?.(alert.entityId);
      setActiveTab('sales');
    } else {
      // Fallback click action
      if (alert.linkTab === 'sales') {
        setActiveTab('sales');
      } else if (alert.linkTab === 'tasks') {
        setActiveTab('tasks');
      }
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Phone className="w-4 h-4 text-emerald-500" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-blue-500" />;
      case 'lead_followup':
        return <Target className="w-4 h-4 text-purple-500" />;
      case 'deal_closing':
        return <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />;
      case 'inactive_lead':
        return <Clock className="w-4 h-4 text-slate-400" />;
      case 'hot_lead':
        return <Flame className="w-4 h-4 text-rose-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'Urgente':
        return 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/30';
      case 'Alta':
        return 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-100 dark:border-orange-900/20';
      case 'Média':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20';
      case 'Baixa':
        return 'bg-slate-50 text-slate-500 dark:bg-slate-900/20 dark:text-slate-400 border border-slate-100 dark:border-slate-800';
      default:
        return 'bg-slate-50 text-slate-500';
    }
  };

  const getModuleBadgeClass = (module: string) => {
    switch (module) {
      case 'Comercial':
        return 'bg-blue-100/60 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30';
      case 'Onboarding':
        return 'bg-purple-100/60 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200/50 dark:border-purple-900/30';
      case 'Operação':
        return 'bg-emerald-100/60 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

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
    if (alert.status === 'esta_semana') {
      return (
        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/40">
          Esta Semana
        </span>
      );
    }
    if (alert.status === 'proxima_semana') {
      return (
        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40">
          Prox. Semana
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40">
        Planejado
      </span>
    );
  };

  const getEmptyStateContent = () => {
    switch (selectedSubTab) {
      case 'hoje':
        return {
          title: 'Nenhum alerta para hoje!',
          desc: 'Excelente trabalho! Sua rotina operacional e seus follow-ups estão 100% em dia hoje.',
          emoji: '🎉'
        };
      case 'esta_semana':
        return {
          title: 'Sem entregas pendentes esta semana!',
          desc: 'Tudo o que foi planejado para os próximos dias está em ordem ou já resolvido.',
          emoji: '📅'
        };
      case 'proxima_semana':
        return {
          title: 'Próxima semana livre!',
          desc: 'Aproveite para planejar seus marcos, alinhar campanhas e antecipar tarefas.',
          emoji: '✨'
        };
      case 'geral_atrasados':
        return {
          title: 'Nenhum item em atraso!',
          desc: 'Excelente! Sem pendências críticas atrasadas na sua carteira de acompanhamento.',
          emoji: '🛡️'
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
            <p className="text-xs text-muted-foreground font-medium font-sans">Follow-ups, ritos de atendimento e prazos operacionais por urgência</p>
          </div>
        </div>
      </div>

      {/* Tabs navigation - 4 Windows of time */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-muted/40 rounded-xl font-sans">
        <button
          onClick={() => { setSelectedSubTab('hoje'); setVisibleCount(5); }}
          className={`flex items-center justify-center gap-1.5 py-2 px-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            selectedSubTab === 'hoje' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Hoje</span>
          {hoje.length > 0 && (
            <span className="flex h-4 min-w-[16px] px-1 items-center justify-center text-[9px] font-black rounded-full bg-rose-500 text-white animate-pulse shrink-0">
              {hoje.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setSelectedSubTab('esta_semana'); setVisibleCount(5); }}
          className={`flex items-center justify-center gap-1.5 py-2 px-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            selectedSubTab === 'esta_semana' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Esta Sem.</span>
          {estaSemana.length > 0 && (
            <span className="flex h-4 min-w-[16px] px-1 items-center justify-center text-[9px] font-black rounded-full bg-amber-500 text-white shrink-0">
              {estaSemana.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setSelectedSubTab('proxima_semana'); setVisibleCount(5); }}
          className={`flex items-center justify-center gap-1.5 py-2 px-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            selectedSubTab === 'proxima_semana' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Próx. Sem.</span>
          {proximaSemana.length > 0 && (
            <span className="flex h-4 min-w-[16px] px-1 items-center justify-center text-[9px] font-black rounded-full bg-blue-500 text-white shrink-0">
              {proximaSemana.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setSelectedSubTab('geral_atrasados'); setVisibleCount(5); }}
          className={`flex items-center justify-center gap-1.5 py-2 px-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer  ${
            selectedSubTab === 'geral_atrasados' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Hist. / Atrasados</span>
          {geralAtrasados.length > 0 && (
            <span className="flex h-4 min-w-[16px] px-1 items-center justify-center text-[9px] font-black rounded-full bg-red-600 text-white shrink-0">
              {geralAtrasados.length}
            </span>
          )}
        </button>
      </div>

      {/* Overdue Items Banner Link */}
      {geralAtrasados.length > 0 && selectedSubTab !== 'geral_atrasados' && (
        <div className="p-3.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 rounded-2xl text-xs font-bold text-amber-700 dark:text-amber-400 flex justify-between items-center transition-all animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shake shrink-0" />
            <span>Atenção: Você possui {geralAtrasados.length} {geralAtrasados.length === 1 ? 'item atrasado' : 'itens atrasados'} pendentes de retorno.</span>
          </div>
          <button 
            onClick={() => { setSelectedSubTab('geral_atrasados'); setVisibleCount(5); }} 
            className="text-[10px] font-black uppercase tracking-wider text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 underline cursor-pointer shrink-0 ml-4 hover:scale-105 transition-transform"
          >
            Ver Atrasados →
          </button>
        </div>
      )}

      {/* Alerts list */}
      <div className="space-y-4 min-h-[220px]">
        {currentList.length > 0 ? (
          <>
            {currentList.slice(0, visibleCount).map((alert) => (
              <div 
                key={alert.id}
                className="p-5 rounded-2xl border border-border/80 bg-muted/10/50 hover:bg-muted/10 hover:border-primary/40 dark:hover:border-primary/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group cursor-pointer shadow-sm hover:shadow-md"
                onClick={() => handleActionClick(alert)}
              >
                {/* Visual Content Block */}
                <div className="flex items-start gap-4 min-w-0">
                  {/* Icon Block */}
                  <div className="p-3 bg-card rounded-xl shadow-sm border border-border/60 shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {getAlertIcon(alert.type)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    {/* Related Entity: big prominent header */}
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-black uppercase tracking-wide truncate ${alert.title === 'Sem vínculo' ? 'text-slate-400 italic' : 'text-slate-800 dark:text-slate-200'}`}>
                        {alert.title}
                      </h4>
                    </div>

                    {/* Subtitle: event / task name */}
                    <p className="text-xs font-bold text-foreground line-clamp-1">
                      {alert.subtitle}
                    </p>

                    {/* Metadata line: Origin, Assignee, Date */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-muted-foreground pt-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getModuleBadgeClass(alert.module)}`}>
                        {alert.module}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        {alert.responsibleName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {alert.dateTimeStr}
                      </span>
                    </div>

                    {/* Raw helper description if available */}
                    {alert.description && alert.description !== alert.subtitle && (
                      <p className="text-[11px] text-muted-foreground font-sans italic line-clamp-1 mt-1 opacity-80">
                        "{alert.description}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Badges / Navigation Control Block */}
                <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                  <div className="flex flex-col items-end gap-1.5">
                    {/* Status window badge */}
                    {getStatusBadge(alert)}

                    {/* Priority level badge */}
                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md tracking-wider ${getPriorityBadgeClass(alert.priority)}`}>
                      {alert.priority}
                    </span>
                  </div>

                  {/* Navigation click indicator */}
                  <div className="p-2 rounded-xl bg-card border border-border group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all text-muted-foreground">
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination / Expand controls */}
            {currentList.length > visibleCount && (
              <button
                onClick={() => setVisibleCount(prev => prev + 5)}
                className="w-full py-3.5 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-2xl text-xs font-black uppercase tracking-wider transition-all border border-border/60 hover:border-border cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Ver mais alertas (+{currentList.length - visibleCount})</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          /* Empty state block */
          <div className="flex flex-col items-center justify-center text-center p-10 bg-muted/10 border border-dashed border-border rounded-2xl min-h-[220px]">
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

