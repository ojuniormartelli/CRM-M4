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
    title: '', description: '', status: TaskStatus.TODO, priority: Priority.MEDIUM, type: 'task', dueDate: new Date().toISOString().split('T')[0]
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
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    const { error } = await supabase
      .from('m4_tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    }
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Minhas Atividades</h2>
          <p className="text-slate-500 font-medium">Gestão de tarefas e follow-ups.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all">
          <ICONS.Plus /> NOVA TAREFA
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-100 pb-4">
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
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase">Nova Atividade</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <input required placeholder="Título da Tarefa" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" />
              <textarea placeholder="Descrição" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold h-32" />
              <div className="grid grid-cols-2 gap-4">
                <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold">
                  {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value as any})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold">
                  <option value="task">Tarefa</option>
                  <option value="call">Ligação</option>
                  <option value="meeting">Reunião</option>
                  <option value="email">E-mail</option>
                  <option value="proposal">Proposta</option>
                </select>
              </div>
              <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs">CRIAR TAREFA</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
