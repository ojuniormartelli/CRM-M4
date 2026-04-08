
import { Lead, Pipeline, PipelineStage, FunnelStatus } from '../types';

export const funnelUtils = {
  /**
   * Resolve o estágio real de um lead, lidando com IDs legados e fallbacks.
   */
  resolveLeadStage: (lead: Lead, pipelines: Pipeline[]): PipelineStage | null => {
    if (pipelines.length === 0) return null;

    // 1. Tenta encontrar pelo pipeline_id e stage ID atual
    const pipeline = pipelines.find(p => p.id === lead.pipeline_id) || pipelines[0];
    if (!pipeline) return null;

    const stage = pipeline.stages.find(s => s.id === lead.stage);
    if (stage) return stage;

    // 2. Se não encontrou, tenta mapear IDs legados comuns
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
      'active': FunnelStatus.INITIAL
    };

    const normalizedStageId = String(lead.stage || '').toLowerCase();
    const normalizedStatus = String(lead.status || '').toLowerCase();
    
    const targetStatus = legacyMap[normalizedStageId] || legacyMap[normalizedStatus] || FunnelStatus.INITIAL;

    // 3. Tenta encontrar um estágio no pipeline que tenha esse status
    const fallbackStage = pipeline.stages.find(s => s.status === targetStatus) || pipeline.stages[0];
    return fallbackStage || null;
  },

  /**
   * Determina a classificação (status) do lead baseada prioritariamente no estágio.
   */
  resolveLeadStatus: (lead: Lead, stage: PipelineStage | null): FunnelStatus => {
    if (stage?.status) {
      const s = String(stage.status).toUpperCase();
      if (s === 'INITIAL' || s === 'INICIAL') return FunnelStatus.INITIAL;
      if (s === 'INTERMEDIATE' || s === 'INTERMEDIARIO') return FunnelStatus.INTERMEDIATE;
      if (s === 'WON' || s === 'GANHO') return FunnelStatus.WON;
      if (s === 'LOST' || s === 'PERDIDO') return FunnelStatus.LOST;
      
      // Se for um valor do enum mas em outro case
      if (Object.values(FunnelStatus).includes(s as FunnelStatus)) return s as FunnelStatus;
    }
    
    // Fallback para o campo status do lead se o estágio for inválido
    const s = String(lead.status || '').toLowerCase();
    if (s === 'won' || s === 'ganho') return FunnelStatus.WON;
    if (s === 'lost' || s === 'perdido') return FunnelStatus.LOST;
    
    return FunnelStatus.INITIAL;
  },

  /**
   * Verifica se um lead é considerado "Ativo" (não ganho e não perdido).
   */
  isLeadActive: (lead: Lead, pipelines: Pipeline[]): boolean => {
    const stage = funnelUtils.resolveLeadStage(lead, pipelines);
    const status = funnelUtils.resolveLeadStatus(lead, stage);
    return status !== FunnelStatus.WON && status !== FunnelStatus.LOST;
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
