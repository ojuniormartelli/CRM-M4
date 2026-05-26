import { Lead, Pipeline, Task, User } from '../types';
import { metricsUtils } from './metrics';

export interface AlertItem {
  id: string;
  type: 'task' | 'meeting' | 'lead_followup' | 'deal_closing' | 'inactive_lead' | 'hot_lead';
  title: string;
  description: string;
  date: string;
  dueDateStr?: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  status: 'atrasado' | 'hoje' | 'breve' | 'este_mes';
  daysOverdue?: number;
  linkTab: 'tasks' | 'sales';
  meta?: any;
}

// Helper to adjust Monday-based start of calendar week
const getStartOfWeek = (d: Date): Date => {
  const result = new Date(d);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(12, 0, 0, 0);
  return result;
};

const getEndOfWeek = (d: Date): Date => {
  const start = getStartOfWeek(d);
  const result = new Date(start);
  result.setDate(result.getDate() + 6);
  result.setHours(12, 0, 0, 0);
  return result;
};

const isSameMonthAndYear = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
};

// Handing YYYY-MM-DD, DD/MM/YYYY or full ISO strings to avoid UTC offset bugs
const parseToMiddayLocal = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  
  // 1. Check if format is YYYY-MM-DD...
  const yyyymmddRegex = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]|$)/;
  const matchYmd = dateStr.match(yyyymmddRegex);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const month = parseInt(matchYmd[2], 10) - 1;
    const day = parseInt(matchYmd[3], 10);
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  
  // 2. Check if format is DD/MM/YYYY...
  const ddmmyyyyRegex = /^(\d{2})[-/](\d{2})[-/](\d{4})(?:[ ]|$)?/;
  const matchDmy = dateStr.match(ddmmyyyyRegex);
  if (matchDmy) {
    const day = parseInt(matchDmy[1], 10);
    const month = parseInt(matchDmy[2], 10) - 1;
    const year = parseInt(matchDmy[3], 10);
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  
  // 3. Fallback to standard javascript Date parsing
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setHours(12, 0, 0, 0);
  return d;
};

const calculateDaysDiff = (d1: Date, d2: Date): number => {
  const t1 = new Date(d1).setHours(12, 0, 0, 0);
  const t2 = new Date(d2).setHours(12, 0, 0, 0);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
};

const formatDateToReadable = (date: Date): string => {
  // Return format DD/MM/YYYY
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const classifyDate = (itemDate: Date, today: Date): 'atrasado' | 'hoje' | 'breve' | 'este_mes' | 'futuro' => {
  const todayMid = new Date(today);
  todayMid.setHours(12, 0, 0, 0);
  
  const diffDays = calculateDaysDiff(todayMid, itemDate);
  
  if (diffDays < 0) {
    return 'atrasado';
  } else if (diffDays === 0) {
    return 'hoje';
  } else {
    const startOfWeek = getStartOfWeek(todayMid);
    const endOfWeek = getEndOfWeek(todayMid);
    
    const isInCurrentWeek = itemDate >= startOfWeek && itemDate <= endOfWeek;
    const isWithin7Days = diffDays <= 7;
    
    if (isInCurrentWeek || isWithin7Days) {
      return 'breve';
    }
    
    if (isSameMonthAndYear(itemDate, todayMid)) {
      return 'este_mes';
    }
    
    return 'futuro';
  }
};

export const alertsUtils = {
  // Legacy function support
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

  // NEW Global Unified Alerts engine
  getUserAlerts: (leads: Lead[], tasks: Task[], pipelines: Pipeline[], currentUser: User | null) => {
    const diarios: AlertItem[] = [];
    const semanais: AlertItem[] = [];
    const mensais: AlertItem[] = [];
    
    if (!currentUser) return { diarios, semanais, mensais };
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 1. Process tasks & meetings (including currentUser's assigned and non-assigned operational tasks)
    const userPendingTasks = tasks.filter(t => 
      (t.assigned_to === currentUser.id || !t.assigned_to) && 
      t.status !== 'Concluído'
    );
    
    userPendingTasks.forEach(t => {
      if (!t.due_date) return;
      const dueDate = parseToMiddayLocal(t.due_date);
      if (!dueDate) return;
      
      const classification = classifyDate(dueDate, today);
      if (classification === 'futuro') return;
      
      const isMeeting = t.type === 'meeting' || t.type === 'call' || t.type === 'Reunião' || t.type === 'Ligação';
      
      const alert: AlertItem = {
        id: `task-${t.id}`,
        type: isMeeting ? 'meeting' : 'task',
        title: t.title,
        description: t.description || (isMeeting ? 'Reunião ou compromisso agendado.' : 'Tarefa pendente de execução.'),
        date: formatDateToReadable(dueDate),
        dueDateStr: t.due_date,
        priority: (t.priority as any) || 'Média',
        status: classification,
        daysOverdue: classification === 'atrasado' ? Math.max(1, calculateDaysDiff(dueDate, today)) : undefined,
        linkTab: 'tasks',
        meta: { id: t.id }
      };
      
      if (classification === 'atrasado' || classification === 'hoje') {
        diarios.push(alert);
      }
      if (classification === 'hoje' || classification === 'breve') {
        semanais.push(alert);
      }
      if (classification === 'hoje' || classification === 'breve' || classification === 'este_mes') {
        mensais.push(alert);
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
      
      const classification = classifyDate(actionDate, today);
      if (classification === 'futuro') return;
      
      const alert: AlertItem = {
        id: `lead-followup-${l.id}`,
        type: 'lead_followup',
        title: `Follow-up: ${l.company_name}`,
        description: l.next_action || 'Entrar em contato com o lead para dar andamento.',
        date: formatDateToReadable(actionDate),
        dueDateStr: l.next_action_date,
        priority: l.temperature === 'Quente' ? 'Alta' : 'Média',
        status: classification,
        daysOverdue: classification === 'atrasado' ? Math.max(1, calculateDaysDiff(actionDate, today)) : undefined,
        linkTab: 'sales',
        meta: { id: l.id, contactName: l.contact_name }
      };
      
      if (classification === 'atrasado' || classification === 'hoje') {
        diarios.push(alert);
      }
      if (classification === 'hoje' || classification === 'breve') {
        semanais.push(alert);
      }
      if (classification === 'hoje' || classification === 'breve' || classification === 'este_mes') {
        mensais.push(alert);
      }
    });
    
    // 3. Process special alerts
    // 3a. User's hot leads without an action scheduled for today (Daily)
    const userHotLeadsNoAction = leads.filter(l =>
      l.responsible_id === currentUser.id &&
      l.temperature === 'Quente' &&
      l.next_action_date !== todayStr &&
      metricsUtils.isActiveLead(l, pipelines)
    );
    
    userHotLeadsNoAction.forEach(l => {
      diarios.push({
        id: `hot-lead-${l.id}`,
        type: 'hot_lead',
        title: `Lead Quente sem Ação: ${l.company_name}`,
        description: 'Este lead está qualificado como Quente, mas não possui nova ação programada para hoje.',
        date: 'Hoje',
        priority: 'Alta',
        status: 'hoje',
        linkTab: 'sales',
        meta: { id: l.id }
      });
    });
    
    // 3b. User's deals closing soon with high probability (Weekly)
    const userClosingSoon = leads.filter(l => {
      if (l.responsible_id !== currentUser.id || !l.closing_forecast || !metricsUtils.isActiveLead(l, pipelines)) return false;
      const forecastDate = parseToMiddayLocal(l.closing_forecast);
      if (!forecastDate) return false;
      const classification = classifyDate(forecastDate, today);
      return (l.probability || 0) > 70 && (classification === 'hoje' || classification === 'breve');
    });
    
    userClosingSoon.forEach(l => {
      semanais.push({
        id: `deal-closing-${l.id}`,
        type: 'deal_closing',
        title: `Fechamento Próximo: ${l.company_name}`,
        description: `Negócio com probabilidade alta (${l.probability}%) e previsão de fechamento de R$ ${Number(l.value || 0).toLocaleString()} para os próximos dias.`,
        date: l.closing_forecast ? formatDateToReadable(parseToMiddayLocal(l.closing_forecast)!) : 'Breve',
        priority: 'Urgente',
        status: 'breve',
        linkTab: 'sales',
        meta: { id: l.id }
      });
    });
    
    // 3c. User's inactive leads > 30 days (Monthly/Strategic)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const userInactiveLeads = leads.filter(l => {
      if (l.responsible_id !== currentUser.id || !metricsUtils.isActiveLead(l, pipelines)) return false;
      const lastActivity = l.last_activity_at ? new Date(l.last_activity_at) : new Date(l.created_at);
      return lastActivity < cutoffDate;
    });
    
    userInactiveLeads.forEach(l => {
      mensais.push({
        id: `inactive-lead-${l.id}`,
        type: 'inactive_lead',
        title: `Reativação Pendente: ${l.company_name}`,
        description: 'Sem histórico de interações registradas no CRM há mais de 30 dias. Readeqüe o contato comercial.',
        date: 'Este Mês',
        priority: 'Média',
        status: 'este_mes',
        linkTab: 'sales',
        meta: { id: l.id }
      });
    });
    
    // Sort items so overdue/urgent ones are always on top
    const sortAlerts = (list: AlertItem[]) => {
      const priorityWeights = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
      return list.sort((a, b) => {
        // First order by overdue status
        if (a.status === 'atrasado' && b.status !== 'atrasado') return -1;
        if (a.status !== 'atrasado' && b.status === 'atrasado') return 1;
        
        // Then by priority
        const weightA = priorityWeights[a.priority] || 2;
        const weightB = priorityWeights[b.priority] || 2;
        if (weightB !== weightA) return weightB - weightA;
        
        // Finally, sort chronologically if dates are stored
        if (a.dueDateStr && b.dueDateStr) {
          return new Date(a.dueDateStr).getTime() - new Date(b.dueDateStr).getTime();
        }
        return 0;
      });
    };
    
    return {
      diarios: sortAlerts(diarios),
      semanais: sortAlerts(semanais),
      mensais: sortAlerts(mensais)
    };
  }
};
