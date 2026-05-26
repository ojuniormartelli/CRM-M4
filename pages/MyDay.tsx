
import React, { useState, useEffect } from 'react';
import { Task, Lead, User, Priority, TaskStatus } from '../types';
import { ICONS } from '../constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertCircle, Calendar, ArrowRight, Star, Play, CheckCircle, Edit, Phone, Sparkles, X, Info } from 'lucide-react';

interface MyDayProps {
  tasks: Task[];
  leads: Lead[];
  companies: any[];
  currentUser: User | null;
  onUpdateTask: (task: Task) => Promise<void>;
}

const MyDay: React.FC<MyDayProps> = ({ tasks, leads, companies, currentUser, onUpdateTask }) => {
  const getLocalDateString = (val: string | Date | null | undefined): string => {
    if (!val) return '';
    const d = typeof val === 'string' ? new Date(val) : val;
    if (isNaN(d.getTime())) return '';
    
    // Se for string pura YYYY-MM-DD, retorna diretamente para evitar fuso horário
    if (typeof val === 'string' && val.length <= 10 && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return val;
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayLocal = getLocalDateString(new Date());
  
  const myTasks = tasks.filter(t => t.assigned_to === currentUser?.id || !t.assigned_to);
  
  const todayTasks = myTasks.filter(t => {
    if (!t.due_date || t.status === TaskStatus.DONE) return false;
    return getLocalDateString(t.due_date) === todayLocal;
  });
  
  const overdueTasks = myTasks.filter(t => {
    if (!t.due_date || t.status === TaskStatus.DONE) return false;
    const taskDateStr = getLocalDateString(t.due_date);
    return taskDateStr < todayLocal;
  });
  
  const completedToday = myTasks.filter(t => {
    if (t.status !== TaskStatus.DONE) return false;
    // Se created_at não estiver definido (ex: optimist UI), cai de volta para due_date
    const taskDateStr = getLocalDateString(t.created_at || t.due_date);
    return taskDateStr === todayLocal;
  });
  
  // Follow-ups baseados em leads com data de próxima ação hoje OU tarefas comerciais hoje
  const followUpsToday = leads.filter(l => {
    if (!l.next_action_date || l.status === 'won' || l.status === 'lost') return false;
    return getLocalDateString(l.next_action_date) === todayLocal;
  });
  
  const commercialTasksToday = todayTasks.filter(t => t.task_type === 'commercial');
  const operationalTasksToday = todayTasks.filter(t => t.task_type === 'operational');
  const internalTasksToday = todayTasks.filter(t => t.task_type === 'internal' || !t.task_type);

  const [greeting, setGreeting] = useState('');

  // --- Estados do Modal de Edição ---
  const [selectedEditTask, setSelectedEditTask] = useState<Task | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalPriority, setModalPriority] = useState<Priority | string>(Priority.MEDIUM);
  const [modalType, setModalType] = useState<'commercial' | 'operational' | 'internal' | ''>('');
  const [modalDueDate, setModalDueDate] = useState('');
  const [modalLeadId, setModalLeadId] = useState('');
  const [modalCompanyId, setModalCompanyId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEditTask(null);
    };
    if (selectedEditTask) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEditTask]);

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    await onUpdateTask({ ...task, status: newStatus });
  };

  const toDatetimeLocal = (isoStr: string | null | undefined): string => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const handleOpenEditModal = (task: Task) => {
    setSelectedEditTask(task);
    setModalTitle(task.title || '');
    setModalDesc(task.description || task.interaction_note || '');
    setModalPriority(task.priority || Priority.MEDIUM);
    setModalType(task.task_type || '');
    setModalDueDate(toDatetimeLocal(task.due_date));
    setModalLeadId(task.lead_id || '');
    setModalCompanyId(task.company_id || '');
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditTask) return;
    setIsSaving(true);
    try {
      const isAuto = ['WhatsApp', 'Ligação', 'E-mail', 'Reunião', 'call', 'meeting', 'email'].includes(selectedEditTask.type || '');
      
      const updatedData: Task = {
        ...selectedEditTask,
        priority: modalPriority,
        description: modalDesc,
        interaction_note: modalDesc,
      };

      if (!isAuto) {
        updatedData.title = modalTitle;
        updatedData.task_type = modalType ? (modalType as 'commercial' | 'operational' | 'internal') : undefined;
        updatedData.due_date = modalDueDate ? new Date(modalDueDate).toISOString() : undefined;
        updatedData.lead_id = modalLeadId || undefined;
        updatedData.company_id = modalCompanyId || undefined;
      }

      await onUpdateTask(updatedData);
      setSelectedEditTask(null);
    } catch (err) {
      console.error('Erro ao salvar tarefa em Meu Dia:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlayAction = async (task: Task) => {
    const isCompleted = task.status === TaskStatus.DONE;
    let newStatus: string;
    
    if (isCompleted) {
      newStatus = TaskStatus.TODO; // 'Pendente'
    } else {
      newStatus = TaskStatus.IN_PROGRESS; // 'Em Execução'
    }
    
    await onUpdateTask({
      ...task,
      status: newStatus
    });
  };

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-10 animate-in fade-in duration-700 pb-10">
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
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={() => handleToggleTask(task)} 
                    onEdit={() => handleOpenEditModal(task)}
                    onPlay={() => handlePlayAction(task)}
                    isOverdue 
                    leads={leads} 
                    companies={companies} 
                  />
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
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={() => handleToggleTask(task)} 
                    onEdit={() => handleOpenEditModal(task)}
                    onPlay={() => handlePlayAction(task)}
                    leads={leads} 
                    companies={companies} 
                  />
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
              <div className="max-h-[350px] overflow-y-auto pr-2 scrollbar-thin space-y-3">
                {completedToday.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={() => handleToggleTask(task)} 
                    onEdit={() => handleOpenEditModal(task)}
                    onPlay={() => handlePlayAction(task)}
                    isCompleted 
                    leads={leads} 
                    companies={companies} 
                  />
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

      {/* Modal de Edição de Tarefa em Meu Dia */}
      {selectedEditTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-zoom-in-95 overflow-hidden">
            <div className="p-8 pb-4 flex justify-between items-center shrink-0 border-b border-border/50">
              <div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
                  {['WhatsApp', 'Ligação', 'E-mail', 'Reunião', 'call', 'meeting', 'email'].includes(selectedEditTask.type || '') 
                    ? 'Notas da Interação de CRM' 
                    : 'Editar Tarefa'}
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                  ID: {selectedEditTask.id.substring(0, 8)}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedEditTask(null)} 
                className="p-3 bg-muted text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/80 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-none">
                
                {/* Banner informativo para tarefas automáticas */}
                {['WhatsApp', 'Ligação', 'E-mail', 'Reunião', 'call', 'meeting', 'email'].includes(selectedEditTask.type || '') && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3 text-xs font-bold text-foreground">
                    <Info className="w-5 h-5 text-primary shrink-0 animate-pulse" />
                    <div>
                      Esta é uma interação de CRM registrada automaticamente (tipo <span className="text-primary">{selectedEditTask.type}</span>).
                      As notas e a prioridade podem ser revisadas livremente, mas os campos estruturais permanecem protegidos para integridade do CRM.
                    </div>
                  </div>
                )}

                {/* Título */}
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Título</label>
                  {['WhatsApp', 'Ligação', 'E-mail', 'Reunião', 'call', 'meeting', 'email'].includes(selectedEditTask.type || '') ? (
                    <div className="p-4 bg-muted/50 border border-border rounded-2xl font-bold text-muted-foreground text-sm uppercase">
                      {selectedEditTask.title}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      required
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                      placeholder="Ex: Enviar proposta de marketing"
                      className="w-full p-4 bg-muted/30 border border-border rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  )}
                </div>

                {/* Descrição / Notas */}
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                    {['WhatsApp', 'Ligação', 'E-mail', 'Reunião', 'call', 'meeting', 'email'].includes(selectedEditTask.type || '') 
                      ? 'Notas da Interação' 
                      : 'Descrição / Anotações'}
                  </label>
                  <textarea 
                    value={modalDesc}
                    onChange={(e) => setModalDesc(e.target.value)}
                    placeholder="Escreva anotações ou detalhes sobre a tarefa..."
                    className="w-full p-4 bg-muted/30 border border-border rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] text-sm"
                  />
                </div>

                {!['WhatsApp', 'Ligação', 'E-mail', 'Reunião', 'call', 'meeting', 'email'].includes(selectedEditTask.type || '') && (
                  <>
                    {/* Data de Vencimento e Tipo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Data Limite & Hora</label>
                        <input 
                          type="datetime-local"
                          value={modalDueDate}
                          onChange={(e) => setModalDueDate(e.target.value)}
                          className="w-full p-4 bg-muted/30 border border-border rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm shrink-0"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Tipo de Tarefa</label>
                        <select
                          value={modalType}
                          onChange={(e) => setModalType(e.target.value as any)}
                          className="w-full p-4 bg-muted/30 border border-border rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        >
                          <option value="">Nenhum (Interno)</option>
                          <option value="commercial">Comercial</option>
                          <option value="operational">Operacional</option>
                        </select>
                      </div>
                    </div>

                    {/* Vínculos (Empresa e Lead) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Empresa Vinculada</label>
                        <select
                          value={modalCompanyId}
                          onChange={(e) => setModalCompanyId(e.target.value)}
                          className="w-full p-4 bg-muted/30 border border-border rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        >
                          <option value="">Sem empresa</option>
                          {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Lead Vinculado</label>
                        <select
                          value={modalLeadId}
                          onChange={(e) => setModalLeadId(e.target.value)}
                          className="w-full p-4 bg-muted/30 border border-border rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        >
                          <option value="">Sem lead</option>
                          {leads.map(l => (
                            <option key={l.id} value={l.id}>
                              {l.company?.name || l.company_name || 'Lead s/ Nome'} - {l.contact_name || l.name || 'Contato s/ Nome'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Prioridade sempre elegível */}
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Prioridade</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setModalPriority(p)}
                        className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-wider border transition-all ${
                          modalPriority === p 
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Rodapé */}
              <div className="p-8 border-t border-border/50 bg-muted/10 shrink-0 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEditTask(null)}
                  className="px-6 py-3 border border-border rounded-xl text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TaskCard = ({ 
  task, 
  onToggle, 
  onEdit, 
  onPlay, 
  isOverdue, 
  isCompleted, 
  leads, 
  companies 
}: { 
  task: Task; 
  onToggle: () => void; 
  onEdit: () => void;
  onPlay: () => void;
  isOverdue?: boolean; 
  isCompleted?: boolean; 
  leads: Lead[]; 
  companies: any[] 
}) => {
  const priorityColor = {
    [Priority.LOW]: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    [Priority.MEDIUM]: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    [Priority.HIGH]: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    [Priority.URGENT]: 'bg-destructive/10 text-destructive dark:bg-destructive/20'
  };

  const lead = task.lead_id ? leads.find(l => l.id === task.lead_id) : null;
  const company = task.company_id ? companies.find(c => c.id === task.company_id) : null;

  const isCommunicationTask = ['WhatsApp', 'Ligação', 'E-mail', 'Reunião', 'call', 'meeting', 'email'].includes(task.type || '');

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
              task.task_type === 'commercial' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
              task.task_type === 'operational' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-slate-100 text-slate-400 dark:bg-slate-800'
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

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!isCommunicationTask && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-muted dark:hover:bg-slate-800 rounded-lg"
            title={isCompleted ? "Reativar/Reabrir tarefa" : "Iniciar tarefa (Em Execução)"}
          >
            <Play className={`w-4 h-4 ${isCompleted ? 'text-blue-500' : 'text-emerald-500 fill-emerald-500/20'}`} />
          </button>
        )}
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-muted dark:hover:bg-slate-800 rounded-lg"
          title={isCommunicationTask ? "Ver/Editar notas da interação" : "Editar tarefa"}
        >
          <Edit className="w-4 h-4 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" />
        </button>
      </div>
    </div>
  );
};

export default MyDay;

