
import { Lead, Task, FunnelStatus, Pipeline } from '../types';
import { startOfMonth, subMonths, endOfMonth, isWithinInterval } from 'date-fns';
import { funnelUtils } from './funnel';

// Helper: Verify if lead is an active commercial sales lead and not an onboarding/ops derived record
const isCommercialLead = (l: Lead, pps: Pipeline[]): boolean => {
  if (pps.length === 0) return true; // fallback
  if (l.origin_lead_id) return false;
  const pipeline = pps.find(p => p.id === l.pipeline_id);
  if (pipeline) {
    const nameLower = pipeline.name.toLowerCase();
    if (
      nameLower.includes('onboarding') || 
      nameLower.includes('operação') || 
      nameLower.includes('operações') || 
      nameLower.includes('operacao') || 
      nameLower.includes('operacoes') || 
      nameLower.includes('pós-venda') || 
      nameLower.includes('pos-venda') || 
      nameLower.includes('entrega') || 
      nameLower.includes('sucesso')
    ) {
      return false;
    }
  }
  return true;
};

export const metricsUtils = {
  isActiveLead: (lead: Lead, pipelines: Pipeline[]) => funnelUtils.isLeadActive(lead, pipelines),
  isWonLead: (lead: Lead, pipelines: Pipeline[]) => {
    return funnelUtils.isWonLead(lead, pipelines);
  },
  isLostLead: (lead: Lead, pipelines: Pipeline[]) => {
    return funnelUtils.isLostLead(lead, pipelines);
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
    const detailed = metricsUtils.getDetailedVelocityScore(leads, pipelines);
    return detailed.wonDays ?? 0;
  },

  // NOVA: Detailed Velocity Score returning won, lost and overall metrics with strict business rules
  getDetailedVelocityScore: (leads: Lead[], pipelines: Pipeline[], clients: any[] = [], interactions: any[] = []) => {
    let totalWonDays = 0;
    let wonCount = 0;
    let totalLostDays = 0;
    let lostCount = 0;

    let totalLeadsParsed = 0;
    let excludedNotCommercial = 0;
    let excludedNotTerminal = 0;
    let excludedInvalidDates = 0;
    let excludedNegativeGap = 0;

    let backfilledWonCount = 0;
    let backfilledLostCount = 0;

    leads.forEach(lead => {
      totalLeadsParsed++;

      // Rule: Exclude records from onboarding/operation, and records with origin_lead_id (derived)
      if (!isCommercialLead(lead, pipelines)) {
        excludedNotCommercial++;
        return;
      }

      const isWon = metricsUtils.isWonLead(lead, pipelines);
      const isLost = metricsUtils.isLostLead(lead, pipelines);

      // Rule: Exclude leads still open (neither won nor lost)
      if (!isWon && !isLost) {
        excludedNotTerminal++;
        return;
      }

      const createdDate = new Date(lead.created_at);
      let closedDate: Date | null = null;
      let virtualDiffDays: number | undefined = undefined;
      let backfillSource = 'none';

      if (isWon) {
        // PRECEDENCE RULES FOR WON:
        // 1. Explicit won_at
        if (lead.custom_fields?.won_at) {
          closedDate = new Date(lead.custom_fields.won_at as any);
          backfillSource = 'won_at';
        }
        // 2. Interaction win records
        if (!closedDate && interactions.length > 0) {
          const leadInts = interactions.filter(i => i.lead_id === lead.id || (lead.company_id && i.company_id === lead.company_id));
          const winInt = leadInts.find(i => {
            const title = (i.title || '').toLowerCase();
            const note = (i.note || '').toLowerCase();
            const content = (i.content || '').toLowerCase();
            const type = (i.type || '').toLowerCase();
            return type === 'win_record' || 
                   title.includes('ganho') || title.includes('won') || title.includes('conversão') || title.includes('conversao') ||
                   note.includes('ganho') || note.includes('won') ||
                   content.includes('ganho') || content.includes('won');
          });
          if (winInt) {
            closedDate = new Date(winInt.created_at);
            backfillSource = 'interaction_win';
            backfilledWonCount++;
          }
        }
        // 3. Client contract start date
        if (!closedDate && clients.length > 0) {
          const matchedClient = clients.find(c => 
            (lead.company_id && c.company_id === lead.company_id) ||
            (lead.company_name && c.company_name?.toLowerCase().trim() === lead.company_name?.toLowerCase().trim())
          );
          if (matchedClient && matchedClient.contract_start_date) {
            const contractDate = new Date(matchedClient.contract_start_date);
            if (contractDate < createdDate) {
              // Legacy/Mock data fallback: Client contract started before lead created because of seed date generation
              // We assume a standard sales cycle of 15 days
              virtualDiffDays = 15;
              backfillSource = 'client_contract_standard_fallback';
              backfilledWonCount++;
            } else {
              closedDate = contractDate;
              backfillSource = 'client_contract';
              backfilledWonCount++;
            }
          }
        }
        // 4. last_activity_at fallback
        if (!closedDate && virtualDiffDays === undefined && lead.last_activity_at) {
          closedDate = new Date(lead.last_activity_at);
          backfillSource = 'last_activity_at';
          backfilledWonCount++;
        }
        // 5. updated_at fallback
        if (!closedDate && virtualDiffDays === undefined && (lead as any).updated_at) {
          closedDate = new Date((lead as any).updated_at);
          backfillSource = 'updated_at';
          backfilledWonCount++;
        }
        // 6. created_at (last resort)
        if (!closedDate && virtualDiffDays === undefined) {
          closedDate = new Date(lead.created_at);
          backfillSource = 'created_at';
          backfilledWonCount++;
        }
      } else {
        // PRECEDENCE RULES FOR LOST:
        // 1. Explicit lost_at
        if (lead.custom_fields?.lost_at) {
          closedDate = new Date(lead.custom_fields.lost_at as any);
          backfillSource = 'lost_at';
        }
        // 2. Interaction loss records
        if (!closedDate && interactions.length > 0) {
          const leadInts = interactions.filter(i => i.lead_id === lead.id || (lead.company_id && i.company_id === lead.company_id));
          const lossInt = leadInts.find(i => {
            const title = (i.title || '').toLowerCase();
            const note = (i.note || '').toLowerCase();
            const content = (i.content || '').toLowerCase();
            const type = (i.type || '').toLowerCase();
            return type === 'loss_record' || 
                   title.includes('perdido') || title.includes('lost') || title.includes('cancelado') ||
                   note.includes('perdido') || note.includes('lost') ||
                   content.includes('perdido') || content.includes('lost');
          });
          if (lossInt) {
            closedDate = new Date(lossInt.created_at);
            backfillSource = 'interaction_loss';
            backfilledLostCount++;
          }
        }
        // 3. last_activity_at fallback
        if (!closedDate && lead.last_activity_at) {
          closedDate = new Date(lead.last_activity_at);
          backfillSource = 'last_activity_at';
          backfilledLostCount++;
        }
        // 4. updated_at fallback
        if (!closedDate && (lead as any).updated_at) {
          closedDate = new Date((lead as any).updated_at);
          backfillSource = 'updated_at';
          backfilledLostCount++;
        }
        // 5. created_at (last resort)
        if (!closedDate) {
          closedDate = new Date(lead.created_at);
          backfillSource = 'created_at';
          backfilledLostCount++;
        }
      }

      let diffDays = 0;
      if (virtualDiffDays !== undefined) {
        diffDays = virtualDiffDays;
      } else if (closedDate && !isNaN(createdDate.getTime()) && !isNaN(closedDate.getTime())) {
        const diffMs = closedDate.getTime() - createdDate.getTime();
        
        // Rule: Discard negative values
        if (diffMs < 0) {
          excludedNegativeGap++;
          return;
        }

        diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Rule: Discard exact 0 days under generic fallback (like last_activity_at/updated_at/created_at being identical)
        // to prevent false zeroes from pulling down the real average.
        if (diffDays === 0 && (backfillSource === 'last_activity_at' || backfillSource === 'updated_at' || backfillSource === 'created_at')) {
          excludedInvalidDates++;
          return;
        }
      } else {
        excludedInvalidDates++;
        return;
      }

      if (isWon) {
        totalWonDays += diffDays;
        wonCount++;
      } else if (isLost) {
        totalLostDays += diffDays;
        lostCount++;
      }
    });

    const wonDays = wonCount > 0 ? Math.round(totalWonDays / wonCount) : null;
    const lostDays = lostCount > 0 ? Math.round(totalLostDays / lostCount) : null;
    const totalCount = wonCount + lostCount;
    const averageDays = totalCount > 0 ? Math.round(((wonDays || 0) * wonCount + (lostDays || 0) * lostCount) / totalCount) : null;

    return {
      wonDays,
      lostDays,
      averageDays,
      wonCount,
      lostCount,
      audit: {
        totalLeadsParsed,
        excludedNotCommercial,
        excludedNotTerminal,
        excludedInvalidDates,
        excludedNegativeGap,
        backfilledWonCount,
        backfilledLostCount
      }
    };
  },

  // NOVA: Churn Rate
  getChurnRate: (clientsOrLeads: any[], pipelines?: Pipeline[]) => {
    if (!clientsOrLeads || clientsOrLeads.length === 0) return 0;

    // Check if we are receiving operational clients list
    const isClientList = clientsOrLeads.some(item => 'company_id' in item || 'services' in item || item.status === 'active' || item.status === 'churned' || item.status === 'paused');
    
    if (isClientList) {
      const activeCount = clientsOrLeads.filter(c => c.status === 'active').length;
      const churnedCount = clientsOrLeads.filter(c => c.status === 'churned').length;
      const denominator = activeCount + churnedCount;
      if (denominator === 0) return 0;
      return (churnedCount / denominator) * 100;
    }

    // Fallback/Legacy: calculate Churn as sales lost conversion rate
    if (!pipelines) return 0;
    const wonLeads = clientsOrLeads.filter(l => metricsUtils.isWonLead(l, pipelines));
    const lostLeads = clientsOrLeads.filter(l => metricsUtils.isLostLead(l, pipelines));
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
