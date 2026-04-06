
import React, { useState, useEffect } from 'react';
import { Pipeline, PipelineStage, Lead, Interaction, Company, Contact, User, LeadTemperature, Task, FormTemplate, FormResponse, Priority, TaskStatus, Service, FunnelStatus } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { formatPhoneBR, formatCNPJ } from '../utils/formatters';
import { GoogleGenAI } from "@google/genai";
import { aiService } from '../services/aiService';
import { Trash2, X, Edit, Plus, Clock, ArrowRight, ChevronDown, MessageSquare, Calendar, List, FileText, Package, CheckCircle2, AlertCircle, Sparkles, Brain, Linkedin, Instagram, Phone, Mail, Users } from 'lucide-react';

interface SalesCRMProps {
  pipelines: Pipeline[];
  setPipelines: React.Dispatch<React.SetStateAction<Pipeline[]>>;
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onStatusChange: (leadId: string, status: 'won' | 'lost' | 'active', extraData?: any) => Promise<void>;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  currentUser: User | null;
  services: Service[];
  bankAccounts: any[];
  isModalOpen?: boolean;
  setIsModalOpen?: (isOpen: boolean) => void;
  renderOnlyModal?: boolean;
}

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-6 px-10 hover:bg-muted/50 transition-all group"
      >
        <h4 className="text-sm font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-[0.2em]">{title}</h4>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ICONS.ChevronDown width="16" height="16" className="text-muted-foreground" />
        </div>
      </button>
      {isOpen && <div className="px-10 pb-10 animate-in fade-in slide-in-from-top-2 duration-300">{children}</div>}
    </div>
  );
};

const PipelineProgress = ({ 
  stages, 
  currentStageId, 
  onMove, 
  onStageClick,
  isUpdating 
}: { 
  stages: PipelineStage[], 
  currentStageId: string, 
  onMove?: (direction: 'next' | 'prev') => void,
  onStageClick?: (stageId: string) => void,
  isUpdating?: boolean
}) => {
  const foundIndex = stages.findIndex(s => s.id === currentStageId);
  const currentIndex = foundIndex === -1 ? 0 : foundIndex;
  return (
    <div className="flex items-center w-full px-10 py-6 bg-card border-b border-border overflow-x-auto scrollbar-none gap-4">
      {onMove && (
        <button 
          onClick={() => onMove('prev')}
          disabled={currentIndex <= 0 || isUpdating}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground hover:bg-muted/80 rounded-xl transition-all disabled:opacity-30 shrink-0 font-black text-[10px] uppercase tracking-widest"
        >
          <ArrowRight className="w-3 h-3 rotate-180" />
          Voltar
        </button>
      )}

      <div className="flex items-center flex-1 justify-center gap-4 min-w-max">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div 
              className={`flex flex-col items-center min-w-[120px] relative group ${onStageClick && !isUpdating ? 'cursor-pointer' : ''}`}
              onClick={() => onStageClick && !isUpdating && onStageClick(stage.id)}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black z-10 transition-all duration-500 border-4 ${
                index === currentIndex 
                  ? 'bg-primary text-primary-foreground border-primary/20 shadow-lg shadow-primary/20 scale-110 ring-4 ring-primary/10' 
                  : index < currentIndex
                    ? 'bg-primary/10 text-primary border-transparent'
                    : 'bg-muted text-muted-foreground border-transparent'
              } ${onStageClick && !isUpdating && index !== currentIndex ? 'group-hover:scale-105 group-hover:border-primary/30' : ''}`}>
                {index < currentIndex ? <ICONS.Check width="16" height="16" /> : index + 1}
              </div>
              <span className={`mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-center transition-colors duration-500 ${
                index === currentIndex ? 'text-primary' : 'text-muted-foreground'
              } ${onStageClick && !isUpdating && index !== currentIndex ? 'group-hover:text-foreground' : ''}`}>
                {stage.name}
              </span>
              {index === currentIndex && (
                <div className="absolute -top-1 w-2 h-2 bg-primary rounded-full animate-ping"></div>
              )}
            </div>
            {index < stages.length - 1 && (
              <div className={`flex-1 h-[2px] min-w-[30px] -mt-8 rounded-full transition-colors duration-1000 ${
                index < currentIndex ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {onMove && (
        <button 
          onClick={() => onMove('next')}
          disabled={currentIndex >= stages.length - 1 || isUpdating}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all disabled:opacity-30 shadow-lg shadow-primary/20 shrink-0 font-black text-[10px] uppercase tracking-widest"
        >
          Avançar
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

const SalesCRM: React.FC<SalesCRMProps> = ({ 
  pipelines, 
  setPipelines,
  activePipelineId, 
  setActivePipelineId, 
  leads, 
  setLeads, 
  tasks,
  setTasks,
  onStatusChange, 
  companies, 
  setCompanies,
  contacts, 
  setContacts,
  currentUser,
  services,
  bankAccounts,
  isModalOpen: externalIsModalOpen,
  setIsModalOpen: setExternalIsModalOpen,
  renderOnlyModal = false
}) => {
  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab360, setActiveTab360] = useState<'history' | 'tasks' | 'questionnaires' | 'products'>('history');
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formResponses, setFormResponses] = useState<FormResponse[]>([]);
  const [isExecutingForm, setIsExecutingForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [isLinkingProduct, setIsLinkingProduct] = useState(false);
  const [mockLeadProducts, setMockLeadProducts] = useState([
    { id: '1', name: 'Gestão de Tráfego Pago', type: 'Recorrente', price: 'R$ 2.500,00/mês' },
    { id: '2', name: 'Setup de CRM', type: 'Projeto', price: 'R$ 1.500,00 (Taxa única)' }
  ]);
  const handleFormAnswer = (questionId: string, value: any) => {
    setFormAnswers({ ...formAnswers, [questionId]: value });
  };

  const nextQuestion = () => {
    if (!selectedTemplate) return;
    const currentQuestion = selectedTemplate.questions[currentQuestionIndex];
    const answer = formAnswers[currentQuestion.id];

    // Logic Branching
    const logic = currentQuestion.logic?.find(l => {
      if (currentQuestion.type === 'checkbox' && Array.isArray(answer)) {
        return answer.includes(l.trigger_value);
      }
      return l.trigger_value === answer;
    });

    if (logic) {
      if (logic.go_to_question_id === 'end') {
        finishMeeting();
        return;
      }
      const nextIdx = selectedTemplate.questions.findIndex(q => q.id === logic.go_to_question_id);
      if (nextIdx !== undefined && nextIdx !== -1) {
        setCurrentQuestionIndex(nextIdx);
        return;
      }
    }

    if (currentQuestionIndex < selectedTemplate.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishMeeting();
    }
  };

  const finishMeeting = async () => {
    if (!selectedLead || !selectedTemplate) return;

    setIsSavingForm(true);
    const response: Partial<FormResponse> = {
      form_id: selectedTemplate.id,
      lead_id: selectedLead.id,
      answers: Object.entries(formAnswers).map(([question_id, value]) => ({ question_id, value })),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('m4_form_responses').insert([response]).select();

    if (!error && data) {
      setFormResponses([...formResponses, data[0] as FormResponse]);
      
      // Also add an interaction to the lead
      await supabase.from('m4_interactions').insert([{
        lead_id: selectedLead.id,
        type: 'ai_insight',
        title: `Sondagem Realizada: ${selectedTemplate.title}`,
        content: `Formulário preenchido durante reunião. ${Object.keys(formAnswers).length} perguntas respondidas.`,
        created_at: new Date().toISOString()
      }]);

      setIsExecutingForm(false);
      setSelectedTemplate(null);
      setFormAnswers({});
    }
    setIsSavingForm(false);
  };

  // Fetch form templates and responses
  useEffect(() => {
    const fetchFormTemplates = async () => {
      const { data, error } = await supabase.from('m4_form_templates').select('*');
      if (data) setFormTemplates(data);
    };

    fetchFormTemplates();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      const fetchFormResponses = async () => {
        const { data, error } = await supabase
          .from('m4_form_responses')
          .select('*')
          .eq('lead_id', selectedLead.id);
        if (data) setFormResponses(data);
      };

      fetchFormResponses();
    }
  }, [selectedLead]);

  useEffect(() => {
    if (selectedLead) {
      const fetchInteractions = async () => {
        const { data, error } = await supabase
          .from('m4_interactions')
          .select('*')
          .eq('lead_id', selectedLead.id)
          .order('created_at', { ascending: false });
        
        if (data) {
          setInteractions(data);
        }
      };
      fetchInteractions();
    }
  }, [selectedLead]);

  const handleRegisterInteraction = async () => {
    if (!selectedLead || !interactionNote.trim() || !currentUser) return;

    setIsRegisteringInteraction(true);
    try {
      const newInteraction = {
        lead_id: selectedLead.id,
        type: interactionType,
        note: interactionNote,
        success: interactionSuccess,
        workspace_id: currentUser.workspace_id,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('m4_interactions')
        .insert([newInteraction])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setInteractions([data, ...interactions]);
        setInteractionNote('');
        // Reset success to true for next interaction
        setInteractionSuccess(true);
      }
    } catch (error) {
      console.error('Error registering interaction:', error);
    } finally {
      setIsRegisteringInteraction(false);
    }
  };
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editLead, setEditLead] = useState<Partial<Lead>>({});
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [internalIsModalOpen, setInternalIsModalOpen] = useState(false);
  const isModalOpen = externalIsModalOpen !== undefined ? externalIsModalOpen : internalIsModalOpen;
  const setIsModalOpen = setExternalIsModalOpen !== undefined ? setExternalIsModalOpen : setInternalIsModalOpen;
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isAIScoring, setIsAIScoring] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [interactionNote, setInteractionNote] = useState('');
  const [interactionType, setInteractionType] = useState<Interaction['type']>('WhatsApp');
  const [interactionSuccess, setInteractionSuccess] = useState(true);
  const [isRegisteringInteraction, setIsRegisteringInteraction] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'my_day'>('all');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({
    title: '',
    description: '',
    due_date: new Date().toISOString().slice(0, 16),
    priority: Priority.MEDIUM,
    type: 'task'
  });
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [showWonSuccess, setShowWonSuccess] = useState(false);
  const [showLostSuccess, setShowLostSuccess] = useState(false);
  const [wonData, setWonData] = useState({
    monthly_value: 0,
    service_type: '',
    start_date: new Date().toISOString().split('T')[0],
    bank_account_id: ''
  });
  const [lostData, setLostData] = useState({
    reason: '',
    notes: ''
  });
  
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    name: '',
    company: '',
    email: '',
    phone: '',
    value: 0,
    status: 'active',
    pipeline_id: activePipelineId,
    stage: activePipeline?.stages?.[0]?.id || '',
    closing_forecast: '',
    responsible_id: currentUser?.id || '',
    cnpj: '',
    website: '',
    niche: '',
    city: '',
    state: '',
    company_email: '',
    company_linkedin: '',
    company_phone: '',
    company_whatsapp: '',
    contact_role: '',
    contact_whatsapp: '',
    contact_instagram: '',
    contact_linkedin: '',
    instagram: '',
    notes: ''
  });
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('m4_users').select('*').eq('status', 'active');
      if (data) setUsers(data);
    };
    fetchUsers();
  }, []);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '', cnpj: '', city: '', state: '', segment: '', phone: '', whatsapp: '', email: '', website: '', instagram: '', linkedin: '', notes: ''
  });
  
  // Contact selection states for New Company form
  const [contactMode, setContactMode] = useState<'select' | 'create'>('select');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [primaryContact, setPrimaryContact] = useState({
    name: '', email: '', phone: '', role: '', whatsapp: '', instagram: '', linkedin: ''
  });

  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '', email: '', phone: '', role: '', whatsapp: '', instagram: '', linkedin: '', company_id: ''
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    const { data: companyData, error: companyError } = await supabase
      .from('m4_companies')
      .insert([{
        ...newCompany,
        workspace_id: currentUser?.workspace_id
      }])
      .select();

    if (companyError) {
      alert("Erro ao salvar empresa: " + companyError.message);
    } else if (companyData) {
      const createdCompany = companyData[0];
      const companyId = createdCompany.id;
      
      setCompanies(prev => [...prev, createdCompany].sort((a, b) => a.name.localeCompare(b.name)));

      // Handle primary contact
      if (contactMode === 'create' && primaryContact.name) {
        const { data: contactData } = await supabase
          .from('m4_contacts')
          .insert([{
            ...primaryContact,
            company_id: companyId,
            workspace_id: currentUser?.workspace_id,
            is_primary: true
          }])
          .select();
        
        if (contactData) {
          setContacts(prev => [...prev, contactData[0]].sort((a, b) => a.name.localeCompare(b.name)));
        }
      } else if (contactMode === 'select' && selectedContactId) {
        const { data: contactData } = await supabase
          .from('m4_contacts')
          .update({ company_id: companyId, is_primary: true })
          .eq('id', selectedContactId)
          .select();
        
        if (contactData) {
          setContacts(prev => prev.map(c => c.id === selectedContactId ? contactData[0] : c));
        }
      }

      setNewLead({ ...newLead, company_id: companyId, company: createdCompany.name });
      setIsCompanyModalOpen(false);
      setNewCompany({ name: '', cnpj: '', city: '', state: '', segment: '', phone: '', website: '', instagram: '' });
      setPrimaryContact({ name: '', email: '', phone: '', role: '', whatsapp: '', instagram: '', linkedin: '' });
      setSelectedContactId('');
      setContactSearch('');
      setContactMode('select');
    }
    setIsSyncing(false);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    const { data, error } = await supabase
      .from('m4_contacts')
      .insert([{ 
        ...newContact, 
        company_id: newLead.company_id,
        workspace_id: currentUser?.workspace_id
      }])
      .select();

    if (error) {
      alert("Erro ao salvar contato: " + error.message);
    } else if (data) {
      const createdContact = data[0];
      setContacts(prev => [...prev, createdContact].sort((a, b) => a.name.localeCompare(b.name)));
      setNewLead({ ...newLead, contact_id: createdContact.id, name: createdContact.name, email: createdContact.email, phone: createdContact.phone });
      setIsContactModalOpen(false);
      setNewContact({ name: '', email: '', phone: '', role: '', whatsapp: '', instagram: '', linkedin: '', company_id: '' });
    }
    setIsSyncing(false);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setIsSyncing(true);

    const targetStageId = editLead.stage || selectedLead.stage;
    const selectedPipeline = pipelines.find(p => p.id === (editLead.pipeline_id || selectedLead.pipeline_id));
    const targetStage = selectedPipeline?.stages.find(s => s.id === targetStageId);
    const targetStatus = targetStage?.status || editLead.status || selectedLead.status || 'active';

    const { error } = await supabase
      .from('m4_leads')
      .update({
        ...editLead,
        // Ensure mandatory fields are set for legacy compatibility
        company: editLead.company || selectedLead.company,
        responsible_name: editLead.responsible_name || selectedLead.responsible_name,
        email: editLead.email || selectedLead.email,
        phone: editLead.phone || selectedLead.phone,
        niche: editLead.niche || selectedLead.niche,
        
        // Ensure name is also updated
        name: editLead.name || editLead.company || selectedLead.name,
        status: targetStatus
      })
      .eq('id', selectedLead.id);

    if (error) {
      alert("Erro ao atualizar lead: " + error.message);
    } else {
      const updatedLead = { ...selectedLead, ...editLead, status: targetStatus as any };
      setLeads(leads.map(l => l.id === selectedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
      setIsEditing(false);
    }
    setIsSyncing(false);
  };

  const [isStageConfigModalOpen, setIsStageConfigModalOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const STAGE_COLORS = [
    { name: 'Azul', value: 'blue', hex: '#3b82f6' },
    { name: 'Verde', value: 'green', hex: '#22c55e' },
    { name: 'Amarelo', value: 'yellow', hex: '#eab308' },
    { name: 'Laranja', value: 'orange', hex: '#f97316' },
    { name: 'Vermelho', value: 'red', hex: '#ef4444' },
    { name: 'Roxo', value: 'purple', hex: '#8b5cf6' },
    { name: 'Rosa', value: 'pink', hex: '#ec4899' },
    { name: 'Cinza', value: 'gray', hex: '#94a3b8' }
  ];

  if (!activePipeline) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto text-muted-foreground">
            <ICONS.Settings width="32" height="32" />
          </div>
          <h3 className="text-xl font-black text-foreground uppercase">Nenhum Funil Encontrado</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">Não foi possível carregar os funis de vendas. Verifique sua conexão ou as configurações do banco de dados.</p>
        </div>
      </div>
    );
  }

  const handleSavePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPipeline || !editingPipeline.name) return;
    setIsSaving(true);
    try {
      const pipelineData = {
        name: editingPipeline.name,
        workspace_id: currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id'),
        position: editingPipeline.position ?? pipelines.length
      };

      let pipelineId = editingPipeline.id;
      if (pipelineId) {
        const { error } = await supabase.from('m4_pipelines').update(pipelineData).eq('id', pipelineId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('m4_pipelines').insert(pipelineData).select().single();
        if (error) throw error;
        pipelineId = data.id;
      }

      // Save stages
      if (editingPipeline.stages) {
        const allStages = editingPipeline.stages.map((s, idx) => {
          const stage: any = {
            pipeline_id: pipelineId,
            name: s.name,
            position: idx,
            color: s.color || 'blue',
            status: s.status || FunnelStatus.INTERMEDIATE
          };
          
          // Only include ID if it looks like a real UUID (not a temp ID from Math.random)
          if (s.id && !s.id.includes('.')) {
            stage.id = s.id;
          }
          
          return stage;
        });

        // 1. Identify stages to delete (those in DB but not in currentStages)
        if (editingPipeline.id) {
          const { data: dbStages } = await supabase.from('m4_pipeline_stages').select('id').eq('pipeline_id', pipelineId);
          if (dbStages) {
            const currentIds = allStages.map(s => s.id).filter(Boolean);
            const toDelete = dbStages.filter(s => !currentIds.includes(s.id)).map(s => s.id);
            if (toDelete.length > 0) {
              await supabase.from('m4_pipeline_stages').delete().in('id', toDelete);
            }
          }
        }

        // 2. Separate updates and inserts
        const stagesToUpsert = allStages.filter(s => s.id);
        const stagesToInsert = allStages.filter(s => !s.id);

        if (stagesToUpsert.length > 0) {
          const { error: uError } = await supabase.from('m4_pipeline_stages').upsert(stagesToUpsert);
          if (uError) throw uError;
        }

        if (stagesToInsert.length > 0) {
          const { error: iError } = await supabase.from('m4_pipeline_stages').insert(stagesToInsert);
          if (iError) throw iError;
        }
      }

      // Refresh pipelines
      const { data: pData } = await supabase.from('m4_pipelines').select('*').order('position');
      const { data: sData } = await supabase.from('m4_pipeline_stages').select('*').order('position');
      
      if (pData) {
        const fullPipelines = pData.map(p => ({
          ...p,
          stages: (sData || []).filter(s => s.pipeline_id === p.id)
        }));
        setPipelines(fullPipelines);
      }
      
      setIsStageConfigModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar pipeline:", err);
      alert("Erro ao salvar pipeline.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    
    const selectedPipeline = pipelines.find(p => p.id === (newLead.pipeline_id || activePipelineId));
    const targetStageId = newLead.stage || selectedPipeline?.stages[0].id;
    const targetStage = selectedPipeline?.stages.find(s => s.id === targetStageId);
    const targetStatus = targetStage?.status || 'active';

    const leadData = {
      ...newLead,
      // Ensure mandatory fields are set for legacy compatibility
      company: newLead.company || 'Novo Negócio',
      name: newLead.name || newLead.responsible_name || 'Novo Negócio',
      email: newLead.email,
      phone: newLead.phone,
      niche: newLead.niche,
      
      pipeline_id: newLead.pipeline_id || activePipelineId,
      stage: targetStageId,
      status: targetStatus,
      responsible_name: users.find(u => u.id === newLead.responsible_id)?.name || '',
      ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {}),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('m4_leads')
      .insert([leadData])
      .select();

    if (error) {
      alert("Erro ao salvar no Supabase: " + error.message);
    } else if (data) {
      setLeads([...leads, data[0]]);
      setIsModalOpen(false);
      setNewLead({ 
        name: '', company: '', email: '', phone: '', value: 0, notes: '',
        niche: '', service_type: '', proposed_ticket: 0,
        cnpj: '', company_email: '', company_phone: '', company_whatsapp: '', instagram: '', company_linkedin: '', 
        responsible_name: '', contact_role: '', contact_whatsapp: '', contact_instagram: '', contact_linkedin: '', contact_notes: '',
        city: '', state: '', website: '',
        pipeline_id: activePipelineId,
        stage: activePipeline?.stages?.[0]?.id || '',
        closing_forecast: '',
        responsible_id: currentUser?.id || ''
      });
    }
    setIsSyncing(false);
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.setData('leadId', id);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const onDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      const targetStage = activePipeline.stages.find(s => s.id === targetStageId);
      const targetStatus = targetStage?.status || 'active';

      // Otimista: atualiza UI primeiro
      const originalLeads = [...leads];
      setLeads(leads.map(l => l.id === leadId ? { ...l, stage: targetStageId, status: targetStatus as any } : l));
      
      const { error } = await supabase
        .from('m4_leads')
        .update({ 
          stage: targetStageId,
          status: targetStatus
        })
        .eq('id', leadId);

      if (error) {
        setLeads(originalLeads); // Reverte se falhar
        alert("Erro ao atualizar estágio: " + error.message);
      }
    }
    setDraggedLeadId(null);
  };

  const handleMoveToStage = async (lead: Lead, targetStageId: string) => {
    if (!targetStageId || targetStageId === lead.stage) return;

    const targetStage = activePipeline.stages.find(s => s.id === targetStageId);
    if (!targetStage) return;

    const targetStatus = targetStage.status || 'active';
    const targetStageName = targetStage.name;

    setIsSyncing(true);
    try {
      // Update local state
      const updatedLeads = leads.map(l => l.id === lead.id ? { ...l, stage: targetStageId, status: targetStatus as any } : l);
      setLeads(updatedLeads);
      
      if (selectedLead?.id === lead.id) {
        setSelectedLead({ ...selectedLead, stage: targetStageId, status: targetStatus as any });
      }

      // Update Supabase
      await supabase.from('m4_leads').update({ 
        stage: targetStageId,
        status: targetStatus
      }).eq('id', lead.id);

      // Log interaction
      if (currentUser) {
        const interaction = {
          lead_id: lead.id,
          type: 'Outro',
          note: `Lead movido para a etapa: ${targetStageName}`,
          success: true,
          workspace_id: currentUser.workspace_id,
          created_at: new Date().toISOString()
        };
        
        const { data: interactionData } = await supabase
          .from('m4_interactions')
          .insert([interaction])
          .select()
          .single();
          
        if (interactionData && selectedLead?.id === lead.id) {
          setInteractions([interactionData, ...interactions]);
        }
      }
    } catch (error) {
      console.error("Erro ao mover lead:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMoveLeadStage = async (lead: Lead, direction: 'next' | 'prev') => {
    const currentStageIndex = activePipeline.stages.findIndex(s => s.id === lead.stage);
    let targetStageId = '';

    if (direction === 'next' && currentStageIndex < activePipeline.stages.length - 1) {
      targetStageId = activePipeline.stages[currentStageIndex + 1].id;
    } else if (direction === 'prev' && currentStageIndex > 0) {
      targetStageId = activePipeline.stages[currentStageIndex - 1].id;
    }

    if (targetStageId) {
      await handleMoveToStage(lead, targetStageId);
    }
  };

  const handleDeleteLead = async (id: string) => {
    console.log('Iniciando exclusão do lead:', id);
    
    const { error } = await supabase
      .from('m4_leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro no Supabase ao excluir:', error);
      alert('Erro ao excluir: ' + error.message);
    } else {
      console.log('Lead excluído com sucesso do banco');
      setLeads(leads.filter(l => l.id !== id));
      setSelectedLead(null);
      setIsDeleting(false);
      alert('Lead excluído com sucesso!');
    }
  };

  const handleEnrichSingleLead = async (lead: Lead) => {
    setIsEnriching(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("API Key não configurada no ambiente. Por favor, verifique as configurações.");
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Enriqueça os dados deste lead: ${JSON.stringify(lead)}.
1. Se a empresa estiver vazia, tente inferir pelo e-mail.
2. Sugira um 'value' (valor do negócio, número inteiro) se for 0.
3. Adicione um 'notes' curto com uma estratégia de abordagem.
4. Padronize o nome.
5. Sugira uma 'probability' (0-100) e 'temperature' (Frio, Morno, Quente).
6. Sugira uma 'closing_forecast' (ex: 2024-12-15).
7. Identifique o 'niche' (ex: Estética, E-commerce, SaaS).
8. Sugira o 'service_type' (ex: Tráfego Pago, SEO, Social Media).
9. Dê um 'ai_score' de 0 a 100 baseado no fit.

Retorne APENAS um objeto JSON válido com: name, company, value, notes, probability, temperature, closing_forecast, niche, service_type, ai_score.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const enriched = JSON.parse(response.text || "{}");
      
      const { error } = await supabase
        .from('m4_leads')
        .update(enriched)
        .eq('id', lead.id);

      if (!error) {
        const updatedLead = { ...lead, ...enriched };
        setLeads(leads.map(l => l.id === lead.id ? updatedLead : l));
        setSelectedLead(updatedLead);
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao enriquecer lead.");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleAIScore = async (lead: Lead) => {
    setIsAIScoring(true);
    try {
      const result = await aiService.scoreLead(lead);
      const { error } = await supabase
        .from('m4_leads')
        .update({ ai_score: result.score, ai_reasoning: result.reasoning })
        .eq('id', lead.id);

      if (!error) {
        const updatedLead = { ...lead, ai_score: result.score, ai_reasoning: result.reasoning };
        setLeads(leads.map(l => l.id === lead.id ? updatedLead : l));
        setSelectedLead(updatedLead);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAIScoring(false);
    }
  };

  const handleAISummary = async (interactions: Interaction[]) => {
    setIsSummarizing(true);
    try {
      const summary = await aiService.summarizeInteractions(interactions);
      setAiSummary(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSummarizing(false);
    }
  };


  const getLeadsByStage = (stageId: string) => {
    const isFirstStage = activePipeline.stages[0]?.id === stageId;
    
    let filtered = leads.filter(l => {
      const matchesPipeline = !l.pipeline_id || l.pipeline_id === activePipelineId;
      
      // Check if the lead's stage exists in the current pipeline's stages
      const stageExists = activePipeline.stages.some(s => s.id === l.stage);
      
      // If the stage doesn't exist, show it in the first stage
      const matchesStage = l.stage === stageId || (isFirstStage && (!l.stage || !stageExists));
      
      // A lead is active if its status is not won or lost
      const isActive = !l.status || (l.status !== FunnelStatus.WON && l.status !== FunnelStatus.LOST && l.status !== 'won' && l.status !== 'lost');
      
      return matchesPipeline && matchesStage && isActive;
    });
    
    if (filterMode === 'my_day') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(l => l.next_action_date && l.next_action_date <= today);
    }
    
    return filtered;
  };
  const calculateStageTotal = (stageId: string) => getLeadsByStage(stageId).reduce((acc, curr) => acc + Number(curr.value), 0);

  const isStale = (lead: Lead) => {
    const activityDate = lead.last_activity_at ? new Date(lead.last_activity_at) : new Date(lead.created_at);
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    return activityDate < fiveDaysAgo;
  };

  const handleWonConfirm = async () => {
    if (!selectedLead) return;
    setIsSyncing(true);
    try {
      await onStatusChange(selectedLead.id, 'won', wonData);
      setShowWonSuccess(true);
      setTimeout(() => {
        setIsWonModalOpen(false);
        setShowWonSuccess(false);
        setSelectedLead(null);
      }, 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLostConfirm = async () => {
    if (!selectedLead) return;
    setIsSyncing(true);
    try {
      await onStatusChange(selectedLead.id, 'lost', lostData);
      setShowLostSuccess(true);
      setTimeout(() => {
        setIsLostModalOpen(false);
        setShowLostSuccess(false);
        setSelectedLead(null);
      }, 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setIsSyncing(true);
    try {
      const taskToInsert = {
        ...newTaskData,
        lead_id: selectedLead.id,
        company_id: selectedLead.company_id,
        status: 'Pendente',
        created_at: new Date().toISOString(),
        ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
      };

      const { data, error } = await supabase
        .from('m4_tasks')
        .insert([taskToInsert])
        .select();

      if (error) throw error;
      if (data) {
        setTasks([...tasks, data[0]]);
        setIsNewTaskModalOpen(false);
        setNewTaskData({
          title: '',
          description: '',
          due_date: new Date().toISOString().slice(0, 16),
          priority: Priority.MEDIUM,
          type: 'task'
        });
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao criar tarefa.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (renderOnlyModal) {
    return (
      <>
        {isModalOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg border border-border animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="flex justify-between items-center p-10 pb-0 shrink-0">
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Novo Negócio</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all">
                  <ICONS.Plus className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleCreateLead} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-none">
                  
                  {/* Seção 1 - DADOS DA EMPRESA PROSPECTADA */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <ICONS.Database width="16" height="16" />
                      </div>
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Dados da Empresa Prospectada</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome da Empresa</label>
                        <input required value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: M4 Marketing" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">CNPJ</label>
                        <input value={newLead.cnpj} onChange={e => setNewLead({...newLead, cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="00.000.000/0000-00" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cidade</label>
                        <input value={newLead.city} onChange={e => setNewLead({...newLead, city: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: São Paulo" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Estado</label>
                        <input value={newLead.state} onChange={e => setNewLead({...newLead, state: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: SP" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Segmento / Nicho</label>
                        <input value={newLead.niche} onChange={e => setNewLead({...newLead, niche: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: Energia Solar" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Website</label>
                        <input value={newLead.website} onChange={e => setNewLead({...newLead, website: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="https://..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail da Empresa</label>
                        <input type="email" value={newLead.company_email} onChange={e => setNewLead({...newLead, company_email: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="contato@empresa.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Instagram</label>
                        <input value={newLead.instagram} onChange={e => setNewLead({...newLead, instagram: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="@perfil" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">LinkedIn</label>
                        <input value={newLead.company_linkedin} onChange={e => setNewLead({...newLead, company_linkedin: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="linkedin.com/in/..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone</label>
                        <input value={newLead.company_phone} onChange={e => setNewLead({...newLead, company_phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="(00) 00000-0000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">WhatsApp</label>
                        <input value={newLead.company_whatsapp} onChange={e => setNewLead({...newLead, company_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="(00) 00000-0000" />
                      </div>
                    </div>
                  </div>

                  {/* Seção 2 - CONTATO / DECISOR */}
                  <div className="bg-muted/50 p-8 rounded-[32px] space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <ICONS.User width="16" height="16" />
                      </div>
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Contato / Decisor</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome</label>
                        <input required value={newLead.responsible_name} onChange={e => setNewLead({...newLead, responsible_name: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="Nome do contato" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cargo</label>
                        <input value={newLead.contact_role} onChange={e => setNewLead({...newLead, contact_role: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="Ex: Diretor Comercial" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail</label>
                        <input type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="email@contato.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone</label>
                        <input value={newLead.phone} onChange={e => setNewLead({...newLead, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="(00) 00000-0000" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">WhatsApp</label>
                        <input value={newLead.contact_whatsapp} onChange={e => setNewLead({...newLead, contact_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="WhatsApp" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Instagram</label>
                        <input value={newLead.contact_instagram} onChange={e => setNewLead({...newLead, contact_instagram: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="@perfil" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">LinkedIn</label>
                        <input value={newLead.contact_linkedin} onChange={e => setNewLead({...newLead, contact_linkedin: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="linkedin.com/in/..." />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Notas do Contato</label>
                      <textarea value={newLead.contact_notes} onChange={e => setNewLead({...newLead, contact_notes: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm h-24" placeholder="Observações sobre o contato..." />
                    </div>
                  </div>

                  {/* Seção 3 - DADOS DO NEGÓCIO */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <ICONS.Collaboration width="16" height="16" />
                      </div>
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Dados do Negócio</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Pipeline</label>
                        <select 
                          value={newLead.pipeline_id} 
                          onChange={e => {
                            const pId = e.target.value;
                            const pipeline = pipelines.find(p => p.id === pId);
                            setNewLead({
                              ...newLead, 
                              pipeline_id: pId,
                              stage: pipeline?.stages[0].id || ''
                            });
                          }} 
                          className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground appearance-none"
                        >
                          {pipelines.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Etapa</label>
                        <select 
                          value={newLead.stage} 
                          onChange={e => setNewLead({...newLead, stage: e.target.value})} 
                          className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground appearance-none"
                        >
                          <option value="">Selecione a Etapa</option>
                          {pipelines.find(p => p.id === (newLead.pipeline_id || activePipelineId))?.stages.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Título do Negócio</label>
                        <input required value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: Campanha de Lançamento" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Valor Estimado</label>
                        <input type="number" value={newLead.value === 0 ? '' : newLead.value} onChange={e => setNewLead({...newLead, value: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="R$ 0,00" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Previsão de Fechamento</label>
                        <input type="date" value={newLead.closing_forecast} onChange={e => setNewLead({...newLead, closing_forecast: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Responsável</label>
                        <select 
                          value={newLead.responsible_id} 
                          onChange={e => setNewLead({...newLead, responsible_id: e.target.value})} 
                          className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground appearance-none"
                        >
                          <option value="">Selecione o Responsável</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo de Serviço</label>
                      <input value={newLead.service_type} onChange={e => setNewLead({...newLead, service_type: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: Gestão de Tráfego" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Notas do Negócio</label>
                      <textarea value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground min-h-[120px] resize-none" placeholder="Detalhes adicionais..." />
                    </div>
                  </div>
                </div>

                <div className="p-10 pt-0 shrink-0 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-muted/80 transition-all">Cancelar</button>
                  <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary/90 transition-all shadow-none disabled:opacity-50">
                    {isSyncing ? 'SINCRONIZANDO...' : 'CRIAR NEGÓCIO'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isCompanyModalOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-card rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg border border-border animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="flex justify-between items-center p-10 pb-0 shrink-0">
                <h3 className="text-2xl font-black text-foreground uppercase">Nova Empresa</h3>
                <button onClick={() => setIsCompanyModalOpen(false)} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all">
                  <ICONS.Plus className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleCreateCompany} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome da Empresa</label>
                      <input required value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: M4 Marketing" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">CNPJ</label>
                      <input value={newCompany.cnpj} onChange={e => setNewCompany({...newCompany, cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cidade</label>
                      <input value={newCompany.city} onChange={e => setNewCompany({...newCompany, city: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: São Paulo" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Estado</label>
                      <input value={newCompany.state} onChange={e => setNewCompany({...newCompany, state: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: SP" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Segmento / Nicho</label>
                      <input value={newCompany.segment} onChange={e => setNewCompany({...newCompany, segment: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: Energia Solar" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Website</label>
                      <input value={newCompany.website} onChange={e => setNewCompany({...newCompany, website: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail da Empresa</label>
                      <input type="email" value={newCompany.email} onChange={e => setNewCompany({...newCompany, email: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="contato@empresa.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Instagram</label>
                      <input value={newCompany.instagram} onChange={e => setNewCompany({...newCompany, instagram: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="@perfil" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone</label>
                      <input value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">WhatsApp</label>
                      <input value={newCompany.whatsapp} onChange={e => setNewCompany({...newCompany, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                </div>
                <div className="p-10 pt-0 shrink-0 flex gap-4">
                  <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-muted/80 transition-all">Cancelar</button>
                  <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary/90 transition-all shadow-none disabled:opacity-50">
                    {isSyncing ? 'SALVANDO...' : 'CADASTRAR EMPRESA'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isContactModalOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-xl rounded-[3rem] shadow-lg border border-border overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 pb-6 flex justify-between items-center border-b border-border">
                <div>
                  <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">Novo Contato</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Informações do Relacionamento</p>
                </div>
                <button onClick={() => setIsContactModalOpen(false)} className="p-3 hover:bg-muted rounded-2xl transition-colors">
                  <ICONS.X className="text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleCreateContact} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome</label>
                    <input required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Nome completo" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cargo</label>
                    <input value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: Diretor Comercial" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail</label>
                    <input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone</label>
                    <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsContactModalOpen(false)} className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-xs">Cancelar</button>
                  <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs disabled:opacity-50 shadow-none">
                    {isSyncing ? "SALVANDO..." : "SALVAR CONTATO"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-black text-foreground tracking-tight">{activePipeline.name}</h2>
              <button 
                onClick={() => setIsPipelineModalOpen(true)}
                className="p-2 bg-muted text-muted-foreground rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                title="Configurar Pipeline"
              >
                <ICONS.Settings width="20" height="20" />
              </button>
              <button 
                onClick={() => {
                  setEditingPipeline(activePipeline);
                  setIsStageConfigModalOpen(true);
                }}
                className="p-2 bg-muted text-muted-foreground rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                title="Configurar Etapas"
              >
                <ICONS.Settings width="20" height="20" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Nuvem Sincronizada</p>
              <div className="w-1 h-1 rounded-full bg-border"></div>
              <p className="text-primary font-bold text-xs uppercase tracking-widest">{leads.filter(l => l.status === 'won' || l.status === 'ganho').length} Ganhos este mês</p>
            </div>
          </div>
        </div>

          <div className="flex gap-4">
            <div className="flex bg-muted p-1 rounded-xl mr-4">
              <button 
                onClick={() => setFilterMode('all')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'all' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterMode('my_day')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filterMode === 'my_day' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <ICONS.Clock width="12" height="12" />
                Meu Dia
              </button>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-sm hover:opacity-90 shadow-2xl shadow-primary/20 dark:shadow-none transition-all hover:-translate-y-1">
              <ICONS.Plus /> NOVO NEGÓCIO
            </button>
          </div>
      </div>

      {isPipelineModalOpen && (
        <div className="fixed inset-0 bg-background/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-card rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-foreground uppercase">Selecionar Pipeline</h3>
              <button onClick={() => setIsPipelineModalOpen(false)} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <div className="space-y-3">
              {pipelines.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePipelineId(p.id);
                    setIsPipelineModalOpen(false);
                  }}
                  className={`w-full p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${activePipelineId === p.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 bg-muted/30'}`}
                >
                  <div>
                    <p className={`font-black uppercase text-xs tracking-widest ${activePipelineId === p.id ? 'text-primary' : 'text-muted-foreground'}`}>Pipeline</p>
                    <p className="font-bold text-foreground mt-1">{p.name}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${activePipelineId === p.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card group-hover:border-primary/50'}`}>
                    {activePipelineId === p.id && <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto pb-10 -mx-10 px-10 scrollbar-none">
        <div className="flex gap-8 h-full min-w-max">
          {activePipeline.stages.map((stage) => (
            <div 
              key={stage.id} 
              onDragOver={onDragOver} 
              onDrop={(e) => onDrop(e, stage.id)}
              className={`w-[360px] flex flex-col bg-muted/30 rounded-[2.5rem] border transition-all duration-500 p-3 ${draggedLeadId ? 'border-primary border-dashed bg-primary/10' : 'border-border/40'}`}
            >
              <div className="p-6 flex justify-between items-center bg-card/60 rounded-[2rem] border-b border-border/50 mb-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STAGE_COLORS.find(c => c.value === (stage.color || 'blue'))?.hex }}></div>
                  <h3 className="font-black text-foreground text-[12px] uppercase tracking-[0.2em]">{stage.name}</h3>
                  <div className="w-5 h-5 bg-primary/10 text-primary rounded-lg flex items-center justify-center" title="Automações Ativas">
                    <ICONS.Automation width="12" height="12" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-foreground dark:bg-muted px-3 py-1 rounded-full text-[10px] font-black text-background dark:text-foreground">{getLeadsByStage(stage.id).length}</span>
                  <p className="text-[10px] font-black text-muted-foreground mt-1">R$ {calculateStageTotal(stage.id).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-2 space-y-5 overflow-y-auto flex-1 max-h-[calc(100vh-340px)] scrollbar-none pb-6">
                {getLeadsByStage(stage.id).map((lead) => (
                  <div 
                    key={lead.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, lead.id)}
                    onClick={() => setSelectedLead(lead)}
                    className={`bg-card p-6 rounded-[1.75rem] border shadow-sm transition-all cursor-grab active:cursor-grabbing group hover:shadow-xl hover:-translate-y-1 ${isStale(lead) ? 'border-destructive/30 bg-destructive/5' : 'border-border hover:border-primary'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[9px] uppercase tracking-[0.15em] font-black text-primary bg-primary/10 px-3.5 py-1.5 rounded-xl border border-primary/20 inline-block max-w-full break-words">{lead.company}</span>
                      {isStale(lead) && (
                        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" title="Negócio parado!"></div>
                      )}
                    </div>
                    <h4 className="font-black text-foreground text-lg mb-2 group-hover:text-primary transition-colors">{lead.name}</h4>
                    {lead.next_action && (
                      <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                        <ICONS.Clock width="12" height="12" />
                        <p className="text-[10px] font-black uppercase truncate">{lead.next_action}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground font-bold mb-6">{lead.notes}</p>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        lead.temperature === 'Quente' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                        lead.temperature === 'Morno' ? 'bg-primary/10 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {lead.temperature || 'Frio'}
                      </div>
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{lead.probability || 0}% Prob.</div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-border/50">
                      <div className="font-black text-foreground text-base">R$ {Number(lead.value).toLocaleString()}</div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveLeadStage(lead, 'prev'); }}
                          className="p-1.5 bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors"
                          title="Mover para etapa anterior"
                        >
                          <ICONS.ArrowRight className="rotate-180" width="14" height="14" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveLeadStage(lead, 'next'); }}
                          className="p-1.5 bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors"
                          title="Mover para próxima etapa"
                        >
                          <ICONS.ArrowRight width="14" height="14" />
                        </button>
                      </div>
                      <img src={`https://i.pravatar.cc/120?u=${lead.id}`} className="w-9 h-9 rounded-2xl border-4 border-card shadow-xl" alt="Owner" />
                    </div>
                  </div>
                ))}
                <button onClick={() => setIsModalOpen(true)} className="w-full py-6 border-2 border-dashed border-border rounded-[2rem] text-muted-foreground/50 text-[11px] font-black uppercase tracking-[0.2em] hover:border-primary hover:text-primary hover:bg-card transition-all">+ NOVO LEAD</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg border border-border animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0 gap-4">
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight truncate min-w-0">Novo Negócio</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all shrink-0">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-none">
                
                {/* Seção 1 - DADOS DA EMPRESA PROSPECTADA */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                      <ICONS.Database width="16" height="16" />
                    </div>
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Dados da Empresa Prospectada</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome da Empresa</label>
                      <input required value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: M4 Marketing" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">CNPJ</label>
                      <input value={newLead.cnpj} onChange={e => setNewLead({...newLead, cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="00.000.000/0000-00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cidade</label>
                      <input value={newLead.city} onChange={e => setNewLead({...newLead, city: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: São Paulo" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Estado</label>
                      <input value={newLead.state} onChange={e => setNewLead({...newLead, state: e.target.value.toUpperCase()})} maxLength={2} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: SP" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Segmento / Nicho</label>
                      <input value={newLead.niche} onChange={e => setNewLead({...newLead, niche: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: Energia Solar" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Website</label>
                      <input value={newLead.website} onChange={e => setNewLead({...newLead, website: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="https://..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail da Empresa</label>
                      <input type="email" value={newLead.company_email} onChange={e => setNewLead({...newLead, company_email: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="contato@empresa.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Instagram da Empresa</label>
                      <input value={newLead.instagram} onChange={e => setNewLead({...newLead, instagram: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="@perfil" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">LinkedIn da Empresa</label>
                      <input value={newLead.company_linkedin} onChange={e => setNewLead({...newLead, company_linkedin: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="linkedin.com/company/..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone da Empresa</label>
                      <input value={newLead.company_phone} onChange={e => setNewLead({...newLead, company_phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">WhatsApp da Empresa</label>
                      <input value={newLead.company_whatsapp} onChange={e => setNewLead({...newLead, company_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                </div>

                {/* Seção 2 - CONTATO / DECISOR */}
                <div className="bg-muted/50 p-8 rounded-[32px] space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                      <ICONS.User width="16" height="16" />
                    </div>
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Contato / Decisor</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome do Contato</label>
                      <input required value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="Nome do contato" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cargo</label>
                      <input value={newLead.contact_role} onChange={e => setNewLead({...newLead, contact_role: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="Ex: Diretor Comercial" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail do Contato</label>
                      <input type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="email@contato.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone do Contato</label>
                      <input value={newLead.phone} onChange={e => setNewLead({...newLead, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="(00) 00000-0000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">WhatsApp do Contato</label>
                      <input value={newLead.contact_whatsapp} onChange={e => setNewLead({...newLead, contact_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="WhatsApp" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Instagram</label>
                      <input value={newLead.contact_instagram} onChange={e => setNewLead({...newLead, contact_instagram: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="@perfil" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">LinkedIn</label>
                      <input value={newLead.contact_linkedin} onChange={e => setNewLead({...newLead, contact_linkedin: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="linkedin.com/in/..." />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Notas do Contato</label>
                    <textarea value={newLead.contact_notes} onChange={e => setNewLead({...newLead, contact_notes: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm h-24" placeholder="Observações sobre o contato..." />
                  </div>
                </div>

                {/* Seção 3 - DADOS DO NEGÓCIO */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                      <ICONS.Collaboration width="16" height="16" />
                    </div>
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Dados do Negócio</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Pipeline</label>
                      <select 
                        value={newLead.pipeline_id} 
                        onChange={e => {
                          const pId = e.target.value;
                          const pipeline = pipelines.find(p => p.id === pId);
                          setNewLead({
                            ...newLead, 
                            pipeline_id: pId,
                            stage: pipeline?.stages[0].id || ''
                          });
                        }} 
                        className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground appearance-none"
                      >
                        {pipelines.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Etapa Inicial</label>
                      <select 
                        value={newLead.stage} 
                        onChange={e => setNewLead({...newLead, stage: e.target.value})} 
                        className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground appearance-none"
                      >
                        <option value="">Primeira Etapa</option>
                        {pipelines.find(p => p.id === (newLead.pipeline_id || activePipelineId))?.stages.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Valor Estimado</label>
                      <input type="number" value={newLead.value === 0 ? '' : newLead.value} onChange={e => setNewLead({...newLead, value: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="R$ 0,00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Previsão de Fechamento</label>
                      <input type="date" value={newLead.closing_forecast} onChange={e => setNewLead({...newLead, closing_forecast: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo de Serviço</label>
                      <select 
                        value={newLead.service_type} 
                        onChange={e => {
                          const selectedService = services.find(s => s.name === e.target.value);
                          setNewLead({
                            ...newLead, 
                            service_type: e.target.value,
                            value: selectedService ? selectedService.default_price : newLead.value
                          });
                        }} 
                        className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground appearance-none"
                      >
                        <option value="">Selecione um serviço...</option>
                        {services.map(service => (
                          <option key={service.id} value={service.name}>{service.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Responsável Interno</label>
                      <select 
                        value={newLead.responsible_id} 
                        onChange={e => setNewLead({...newLead, responsible_id: e.target.value})} 
                        className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground appearance-none"
                      >
                        <option value="">Selecione o Responsável</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Notas da Negociação</label>
                    <textarea value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground min-h-[120px] resize-none" placeholder="Detalhes adicionais sobre a negociação..." />
                  </div>
                </div>
              </div>

              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-muted/80 transition-all">Cancelar</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">
                  {isSyncing ? 'SINCRONIZANDO...' : 'CRIAR NEGÓCIO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-xl z-50 flex justify-center items-center p-4 md:p-10">
          <div className="w-full max-w-7xl bg-background h-full max-h-[95vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-border/50">
            {/* Header 360 */}
            <div className="px-10 py-8 bg-card border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0">
              <div className="flex items-center gap-6 min-w-0 flex-1">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-2xl shadow-xl shadow-primary/20 dark:shadow-none shrink-0">
                  {selectedLead.company?.charAt(0) || selectedLead.name?.charAt(0) || 'L'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black text-foreground tracking-tight uppercase truncate min-w-0">
                      {selectedLead.company || selectedLead.name}
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${
                      selectedLead.status === 'won' ? 'bg-emerald-100 text-emerald-600' :
                      selectedLead.status === 'lost' ? 'bg-red-100 text-red-600' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {selectedLead.status === 'won' ? 'Ganho' : selectedLead.status === 'lost' ? 'Perdido' : 'Em Aberto'}
                    </div>
                  </div>
                  <p className="text-muted-foreground font-bold text-sm truncate">{selectedLead.name} • {selectedLead.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                <button 
                  onClick={() => setIsLostModalOpen(true)}
                  className="flex-1 md:flex-none px-6 py-3 bg-card border border-destructive/30 text-destructive rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-destructive/5 transition-all"
                >
                  Marcar Perda
                </button>
                <button 
                  onClick={() => {
                    setWonData({
                      ...wonData,
                      monthly_value: selectedLead.proposed_ticket || selectedLead.value || 0,
                      service_type: selectedLead.service_type || ''
                    });
                    setIsWonModalOpen(true);
                  }}
                  className="flex-1 md:flex-none px-6 py-3 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-none"
                >
                  Marcar Venda
                </button>
                <div className="w-px h-8 bg-border mx-2 hidden md:block" />
                
                <button 
                  onClick={() => {
                    setIsEditing(true);
                    setEditLead(selectedLead);
                  }}
                  className={`p-3 rounded-xl transition-all ${isEditing ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  title="Editar Lead"
                >
                  <ICONS.Edit className="w-6 h-6" />
                </button>

                <button 
                  onClick={() => handleAIScore(selectedLead)}
                  disabled={isAIScoring}
                  className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 transition-all disabled:opacity-50"
                  title="Score com IA"
                >
                  <Brain className={`w-6 h-6 ${isAIScoring ? 'animate-pulse' : ''}`} />
                </button>

                <button 
                  onClick={() => handleEnrichSingleLead(selectedLead)}
                  disabled={isEnriching}
                  className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 transition-all disabled:opacity-50"
                  title="Enriquecer com IA"
                >
                  <Sparkles className={`w-6 h-6 ${isEnriching ? 'animate-pulse' : ''}`} />
                </button>

                <button 
                  onClick={() => setIsDeleting(true)}
                  className="p-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all"
                  title="Excluir Lead"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
                
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="p-3 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-all"
                >
                  <ICONS.X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Pipeline Progress */}
            <PipelineProgress 
              stages={activePipeline.stages} 
              currentStageId={activePipeline.stages.some(s => s.id === selectedLead.stage) ? selectedLead.stage : activePipeline.stages[0]?.id} 
              onMove={(direction) => handleMoveLeadStage(selectedLead, direction)}
              onStageClick={(stageId) => handleMoveToStage(selectedLead, stageId)}
              isUpdating={isSyncing}
            />
            {/* Main Content 360 */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar Esquerda */}
              <div className="w-full md:w-80 border-r border-border overflow-y-auto bg-card/50 scrollbar-none shrink-0">
                <CollapsibleSection title="Negociação" defaultOpen={true}>
                  <div className="space-y-4">
                    {!isEditing ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valor</span>
                          <span className="text-sm font-black text-foreground">R$ {Number(selectedLead.value || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Serviço</span>
                          <span className="text-sm font-bold text-foreground">{selectedLead.service_type || '–'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Previsão</span>
                          <span className="text-sm font-bold text-foreground">{selectedLead.closing_forecast || '–'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Temperatura</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            selectedLead.temperature === 'Quente' ? 'bg-orange-500/10 text-orange-600' :
                            selectedLead.temperature === 'Morno' ? 'bg-primary/10 text-primary' :
                            'bg-muted text-muted-foreground'
                          }`}>{selectedLead.temperature || 'Frio'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Probabilidade</span>
                          <span className="text-sm font-bold text-foreground">{selectedLead.probability || 0}%</span>
                        </div>
                        <div className="pt-4 border-t border-border">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Notas da Negociação</span>
                          <p className="text-xs text-muted-foreground leading-relaxed italic">
                            {selectedLead.notes || 'Nenhuma observação...'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Valor</label>
                          <input 
                            type="number" 
                            value={editLead.value || 0} 
                            onChange={e => setEditLead({...editLead, value: Number(e.target.value)})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Tipo de Serviço</label>
                          <select 
                            value={editLead.service_type || ''} 
                            onChange={e => {
                              const selectedService = services.find(s => s.name === e.target.value);
                              setEditLead({
                                ...editLead, 
                                service_type: e.target.value,
                                value: selectedService ? selectedService.default_price : editLead.value
                              });
                            }}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          >
                            <option value="">Selecione um serviço</option>
                            {services.map(service => (
                              <option key={service.id} value={service.name}>{service.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Previsão</label>
                          <input 
                            type="date" 
                            value={editLead.closing_forecast || ''} 
                            onChange={e => setEditLead({...editLead, closing_forecast: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Temperatura</label>
                          <select 
                            value={editLead.temperature || 'Frio'} 
                            onChange={e => setEditLead({...editLead, temperature: e.target.value as any})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          >
                            <option value="Frio">Frio</option>
                            <option value="Morno">Morno</option>
                            <option value="Quente">Quente</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Probabilidade (%)</label>
                          <input 
                            type="number" 
                            value={editLead.probability || 0} 
                            onChange={e => setEditLead({...editLead, probability: Number(e.target.value)})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Notas da Negociação</label>
                          <textarea 
                            value={editLead.notes || ''} 
                            onChange={e => setEditLead({...editLead, notes: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold min-h-[100px] text-foreground"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Responsável / Contato" defaultOpen={true}>
                  <div className="space-y-4">
                    {!isEditing ? (
                      <div className="p-4 bg-muted/50 rounded-2xl border border-border/50">
                        <p className="text-xs font-black text-foreground mb-1">{selectedLead.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold mb-3">{selectedLead.contact_role || 'Decisor'}</p>
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-2">
                            <ICONS.Mail width="14" height="14" className="text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground">{selectedLead.email || '–'}</span>
                          </div>
                          {selectedLead.phone && (
                            <div className="flex items-center gap-2">
                              <ICONS.Phone width="14" height="14" className="text-muted-foreground" />
                              <span className="text-[10px] font-bold text-muted-foreground">{selectedLead.phone}</span>
                            </div>
                          )}
                          {selectedLead.contact_whatsapp && (
                            <div className="flex items-center gap-2">
                              <MessageSquare width="14" height="14" className="text-primary" />
                              <span className="text-[10px] font-bold text-muted-foreground">{selectedLead.contact_whatsapp}</span>
                              <button 
                                onClick={() => window.open(`https://wa.me/55${selectedLead.contact_whatsapp?.replace(/\D/g, '')}`, '_blank')}
                                className="p-1 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
                                title="Conversar no WhatsApp"
                              >
                                <MessageSquare width="10" height="10" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => window.location.href = `mailto:${selectedLead.email}`}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-muted text-muted-foreground rounded-lg text-[10px] font-black uppercase hover:bg-muted/80 transition-all"
                            title="Enviar E-mail"
                          >
                            <ICONS.Mail width="14" height="14" /> E-mail
                          </button>
                          {selectedLead.contact_instagram && (
                            <a 
                              href={`https://instagram.com/${selectedLead.contact_instagram.replace('@', '')}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-lg hover:bg-pink-100"
                              title="Instagram"
                            >
                              <ICONS.Instagram width="14" height="14" />
                            </a>
                          )}
                          {selectedLead.contact_linkedin && (
                            <a 
                              href={selectedLead.contact_linkedin.startsWith('http') ? selectedLead.contact_linkedin : `https://linkedin.com/in/${selectedLead.contact_linkedin}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
                              title="LinkedIn"
                            >
                              <Linkedin width="14" height="14" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Nome do Contato</label>
                          <input 
                            value={editLead.name || ''} 
                            onChange={e => setEditLead({...editLead, name: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Cargo</label>
                          <input 
                            value={editLead.contact_role || ''} 
                            onChange={e => setEditLead({...editLead, contact_role: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">E-mail</label>
                          <input 
                            type="email"
                            value={editLead.email || ''} 
                            onChange={e => setEditLead({...editLead, email: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Telefone</label>
                          <input 
                            value={editLead.phone || ''} 
                            onChange={e => setEditLead({...editLead, phone: formatPhoneBR(e.target.value)})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">WhatsApp</label>
                          <input 
                            value={editLead.contact_whatsapp || ''} 
                            onChange={e => setEditLead({...editLead, contact_whatsapp: formatPhoneBR(e.target.value)})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Instagram</label>
                          <input 
                            value={editLead.contact_instagram || ''} 
                            onChange={e => setEditLead({...editLead, contact_instagram: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                            placeholder="@perfil"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">LinkedIn</label>
                          <input 
                            value={editLead.contact_linkedin || ''} 
                            onChange={e => setEditLead({...editLead, contact_linkedin: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                            placeholder="linkedin.com/in/..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Empresa" defaultOpen={false}>
                  <div className="space-y-4">
                    {!isEditing ? (
                      <>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nome</p>
                          <p className="text-xs font-bold text-foreground">{selectedLead.company}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">CNPJ</p>
                          <p className="text-xs font-bold text-foreground">{selectedLead.cnpj || '–'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Site</p>
                          <a href={selectedLead.website} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline truncate block">{selectedLead.website || '–'}</a>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Segmento</p>
                          <p className="text-xs font-bold text-foreground">{selectedLead.niche || '–'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cidade/Estado</p>
                          <p className="text-xs font-bold text-foreground">{selectedLead.city ? `${selectedLead.city}${selectedLead.state ? `/${selectedLead.state}` : ''}` : '–'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">E-mail da Empresa</p>
                          <p className="text-xs font-bold text-foreground">{selectedLead.company_email || '–'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Instagram da Empresa</p>
                          {selectedLead.instagram ? (
                            <a href={`https://instagram.com/${selectedLead.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline truncate block">{selectedLead.instagram}</a>
                          ) : (
                            <p className="text-xs font-bold text-foreground">–</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">LinkedIn da Empresa</p>
                          {selectedLead.company_linkedin ? (
                            <a href={selectedLead.company_linkedin} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline truncate block">{selectedLead.company_linkedin}</a>
                          ) : (
                            <p className="text-xs font-bold text-foreground">–</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Telefone da Empresa</p>
                          <p className="text-xs font-bold text-foreground">{selectedLead.company_phone || '–'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">WhatsApp da Empresa</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-foreground">{selectedLead.company_whatsapp || '–'}</p>
                            {selectedLead.company_whatsapp && (
                              <button 
                                onClick={() => window.open(`https://wa.me/55${selectedLead.company_whatsapp?.replace(/\D/g, '')}`, '_blank')}
                                className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
                                title="Conversar no WhatsApp"
                              >
                                <MessageSquare width="12" height="12" />
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Nome da Empresa</label>
                          <input 
                            value={editLead.company || ''} 
                            onChange={e => setEditLead({...editLead, company: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">CNPJ</label>
                          <input 
                            value={editLead.cnpj || ''} 
                            onChange={e => setEditLead({...editLead, cnpj: formatCNPJ(e.target.value)})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Site</label>
                          <input 
                            value={editLead.website || ''} 
                            onChange={e => setEditLead({...editLead, website: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Segmento</label>
                          <input 
                            value={editLead.niche || ''} 
                            onChange={e => setEditLead({...editLead, niche: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Cidade</label>
                            <input 
                              value={editLead.city || ''} 
                              onChange={e => setEditLead({...editLead, city: e.target.value})}
                              className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Estado</label>
                            <input 
                              value={editLead.state || ''} 
                              onChange={e => setEditLead({...editLead, state: e.target.value})}
                              className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                              maxLength={2}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">E-mail da Empresa</label>
                          <input 
                            type="email"
                            value={editLead.company_email || ''} 
                            onChange={e => setEditLead({...editLead, company_email: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Instagram da Empresa</label>
                          <input 
                            value={editLead.instagram || ''} 
                            onChange={e => setEditLead({...editLead, instagram: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                            placeholder="@perfil"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">LinkedIn da Empresa</label>
                          <input 
                            value={editLead.company_linkedin || ''} 
                            onChange={e => setEditLead({...editLead, company_linkedin: e.target.value})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                            placeholder="linkedin.com/company/..."
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Telefone da Empresa</label>
                          <input 
                            value={editLead.company_phone || ''} 
                            onChange={e => setEditLead({...editLead, company_phone: formatPhoneBR(e.target.value)})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">WhatsApp da Empresa</label>
                          <input 
                            value={editLead.company_whatsapp || ''} 
                            onChange={e => setEditLead({...editLead, company_whatsapp: formatPhoneBR(e.target.value)})}
                            className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Responsável" defaultOpen={false}>
                  {!isEditing ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground">
                        {selectedLead.responsible_name?.charAt(0) || 'U'}
                      </div>
                      <p className="text-xs font-bold text-foreground">{selectedLead.responsible_name || 'Não atribuído'}</p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Responsável</label>
                      <select 
                        value={editLead.responsible_id || ''} 
                        onChange={e => {
                          const user = users.find(u => u.id === e.target.value);
                          setEditLead({
                            ...editLead, 
                            responsible_id: e.target.value,
                            responsible_name: user?.name || ''
                          });
                        }}
                        className="w-full p-3 bg-muted rounded-xl border-none text-xs font-bold text-foreground"
                      >
                        <option value="">Selecione...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </CollapsibleSection>
              </div>

              {/* Área Central com Abas */}
              <div className="flex-1 flex flex-col bg-background overflow-hidden">
                {/* Tab Header */}
                <div className="flex px-10 bg-card border-b border-border shrink-0">
                  {[
                    { id: 'history', label: 'Histórico', icon: ICONS.Clock },
                    { id: 'tasks', label: 'Tarefas', icon: List },
                    { id: 'questionnaires', label: 'Questionários', icon: FileText },
                    { id: 'products', label: 'Produtos', icon: Package }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab360(tab.id as any)}
                      className={`flex items-center gap-2 px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                        activeTab360 === tab.id 
                          ? 'border-primary text-primary' 
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <tab.icon width="14" height="14" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-10 scrollbar-none">
                  {activeTab360 === 'history' && (
                    <div className="space-y-8">
                      {/* Registrar Interação Form */}
                      <div className="p-8 bg-card rounded-3xl border border-border shadow-sm">
                        <h5 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                          <ICONS.Plus className="w-3 h-3 text-primary" /> Registrar Interação
                        </h5>
                        
                        <div className="space-y-6">
                          <textarea
                            value={interactionNote}
                            onChange={(e) => setInteractionNote(e.target.value)}
                            placeholder="O que foi conversado com o lead?"
                            className="w-full p-5 bg-muted/50 border-0 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all min-h-[120px] resize-none text-foreground"
                          />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Canal</label>
                              <div className="flex flex-wrap gap-2">
                                {['WhatsApp', 'Ligação', 'E-mail', 'Reunião', 'Outro'].map((type) => (
                                  <button
                                    key={type}
                                    onClick={() => setInteractionType(type as any)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                      interactionType === type 
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Sucesso</label>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setInteractionSuccess(true)}
                                  className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    interactionSuccess === true 
                                      ? 'bg-primary text-primary-foreground shadow-none' 
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  }`}
                                >
                                  Consegui falar ✅
                                </button>
                                <button
                                  onClick={() => setInteractionSuccess(false)}
                                  className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    interactionSuccess === false 
                                      ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20' 
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  }`}
                                >
                                  Não atendeu ❌
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={handleRegisterInteraction}
                            disabled={isRegisteringInteraction || !interactionNote.trim()}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                          >
                            {isRegisteringInteraction ? (
                              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                              <>REGISTRAR INTERAÇÃO</>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* AI Summary */}
                      <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                            <ICONS.Automation width="14" height="14" /> Resumo IA
                          </h5>
                          <button 
                            onClick={() => handleAISummary(interactions)}
                            disabled={isSummarizing}
                            className="text-[10px] font-black text-primary hover:underline disabled:opacity-50"
                          >
                            {isSummarizing ? 'Gerando...' : 'Atualizar'}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed italic">
                          {aiSummary || "Gere um resumo das interações para uma visão rápida do negócio."}
                        </p>
                      </div>

                      {/* Interactions Timeline */}
                      <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                        {interactions.length === 0 ? (
                          <div className="flex gap-6 relative">
                            <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center z-10 shadow-sm border border-border">
                              <ICONS.Clock className="w-5 h-5 text-muted-foreground/50" />
                            </div>
                            <div className="flex-1 bg-card p-6 rounded-2xl border border-border shadow-sm">
                              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Nenhuma interação registrada ainda.</p>
                            </div>
                          </div>
                        ) : (
                          interactions.map((interaction) => (
                            <div key={interaction.id} className="flex gap-6 relative">
                              <div className={`w-12 h-12 rounded-2xl bg-card flex items-center justify-center z-10 shadow-sm border border-border ${!interaction.success ? 'opacity-60' : ''}`}>
                                {interaction.type === 'E-mail' ? <ICONS.Mail width="18" height="18" className="text-primary" /> :
                                 interaction.type === 'Ligação' ? <ICONS.Phone width="18" height="18" className="text-primary" /> :
                                 interaction.type === 'Reunião' ? <Users width="18" height="18" className="text-amber-500" /> :
                                 <MessageSquare width="18" height="18" className="text-muted-foreground" />}
                              </div>
                              <div className={`flex-1 bg-card p-6 rounded-2xl border border-border shadow-sm ${!interaction.success ? 'border-destructive/20' : ''}`}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                    <h5 className="text-sm font-black text-foreground uppercase tracking-tight">
                                      {interaction.type}
                                    </h5>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                      interaction.success 
                                        ? 'bg-emerald-500/10 text-emerald-600' 
                                        : 'bg-destructive/10 text-destructive'
                                    }`}>
                                      {interaction.success ? 'Sucesso' : 'Sem Resposta'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase">
                                    {new Date(interaction.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed whitespace-pre-wrap">
                                  {interaction.note}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab360 === 'tasks' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Tarefas do Lead</h4>
                        <button 
                          onClick={() => setIsNewTaskModalOpen(true)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all"
                        >
                          + Nova Tarefa
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {tasks.filter(t => t.lead_id === selectedLead.id).length === 0 ? (
                          <div className="p-10 text-center bg-card rounded-2xl border border-dashed border-border">
                            <List className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-sm font-bold text-muted-foreground">Nenhuma tarefa vinculada a este lead.</p>
                          </div>
                        ) : (
                          tasks.filter(t => t.lead_id === selectedLead.id).map(task => (
                            <div key={task.id} className="p-6 bg-card rounded-2xl border border-border shadow-sm flex items-center gap-4 group hover:border-primary/50 transition-all">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                task.status === TaskStatus.DONE ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'
                              }`}>
                                {task.type === 'call' ? <ICONS.Phone width="18" height="18" /> :
                                 task.type === 'meeting' ? <ICONS.Calendar width="18" height="18" /> :
                                 <List width="18" height="18" />}
                              </div>
                              <div className="flex-1">
                                <h5 className="text-sm font-black text-foreground uppercase tracking-tight">{task.title}</h5>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                                  {new Date(task.due_date).toLocaleString()} • {task.priority}
                                </p>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                task.status === TaskStatus.DONE ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'
                              }`}>
                                {task.status}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab360 === 'questionnaires' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Questionários de Qualificação</h4>
                        <button 
                          onClick={() => {
                            if (formTemplates.length > 0) {
                              setSelectedTemplate(formTemplates[0]);
                              setIsExecutingForm(true);
                              setCurrentQuestionIndex(0);
                              setFormAnswers({});
                            } else {
                              alert("Nenhum modelo de formulário encontrado. Crie um na aba 'Sondagem & Reunião'.");
                            }
                          }}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all"
                        >
                          + Novo Questionário
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {formResponses.length === 0 ? (
                          <div className="p-10 text-center bg-card rounded-2xl border border-dashed border-border">
                            <ICONS.Form className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-sm font-bold text-muted-foreground">Nenhum questionário respondido para este lead.</p>
                          </div>
                        ) : (
                          formResponses.map(response => {
                            const template = formTemplates.find(t => t.id === response.form_id);
                            return (
                              <div key={response.id} className="p-6 bg-card rounded-2xl border border-border shadow-sm flex items-center gap-4 group hover:border-primary/50 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                  <ICONS.Form width="18" height="18" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="text-sm font-black text-foreground uppercase tracking-tight">
                                    {template?.title || 'Formulário Removido'}
                                  </h5>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                                    Respondido em {new Date(response.created_at).toLocaleString()} • {response.answers.length} respostas
                                  </p>
                                </div>
                                <button className="p-2 text-muted-foreground/50 hover:text-primary transition-colors">
                                  <ICONS.Eye width="20" height="20" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab360 === 'products' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Produtos e Serviços</h4>
                        <button 
                          onClick={() => setIsLinkingProduct(true)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all"
                        >
                          + Vincular Produto
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {mockLeadProducts.length === 0 ? (
                          <div className="p-10 text-center bg-card rounded-2xl border border-dashed border-border">
                            <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-sm font-bold text-muted-foreground">Nenhum produto vinculado a este lead.</p>
                          </div>
                        ) : (
                          mockLeadProducts.map(product => (
                            <div key={product.id} className="p-6 bg-card rounded-2xl border border-border shadow-sm flex items-center gap-4 group hover:border-primary/50 transition-all">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Package width="18" height="18" />
                              </div>
                              <div className="flex-1">
                                <h5 className="text-sm font-black text-foreground uppercase tracking-tight">{product.name}</h5>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{product.type} • {product.price}</p>
                              </div>
                              <button 
                                onClick={() => setMockLeadProducts(mockLeadProducts.filter(p => p.id !== product.id))}
                                className="p-2 text-muted-foreground/50 hover:text-destructive transition-colors"
                              >
                                <ICONS.Trash width="18" height="18" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-10 bg-card border-t border-border flex gap-4 shrink-0">
              {!isEditing ? (
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="flex-1 py-5 bg-muted text-muted-foreground rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-muted/80"
                >
                  FECHAR
                </button>
              ) : (
                <>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditLead(selectedLead);
                    }}
                    className="flex-1 py-5 bg-muted text-muted-foreground rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-muted/80"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={handleUpdateLead}
                    disabled={isSyncing}
                    className="flex-1 py-5 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {isSyncing ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isWonModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-card rounded-[2.5rem] w-full max-w-md max-h-[90vh] flex flex-col shadow-lg animate-in zoom-in-95 duration-300 border border-border">
            <div className="p-10 pb-0 shrink-0 flex justify-between items-center gap-4">
              <h3 className="text-xl font-black text-foreground uppercase truncate min-w-0">Configurar Nova Conta</h3>
              <button onClick={() => setIsWonModalOpen(false)} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all shrink-0">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-none">
              {showWonSuccess ? (
                <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <h4 className="text-xl font-black text-foreground mb-2 uppercase">Venda Confirmada!</h4>
                  <p className="text-sm text-muted-foreground font-bold">Parabéns pela venda! O lead agora é um cliente.</p>
                  <p className="text-[10px] text-muted-foreground/70 font-black uppercase mt-4 tracking-widest">A conta ativa e o onboarding foram criados.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Data de Início</label>
                    <input 
                      type="date" 
                      value={wonData.start_date}
                      onChange={e => setWonData({...wonData, start_date: e.target.value})}
                      className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Valor Mensal (Fee)</label>
                    <input 
                      type="number" 
                      placeholder="0,00"
                      value={wonData.monthly_value === 0 ? '' : wonData.monthly_value}
                      onChange={e => setWonData({...wonData, monthly_value: parseFloat(e.target.value) || 0})}
                      className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Tipo de Serviço</label>
                    <select 
                      value={wonData.service_type}
                      onChange={e => {
                        const selectedService = services.find(s => s.name === e.target.value);
                        setWonData({
                          ...wonData, 
                          service_type: e.target.value,
                          monthly_value: selectedService ? selectedService.default_price : wonData.monthly_value
                        });
                      }}
                      className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground appearance-none"
                    >
                      <option value="">Selecione um serviço...</option>
                      {services.map(service => (
                        <option key={service.id} value={service.name}>{service.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Conta Bancária (Destino)</label>
                    <select 
                      value={wonData.bank_account_id}
                      onChange={e => setWonData({...wonData, bank_account_id: e.target.value})}
                      className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground appearance-none"
                    >
                      <option value="">Selecione uma conta...</option>
                      {bankAccounts.map(account => (
                        <option key={account.id} value={account.id}>{account.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            {!showWonSuccess && (
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button onClick={() => setIsWonModalOpen(false)} className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-xs hover:bg-muted/80 transition-all">Cancelar</button>
                <button 
                  onClick={handleWonConfirm}
                  disabled={isSyncing}
                  className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs disabled:opacity-50 hover:opacity-90 transition-all"
                >
                  {isSyncing ? "PROCESSANDO..." : "CONFIRMAR FECHAMENTO"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isLostModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-card rounded-[2.5rem] w-full max-w-md max-h-[90vh] flex flex-col shadow-lg animate-in zoom-in-95 duration-300 border border-border">
            <div className="p-10 pb-0 shrink-0 flex justify-between items-center gap-4">
              <h3 className="text-xl font-black text-foreground uppercase truncate min-w-0">Marcar Perda</h3>
              <button onClick={() => setIsLostModalOpen(false)} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all shrink-0">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-none">
              {showLostSuccess ? (
                <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                  </div>
                  <h4 className="text-xl font-black text-foreground mb-2 uppercase">Lead Perdido</h4>
                  <p className="text-sm text-muted-foreground font-bold">O status do lead foi atualizado para perdido.</p>
                  <p className="text-[10px] text-muted-foreground/70 font-black uppercase mt-4 tracking-widest">Uma tarefa de follow-up foi agendada para o futuro.</p>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Motivo da Perda</label>
                  <textarea 
                    placeholder="Descreva o motivo pelo qual o negócio foi perdido..."
                    value={lostData.reason}
                    onChange={e => setLostData({...lostData, reason: e.target.value})}
                    className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground min-h-[120px] resize-none"
                  />
                </div>
              )}
            </div>
            {!showLostSuccess && (
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button onClick={() => setIsLostModalOpen(false)} className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-xs hover:bg-muted/80 transition-all">Cancelar</button>
                <button 
                  onClick={handleLostConfirm}
                  disabled={isSyncing}
                  className="flex-1 py-4 bg-destructive text-destructive-foreground rounded-2xl font-black uppercase text-xs disabled:opacity-50 hover:bg-destructive/90 transition-all"
                >
                  {isSyncing ? "PROCESSANDO..." : "CONFIRMAR PERDA"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isNewTaskModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-card rounded-[2.5rem] w-full max-w-md max-h-[90vh] flex flex-col shadow-lg animate-in zoom-in-95 duration-300 border border-border">
            <div className="p-10 pb-0 shrink-0">
              <h3 className="text-xl font-black text-foreground mb-6 uppercase">Nova Tarefa</h3>
            </div>
            <form onSubmit={handleCreateTask} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-none">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Título</label>
                  <input 
                    required
                    placeholder="Ex: Enviar proposta comercial"
                    value={newTaskData.title}
                    onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                    className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Data/Hora</label>
                    <input 
                      type="datetime-local"
                      required
                      value={newTaskData.due_date}
                      onChange={e => setNewTaskData({...newTaskData, due_date: e.target.value})}
                      className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Prioridade</label>
                    <select 
                      value={newTaskData.priority}
                      onChange={e => setNewTaskData({...newTaskData, priority: e.target.value as any})}
                      className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground"
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Tipo</label>
                  <select 
                    value={newTaskData.type}
                    onChange={e => setNewTaskData({...newTaskData, type: e.target.value as any})}
                    className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground"
                  >
                    <option value="task">Tarefa</option>
                    <option value="call">Ligação</option>
                    <option value="meeting">Reunião</option>
                    <option value="email">E-mail</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Descrição</label>
                  <textarea 
                    placeholder="Detalhes da tarefa..."
                    value={newTaskData.description}
                    onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
                    className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground min-h-[100px] resize-none"
                  />
                </div>
              </div>
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-xs hover:bg-muted/80 transition-all">Cancelar</button>
                <button 
                  type="submit"
                  disabled={isSyncing}
                  className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs disabled:opacity-50 hover:bg-primary/90 transition-all"
                >
                  {isSyncing ? "CRIANDO..." : "CRIAR TAREFA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-card rounded-[2.5rem] w-full max-w-xl max-h-[90vh] flex flex-col shadow-lg animate-in zoom-in-95 duration-300 border border-border">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-foreground uppercase">Nova Empresa</h3>
              <button onClick={() => setIsCompanyModalOpen(false)} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateCompany} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome da Empresa</label>
                  <input required value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: M4 Marketing" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">CNPJ</label>
                    <input value={newCompany.cnpj} onChange={e => setNewCompany({...newCompany, cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Segmento</label>
                    <input value={newCompany.segment} onChange={e => setNewCompany({...newCompany, segment: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: Tecnologia" />
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-muted/50 rounded-3xl border border-border">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Contato Principal (Opcional)</p>
                    <button 
                      type="button"
                      onClick={() => setContactMode(contactMode === 'select' ? 'create' : 'select')}
                      className="text-[10px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest flex items-center gap-2 transition-colors"
                    >
                      {contactMode === 'select' ? '+ Novo Contato' : 'Selecionar Existente'}
                    </button>
                  </div>

                  {contactMode === 'select' ? (
                    <div className="relative">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Buscar Contato</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            value={contactSearch} 
                            onChange={e => {
                              setContactSearch(e.target.value);
                              setShowContactDropdown(true);
                            }} 
                            onFocus={() => setShowContactDropdown(true)}
                            className="w-full p-4 bg-card rounded-2xl border border-border font-bold text-foreground placeholder:text-muted-foreground/50" 
                            placeholder="Digite nome, e-mail ou telefone..." 
                          />
                          {showContactDropdown && contactSearch && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-2xl shadow-2xl border border-border z-[110] max-h-60 overflow-y-auto scrollbar-none">
                              {contacts.filter(c => 
                                c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                c.phone?.includes(contactSearch)
                              ).length > 0 ? (
                                contacts.filter(c => 
                                  c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                  c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                  c.phone?.includes(contactSearch)
                                ).map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedContactId(c.id);
                                      setContactSearch(c.name);
                                      setShowContactDropdown(false);
                                    }}
                                    className="w-full p-4 text-left hover:bg-muted flex items-center justify-between group"
                                  >
                                    <div>
                                      <p className="font-bold text-foreground">{c.name}</p>
                                      <p className="text-[10px] text-muted-foreground">{c.email} • {c.phone}</p>
                                    </div>
                                    {selectedContactId === c.id && <ICONS.Check className="text-primary" width="16" height="16" />}
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center text-muted-foreground text-xs font-bold">Nenhum contato encontrado</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-muted/30 p-6 rounded-2xl border border-border">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome</label>
                          <input value={primaryContact.name} onChange={e => setPrimaryContact({...primaryContact, name: e.target.value})} className="w-full p-3 bg-card rounded-xl border border-border text-sm font-bold text-foreground placeholder:text-muted-foreground/50" placeholder="Nome do contato" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cargo</label>
                          <input value={primaryContact.role} onChange={e => setPrimaryContact({...primaryContact, role: e.target.value})} className="w-full p-3 bg-card rounded-xl border border-border text-sm font-bold text-foreground placeholder:text-muted-foreground/50" placeholder="Ex: CEO" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail</label>
                          <input type="email" value={primaryContact.email} onChange={e => setPrimaryContact({...primaryContact, email: e.target.value})} className="w-full p-3 bg-card rounded-xl border border-border text-sm font-bold text-foreground placeholder:text-muted-foreground/50" placeholder="email@contato.com" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone</label>
                          <input value={primaryContact.phone} onChange={e => setPrimaryContact({...primaryContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-3 bg-card rounded-xl border border-border text-sm font-bold text-foreground placeholder:text-muted-foreground/50" placeholder="(00) 00000-0000" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">WhatsApp</label>
                          <input value={primaryContact.whatsapp} onChange={e => setPrimaryContact({...primaryContact, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-3 bg-card rounded-xl border border-border text-sm font-bold text-foreground placeholder:text-muted-foreground/50" placeholder="(00) 00000-0000" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Instagram</label>
                          <input value={primaryContact.instagram} onChange={e => setPrimaryContact({...primaryContact, instagram: e.target.value})} className="w-full p-3 bg-card rounded-xl border border-border text-sm font-bold text-foreground placeholder:text-muted-foreground/50" placeholder="@perfil" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">LinkedIn</label>
                          <input value={primaryContact.linkedin} onChange={e => setPrimaryContact({...primaryContact, linkedin: e.target.value})} className="w-full p-3 bg-card rounded-xl border border-border text-sm font-bold text-foreground placeholder:text-muted-foreground/50" placeholder="linkedin.com/in/..." />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-xs hover:bg-muted/80 transition-all">Cancelar</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs disabled:opacity-50 hover:bg-primary/90 transition-all">
                  {isSyncing ? "SALVANDO..." : "SALVAR EMPRESA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isContactModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-card rounded-[2.5rem] w-full max-w-xl max-h-[90vh] flex flex-col shadow-lg animate-in zoom-in-95 duration-300 border border-border">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-foreground uppercase">Novo Contato</h3>
              <button onClick={() => setIsContactModalOpen(false)} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome Completo</label>
                    <input required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: João Silva" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cargo</label>
                    <input value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: CEO" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail</label>
                    <input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="joao@empresa.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone</label>
                    <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">WhatsApp</label>
                    <input value={newContact.whatsapp} onChange={e => setNewContact({...newContact, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Instagram</label>
                    <input value={newContact.instagram} onChange={e => setNewContact({...newContact, instagram: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="@perfil" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">LinkedIn</label>
                    <input value={newContact.linkedin} onChange={e => setNewContact({...newContact, linkedin: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="linkedin.com/in/..." />
                  </div>
                </div>
              </div>
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsContactModalOpen(false)} className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-xs hover:bg-muted/80 transition-all">Cancelar</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs disabled:opacity-50 hover:bg-primary/90 transition-all">
                  {isSyncing ? "SALVANDO..." : "SALVAR CONTATO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStageConfigModalOpen && editingPipeline && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <div className="bg-card rounded-[2.5rem] w-full max-w-2xl shadow-lg border border-border overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-border flex justify-between items-center">
              <h3 className="text-xl font-black text-foreground uppercase tracking-widest">
                CONFIGURAR FUNIL
              </h3>
              <button onClick={() => setIsStageConfigModalOpen(false)} className="text-muted-foreground hover:text-destructive transition-colors">
                <ICONS.X size={24} />
              </button>
            </div>
            <form onSubmit={handleSavePipeline} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-none">
              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Nome do Funil</label>
                <input 
                  type="text" 
                  required
                  value={editingPipeline.name || ''}
                  onChange={e => setEditingPipeline({ ...editingPipeline, name: e.target.value })}
                  className="w-full p-4 bg-muted rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  placeholder="Ex: Funil de Vendas Principal"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Etapas do Funil</label>
                  <button 
                    type="button"
                    onClick={() => {
                      const newStage = { id: Math.random().toString(), name: '', status: FunnelStatus.INTERMEDIATE };
                      setEditingPipeline({
                        ...editingPipeline,
                        stages: [...(editingPipeline.stages || []), newStage]
                      });
                    }}
                    className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:text-primary/80 transition-colors"
                  >
                    <ICONS.Plus size={14} /> ADICIONAR ETAPA
                  </button>
                </div>

                <div className="space-y-3">
                  {editingPipeline.stages?.map((stage, idx) => (
                    <div key={stage.id} className="flex gap-3 items-start p-4 bg-muted rounded-2xl border border-border">
                      <div className="w-8 h-8 flex items-center justify-center bg-card rounded-xl text-xs font-black text-muted-foreground border border-border mt-2">
                        {idx + 1}
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        <button 
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const newStages = [...(editingPipeline.stages || [])];
                            [newStages[idx - 1], newStages[idx]] = [newStages[idx], newStages[idx - 1]];
                            setEditingPipeline({ ...editingPipeline, stages: newStages });
                          }}
                          className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
                        >
                          <ICONS.ChevronDown className="rotate-180" size={14} />
                        </button>
                        <button 
                          type="button"
                          disabled={idx === (editingPipeline.stages?.length || 0) - 1}
                          onClick={() => {
                            const newStages = [...(editingPipeline.stages || [])];
                            [newStages[idx + 1], newStages[idx]] = [newStages[idx], newStages[idx + 1]];
                            setEditingPipeline({ ...editingPipeline, stages: newStages });
                          }}
                          className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
                        >
                          <ICONS.ChevronDown size={14} />
                        </button>
                      </div>
                      <div className="flex-1 space-y-3">
                        <input 
                          type="text" 
                          required
                          value={stage.name}
                          onChange={e => {
                            const newStages = [...(editingPipeline.stages || [])];
                            newStages[idx] = { ...stage, name: e.target.value };
                            setEditingPipeline({ ...editingPipeline, stages: newStages });
                          }}
                          className="w-full p-3 bg-card rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-primary/20 text-foreground text-sm"
                          placeholder="Nome da etapa"
                        />
                        <div className="flex gap-2">
                          {Object.values(FunnelStatus).map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => {
                                const newStages = [...(editingPipeline.stages || [])];
                                newStages[idx] = { ...stage, status };
                                setEditingPipeline({ ...editingPipeline, stages: newStages });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                stage.status === status 
                                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10' 
                                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const newStages = editingPipeline.stages?.filter((_, i) => i !== idx);
                          setEditingPipeline({ ...editingPipeline, stages: newStages });
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all mt-2"
                      >
                        <ICONS.Trash size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsStageConfigModalOpen(false)}
                  className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted/80 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-card rounded-[2.5rem] w-full max-w-md p-10 text-center shadow-lg animate-in zoom-in-95 duration-300 border border-border">
            <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
              <ICONS.Trash width="32" height="32" />
            </div>
            <h3 className="text-2xl font-black text-foreground uppercase mb-2">Excluir Lead?</h3>
            <p className="text-sm text-muted-foreground font-bold mb-8">Esta ação é irreversível e removerá todos os dados vinculados a este lead.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsDeleting(false)}
                className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-muted/80 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (selectedLead) handleDeleteLead(selectedLead.id);
                  setIsDeleting(false);
                  setSelectedLead(null);
                }}
                className="flex-1 py-4 bg-destructive text-destructive-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-destructive/90 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {isExecutingForm && selectedTemplate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-[2.5rem] shadow-lg border border-border overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{selectedTemplate.title}</h3>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Sondagem em tempo real</p>
              </div>
              <button onClick={() => setIsExecutingForm(false)} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all">
                <ICONS.X width="20" height="20" />
              </button>
            </div>

            <div className="p-10">
              <div className="mb-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                    Pergunta {currentQuestionIndex + 1} de {selectedTemplate.questions.length}
                  </span>
                  <div className="flex gap-1">
                    {selectedTemplate.questions.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentQuestionIndex ? 'bg-primary' : 'bg-muted'}`}></div>
                    ))}
                  </div>
                </div>
                
                <h4 className="text-lg font-black text-foreground mb-6">
                  {selectedTemplate.questions[currentQuestionIndex].type === 'script' ? 'Roteiro de Abordagem' : selectedTemplate.questions[currentQuestionIndex].label}
                  {selectedTemplate.questions[currentQuestionIndex].required && <span className="text-destructive ml-1">*</span>}
                </h4>

                <div className="animate-in slide-in-from-right-4 duration-300">
                  {selectedTemplate.questions[currentQuestionIndex].type === 'script' && (
                    <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl">
                      <p className="text-muted-foreground text-base font-medium leading-relaxed whitespace-pre-wrap italic">
                        "{selectedTemplate.questions[currentQuestionIndex].label}"
                      </p>
                    </div>
                  )}

                  {selectedTemplate.questions[currentQuestionIndex].type === 'text' && (
                    <input 
                      type="text"
                      value={formAnswers[selectedTemplate.questions[currentQuestionIndex].id] || ''}
                      onChange={(e) => handleFormAnswer(selectedTemplate.questions[currentQuestionIndex].id, e.target.value)}
                      className="w-full p-4 bg-muted border border-border rounded-xl font-bold text-base outline-none focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all text-foreground"
                      placeholder="Digite a resposta..."
                    />
                  )}

                  {selectedTemplate.questions[currentQuestionIndex].type === 'long_text' && (
                    <textarea 
                      value={formAnswers[selectedTemplate.questions[currentQuestionIndex].id] || ''}
                      onChange={(e) => handleFormAnswer(selectedTemplate.questions[currentQuestionIndex].id, e.target.value)}
                      className="w-full p-4 bg-muted border border-border rounded-xl font-bold text-base outline-none focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all min-h-[120px] text-foreground"
                      placeholder="Digite a resposta detalhada..."
                    />
                  )}

                  {selectedTemplate.questions[currentQuestionIndex].type === 'multiple_choice' && (
                    <div className="grid grid-cols-1 gap-3">
                      {selectedTemplate.questions[currentQuestionIndex].options?.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleFormAnswer(selectedTemplate.questions[currentQuestionIndex].id, opt)}
                          className={`w-full p-4 text-left rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-between ${
                            formAnswers[selectedTemplate.questions[currentQuestionIndex].id] === opt 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-muted bg-muted text-muted-foreground hover:border-border'
                          }`}
                        >
                          {opt}
                          {formAnswers[selectedTemplate.questions[currentQuestionIndex].id] === opt && <div className="w-3 h-3 bg-primary rounded-full border-2 border-background"></div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                {currentQuestionIndex > 0 && (
                  <button 
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                    className="px-6 py-4 bg-muted text-muted-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted/80 transition-all"
                  >
                    Anterior
                  </button>
                )}
                <button 
                  onClick={nextQuestion}
                  disabled={selectedTemplate.questions[currentQuestionIndex].required && !formAnswers[selectedTemplate.questions[currentQuestionIndex].id]}
                  className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {currentQuestionIndex === selectedTemplate.questions.length - 1 ? (isSavingForm ? 'Salvando...' : 'Finalizar') : 'Próxima'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLinkingProduct && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] shadow-lg border border-border overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Vincular Produto</h3>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Selecione um item do catálogo</p>
              </div>
              <button onClick={() => setIsLinkingProduct(false)} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all">
                <ICONS.X width="20" height="20" />
              </button>
            </div>

            <div className="p-8 space-y-3">
              {[
                { id: '3', name: 'Consultoria Estratégica', type: 'Projeto', price: 'R$ 5.000,00' },
                { id: '4', name: 'Social Media', type: 'Recorrente', price: 'R$ 1.800,00/mês' },
                { id: '5', name: 'Landing Page High-End', type: 'Projeto', price: 'R$ 3.200,00' }
              ].map(product => (
                <button
                  key={product.id}
                  onClick={() => {
                    setMockLeadProducts([...mockLeadProducts, product]);
                    setIsLinkingProduct(false);
                  }}
                  className="w-full p-4 text-left bg-muted rounded-2xl border border-transparent hover:border-primary transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <Package width="18" height="18" />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-foreground uppercase tracking-tight">{product.name}</h5>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{product.type} • {product.price}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesCRM;
