
import { Lead, Task, FunnelStatus, Pipeline } from '../types';
import { startOfMonth, subMonths, endOfMonth, isWithinInterval } from 'date-fns';
import { funnelUtils } from './funnel';

export const metricsUtils = {
  isActiveLead: (lead: Lead, pipelines: Pipeline[]) => funnelUtils.isLeadActive(lead, pipelines),
  isWonLead: (lead: Lead, pipelines: Pipeline[]) => {
    const stage = funnelUtils.resolveLeadStage(lead, pipelines);
    return funnelUtils.resolveLeadStatus(lead, stage) === FunnelStatus.WON;
  },
  isLostLead: (lead: Lead, pipelines: Pipeline[]) => {
    const stage = funnelUtils.resolveLeadStage(lead, pipelines);
    return funnelUtils.resolveLeadStatus(lead, stage) === FunnelStatus.LOST;
  },

  calculateMetrics: (leads: Lead[], tasks: Task[], pipelines: Pipeline[]) => {
    const summary = funnelUtils.getLeadSummaryCounts(leads, pipelines);
    const wonLeads = leads.filter(l => metricsUtils.isWonLead(l, pipelines));

    const conversionRate = summary.total > 0 ? (summary.won / summary.total) * 100 : 0;
    const closedRevenue = wonLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    const averageTicket = summary.won > 0 ? closedRevenue / summary.won : 0;
    const pendingTasks = tasks.filter(t => t.status === 'Pendente').length;

    return {
      totalLeads: summary.total,
      activeLeads: summary.active,
      wonLeads: summary.won,
      lostLeads: summary.lost,
      conversionRate,
      totalRevenueForecast: summary.totalValue,
      closedRevenue,
      averageTicket,
      pendingTasks
    };
  },

  getMonthlyComparison: (leads: Lead[], pipelines: Pipeline[]) => {
    const now = new Date();
    const currentMonth = { start: startOfMonth(now), end: now };
    const lastMonth = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };

    const currentLeads = leads.filter(l => isWithinInterval(new Date(l.created_at), currentMonth));
    const lastLeads = leads.filter(l => isWithinInterval(new Date(l.created_at), lastMonth));

    const currentWon = currentLeads.filter(l => metricsUtils.isWonLead(l, pipelines));
    const lastWon = lastLeads.filter(l => metricsUtils.isWonLead(l, pipelines));

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
