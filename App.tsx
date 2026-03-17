
import React, { useState, useEffect } from 'react';
import { ICONS } from './constants';
import { Pipeline, Lead, Task, Transaction, EmailMessage, Client, Project, AppMode } from './types';
import { supabase } from './lib/supabase';
import { AGENCY_PIPELINE_STAGES } from './constants';
import Dashboard from './pages/Dashboard';
import SalesCRM from './pages/SalesCRM';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Finance from './pages/Finance';
import ClientAccounts from './pages/ClientAccounts';
import Automation from './pages/Automation';
import Collaboration from './pages/Collaboration';
import ContactCenter from './pages/ContactCenter';
import MarketingCRM from './pages/MarketingCRM';
import EmailModule from './pages/EmailModule';
import Settings from './pages/Settings';
import DataEnrichment from './pages/DataEnrichment';
import MeetingForms from './pages/MeetingForms';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSalesExpanded, setIsSalesExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>(AppMode.EUGENCIA);

  // --- GLOBAL STATE ---
  const [pipelines] = useState<Pipeline[]>([
    { id: 'p1', name: 'Vendas Comercial', stages: AGENCY_PIPELINE_STAGES },
    { id: 'p2', name: 'Gestão de Reuniões', stages: [{ id: 'm1', name: 'Agendadas' }, { id: 'm2', name: 'Confirmadas' }, { id: 'm3', name: 'Realizadas' }] }
  ]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientAccounts, setClientAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string>('p1');
  const [settings, setSettings] = useState<any>(null);

  // Fetch Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resLeads, resTasks, resTrans, resEmails, resClients, resProjects, resSettings, resPosts, resCampaigns, resClientAcc, resBankAcc, resCards] = await Promise.all([
          supabase.from('m4_leads').select('*'),
          supabase.from('m4_tasks').select('*'),
          supabase.from('m4_transactions').select('*'),
          supabase.from('m4_emails').select('*').order('created_at', { ascending: false }),
          supabase.from('m4_clients').select('*'),
          supabase.from('m4_projects').select('*'),
          supabase.from('m4_settings').select('*').maybeSingle(),
          supabase.from('m4_posts').select('*').order('created_at', { ascending: false }),
          supabase.from('m4_campaigns').select('*').order('created_at', { ascending: false }),
          supabase.from('m4_client_accounts').select('*'),
          supabase.from('m4_bank_accounts').select('*'),
          supabase.from('m4_credit_cards').select('*')
        ]);
        
        if (resLeads.data) setLeads(resLeads.data);
        if (resTasks.data) setTasks(resTasks.data);
        if (resTrans.data) setTransactions(resTrans.data);
        if (resEmails.data) setEmails(resEmails.data);
        if (resClients.data) setClients(resClients.data);
        if (resProjects.data) setProjects(resProjects.data);
        if (resPosts.data) setPosts(resPosts.data);
        if (resCampaigns.data) setCampaigns(resCampaigns.data);
        if (resClientAcc.data) setClientAccounts(resClientAcc.data);
        if (resBankAcc.data) setBankAccounts(resBankAcc.data);
        if (resCards.data) setCreditCards(resCards.data);
        if (resSettings.data) {
          setSettings(resSettings.data);
        }

      } catch (err: any) {
        console.error("Erro na conexão Supabase:", err);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchData();
  }, []);

  const handleStatusChange = async (leadId: string, status: 'won' | 'lost' | 'active', extraData?: any) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const { error } = await supabase
      .from('m4_leads')
      .update({ status })
      .eq('id', leadId);

    if (!error) {
      setLeads(leads.map(l => l.id === leadId ? { ...l, status } : l));
      
      // AUTOMATION: If won, create client account and initial transaction
      if (status === 'won') {
        const clientAccData = {
          lead_id: lead.id,
          status: 'active',
          service_type: extraData?.serviceType || lead.serviceType || 'Fee Mensal',
          start_date: extraData?.startDate || new Date().toISOString().split('T')[0],
          monthly_value: extraData?.monthlyValue || lead.proposedTicket || lead.value || 0,
          notes: `Conta criada automaticamente a partir do lead ${lead.name}`
        };

        const { data: accRes, error: accErr } = await supabase
          .from('m4_client_accounts')
          .insert([clientAccData])
          .select();

        if (!accErr && accRes) {
          setClientAccounts([...clientAccounts, accRes[0]]);

          // Create initial transaction
          const initialTrans = {
            description: `Primeira Mensalidade - ${lead.company}`,
            amount: clientAccData.monthly_value,
            type: 'Receita',
            category: 'Mensalidade',
            status: 'Pendente',
            due_date: clientAccData.start_date,
            client_account_id: accRes[0].id,
            lead_id: lead.id,
            payment_method: 'Boleto'
          };

          const { data: transRes } = await supabase
            .from('m4_transactions')
            .insert([initialTrans])
            .select();
          
          if (transRes) setTransactions([...transactions, ...transRes]);

          // Also create the legacy "Client" and "Project" for backward compatibility if needed
          const clientData = {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            status: 'active',
            mrr: clientAccData.monthly_value,
            contractStart: clientAccData.start_date,
            healthScore: 100
          };

          const { data: clientRes } = await supabase
            .from('m4_clients')
            .insert([clientData])
            .select();

          if (clientRes) {
            setClients([...clients, clientRes[0]]);
            
            const projectData = {
              name: `Onboarding: ${lead.company}`,
              clientId: clientRes[0].id,
              leadId: lead.id,
              status: 'active',
              startDate: clientAccData.start_date,
              value: lead.value || 0
            };

            const { data: projRes } = await supabase
              .from('m4_projects')
              .insert([projectData])
              .select();

            if (projRes) {
              setProjects([...projects, projRes[0]]);
              
              // Create standard onboarding tasks
              const onboardingTasks = [
                { title: 'Enviar Contrato', type: 'task', priority: 'Urgente', status: 'Pendente', client_account_id: accRes[0].id },
                { title: 'Enviar Briefing', type: 'task', priority: 'Alta', status: 'Pendente', client_account_id: accRes[0].id },
                { title: 'Criar Grupo WhatsApp', type: 'task', priority: 'Média', status: 'Pendente', client_account_id: accRes[0].id },
                { title: 'Agendar Kickoff', type: 'meeting', priority: 'Alta', status: 'Pendente', client_account_id: accRes[0].id }
              ].map(t => ({
                ...t,
                projectId: projRes[0].id,
                dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                createdAt: new Date().toISOString()
              }));

              const { data: tasksRes } = await supabase
                .from('m4_tasks')
                .insert(onboardingTasks)
                .select();
              
              if (tasksRes) setTasks([...tasks, ...tasksRes]);
            }
          }
        }
      }
    }
  };

  const SidebarItem = ({ id, icon: Icon, label, hasSubItems, isExpanded, onToggle, isActive }: any) => (
    <div className="space-y-1">
      <button
        onClick={() => {
          if (hasSubItems) {
            onToggle();
            if (activeTab !== id) setActiveTab(id);
          } else {
            setActiveTab(id);
          }
        }}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 ${
          isActive && !hasSubItems
            ? 'bg-blue-600 text-white shadow-xl shadow-blue-100/50 scale-[1.02]' 
            : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon />
          <span className={`font-bold text-sm whitespace-nowrap transition-opacity ${!isSidebarOpen ? 'opacity-0' : 'opacity-100'}`}>{label}</span>
        </div>
        {hasSubItems && isSidebarOpen && (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
        )}
      </button>
      {hasSubItems && isExpanded && isSidebarOpen && (
        <div className="ml-10 space-y-1 mt-2 animate-in slide-in-from-top-4 duration-300">
          {pipelines.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setActivePipelineId(p.id);
                setActiveTab('sales');
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${
                activeTab === 'sales' && activePipelineId === p.id 
                  ? 'text-blue-600 bg-blue-50/50' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'sales' && activePipelineId === p.id ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white flex-col gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">Iniciando Cloud M4...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-300">
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-all duration-500 flex flex-col z-30 shadow-2xl shadow-slate-200/20 dark:shadow-none`}>
        <div className="p-8 flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 h-24 shrink-0">
          <div className="w-11 h-11 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-100 overflow-hidden">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              'M4'
            )}
          </div>
          <div className={`transition-all duration-500 ${!isSidebarOpen ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
            <h1 className="font-black text-slate-900 dark:text-white text-xl leading-none">{settings?.crm_name || 'M4 CRM'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] font-black text-blue-600 uppercase">{settings?.company_name || 'Agency Cloud'}</p>
              <button 
                onClick={() => setAppMode(appMode === AppMode.EUGENCIA ? AppMode.AGENCIA : AppMode.EUGENCIA)}
                className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[8px] font-black hover:bg-blue-100 hover:text-blue-600 transition-colors"
              >
                {appMode === AppMode.EUGENCIA ? 'EUGÊNCIA' : 'AGÊNCIA'}
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto scrollbar-none">
          <SidebarItem id="dashboard" icon={ICONS.Dashboard} label="Visão Geral" isActive={activeTab === 'dashboard'} />
          
          <div className={`pt-8 pb-3 px-6 text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] transition-opacity ${!isSidebarOpen && 'opacity-0'}`}>Comercial</div>
          <SidebarItem 
            id="sales" 
            icon={ICONS.Sales} 
            label="Pipelines Vendas" 
            hasSubItems={true} 
            isExpanded={isSalesExpanded}
            onToggle={() => setIsSalesExpanded(!isSalesExpanded)}
            isActive={activeTab === 'sales'}
          />
          <SidebarItem id="meeting_forms" icon={ICONS.Form} label="Sondagem & Reunião" isActive={activeTab === 'meeting_forms'} />
          <SidebarItem id="client_accounts" icon={ICONS.Clients} label="Contas Ativas" isActive={activeTab === 'client_accounts'} />
          
          <div className={`pt-8 pb-3 px-6 text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] transition-opacity ${!isSidebarOpen && 'opacity-0'}`}>Financeiro</div>
          <SidebarItem id="finance" icon={ICONS.Finance} label="Gestão Financeira" isActive={activeTab === 'finance'} />
          
          <div className={`pt-8 pb-3 px-6 text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] transition-opacity ${!isSidebarOpen && 'opacity-0'}`}>Operacional</div>
          <SidebarItem id="tasks" icon={ICONS.Tasks} label="Minhas Tarefas" isActive={activeTab === 'tasks'} />
          <SidebarItem id="projects" icon={ICONS.Projects} label="Projetos & Squads" isActive={activeTab === 'projects'} />

          {appMode === AppMode.AGENCIA && (
            <>
              <div className={`pt-8 pb-3 px-6 text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] transition-opacity ${!isSidebarOpen && 'opacity-0'}`}>Agência Plus</div>
              <SidebarItem id="emails" icon={ICONS.Mail} label="E-mail (Inbox)" isActive={activeTab === 'emails'} />
              <SidebarItem id="enrichment" icon={ICONS.Database} label="Importar Leads" isActive={activeTab === 'enrichment'} />
              <SidebarItem id="marketing" icon={ICONS.Marketing} label="Marketing CRM" isActive={activeTab === 'marketing'} />
              <SidebarItem id="contact" icon={ICONS.ContactCenter} label="Contact Center" isActive={activeTab === 'contact'} />
              <SidebarItem id="clients" icon={ICONS.Clients} label="Base de Clientes" isActive={activeTab === 'clients'} />
              <SidebarItem id="automation" icon={ICONS.Automation} label="IA & Automações" isActive={activeTab === 'automation'} />
              <SidebarItem id="collaboration" icon={ICONS.Collaboration} label="Feed & Chat" isActive={activeTab === 'collaboration'} />
            </>
          )}
        </nav>

        <div className="p-6 border-t border-slate-50 dark:border-slate-800">
          <SidebarItem id="settings" icon={ICONS.Settings} label="Configurações" isActive={activeTab === 'settings'} />
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-full mt-4 flex items-center justify-center p-3 text-slate-300 hover:text-blue-600 rounded-2xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`${!isSidebarOpen ? 'rotate-180' : ''}`}><path d="m15 18-6-6 6-6"/></svg>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-10 z-20">
          <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800 px-6 py-2.5 rounded-[1.25rem] w-[500px] border border-slate-200/50 dark:border-slate-700/50">
            <ICONS.Search className="text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Pesquisar em tudo..." className="bg-transparent border-none outline-none text-sm w-full font-bold text-slate-800 dark:text-slate-200" />
          </div>
          <div className="flex items-center gap-6">
             <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase border border-emerald-100 dark:border-emerald-900/30">Cloud Sync OK</div>
             <div className="w-12 h-12 rounded-2xl bg-slate-900 shadow-xl border-4 border-white dark:border-slate-800 overflow-hidden">
                <img src="https://picsum.photos/80/80?random=10" alt="Profile" />
              </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 scroll-smooth">
          {activeTab === 'dashboard' && <Dashboard leads={leads} transactions={transactions} tasks={tasks} />}
          {activeTab === 'emails' && <EmailModule emails={emails} setEmails={setEmails} />}
          {activeTab === 'sales' && <SalesCRM pipelines={pipelines} activePipelineId={activePipelineId} setActivePipelineId={setActivePipelineId} leads={leads} setLeads={setLeads} onStatusChange={handleStatusChange} onImportLeads={() => setActiveTab('enrichment')} />}
          {activeTab === 'enrichment' && <DataEnrichment pipelines={pipelines} onImportComplete={() => setActiveTab('sales')} />}
          {activeTab === 'meeting_forms' && <MeetingForms leads={leads} />}
          {activeTab === 'collaboration' && <Collaboration posts={posts} setPosts={setPosts} />}
          {activeTab === 'clients' && <Clients clients={clients} setClients={setClients} />}
          {activeTab === 'projects' && <Projects projects={projects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} />}
          {activeTab === 'client_accounts' && <ClientAccounts leads={leads} tasks={tasks} transactions={transactions} />}
          {activeTab === 'tasks' && <Tasks tasks={tasks} setTasks={setTasks} />}
          {activeTab === 'finance' && (
            <Finance 
              transactions={transactions} 
              bankAccounts={bankAccounts} 
              creditCards={creditCards} 
              clientAccounts={clientAccounts}
              setTransactions={setTransactions} 
              appMode={appMode}
            />
          )}
          {activeTab === 'marketing' && <MarketingCRM leads={leads} campaigns={campaigns} />}
          {activeTab === 'contact' && <ContactCenter />}
          {activeTab === 'automation' && <Automation leads={leads} />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
};

export default App;
