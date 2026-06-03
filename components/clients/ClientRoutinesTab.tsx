import React, { useState } from 'react';
import { Task } from '../../types';
import { taskService } from '../../services/taskService';
import { 
  Clock, 
  Plus, 
  Play, 
  Pause,
  Archive,
  Power, 
  Check, 
  HelpCircle,
  FileCode,
  Sparkles
} from 'lucide-react';

interface ClientRoutinesTabProps {
  clientId: string;
  companyId: string | null;
  workspaceId: string;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ClientRoutinesTab: React.FC<ClientRoutinesTabProps> = ({
  clientId,
  companyId,
  workspaceId,
  tasks,
  setTasks,
  onShowToast,
}) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // New Routine Fields
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineDesc, setNewRoutineDesc] = useState('');
  const [newRoutineRecurrence, setNewRoutineRecurrence] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const recurringRoutines = tasks.filter(t => t.client_id === clientId && t.is_recurring && t.task_type === 'operational');

  const handleAddRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;

    setIsProcessing('add_routine');
    try {
      const routinePayload = {
        title: newRoutineTitle.trim(),
        description: newRoutineDesc.trim(),
        status: 'Ativo', // Storing active status inside status field for routines
        priority: 'Média',
        client_id: clientId,
        company_id: companyId || null,
        workspace_id: workspaceId,
        task_type: 'operational' as const,
        type: 'task' as const,
        is_recurring: true,
        recurrence_type: newRoutineRecurrence
      };

      const created = await taskService.create(routinePayload, workspaceId);
      setTasks(prev => [created, ...prev]);

      // Reset
      setNewRoutineTitle('');
      setNewRoutineDesc('');
      setNewRoutineRecurrence('weekly');
      onShowToast('Rotina recorrente operacional cadastrada!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao cadastrar rotina', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // Update routine status (active, paused, archived)
  const handleUpdateRoutineStatus = async (routine: Task, newStatus: 'Ativo' | 'Pausado' | 'Arquivado') => {
    try {
      await taskService.update(routine.id, { status: newStatus }, workspaceId);
      setTasks(prev => prev.map(t => t.id === routine.id ? { ...t, status: newStatus } : t));
      onShowToast(
        newStatus === 'Ativo' ? 'Rotina ativada e pronta para o acompanhamento.' : 
        newStatus === 'Pausado' ? 'Rotina pausada temporariamente.' : 
        'Rotina arquivada no playbook de processos.', 
        'info'
      );
    } catch (err) {
      onShowToast('Erro ao atualizar status da rotina', 'error');
    }
  };

  // Generate standard task from copy of routine for today
  const handleTriggerRoutineInstant = async (routine: Task) => {
    setIsProcessing(`trigger_${routine.id}`);
    try {
      const taskPayload = {
        title: `[Rotina] ${routine.title}`,
        description: routine.description || `Tarefa avulsa gerada sob demanda a partir do playbook: ${routine.title}`,
        status: 'Pendente',
        priority: 'Média',
        due_date: new Date(Date.now() + 86400000).toISOString(), // due tomorrow
        client_id: clientId,
        company_id: companyId,
        workspace_id: workspaceId,
        task_type: 'operational' as const,
        type: 'task' as const,
        is_recurring: false
      };

      const created = await taskService.create(taskPayload, workspaceId);
      setTasks(prev => [created, ...prev]);
      onShowToast(`Sucesso! Criada tarefa avulsa de entrega: "${created.title}"`, 'success');
    } catch (err) {
      onShowToast('Erro ao acionar rotina', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 animate-in fade-in duration-300">
      <div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>Rotinas & Processos Periódicos</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Modelos recorrentes periódicos para garantir a qualidade de entrega e rituais operacionais recorrentes.
        </p>
      </div>

      {/* Difference Box */}
      <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100/40 dark:border-blue-900/10 flex items-start gap-3.5">
        <HelpCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 dark:text-blue-300 leading-relaxed">
          <strong>O que são rotinas operacionais?</strong> Rotinas não são tarefas simples do dia-a-dia. Elas funcionam como o seu <strong>Playbook de Atendimento</strong>. Você configura a recorrência planejada do cliente e nossa inteligência usará essa base para sugerir ou despachar checklists pré-agendados.
        </div>
      </div>

      <form onSubmit={handleAddRoutine} className="flex flex-col gap-4 p-5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100/50 dark:border-slate-800">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Adicionar Rotina Operacional</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              required
              placeholder="Ex: Auditoria semanal de tráfego, Relatório mensal de ROI..."
              value={newRoutineTitle}
              onChange={e => setNewRoutineTitle(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <select
              value={newRoutineRecurrence}
              onChange={e => setNewRoutineRecurrence(e.target.value as any)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
            >
              <option value="daily">Recorrência Diária</option>
              <option value="weekly">Recorrência Semanal</option>
              <option value="monthly">Recorrência Mensal</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <input
            type="text"
            placeholder="Breve descrição dos entregáveis desta rotina (opcional)..."
            value={newRoutineDesc}
            onChange={e => setNewRoutineDesc(e.target.value)}
            className="w-full md:flex-1 px-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={isProcessing === 'add_routine'}
            className="w-full md:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-sm shrink-0"
          >
            Cadastrar Rotina
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
          Rotinas de Atendimento Cadastradas ({recurringRoutines.length})
        </h5>

        {recurringRoutines.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-100 dark:border-slate-850 rounded-2xl text-center text-slate-400 text-xs">
            Nenhuma rotina recorrente de squad cadastrada para esta conta ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {recurringRoutines.map((r) => {
              // Normalize status defaults to Ativo if invalid or old
              const status: 'Ativo' | 'Pausado' | 'Arquivado' = 
                r.status === 'Arquivado' ? 'Arquivado' : 
                (r.status === 'Inativo' || r.status === 'Pausado') ? 'Pausado' : 'Ativo';

              return (
                <div 
                  key={r.id} 
                  className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    status === 'Ativo' 
                      ? 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-850' 
                      : status === 'Pausado'
                        ? 'bg-amber-50/10 dark:bg-amber-950/5 border-amber-100/40 dark:border-amber-900/10 opacity-75'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-100/40 dark:border-slate-850/40 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      status === 'Ativo' 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                        : status === 'Pausado'
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-black ${
                          status === 'Ativo' ? 'text-slate-900 dark:text-white' : 
                          status === 'Pausado' ? 'text-amber-800 dark:text-amber-300' : 'text-slate-400'
                        }`}>
                          {r.title}
                        </span>
                        
                        {/* Recurrence Badge */}
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          r.recurrence_type === 'weekly' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 
                          r.recurrence_type === 'monthly' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' : 
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        }`}>
                          {r.recurrence_type === 'weekly' ? 'Semanal' : r.recurrence_type === 'monthly' ? 'Mensal' : 'Diária'}
                        </span>

                        {/* Status Badge */}
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          status === 'Ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-400' : 
                          status === 'Pausado' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/35 dark:text-amber-400' : 
                          'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {status === 'Ativo' ? 'Ativa' : status === 'Pausado' ? 'Pausada' : 'Arquivada'}
                        </span>
                      </div>
                      {r.description && (
                        <p className="text-xs text-slate-400 mt-1">{r.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center gap-1.5 self-end md:self-center">
                    {/* Status Modifiers Control Buttons */}
                    {status !== 'Ativo' && (
                      <button
                        onClick={() => handleUpdateRoutineStatus(r, 'Ativo')}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-250 rounded-xl transition-all cursor-pointer dark:bg-emerald-950/20 dark:border-emerald-900/30 text-xs flex items-center gap-1 font-bold"
                        title="Ativar rotina operacional"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span className="sr-only sm:not-sr-only text-[10px]">Ativar</span>
                      </button>
                    )}

                    {status === 'Ativo' && (
                      <button
                        onClick={() => handleUpdateRoutineStatus(r, 'Pausado')}
                        className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-250 rounded-xl transition-all cursor-pointer dark:bg-amber-950/20 dark:border-amber-900/30 text-xs flex items-center gap-1 font-bold"
                        title="Pausar rotina operacional"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span className="sr-only sm:not-sr-only text-[10px]">Pausar</span>
                      </button>
                    )}

                    {status !== 'Arquivado' && (
                      <button
                        onClick={() => handleUpdateRoutineStatus(r, 'Arquivado')}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-all cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 text-xs flex items-center gap-1 font-bold"
                        title="Arquivar rotina de processos"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span className="sr-only sm:not-sr-only text-[10px]">Arquivar</span>
                      </button>
                    )}

                    {/* Generate Instant Task Action (Authorized only if status is Active) */}
                    {status === 'Ativo' ? (
                      <button
                        onClick={() => handleTriggerRoutineInstant(r)}
                        disabled={isProcessing === `trigger_${r.id}`}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 hover:shadow-md cursor-pointer ml-1"
                        title="Gerar uma tarefa operacional pontual de entrega agora no quadro."
                      >
                        <Sparkles className="w-3 h-3 text-white" />
                        Gerar Tarefa
                      </button>
                    ) : (
                      <span 
                        className="px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest select-none cursor-not-allowed ml-1"
                        title="Ative a rotina para poder despachar tarefas dela."
                      >
                        Bloqueada
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
