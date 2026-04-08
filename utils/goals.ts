
import { Lead, Pipeline } from '../types';
import { metricsUtils } from './metrics';

export const goalsUtils = {
  // Calcular progresso da meta mensal
  getMonthlyGoalProgress: (
    leads: Lead[], 
    pipelines: Pipeline[], 
    monthlyGoal: number
  ) => {
    const wonThisMonth = leads.filter(l => {
      if (!metricsUtils.isWonLead(l, pipelines)) return false;
      
      const wonDate = new Date(l.last_activity_at || l.created_at);
      const now = new Date();
      return wonDate.getMonth() === now.getMonth() && 
             wonDate.getFullYear() === now.getFullYear();
    });

    const currentRevenue = wonThisMonth.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    const progress = monthlyGoal > 0 ? (currentRevenue / monthlyGoal) * 100 : 0;
    const remaining = monthlyGoal - currentRevenue;

    return {
      current: currentRevenue,
      goal: monthlyGoal,
      progress: Math.min(progress, 100),
      remaining: Math.max(remaining, 0)
    };
  },

  // Calcular leads necessários para atingir meta
  getLeadsNeededForGoal: (
    leads: Lead[],
    pipelines: Pipeline[],
    monthlyGoal: number
  ) => {
    const { remaining } = goalsUtils.getMonthlyGoalProgress(leads, pipelines, monthlyGoal);
    const metrics = metricsUtils.calculateMetrics(leads, [], pipelines);
    
    const leadsNeeded = metrics.averageTicket > 0 
      ? Math.ceil(remaining / metrics.averageTicket)
      : 0;

    return leadsNeeded;
  },

  // Calcular dias úteis restantes no mês
  getBusinessDaysRemaining: () => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    let businessDays = 0;
    for (let d = new Date(now); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo (0) nem sábado (6)
        businessDays++;
      }
    }
    
    return businessDays;
  },

  // Calcular ritmo necessário (burn rate)
  getDailyBurnRate: (
    leads: Lead[],
    pipelines: Pipeline[],
    monthlyGoal: number
  ) => {
    const { remaining } = goalsUtils.getMonthlyGoalProgress(leads, pipelines, monthlyGoal);
    const daysRemaining = goalsUtils.getBusinessDaysRemaining();
    
    const dailyRate = daysRemaining > 0 ? remaining / daysRemaining : 0;
    
    return {
      dailyRate,
      daysRemaining,
      isViable: dailyRate <= (monthlyGoal / 20) // Meta diária não deve ser > 5% da meta mensal
    };
  },

  // Projetar atingimento da meta
  getGoalProjection: (
    leads: Lead[],
    pipelines: Pipeline[],
    monthlyGoal: number
  ) => {
    const { current } = goalsUtils.getMonthlyGoalProgress(leads, pipelines, monthlyGoal);
    const daysRemaining = goalsUtils.getBusinessDaysRemaining();
    
    // Calcular média diária atual (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentWins = leads.filter(l => {
      if (!metricsUtils.isWonLead(l, pipelines)) return false;
      const wonDate = new Date(l.last_activity_at || l.created_at);
      return wonDate >= sevenDaysAgo;
    });
    
    const recentRevenue = recentWins.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    const currentDailyAvg = recentRevenue / 7;
    
    const projectedTotal = current + (currentDailyAvg * daysRemaining);
    const willAchieve = projectedTotal >= monthlyGoal;
    
    return {
      projected: projectedTotal,
      willAchieve,
      confidence: willAchieve ? 
        Math.min((projectedTotal / monthlyGoal) * 100, 100) : 
        (projectedTotal / monthlyGoal) * 100
    };
  }
};
