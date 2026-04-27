
import React, { useState, useEffect } from 'react';
import { Task, Lead, User, Priority, TaskStatus } from '../types';
import { ICONS } from '../constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertCircle, Calendar, ArrowRight, Star, Play, CheckCircle, Edit } from 'lucide-react';

interface MyDayProps {
  tasks: Task[];
  leads: Lead[];
  companies: any[];
  currentUser: User | null;
  onUpdateTask: (task: Task) => Promise<void>;
}

const MyDay: React.FC<MyDayProps> = ({ tasks, leads, companies, currentUser, onUpdateTask }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const myTasks = tasks.filter(t => t.assigned_to === currentUser?.id || !t.assigned_to);
  const todayTasks = myTasks.filter(t => t.due_date?.startsWith(today) && t.status !== TaskStatus.DONE);
  const overdueTasks = myTasks.filter(t => t.due_date && t.due_date < today && t.status !== TaskStatus.DONE);
  const completedToday = myTasks.filter(t => t.status === TaskStatus.DONE && t.created_at.startsWith(today));
  
  // Follow-ups baseados em leads com data de próxima ação hoje OU tarefas comerciais hoje
  const followUpsToday = leads.filter(l => l.next_action_date === today && (l.status !== 'won' && l.status !== 'lost'));
  const commercialTasksToday = todayTasks.filter(t => t.task_type === 'commercial');
  const operationalTasksToday = todayTasks.filter(t => t.task_type === 'operational');
  const internalTasksToday = todayTasks.filter(t => t.task_type === 'internal' || !t.task_type);

  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    await onUpdateTask({ ...task, status: newStatus });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-foreground tracking-tight">
            {greeting}, <span className="text-primary">{currentUser?.name?.split(' ')[0] || 'Guerreiro'}</span>! 🚀
          </h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Concluídas hoje</p>
              <p className="text-xl font-black text-foreground">{completedToday.length}</p>
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pendentes</p>
              <p className="text-xl font-black text-foreground">{todayTasks.length + overdueTasks.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Column: Tasks */}
        <div className="lg:col-span-2 space-y-10">
          {/* Overdue Section */}
          {overdueTasks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">Tarefas Atrasadas</h3>
                <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-[10px] font-black">
                  {overdueTasks.length}
                </span>
              </div>
              <div className="grid gap-3">
                {overdueTasks.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={() => handleToggleTask(task)} isOverdue leads={leads} companies={companies} />
                ))}
              </div>
            </section>
          )}

          {/* Today Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Star className="w-5 h-5 fill-primary" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em]">Foco de Hoje</h3>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-black">
                {todayTasks.length}
              </span>
            </div>
            {todayTasks.length > 0 ? (
              <div className="grid gap-3">
                {todayTasks.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={() => handleToggleTask(task)} leads={leads} companies={companies} />
                ))}
              </div>
            ) : (
              <div className="bg-card/50 border-2 border-dashed border-border rounded-3xl p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto text-muted-foreground">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-foreground uppercase tracking-widest text-sm">Tudo limpo por aqui!</h4>
                  <p className="text-muted-foreground text-xs font-bold">Você não tem tarefas agendadas para hoje.</p>
                </div>
              </div>
            )}
          </section>

          {/* Completed Today */}
          {completedToday.length > 0 && (
            <section className="space-y-4 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <div className="flex items-center gap-3 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">Concluídas Hoje</h3>
              </div>
              <div className="grid gap-3">
                {completedToday.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={() => handleToggleTask(task)} isCompleted leads={leads} companies={companies} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Column: Follow-ups & Insights */}
        <div className="space-y-10">
          {/* Follow-ups Section */}
          <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Follow-ups Hoje</h3>
              <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Phone className="w-4 h-4" />
              </div>
            </div>
            
            <div className="space-y-4">
              {followUpsToday.length > 0 ? (
                followUpsToday.map(lead => (
                  <div key={lead.id} className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-all border border-transparent hover:border-border">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                      <ICONS.Sales width="18" height="18" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-foreground truncate uppercase tracking-wider">{lead.company?.name || lead.company_name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground truncate">{lead.contact_name || lead.name}</p>
                    </div>
                    <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-bold text-muted-foreground text-center py-4">Nenhum follow-up para hoje.</p>
              )}
            </div>
          </section>

          {/* Quick Actions / Insights */}
          <section className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200/20 space-y-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase tracking-tight leading-tight">Dica de Produtividade</h3>
              <p className="text-blue-100 text-xs font-bold leading-relaxed">
                "Foque nas tarefas de alta prioridade primeiro. Concluir uma tarefa difícil logo cedo aumenta sua dopamina para o resto do dia."
              </p>
            </div>
            <button className="w-full py-4 bg-white text-blue-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
              Ver Relatório Semanal
              <ArrowRight className="w-4 h-4" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

const TaskCard = ({ task, onToggle, isOverdue, isCompleted, leads, companies }: { task: Task; onToggle: () => void; isOverdue?: boolean; isCompleted?: boolean; leads: Lead[]; companies: any[] }) => {
  const priorityColor = {
    [Priority.LOW]: 'bg-slate-100 text-slate-600',
    [Priority.MEDIUM]: 'bg-blue-100 text-blue-600',
    [Priority.HIGH]: 'bg-amber-100 text-amber-600',
    [Priority.URGENT]: 'bg-destructive/10 text-destructive'
  };

  const lead = task.lead_id ? leads.find(l => l.id === task.lead_id) : null;
  const company = task.company_id ? companies.find(c => c.id === task.company_id) : null;

  return (
    <div className={`group flex items-center gap-4 p-5 bg-card border border-border rounded-3xl transition-all hover:shadow-md ${isCompleted ? 'opacity-60' : ''}`}>
      <button 
        onClick={onToggle}
        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
          isCompleted 
            ? 'bg-emerald-500 border-emerald-500 text-white' 
            : 'border-muted-foreground/30 hover:border-primary text-transparent hover:text-primary/30'
        }`}
      >
        <CheckCircle2 className="w-4 h-4" />
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`text-sm font-black text-foreground uppercase tracking-wider truncate ${isCompleted ? 'line-through' : ''}`}>
            {task.title}
          </h4>
          {task.task_type && (
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
              task.task_type === 'commercial' ? 'bg-amber-100 text-amber-600' :
              task.task_type === 'operational' ? 'bg-blue-100 text-blue-600' :
              'bg-slate-100 text-slate-400'
            }`}>
              {task.task_type === 'commercial' ? 'Comercial' : task.task_type === 'operational' ? 'Operacional' : 'Interno'}
            </span>
          )}
        </div>
        
        {(lead || company) && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-lg border border-border">
              <ICONS.Sales width="10" height="10" className="text-muted-foreground" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase truncate max-w-[250px]">
                {lead ? (
                  `${lead.company || 'Empresa não informada'} - ${lead.name || 'Contato não informado'}`
                ) : (
                  company?.name || 'Empresa não informada'
                )}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${priorityColor[task.priority as Priority] || priorityColor[Priority.MEDIUM]}`}>
            {task.priority}
          </span>
          {task.due_date && (
            <span className={`text-[9px] font-bold flex items-center gap-1 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Clock className="w-3 h-3" />
              {isOverdue ? 'Atrasada' : format(new Date(task.due_date), "HH:mm")}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <Play className="w-4 h-4" />
        </button>
        <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <Edit className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MyDay;

import { Sparkles, Phone } from 'lucide-react';
