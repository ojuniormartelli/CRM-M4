
import React, { useState, useEffect } from 'react';
import { Pipeline, PipelineStage, Lead, Interaction, Company, Contact, User, LeadTemperature, Task, FormTemplate, FormResponse, Priority, TaskStatus, Service } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { formatPhoneBR, formatCNPJ } from '../utils/formatters';
import { GoogleGenAI } from "@google/genai";
import { aiService } from '../services/aiService';
import { Trash2, X, Edit, Plus, Clock, ArrowRight, ChevronDown, MessageSquare, Calendar, List, FileText, Package, CheckCircle2, AlertCircle, Sparkles, Brain, Linkedin, Instagram } from 'lucide-react';

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
  isModalOpen?: boolean;
  setIsModalOpen?: (isOpen: boolean) => void;
  renderOnlyModal?: boolean;
}

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-6 px-10 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
      >
        <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-[0.2em]">{title}</h4>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ICONS.ChevronDown width="16" height="16" className="text-slate-400 dark:text-slate-500" />
        </div>
      </button>
      {isOpen && <div className="px-10 pb-10 animate-in fade-in slide-in-from-top-2 duration-300">{children}</div>}
    </div>
  );
};

const PipelineProgress = ({ stages, currentStageId }: { stages: PipelineStage[], currentStageId: string }) => {
  const currentIndex = stages.findIndex(s => s.id === currentStageId);
  return (
    <div className="flex items-center w-full px-10 py-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none gap-4">
      {stages.map((stage, index) => (
        <React.Fragment key={stage.id}>
          <div className="flex flex-col items-center min-w-[140px] relative group">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black z-10 transition-all duration-500 border-4 ${
              index <= currentIndex 
                ? 'bg-blue-600 text-white border-blue-100 dark:border-blue-900/50 shadow-lg shadow-blue-100 dark:shadow-none' 
                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'
            }`}>
              {index < currentIndex ? <ICONS.Check width="16" height="16" /> : index + 1}
            </div>
            <span className={`mt-3 text-[10px] font-black uppercase tracking-[0.15em] text-center transition-colors duration-500 ${
              index <= currentIndex ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
            }`}>
              {stage.name}
            </span>
            {index === currentIndex && (
              <div className="absolute -top-1 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
            )}
          </div>
          {index < stages.length - 1 && (
            <div className={`flex-1 h-[3px] min-w-[40px] -mt-8 rounded-full transition-colors duration-1000 ${
              index < currentIndex ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'
            }`} />
          )}
        </React.Fragment>
      ))}
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
  isModalOpen: externalIsModalOpen,
  setIsModalOpen: setExternalIsModalOpen,
  renderOnlyModal = false
}) => {
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
    name: '', company: '', company_email: '', company_phone: '', value: 0, notes: '',
    niche: '', service_type: '', proposed_ticket: 0,
    cnpj: '', company_whatsapp: '', company_linkedin: '', instagram: '', 
    responsible_name: '', contact_role: '', email: '', phone: '', contact_whatsapp: '', contact_instagram: '', contact_linkedin: '', contact_notes: '',
    city: '', state: '', website: '',
    pipeline_id: activePipelineId,
    stage: '',
    closing_forecast: '',
    responsible_id: currentUser?.id || ''
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
        name: editLead.name || editLead.company || selectedLead.name
      })
      .eq('id', selectedLead.id);

    if (error) {
      alert("Erro ao atualizar lead: " + error.message);
    } else {
      const updatedLead = { ...selectedLead, ...editLead };
      setLeads(leads.map(l => l.id === selectedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
      setIsEditing(false);
    }
    setIsSyncing(false);
  };

  const [isStageConfigModalOpen, setIsStageConfigModalOpen] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageData, setNewStageData] = useState({ name: '', color: 'blue' });
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);

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

  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];

  if (!activePipeline) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <ICONS.Settings width="32" height="32" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Nenhum Funil Encontrado</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Não foi possível carregar os funis de vendas. Verifique sua conexão ou as configurações do banco de dados.</p>
        </div>
      </div>
    );
  }

  const handleCreateStage = async () => {
    if (!newStageData.name) return;
    setIsSyncing(true);
    try {
      const nextPosition = activePipeline.stages.length;
      const { data, error } = await supabase
        .from('m4_pipeline_stages')
        .insert([{
          pipeline_id: activePipelineId,
          name: newStageData.name,
          color: newStageData.color,
          position: nextPosition
        }])
        .select()
        .single();

      if (error) throw error;

      const updatedPipelines = pipelines.map(p => {
        if (p.id === activePipelineId) {
          return { ...p, stages: [...p.stages, data] };
        }
        return p;
      });
      setPipelines(updatedPipelines);
      setIsAddingStage(false);
      setNewStageData({ name: '', color: 'blue' });
    } catch (err) {
      console.error("Erro ao criar etapa:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateStage = async (stageId: string, updates: Partial<PipelineStage>) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('m4_pipeline_stages')
        .update(updates)
        .eq('id', stageId);

      if (error) throw error;

      const updatedPipelines = pipelines.map(p => {
        if (p.id === activePipelineId) {
          return {
            ...p,
            stages: p.stages.map(s => s.id === stageId ? { ...s, ...updates } : s)
          };
        }
        return p;
      });
      setPipelines(updatedPipelines);
      setEditingStageId(null);
    } catch (err) {
      console.error("Erro ao atualizar etapa:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('m4_pipeline_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      // Update leads in this stage to have no stage
      await supabase
        .from('m4_leads')
        .update({ stage: null })
        .eq('stage', stageId);

      const updatedPipelines = pipelines.map(p => {
        if (p.id === activePipelineId) {
          return {
            ...p,
            stages: p.stages.filter(s => s.id !== stageId)
          };
        }
        return p;
      });
      setPipelines(updatedPipelines);
      setDeletingStageId(null);
      
      // Refresh leads
      const { data: leadsData } = await supabase.from('m4_leads').select('*');
      if (leadsData) setLeads(leadsData);
    } catch (err) {
      console.error("Erro ao excluir etapa:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
    const currentIndex = activePipeline.stages.findIndex(s => s.id === stageId);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === activePipeline.stages.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const stages = [...activePipeline.stages];
    const [movedStage] = stages.splice(currentIndex, 1);
    stages.splice(newIndex, 0, movedStage);

    // Update positions locally
    const updatedStages = stages.map((s, i) => ({ ...s, position: i }));

    setIsSyncing(true);
    try {
      // Update all positions in Supabase
      const updates = updatedStages.map(s => 
        supabase.from('m4_pipeline_stages').update({ position: s.position }).eq('id', s.id)
      );
      await Promise.all(updates);

      const updatedPipelines = pipelines.map(p => {
        if (p.id === activePipelineId) {
          return { ...p, stages: updatedStages };
        }
        return p;
      });
      setPipelines(updatedPipelines);
    } catch (err) {
      console.error("Erro ao reordenar etapas:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    
    const selectedPipeline = pipelines.find(p => p.id === (newLead.pipeline_id || activePipelineId));
    const leadData = {
      ...newLead,
      // Ensure mandatory fields are set for legacy compatibility
      company: newLead.company || 'Novo Negócio',
      name: newLead.name || newLead.responsible_name || 'Novo Negócio',
      email: newLead.email,
      phone: newLead.phone,
      niche: newLead.niche,
      
      pipeline_id: newLead.pipeline_id || activePipelineId,
      stage: newLead.stage || selectedPipeline?.stages[0].id,
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
        stage: '',
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
      // Otimista: atualiza UI primeiro
      const originalLeads = [...leads];
      setLeads(leads.map(l => l.id === leadId ? { ...l, stage: targetStageId } : l));
      
      const { error } = await supabase
        .from('m4_leads')
        .update({ stage: targetStageId })
        .eq('id', leadId);

      if (error) {
        setLeads(originalLeads); // Reverte se falhar
        alert("Erro ao atualizar estágio: " + error.message);
      }
    }
    setDraggedLeadId(null);
  };

  const handleMoveLeadStage = async (lead: Lead, direction: 'next' | 'prev') => {
    const currentStageIndex = activePipeline.stages.findIndex(s => s.id === lead.stage);
    if (direction === 'next' && currentStageIndex < activePipeline.stages.length - 1) {
      const nextStageId = activePipeline.stages[currentStageIndex + 1].id;
      setLeads(leads.map(l => l.id === lead.id ? { ...l, stage: nextStageId } : l));
      await supabase.from('m4_leads').update({ stage: nextStageId }).eq('id', lead.id);
    } else if (direction === 'prev' && currentStageIndex > 0) {
      const prevStageId = activePipeline.stages[currentStageIndex - 1].id;
      setLeads(leads.map(l => l.id === lead.id ? { ...l, stage: prevStageId } : l));
      await supabase.from('m4_leads').update({ stage: prevStageId }).eq('id', lead.id);
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
      const matchesPipeline = l.pipeline_id === activePipelineId;
      const matchesStage = l.stage === stageId || (isFirstStage && !l.stage);
      const isActive = l.status === 'active' || !l.status;
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
      setIsWonModalOpen(false);
      setSelectedLead(null);
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
      setIsLostModalOpen(false);
      setSelectedLead(null);
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-10 pb-0 shrink-0">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Novo Negócio</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                  <ICONS.Plus className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleCreateLead} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-none">
                  
                  {/* Seção 1 - DADOS DA EMPRESA PROSPECTADA */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                        <ICONS.Database width="16" height="16" />
                      </div>
                      <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Dados da Empresa Prospectada</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome da Empresa</label>
                        <input required value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: M4 Marketing" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CNPJ</label>
                        <input value={newLead.cnpj} onChange={e => setNewLead({...newLead, cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="00.000.000/0000-00" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                        <input value={newLead.city} onChange={e => setNewLead({...newLead, city: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: São Paulo" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                        <input value={newLead.state} onChange={e => setNewLead({...newLead, state: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: SP" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Segmento / Nicho</label>
                        <input value={newLead.niche} onChange={e => setNewLead({...newLead, niche: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Energia Solar" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Website</label>
                        <input value={newLead.website} onChange={e => setNewLead({...newLead, website: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="https://..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail da Empresa</label>
                        <input type="email" value={newLead.company_email} onChange={e => setNewLead({...newLead, company_email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="contato@empresa.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
                        <input value={newLead.instagram} onChange={e => setNewLead({...newLead, instagram: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="@perfil" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn</label>
                        <input value={newLead.company_linkedin} onChange={e => setNewLead({...newLead, company_linkedin: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="linkedin.com/in/..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                        <input value={newLead.company_phone} onChange={e => setNewLead({...newLead, company_phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                        <input value={newLead.company_whatsapp} onChange={e => setNewLead({...newLead, company_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                      </div>
                    </div>
                  </div>

                  {/* Seção 2 - CONTATO / DECISOR */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[32px] space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                        <ICONS.User width="16" height="16" />
                      </div>
                      <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Contato / Decisor</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                        <input required value={newLead.responsible_name} onChange={e => setNewLead({...newLead, responsible_name: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="Nome do contato" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                        <input value={newLead.contact_role} onChange={e => setNewLead({...newLead, contact_role: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="Ex: Diretor Comercial" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                        <input type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="email@contato.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                        <input value={newLead.phone} onChange={e => setNewLead({...newLead, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="(00) 00000-0000" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                        <input value={newLead.contact_whatsapp} onChange={e => setNewLead({...newLead, contact_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="WhatsApp" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
                        <input value={newLead.contact_instagram} onChange={e => setNewLead({...newLead, contact_instagram: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="@perfil" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn</label>
                        <input value={newLead.contact_linkedin} onChange={e => setNewLead({...newLead, contact_linkedin: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="linkedin.com/in/..." />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Notas do Contato</label>
                      <textarea value={newLead.contact_notes} onChange={e => setNewLead({...newLead, contact_notes: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm h-24" placeholder="Observações sobre o contato..." />
                    </div>
                  </div>

                  {/* Seção 3 - DADOS DO NEGÓCIO */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                        <ICONS.Collaboration width="16" height="16" />
                      </div>
                      <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Dados do Negócio</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Pipeline</label>
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
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white appearance-none"
                        >
                          {pipelines.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Etapa</label>
                        <select 
                          value={newLead.stage} 
                          onChange={e => setNewLead({...newLead, stage: e.target.value})} 
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white appearance-none"
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
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Título do Negócio</label>
                        <input required value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Campanha de Lançamento" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Valor Estimado</label>
                        <input type="number" value={newLead.value === 0 ? '' : newLead.value} onChange={e => setNewLead({...newLead, value: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="R$ 0,00" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Previsão de Fechamento</label>
                        <input type="date" value={newLead.closing_forecast} onChange={e => setNewLead({...newLead, closing_forecast: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Responsável</label>
                        <select 
                          value={newLead.responsible_id} 
                          onChange={e => setNewLead({...newLead, responsible_id: e.target.value})} 
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white appearance-none"
                        >
                          <option value="">Selecione o Responsável</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tipo de Serviço</label>
                      <input value={newLead.service_type} onChange={e => setNewLead({...newLead, service_type: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Gestão de Tráfego" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Notas do Negócio</label>
                      <textarea value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white min-h-[120px] resize-none" placeholder="Detalhes adicionais..." />
                    </div>
                  </div>
                </div>

                <div className="p-10 pt-0 shrink-0 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 dark:shadow-none disabled:opacity-50">
                    {isSyncing ? 'SINCRONIZANDO...' : 'CRIAR NEGÓCIO'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isCompanyModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-10 pb-0 shrink-0">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Nova Empresa</h3>
                <button onClick={() => setIsCompanyModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                  <ICONS.Plus className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleCreateCompany} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome da Empresa</label>
                      <input required value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: M4 Marketing" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CNPJ</label>
                      <input value={newCompany.cnpj} onChange={e => setNewCompany({...newCompany, cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                      <input value={newCompany.city} onChange={e => setNewCompany({...newCompany, city: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: São Paulo" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                      <input value={newCompany.state} onChange={e => setNewCompany({...newCompany, state: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: SP" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Segmento / Nicho</label>
                      <input value={newCompany.segment} onChange={e => setNewCompany({...newCompany, segment: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Energia Solar" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Website</label>
                      <input value={newCompany.website} onChange={e => setNewCompany({...newCompany, website: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail da Empresa</label>
                      <input type="email" value={newCompany.email} onChange={e => setNewCompany({...newCompany, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="contato@empresa.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
                      <input value={newCompany.instagram} onChange={e => setNewCompany({...newCompany, instagram: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="@perfil" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                      <input value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                      <input value={newCompany.whatsapp} onChange={e => setNewCompany({...newCompany, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                </div>
                <div className="p-10 pt-0 shrink-0 flex gap-4">
                  <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 dark:shadow-none disabled:opacity-50">
                    {isSyncing ? 'SALVANDO...' : 'CADASTRAR EMPRESA'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isContactModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 pb-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Novo Contato</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Informações do Relacionamento</p>
                </div>
                <button onClick={() => setIsContactModalOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                  <ICONS.X className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateContact} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                    <input required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Nome completo" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</label>
                    <input value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Diretor Comercial" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                    <input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                    <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsContactModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                  <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50 shadow-xl shadow-blue-100 dark:shadow-none">
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
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{activePipeline.name}</h2>
              <button 
                onClick={() => setIsPipelineModalOpen(true)}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                title="Trocar Pipeline"
              >
                <ICONS.ChevronDown width="20" height="20" />
              </button>
              <button 
                onClick={() => setIsStageConfigModalOpen(true)}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                title="Configurar Etapas"
              >
                <ICONS.Settings width="20" height="20" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest">Nuvem Sincronizada</p>
              <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
              <p className="text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">{leads.filter(l => l.status === 'won').length} Ganhos este mês</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-4">
            <button 
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'all' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterMode('my_day')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filterMode === 'my_day' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <ICONS.Clock width="12" height="12" />
              Meu Dia
            </button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-1">
            <ICONS.Plus /> NOVO NEGÓCIO
          </button>
        </div>
      </div>

      {isPipelineModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Selecionar Pipeline</h3>
              <button onClick={() => setIsPipelineModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
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
                  className={`w-full p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${activePipelineId === p.id ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 bg-slate-50/30 dark:bg-slate-800/30'}`}
                >
                  <div>
                    <p className={`font-black uppercase text-xs tracking-widest ${activePipelineId === p.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>Pipeline</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">{p.name}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${activePipelineId === p.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group-hover:border-blue-300 dark:group-hover:border-blue-700'}`}>
                    {activePipelineId === p.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
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
              className={`w-[360px] flex flex-col bg-slate-100/30 dark:bg-slate-900/30 rounded-[2.5rem] border transition-all duration-500 p-3 ${draggedLeadId ? 'border-blue-300 dark:border-blue-800 border-dashed bg-blue-50/20 dark:bg-blue-900/10' : 'border-slate-200/40 dark:border-slate-800/40'}`}
            >
              <div className="p-6 flex justify-between items-center bg-white/60 dark:bg-slate-800/60 rounded-[2rem] border-b border-slate-200/50 dark:border-slate-700/50 mb-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STAGE_COLORS.find(c => c.value === (stage.color || 'blue'))?.hex }}></div>
                  <h3 className="font-black text-slate-900 dark:text-white text-[12px] uppercase tracking-[0.2em]">{stage.name}</h3>
                  <div className="w-5 h-5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-400 dark:text-indigo-300 rounded-lg flex items-center justify-center" title="Automações Ativas">
                    <ICONS.Automation width="12" height="12" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-slate-900 dark:bg-slate-700 px-3 py-1 rounded-full text-[10px] font-black text-white">{getLeadsByStage(stage.id).length}</span>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1">R$ {calculateStageTotal(stage.id).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-2 space-y-5 overflow-y-auto flex-1 max-h-[calc(100vh-340px)] scrollbar-none pb-6">
                {getLeadsByStage(stage.id).map((lead) => (
                  <div 
                    key={lead.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, lead.id)}
                    onClick={() => setSelectedLead(lead)}
                    className={`bg-white dark:bg-slate-800 p-6 rounded-[1.75rem] border shadow-sm transition-all cursor-grab active:cursor-grabbing group hover:shadow-xl hover:-translate-y-1 ${isStale(lead) ? 'border-red-200 dark:border-red-900/30 bg-red-50/10 dark:bg-red-900/5' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[9px] uppercase tracking-[0.15em] font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3.5 py-1.5 rounded-xl border border-blue-100/50 dark:border-blue-800/50 inline-block max-w-full break-words">{lead.company}</span>
                      {isStale(lead) && (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Negócio parado!"></div>
                      )}
                    </div>
                    <h4 className="font-black text-slate-900 dark:text-white text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{lead.name}</h4>
                    {lead.next_action && (
                      <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100/50 dark:border-blue-800/50">
                        <ICONS.Clock width="12" height="12" />
                        <p className="text-[10px] font-black uppercase truncate">{lead.next_action}</p>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mb-6">{lead.notes}</p>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        lead.temperature === 'Quente' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                        lead.temperature === 'Morno' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        {lead.temperature || 'Frio'}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{lead.probability || 0}% Prob.</div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-700/50">
                      <div className="font-black text-slate-900 dark:text-white text-base">R$ {Number(lead.value).toLocaleString()}</div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveLeadStage(lead, 'prev'); }}
                          className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                          title="Mover para etapa anterior"
                        >
                          <ICONS.ArrowRight className="rotate-180" width="14" height="14" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveLeadStage(lead, 'next'); }}
                          className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                          title="Mover para próxima etapa"
                        >
                          <ICONS.ArrowRight width="14" height="14" />
                        </button>
                      </div>
                      <img src={`https://i.pravatar.cc/120?u=${lead.id}`} className="w-9 h-9 rounded-2xl border-4 border-white dark:border-slate-800 shadow-xl" alt="Owner" />
                    </div>
                  </div>
                ))}
                <button onClick={() => setIsModalOpen(true)} className="w-full py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] text-slate-300 dark:text-slate-700 text-[11px] font-black uppercase tracking-[0.2em] hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 transition-all">+ NOVO LEAD</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Novo Negócio</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-none">
                
                {/* Seção 1 - DADOS DA EMPRESA PROSPECTADA */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                      <ICONS.Database width="16" height="16" />
                    </div>
                    <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Dados da Empresa Prospectada</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome da Empresa</label>
                      <input required value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: M4 Marketing" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CNPJ</label>
                      <input value={newLead.cnpj} onChange={e => setNewLead({...newLead, cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="00.000.000/0000-00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                      <input value={newLead.city} onChange={e => setNewLead({...newLead, city: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: São Paulo" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                      <input value={newLead.state} onChange={e => setNewLead({...newLead, state: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: SP" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Segmento / Nicho</label>
                      <input value={newLead.niche} onChange={e => setNewLead({...newLead, niche: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Energia Solar" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Website</label>
                      <input value={newLead.website} onChange={e => setNewLead({...newLead, website: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="https://..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail da Empresa</label>
                      <input type="email" value={newLead.company_email} onChange={e => setNewLead({...newLead, company_email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="contato@empresa.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
                      <input value={newLead.instagram} onChange={e => setNewLead({...newLead, instagram: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="@perfil" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn</label>
                      <input value={newLead.company_linkedin} onChange={e => setNewLead({...newLead, company_linkedin: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="linkedin.com/in/..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                      <input value={newLead.company_phone} onChange={e => setNewLead({...newLead, company_phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                      <input value={newLead.company_whatsapp} onChange={e => setNewLead({...newLead, company_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                </div>

                {/* Seção 2 - CONTATO / DECISOR */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[32px] space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                      <ICONS.User width="16" height="16" />
                    </div>
                    <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Contato / Decisor</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                      <input required value={newLead.responsible_name} onChange={e => setNewLead({...newLead, responsible_name: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="Nome do contato" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                      <input value={newLead.contact_role} onChange={e => setNewLead({...newLead, contact_role: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="Ex: Diretor Comercial" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                      <input type="email" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="email@contato.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                      <input value={newLead.phone} onChange={e => setNewLead({...newLead, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="(00) 00000-0000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                      <input value={newLead.contact_whatsapp} onChange={e => setNewLead({...newLead, contact_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="WhatsApp" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
                      <input value={newLead.contact_instagram} onChange={e => setNewLead({...newLead, contact_instagram: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="@perfil" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn</label>
                      <input value={newLead.contact_linkedin} onChange={e => setNewLead({...newLead, contact_linkedin: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="linkedin.com/in/..." />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Notas do Contato</label>
                    <textarea value={newLead.contact_notes} onChange={e => setNewLead({...newLead, contact_notes: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm h-24" placeholder="Observações sobre o contato..." />
                  </div>
                </div>

                {/* Seção 3 - DADOS DO NEGÓCIO */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                      <ICONS.Collaboration width="16" height="16" />
                    </div>
                    <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Dados do Negócio</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Pipeline</label>
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
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white appearance-none"
                      >
                        {pipelines.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Etapa</label>
                      <select 
                        value={newLead.stage} 
                        onChange={e => setNewLead({...newLead, stage: e.target.value})} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white appearance-none"
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
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Título do Negócio</label>
                      <input required value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Campanha de Lançamento" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Valor Estimado</label>
                      <input type="number" value={newLead.value === 0 ? '' : newLead.value} onChange={e => setNewLead({...newLead, value: parseFloat(e.target.value) || 0})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="R$ 0,00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp (Lead)</label>
                      <input value={newLead.company_whatsapp} onChange={e => setNewLead({...newLead, company_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn (Lead)</label>
                      <input value={newLead.company_linkedin} onChange={e => setNewLead({...newLead, company_linkedin: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="linkedin.com/in/..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Previsão de Fechamento</label>
                      <input type="date" value={newLead.closing_forecast} onChange={e => setNewLead({...newLead, closing_forecast: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Responsável</label>
                      <select 
                        value={newLead.responsible_id} 
                        onChange={e => setNewLead({...newLead, responsible_id: e.target.value})} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white appearance-none"
                      >
                        <option value="">Selecione o Responsável</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tipo de Serviço</label>
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
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white appearance-none"
                    >
                      <option value="">Selecione um serviço...</option>
                      {services.map(service => (
                        <option key={service.id} value={service.name}>{service.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Notas do Negócio</label>
                    <textarea value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white min-h-[120px] resize-none" placeholder="Detalhes adicionais..." />
                  </div>
                </div>
              </div>

              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 dark:shadow-none disabled:opacity-50">
                  {isSyncing ? 'SINCRONIZANDO...' : 'CRIAR NEGÓCIO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex justify-center items-center p-4 md:p-10">
          <div className="w-full max-w-7xl bg-slate-50 dark:bg-slate-950 h-full max-h-[95vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20 dark:border-slate-800/50">
            {/* Header 360 */}
            <div className="px-10 py-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-200 dark:shadow-none">
                  {selectedLead.company?.charAt(0) || selectedLead.name?.charAt(0) || 'L'}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                      {selectedLead.company || selectedLead.name}
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      selectedLead.status === 'won' ? 'bg-emerald-100 text-emerald-600' :
                      selectedLead.status === 'lost' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {selectedLead.status === 'won' ? 'Ganho' : selectedLead.status === 'lost' ? 'Perdido' : 'Em Aberto'}
                    </div>
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">{selectedLead.name} • {selectedLead.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setIsLostModalOpen(true)}
                  className="flex-1 md:flex-none px-6 py-3 bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
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
                  className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
                >
                  Marcar Venda
                </button>
                <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 mx-2 hidden md:block" />
                
                <button 
                  onClick={() => {
                    setIsEditing(true);
                    setEditLead(selectedLead);
                  }}
                  className={`p-3 rounded-xl transition-all ${isEditing ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'}`}
                  title="Editar Lead"
                >
                  <Edit className="w-6 h-6" />
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
                  className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-all"
                  title="Excluir Lead"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
                
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Pipeline Progress */}
            <PipelineProgress 
              stages={activePipeline.stages} 
              currentStageId={selectedLead.stage || activePipeline.stages[0]?.id} 
            />
            {/* Main Content 360 */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar Esquerda */}
              <div className="w-full md:w-80 border-r border-slate-100 dark:border-slate-800 overflow-y-auto bg-white dark:bg-slate-900/50 scrollbar-none shrink-0">
                <CollapsibleSection title="Negociação" defaultOpen={true}>
                  <div className="space-y-4">
                    {!isEditing ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">R$ {Number(selectedLead.value || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviço</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.service_type || '–'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previsão</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.closing_forecast || '–'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temperatura</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            selectedLead.temperature === 'Quente' ? 'bg-orange-100 text-orange-600' :
                            selectedLead.temperature === 'Morno' ? 'bg-blue-100 text-blue-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>{selectedLead.temperature || 'Frio'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Probabilidade</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.probability || 0}%</span>
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Notas</span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            {selectedLead.notes || 'Nenhuma observação...'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Valor</label>
                          <input 
                            type="number" 
                            value={editLead.value || 0} 
                            onChange={e => setEditLead({...editLead, value: Number(e.target.value)})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tipo de Serviço</label>
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
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          >
                            <option value="">Selecione um serviço</option>
                            {services.map(service => (
                              <option key={service.id} value={service.name}>{service.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Previsão</label>
                          <input 
                            type="date" 
                            value={editLead.closing_forecast || ''} 
                            onChange={e => setEditLead({...editLead, closing_forecast: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Temperatura</label>
                          <select 
                            value={editLead.temperature || 'Frio'} 
                            onChange={e => setEditLead({...editLead, temperature: e.target.value as any})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          >
                            <option value="Frio">Frio</option>
                            <option value="Morno">Morno</option>
                            <option value="Quente">Quente</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Probabilidade (%)</label>
                          <input 
                            type="number" 
                            value={editLead.probability || 0} 
                            onChange={e => setEditLead({...editLead, probability: Number(e.target.value)})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Notas</label>
                          <textarea 
                            value={editLead.notes || ''} 
                            onChange={e => setEditLead({...editLead, notes: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold min-h-[100px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Contatos" defaultOpen={false}>
                  <div className="space-y-4">
                    {!isEditing ? (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <p className="text-xs font-black text-slate-900 dark:text-white mb-1">{selectedLead.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold mb-3">{selectedLead.contact_role || 'Decisor'}</p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => window.open(`https://wa.me/55${selectedLead.contact_whatsapp?.replace(/\D/g, '')}`, '_blank')}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 transition-all"
                          >
                            <MessageSquare width="12" height="12" /> WhatsApp
                          </button>
                          <button 
                            onClick={() => window.location.href = `mailto:${selectedLead.email}`}
                            className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200"
                          >
                            <ICONS.Mail width="14" height="14" />
                          </button>
                          {selectedLead.contact_instagram && (
                            <a 
                              href={`https://instagram.com/${selectedLead.contact_instagram.replace('@', '')}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-lg hover:bg-pink-100"
                            >
                              <Instagram width="14" height="14" />
                            </a>
                          )}
                          {selectedLead.contact_linkedin && (
                            <a 
                              href={selectedLead.contact_linkedin.startsWith('http') ? selectedLead.contact_linkedin : `https://linkedin.com/in/${selectedLead.contact_linkedin}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100"
                            >
                              <Linkedin width="14" height="14" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome do Contato</label>
                          <input 
                            value={editLead.name || ''} 
                            onChange={e => setEditLead({...editLead, name: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Cargo</label>
                          <input 
                            value={editLead.contact_role || ''} 
                            onChange={e => setEditLead({...editLead, contact_role: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">E-mail</label>
                          <input 
                            type="email"
                            value={editLead.email || ''} 
                            onChange={e => setEditLead({...editLead, email: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">WhatsApp</label>
                          <input 
                            value={editLead.contact_whatsapp || ''} 
                            onChange={e => setEditLead({...editLead, contact_whatsapp: formatPhoneBR(e.target.value)})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Instagram</label>
                          <input 
                            value={editLead.contact_instagram || ''} 
                            onChange={e => setEditLead({...editLead, contact_instagram: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                            placeholder="@perfil"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">LinkedIn</label>
                          <input 
                            value={editLead.contact_linkedin || ''} 
                            onChange={e => setEditLead({...editLead, contact_linkedin: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
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
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</p>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedLead.company}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CNPJ</p>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedLead.cnpj || '–'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site</p>
                          <a href={selectedLead.website} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline truncate block">{selectedLead.website || '–'}</a>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Segmento</p>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedLead.niche || '–'}</p>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome da Empresa</label>
                          <input 
                            value={editLead.company || ''} 
                            onChange={e => setEditLead({...editLead, company: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">CNPJ</label>
                          <input 
                            value={editLead.cnpj || ''} 
                            onChange={e => setEditLead({...editLead, cnpj: formatCNPJ(e.target.value)})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Site</label>
                          <input 
                            value={editLead.website || ''} 
                            onChange={e => setEditLead({...editLead, website: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Segmento</label>
                          <input 
                            value={editLead.niche || ''} 
                            onChange={e => setEditLead({...editLead, niche: e.target.value})}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Responsável" defaultOpen={false}>
                  {!isEditing ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black">
                        {selectedLead.responsible_name?.charAt(0) || 'U'}
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedLead.responsible_name || 'Não atribuído'}</p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Responsável</label>
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
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-xs font-bold"
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
              <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
                {/* Tab Header */}
                <div className="flex px-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  {[
                    { id: 'history', label: 'Histórico', icon: Clock },
                    { id: 'tasks', label: 'Tarefas', icon: List },
                    { id: 'questionnaires', label: 'Questionários', icon: FileText },
                    { id: 'products', label: 'Produtos', icon: Package }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab360(tab.id as any)}
                      className={`flex items-center gap-2 px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                        activeTab360 === tab.id 
                          ? 'border-blue-600 text-blue-600' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
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
                      <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <ICONS.Automation width="14" height="14" /> Resumo IA
                          </h5>
                          <button 
                            onClick={() => handleAISummary(selectedLead.interactions || [])}
                            disabled={isSummarizing}
                            className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                          >
                            {isSummarizing ? 'Gerando...' : 'Atualizar'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                          {aiSummary || "Gere um resumo das interações para uma visão rápida do negócio."}
                        </p>
                      </div>

                      <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                        {(selectedLead.interactions || [
                          { id: '1', type: 'status_change', title: 'Lead Criado', content: 'Lead entrou no funil.', created_at: selectedLead.created_at }
                        ]).map((interaction) => (
                          <div key={interaction.id} className="flex gap-6 relative">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center z-10 shadow-sm border border-slate-100 dark:border-slate-700">
                              {interaction.type === 'email' ? <ICONS.Mail width="18" height="18" className="text-blue-500" /> :
                               interaction.type === 'call' ? <ICONS.Phone width="18" height="18" className="text-emerald-500" /> :
                               interaction.type === 'meeting' ? <Calendar width="18" height="18" className="text-amber-500" /> :
                               <MessageSquare width="18" height="18" className="text-slate-400" />}
                            </div>
                            <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{interaction.title}</h5>
                                <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(interaction.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{interaction.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab360 === 'tasks' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Tarefas do Lead</h4>
                        <button 
                          onClick={() => setIsNewTaskModalOpen(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                        >
                          + Nova Tarefa
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {tasks.filter(t => t.lead_id === selectedLead.id).length === 0 ? (
                          <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <List className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                            <p className="text-sm font-bold text-slate-400">Nenhuma tarefa vinculada a este lead.</p>
                          </div>
                        ) : (
                          tasks.filter(t => t.lead_id === selectedLead.id).map(task => (
                            <div key={task.id} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-all">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                task.status === TaskStatus.DONE ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {task.type === 'call' ? <ICONS.Phone width="18" height="18" /> :
                                 task.type === 'meeting' ? <Calendar width="18" height="18" /> :
                                 <List width="18" height="18" />}
                              </div>
                              <div className="flex-1">
                                <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{task.title}</h5>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                  {new Date(task.due_date).toLocaleString()} • {task.priority}
                                </p>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                task.status === TaskStatus.DONE ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
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
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Questionários de Qualificação</h4>
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
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                        >
                          + Novo Questionário
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {formResponses.length === 0 ? (
                          <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <ICONS.Form className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                            <p className="text-sm font-bold text-slate-400">Nenhum questionário respondido para este lead.</p>
                          </div>
                        ) : (
                          formResponses.map(response => {
                            const template = formTemplates.find(t => t.id === response.form_id);
                            return (
                              <div key={response.id} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                  <ICONS.Form width="18" height="18" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {template?.title || 'Formulário Removido'}
                                  </h5>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                    Respondido em {new Date(response.created_at).toLocaleString()} • {response.answers.length} respostas
                                  </p>
                                </div>
                                <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
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
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Produtos e Serviços</h4>
                        <button 
                          onClick={() => setIsLinkingProduct(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                        >
                          + Vincular Produto
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {mockLeadProducts.length === 0 ? (
                          <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <Package className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                            <p className="text-sm font-bold text-slate-400">Nenhum produto vinculado a este lead.</p>
                          </div>
                        ) : (
                          mockLeadProducts.map(product => (
                            <div key={product.id} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-all">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Package width="18" height="18" />
                              </div>
                              <div className="flex-1">
                                <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{product.name}</h5>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{product.type} • {product.price}</p>
                              </div>
                              <button 
                                onClick={() => setMockLeadProducts(mockLeadProducts.filter(p => p.id !== product.id))}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
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
            <div className="p-10 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-4 shrink-0">
              {!isEditing ? (
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
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
                    className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={handleUpdateLead}
                    disabled={isSyncing}
                    className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-200 dark:shadow-none disabled:opacity-50"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 pb-0 shrink-0">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase">Configurar Nova Conta</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-none">
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Data de Início</label>
                <input 
                  type="date" 
                  value={wonData.start_date}
                  onChange={e => setWonData({...wonData, start_date: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Valor Mensal (Fee)</label>
                <input 
                  type="number" 
                  placeholder="0,00"
                  value={wonData.monthly_value === 0 ? '' : wonData.monthly_value}
                  onChange={e => setWonData({...wonData, monthly_value: parseFloat(e.target.value) || 0})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Tipo de Serviço</label>
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
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white appearance-none"
                >
                  <option value="">Selecione um serviço...</option>
                  {services.map(service => (
                    <option key={service.id} value={service.name}>{service.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-10 pt-0 shrink-0 flex gap-4">
              <button onClick={() => setIsWonModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
              <button 
                onClick={handleWonConfirm}
                disabled={isSyncing}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-100 dark:shadow-none disabled:opacity-50"
              >
                {isSyncing ? "PROCESSANDO..." : "CONFIRMAR FECHAMENTO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLostModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 pb-0 shrink-0">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase">Marcar Perda</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-none">
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Motivo da Perda</label>
                <textarea 
                  placeholder="Descreva o motivo pelo qual o negócio foi perdido..."
                  value={lostData.reason}
                  onChange={e => setLostData({...lostData, reason: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white min-h-[120px] resize-none"
                />
              </div>
            </div>
            <div className="p-10 pt-0 shrink-0 flex gap-4">
              <button onClick={() => setIsLostModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
              <button 
                onClick={handleLostConfirm}
                disabled={isSyncing}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-red-100 dark:shadow-none disabled:opacity-50"
              >
                {isSyncing ? "PROCESSANDO..." : "CONFIRMAR PERDA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 pb-0 shrink-0">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase">Nova Tarefa</h3>
            </div>
            <form onSubmit={handleCreateTask} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-none">
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Título</label>
                  <input 
                    required
                    placeholder="Ex: Enviar proposta comercial"
                    value={newTaskData.title}
                    onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Data/Hora</label>
                    <input 
                      type="datetime-local"
                      required
                      value={newTaskData.due_date}
                      onChange={e => setNewTaskData({...newTaskData, due_date: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Prioridade</label>
                    <select 
                      value={newTaskData.priority}
                      onChange={e => setNewTaskData({...newTaskData, priority: e.target.value as any})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Tipo</label>
                  <select 
                    value={newTaskData.type}
                    onChange={e => setNewTaskData({...newTaskData, type: e.target.value as any})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                  >
                    <option value="task">Tarefa</option>
                    <option value="call">Ligação</option>
                    <option value="meeting">Reunião</option>
                    <option value="email">E-mail</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Descrição</label>
                  <textarea 
                    placeholder="Detalhes da tarefa..."
                    value={newTaskData.description}
                    onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white min-h-[100px] resize-none"
                  />
                </div>
              </div>
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button 
                  type="submit"
                  disabled={isSyncing}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-50"
                >
                  {isSyncing ? "CRIANDO..." : "CRIAR TAREFA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Nova Empresa</h3>
              <button onClick={() => setIsCompanyModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateCompany} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome da Empresa</label>
                  <input required value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: M4 Marketing" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CNPJ</label>
                    <input value={newCompany.cnpj} onChange={e => setNewCompany({...newCompany, cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Segmento</label>
                    <input value={newCompany.segment} onChange={e => setNewCompany({...newCompany, segment: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Tecnologia" />
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Contato Principal (Opcional)</p>
                    <button 
                      type="button"
                      onClick={() => setContactMode(contactMode === 'select' ? 'create' : 'select')}
                      className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest flex items-center gap-2"
                    >
                      {contactMode === 'select' ? '+ Novo Contato' : 'Selecionar Existente'}
                    </button>
                  </div>

                  {contactMode === 'select' ? (
                    <div className="relative">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Buscar Contato</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            value={contactSearch} 
                            onChange={e => {
                              setContactSearch(e.target.value);
                              setShowContactDropdown(true);
                            }} 
                            onFocus={() => setShowContactDropdown(true)}
                            className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                            placeholder="Digite nome, e-mail ou telefone..." 
                          />
                          {showContactDropdown && contactSearch && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[110] max-h-60 overflow-y-auto scrollbar-none">
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
                                    className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between group"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                                      <p className="text-[10px] text-slate-400">{c.email} • {c.phone}</p>
                                    </div>
                                    {selectedContactId === c.id && <ICONS.Check className="text-blue-600" width="16" height="16" />}
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center text-slate-400 text-xs font-bold">Nenhum contato encontrado</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                          <input value={primaryContact.name} onChange={e => setPrimaryContact({...primaryContact, name: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Nome do contato" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                          <input value={primaryContact.role} onChange={e => setPrimaryContact({...primaryContact, role: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Ex: CEO" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                          <input type="email" value={primaryContact.email} onChange={e => setPrimaryContact({...primaryContact, email: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="email@contato.com" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                          <input value={primaryContact.phone} onChange={e => setPrimaryContact({...primaryContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="(00) 00000-0000" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                          <input value={primaryContact.whatsapp} onChange={e => setPrimaryContact({...primaryContact, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="(00) 00000-0000" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
                          <input value={primaryContact.instagram} onChange={e => setPrimaryContact({...primaryContact, instagram: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="@perfil" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn</label>
                          <input value={primaryContact.linkedin} onChange={e => setPrimaryContact({...primaryContact, linkedin: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="linkedin.com/in/..." />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50">
                  {isSyncing ? "SALVANDO..." : "SALVAR EMPRESA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isContactModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Novo Contato</h3>
              <button onClick={() => setIsContactModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: João Silva" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                    <input value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: CEO" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                    <input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="joao@empresa.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                    <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input value={newContact.whatsapp} onChange={e => setNewContact({...newContact, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
                    <input value={newContact.instagram} onChange={e => setNewContact({...newContact, instagram: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="@perfil" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn</label>
                    <input value={newContact.linkedin} onChange={e => setNewContact({...newContact, linkedin: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="linkedin.com/in/..." />
                  </div>
                </div>
              </div>
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsContactModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50">
                  {isSyncing ? "SALVANDO..." : "SALVAR CONTATO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStageConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-10 pb-6 shrink-0 border-b border-slate-50 dark:border-slate-800">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Configurar Funil</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{activePipeline.name}</p>
              </div>
              <button onClick={() => setIsStageConfigModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-none">
              {activePipeline.stages.map((stage, index) => (
                <div key={stage.id} className="group bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 transition-all">
                  {editingStageId === stage.id ? (
                    <div className="flex-1 space-y-4">
                      <div className="flex gap-4">
                        <input 
                          autoFocus
                          value={newStageData.name}
                          onChange={(e) => setNewStageData({...newStageData, name: e.target.value})}
                          className="flex-1 p-3 bg-white dark:bg-slate-800 rounded-xl border-none font-bold text-slate-900 dark:text-white text-sm shadow-sm"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setEditingStageId(null)} className="p-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-300 transition-all">
                            <ICONS.X width="16" height="16" />
                          </button>
                          <button onClick={() => handleUpdateStage(stage.id, { name: newStageData.name, color: newStageData.color })} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all">
                            <ICONS.Check width="16" height="16" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {STAGE_COLORS.map(color => (
                          <button
                            key={color.value}
                            onClick={() => setNewStageData({...newStageData, color: color.value})}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${newStageData.color === color.value ? 'border-blue-600 scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  ) : deletingStageId === stage.id ? (
                    <div className="flex flex-col gap-4 p-2">
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        Excluir <span className="text-red-500">"{stage.name}"</span>? Os leads nesta etapa ficarão sem etapa.
                      </p>
                      <div className="flex gap-3">
                        <button onClick={() => setDeletingStageId(null)} className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs uppercase tracking-widest">Cancelar</button>
                        <button onClick={() => handleDeleteStage(stage.id)} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all">Confirmar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 text-slate-300 dark:text-slate-600">
                          <ICONS.GripVertical width="16" height="16" />
                        </div>
                        <div 
                          className="w-4 h-4 rounded-full shadow-sm" 
                          style={{ backgroundColor: STAGE_COLORS.find(c => c.value === (stage.color || 'blue'))?.hex }}
                        />
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{stage.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleMoveStage(stage.id, 'up')}
                          disabled={index === 0}
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20"
                        >
                          <ICONS.ChevronUp width="16" height="16" />
                        </button>
                        <button 
                          onClick={() => handleMoveStage(stage.id, 'down')}
                          disabled={index === activePipeline.stages.length - 1}
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20"
                        >
                          <ICONS.ChevronDown width="16" height="16" />
                        </button>
                        <button 
                          onClick={() => setEditingStageId(stage.id)}
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <ICONS.Edit width="16" height="16" />
                        </button>
                        <button 
                          onClick={() => setDeletingStageId(stage.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <ICONS.Trash width="16" height="16" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isAddingStage ? (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1">Nome da Etapa</label>
                    <input 
                      autoFocus
                      value={newStageData.name}
                      onChange={e => setNewStageData({...newStageData, name: e.target.value})}
                      className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                      placeholder="Ex: Negociação"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1">Cor da Etapa</label>
                    <div className="flex gap-3">
                      {STAGE_COLORS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => setNewStageData({...newStageData, color: color.value})}
                          className={`w-10 h-10 rounded-full border-4 transition-all ${newStageData.color === color.value ? 'border-blue-600 scale-110 shadow-lg shadow-blue-100 dark:shadow-none' : 'border-white dark:border-slate-800 hover:scale-105'}`}
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button onClick={() => setIsAddingStage(false)} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest">Cancelar</button>
                    <button 
                      onClick={handleCreateStage}
                      disabled={!newStageData.name || isSyncing}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 dark:shadow-none disabled:opacity-50"
                    >
                      {isSyncing ? 'SALVANDO...' : 'CONFIRMAR'}
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingStage(true)}
                  className="w-full py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] text-slate-400 font-black uppercase text-xs tracking-[0.2em] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-3"
                >
                  <ICONS.Plus width="16" height="16" />
                  Nova Etapa
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isDeleting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 width="32" height="32" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-2">Excluir Lead?</h3>
            <p className="text-sm text-slate-500 font-bold mb-8">Esta ação é irreversível e removerá todos os dados vinculados a este lead.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsDeleting(false)}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (selectedLead) handleDeleteLead(selectedLead.id);
                  setIsDeleting(false);
                  setSelectedLead(null);
                }}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-100 dark:shadow-none"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {isExecutingForm && selectedTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedTemplate.title}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Sondagem em tempo real</p>
              </div>
              <button onClick={() => setIsExecutingForm(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X width="20" height="20" />
              </button>
            </div>

            <div className="p-10">
              <div className="mb-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Pergunta {currentQuestionIndex + 1} de {selectedTemplate.questions.length}
                  </span>
                  <div className="flex gap-1">
                    {selectedTemplate.questions.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentQuestionIndex ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
                    ))}
                  </div>
                </div>
                
                <h4 className="text-lg font-black text-slate-900 dark:text-white mb-6">
                  {selectedTemplate.questions[currentQuestionIndex].type === 'script' ? 'Roteiro de Abordagem' : selectedTemplate.questions[currentQuestionIndex].label}
                  {selectedTemplate.questions[currentQuestionIndex].required && <span className="text-red-500 ml-1">*</span>}
                </h4>

                <div className="animate-in slide-in-from-right-4 duration-300">
                  {selectedTemplate.questions[currentQuestionIndex].type === 'script' && (
                    <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                      <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-relaxed whitespace-pre-wrap italic">
                        "{selectedTemplate.questions[currentQuestionIndex].label}"
                      </p>
                    </div>
                  )}

                  {selectedTemplate.questions[currentQuestionIndex].type === 'text' && (
                    <input 
                      type="text"
                      value={formAnswers[selectedTemplate.questions[currentQuestionIndex].id] || ''}
                      onChange={(e) => handleFormAnswer(selectedTemplate.questions[currentQuestionIndex].id, e.target.value)}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-base outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 dark:text-white"
                      placeholder="Digite a resposta..."
                    />
                  )}

                  {selectedTemplate.questions[currentQuestionIndex].type === 'long_text' && (
                    <textarea 
                      value={formAnswers[selectedTemplate.questions[currentQuestionIndex].id] || ''}
                      onChange={(e) => handleFormAnswer(selectedTemplate.questions[currentQuestionIndex].id, e.target.value)}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-base outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[120px] text-slate-900 dark:text-white"
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
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                            : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                          }`}
                        >
                          {opt}
                          {formAnswers[selectedTemplate.questions[currentQuestionIndex].id] === opt && <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></div>}
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
                    className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Anterior
                  </button>
                )}
                <button 
                  onClick={nextQuestion}
                  disabled={selectedTemplate.questions[currentQuestionIndex].required && !formAnswers[selectedTemplate.questions[currentQuestionIndex].id]}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50"
                >
                  {currentQuestionIndex === selectedTemplate.questions.length - 1 ? (isSavingForm ? 'Salvando...' : 'Finalizar') : 'Próxima'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLinkingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Vincular Produto</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Selecione um item do catálogo</p>
              </div>
              <button onClick={() => setIsLinkingProduct(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
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
                  className="w-full p-4 text-left bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent hover:border-blue-600 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Package width="18" height="18" />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{product.name}</h5>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{product.type} • {product.price}</p>
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
