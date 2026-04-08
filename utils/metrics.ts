
import { Lead, Task, FunnelStatus } from '../types';
import { startOfMonth, subMonths, endOfMonth, isWithinInterval } from 'date-fns';

export const metricsUtils = {
  isActiveLead: (lead: Lead) => lead.status !== FunnelStatus.WON && lead.status !== FunnelStatus.LOST,
  isWonLead: (lead: Lead) => lead.status === FunnelStatus.WON,
  isLostLead: (lead: Lead) => lead.status === FunnelStatus.LOST,

  calculateMetrics: (leads: Lead[], tasks: Task[]) => {
    const totalLeads = leads.length;
    const activeLeads = leads.filter(metricsUtils.isActiveLead);
    const wonLeads = leads.filter(metricsUtils.isWonLead);
    const lostLeads = leads.filter(metricsUtils.isLostLead);

    const conversionRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0;
    const totalRevenueForecast = activeLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    const closedRevenue = wonLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    const averageTicket = wonLeads.length > 0 ? closedRevenue / wonLeads.length : 0;
    const pendingTasks = tasks.filter(t => t.status === 'Pendente').length;

    return {
      totalLeads,
      activeLeads: activeLeads.length,
      wonLeads: wonLeads.length,
      lostLeads: lostLeads.length,
      conversionRate,
      totalRevenueForecast,
      closedRevenue,
      averageTicket,
      pendingTasks
    };
  },

  getMonthlyComparison: (leads: Lead[]) => {
    const now = new Date();
    const currentMonth = { start: startOfMonth(now), end: now };
    const lastMonth = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };

    const currentLeads = leads.filter(l => isWithinInterval(new Date(l.created_at), currentMonth));
    const lastLeads = leads.filter(l => isWithinInterval(new Date(l.created_at), lastMonth));

    const currentWon = currentLeads.filter(metricsUtils.isWonLead);
    const lastWon = lastLeads.filter(metricsUtils.isWonLead);

    const currentRevenue = currentWon.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    const lastRevenue = lastWon.reduce((acc, l) => acc + (Number(l.value) || 0), 0);

    const calculateChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      revenueChange: calculateChange(currentRevenue, lastRevenue),
      leadsChange: calculateChange(currentLeads.length, lastLeads.length),
      currentRevenue,
      lastRevenue
    };
  }
};
