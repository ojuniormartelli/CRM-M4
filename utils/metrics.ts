
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

  // NOVA: Taxa de conversão por estágio
  getStageConversionRates: (leads: Lead[], pipelines: Pipeline[]) => {
    const rates: Record<string, { stage: string; total: number; converted: number; rate: number }> = {};
    
    pipelines.forEach(pipeline => {
      pipeline.stages.forEach((stage, index) => {
        const leadsInStage = leads.filter(l => {
          const resolvedStage = funnelUtils.resolveLeadStage(l, pipelines);
          return resolvedStage?.id === stage.id;
        });

        const nextStage = pipeline.stages[index + 1];
        const convertedLeads = nextStage 
          ? leadsInStage.filter(l => {
              // Verificar se o lead já avançou para próximo estágio
              // Isso requer histórico de mudanças de estágio. 
              // Como não temos a tabela m4_lead_stage_history populada de forma fácil aqui, 
              // vamos assumir que se o lead não está mais nesse estágio mas está no pipeline, ele avançou.
              // Ou se ele foi ganho.
              const currentStage = funnelUtils.resolveLeadStage(l, pipelines);
              return currentStage && currentStage.id !== stage.id;
            })
          : leadsInStage.filter(l => metricsUtils.isWonLead(l, pipelines));

        rates[stage.id] = {
          stage: stage.name,
          total: leadsInStage.length,
          converted: convertedLeads.length,
          rate: leadsInStage.length > 0 ? (convertedLeads.length / leadsInStage.length) * 100 : 0
        };
      });
    });

    return rates;
  },

  // NOVA: Velocity Score (dias médios até fechamento)
  getVelocityScore: (leads: Lead[], pipelines: Pipeline[]) => {
    const wonLeads = leads.filter(l => metricsUtils.isWonLead(l, pipelines));
    
    if (wonLeads.length === 0) return 0;

    const totalDays = wonLeads.reduce((acc, lead) => {
      const createdDate = new Date(lead.created_at);
      const closedDate = lead.last_activity_at ? new Date(lead.last_activity_at) : new Date();
      const diffDays = Math.floor((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return acc + diffDays;
    }, 0);

    return Math.round(totalDays / wonLeads.length);
  },

  // NOVA: Churn Rate
  getChurnRate: (leads: Lead[], pipelines: Pipeline[]) => {
    const wonLeads = leads.filter(l => metricsUtils.isWonLead(l, pipelines));
    const lostLeads = leads.filter(l => metricsUtils.isLostLead(l, pipelines));
    const totalClosed = wonLeads.length + lostLeads.length;

    if (totalClosed === 0) return 0;
    return (lostLeads.length / totalClosed) * 100;
  },

  // NOVA: Pipeline Value Weighted (valor ponderado por probabilidade)
  getPipelineValueWeighted: (leads: Lead[], pipelines: Pipeline[]) => {
    const activeLeads = leads.filter(l => metricsUtils.isActiveLead(l, pipelines));
    
    return activeLeads.reduce((acc, lead) => {
      const value = Number(lead.value) || 0;
      const probability = (lead.probability || 50) / 100; // Default 50%
      return acc + (value * probability);
    }, 0);
  },

  // NOVA: Leads por fonte
  getLeadsBySource: (leads: Lead[]) => {
    const sources: Record<string, number> = {};
    
    leads.forEach(lead => {
      const source = lead.source || 'Não informado';
      sources[source] = (sources[source] || 0) + 1;
    });

    return Object.entries(sources)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  },

  // NOVA: ROI por fonte
  getROIBySource: (leads: Lead[], pipelines: Pipeline[]) => {
    const sources: Record<string, { leads: number; conversions: number; revenue: number }> = {};

    leads.forEach(lead => {
      const source = lead.source || 'Não informado';
      if (!sources[source]) {
        sources[source] = { leads: 0, conversions: 0, revenue: 0 };
      }

      sources[source].leads += 1;
      
      if (metricsUtils.isWonLead(lead, pipelines)) {
        sources[source].conversions += 1;
        sources[source].revenue += Number(lead.value) || 0;
      }
    });

    return Object.entries(sources).map(([source, data]) => ({
      source,
      leads: data.leads,
      conversions: data.conversions,
      revenue: data.revenue,
      conversionRate: data.leads > 0 ? (data.conversions / data.leads) * 100 : 0
    }));
  },

  // NOVA: Forecast breakdown por probabilidade
  getForecastBreakdown: (leads: Lead[], pipelines: Pipeline[]) => {
    const activeLeads = leads.filter(l => metricsUtils.isActiveLead(l, pipelines));

    const breakdown = {
      high: { count: 0, value: 0 },    // 80-100%
      medium: { count: 0, value: 0 },  // 50-79%
      low: { count: 0, value: 0 }      // 0-49%
    };

    activeLeads.forEach(lead => {
      const value = Number(lead.value) || 0;
      const prob = lead.probability || 50;

      if (prob >= 80) {
        breakdown.high.count += 1;
        breakdown.high.value += value;
      } else if (prob >= 50) {
        breakdown.medium.count += 1;
        breakdown.medium.value += value;
      } else {
        breakdown.low.count += 1;
        breakdown.low.value += value;
      }
    });

    return breakdown;
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
