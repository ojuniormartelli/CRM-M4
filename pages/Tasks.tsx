import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ICONS } from '../constants';
import { Task, TaskStatus, Priority, User, Company, Contact, TaskComment, TaskAttachment, TaskTimeEntry } from '../types';
import { mappers } from '../lib/mappers';
import { supabase } from '../lib/supabase';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

interface TasksProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  currentUser?: User | null;
}

const Tasks: React.FC<TasksProps> = ({ tasks, setTasks, currentUser }) => {
  const [view, setView] = useState<'list' | 'board' | 'calendar' | 'gantt'>('list');
  const [filter, setFilter] = useState<TaskStatus | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // States for Company/Contact selection
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const companyDropdownRef = React.useRef<HTMLDivElement>(null);
  
  // Advanced ClickUp States
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TaskTimeEntry[]>([]);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedTask && companies.length > 0) {
      const company = companies.find(c => c.id === selectedTask.company_id);
      if (company) setCompanySearch(company.name);
      else setCompanySearch('');
    }
  }, [selectedTask, companies]);

  useEffect(() => {
    if (selectedTask) {
      fetchTaskDetails(selectedTask.id);
    } else {
      setComments([]);
      setAttachments([]);
      setTimeEntries([]);
      setIsTimerRunning(false);
      setTimerStart(null);
      setElapsedTime(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [selectedTask]);

  const fetchTaskDetails = async (taskId: string) => {
    // Fetch Comments
    const { data: commentsData } = await supabase
      .from('m4_task_comments')
      .select('*, user:m4_users(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (commentsData) setComments(commentsData);

    // Fetch Attachments
    const { data: attachmentsData } = await supabase
      .from('m4_task_attachments')
      .select('*, user:m4_users(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    if (attachmentsData) setAttachments(attachmentsData);

    // Fetch Time Entries
    const { data: timeData } = await supabase
      .from('m4_task_time_entries')
      .select('*')
      .eq('task_id', taskId)
      .order('start_time', { ascending: false });
    if (timeData) {
      setTimeEntries(timeData);
      const activeEntry = timeData.find(e => !e.end_time);
      if (activeEntry) {
        setIsTimerRunning(true);
        setTimerStart(new Date(activeEntry.start_time));
        startLocalTimer(new Date(activeEntry.start_time));
      }
    }
  };

  const startLocalTimer = (start: Date) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      setElapsedTime(diff);
    }, 1000);
  };

  const handleStartTimer = async () => {
    if (!selectedTask || !currentUser) return;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('m4_task_time_entries')
      .insert([{
        task_id: selectedTask.id,
        user_id: currentUser.id,
        start_time: now
      }])
      .select()
      .single();

    if (data) {
      setTimeEntries([data, ...timeEntries]);
      setIsTimerRunning(true);
      setTimerStart(new Date(now));
      startLocalTimer(new Date(now));
    }
  };

  const handleStopTimer = async () => {
    if (!selectedTask || !isTimerRunning) return;
    const activeEntry = timeEntries.find(e => !e.end_time);
    if (!activeEntry) return;

    const now = new Date();
    const startTime = new Date(activeEntry.start_time);
    const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000);

    const { error } = await supabase
      .from('m4_task_time_entries')
      .update({
        end_time: now.toISOString(),
        duration_minutes: durationMinutes
      })
      .eq('id', activeEntry.id);

    if (!error) {
      // Update task total actual_hours
      const totalMinutes = timeEntries.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) + durationMinutes;
      const totalHours = Number((totalMinutes / 60).toFixed(2));
      
      await supabase.from('m4_tasks').update({ actual_hours: totalHours }).eq('id', selectedTask.id);
      
      setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, actual_hours: totalHours } : t));
      setSelectedTask({ ...selectedTask, actual_hours: totalHours });
      
      setIsTimerRunning(false);
      setTimerStart(null);
      setElapsedTime(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      fetchTaskDetails(selectedTask.id);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask || !currentUser) return;
    const { data, error } = await supabase
      .from('m4_task_comments')
      .insert([{
        task_id: selectedTask.id,
        user_id: currentUser.id,
        comment: newComment.trim()
      }])
      .select('*, user:m4_users(*)')
      .single();

    if (data) {
      setComments([...comments, data]);
      setNewComment('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask || !currentUser) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Limite de 10MB.');
      return;
    }

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `tasks/${selectedTask.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      setIsUploading(false);
      return;
    }

    const { data, error: dbError } = await supabase
      .from('m4_task_attachments')
      .insert([{
        task_id: selectedTask.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: filePath,
        uploaded_by: currentUser.id
      }])
      .select('*, user:m4_users(*)')
      .single();

    if (data) {
      setAttachments([data, ...attachments]);
    }
    setIsUploading(false);
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  const [editTask, setEditTask] = useState<Partial<Task>>({});

  // Fetch companies for autocomplete
  useEffect(() => {
    const fetchCompanies = async () => {
      // Base query - No workspace filter for single-tenant mode
      const { data, error } = await supabase
        .from('m4_companies')
        .select('*')
        .order('name');

      // Debug logs
      console.log('EMPRESAS RETORNADAS:', data);
      console.log('ERRO SUPABASE:', error);

      if (data) {
        setCompanies(data);
      } else if (error) {
        console.error('Erro ao buscar empresas:', error.message);
      }
    };

    const fetchUsers = async () => {
      const { data } = await supabase.from('m4_users').select('*').order('name');
      if (data) setUsers(data);
    };

    fetchCompanies();
    fetchUsers();
  }, [currentUser]);

  // Fetch contacts when company changes
  useEffect(() => {
    const fetchContacts = async () => {
      const companyId = isEditing ? editTask.company_id : newTask.company_id;
      if (!companyId) {
        setContacts([]);
        return;
      }
      const { data } = await supabase
        .from('m4_contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      if (data) setContacts(data);
    };
    fetchContacts();
  }, [newTask.company_id, editTask.company_id, isEditing]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    // 🛡️ WHITELIST PAYLOAD (BLINDAGEM)
    const taskData = mappers.task(newTask, currentUser?.workspace_id);

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

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    // 🛡️ WHITELIST PAYLOAD (BLINDAGEM)
    const taskData = mappers.task(editTask);

    const { data, error } = await supabase
      .from('m4_tasks')
      .update(taskData)
      .eq('id', selectedTask.id)
      .select();

    if (!error && data) {
      setTasks(tasks.map(t => t.id === selectedTask.id ? data[0] : t));
      setSelectedTask(data[0]);
      setIsEditing(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    const { error } = await supabase
      .from('m4_tasks')
      .delete()
      .eq('id', taskToDelete);

    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskToDelete));
      if (selectedTask?.id === taskToDelete) {
        setSelectedTask(null);
        setIsEditing(false);
      }
    }
    setIsDeleting(false);
    setTaskToDelete(null);
  };

  const confirmDelete = (taskId: string) => {
    setTaskToDelete(taskId);
    setIsDeleting(true);
  };

  const openViewModal = (task: Task) => {
    setSelectedTask(task);
    setEditTask(task);
    setIsEditing(false);
    setCompanySearch(companies.find(c => c.id === task.company_id)?.name || '');
  };

  const openNewTaskModal = () => {
    resetNewTask();
    setSelectedTask(null);
    setIsEditing(true);
    setIsModalOpen(true);
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
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => setView('list')} 
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ICONS.Tasks width="14" height="14" /> Lista
            </button>
            <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            <button 
              onClick={() => setView('board')} 
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'board' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ICONS.Sales width="14" height="14" /> Quadro
            </button>
            <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            <button 
              onClick={() => setView('calendar')} 
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'calendar' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ICONS.Calendar width="14" height="14" /> Calendário
            </button>
            <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            <button 
              onClick={() => setView('gantt')} 
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'gantt' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ICONS.Automation width="14" height="14" /> Gantt
            </button>
          </div>
        </div>
        <button onClick={openNewTaskModal} className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 dark:shadow-none transition-all">
          <ICONS.Plus /> NOVA TAREFA
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none space-y-10 pb-10">
        {view === 'list' && (
          <>
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
              {filteredTasks.length > 0 ? filteredTasks.map((task) => (
                <div 
                  key={task.id} 
                  onClick={() => openViewModal(task)}
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(task);
                      }}
                      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${task.status === TaskStatus.DONE ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 hover:border-blue-400'}`}
                    >
                      {task.status === TaskStatus.DONE && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                    </button>
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className={`font-black text-slate-900 dark:text-white text-lg ${task.status === TaskStatus.DONE ? 'line-through opacity-50' : ''}`}>{task.title}</h4>
                        {task.company_id && (
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
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
                            'bg-slate-300 dark:bg-slate-700'
                          }`}></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.priority}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <ICONS.Calendar width="12" height="12" /> {new Date(task.due_date).toLocaleDateString()}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{task.type}</span>
                        {task.tags && task.tags.split(',').map((tag, i) => (
                          <React.Fragment key={i}>
                            <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tag.trim()}</span>
                          </React.Fragment>
                        ))}
                        {task.is_recurring && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                              <ICONS.Automation width="12" height="12" /> Recorrente ({task.recurrence_type})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openViewModal(task);
                        setIsEditing(true);
                      }}
                      className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                    >
                      <ICONS.Settings width="18" height="18" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskToDelete(task.id);
                        setIsDeleting(true);
                      }}
                      className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all"
                    >
                      <ICONS.X width="18" height="18" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-700 mx-auto">
                    <ICONS.Tasks width="40" height="40" />
                  </div>
                  <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma tarefa encontrada</p>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full min-h-[600px]">
            {Object.values(TaskStatus).map(status => (
              <div key={status} className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{status}</h3>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-black">
                    {tasks.filter(t => t.status === status).length}
                  </span>
                </div>
                <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] p-4 space-y-4 border border-slate-100 dark:border-slate-800">
                  {tasks.filter(t => t.status === status).map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => openViewModal(task)}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${
                          task.priority === Priority.URGENT ? 'bg-red-500' :
                          task.priority === Priority.HIGH ? 'bg-orange-500' :
                          task.priority === Priority.MEDIUM ? 'bg-blue-500' :
                          'bg-slate-300'
                        }`}></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{task.priority}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">{task.title}</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ICONS.Calendar width="12" height="12" className="text-slate-300" />
                          <span className="text-[9px] font-bold text-slate-400">{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                        {task.assigned_to && (
                          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                            {users.find(u => u.id === task.assigned_to)?.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={openNewTaskModal}
                    className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all"
                  >
                    + NOVA TAREFA
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'calendar' && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[700px]">
            <Calendar
              localizer={localizer}
              events={tasks.map(t => ({
                id: t.id,
                title: t.title,
                start: new Date(t.due_date),
                end: new Date(t.due_date),
                resource: t
              }))}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              onSelectEvent={(event: any) => openViewModal(event.resource)}
              messages={{
                next: "Próximo",
                previous: "Anterior",
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia"
              }}
              eventPropGetter={(event: any) => {
                const priority = event.resource.priority;
                let color = '#3b82f6'; // blue-500
                if (priority === Priority.URGENT) color = '#ef4444'; // red-500
                if (priority === Priority.HIGH) color = '#f97316'; // orange-500
                if (priority === Priority.LOW) color = '#94a3b8'; // slate-400
                return {
                  style: {
                    backgroundColor: color,
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '4px 8px'
                  }
                };
              }}
            />
          </div>
        )}

        {view === 'gantt' && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
            <div className="min-w-[800px] space-y-4">
              <div className="flex border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-64 shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarefa</div>
                <div className="flex-1 flex justify-between px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline (Mensal)</div>
              </div>
              {tasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(task => {
                const date = new Date(task.due_date);
                const day = date.getDate();
                const left = (day / 31) * 100;
                const width = (Number(task.estimated_hours || 4) / 24) * 100; // Simplified width based on hours

                return (
                  <div key={task.id} className="flex items-center group">
                    <div className="w-64 shrink-0 pr-4">
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs truncate">{task.title}</h4>
                      <p className="text-[9px] text-slate-400 font-medium">{task.priority} • {new Date(task.due_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex-1 h-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl relative">
                      <div 
                        onClick={() => openViewModal(task)}
                        className={`absolute top-2 bottom-2 rounded-lg cursor-pointer hover:brightness-110 transition-all flex items-center px-3 text-[9px] font-black text-white uppercase overflow-hidden ${
                          task.priority === Priority.URGENT ? 'bg-red-500' :
                          task.priority === Priority.HIGH ? 'bg-orange-500' :
                          task.priority === Priority.MEDIUM ? 'bg-blue-500' :
                          'bg-slate-400'
                        }`}
                        style={{ left: `${left}%`, width: `${Math.max(width, 10)}%` }}
                      >
                        {task.estimated_hours}h
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {(isModalOpen || selectedTask) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-zoom-in-95">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0 gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase truncate min-w-0">
                  {selectedTask ? (isEditing ? `EDITANDO: ${selectedTask.title}` : selectedTask.title) : 'Nova Atividade'}
                </h3>
                {selectedTask && !isEditing && (
                  <button 
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-all shrink-0"
                    title="Editar"
                  >
                    <ICONS.Edit className="w-5 h-5" />
                  </button>
                )}
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (isEditing && selectedTask) {
                    setIsEditing(false);
                    setEditTask(selectedTask);
                    setCompanySearch(companies.find(c => c.id === selectedTask.company_id)?.name || '');
                  } else {
                    setIsModalOpen(false);
                    setSelectedTask(null);
                    setIsEditing(false);
                  }
                }} 
                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
              >
                <ICONS.Plus className="rotate-45 w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={selectedTask ? handleUpdateTask : handleCreateTask} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-10 py-6 space-y-6 scrollbar-none">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Título da Tarefa</label>
                  {isEditing ? (
                    <textarea 
                      required 
                      placeholder="Ex: Follow-up com cliente" 
                      value={selectedTask ? editTask.title : newTask.title} 
                      onChange={e => selectedTask ? setEditTask({...editTask, title: e.target.value}) : setNewTask({...newTask, title: e.target.value})} 
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none overflow-hidden min-h-[56px] text-slate-900 dark:text-white"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  ) : (
                    <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white">{selectedTask?.title}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Empresa / Cliente</label>
                    {isEditing ? (
                      <div className="relative" ref={companyDropdownRef}>
                        <input 
                          type="text" 
                          placeholder="Buscar empresa..." 
                          value={companySearch}
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
                                if (selectedTask) setEditTask({...editTask, company_id: undefined, contact_id: undefined});
                                else setNewTask({...newTask, company_id: undefined, contact_id: undefined});
                                setCompanySearch('');
                                setIsCompanyDropdownOpen(false);
                              }}
                            >
                              Nenhuma Empresa
                            </div>
                            {companies
                              .filter(c => !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase()) || c.cnpj?.includes(companySearch))
                              .map(company => (
                                <div 
                                  key={company.id} 
                                  onClick={() => {
                                    if (selectedTask) setEditTask({...editTask, company_id: company.id, contact_id: undefined});
                                    else setNewTask({...newTask, company_id: company.id, contact_id: undefined});
                                    setCompanySearch(company.name);
                                    setIsCompanyDropdownOpen(false);
                                  }}
                                  className="p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-none"
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="min-w-0">
                                      <p className="font-black text-slate-900 dark:text-white text-sm truncate">{company.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                        {company.city ? `${company.city}${company.state ? `, ${company.state}` : ''}` : (company.cnpj || 'Sem cidade')}
                                      </p>
                                    </div>
                                    {company.segment && <span className="shrink-0 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter ml-2">{company.segment}</span>}
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white">
                        {selectedTask?.company_id ? companies.find(c => c.id === selectedTask.company_id)?.name : '–'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Contato</label>
                    {isEditing ? (
                      <select 
                        disabled={selectedTask ? !editTask.company_id : !newTask.company_id}
                        value={selectedTask ? (editTask.contact_id || '') : (newTask.contact_id || '')} 
                        onChange={e => selectedTask ? setEditTask({...editTask, contact_id: e.target.value || undefined}) : setNewTask({...newTask, contact_id: e.target.value || undefined})} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white disabled:opacity-50"
                      >
                        <option value="">Selecione um contato</option>
                        {contacts
                          .filter(c => c.company_id === (selectedTask ? editTask.company_id : newTask.company_id))
                          .map(contact => (
                            <option key={contact.id} value={contact.id}>{contact.name} {contact.role ? `(${contact.role})` : ''}</option>
                          ))}
                      </select>
                    ) : (
                      <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white">
                        {selectedTask?.contact_id ? contacts.find(c => c.id === selectedTask.contact_id)?.name : '–'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Prioridade</label>
                    {isEditing ? (
                      <select value={selectedTask ? editTask.priority : newTask.priority} onChange={e => selectedTask ? setEditTask({...editTask, priority: e.target.value as any}) : setNewTask({...newTask, priority: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white">
                        {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white uppercase">{selectedTask?.priority}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                    {isEditing ? (
                      <select value={selectedTask ? editTask.type : newTask.type} onChange={e => selectedTask ? setEditTask({...editTask, type: e.target.value as any}) : setNewTask({...newTask, type: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white">
                        <option value="task">Tarefa</option>
                        <option value="call">Ligação</option>
                        <option value="meeting">Reunião</option>
                        <option value="email">E-mail</option>
                        <option value="proposal">Proposta</option>
                      </select>
                    ) : (
                      <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white uppercase">{selectedTask?.type}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data de Entrega</label>
                    {isEditing ? (
                      <input type="date" value={selectedTask ? editTask.due_date : newTask.due_date} onChange={e => selectedTask ? setEditTask({...editTask, due_date: e.target.value}) : setNewTask({...newTask, due_date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white" />
                    ) : (
                      <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white">{selectedTask?.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : '–'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Responsável</label>
                    {isEditing ? (
                      <select 
                        value={selectedTask ? (editTask.assigned_to || '') : (newTask.assigned_to || '')} 
                        onChange={e => selectedTask ? setEditTask({...editTask, assigned_to: e.target.value || undefined}) : setNewTask({...newTask, assigned_to: e.target.value || undefined})} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                      >
                        <option value="">Atribuir a...</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white">
                        {selectedTask?.assigned_to ? users.find(u => u.id === selectedTask.assigned_to)?.name : 'Não atribuído'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Estimativa (Horas)</label>
                    {isEditing ? (
                      <input 
                        type="number" 
                        step="0.5"
                        value={selectedTask ? (editTask.estimated_hours || '') : (newTask.estimated_hours || '')} 
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          if (selectedTask) setEditTask({...editTask, estimated_hours: val});
                          else setNewTask({...newTask, estimated_hours: val});
                        }}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                        placeholder="Ex: 4.5"
                      />
                    ) : (
                      <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white">
                        {selectedTask?.estimated_hours ? `${selectedTask.estimated_hours}h` : '–'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data de Início</label>
                    {isEditing ? (
                      <input 
                        type="date" 
                        value={selectedTask ? (editTask.start_date || '') : (newTask.start_date || '')} 
                        onChange={e => selectedTask ? setEditTask({...editTask, start_date: e.target.value}) : setNewTask({...newTask, start_date: e.target.value})} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                      />
                    ) : (
                      <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white">
                        {selectedTask?.start_date ? new Date(selectedTask.start_date).toLocaleDateString() : '–'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Etiquetas (Tags)</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={selectedTask ? (editTask.tags || '') : (newTask.tags || '')} 
                        onChange={e => selectedTask ? setEditTask({...editTask, tags: e.target.value}) : setNewTask({...newTask, tags: e.target.value})} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                        placeholder="Ex: urgente, bug, crm"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 p-2">
                        {selectedTask?.tags ? selectedTask.tags.split(',').map((tag, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            {tag.trim()}
                          </span>
                        )) : <p className="p-2 text-slate-400 font-bold text-sm">Nenhuma etiqueta</p>}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Depende de (Tarefa)</label>
                    {isEditing ? (
                      <select 
                        value={selectedTask ? (editTask.depends_on_task_id || '') : (newTask.depends_on_task_id || '')} 
                        onChange={e => selectedTask ? setEditTask({...editTask, depends_on_task_id: e.target.value || undefined}) : setNewTask({...newTask, depends_on_task_id: e.target.value || undefined})} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                      >
                        <option value="">Nenhuma dependência</option>
                        {tasks.filter(t => t.id !== selectedTask?.id).map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white">
                        {selectedTask?.depends_on_task_id ? tasks.find(t => t.id === selectedTask.depends_on_task_id)?.title : 'Nenhuma'}
                      </p>
                    )}
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
                    {isEditing ? (
                      <button 
                        type="button"
                        onClick={() => selectedTask ? setEditTask({...editTask, is_recurring: !editTask.is_recurring}) : setNewTask({...newTask, is_recurring: !newTask.is_recurring})}
                        className={`w-12 h-6 rounded-full transition-all relative ${(selectedTask ? editTask.is_recurring : newTask.is_recurring) ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${(selectedTask ? editTask.is_recurring : newTask.is_recurring) ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    ) : (
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedTask?.is_recurring ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {selectedTask?.is_recurring ? 'Sim' : 'Não'}
                      </span>
                    )}
                  </div>

                  {(isEditing ? (selectedTask ? editTask.is_recurring : newTask.is_recurring) : selectedTask?.is_recurring) && (
                    <div className="p-8 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 space-y-6 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Frequência</label>
                          {isEditing ? (
                            <select 
                              value={selectedTask ? editTask.recurrence_type : newTask.recurrence_type} 
                              onChange={e => selectedTask ? setEditTask({...editTask, recurrence_type: e.target.value as any}) : setNewTask({...newTask, recurrence_type: e.target.value as any})}
                              className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                            >
                              <option value="daily">Diariamente</option>
                              <option value="weekly">Semanalmente</option>
                              <option value="monthly">Mensalmente</option>
                              <option value="yearly">Anualmente</option>
                            </select>
                          ) : (
                            <p className="p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold text-slate-900 dark:text-white uppercase">{selectedTask?.recurrence_type}</p>
                          )}
                        </div>

                        {(isEditing ? (selectedTask ? editTask.recurrence_type === 'weekly' : newTask.recurrence_type === 'weekly') : selectedTask?.recurrence_type === 'weekly') && (
                          <div className="col-span-full">
                            <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">Repetir nos dias</label>
                            <div className="flex flex-wrap gap-2">
                              {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((day, idx) => {
                                const dayMap = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
                                const dayCode = dayMap[idx];
                                const isSelected = isEditing 
                                  ? (selectedTask ? editTask.recurrence_days?.includes(dayCode) : newTask.recurrence_days?.includes(dayCode))
                                  : selectedTask?.recurrence_days?.includes(dayCode);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    disabled={!isEditing}
                                    onClick={() => {
                                      const currentDays = (selectedTask ? editTask.recurrence_days : newTask.recurrence_days) ? (selectedTask ? editTask.recurrence_days : newTask.recurrence_days)!.split(',') : [];
                                      const newDays = isSelected 
                                        ? currentDays.filter(d => d !== dayCode)
                                        : [...currentDays, dayCode];
                                      if (selectedTask) setEditTask({...editTask, recurrence_days: newDays.join(',')});
                                      else setNewTask({...newTask, recurrence_days: newDays.join(',')});
                                    }}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-blue-100'} ${!isEditing ? 'cursor-default' : ''}`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {(isEditing ? (selectedTask ? editTask.recurrence_type === 'monthly' : newTask.recurrence_type === 'monthly') : selectedTask?.recurrence_type === 'monthly') && (
                          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Dia do Mês</label>
                              {isEditing ? (
                                <input 
                                  type="number" 
                                  min="1" 
                                  max="31" 
                                  value={(selectedTask ? editTask.recurrence_day_of_month : newTask.recurrence_day_of_month) || ''} 
                                  onChange={e => {
                                    const val = parseInt(e.target.value);
                                    if (selectedTask) setEditTask({...editTask, recurrence_day_of_month: val});
                                    else setNewTask({...newTask, recurrence_day_of_month: val});
                                  }}
                                  className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                                  placeholder="Ex: 10"
                                />
                              ) : (
                                <p className="p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold text-slate-900 dark:text-white">{selectedTask?.recurrence_day_of_month}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Ou Posição no Mês</label>
                              {isEditing ? (
                                <select 
                                  value={(selectedTask ? editTask.recurrence_month_week : newTask.recurrence_month_week) || ''} 
                                  onChange={e => selectedTask ? setEditTask({...editTask, recurrence_month_week: e.target.value}) : setNewTask({...newTask, recurrence_month_week: e.target.value})}
                                  className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                                >
                                  <option value="">Selecione (opcional)</option>
                                  <option value="first_monday">Primeira Segunda-feira</option>
                                  <option value="last_friday">Última Sexta-feira</option>
                                  <option value="last_day">Último dia do mês</option>
                                </select>
                              ) : (
                                <p className="p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold text-slate-900 dark:text-white uppercase">{selectedTask?.recurrence_month_week || 'N/A'}</p>
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Termina em (Opcional)</label>
                          {isEditing ? (
                            <input 
                              type="date" 
                              value={(selectedTask ? editTask.recurrence_end_date : newTask.recurrence_end_date) || ''} 
                              onChange={e => selectedTask ? setEditTask({...editTask, recurrence_end_date: e.target.value}) : setNewTask({...newTask, recurrence_end_date: e.target.value})}
                              className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                            />
                          ) : (
                            <p className="p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold text-slate-900 dark:text-white">{selectedTask?.recurrence_end_date ? new Date(selectedTask.recurrence_end_date).toLocaleDateString() : 'N/A'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Ou após X ocorrências</label>
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={(selectedTask ? editTask.recurrence_occurrences : newTask.recurrence_occurrences) || ''} 
                              onChange={e => {
                                const val = parseInt(e.target.value);
                                if (selectedTask) setEditTask({...editTask, recurrence_occurrences: val});
                                else setNewTask({...newTask, recurrence_occurrences: val});
                              }}
                              className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                              placeholder="Ex: 12"
                            />
                          ) : (
                            <p className="p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold text-slate-900 dark:text-white">{selectedTask?.recurrence_occurrences || 'N/A'}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tags / Etiquetas</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        placeholder="Ex: Urgente, Bug, Feature (separadas por vírgula)" 
                        value={selectedTask ? (editTask.tags || '') : (newTask.tags || '')} 
                        onChange={e => selectedTask ? setEditTask({...editTask, tags: e.target.value}) : setNewTask({...newTask, tags: e.target.value})} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl min-h-[56px]">
                        {selectedTask?.tags ? selectedTask.tags.split(',').map((tag, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            {tag.trim()}
                          </span>
                        )) : <span className="text-slate-400 font-bold text-sm italic">Nenhuma tag</span>}
                      </div>
                    )}
                  </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Checklist / Subtarefas</label>
                  <div className="space-y-3">
                    {(isEditing ? (selectedTask ? editTask.checklist : newTask.checklist) : selectedTask?.checklist)?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <button 
                          type="button"
                          disabled={!isEditing && !selectedTask}
                          onClick={() => {
                            const currentChecklist = isEditing 
                              ? (selectedTask ? [...(editTask.checklist || [])] : [...(newTask.checklist || [])])
                              : [...(selectedTask?.checklist || [])];
                            currentChecklist[idx].checked = !currentChecklist[idx].checked;
                            if (isEditing) {
                              if (selectedTask) setEditTask({...editTask, checklist: currentChecklist});
                              else setNewTask({...newTask, checklist: currentChecklist});
                            } else if (selectedTask) {
                              // Direct update if viewing
                              supabase.from('m4_tasks').update({ checklist: currentChecklist }).eq('id', selectedTask.id).then(() => {
                                setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, checklist: currentChecklist } : t));
                                setSelectedTask({ ...selectedTask, checklist: currentChecklist });
                              });
                            }
                          }}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}
                        >
                          {item.checked && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                        </button>
                        <input 
                          type="text" 
                          disabled={!isEditing}
                          value={item.item} 
                          onChange={(e) => {
                            const currentChecklist = selectedTask ? [...(editTask.checklist || [])] : [...(newTask.checklist || [])];
                            currentChecklist[idx].item = e.target.value;
                            if (selectedTask) setEditTask({...editTask, checklist: currentChecklist});
                            else setNewTask({...newTask, checklist: currentChecklist});
                          }}
                          className={`flex-1 bg-transparent border-none outline-none text-sm font-bold ${item.checked ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}
                        />
                        {isEditing && (
                          <button 
                            type="button"
                            onClick={() => {
                              const currentChecklist = selectedTask ? [...(editTask.checklist || [])] : [...(newTask.checklist || [])];
                              const newChecklist = currentChecklist.filter((_, i) => i !== idx);
                              if (selectedTask) setEditTask({...editTask, checklist: newChecklist});
                              else setNewTask({...newTask, checklist: newChecklist});
                            }}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <ICONS.X width="14" height="14" />
                          </button>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <button 
                        type="button"
                        onClick={() => {
                          const currentChecklist = selectedTask ? [...(editTask.checklist || [])] : [...(newTask.checklist || [])];
                          const newChecklist = [...currentChecklist, { item: '', checked: false }];
                          if (selectedTask) setEditTask({...editTask, checklist: newChecklist});
                          else setNewTask({...newTask, checklist: newChecklist});
                        }}
                        className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all"
                      >
                        + ADICIONAR ITEM
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Descrição / Notas</label>
                  {isEditing ? (
                    <textarea 
                      placeholder="Detalhes da atividade..." 
                      value={selectedTask ? editTask.description : newTask.description} 
                      onChange={e => selectedTask ? setEditTask({...editTask, description: e.target.value}) : setNewTask({...newTask, description: e.target.value})} 
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[150px] text-slate-900 dark:text-white"
                    />
                  ) : (
                    <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white whitespace-pre-wrap min-h-[100px]">{selectedTask?.description || 'Nenhuma descrição.'}</p>
                  )}
                </div>

                {selectedTask && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-50 dark:border-slate-800">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Time Tracking</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                            {isTimerRunning ? formatDuration(elapsedTime) : '00:00:00'}
                          </span>
                          {isTimerRunning ? (
                            <button 
                              onClick={handleStopTimer}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                            >
                              <ICONS.X width="14" height="14" />
                            </button>
                          ) : (
                            <button 
                              onClick={handleStartTimer}
                              className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
                            >
                              <ICONS.Plus width="14" height="14" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                        {timeEntries.map(entry => (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-bold">
                            <span className="text-slate-500">{new Date(entry.start_time).toLocaleString()}</span>
                            <span className="text-slate-900 dark:text-white">{entry.duration_minutes ? `${entry.duration_minutes} min` : 'Em curso...'}</span>
                          </div>
                        ))}
                        {timeEntries.length === 0 && <p className="text-center py-4 text-slate-400 italic text-[10px]">Nenhum registro de tempo.</p>}
                      </div>

                      <div className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Anexos</h4>
                          <label className="cursor-pointer p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all">
                            <ICONS.Plus width="14" height="14" />
                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                          {attachments.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                                  <ICONS.Tasks width="16" height="16" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-slate-900 dark:text-white truncate">{file.file_name}</p>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase">{(file.file_size / 1024).toFixed(1)} KB • {file.user?.name}</p>
                                </div>
                              </div>
                              <button 
                                onClick={async () => {
                                  const { error } = await supabase.from('m4_task_attachments').delete().eq('id', file.id);
                                  if (!error) setAttachments(attachments.filter(a => a.id !== file.id));
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <ICONS.X width="14" height="14" />
                              </button>
                            </div>
                          ))}
                          {attachments.length === 0 && <p className="text-center py-4 text-slate-400 italic text-[10px]">Nenhum anexo.</p>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col h-full">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Comentários</h4>
                      <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin mb-4">
                        {comments.map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0">
                              {comment.user?.name.charAt(0)}
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase">{comment.user?.name}</span>
                                <span className="text-[8px] text-slate-400 font-bold">{new Date(comment.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{comment.comment}</p>
                            </div>
                          </div>
                        ))}
                        {comments.length === 0 && <p className="text-center py-10 text-slate-400 italic text-[10px]">Seja o primeiro a comentar!</p>}
                      </div>
                      <div className="relative">
                        <textarea 
                          placeholder="Escreva um comentário..." 
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-xs min-h-[80px]"
                        />
                        <button 
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                          className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                          <ICONS.Plus width="16" height="16" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-10 pt-6 flex gap-4 border-t border-slate-50 dark:border-slate-800 shrink-0">
                {isEditing ? (
                  <>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (selectedTask) {
                          setIsEditing(false);
                          setEditTask(selectedTask);
                          setCompanySearch(companies.find(c => c.id === selectedTask.company_id)?.name || '');
                        } else {
                          setIsModalOpen(false);
                        }
                      }} 
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      CANCELAR
                    </button>
                    <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all">
                      {selectedTask ? 'SALVAR' : 'CRIAR TAREFA'}
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedTask(null);
                      setIsModalOpen(false);
                    }} 
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    FECHAR
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {isDeleting && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-zoom-in-95 text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-[2rem] flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6">
              <ICONS.X width="40" height="40" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-2">Excluir Tarefa?</h3>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-8">Esta ação não pode ser desfeita. Deseja continuar?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => { setIsDeleting(false); setTaskToDelete(null); }}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteTask}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-red-700 shadow-xl shadow-red-100 dark:shadow-none transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
