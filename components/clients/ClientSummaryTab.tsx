import React from 'react';
import { M4Client, Task, User } from '../../types';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Users, 
  DollarSign, 
  ShieldAlert, 
  Activity,
  Award,
  ThumbsUp,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { servicesUtils } from '../../utils/services';

interface ClientSummaryTabProps {
  activeClient: M4Client;
  tasks: Task[];
  contacts: any[];
  companies: any[];
  services: any[];
  users: User[];
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ClientSummaryTab: React.FC<ClientSummaryTabProps> = ({
  activeClient,
  tasks,
  contacts,
  companies,
  services,
  users,
  onShowToast,
}) => {
  // Parse service configurations
  const parsedServices = servicesUtils.parseClientServices(activeClient.services || []);
  const recurrentServicesSum = parsedServices
    .filter(s => s.billing_type === 'recorrente' && s.active)
    .reduce((sum, s) => sum + (s.price || 0), 0);

  const installmentServicesActive = parsedServices
    .filter(s => s.billing_type === 'parcelado' && s.include_in_monthly && s.active);

  const installmentsSum = installmentServicesActive
    .reduce((sum, s) => sum + (s.installment_value || (s.price / (s.installments || 1))), 0);

  // Precalculate state indicators
  const clientTasks = tasks.filter(t => t.client_id === activeClient.id && t.task_type === 'operational');
  const finishedTasks = clientTasks.filter(t => t.status === 'Concluído');
  const pendingTasks = clientTasks.filter(t => t.status !== 'Concluído');
  
  // High-priority alerts
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.due_date) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(t.due_date) < today;
  });

  // Calculate percentage of deliverables completed
  const totalTasksCount = clientTasks.length;
  const completionPercentage = totalTasksCount > 0 
    ? Math.round((finishedTasks.length / totalTasksCount) * 100) 
    : 0;

  // Find primary contact
  const matchedContact = contacts.find(c => c.company_id === activeClient.company_id);

  // Find manager user
  const matchedManager = users.find(u => u.id === activeClient.manager_id);

  // Determine health indicator
  let healthScore = 'Excelente';
  let healthColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20';
  
  if (overdueTasks.length > 2) {
    healthScore = 'Foco de Risco';
    healthColor = 'text-rose-500 bg-rose-50 dark:bg-rose-950/20 animate-pulse';
  } else if (overdueTasks.length > 0 || pendingTasks.length > 5) {
    healthScore = 'Atenção Operacional';
    healthColor = 'text-amber-500 bg-amber-50 dark:bg-amber-950/20';
  }

  // Next upcoming call or meeting
  const upcomingMeetings = pendingTasks.filter(t => 
    t.type === 'meeting' || t.type === 'call' || t.type === 'Reunião' || t.type === 'Ligação'
  ).sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const nextMeeting = upcomingMeetings[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Overview Bento Card metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Health metrics */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${healthColor}`}>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Saúde da Operação</span>
            <span className="text-lg font-black text-slate-950 dark:text-white block mt-0.5">{healthScore}</span>
            <span className="text-[10px] text-slate-400 italic font-medium">
              {overdueTasks.length > 0 
                ? `${overdueTasks.length} demandas atrasadas` 
                : 'Nenhum atraso crítico'}
            </span>
          </div>
        </div>

        {/* Sprint Completion bar */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-2xl flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Entregas Concluídas</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-black text-slate-950 dark:text-white shrink-0">{completionPercentage}%</span>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 italic font-medium">
              {finishedTasks.length} de {totalTasksCount} demandas finalizadas
            </span>
          </div>
        </div>

        {/* MRR / Financial value metrics */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-2xl flex items-center justify-center font-bold shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Mensalidade Consolidada</span>
            <span className="text-lg font-black text-slate-950 dark:text-white block mt-0.5">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeClient.monthly_value || 0)}
            </span>
            {installmentsSum > 0 ? (
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-tight block mt-1">
                R$ {recurrentServicesSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recorrente + R$ {installmentsSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} parcelas
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 italic font-medium">
                Faturado mensalmente (100% Recorrente)
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Two Column details row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Summary & Squad Setup */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Diretrizes do Squad & Liderança
            </h3>
            <p className="text-xs text-slate-500">Configuração estrutural da conta ativa no workspace.</p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-805 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Gestor Responsável</span>
              <span className="font-extrabold text-slate-850 dark:text-slate-300">
                {matchedManager ? `${matchedManager.name} (${matchedManager.role || 'Gestor'})` : 'Não alocado no Squad'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-805 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Início da Operação</span>
              <span className="font-extrabold text-slate-850 dark:text-slate-300">
                {activeClient.contract_start_date ? format(new Date(activeClient.contract_start_date), 'dd/MM/yyyy') : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-805 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">ID do Registro</span>
              <span className="font-semibold text-slate-450 text-[10px] font-mono">
                {activeClient.id}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-805 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Status Operacional</span>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                activeClient.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                activeClient.status === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400'
              }`}>
                {activeClient.status === 'active' ? 'Ativo' : activeClient.status === 'paused' ? 'Pausado' : 'Churn'}
              </span>
            </div>
          </div>

          <div className="pt-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-450 block mb-3">Serviços Habilitados</span>
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                const parsedSrvs = servicesUtils.parseClientServices(activeClient.services, services);
                if (parsedSrvs.length > 0) {
                  return parsedSrvs.map((item, idx) => (
                    <span key={idx} className="bg-slate-50 dark:bg-slate-950 text-slate-650 dark:text-slate-400 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-slate-100 dark:border-slate-850 flex items-center gap-1">
                      <span>{item.name}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-extrabold ml-1">
                        ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(item.price)})
                      </span>
                    </span>
                  ));
                }
                return <span className="text-xs text-slate-400 italic">Nenhum escopo catalogado no contrato.</span>;
              })()}
            </div>
          </div>
        </div>

        {/* Right Side: Key Contact & High-Priority Agenda */}
        <div className="space-y-6">
          
          {/* Main Key Contact of the active company */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-blue-600" />
                Interlocutor / Contato Principal
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Contato do cliente vinculado a esta conta para alinhamentos rápidos.</p>
            </div>

            {matchedContact ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100/60 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-black text-xs">
                    {matchedContact.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-850 dark:text-white block">{matchedContact.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{matchedContact.position || 'Interlocutor'}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-slate-100/50 dark:border-slate-800/50 text-[11px] text-slate-500 font-medium">
                  {matchedContact.email && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">E-mail:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{matchedContact.email}</strong>
                    </div>
                  )}
                  {matchedContact.phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Telefone/Wpp:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{matchedContact.phone}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-150 dark:border-slate-800 rounded-2xl text-center">
                <p className="text-xs text-slate-400 italic">Nenhum contato do CRM associado a esta empresa.</p>
              </div>
            )}
          </div>

          {/* Next upcoming check-points agenda */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-blue-600" />
                Próxima Call de Sprint
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Rito de alinhamento estratégico ou bate-papo agendado.</p>
            </div>

            {nextMeeting ? (
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/10 rounded-2xl border border-blue-105/20 text-xs">
                <div className="flex justify-between items-center text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
                  <span>Reunião Agendada</span>
                  <span>{nextMeeting.due_date ? format(new Date(nextMeeting.due_date), "dd/MM 'às' HH:mm") : 'Sem hora'}</span>
                </div>
                <h4 className="text-xs font-black text-slate-850 dark:text-white mt-1.5">{nextMeeting.title}</h4>
                {nextMeeting.description && (
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 italic leading-relaxed">{nextMeeting.description}</p>
                )}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-150 dark:border-slate-800 rounded-2xl text-center">
                <p className="text-xs text-slate-400 italic">Nenhuma reunião com data futura agendada.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
