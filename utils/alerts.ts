
import { Lead, Pipeline } from '../types';
import { metricsUtils } from './metrics';

export const alertsUtils = {
  // Leads quentes sem ação hoje
  getHotLeadsWithoutAction: (leads: Lead[], pipelines: Pipeline[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    return leads.filter(l => 
      l.temperature === 'Quente' &&
      l.next_action_date !== today &&
      metricsUtils.isActiveLead(l, pipelines)
    );
  },

  // Deals perto do fechamento (7 dias)
  getDealsClosingSoon: (leads: Lead[], pipelines: Pipeline[]) => {
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return leads.filter(l => {
      if (!l.closing_forecast || !metricsUtils.isActiveLead(l, pipelines)) return false;
      
      const forecastDate = new Date(l.closing_forecast);
      return (l.probability || 0) > 70 && forecastDate <= sevenDaysFromNow;
    }).sort((a, b) => (b.probability || 0) - (a.probability || 0));
  },

  // Follow-ups atrasados
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

  // Leads sem interação há 30+ dias
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
  }
};
