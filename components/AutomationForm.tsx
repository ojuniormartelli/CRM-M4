
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { 
  Automation, 
  AutomationEntityType, 
  AutomationTriggerType, 
  AutomationCondition, 
  AutomationAction 
} from '../types';
import { automationSchema } from '../utils/automationValidation';

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
  const [conditions, setConditions] = useState<AutomationCondition[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleAddCondition = () => {
    setConditions([...conditions, { field: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: keyof AutomationCondition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
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
      newActions[index] = { ...newActions[index], type: value as any };
    } else {
      newActions[index] = { ...newActions[index], config: { ...newActions[index].config, [field]: value } };
    }
    setActions(newActions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = {
      name,
      workspace_id: workspaceId,
      entity_type: entityType,
      trigger_type: triggerType,
      trigger_conditions: conditions,
      actions,
      is_active: isActive,
    };

    const result = automationSchema.safeParse(formData);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        newErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving automation:', error);
      setErrors({ global: 'Erro ao salvar automação. Tente novamente.' });
    } finally {
      setLoading(false);
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
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
              >
                <option value={AutomationEntityType.LEAD}>Leads</option>
                <option value={AutomationEntityType.TASK}>Tarefas</option>
                <option value={AutomationEntityType.CLIENT}>Clientes</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Gatilho (Trigger)</label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
              >
                <option value={AutomationTriggerType.LEAD_CREATED}>Lead Criado</option>
                <option value={AutomationTriggerType.STATUS_CHANGE}>Alteração de Status</option>
                <option value={AutomationTriggerType.STAGE_CHANGE}>Alteração de Etapa</option>
                <option value={AutomationTriggerType.FIELD_UPDATE}>Atualização de Campo</option>
                <option value={AutomationTriggerType.TASK_CREATED}>Tarefa Criada</option>
                <option value={AutomationTriggerType.TASK_COMPLETED}>Tarefa Concluída</option>
                <option value={AutomationTriggerType.NO_ACTIVITY}>Inatividade</option>
                <option value={AutomationTriggerType.DATE_TRIGGER}>Data Específica</option>
              </select>
            </div>
          </div>

          {/* CONDITIONS SECTION */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Condições (Filtros)</label>
              <button 
                type="button" 
                onClick={handleAddCondition}
                className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
              >
                <ICONS.Plus className="w-3 h-3" /> Adicionar Condição
              </button>
            </div>
            
            <div className="space-y-3">
              {conditions.length === 0 && (
                <div className="p-6 border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-3xl text-center">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Nenhuma condição configurada. A automação rodará sempre.</p>
                </div>
              )}
              {conditions.map((condition, index) => (
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
                    {/* Add more specific inputs for other action types as needed */}
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
