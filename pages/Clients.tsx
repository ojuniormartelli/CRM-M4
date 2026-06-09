import React, { useState } from 'react';
import { ICONS } from '../constants';
import { M4Client, User, Task } from '../types';
import { clientService } from '../services/clientService';
import { supabase } from '../lib/supabase';
import { servicesUtils } from '../utils/services';
import { taskService } from '../services/taskService';
import { format, isToday, isBefore, subDays, parseISO } from 'date-fns';
import { ClientOperationalView } from '../components/clients/ClientOperationalView';
import ConfirmDangerModal from '../components/ConfirmDangerModal';
import Toast, { ToastType } from '../components/Toast';
import { 
  Briefcase, 
  Users, 
  CheckSquare, 
  Clock, 
  Activity, 
  Search, 
  AlertTriangle, 
  Calendar, 
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Inbox,
  AlertCircle,
  Bell,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

interface ClientsProps {
  clients: M4Client[];
  setClients: React.Dispatch<React.SetStateAction<M4Client[]>>;
  currentUser: User | null;
  workspaceId: string;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  companies: any[];
  setCompanies: React.Dispatch<React.SetStateAction<any[]>>;
  contacts: any[];
  setContacts: React.Dispatch<React.SetStateAction<any[]>>;
  services: any[];
  selectedClientId?: string | null;
  setSelectedClientId?: (id: string | null) => void;
  activeTab?: string;
  onNewCompany?: () => void;
  onNewContact?: () => void;
}

const Clients: React.FC<ClientsProps> = ({ 
  clients, 
  setClients, 
  currentUser, 
  workspaceId,
  tasks,
  setTasks,
  companies,
  setCompanies,
  contacts,
  setContacts,
  services,
  selectedClientId,
  setSelectedClientId,
  activeTab,
  onNewCompany,
  onNewContact
}) => {
  // Navigation internal mode: overview (Situation Room), list (Banco de Contas), detail (Client Detail)
  const [view, setView] = useState<'overview' | 'list' | 'detail'>('overview');
  const [previousView, setPreviousView] = useState<'overview' | 'list'>('overview');

  // Synchronize external changes of selectedClientId or activeTab
  React.useEffect(() => {
    if (selectedClientId) {
      setView('detail');
    } else if (activeTab === 'clients_overview') {
      setView('overview');
    } else if (activeTab === 'clients') {
      setView('list');
    }
  }, [selectedClientId, activeTab]);

  // Action helper to select a client and save previous view
  const handleSelectClient = (clientId: string) => {
    setPreviousView(view === 'detail' ? 'overview' : (view as 'overview' | 'list'));
    setSelectedClientId?.(clientId);
    setView('detail');
    
    try {
      const recentsJSON = localStorage.getItem('m4_recent_clients');
      let recents: string[] = recentsJSON ? JSON.parse(recentsJSON) : [];
      recents = recents.filter(id => id !== clientId);
      recents.unshift(clientId);
      recents = recents.slice(0, 3);
      localStorage.setItem('m4_recent_clients', JSON.stringify(recents));
      window.dispatchEvent(new Event('m4_recent_clients_changed'));
    } catch (e) {
      console.error('Failed to update recent clients:', e);
    }
  };

  // Action helper to handle back navigation with state preservation
  const handleBackFromDetail = () => {
    setSelectedClientId?.(null);
    setView(previousView);
  };

  // State to hold team members (m4_users)
  const [users, setUsers] = useState<User[]>([]);
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await supabase
          .from('m4_users')
          .select('*')
          .eq('status', 'active')
          .eq('workspace_id', workspaceId);
        if (data) setUsers(data);
      } catch (err) {
        console.error('Erro ao buscar usuários do workspace para clientes:', err);
      }
    };
    if (workspaceId) fetchUsers();
  }, [workspaceId]);

  // States for importing an existing corporate CRM company as an operational client
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [importStatus, setImportStatus] = useState<'active' | 'paused' | 'churned'>('active');
  const [importStartDate, setImportStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [importMonthlyValue, setImportMonthlyValue] = useState<number | ''>('');
  const [importSelectedServices, setImportSelectedServices] = useState<string[]>([]);
  const [importServicePrices, setImportServicePrices] = useState<Record<string, number>>({});
  const [importManagerId, setImportManagerId] = useState('');
  const [importNotes, setImportNotes] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSearchTerm, setImportSearchTerm] = useState('');

  const handleOpenImportModal = () => {
    setSelectedCompanyId('');
    setSelectedContactId('');
    setImportStatus('active');
    setImportStartDate(format(new Date(), 'yyyy-MM-dd'));
    setImportMonthlyValue('');
    setImportSelectedServices([]);
    setImportServicePrices({});
    setImportManagerId(currentUser?.id || '');
    setImportNotes('');
    setImportSearchTerm('');
    setIsImportModalOpen(true);
  };

  const handlePerformImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      showToast('Por favor, selecione uma empresa para importar.', 'error');
      return;
    }

    const company = companies.find(c => c.id === selectedCompanyId);
    if (!company) {
      showToast('Empresa selecionada inválida.', 'error');
      return;
    }

    // Verify if already registered
    const alreadyExists = clients.find(c => c.company_id === selectedCompanyId);
    if (alreadyExists) {
      showToast('Esta empresa já está cadastrada como cliente operacional!', 'error');
      return;
    }

    setIsImporting(true);
    try {
      // Map contracted services list to serialized objects containing individual pricing
      const calculatedContracts = importSelectedServices.map(name => {
        const customPrice = importServicePrices[name];
        return {
          name,
          price: customPrice !== undefined ? customPrice : 0,
          active: true
        };
      });

      const serializedServices = servicesUtils.serializeClientServices(calculatedContracts);
      const totalServicesValue = calculatedContracts.reduce((sum, item) => sum + item.price, 0);

      // 1. Create the client operational record
      const clientPayload: Partial<M4Client> = {
        company_id: selectedCompanyId,
        company_name: company.name,
        status: importStatus,
        contract_start_date: importStartDate ? new Date(importStartDate).toISOString() : new Date().toISOString(),
        monthly_value: importMonthlyValue !== '' ? Number(importMonthlyValue) : totalServicesValue,
        services: serializedServices,
        manager_id: importManagerId || undefined,
        workspace_id: workspaceId,
      };

      const newClient = await clientService.create(clientPayload, workspaceId);

      // 2. Link contact if selected and not already linked
      if (selectedContactId) {
        const contact = contacts.find(ct => ct.id === selectedContactId);
        if (contact && contact.company_id !== selectedCompanyId) {
          await supabase
            .from('m4_contacts')
            .update({ company_id: selectedCompanyId })
            .eq('id', selectedContactId)
            .eq('workspace_id', workspaceId);
          
          // Update local contacts state to reflect relationship
          setContacts(prev => prev.map(ct => ct.id === selectedContactId ? { ...ct, company_id: selectedCompanyId, company: { id: selectedCompanyId, name: company.name } } : ct));
        }
      }

      // 3. Update local clients state
      const latestClients = await clientService.getAll(workspaceId);
      setClients(latestClients);

      showToast(`Cliente operacional "${company.name}" importado com sucesso!`, 'success');
      setIsImportModalOpen(false);

      // 4. Auto navigate to detail view for immediate use!
      if (newClient && newClient.id) {
        handleSelectClient(newClient.id);
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Erro ao importar empresa.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  const [toast, setToast] = useState<{ message: string, type: ToastType, isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    impactItems: string[];
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    impactItems: [],
    confirmLabel: '',
    variant: 'danger',
    action: async () => {}
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  // Archive a client handler (moves to churn)
  const handleArchive = (client: M4Client) => {
    setConfirmModal({
      isOpen: true,
      title: 'Arquivar Cliente?',
      description: `Deseja mover ${client.company_name} para a lista de Ex-Clientes?`,
      impactItems: [
        'O status será alterado para Churned.',
        'Cobranças futuras pendentes serão canceladas.',
        'O histórico de pagamentos e dados serão preservados.'
      ],
      confirmLabel: 'Confirmar Arquivamento',
      variant: 'warning',
      action: async () => {
        setIsProcessing(client.id);
        try {
          await clientService.archive(client.id, workspaceId);
          setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: 'churned' } : c));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          showToast(`Cliente ${client.company_name} arquivado`);
        } catch (error: any) {
          showToast(error.message || 'Erro ao arquivar cliente', 'error');
        } finally {
          setIsProcessing(null);
        }
      }
    });
  };

  // Delete/Trash a client handler
  const handleDelete = (client: M4Client) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover da visão ativa?',
      description: `Deseja remover ${client.company_name} da lista de clientes ativos?`,
      impactItems: [
        'O cliente será movido para a lixeira.',
        'Projetos, faturas e tarefas serão preservados no histórico.',
        'Você poderá restaurar o cliente no futuro.'
      ],
      confirmLabel: 'Mover para Lixeira',
      variant: 'danger',
      action: async () => {
        setIsProcessing(client.id);
        try {
          await clientService.delete(client.id, workspaceId);
          setClients(prev => prev.filter(c => c.id !== client.id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          showToast(`Cliente ${client.company_name} movido para a lixeira`);
          if (selectedClientId === client.id) {
            setSelectedClientId?.(null);
          }
        } catch (error: any) {
          showToast(error.message || 'Erro ao excluir cliente', 'error');
        } finally {
          setIsProcessing(null);
        }
      }
    });
  };

  // Quick action from dashboard to complete a certain task
  const handleToggleTaskStatusDashboard = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Concluído' ? 'Pendente' : 'Concluído';
    try {
      await taskService.update(taskId, { status: newStatus }, workspaceId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      showToast(newStatus === 'Concluído' ? 'Tarefa concluída!' : 'Tarefa reaberta', 'success');
    } catch (err) {
      showToast('Erro ao concluir tarefa rápida', 'error');
    }
  };

  const activeClient = clients.find(c => c.id === selectedClientId);

  // Filter clients to show under portfolio search
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesStatus = true;
    if (filter === 'active') {
      matchesStatus = c.status !== 'churned';
    } else if (filter === 'inactive') {
      matchesStatus = c.status === 'churned';
    }
    return matchesSearch && matchesStatus;
  });

  // PRE-COMPUTE DASHBOARD AGGREGATED METRICS
  const now = new Date();
  
  // All active operational tasks (not completed, not recurring, is operational, excluding meetings/calls/records, and strictly belonging to an operational client)
  const activeOperationalTasks = tasks.filter(t => 
    t.task_type === 'operational' && 
    !t.is_recurring &&
    t.type !== 'meeting' && 
    t.type !== 'call' && 
    t.type !== 'Reunião' && 
    t.type !== 'Ligação' && 
    t.type !== 'interaction_record' &&
    t.client_id &&
    clients.some(c => c.id === t.client_id)
  );

  const pendingOperationalTasks = activeOperationalTasks.filter(t => t.status !== 'Concluído');

  // Overdue operational tasks (due in the past, not completed)
  const overdueOperationalTasks = pendingOperationalTasks.filter(t => {
    if (!t.due_date) return false;
    const taskDate = new Date(t.due_date);
    return isBefore(taskDate, now) && !isToday(taskDate);
  });

  // Operational tasks due today
  const todayOperationalTasks = pendingOperationalTasks.filter(t => {
    if (!t.due_date) return false;
    return isToday(new Date(t.due_date));
  });

  // Client statuses
  const activeClientsCount = clients.filter(c => c.status === 'active').length;
  const pausedClientsCount = clients.filter(c => c.status === 'paused').length;
  const inactiveClientsCount = clients.filter(c => c.status === 'churned').length;

  // Upcoming alinhamentos/meetings (calls/meetings due today or in the future, marked as pending, and strictly belonging to an operational client)
  const upcomingMeetings = tasks.filter(t => 
    t.client_id &&
    t.task_type === 'operational' &&
    t.status !== 'Concluído' &&
    (t.type === 'meeting' || t.type === 'call' || t.type === 'Reunião' || t.type === 'Ligação') &&
    clients.some(c => c.id === t.client_id)
  ).sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // Latest updates / events logged: most recent operational movements linked to active/registered clients
  const clientEvents = clients.map(c => ({
    id: `client-create-${c.id}`,
    title: `Cliente operacional registrado: ${c.company_name}`,
    client_id: c.id,
    created_at: c.created_at || new Date().toISOString(),
    status: c.status === 'active' ? 'Ativo' : c.status === 'paused' ? 'Pausado' : 'Churn',
    isClientEvent: true
  }));

  const latestMovements = [
    ...tasks
      .filter(t => t.task_type === 'operational' && t.client_id && clients.some(c => c.id === t.client_id))
      .map(t => ({
        id: t.id,
        title: `${t.type === 'meeting' || t.type === 'Reunião' ? 'Alinhamento/Reunião' : t.type === 'call' || t.type === 'Ligação' ? 'Call de Sprint' : 'Tarefa'}: ${t.title}`,
        client_id: t.client_id,
        created_at: t.created_at,
        status: t.status,
        isClientEvent: false
      })),
    ...clientEvents
  ]
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 5);

  // BUILD INTELLIGENT REALTIME OPERATIONAL ALERTS
  const operationalAlerts: { message: string; type: 'warning' | 'danger' | 'info'; targetId?: string }[] = [];

  // Alert 1: Any client with zero tasks alocated
  clients.forEach(c => {
    if (c.status === 'active') {
      const clientTasks = tasks.filter(t => t.client_id === c.id && t.status !== 'Concluído');
      if (clientTasks.length === 0) {
        operationalAlerts.push({
          message: `O cliente ativo "${c.company_name}" está sem demandas operacionais planejadas no quadro!`,
          type: 'warning',
          targetId: c.id
        });
      }
    }
  });

  // Alert 2: Overdue items limit reached
  if (overdueOperationalTasks.length >= 3) {
    operationalAlerts.push({
      message: `Atenção: Existem ${overdueOperationalTasks.length} entregas operacionais atrasadas acumulando no squad.`,
      type: 'danger'
    });
  }

  // Alert 3: Dangerous churn alert (paused clients)
  if (pausedClientsCount > 0) {
    operationalAlerts.push({
      message: `Existem ${pausedClientsCount} contas pausadas que precisam de contato comercial de reativação imediato.`,
      type: 'info'
    });
  }

  // Helper to translate client name
  const getClientNameById = (clientId?: string) => {
    if (!clientId) return 'Geral';
    const client = clients.find(c => c.id === clientId);
    return client ? client.company_name : 'Cliente Externo';
  };

  // IF RENDERING DETAIL VIEW, SHOW THE CLIENT DETAIELD PAGE
  if (view === 'detail' && activeClient) {
    return (
      <ClientOperationalView
        activeClient={activeClient}
        onBack={handleBackFromDetail}
        onArchive={handleArchive}
        onDelete={handleDelete}
        workspaceId={workspaceId}
        tasks={tasks}
        setTasks={setTasks}
        companies={companies}
        setCompanies={setCompanies}
        contacts={contacts}
        setContacts={setContacts}
        services={services}
        currentUser={currentUser}
        users={users}
        setClients={setClients}
      />
    );
  } else if (view === 'detail') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-center space-y-4 animate-in fade-in duration-300">
        <p className="text-slate-500 font-bold text-sm">Cliente indisponível ou não selecionado.</p>
        <button 
          onClick={() => setView('overview')}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md"
        >
          Ir para a Visão Geral
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-8 animate-in fade-in duration-500">
      
      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          {view === 'list' && (
            <button
              onClick={() => { setPreviousView('overview'); setView('overview'); }}
              className="p-3 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all cursor-pointer text-slate-600 dark:text-slate-400 group shadow-xs"
              title="Voltar para o Painel"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {view === 'list' ? 'Carteira de Clientes' : 'Painel Operacional'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium z-10">
              {view === 'list' 
                ? 'Lista e status de todos os contratos e canais ativos do seu squad.' 
                : 'Cockpit estratégico de controle de marcas, metas de squad e fluxos operacionais consolidados.'}
            </p>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={handleOpenImportModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <Inbox className="w-4 h-4" />
            Importar Empresa
          </button>
        </div>
      </div>

      {/* VIEW PANEL 1: Situation Command Room (Operational Dashboard) */}
      {view === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Top Bento Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div 
              onClick={() => { setPreviousView('overview'); setView('list'); }}
              className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4 hover:shadow-md cursor-pointer group transition-all"
            >
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-2xl flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Atendimentos</span>
                <span className="text-2xl font-black text-slate-950 dark:text-white block mt-0.5 group-hover:text-blue-600 transition-all">{activeClientsCount} ativos</span>
                <span className="text-[10px] text-slate-400 italic font-medium flex items-center gap-1">
                  <span>Ver carteira de clientes</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Pauta de Hoje</span>
                <span className="text-2xl font-black text-slate-950 dark:text-white block mt-0.5">{todayOperationalTasks.length} tarefas</span>
                <span className="text-[10px] text-slate-400 italic font-medium">{pendingOperationalTasks.length} totais planejadas</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-2xl flex items-center justify-center font-bold">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Vencidos do Squad</span>
                <span className={`text-2xl font-black block mt-0.5 ${overdueOperationalTasks.length > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-950 dark:text-white'}`}>
                  {overdueOperationalTasks.length} acumuladas
                </span>
                <span className="text-[10px] text-slate-400 italic font-medium">Requer atenção operacional imediata!</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Ex-Clientes / Churn</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">{inactiveClientsCount} contas</span>
                <span className="text-[10px] text-slate-400 italic font-medium">Histórico e dados 100% preservados</span>
              </div>
            </div>
            
          </div>

          {/* Comm Dashboard Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Main Dashboard Column */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Alertas Operacionais Box */}
              {operationalAlerts.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-120 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600 animate-bounce" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Alertas Relevantes da Operação</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {operationalAlerts.map((alt, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => alt.targetId && handleSelectClient(alt.targetId)}
                        className={`p-4 rounded-xl border text-xs font-bold leading-relaxed flex items-start gap-3 transition-all ${
                          alt.targetId ? 'cursor-pointer hover:underline shadow-2xs' : ''
                        } ${
                          alt.type === 'danger' ? 'bg-rose-50/50 text-rose-700 border-rose-100 dark:bg-rose-950/10 dark:text-rose-450' :
                          alt.type === 'warning' ? 'bg-amber-50/50 text-amber-700 border-amber-100 dark:bg-amber-950/10 dark:text-amber-450' :
                          'bg-blue-50/50 text-blue-700 border-blue-100 dark:bg-blue-950/10 dark:text-blue-450'
                        }`}
                      >
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <span>{alt.message}</span>
                          {alt.targetId && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 block mt-1 hover:underline">Ir para o painel do cliente →</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Tasks Room (Pauta Operacional do Dia) */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Fila de Entregas para Hoje</h3>
                  <p className="text-xs text-slate-500">Fluxo focado em Sprints. Entregas e rituais operacionais agendados para HOJE.</p>
                </div>

                <div className="space-y-3">
                  {todayOperationalTasks.length === 0 ? (
                    <div className="py-12 border border-dashed border-slate-100 dark:border-slate-850 rounded-[2rem] text-center max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                        <CheckSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wide">Pauta limpa para hoje!</p>
                        <p className="text-[11px] text-slate-400 mt-1">Nenhuma entrega operacional do dia do cliente está na pauta.</p>
                      </div>
                    </div>
                  ) : (
                    todayOperationalTasks.map(t => (
                      <div key={t.id} className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 flex items-center justify-between hover:shadow-xs transition-all group">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleTaskStatusDashboard(t.id, t.status)}
                            className="text-slate-400 hover:text-blue-600 transition-all mt-0.5 cursor-pointer shrink-0"
                            title="Concluir demanda rápida"
                          >
                            <Inbox className="w-5 h-5 text-slate-300 hover:text-blue-500" />
                          </button>
                          <div>
                            <span className="text-sm font-bold text-slate-950 dark:text-white block group-hover:text-blue-600 transition-all">
                              {t.title}
                            </span>
                            <span className="text-[10px] text-blue-600 font-extrabold uppercase mt-0.5 block">
                              Cliente: {getClientNameById(t.client_id)}
                            </span>
                          </div>
                        </div>

                        <button 
                          onClick={() => t.client_id && handleSelectClient(t.client_id)}
                          className="p-2 bg-slate-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-600 text-slate-400 rounded-lg dark:bg-slate-900 transition-all"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Overdue/Vencidos dashboard area */}
              {overdueOperationalTasks.length > 0 && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-rose-655 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                      Obrigações Críticas Atrasadas ({overdueOperationalTasks.length})
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Itens de playbooks ou cobranças pendentes que estouraram o prazo original do cliente.</p>
                  </div>

                  <div className="space-y-3">
                    {overdueOperationalTasks.map(t => (
                      <div key={t.id} className="p-4 bg-rose-50/30 dark:bg-rose-950/5 border border-rose-100/60 dark:border-rose-950/20 rounded-xl flex items-center justify-between hover:shadow-xs transition-all group">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleTaskStatusDashboard(t.id, t.status)}
                            className="text-rose-500 hover:text-rose-700 transition-all mt-0.5 cursor-pointer shrink-0"
                            title="Concluir"
                          >
                            <Inbox className="w-5 h-5 text-rose-400" />
                          </button>
                          <div>
                            <span className="text-sm font-black text-rose-950 dark:text-rose-200 block">
                              {t.title}
                            </span>
                            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-extrabold uppercase mt-0.5 block flex items-center gap-1.5">
                              <span>Cliente: {getClientNameById(t.client_id)}</span>
                              <span className="w-1 h-1 rounded-full bg-rose-300"></span>
                              <span>Prazo estourado em: {t.due_date ? format(new Date(t.due_date), "dd/MM/yyyy") : 'N/A'}</span>
                            </span>
                          </div>
                        </div>

                        <button 
                          onClick={() => t.client_id && handleSelectClient(t.client_id)}
                          className="p-2 bg-rose-100/40 hover:bg-rose-100 text-rose-600 rounded-lg dark:bg-rose-950/30 transition-all"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Command Column Details */}
            <div className="space-y-6">
              
              {/* Card de Atalho para Base de Clientes */}
              <div 
                onClick={() => { setPreviousView('overview'); setView('list'); }}
                className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white space-y-4 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
                    Gestão Operacional
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-black leading-tight">Base de Clientes Operacionais</h4>
                  <p className="text-[11px] text-blue-100/90 mt-1">Acesse a lista completa de contas contratadas, mude status, arquive ou configure playbooks individuais.</p>
                </div>
                <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                  <span>Explorar {clients.length} contas cadastradas</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>

              {/* Próximas Reuniões da Agência */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4.5 h-4.5 text-blue-600" />
                    Alinhamentos & Calls ({upcomingMeetings.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">Próximos debates e checkpoints previstos na carteira de contas do squad.</p>
                </div>

                <div className="space-y-4">
                  {upcomingMeetings.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 italic text-center">Nenhuma call de sprint agendada para os próximos dias.</p>
                  ) : (
                    upcomingMeetings.slice(0, 4).map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => item.client_id && handleSelectClient(item.client_id)}
                        className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-120 dark:border-slate-850 hover:bg-slate-100/50 transition-all cursor-pointer block text-left"
                      >
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-blue-600 uppercase tracking-widest">{getClientNameById(item.client_id)}</span>
                          <span className="text-slate-450 font-bold">{item.due_date ? format(new Date(item.due_date), "dd/MM 'às' HH:mm") : 'Sem hora'}</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-850 dark:text-white mt-1.5 line-clamp-1">{item.title}</h4>
                        {item.description && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">{item.description}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Últimas Movimentações Operacionais */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
                    Movimentações Recentes
                  </h3>
                  <p className="text-[11px] text-slate-400">Últimas adições e mudanças registradas nos entregáveis do squad.</p>
                </div>

                <div className="space-y-4">
                  {latestMovements.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 italic text-center">Nenhuma mudança operacional registrada ultimamente.</p>
                  ) : (
                    latestMovements.map((move, idx) => {
                      const isDone = move.status === 'Concluído';
                      return (
                        <div 
                          key={move.id || idx} 
                          className="flex items-start gap-3 border-b border-slate-100/55 dark:border-slate-800/40 pb-2.5 last:border-none"
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                          <div className="text-[11px] leading-relaxed">
                            <span className="font-bold text-slate-850 dark:text-slate-300 block line-clamp-1">{move.title}</span>
                            <span className="text-slate-400 font-medium block">
                              Cliente: <strong className="font-semibold text-slate-600 dark:text-slate-400">{getClientNameById(move.client_id)}</strong> 
                              &nbsp;•&nbsp; Status: <strong className={isDone ? 'text-emerald-600' : 'text-blue-600'}>{move.status}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Cadastros Relacionais (CRM) - Atalhos Discretos de Apoio */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col gap-3 transition-all">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Suporte & CRM</span>
                </div>
                <p className="text-[10px] text-slate-400">Selecione para estanciar novos cadastros-base de apoio no sistema.</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={onNewCompany}
                    className="flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-[9px] font-bold uppercase tracking-wider rounded-xl border border-slate-200 dark:border-slate-705 transition-all cursor-pointer shadow-3xs"
                  >
                    + Nova Empresa
                  </button>
                  <button
                    onClick={onNewContact}
                    className="flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-[9px] font-bold uppercase tracking-wider rounded-xl border border-slate-200 dark:border-slate-705 transition-all cursor-pointer shadow-3xs"
                  >
                    + Novo Contato
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* VIEW PANEL 2: Client portfolio list selection */}
      {view === 'list' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Status Tabs selector */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 shrink-0">
              {[
                { id: 'active', label: 'Clientes Ativos' },
                { id: 'inactive', label: 'Ex-Clientes / Churn' },
                { id: 'all', label: 'Todos da Agência' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    filter === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Portfolio Search Box Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450" width="18" height="18" />
              <input 
                type="text" 
                placeholder="Buscar cliente corporativo..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-80 shadow-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredClients.map((client) => {
              const clientTasks = tasks.filter(t => t.client_id === client.id && t.status !== 'Concluído' && !t.is_recurring);
              return (
                <div key={client.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between h-full min-h-[350px]">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                        {client.company_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-slate-900 dark:text-white text-lg truncate" title={client.company_name}>{client.company_name}</h4>
                        <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest truncate">
                          {client.status === 'churned' ? 'Ex-Cliente / Churn' : 'Cliente Ativo'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-450 text-xs">
                        <span className="font-black uppercase tracking-widest text-[10px]">Ticket MRR</span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.monthly_value || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-450 text-xs">
                        <span className="font-black uppercase tracking-widest text-[10px]">Data Inicial</span>
                        <span className="font-bold text-slate-850 dark:text-slate-350">
                          {client.contract_start_date ? format(new Date(client.contract_start_date), 'dd/MM/yyyy') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-450 text-xs h-6">
                        <span className="font-black uppercase tracking-widest text-[10px]">Demandas Ativas</span>
                        {clientTasks.length > 0 ? (
                          <span className="font-black text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg text-[10px]">
                            {clientTasks.length} pendentes
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-550 text-[10px] font-bold">
                            Nenhuma pauta
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {(() => {
                          const parsedServices = servicesUtils.parseClientServices(client.services, services);
                          if (parsedServices.length === 0) {
                            return (
                              <span className="text-slate-450 dark:text-slate-500 text-[10px] font-medium italic">
                                Nenhum serviço contratado
                              </span>
                            );
                          }
                          const visibleServices = parsedServices.slice(0, 2);
                          const hasMore = parsedServices.length > 2;
                          return (
                            <>
                              {visibleServices.map((srv, idx) => (
                                <span 
                                  key={idx} 
                                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest truncate max-w-[110px] block"
                                  title={srv.name}
                                >
                                  {srv.name}
                                </span>
                              ))}
                              {hasMore && (
                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                                  +{parsedServices.length - 2} serv.
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-800 mt-6">
                    <div className="flex gap-2">
                      <span className={`text-[9.5px] font-black uppercase px-3 py-1 rounded-full ${
                        client.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
                        client.status === 'paused' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {client.status === 'active' ? 'Ativo' : client.status === 'paused' ? 'Pausado' : 'Churn'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleSelectClient(client.id)}
                        className="text-blue-600 dark:text-blue-400 text-[11px] font-black uppercase tracking-widest hover:underline cursor-pointer flex items-center gap-1 group/btn"
                      >
                        Ver Operação
                        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredClients.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-705 mx-auto">
                  <Inbox className="w-10 h-10" />
                </div>
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">
                  {filter === 'inactive' ? 'Nenhum ex-cliente arquivado' : filter === 'active' ? 'Nenhum cliente ativo' : 'Nenhum cliente encontrado'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation danger & warning triggers */}
      <ConfirmDangerModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        description={confirmModal.description}
        impactItems={confirmModal.impactItems}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        isLoading={isProcessing !== null}
      />

      {/* Import Corporate CRM Company to Operational Client Modal */}
      {isImportModalOpen && (() => {
        const servicesList = (services && services.length > 0) ? services : [
          { id: '1', name: 'Gestão de Tráfego' },
          { id: '2', name: 'Social Media' },
          { id: '3', name: 'Design & Branding' },
          { id: '4', name: 'SEO & Copywriting' },
          { id: '5', name: 'Assessoria de Imprensa' },
          { id: '6', name: 'Desenvolvimento Web' },
        ];

        const searchedCompanies = companies.filter(company => 
          company.name && company.name.toLowerCase().includes(importSearchTerm.toLowerCase())
        );

        const existingClient = clients.find(c => c.company_id === selectedCompanyId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b border-slate-100/50 dark:border-slate-800/40">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-blue-600" />
                    Importar Empresa para a Operação
                  </h3>
                  <p className="text-xs text-slate-405 mt-0.5">Vincule contas corporativas e contatos já cadastrados no CRM ao squad.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-2 text-slate-450 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition-all text-xs font-black"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handlePerformImport} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                
                {/* Step 1: Company Lookup */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                    Selecionar Empresa Existente no CRM
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" width="16" height="16" />
                    <input 
                      type="text" 
                      placeholder="Buscar empresa (ex: CAR 13)..." 
                      value={importSearchTerm}
                      onChange={e => setImportSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl font-bold text-xs focus:ring-2 focus:ring-blue-500 outline-none w-full text-slate-900 dark:text-white"
                    />
                  </div>
                  
                  <div className="mt-2 max-h-36 overflow-y-auto border border-slate-100 dark:border-slate-800/80 rounded-xl p-1 bg-slate-50/50 dark:bg-slate-950/20 divide-y divide-slate-100/40 dark:divide-slate-800/20">
                    {searchedCompanies.length === 0 ? (
                      <p className="text-[10px] text-slate-400 p-3 italic">Nenhuma empresa encontrada com este nome.</p>
                    ) : (
                      searchedCompanies.slice(0, 50).map(company => {
                        const isSelected = selectedCompanyId === company.id;
                        const hasOperClient = clients.some(c => c.company_id === company.id);
                        return (
                          <button
                            type="button"
                            key={company.id}
                            onClick={() => {
                              setSelectedCompanyId(company.id);
                              if (company.monthly_value || company.mrr) {
                                setImportMonthlyValue(company.monthly_value || company.mrr || '');
                              }
                              const compContacts = contacts.filter(ct => ct.company_id === company.id);
                              if (compContacts.length > 0) {
                                setSelectedContactId(compContacts[0].id);
                              } else {
                                setSelectedContactId('');
                              }
                            }}
                            className={`w-full text-left p-2.5 text-xs rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-blue-600 text-white font-black' 
                                : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold'
                            }`}
                          >
                            <span className="truncate flex items-center gap-2">
                              <Briefcase className="w-3.5 h-3.5 shrink-0" />
                              {company.name}
                            </span>
                            {hasOperClient && (
                              <span className={`text-[9px] px-2 py-0.5 rounded-full shrink-0 font-extrabold ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                                Já na Operação
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Existing Client Alert Warning */}
                {existingClient && (
                  <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-3xl text-xs space-y-2.5 text-amber-800 dark:text-amber-400 select-none animate-in fade-in duration-300">
                    <p className="font-extrabold flex items-center gap-1.5 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Empresa Já Cadastrada como Cliente!
                    </p>
                    <p>A empresa <strong>{existingClient.company_name}</strong> já possui um registro de cliente operacional associado com status <strong>{existingClient.status === 'active' ? 'Ativo' : existingClient.status === 'paused' ? 'Pausado' : 'Churn'}</strong>.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsImportModalOpen(false);
                        handleSelectClient(existingClient.id);
                      }}
                      className="mt-2 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Ver Ficha do Cliente Existente
                    </button>
                  </div>
                )}

                {/* Form fields: Only show/enable if no existing clients and has a selected company */}
                {selectedCompanyId && !existingClient && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    
                    {/* Primary Contact Lookup */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                        Contato Principal Associado
                      </label>
                      <select
                        value={selectedContactId}
                        onChange={e => setSelectedContactId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Nenhum contato selecionado</option>
                        {contacts.map(ct => (
                          <option key={ct.id} value={ct.id}>
                            {ct.name} {ct.email ? `(${ct.email})` : ''} {ct.company_id === selectedCompanyId ? '★ (Empresa Correspondente)' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">Se o contato selecionado não pertencer à empresa correspondente, ele será automaticamente vinculado ao confirmar.</p>
                    </div>

                    {/* Financial & Status Configuration Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Status Select */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                          Status do Contrato
                        </label>
                        <select
                          value={importStatus}
                          onChange={e => setImportStatus(e.target.value as any)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="active">🟢 Ativo (Em Operação)</option>
                          <option value="paused">🟡 Pausado Comercial</option>
                          <option value="churned">🔴 Cancelado / Churn</option>
                        </select>
                      </div>

                      {/* Monthly MRR Value */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                          Valor Mensal (MRR)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-400 uppercase">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={importMonthlyValue}
                            onChange={e => setImportMonthlyValue(e.target.value ? parseFloat(e.target.value) : '')}
                            className="pl-9 pr-4 py-2.5 w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Contract Start Date */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                          Data de Início do Contrato
                        </label>
                        <input
                          type="date"
                          value={importStartDate}
                          onChange={e => setImportStartDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Internal Account Manager SELECT */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                          Responsável Interno (Gestor)
                        </label>
                        <select
                          value={importManagerId}
                          onChange={e => setImportManagerId(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione um gestor interno</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role || 'Sócio'})</option>
                          ))}
                        </select>
                      </div>

                    </div>

                    {/* Services Selection checkboxes */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-[11px] font-black text-slate-450 uppercase tracking-widest">
                          Serviços Contratados
                        </label>
                        {importSelectedServices.length > 0 && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            Soma: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
                              importSelectedServices.reduce((sum, name) => sum + (importServicePrices[name] !== undefined ? importServicePrices[name] : (servicesList.find(s => s.name === name)?.default_price || 0)), 0)
                            )}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {servicesList.map(s => {
                          const isSelected = importSelectedServices.includes(s.name);
                          return (
                            <div 
                              key={s.id || s.name} 
                              className={`flex flex-col gap-2 p-3 border rounded-xl transition-all ${
                                isSelected 
                                  ? 'border-blue-600 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20 font-black text-blue-600 dark:text-blue-400' 
                                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setImportSelectedServices(prev => prev.filter(name => name !== s.name));
                                    } else {
                                      setImportSelectedServices(prev => [...prev, s.name]);
                                      setImportServicePrices(prev => ({
                                        ...prev,
                                        [s.name]: s.default_price || 0
                                      }));
                                    }
                                  }}
                                  className="accent-blue-600 rounded"
                                />
                                <span>{s.name}</span>
                              </label>

                              {isSelected && (
                                <div className="mt-1 flex items-center gap-1.5 animate-in fade-in duration-250">
                                  <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-extrabold shrink-0">Valor:</span>
                                  <div className="relative flex-1">
                                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">R$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={importServicePrices[s.name] !== undefined ? importServicePrices[s.name] : (s.default_price || 0)}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setImportServicePrices(prev => ({
                                          ...prev,
                                          [s.name]: val
                                        }));
                                      }}
                                      className="pl-6 pr-1.5 py-1 w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black focus:outline-none"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* Submit Buttons footer */}
                <div className="pt-6 border-t border-slate-100/50 dark:border-slate-800/40 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  {selectedCompanyId && !existingClient && (
                    <button
                      type="submit"
                      disabled={isImporting}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-450 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                      {isImporting ? 'Importando...' : 'Confirmar Importação'}
                    </button>
                  )}
                </div>
              </form>

            </div>
          </div>
        );
      })()}

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};

export default Clients;
