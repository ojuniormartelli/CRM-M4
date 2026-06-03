import { Lead, Pipeline, Task, User } from '../types';
import { metricsUtils } from './metrics';

export interface AlertItem {
  id: string;
  type: 'task' | 'meeting' | 'lead_followup' | 'deal_closing' | 'inactive_lead' | 'hot_lead';
  title: string;          // Main title: Related lead/client name or "Sem vínculo"
  subtitle: string;       // Subtitle: Task/Event title
  description: string;    // Description
  date: string;           // Formatted date
  dueDateStr?: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  status: 'atrasado' | 'hoje' | 'esta_semana' | 'proxima_semana' | 'futuro';
  daysOverdue?: number;
  linkTab: 'tasks' | 'sales' | 'clients';  // Link tab
  meta?: any;
  // New rich context fields:
  module: 'Comercial' | 'Onboarding' | 'Operação';
  responsibleName: string;
  dateTimeStr: string;
  entityId?: string;      // Related lead or client ID
}

// Helper to adjust Monday-based start of calendar week
const getStartOfWeek = (d: Date): Date => {
  const result = new Date(d);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getEndOfWeek = (d: Date): Date => {
  const start = getStartOfWeek(d);
  const result = new Date(start);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
};

// Handing YYYY-MM-DD, DD/MM/YYYY or full ISO strings to avoid UTC offset bugs
const parseToMiddayLocal = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  
  const yyyymmddRegex = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]|$)/;
  const matchYmd = dateStr.match(yyyymmddRegex);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const month = parseInt(matchYmd[2], 10) - 1;
    const day = parseInt(matchYmd[3], 10);
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  
  const ddmmyyyyRegex = /^(\d{2})[-/](\d{2})[-/](\d{4})(?:[ ]|$)?/;
  const matchDmy = dateStr.match(ddmmyyyyRegex);
  if (matchDmy) {
    const day = parseInt(matchDmy[1], 10);
    const month = parseInt(matchDmy[2], 10) - 1;
    const year = parseInt(matchDmy[3], 10);
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setHours(12, 0, 0, 0);
  return d;
};

const calculateDaysDiff = (d1: Date, d2: Date): number => {
  const t1 = new Date(d1).setHours(0, 0, 0, 0);
  const t2 = new Date(d2).setHours(0, 0, 0, 0);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
};

const formatDateToReadable = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const classifyIntoFourWindows = (itemDate: Date, today: Date): 'atrasado' | 'hoje' | 'esta_semana' | 'proxima_semana' | 'futuro' => {
  const todayClean = new Date(today);
  todayClean.setHours(0, 0, 0, 0);
  
  const itemClean = new Date(itemDate);
  itemClean.setHours(0, 0, 0, 0);
  
  const diffDays = calculateDaysDiff(todayClean, itemClean);
  
  if (diffDays < 0) {
    return 'atrasado';
  } else if (diffDays === 0) {
    return 'hoje';
  } else {
    const endOfWeek = getEndOfWeek(todayClean);
    
    // Within the current calendar week, after today
    if (itemClean <= endOfWeek) {
      return 'esta_semana';
    }
    
    // Bounds of next week
    const nextWeekStart = new Date(endOfWeek);
    nextWeekStart.setDate(nextWeekStart.getDate() + 1);
    nextWeekStart.setHours(0, 0, 0, 0);
    
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    nextWeekEnd.setHours(23, 59, 59, 999);
    
    if (itemClean >= nextWeekStart && itemClean <= nextWeekEnd) {
      return 'proxima_semana';
    }
    
    return 'futuro';
  }
};

export const alertsUtils = {
  getHotLeadsWithoutAction: (leads: Lead[], pipelines: Pipeline[]) => {
    const today = new Date().toISOString().split('T')[0];
    return leads.filter(l => 
      l.temperature === 'Quente' &&
      l.next_action_date !== today &&
      metricsUtils.isActiveLead(l, pipelines)
    );
  },

  getDealsClosingSoon: (leads: Lead[], pipelines: Pipeline[]) => {
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return leads.filter(l => {
      if (!l.closing_forecast || !metricsUtils.isActiveLead(l, pipelines)) return false;
      const forecastDate = new Date(l.closing_forecast);
      return (l.probability || 0) > 70 && forecastDate <= sevenDaysFromNow;
    }).sort((a, b) => (b.probability || 0) - (a.probability || 0));
  },

  getOverdueFollowups: (leads: Lead[], pipelines: Pipeline[]) => {
    const today = new Date().toISOString().split('T')[0];
    return leads.filter(l =>
      l.next_action_date &&
      l.next_action_date < today &&
      metricsUtils.isActiveLead(l, pipelines)
    ).map(l => ({
      ...l,
      daysOverdue: Math.floor(
        (new Date().getTime() - new Date(l.next_action_date!).getTime()) / (1000 * 60 * 60 * 24)
      )
    })).sort((a, b) => b.daysOverdue - a.daysOverdue);
  },

  getInactiveLeads: (leads: Lead[], pipelines: Pipeline[], days = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return leads.filter(l => {
      if (!metricsUtils.isActiveLead(l, pipelines)) return false;
      const lastActivity = l.last_activity_at 
        ? new Date(l.last_activity_at) 
        : new Date(l.created_at);
      return lastActivity < cutoffDate;
    });
  },

  // Time-segmented Unified Alerts engine (Hoje, Esta Semana, Próxima Semana, Geral/Atrasados)
  getUserAlerts: (
    leads: Lead[], 
    tasks: Task[], 
    pipelines: Pipeline[], 
    currentUser: User | null, 
    clients?: any[], 
    users?: User[]
  ) => {
    const hoje: AlertItem[] = [];
    const estaSemana: AlertItem[] = [];
    const proximaSemana: AlertItem[] = [];
    const geralAtrasados: AlertItem[] = [];
    
    if (!currentUser) return { hoje, estaSemana, proximaSemana, geralAtrasados };
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const safeClients = clients || [];
    const safeUsers = users || [];
    
    // 1. Process tasks & meetings
    const userPendingTasks = tasks.filter(t => 
      (t.assigned_to === currentUser.id || !t.assigned_to) && 
      t.status !== 'Concluído'
    );
    
    userPendingTasks.forEach(t => {
      if (!t.due_date) return;
      const dueDate = parseToMiddayLocal(t.due_date);
      if (!dueDate) return;
      
      const classification = classifyIntoFourWindows(dueDate, today);
      const isMeeting = t.type === 'meeting' || t.type === 'call' || t.type === 'Reunião' || t.type === 'Ligação';
      
      // Determine related entity
      let title = 'Sem vínculo';
      let linkTab: 'tasks' | 'sales' | 'clients' = 'tasks';
      let entityId: string | undefined = undefined;
      let module: 'Comercial' | 'Onboarding' | 'Operação' = 'Operação';
      
      if (t.client_id) {
        const client = safeClients.find(c => c.id === t.client_id);
        if (client) {
          title = client.company_name;
          linkTab = 'clients';
          entityId = client.id;
        }
        module = (t.task_type as string) === 'onboarding' || t.tags?.toLowerCase().includes('onboarding') ? 'Onboarding' : 'Operação';
      } else if (t.lead_id) {
        const lead = leads.find(l => l.id === t.lead_id);
        if (lead) {
          title = lead.company_name || lead.contact_name || 'Lead sem nome';
          linkTab = 'sales';
          entityId = lead.id;
        }
        module = 'Comercial';
      }
      
      // Determine responsible name
      let responsibleName = 'Não atribuído';
      if (t.assigned_to) {
        const user = safeUsers.find(u => u.id === t.assigned_to);
        if (user) {
          responsibleName = user.name;
        } else if (t.assigned_to === currentUser.id) {
          responsibleName = currentUser.name || 'Eu';
        }
      }
      
      // Pretty date and hour
      let dateTimeStr = formatDateToReadable(dueDate);
      try {
        const dt = new Date(t.due_date);
        if (!isNaN(dt.getTime())) {
          dateTimeStr = dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        }
      } catch (e) {}

      const alert: AlertItem = {
        id: `task-${t.id}`,
        type: isMeeting ? 'meeting' : 'task',
        title: title,
        subtitle: t.title,
        description: t.description || (isMeeting ? 'Reunião ou compromisso agendado.' : 'Tarefa pendente de execução.'),
        date: formatDateToReadable(dueDate),
        dueDateStr: t.due_date,
        priority: (t.priority as any) || 'Média',
        status: classification === 'futuro' ? 'proxima_semana' : classification,
        daysOverdue: classification === 'atrasado' ? Math.max(1, calculateDaysDiff(dueDate, today)) : undefined,
        linkTab: linkTab,
        meta: { id: t.id },
        module,
        responsibleName,
        dateTimeStr,
        entityId
      };
      
      if (classification === 'atrasado') {
        geralAtrasados.push(alert);
      } else if (classification === 'hoje') {
        hoje.push(alert);
      } else if (classification === 'esta_semana') {
        estaSemana.push(alert);
      } else if (classification === 'proxima_semana' || classification === 'futuro') {
        proximaSemana.push(alert);
      }
    });
    
    // 2. Process Leads follow-up (next_action_date)
    const userActiveLeads = leads.filter(l => 
      l.responsible_id === currentUser.id &&
      metricsUtils.isActiveLead(l, pipelines)
    );
    
    userActiveLeads.forEach(l => {
      if (!l.next_action_date) return;
      const actionDate = parseToMiddayLocal(l.next_action_date);
      if (!actionDate) return;
      
      const classification = classifyIntoFourWindows(actionDate, today);
      
      // Pretty date and hour
      let dateTimeStr = formatDateToReadable(actionDate);
      try {
        const dt = new Date(l.next_action_date);
        if (!isNaN(dt.getTime())) {
          dateTimeStr = dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        }
      } catch (e) {}

      const alert: AlertItem = {
        id: `lead-followup-${l.id}`,
        type: 'lead_followup',
        title: l.company_name || l.contact_name || 'Lead sem nome',
        subtitle: `Follow-up comercial: ${l.next_action || 'Entrar em contato'}`,
        description: l.next_action || 'Entrar em contato com o lead para dar andamento.',
        date: formatDateToReadable(actionDate),
        dueDateStr: l.next_action_date,
        priority: l.temperature === 'Quente' ? 'Alta' : 'Média',
        status: classification === 'futuro' ? 'proxima_semana' : classification,
        daysOverdue: classification === 'atrasado' ? Math.max(1, calculateDaysDiff(actionDate, today)) : undefined,
        linkTab: 'sales',
        meta: { id: l.id, contactName: l.contact_name },
        module: 'Comercial',
        responsibleName: l.responsible_name || currentUser.name || 'Eu',
        dateTimeStr,
        entityId: l.id
      };
      
      if (classification === 'atrasado') {
        geralAtrasados.push(alert);
      } else if (classification === 'hoje') {
        hoje.push(alert);
      } else if (classification === 'esta_semana') {
        estaSemana.push(alert);
      } else if (classification === 'proxima_semana' || classification === 'futuro') {
        proximaSemana.push(alert);
      }
    });
    
    // 3a. User's hot leads without scheduled action today -> Put in Hoje
    const userHotLeadsNoAction = leads.filter(l =>
      l.responsible_id === currentUser.id &&
      l.temperature === 'Quente' &&
      l.next_action_date !== todayStr &&
      metricsUtils.isActiveLead(l, pipelines)
    );
    
    userHotLeadsNoAction.forEach(l => {
      hoje.push({
        id: `hot-lead-${l.id}`,
        type: 'hot_lead',
        title: l.company_name || l.contact_name || 'Lead sem nome',
        subtitle: 'Lead Quente sem ação programada',
        description: 'Este lead está qualificado como Quente, mas não possui nova ação programada para hoje.',
        date: 'Hoje',
        priority: 'Alta',
        status: 'hoje',
        linkTab: 'sales',
        meta: { id: l.id },
        module: 'Comercial',
        responsibleName: l.responsible_name || currentUser.name || 'Eu',
        dateTimeStr: 'Hoje',
        entityId: l.id
      });
    });
    
    // 3b. User's deals closing soon -> Map to classified group
    const userClosingSoon = leads.filter(l => {
      if (l.responsible_id !== currentUser.id || !l.closing_forecast || !metricsUtils.isActiveLead(l, pipelines)) return false;
      const forecastDate = parseToMiddayLocal(l.closing_forecast);
      if (!forecastDate) return false;
      const classification = classifyIntoFourWindows(forecastDate, today);
      return (l.probability || 0) > 70 && classification !== 'atrasado';
    });
    
    userClosingSoon.forEach(l => {
      const forecastDate = parseToMiddayLocal(l.closing_forecast!)!;
      const classification = classifyIntoFourWindows(forecastDate, today);
      
      const alert: AlertItem = {
        id: `deal-closing-${l.id}`,
        type: 'deal_closing',
        title: l.company_name || l.contact_name || 'Lead sem nome',
        subtitle: `Previsão de fechamento: R$ ${Number(l.value || 0).toLocaleString()} (Probabilidade ${l.probability || 0}%)`,
        description: `Negócio com probabilidade alta e previsão de fechamento para os próximos dias no valor de R$ ${Number(l.value || 0).toLocaleString()}.`,
        date: formatDateToReadable(forecastDate),
        priority: 'Urgente',
        status: classification === 'futuro' ? 'proxima_semana' : classification,
        linkTab: 'sales',
        meta: { id: l.id },
        module: 'Comercial',
        responsibleName: l.responsible_name || currentUser.name || 'Eu',
        dateTimeStr: formatDateToReadable(forecastDate),
        entityId: l.id
      };

      if (classification === 'hoje') {
        hoje.push(alert);
      } else if (classification === 'esta_semana') {
        estaSemana.push(alert);
      } else if (classification === 'proxima_semana' || classification === 'futuro') {
        proximaSemana.push(alert);
      }
    });
    
    // 3c. User's inactive leads > 30 days -> Put in Geral/Atrasados
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const userInactiveLeads = leads.filter(l => {
      if (l.responsible_id !== currentUser.id || !metricsUtils.isActiveLead(l, pipelines)) return false;
      const lastActivity = l.last_activity_at ? new Date(l.last_activity_at) : new Date(l.created_at);
      return lastActivity < cutoffDate;
    });
    
    userInactiveLeads.forEach(l => {
      geralAtrasados.push({
        id: `inactive-lead-${l.id}`,
        type: 'inactive_lead',
        title: l.company_name || l.contact_name || 'Lead sem nome',
        subtitle: 'Reativação: Mais de 30 dias inativo',
        description: 'Sem histórico de interações registradas no CRM há mais de 30 dias. Readeqüe o contato comercial.',
        date: 'Pendente',
        priority: 'Média',
        status: 'atrasado',
        linkTab: 'sales',
        meta: { id: l.id },
        module: 'Comercial',
        responsibleName: l.responsible_name || currentUser.name || 'Eu',
        dateTimeStr: 'Há mais de 30 dias',
        entityId: l.id
      });
    });
    
    // Sort items so overdue/urgent ones are always on top
    const sortAlerts = (list: AlertItem[]) => {
      const priorityWeights = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
      return list.sort((a, b) => {
        if (a.priority !== b.priority) {
          const weightA = priorityWeights[a.priority] || 2;
          const weightB = priorityWeights[b.priority] || 2;
          return weightB - weightA;
        }
        if (a.dueDateStr && b.dueDateStr) {
          return new Date(a.dueDateStr).getTime() - new Date(b.dueDateStr).getTime();
        }
        return 0;
      });
    };
    
    return {
      hoje: sortAlerts(hoje),
      estaSemana: sortAlerts(estaSemana),
      proximaSemana: sortAlerts(proximaSemana),
      geralAtrasados: sortAlerts(geralAtrasados)
    };
  }
};

