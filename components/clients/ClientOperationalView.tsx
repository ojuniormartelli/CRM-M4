import React, { useState } from 'react';
import { M4Client, Task, User } from '../../types';
import { ClientHeader } from './ClientHeader';
import { ClientTabs, ClientTabId } from './ClientTabs';
import { ClientTasksTab } from './ClientTasksTab';
import { ClientRoutinesTab } from './ClientRoutinesTab';
import { ClientMeetingsTab } from './ClientMeetingsTab';
import { ClientServicesTab } from './ClientServicesTab';
import { ClientContactsTab } from './ClientContactsTab';
import { ClientNotesTab } from './ClientNotesTab';
import { ClientSummaryTab } from './ClientSummaryTab';
import Toast, { ToastType } from '../Toast';
import { Check, CheckCircle2, Target, Calendar } from 'lucide-react';

interface ClientOperationalViewProps {
  activeClient: M4Client;
  onBack: () => void;
  onArchive: (client: M4Client) => void;
  onDelete: (client: M4Client) => void;
  workspaceId: string;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  companies: any[];
  setCompanies: React.Dispatch<React.SetStateAction<any[]>>;
  contacts: any[];
  setContacts: React.Dispatch<React.SetStateAction<any[]>>;
  services: any[];
  currentUser: User | null;
  users?: User[];
  setClients?: React.Dispatch<React.SetStateAction<M4Client[]>>;
}

export const ClientOperationalView: React.FC<ClientOperationalViewProps> = ({
  activeClient,
  onBack,
  onArchive,
  onDelete,
  workspaceId,
  tasks,
  setTasks,
  companies,
  setCompanies,
  contacts,
  setContacts,
  services,
  currentUser,
  users = [],
  setClients,
}) => {
  const [activeDetailTab, setActiveDetailTab] = useState<ClientTabId>('summary');
  const [toast, setToast] = useState<{ message: string, type: ToastType, isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  // Pre-calculate indicators for the sidebar of operational view
  const activeTasksList = tasks.filter(t => t.client_id === activeClient.id && !t.is_recurring && t.task_type === 'operational');
  const pendingTasksCount = activeTasksList.filter(t => t.status !== 'Concluído').length;
  const recurringRoutines = tasks.filter(t => t.client_id === activeClient.id && t.is_recurring);
  const meetingsTimeline = tasks.filter(t => t.client_id === activeClient.id && (t.type === 'meeting' || t.type === 'call' || t.type === 'Ligação' || t.type === 'Reunião'));

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <ClientHeader
        activeClient={activeClient}
        onBack={onBack}
        onArchive={() => onArchive(activeClient)}
        onDelete={() => onDelete(activeClient)}
      />

      {/* Tabs Selector */}
      <ClientTabs activeTab={activeDetailTab} onChangeTab={setActiveDetailTab} />

      {/* Detail Panels Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main interactive operational area */}
        <div className="lg:col-span-2 space-y-6">
          {activeDetailTab === 'summary' && (
            <ClientSummaryTab
              activeClient={activeClient}
              tasks={tasks}
              contacts={contacts}
              companies={companies}
              services={services}
              users={users}
              onShowToast={showToast}
            />
          )}

          {activeDetailTab === 'tasks' && (
            <ClientTasksTab
              clientId={activeClient.id}
              companyId={activeClient.company_id || null}
              workspaceId={workspaceId}
              tasks={tasks}
              setTasks={setTasks}
              currentUser={currentUser}
              onShowToast={showToast}
            />
          )}

          {activeDetailTab === 'routines' && (
            <ClientRoutinesTab
              clientId={activeClient.id}
              companyId={activeClient.company_id || null}
              workspaceId={workspaceId}
              tasks={tasks}
              setTasks={setTasks}
              onShowToast={showToast}
            />
          )}

          {activeDetailTab === 'meetings' && (
            <ClientMeetingsTab
              clientId={activeClient.id}
              companyId={activeClient.company_id || null}
              workspaceId={workspaceId}
              tasks={tasks}
              setTasks={setTasks}
              onShowToast={showToast}
            />
          )}

          {activeDetailTab === 'services' && (
            <ClientServicesTab
              activeClient={activeClient}
              services={services}
              tasks={tasks}
              setTasks={setTasks}
              onShowToast={showToast}
              setClients={setClients}
            />
          )}

          {activeDetailTab === 'contacts' && (
            <ClientContactsTab
              companyId={activeClient.company_id || null}
              workspaceId={workspaceId}
              contacts={contacts}
              setContacts={setContacts}
              onShowToast={showToast}
            />
          )}

          {activeDetailTab === 'notes' && (
            <ClientNotesTab
              activeClient={activeClient}
              workspaceId={workspaceId}
              companies={companies}
              setCompanies={setCompanies}
              onShowToast={showToast}
            />
          )}
        </div>

        {/* Right context Column Details for Active operation */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-[0.25em] text-slate-400 mb-6">Status da Transição</h4>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black dark:bg-emerald-950/20 dark:text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Onboarding</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-300 block">Concluído e Validado</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
              Este cliente foi convertido pelo formulário assistido ao atingir a etapa final comercial. Todas as tarefas e dados operacionais estão ativos no squad designado do workspace.
            </p>
          </div>

          {/* Quick Realtime KPIs of the Squad */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-[0.25em] text-slate-400 mb-6">Indicadores de Squad</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Tarefas Pendentes</span>
                <span className="font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded">
                  {pendingTasksCount}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Rotinas Estabelecidas</span>
                <span className="font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded">
                  {recurringRoutines.length}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Registros de Alinhamentos</span>
                <span className="font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded">
                  {meetingsTimeline.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};
