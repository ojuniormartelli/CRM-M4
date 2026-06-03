import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Task, User } from '../../types';
import { format, isBefore, isToday } from 'date-fns';
import { taskService } from '../../services/taskService';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Clock,
  User as UserIcon,
  Archive,
  BarChart2
} from 'lucide-react';

interface ClientTasksTabProps {
  clientId: string;
  companyId: string | null;
  workspaceId: string;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  currentUser: User | null;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ClientTasksTab: React.FC<ClientTasksTabProps> = ({
  clientId,
  companyId,
  workspaceId,
  tasks,
  setTasks,
  currentUser,
  onShowToast,
}) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Média');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskType, setNewTaskType] = useState('task');
  const [assignedTo, setAssignedTo] = useState<string>('');

  // Sub-filter for showing groups
  const [taskGroupFilter, setTaskGroupFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');

  // Fetch users in the workspace to allow assigning operational tasks
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('m4_users')
          .select('*')
          .eq('workspace_id', workspaceId)
          .is('deleted_at', null);

        if (error) throw error;
        if (data) setUsers(data as User[]);
      } catch (err) {
        console.warn('Could not load users for task assignees:', err);
      }
    };
    if (workspaceId) {
      fetchUsers();
    }
  }, [workspaceId]);

  // Filter tasks belonging to this client, excluding templates/recurring, and making sure it's operational (excluding meetings, calls, and interaction logs)
  const clientTasks = tasks.filter(t => 
    t.client_id === clientId && 
    !t.is_recurring && 
    t.task_type === 'operational' &&
    t.type !== 'meeting' && 
    t.type !== 'call' && 
    t.type !== 'Reunião' && 
    t.type !== 'Ligação' && 
    t.type !== 'interaction_record'
  );

  // Categorize tasks
  const pendingTasks: Task[] = [];
  const overdueTasks: Task[] = [];
  const completedTasks: Task[] = [];

  const now = new Date();

  clientTasks.forEach(task => {
    if (task.status === 'Concluído') {
      completedTasks.push(task);
    } else {
      const isOverdue = task.due_date && isBefore(new Date(task.due_date), now) && !isToday(new Date(task.due_date));
      if (isOverdue) {
        overdueTasks.push(task);
      } else {
        pendingTasks.push(task);
      }
    }
  });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsProcessing('add_task');
    try {
      const taskPayload = {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        status: 'Pendente',
        priority: newTaskPriority,
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        client_id: clientId,
        company_id: companyId || null,
        workspace_id: workspaceId,
        task_type: 'operational' as const,
        type: newTaskType as any,
        is_recurring: false,
        assigned_to: assignedTo || null
      };

      const created = await taskService.create(taskPayload, workspaceId);
      setTasks(prev => [created, ...prev]);

      // Reset states
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('Média');
      setNewTaskDueDate('');
      setNewTaskType('task');
      setAssignedTo('');
      
      onShowToast('Tarefa operacional criada com sucesso!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao criar tarefa operacional', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Concluído' ? 'Pendente' : 'Concluído';
    try {
      await taskService.update(taskId, { status: newStatus }, workspaceId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      onShowToast(
        newStatus === 'Concluído' ? 'Tarefa operacional concluída!' : 'Tarefa reaberta hoje', 
        newStatus === 'Concluído' ? 'success' : 'info'
      );
    } catch (err: any) {
      onShowToast('Erro ao atualizar status da tarefa', 'error');
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'Sem responsável';
    const found = users.find(u => u.id === userId);
    return found ? found.name : 'Membro do Squad';
  };

  // Determine lists to show based on group filter selector
  const showOverdue = taskGroupFilter === 'all' || taskGroupFilter === 'overdue';
  const showPending = taskGroupFilter === 'all' || taskGroupFilter === 'pending';
  const showCompleted = taskGroupFilter === 'all' || taskGroupFilter === 'completed';

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Quadro de Entregas Operacionais</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Gestão focada em sprints, demandas recorrentes e microentregas operacionais.</p>
        </div>
        
        {/* Quick groups filters toggles */}
        <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl self-start sm:self-center border border-slate-100 dark:border-slate-800 shrink-0">
          {[
            { id: 'all' as const, label: `Todos (${clientTasks.length})` },
            { id: 'pending' as const, label: `Pendentes (${pendingTasks.length})` },
            { id: 'overdue' as const, label: `Atrasados (${overdueTasks.length})` },
            { id: 'completed' as const, label: `Concluídos (${completedTasks.length})` },
          ].map(grp => (
            <button
              key={grp.id}
              onClick={() => setTaskGroupFilter(grp.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                taskGroupFilter === grp.id
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs border border-slate-100 dark:border-slate-800'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {grp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Task Creator Card */}
      <form onSubmit={handleAddTask} className="flex flex-col gap-4 p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100/60 dark:border-slate-800/80">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Nova Demanda Rápida</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <input
              type="text"
              required
              placeholder="Título da demanda operacional..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newTaskPriority}
              onChange={e => setNewTaskPriority(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
            >
              <option value="Baixa">Prioridade Baixa</option>
              <option value="Média">Prioridade Média</option>
              <option value="Alta">Prioridade Alta</option>
              <option value="Urgente">Prioridade Urgente</option>
            </select>
            
            <select
              value={newTaskType}
              onChange={e => setNewTaskType(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
            >
              <option value="task">Subentrega</option>
              <option value="call">Call de Alinhamento</option>
              <option value="meeting">Reunião Geral</option>
              <option value="design">Criação / Design</option>
              <option value="copywriter">Texto / Copy</option>
              <option value="trafego">Gestão de Tráfego</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={newTaskDueDate}
              onChange={e => setNewTaskDueDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-850 dark:text-slate-350 outline-none w-full cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl">
            <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-850 dark:text-slate-350 outline-none w-full cursor-pointer"
            >
              <option value="">Nenhum Responsável</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role || 'Membro'})</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isProcessing === 'add_task'}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-sm"
          >
            {isProcessing === 'add_task' ? 'Processando...' : 'Adicionar Atividade'}
          </button>
        </div>
      </form>

      {/* Task List Render Segmentations */}
      <div className="space-y-6">
        
        {/* Group 1: Overdue tasks */}
        {showOverdue && overdueTasks.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-red-650 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
               Demandas Vencidas ({overdueTasks.length}) — Atenção Imediata
            </h5>
            <div className="space-y-3">
              {overdueTasks.map(t => (
                <div key={t.id} className="p-4 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center justify-between shadow-xs hover:border-rose-200 transition-all">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleToggleTaskStatus(t.id, t.status)}
                      className="text-red-500 hover:text-red-700 transition-all mt-1 cursor-pointer shrink-0"
                    >
                      <Square className="w-5 h-5 text-red-400" />
                    </button>
                    <div>
                      <span className="text-sm font-black text-rose-950 dark:text-rose-150 block">
                        {t.title}
                      </span>
                      {t.description && (
                        <p className="text-xs text-rose-900/60 dark:text-rose-300 mt-1">{t.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-2.5">
                        <span className="text-[10px] text-red-750 font-black flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          Atrasada desde {t.due_date ? format(new Date(t.due_date), "dd 'de' MMM") : 'Ontem'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {getUserName(t.assigned_to)}
                        </span>
                        <span className="text-[9px] font-black uppercase text-rose-750 bg-rose-100 px-2 py-0.5 rounded">
                          {t.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group 2: Pending Tasks */}
        {showPending && (
          <div className="space-y-3">
            {overdueTasks.length > 0 && <hr className="border-slate-100 dark:border-slate-800" />}
            <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              Próximas Entregas Planejadas ({pendingTasks.length})
            </h5>
            
            {pendingTasks.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-100 dark:border-slate-850 rounded-2xl text-center text-slate-400 text-xs">
                Seu cronograma de próximas obrigações está totalmente em dia!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map(t => (
                  <div key={t.id} className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-750 transition-all">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleToggleTaskStatus(t.id, t.status)}
                        className="text-slate-450 hover:text-blue-600 transition-all mt-1 cursor-pointer shrink-0"
                      >
                        <Square className="w-5 h-5 text-slate-350 hover:text-blue-500" />
                      </button>
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white block">
                          {t.title}
                        </span>
                        {t.description && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-2.5">
                          {t.due_date && (
                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(t.due_date), "dd/MM/yyyy")}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {getUserName(t.assigned_to)}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            t.priority === 'High' || t.priority === 'Alta' || t.priority === 'Urgente' 
                              ? 'bg-rose-100 text-rose-700' 
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Group 3: Completed Tasks */}
        {showCompleted && completedTasks.length > 0 && (
          <div className="space-y-3">
            <hr className="border-slate-100 dark:border-slate-800" />
            <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Operações Concluídas ({completedTasks.length})
            </h5>
            
            <div className="space-y-3">
              {completedTasks.map(t => (
                <div key={t.id} className="p-4 bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-100/40 dark:border-emerald-950/20 rounded-2xl flex items-center justify-between opacity-75 group">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleToggleTaskStatus(t.id, t.status)}
                      className="text-emerald-500 hover:text-red-500 transition-all mt-1 cursor-pointer shrink-0"
                      title="Reabrir tarefa"
                    >
                      <CheckSquare className="w-5 h-5 text-emerald-500" />
                    </button>
                    <div>
                      <span className="text-sm font-medium line-through text-slate-400 dark:text-slate-500 block">
                        {t.title}
                      </span>
                      {t.description && (
                        <p className="text-xs text-slate-400 line-through mt-0.5">{t.description}</p>
                      )}
                      <p className="text-[9px] text-slate-400 mt-1">Sua equipe concluiu essa subentrega com sucesso.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty list fallbacks */}
        {clientTasks.length === 0 && (
          <div className="py-12 border border-dashed border-slate-100 dark:border-slate-850 rounded-[2rem] text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Nenhuma entrega operacional</p>
              <p className="text-xs text-slate-500 mt-1">Novas subentregas e checkpoint checklists serão visualizados e mapeados aqui.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
