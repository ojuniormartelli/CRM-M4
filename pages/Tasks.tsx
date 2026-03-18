import React, { useState } from 'react';
import { ICONS } from '../constants';
import { Task, TaskStatus, Priority } from '../types';
import { supabase } from '../lib/supabase';

interface TasksProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const Tasks: React.FC<TasksProps> = ({ tasks, setTasks }) => {
  const [filter, setFilter] = useState<TaskStatus | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '', 
    description: '', 
    status: TaskStatus.TODO, 
    priority: Priority.MEDIUM, 
    type: 'task', 
    dueDate: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurrencePeriod: 'Mensal'
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const taskData = {
      ...newTask,
      createdAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('m4_tasks')
      .insert([taskData])
      .select();

    if (!error && data) {
      setTasks([...tasks, data[0]]);
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', status: TaskStatus.TODO, priority: Priority.MEDIUM, type: 'task', dueDate: new Date().toISOString().split('T')[0] });
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const isNowDone = task.status !== TaskStatus.DONE;
    const newStatus = isNowDone ? TaskStatus.DONE : TaskStatus.TODO;
    
    const { error } = await supabase
      .from('m4_tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

      // Handle Recurrence
      if (isNowDone && task.isRecurring && task.recurrencePeriod) {
        const nextDate = new Date(task.dueDate);
        if (task.recurrencePeriod === 'Semanal') nextDate.setDate(nextDate.getDate() + 7);
        else if (task.recurrencePeriod === 'Quinzenal') nextDate.setDate(nextDate.getDate() + 15);
        else if (task.recurrencePeriod === 'Mensal') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (task.recurrencePeriod === 'Trimestral') nextDate.setMonth(nextDate.getMonth() + 3);

        const nextTask = {
          title: task.title,
          description: task.description,
          status: TaskStatus.TODO,
          priority: task.priority,
          type: task.type,
          dueDate: nextDate.toISOString().split('T')[0],
          isRecurring: true,
          recurrencePeriod: task.recurrencePeriod,
          clientAccountId: task.clientAccountId,
          projectId: task.projectId,
          createdAt: new Date().toISOString()
        };

        const { data: nextRes } = await supabase
          .from('m4_tasks')
          .insert([nextTask])
          .select();
        
        if (nextRes) {
          setTasks(prev => [...prev, nextRes[0]]);
        }
      }
    }
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-10 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Minhas Atividades</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gestão de tarefas e follow-ups.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 dark:shadow-none transition-all">
          <ICONS.Plus /> NOVA TAREFA
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none space-y-10 pb-10">
        <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        {['All', ...Object.values(TaskStatus)].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            {s === 'All' ? 'Todas' : s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map((task) => (
          <div key={task.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => handleToggleStatus(task)}
                className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${task.status === TaskStatus.DONE ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 hover:border-blue-400'}`}
              >
                {task.status === TaskStatus.DONE && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
              </button>
              <div>
                <h4 className={`font-black text-slate-900 text-lg ${task.status === TaskStatus.DONE ? 'line-through opacity-50' : ''}`}>{task.title}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      task.priority === Priority.URGENT ? 'bg-red-500' :
                      task.priority === Priority.HIGH ? 'bg-orange-500' :
                      task.priority === Priority.MEDIUM ? 'bg-blue-500' :
                      'bg-slate-300'
                    }`}></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.priority}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <ICONS.Calendar width="12" height="12" /> {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{task.type}</span>
                  {task.isRecurring && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                        <ICONS.Automation width="12" height="12" /> Recorrente ({task.recurrencePeriod})
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
               <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                  <ICONS.Settings width="18" height="18" />
               </button>
               <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">
                  <ICONS.X width="18" height="18" />
               </button>
            </div>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto">
              <ICONS.Tasks width="40" height="40" />
            </div>
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma tarefa encontrada</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Nova Atividade</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-10 py-6 space-y-6 scrollbar-none">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Título da Tarefa</label>
                  <textarea 
                    required 
                    placeholder="Ex: Follow-up com cliente" 
                    value={newTask.title} 
                    onChange={e => setNewTask({...newTask, title: e.target.value})} 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none overflow-hidden min-h-[56px] text-slate-900 dark:text-white"
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Prioridade</label>
                    <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white">
                      {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                    <select value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white">
                      <option value="task">Tarefa</option>
                      <option value="call">Ligação</option>
                      <option value="meeting">Reunião</option>
                      <option value="email">E-mail</option>
                      <option value="proposal">Proposta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data de Entrega</label>
                    <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white" />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                      <ICONS.Automation width="20" height="20" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase">Tarefa Recorrente</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Criar automaticamente após conclusão</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {newTask.isRecurring && (
                      <select 
                        value={newTask.recurrencePeriod} 
                        onChange={e => setNewTask({...newTask, recurrencePeriod: e.target.value as any})}
                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                      >
                        <option value="Semanal">Semanal</option>
                        <option value="Quinzenal">Quinzenal</option>
                        <option value="Mensal">Mensal</option>
                        <option value="Trimestral">Trimestral</option>
                      </select>
                    )}
                    <button 
                      type="button"
                      onClick={() => setNewTask({...newTask, isRecurring: !newTask.isRecurring})}
                      className={`w-12 h-6 rounded-full transition-all relative ${newTask.isRecurring ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newTask.isRecurring ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Descrição / Notas</label>
                  <textarea 
                    placeholder="Detalhes da atividade..." 
                    value={newTask.description} 
                    onChange={e => setNewTask({...newTask, description: e.target.value})} 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[150px] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-10 pt-6 flex gap-4 border-t border-slate-50 dark:border-slate-800 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">CANCELAR</button>
                <button onClick={handleCreateTask} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all">CRIAR TAREFA</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Tasks;
