import React, { useState, useEffect, useCallback } from 'react';
import { ICONS } from '../constants';
import { Task, TaskStatus, Priority, User, Company, Contact } from '../types';
import { supabase } from '../lib/supabase';

interface TasksProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  currentUser?: User | null;
}

const Tasks: React.FC<TasksProps> = ({ tasks, setTasks, currentUser }) => {
  const [filter, setFilter] = useState<TaskStatus | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // States for Company/Contact selection
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '', 
    description: '', 
    status: TaskStatus.TODO, 
    priority: Priority.MEDIUM, 
    type: 'task', 
    due_date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurrence_type: 'monthly',
    recurrence_day_of_month: new Date().getDate(),
    recurrence_days: '',
    recurrence_month_week: '',
    recurrence_occurrences: undefined,
    recurrence_end_date: undefined
  });

  // Fetch companies for autocomplete
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!currentUser?.workspace_id) return;
      const { data } = await supabase
        .from('m4_companies')
        .select('*')
        .eq('workspace_id', currentUser.workspace_id)
        .order('name');
      if (data) setCompanies(data);
    };
    fetchCompanies();
  }, [currentUser]);

  // Fetch contacts when company changes
  useEffect(() => {
    const fetchContacts = async () => {
      if (!newTask.company_id) {
        setContacts([]);
        return;
      }
      const { data } = await supabase
        .from('m4_contacts')
        .select('*')
        .eq('company_id', newTask.company_id)
        .order('name');
      if (data) setContacts(data);
    };
    fetchContacts();
  }, [newTask.company_id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const taskData = {
      ...newTask,
      workspace_id: currentUser?.workspace_id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('m4_tasks')
      .insert([taskData])
      .select();

    if (!error && data) {
      setTasks([...tasks, data[0]]);
      setIsModalOpen(false);
      resetNewTask();
    }
  };

  const resetNewTask = () => {
    setNewTask({ 
      title: '', 
      description: '', 
      status: TaskStatus.TODO, 
      priority: Priority.MEDIUM, 
      type: 'task', 
      due_date: new Date().toISOString().split('T')[0],
      is_recurring: false,
      recurrence_type: 'monthly',
      recurrence_day_of_month: new Date().getDate()
    });
    setCompanySearch('');
  };

  const calculateNextOccurrence = (task: Task): string => {
    const currentDueDate = new Date(task.due_date);
    let nextDate = new Date(currentDueDate);

    switch (task.recurrence_type) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        if (task.recurrence_days) {
          const days = task.recurrence_days.split(',');
          const dayMap: Record<string, number> = { 'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6 };
          const targetDays = days.map(d => dayMap[d]).sort();
          
          let found = false;
          for (let i = 1; i <= 7; i++) {
            const checkDate = new Date(currentDueDate);
            checkDate.setDate(checkDate.getDate() + i);
            if (targetDays.includes(checkDate.getDay())) {
              nextDate = checkDate;
              found = true;
              break;
            }
          }
          if (!found) nextDate.setDate(nextDate.getDate() + 7);
        } else {
          nextDate.setDate(nextDate.getDate() + 7);
        }
        break;
      case 'monthly':
        if (task.recurrence_day_of_month) {
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextDate.setDate(task.recurrence_day_of_month);
        } else if (task.recurrence_month_week) {
          // Logic for "first monday", etc.
          nextDate.setMonth(nextDate.getMonth() + 1);
          // Simplified for now: just add a month
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate.toISOString().split('T')[0];
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
      if (isNowDone && task.is_recurring && task.recurrence_type) {
        const nextDueDate = calculateNextOccurrence(task);
        
        // Check end conditions
        if (task.recurrence_end_date && nextDueDate > task.recurrence_end_date) return;
        
        // Count occurrences if needed (would require a query to count previous tasks with same recurrence group)
        // For now, simple next occurrence creation
        
        const nextTask = {
          title: task.title,
          description: task.description,
          status: TaskStatus.TODO,
          priority: task.priority,
          type: task.type,
          due_date: nextDueDate,
          is_recurring: true,
          recurrence_type: task.recurrence_type,
          recurrence_days: task.recurrence_days,
          recurrence_day_of_month: task.recurrence_day_of_month,
          recurrence_month_week: task.recurrence_month_week,
          recurrence_end_date: task.recurrence_end_date,
          recurrence_occurrences: task.recurrence_occurrences,
          company_id: task.company_id,
          contact_id: task.contact_id,
          client_account_id: task.client_account_id,
          project_id: task.project_id,
          workspace_id: currentUser?.workspace_id,
          created_at: new Date().toISOString()
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
                <div className="flex items-center gap-3">
                  <h4 className={`font-black text-slate-900 text-lg ${task.status === TaskStatus.DONE ? 'line-through opacity-50' : ''}`}>{task.title}</h4>
                  {task.company_id && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {companies.find(c => c.id === task.company_id)?.name || 'Empresa'}
                    </span>
                  )}
                </div>
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
                    <ICONS.Calendar width="12" height="12" /> {new Date(task.due_date).toLocaleDateString()}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{task.type}</span>
                  {task.is_recurring && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                        <ICONS.Automation width="12" height="12" /> Recorrente ({task.recurrence_type})
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
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Empresa / Cliente</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Buscar empresa..." 
                        value={companySearch || (newTask.company_id ? companies.find(c => c.id === newTask.company_id)?.name : '')}
                        onChange={e => {
                          setCompanySearch(e.target.value);
                          setIsCompanyDropdownOpen(true);
                        }}
                        onFocus={() => setIsCompanyDropdownOpen(true)}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                      />
                      {isCompanyDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[70] max-h-60 overflow-y-auto scrollbar-none">
                          <div 
                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-bold text-sm text-slate-400"
                            onClick={() => {
                              setNewTask({...newTask, company_id: undefined, contact_id: undefined});
                              setCompanySearch('');
                              setIsCompanyDropdownOpen(false);
                            }}
                          >
                            Nenhuma Empresa
                          </div>
                          {companies
                            .filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                            .map(company => (
                              <div 
                                key={company.id} 
                                onClick={() => {
                                  setNewTask({...newTask, company_id: company.id, contact_id: undefined});
                                  setCompanySearch(company.name);
                                  setIsCompanyDropdownOpen(false);
                                }}
                                className="p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-none"
                              >
                                <p className="font-black text-slate-900 dark:text-white text-sm">{company.name}</p>
                                {company.segment && <p className="text-[10px] font-bold text-slate-400 uppercase">{company.segment}</p>}
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Contato</label>
                    <select 
                      disabled={!newTask.company_id}
                      value={newTask.contact_id || ''} 
                      onChange={e => setNewTask({...newTask, contact_id: e.target.value || undefined})} 
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Selecione um contato</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>{contact.name} {contact.role ? `(${contact.role})` : ''}</option>
                      ))}
                    </select>
                  </div>
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
                    <input type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <ICONS.Automation width="20" height="20" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase">Tarefa Recorrente</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Configurar repetição automática</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setNewTask({...newTask, is_recurring: !newTask.is_recurring})}
                      className={`w-12 h-6 rounded-full transition-all relative ${newTask.is_recurring ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newTask.is_recurring ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>

                  {newTask.is_recurring && (
                    <div className="p-8 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 space-y-6 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Frequência</label>
                          <select 
                            value={newTask.recurrence_type} 
                            onChange={e => setNewTask({...newTask, recurrence_type: e.target.value as any})}
                            className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                          >
                            <option value="daily">Diariamente</option>
                            <option value="weekly">Semanalmente</option>
                            <option value="monthly">Mensalmente</option>
                            <option value="yearly">Anualmente</option>
                          </select>
                        </div>

                        {newTask.recurrence_type === 'weekly' && (
                          <div className="col-span-full">
                            <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">Repetir nos dias</label>
                            <div className="flex flex-wrap gap-2">
                              {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((day, idx) => {
                                const dayMap = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
                                const dayCode = dayMap[idx];
                                const isSelected = newTask.recurrence_days?.includes(dayCode);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => {
                                      const currentDays = newTask.recurrence_days ? newTask.recurrence_days.split(',') : [];
                                      const newDays = isSelected 
                                        ? currentDays.filter(d => d !== dayCode)
                                        : [...currentDays, dayCode];
                                      setNewTask({...newTask, recurrence_days: newDays.join(',')});
                                    }}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-blue-100'}`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {newTask.recurrence_type === 'monthly' && (
                          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Dia do Mês</label>
                              <input 
                                type="number" 
                                min="1" 
                                max="31" 
                                value={newTask.recurrence_day_of_month || ''} 
                                onChange={e => setNewTask({...newTask, recurrence_day_of_month: parseInt(e.target.value)})}
                                className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                                placeholder="Ex: 10"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Ou Posição no Mês</label>
                              <select 
                                value={newTask.recurrence_month_week || ''} 
                                onChange={e => setNewTask({...newTask, recurrence_month_week: e.target.value})}
                                className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                              >
                                <option value="">Selecione (opcional)</option>
                                <option value="first_monday">Primeira Segunda-feira</option>
                                <option value="last_friday">Última Sexta-feira</option>
                                <option value="last_day">Último dia do mês</option>
                              </select>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Termina em (Opcional)</label>
                          <input 
                            type="date" 
                            value={newTask.recurrence_end_date || ''} 
                            onChange={e => setNewTask({...newTask, recurrence_end_date: e.target.value})}
                            className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Ou após X ocorrências</label>
                          <input 
                            type="number" 
                            value={newTask.recurrence_occurrences || ''} 
                            onChange={e => setNewTask({...newTask, recurrence_occurrences: parseInt(e.target.value)})}
                            className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                            placeholder="Ex: 12"
                          />
                        </div>
                      </div>
                    </div>
                  )}
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
