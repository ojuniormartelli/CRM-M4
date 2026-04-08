
import { Lead, Pipeline, Interaction } from '../types';
import { metricsUtils } from './metrics';

export const analyticsUtils = {
  // Média de interações até conversão
  getInteractionsToConversion: (leads: Lead[], pipelines: Pipeline[]) => {
    const wonLeads = leads.filter(l => metricsUtils.isWonLead(l, pipelines));
    const lostLeads = leads.filter(l => metricsUtils.isLostLead(l, pipelines));

    const getAvgInteractions = (leadsList: Lead[]) => {
      if (leadsList.length === 0) return 0;
      const totalInteractions = leadsList.reduce((acc, l) => acc + (l.interactions?.length || 0), 0);
      return totalInteractions / leadsList.length;
    };

    return {
      won: getAvgInteractions(wonLeads),
      lost: getAvgInteractions(lostLeads)
    };
  },

  // Melhor tipo de contato
  getBestContactType: (leads: Lead[], pipelines: Pipeline[]) => {
    const typeStats: Record<string, { total: number; won: number }> = {};

    leads.forEach(lead => {
      lead.interactions?.forEach(interaction => {
        const type = interaction.type || 'Outro';
        if (!typeStats[type]) {
          typeStats[type] = { total: 0, won: 0 };
        }
        typeStats[type].total += 1;
        if (metricsUtils.isWonLead(lead, pipelines)) {
          typeStats[type].won += 1;
        }
      });
    });

    return Object.entries(typeStats)
      .map(([type, stats]) => ({
        type,
        conversionRate: stats.total > 0 ? (stats.won / stats.total) * 100 : 0,
        total: stats.total
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate);
  }
};
