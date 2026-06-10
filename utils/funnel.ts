
import { Lead, Pipeline, PipelineStage, FunnelStatus } from '../types';

export const funnelUtils = {
  /**
   * Resolve o estágio real de um lead, lidando com IDs legados e fallbacks.
   */
  resolveLeadStage: (lead: Lead, pipelines: Pipeline[]): PipelineStage | null => {
    if (pipelines.length === 0) return null;

    // A. First try to find any stage across all pipelines that matches lead.stage (which is stage_id) or lead.stage_id
    const stageId = lead.stage || lead.stage_id;
    if (stageId) {
      for (const p of pipelines) {
        const found = p.stages.find(s => s.id === stageId);
        if (found) return found;
      }
    }

    // B. Second, try to find a custom pipeline mapped by pipeline_id
    const pipeline = pipelines.find(p => p.id === lead.pipeline_id);
    if (pipeline) {
      const stage = pipeline.stages.find(s => s.id === stageId);
      if (stage) return stage;
    }

    // C. Fallback pipeline: use pipelines[0]
    const defaultPipeline = pipelines[0];

    // D. Map legacy statuses and names
    const legacyMap: Record<string, FunnelStatus> = {
      'new': FunnelStatus.INITIAL,
      's1': FunnelStatus.INITIAL,
      'qualified': FunnelStatus.INTERMEDIATE,
      'meeting': FunnelStatus.INTERMEDIATE,
      'proposal': FunnelStatus.INTERMEDIATE,
      'won': FunnelStatus.WON,
      'lost': FunnelStatus.LOST,
      'ganho': FunnelStatus.WON,
      'perdido': FunnelStatus.LOST,
      'active': FunnelStatus.INITIAL,
      'lead': FunnelStatus.INITIAL,
      'novo lead': FunnelStatus.INITIAL,
      'qualificação': FunnelStatus.INTERMEDIATE,
      'qualificado': FunnelStatus.INTERMEDIATE,
      'reunião': FunnelStatus.INTERMEDIATE,
      'proposta': FunnelStatus.INTERMEDIATE,
      'negociação': FunnelStatus.INTERMEDIATE,
      'fechado': FunnelStatus.WON,
      'cliente': FunnelStatus.WON,
      'intermediario': FunnelStatus.INTERMEDIATE,
      'intermediaria': FunnelStatus.INTERMEDIATE,
      'intermediário': FunnelStatus.INTERMEDIATE,
      'intermediária': FunnelStatus.INTERMEDIATE,
      'prospecção': FunnelStatus.INITIAL,
      'prospeccao': FunnelStatus.INITIAL,
      'em andamento': FunnelStatus.INTERMEDIATE,
      'onboarding': FunnelStatus.INTERMEDIATE,
      'operação': FunnelStatus.INTERMEDIATE,
      'operacao': FunnelStatus.INTERMEDIATE
    };

    const normalizedStageId = String(stageId || '').toLowerCase().trim();
    const normalizedStatus = String(lead.status || '').toLowerCase().trim();
    
    const targetStatus = legacyMap[normalizedStageId] || legacyMap[normalizedStatus] || FunnelStatus.INITIAL;

    // Use defaultPipeline stages to find one with the targetStatus
    const fallbackStage = defaultPipeline.stages.find(s => s.status === targetStatus) || defaultPipeline.stages[0];
    return fallbackStage || null;
  },

  /**
   * Determina a classificação (status) do lead baseada prioritariamente no estágio.
   */
  resolveLeadStatus: (lead: Lead, stage: PipelineStage | null): FunnelStatus => {
    // 1. O status explícito do lead tem prioridade absoluta
    const ls = String(lead.status || '').toLowerCase();
    if (ls === 'won' || ls === 'ganho') return FunnelStatus.WON;
    if (ls === 'lost' || ls === 'perdido') return FunnelStatus.LOST;

    // 2. Caso contrário, usa o status do estágio do pipeline
    if (stage?.status) {
      const s = String(stage.status).toUpperCase();
      if (s === 'INITIAL' || s === 'INICIAL') return FunnelStatus.INITIAL;
      if (s === 'INTERMEDIATE' || s === 'INTERMEDIARIO') return FunnelStatus.INTERMEDIATE;
      if (s === 'WON' || s === 'GANHO') return FunnelStatus.WON;
      if (s === 'LOST' || s === 'PERDIDO') return FunnelStatus.LOST;
      
      if (Object.values(FunnelStatus).includes(s as FunnelStatus)) return s as FunnelStatus;
    }
    
    return FunnelStatus.INITIAL;
  },

  /**
   * Verifica se um lead é considerado "Ativo" (não ganho e não perdido).
   */
  isLeadActive: (lead: Lead, pipelines: Pipeline[]): boolean => {
    // 1. Excluir com base em statuses conhecidos no lead
    const leadStatusStr = String(lead.status || '').toLowerCase().trim();
    if (
      leadStatusStr === 'won' || 
      leadStatusStr === 'ganho' || 
      leadStatusStr === 'lost' || 
      leadStatusStr === 'perdido' || 
      leadStatusStr === 'archived' || 
      leadStatusStr === 'arquivado' || 
      leadStatusStr === 'cancelled' || 
      leadStatusStr === 'cancelado' ||
      leadStatusStr === 'inactive' ||
      leadStatusStr === 'inativo' ||
      leadStatusStr === 'virou cliente'
    ) {
      return false;
    }

    // 2. Resolver estágio e seu status
    const stage = funnelUtils.resolveLeadStage(lead, pipelines);
    const status = funnelUtils.resolveLeadStatus(lead, stage);
    if (status === FunnelStatus.WON || status === FunnelStatus.LOST) {
      return false;
    }

    // 3. Excluir com base no nome do estágio resolvido ou direto no lead.stage
    const stageName = String(stage?.name || lead.stage || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (
      stageName === 'virou cliente' || 
      stageName === 'cliente' || 
      stageName === 'ganho' || 
      stageName === 'perdido' ||
      stageName === 'cancelado' ||
      stageName === 'arquivado' ||
      stageName === 'concluido' ||
      stageName === 'fechado' ||
      stageName === 'win' ||
      stageName === 'loss'
    ) {
      return false;
    }

    return true;
  },

  isWonLead: (lead: Lead, pipelines: Pipeline[]): boolean => {
    // Verificar status do lead primeiro
    const leadStatusStr = String(lead.status || '').toLowerCase().trim();
    if (leadStatusStr === 'won' || leadStatusStr === 'ganho' || leadStatusStr === 'virou cliente') {
      return true;
    }
    const stage = funnelUtils.resolveLeadStage(lead, pipelines);
    const status = funnelUtils.resolveLeadStatus(lead, stage);
    if (status === FunnelStatus.WON) {
      return true;
    }
    const stageName = String(stage?.name || lead.stage || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return stageName === 'virou cliente' || stageName === 'cliente' || stageName === 'ganho' || stageName === 'fechado' || stageName === 'win';
  },

  isLostLead: (lead: Lead, pipelines: Pipeline[]): boolean => {
    const leadStatusStr = String(lead.status || '').toLowerCase().trim();
    if (leadStatusStr === 'lost' || leadStatusStr === 'perdido' || leadStatusStr === 'cancelled' || leadStatusStr === 'cancelado') {
      return true;
    }
    const stage = funnelUtils.resolveLeadStage(lead, pipelines);
    const status = funnelUtils.resolveLeadStatus(lead, stage);
    if (status === FunnelStatus.LOST) {
      return true;
    }
    const stageName = String(stage?.name || lead.stage || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return stageName === 'perdido' || stageName === 'cancelado' || stageName === 'arquivado' || stageName === 'loss';
  },

  /**
   * Agrupa leads por estágio para o Kanban.
   */
  groupLeadsByStage: (leads: Lead[], pipeline: Pipeline) => {
    const groups: Record<string, Lead[]> = {};
    pipeline.stages.forEach(s => groups[s.id] = []);

    leads.forEach(lead => {
      // Só processa se o lead pertencer a este pipeline ou não tiver pipeline (cai no default)
      if (lead.pipeline_id && lead.pipeline_id !== pipeline.id) return;

      const stage = funnelUtils.resolveLeadStage(lead, [pipeline]);
      if (stage && groups[stage.id]) {
        groups[stage.id].push(lead);
      }
    });

    return groups;
  },

  /**
   * Gera o resumo consolidado de contagens para dashboards.
   */
  getLeadSummaryCounts: (leads: Lead[], pipelines: Pipeline[]) => {
    let initial = 0;
    let intermediate = 0;
    let won = 0;
    let lost = 0;
    let totalValue = 0;

    leads.forEach(lead => {
      const stage = funnelUtils.resolveLeadStage(lead, pipelines);
      const status = funnelUtils.resolveLeadStatus(lead, stage);

      if (status === FunnelStatus.INITIAL) initial++;
      else if (status === FunnelStatus.INTERMEDIATE) intermediate++;
      else if (status === FunnelStatus.WON) won++;
      else if (status === FunnelStatus.LOST) lost++;

      // Valor apenas para ativos
      if (status !== FunnelStatus.WON && status !== FunnelStatus.LOST) {
        totalValue += (Number(lead.value) || 0);
      }
    });

    return {
      initial,
      intermediate,
      won,
      lost,
      active: initial + intermediate,
      total: leads.length,
      totalValue
    };
  }
};
