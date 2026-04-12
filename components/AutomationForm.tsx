
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { 
  Automation, 
  AutomationEntityType, 
  AutomationTriggerType, 
  AutomationCondition, 
  AutomationAction,
  Pipeline,
  PipelineStage,
  User,
  FunnelStatus,
  TaskStatus
} from '../types';
import { automationSchema } from '../utils/automationValidation';
import { supabase } from '../lib/supabase';

interface AutomationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Automation>) => Promise<void>;
  automation?: Automation | null;
  workspaceId: string;
}

const AutomationForm: React.FC<AutomationFormProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  automation,
  workspaceId
}) => {
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<AutomationEntityType>(AutomationEntityType.LEAD);
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>(AutomationTriggerType.LEAD_CREATED);
  const [isActive, setIsActive] = useState(true);
  const [conditions, setConditions] = useState<any>([]);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Contextual data
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [allStages, setAllStages] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      
      try {
        // Buscamos todas as pipelines que o usuário tem acesso
        // O RLS do Supabase já filtrará por workspace se estiver configurado
        const { data: pData, error: pError } = await supabase
          .from('m4_pipelines')
          .select('*')
          .order('position');

        if (pError) throw pError;

        const pipelineIds = (pData || []).map(p => p.id);
        
        const isUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
        const validWorkspaceId = isUUID(workspaceId) ? workspaceId : null;

        // Depois buscamos estágios e usuários em paralelo
        const [
          { data: sData },
          { data: uData }
        ] = await Promise.all([
          pipelineIds.length > 0 
            ? supabase.from('m4_pipeline_stages').select('*').in('pipeline_id', pipelineIds).order('position')
            : Promise.resolve({ data: [] }),
          validWorkspaceId 
            ? supabase.from('m4_users').select('*').eq('workspace_id', validWorkspaceId).order('name')
            : supabase.from('m4_users').select('*').order('name')
        ]);

        setPipelines(pData || []);
        setAllStages(sData || []);
        setUsers(uData || []);
      } catch (err) {
        console.error('Error fetching contextual data:', err);
      }
    };

    fetchData();
  }, [isOpen, workspaceId]);

  useEffect(() => {
    if (automation) {
      setName(automation.name);
      setEntityType(automation.entity_type);
      setTriggerType(automation.trigger_type);
      setIsActive(automation.is_active);
      setConditions(automation.trigger_conditions || []);
      setActions(automation.actions || []);
    } else {
      setName('');
      setEntityType(AutomationEntityType.LEAD);
      setTriggerType(AutomationTriggerType.LEAD_CREATED);
      setIsActive(true);
      setConditions([]);
      setActions([]);
    }
    setErrors({});
  }, [automation, isOpen]);

  const handleTriggerTypeChange = (newType: AutomationTriggerType) => {
    setTriggerType(newType);
    // Initialize conditions based on type if it's a new automation or changing type
    if (newType === AutomationTriggerType.STAGE_CHANGE) {
      setConditions({ pipeline_id: '', from_stage_id: '', to_stage_id: '' });
    } else if (newType === AutomationTriggerType.STATUS_CHANGE) {
      setConditions({ from_status: '', to_status: '' });
    } else if (newType === AutomationTriggerType.RESPONSIBLE_CHANGE) {
      setConditions({ responsible_id: '' });
    } else if (newType === AutomationTriggerType.DATE_TRIGGER) {
      setConditions({ field: '', days_offset: 0 });
    } else {
      setConditions([]);
    }
  };

  const handleAddCondition = () => {
    if (Array.isArray(conditions)) {
      setConditions([...conditions, { field: '', operator: 'equals', value: '' }]);
    } else {
      setConditions([{ field: '', operator: 'equals', value: '' }]);
    }
  };

  const handleRemoveCondition = (index: number) => {
    if (Array.isArray(conditions)) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const handleConditionChange = (index: number, field: keyof AutomationCondition, value: any) => {
    if (Array.isArray(conditions)) {
      const newConditions = [...conditions];
      newConditions[index] = { ...newConditions[index], [field]: value };
      setConditions(newConditions);
    }
  };

  const handleContextualConditionChange = (field: string, value: any) => {
    setConditions((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddAction = () => {
    setActions([...actions, { type: 'update_field', config: {} }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleActionChange = (index: number, field: string, value: any) => {
    const newActions = [...actions];
    if (field === 'type') {
      // Ao mudar o tipo da ação, resetamos o config para evitar lixo de outras ações
      newActions[index] = { ...newActions[index], type: value as any, config: {} };
    } else if (field === 'pipeline_id') {
      // Ao mudar o pipeline de destino, limpamos a etapa anterior para forçar nova seleção
      newActions[index] = { 
        ...newActions[index], 
        config: { 
          ...newActions[index].config, 
          pipeline_id: value,
          stage_id: '' 
        } 
      };
    } else {
      newActions[index] = { ...newActions[index], config: { ...newActions[index].config, [field]: value } };
    }
    setActions(newActions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const isUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
    let cleanWorkspaceId = isUUID(workspaceId) ? workspaceId : null;

    // Se ainda não temos um workspaceId válido, tentamos buscar o primeiro disponível em várias tabelas
    if (!cleanWorkspaceId) {
      // 1. Tentar settings
      const { data: settings } = await supabase.from('m4_settings').select('workspace_id').maybeSingle();
      if (settings?.workspace_id) {
        cleanWorkspaceId = settings.workspace_id;
      } else {
        // 2. Tentar pipelines
        const { data: pipelines } = await supabase.from('m4_pipelines').select('workspace_id').not('workspace_id', 'is', null).limit(1);
        if (pipelines && pipelines.length > 0) {
          cleanWorkspaceId = pipelines[0].workspace_id;
        } else {
          // 3. Tentar usuários
          const { data: users } = await supabase.from('m4_users').select('workspace_id').not('workspace_id', 'is', null).limit(1);
          if (users && users.length > 0) {
            cleanWorkspaceId = users[0].workspace_id;
          }
        }
      }
    }

    const formData = {
      name,
      workspace_id: cleanWorkspaceId,
      entity_type: entityType,
      trigger_type: triggerType,
      trigger_conditions: conditions,
      actions,
      is_active: isActive,
    };

    const result = automationSchema.safeParse(formData);

    if (!result.success) {
      console.error('Validation errors:', result.error.format());
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        newErrors[path] = issue.message;
      });
      
      // If there are errors in fields not visible or not specifically handled, put them in global
      if (Object.keys(newErrors).length > 0) {
        const firstError = Object.values(newErrors)[0];
        newErrors.global = `Erro de validação: ${firstError}`;
      }
      
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      console.error('Error saving automation:', error);
      const message = error.message || 'Erro ao salvar automação. Tente novamente.';
      setErrors({ global: message });
    } finally {
      setLoading(false);
    }
  };

  const renderContextualConditions = () => {
    switch (triggerType) {
      case AutomationTriggerType.STAGE_CHANGE:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-900">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Pipeline</label>
              <select
                value={conditions.pipeline_id || ''}
                onChange={(e) => {
                  handleContextualConditionChange('pipeline_id', e.target.value);
                  handleContextualConditionChange('from_stage_id', '');
                  handleContextualConditionChange('to_stage_id', '');
                }}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
              >
                <option value="">Selecione um pipeline</option>
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Quando sair da etapa</label>
              <select
                value={conditions.from_stage_id || ''}
                disabled={!conditions.pipeline_id}
                onChange={(e) => handleContextualConditionChange('from_stage_id', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Qualquer etapa</option>
                {allStages.filter(s => s.pipeline_id === conditions.pipeline_id).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Quando entrar na etapa</label>
              <select
                value={conditions.to_stage_id || ''}
                disabled={!conditions.pipeline_id}
                onChange={(e) => handleContextualConditionChange('to_stage_id', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Qualquer etapa</option>
                {allStages.filter(s => s.pipeline_id === conditions.pipeline_id).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case AutomationTriggerType.STATUS_CHANGE:
        const statuses = entityType === AutomationEntityType.LEAD 
          ? [
              { id: 'active', name: 'Ativo' },
              { id: 'won', name: 'Ganho' },
              { id: 'lost', name: 'Perdido' }
            ]
          : entityType === AutomationEntityType.TASK
          ? [
              { id: TaskStatus.TODO, name: 'Pendente' },
              { id: TaskStatus.IN_PROGRESS, name: 'Em Execução' },
              { id: TaskStatus.REVIEW, name: 'Revisão' },
              { id: TaskStatus.DONE, name: 'Concluído' }
            ]
          : [
              { id: 'active', name: 'Ativo' },
              { id: 'inactive', name: 'Inativo' }
            ];

        return (
          <div className="space-y-4">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-900">
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase leading-tight">
                  Dica: Use "Alteração de Status" para resultados finais (Ganho/Perdido). Para automações entre etapas do pipeline (ex: Lead para Qualificação), use o gatilho "Alteração de Etapa".
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Pipeline (Opcional)</label>
                  <select
                    value={conditions.pipeline_id || ''}
                    onChange={(e) => handleContextualConditionChange('pipeline_id', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  >
                    <option value="">Todos os pipelines</option>
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">De Status</label>
                  <select
                    value={conditions.from_status || ''}
                    onChange={(e) => handleContextualConditionChange('from_status', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  >
                    <option value="">Qualquer status</option>
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Para o Status</label>
                  <select
                    value={conditions.to_status || ''}
                    onChange={(e) => handleContextualConditionChange('to_status', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  >
                    <option value="">Qualquer status</option>
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case AutomationTriggerType.LEAD_CREATED:
        return (
          <div className="space-y-4">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Pipeline (Opcional)</label>
                  <select
                    value={conditions.pipeline_id || ''}
                    onChange={(e) => handleContextualConditionChange('pipeline_id', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  >
                    <option value="">Todos os pipelines</option>
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-center p-4">
                  <p className="text-[10px] text-slate-400 font-bold uppercase text-center">A automação rodará quando um lead for criado no pipeline selecionado.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case AutomationTriggerType.RESPONSIBLE_CHANGE:
        return (
          <div className="space-y-4">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Pipeline (Opcional)</label>
                  <select
                    value={conditions.pipeline_id || ''}
                    onChange={(e) => handleContextualConditionChange('pipeline_id', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  >
                    <option value="">Todos os pipelines</option>
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Para o Responsável</label>
                  <select
                    value={conditions.responsible_id || ''}
                    onChange={(e) => handleContextualConditionChange('responsible_id', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  >
                    <option value="">Qualquer responsável</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case AutomationTriggerType.FIELD_UPDATE:
        return (
          <div className="space-y-4">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-900">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Pipeline (Opcional)</label>
                  <select
                    value={conditions.pipeline_id || ''}
                    onChange={(e) => handleContextualConditionChange('pipeline_id', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  >
                    <option value="">Todos os pipelines</option>
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Campo</label>
                  <input
                    type="text"
                    placeholder="Ex: phone, email"
                    value={conditions.field || ''}
                    onChange={(e) => handleContextualConditionChange('field', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Novo Valor (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Qualquer valor"
                    value={conditions.value || ''}
                    onChange={(e) => handleContextualConditionChange('value', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case AutomationTriggerType.DATE_TRIGGER:
        const dateFields = entityType === AutomationEntityType.LEAD
          ? [
              { id: 'created_at', name: 'Data de Criação' },
              { id: 'updated_at', name: 'Data de Atualização' }
            ]
          : entityType === AutomationEntityType.TASK
          ? [
              { id: 'due_date', name: 'Data de Vencimento' },
              { id: 'created_at', name: 'Data de Criação' }
            ]
          : [
              { id: 'contract_start_date', name: 'Início do Contrato' },
              { id: 'created_at', name: 'Data de Criação' }
            ];

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-900">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Campo de Data</label>
              <select
                value={conditions.field || ''}
                onChange={(e) => handleContextualConditionChange('field', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
              >
                <option value="">Selecione um campo</option>
                {dateFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Antecedência/Atraso (Dias)</label>
              <input
                type="number"
                value={conditions.days_offset || 0}
                onChange={(e) => handleContextualConditionChange('days_offset', parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                placeholder="Ex: -1 para 1 dia antes, 1 para 1 dia depois"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            {(!Array.isArray(conditions) || conditions.length === 0) && (
              <div className="p-6 border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-3xl text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Nenhuma condição configurada. A automação rodará sempre.</p>
              </div>
            )}
            {Array.isArray(conditions) && conditions.map((condition, index) => (
              <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-900 animate-in slide-in-from-left-2 duration-200">
                <div className="flex-1 min-w-[150px]">
                  <input
                    type="text"
                    placeholder="Campo"
                    value={condition.field}
                    onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  />
                </div>
                <div className="w-full md:w-40">
                  <select
                    value={condition.operator}
                    onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  >
                    <option value="equals">Igual a</option>
                    <option value="not_equals">Diferente de</option>
                    <option value="contains">Contém</option>
                    <option value="greater_than">Maior que</option>
                    <option value="less_than">Menor que</option>
                    <option value="is_empty">Está vazio</option>
                    <option value="is_not_empty">Não está vazio</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <input
                    type="text"
                    placeholder="Valor"
                    value={condition.value}
                    onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => handleRemoveCondition(index)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <ICONS.Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-950 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
              {automation ? 'Editar Automação' : 'Nova Automação'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Configure gatilhos, condições e ações.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-400">
            <ICONS.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
          {errors.global && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold flex items-center gap-3 border border-red-100 dark:border-red-900/30">
              <ICONS.AlertTriangle className="w-5 h-5" />
              {errors.global}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Nome da Automação</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border ${errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200`}
                placeholder="Ex: Onboarding de Novos Leads"
              />
              {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase px-1">{errors.name}</p>}
            </div>

            <div className="flex items-center gap-4 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Ativa</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Entidade Alvo</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as AutomationEntityType)}
                className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border ${errors.entity_type ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer`}
              >
                <option value={AutomationEntityType.LEAD}>Leads</option>
                <option value={AutomationEntityType.TASK}>Tarefas</option>
                <option value={AutomationEntityType.CLIENT}>Clientes</option>
              </select>
              {errors.entity_type && <p className="text-red-500 text-[10px] font-bold uppercase px-1">{errors.entity_type}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Gatilho (Trigger)</label>
              <select
                value={triggerType}
                onChange={(e) => handleTriggerTypeChange(e.target.value as AutomationTriggerType)}
                className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border ${errors.trigger_type ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer`}
              >
                <option value={AutomationTriggerType.LEAD_CREATED}>Lead Criado</option>
                <option value={AutomationTriggerType.STATUS_CHANGE}>Alteração de Status (Ganho/Perdido)</option>
                <option value={AutomationTriggerType.STAGE_CHANGE}>Alteração de Etapa (Pipeline)</option>
                <option value={AutomationTriggerType.RESPONSIBLE_CHANGE}>Alteração de Responsável</option>
                <option value={AutomationTriggerType.FIELD_UPDATE}>Atualização de Campo</option>
                <option value={AutomationTriggerType.TASK_CREATED}>Tarefa Criada</option>
                <option value={AutomationTriggerType.TASK_COMPLETED}>Tarefa Concluída</option>
                <option value={AutomationTriggerType.NO_ACTIVITY}>Inatividade</option>
                <option value={AutomationTriggerType.DATE_TRIGGER}>Data Específica</option>
              </select>
              {errors.trigger_type && <p className="text-red-500 text-[10px] font-bold uppercase px-1">{errors.trigger_type}</p>}
            </div>
          </div>

          {/* CONDITIONS SECTION */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Configuração do Gatilho</label>
              {Array.isArray(conditions) && (
                <button 
                  type="button" 
                  onClick={handleAddCondition}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
                >
                  <ICONS.Plus className="w-3 h-3" /> Adicionar Condição
                </button>
              )}
            </div>
            
            {renderContextualConditions()}
          </div>

          {/* ACTIONS SECTION */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ações</label>
              <button 
                type="button" 
                onClick={handleAddAction}
                className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
              >
                <ICONS.Plus className="w-3 h-3" /> Adicionar Ação
              </button>
            </div>

            {errors.actions && <p className="text-red-500 text-[10px] font-bold uppercase px-1">{errors.actions}</p>}

            <div className="space-y-3">
              {actions.length === 0 && (
                <div className="p-6 border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-3xl text-center">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Você precisa adicionar pelo menos uma ação.</p>
                </div>
              )}
              {actions.map((action, index) => (
                <div key={index} className="p-5 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-900 animate-in slide-in-from-right-2 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black">{index + 1}</div>
                      <select
                        value={action.type}
                        onChange={(e) => handleActionChange(index, 'type', e.target.value)}
                        className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                      >
                        <option value="update_field">Atualizar Campo</option>
                        <option value="create_task">Criar Tarefa</option>
                        <option value="send_notification">Enviar Notificação</option>
                        <option value="send_webhook">Enviar Webhook</option>
                        <option value="change_stage">Mudar Etapa</option>
                        <option value="assign_user">Atribuir Usuário</option>
                        <option value="move_to_pipeline">Mover para Pipeline</option>
                        <option value="duplicate_to_pipeline">Duplicar para Pipeline</option>
                      </select>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveAction(index)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <ICONS.Trash className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {action.type === 'update_field' && (
                      <>
                        <input
                          type="text"
                          placeholder="Nome do Campo"
                          value={action.config.field || ''}
                          onChange={(e) => handleActionChange(index, 'field', e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Novo Valor"
                          value={action.config.value || ''}
                          onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                        />
                      </>
                    )}
                    {action.type === 'create_task' && (
                      <>
                        <input
                          type="text"
                          placeholder="Título da Tarefa"
                          value={action.config.title || ''}
                          onChange={(e) => handleActionChange(index, 'title', e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="Prazo (dias)"
                          value={action.config.due_days || ''}
                          onChange={(e) => handleActionChange(index, 'due_days', e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                        />
                      </>
                    )}
                    {action.type === 'change_stage' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Pipeline</label>
                          <select
                            value={action.config.pipeline_id || ''}
                            onChange={(e) => handleActionChange(index, 'pipeline_id', e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                          >
                            <option value="">Selecione um pipeline</option>
                            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Etapa de Destino</label>
                          <select
                            value={action.config.stage_id || ''}
                            disabled={!action.config.pipeline_id}
                            onChange={(e) => handleActionChange(index, 'stage_id', e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-50"
                          >
                            <option value="">Selecione uma etapa</option>
                            {allStages.filter(s => s.pipeline_id === action.config.pipeline_id).map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    {(action.type === 'move_to_pipeline' || action.type === 'duplicate_to_pipeline') && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Pipeline de Destino</label>
                          <select
                            value={action.config.pipeline_id || ''}
                            onChange={(e) => handleActionChange(index, 'pipeline_id', e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                          >
                            <option value="">Selecione um pipeline</option>
                            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Etapa de Destino</label>
                          <select
                            value={action.config.stage_id || ''}
                            disabled={!action.config.pipeline_id}
                            onChange={(e) => handleActionChange(index, 'stage_id', e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-50"
                          >
                            <option value="">Selecione uma etapa</option>
                            {allStages.filter(s => s.pipeline_id === action.config.pipeline_id).map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    {action.type === 'assign_user' && (
                      <select
                        value={action.config.user_id || ''}
                        onChange={(e) => handleActionChange(index, 'user_id', e.target.value)}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                      >
                        <option value="">Selecione um usuário</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-slate-100 dark:border-slate-900 flex justify-end gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-4 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-10 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all flex items-center gap-3 disabled:opacity-50"
          >
            {loading ? <span className="animate-spin text-lg">◌</span> : <ICONS.Check />}
            {loading ? 'Salvando...' : 'Salvar Automação'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutomationForm;
