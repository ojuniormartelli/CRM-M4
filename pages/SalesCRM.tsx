
import React, { useState, useEffect } from 'react';
import { Pipeline, PipelineStage, Lead, Interaction, Company, Contact, User, LeadTemperature } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { formatPhoneBR, formatCNPJ } from '../utils/formatters';
import { GoogleGenAI } from "@google/genai";
import { aiService } from '../services/aiService';

interface SalesCRMProps {
  pipelines: Pipeline[];
  setPipelines: React.Dispatch<React.SetStateAction<Pipeline[]>>;
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  onStatusChange: (leadId: string, status: 'won' | 'lost' | 'active', extraData?: any) => Promise<void>;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  currentUser: User | null;
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

const SalesCRM: React.FC<SalesCRMProps> = ({ 
  pipelines, 
  setPipelines,
  activePipelineId, 
  setActivePipelineId, 
  leads, 
  setLeads, 
  onStatusChange, 
  companies, 
  setCompanies,
  contacts, 
  setContacts,
  currentUser,
  isModalOpen: externalIsModalOpen,
  setIsModalOpen: setExternalIsModalOpen,
  renderOnlyModal = false
}) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditing, setIsEditing] = useState(false);
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
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [wonData, setWonData] = useState({
    start_date: new Date().toISOString().split('T')[0],
    monthly_value: 0,
    service_type: '',
    bank_account_id: ''
  });
  
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    name: '', company: '', email: '', phone: '', value: 0, notes: '',
    niche: '', segment: '', service_type: '', proposed_ticket: 0,
    company_name: '', company_cnpj: '', company_email: '', company_phone: '', company_whatsapp: '', company_instagram: '', company_linkedin: '', 
    contact_name: '', contact_role: '', contact_email: '', contact_phone: '', contact_whatsapp: '', contact_instagram: '', contact_linkedin: '', contact_notes: '',
    city: '', state: '', website: '',
    pipeline_id: activePipelineId,
    stage_id: '',
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
    name: '', email: '', phone: '', role: ''
  });

  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '', email: '', phone: '', role: '', company_id: ''
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
      setPrimaryContact({ name: '', email: '', phone: '', role: '' });
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
      setNewContact({ name: '', email: '', phone: '', role: '', company_id: '' });
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
        // Ensure legacy fields are updated too
        company: editLead.company_name || editLead.company,
        name: editLead.contact_name || editLead.name,
        email: editLead.contact_email || editLead.email,
        phone: editLead.contact_phone || editLead.phone,
        niche: editLead.segment || editLead.niche,
        responsible_name: users.find(u => u.id === editLead.responsible_id)?.name || editLead.responsible_name
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
        .update({ stage_id: null })
        .eq('stage_id', stageId);

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
      company: newLead.company_name || newLead.company,
      name: newLead.name || newLead.contact_name || 'Novo Negócio',
      email: newLead.contact_email || newLead.email,
      phone: newLead.contact_phone || newLead.phone,
      niche: newLead.segment || newLead.niche,
      
      pipeline_id: newLead.pipeline_id || activePipelineId,
      stage_id: newLead.stage_id || selectedPipeline?.stages[0].id,
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
        niche: '', segment: '', service_type: '', proposed_ticket: 0,
        company_name: '', company_cnpj: '', company_email: '', company_phone: '', company_whatsapp: '', company_instagram: '', company_linkedin: '', 
        contact_name: '', contact_role: '', contact_email: '', contact_phone: '', contact_whatsapp: '', contact_instagram: '', contact_linkedin: '', contact_notes: '',
        city: '', state: '', website: '',
        pipeline_id: activePipelineId,
        stage_id: '',
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
      setLeads(leads.map(l => l.id === leadId ? { ...l, stage_id: targetStageId } : l));
      
      const { error } = await supabase
        .from('m4_leads')
        .update({ stage_id: targetStageId })
        .eq('id', leadId);

      if (error) {
        setLeads(originalLeads); // Reverte se falhar
        alert("Erro ao atualizar estágio: " + error.message);
      }
    }
    setDraggedLeadId(null);
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Excluir este negócio permanentemente?")) return;
    
    const { error } = await supabase
      .from('m4_leads')
      .delete()
      .eq('id', id);

    if (!error) {
      setLeads(leads.filter(l => l.id !== id));
      setSelectedLead(null);
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


  const getLeadsByStage = (stage_id: string) => {
    let filtered = leads.filter(l => l.pipeline_id === activePipelineId && l.stage_id === stage_id && (l.status === 'active' || !l.status));
    
    if (filterMode === 'my_day') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(l => l.next_action_date && l.next_action_date <= today);
    }
    
    return filtered;
  };
  const calculateStageTotal = (stage_id: string) => getLeadsByStage(stage_id).reduce((acc, curr) => acc + Number(curr.value), 0);

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
                        <input required value={newLead.company_name} onChange={e => setNewLead({...newLead, company_name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: M4 Marketing" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CNPJ</label>
                        <input value={newLead.company_cnpj} onChange={e => setNewLead({...newLead, company_cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="00.000.000/0000-00" />
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
                        <input value={newLead.segment} onChange={e => setNewLead({...newLead, segment: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Energia Solar" />
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
                        <input value={newLead.company_instagram} onChange={e => setNewLead({...newLead, company_instagram: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="@perfil" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn</label>
                        <input value={newLead.company_linkedin} onChange={e => setNewLead({...newLead, company_linkedin: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="linkedin.com/in/..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                        <input value={newLead.company_phone} onChange={e => setNewLead({...newLead, company_phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 0000-0000" />
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
                        <input required value={newLead.contact_name} onChange={e => setNewLead({...newLead, contact_name: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="Nome do contato" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                        <input value={newLead.contact_role} onChange={e => setNewLead({...newLead, contact_role: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="Ex: Diretor Comercial" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                        <input type="email" value={newLead.contact_email} onChange={e => setNewLead({...newLead, contact_email: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="email@contato.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                        <input value={newLead.contact_phone} onChange={e => setNewLead({...newLead, contact_phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="(00) 0000-0000" />
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
                              stage_id: pipeline?.stages[0].id || ''
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
                          value={newLead.stage_id} 
                          onChange={e => setNewLead({...newLead, stage_id: e.target.value})} 
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
                        <input type="number" value={newLead.value} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="R$ 0,00" />
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
                      <input value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 0000-0000" />
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
                      <input required value={newLead.company_name} onChange={e => setNewLead({...newLead, company_name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: M4 Marketing" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CNPJ</label>
                      <input value={newLead.company_cnpj} onChange={e => setNewLead({...newLead, company_cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="00.000.000/0000-00" />
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
                      <input value={newLead.segment} onChange={e => setNewLead({...newLead, segment: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Energia Solar" />
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
                      <input value={newLead.company_instagram} onChange={e => setNewLead({...newLead, company_instagram: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="@perfil" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn</label>
                      <input value={newLead.company_linkedin} onChange={e => setNewLead({...newLead, company_linkedin: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="linkedin.com/in/..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                      <input value={newLead.company_phone} onChange={e => setNewLead({...newLead, company_phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 0000-0000" />
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
                      <input required value={newLead.contact_name} onChange={e => setNewLead({...newLead, contact_name: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="Nome do contato" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                      <input value={newLead.contact_role} onChange={e => setNewLead({...newLead, contact_role: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="Ex: Diretor Comercial" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                      <input type="email" value={newLead.contact_email} onChange={e => setNewLead({...newLead, contact_email: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="email@contato.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                      <input value={newLead.contact_phone} onChange={e => setNewLead({...newLead, contact_phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white shadow-sm" placeholder="(00) 0000-0000" />
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
                            stage_id: pipeline?.stages[0].id || ''
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
                        value={newLead.stage_id} 
                        onChange={e => setNewLead({...newLead, stage_id: e.target.value})} 
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
                      <input type="number" value={newLead.value} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="R$ 0,00" />
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

      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex justify-end">
          <div className="w-full md:w-[750px] bg-slate-50 dark:bg-slate-950 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-700">
            <div className="p-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-200 dark:shadow-none">{selectedLead.name?.charAt(0) || 'L'}</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                    {isEditing ? `EDITANDO: ${selectedLead.name}` : selectedLead.name}
                  </h3>
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-[0.2em]">{selectedLead.company}</p>
                      <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        selectedLead.status === 'won' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                        selectedLead.status === 'lost' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}>
                        {selectedLead.status === 'won' ? 'Ganho' : selectedLead.status === 'lost' ? 'Perdido' : 'Em Aberto'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                {!isEditing ? (
                  <>
                    <button 
                      onClick={() => {
                        setEditLead(selectedLead);
                        setIsEditing(true);
                      }}
                      className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                      title="Editar"
                    >
                      <ICONS.Edit width="20" height="20" />
                    </button>
                    <button 
                      onClick={() => handleAIScore(selectedLead)}
                      disabled={isAIScoring}
                      className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all disabled:opacity-50"
                      title="Score com IA"
                    >
                      {isAIScoring ? <span className="animate-spin block">◌</span> : <ICONS.Plus width="20" height="20" />}
                    </button>
                    <button 
                      onClick={() => handleEnrichSingleLead(selectedLead)}
                      disabled={isEnriching}
                      className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all disabled:opacity-50"
                      title="Enriquecer com IA"
                    >
                      {isEnriching ? <span className="animate-spin block">◌</span> : <ICONS.Automation width="20" height="20" />}
                    </button>
                    <button onClick={() => handleDeleteLead(selectedLead.id)} className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all" title="Excluir">
                      <ICONS.X width="20" height="20" />
                    </button>
                    <button onClick={() => setSelectedLead(null)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                      <ICONS.Plus className="rotate-45 w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditLead(selectedLead);
                    }}
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    CANCELAR
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="bg-white dark:bg-slate-900">
                
                {/* Seção 1 - DADOS DA EMPRESA PROSPECTADA */}
                <CollapsibleSection title="Dados da Empresa Prospectada">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nome da Empresa</p>
                      {isEditing ? (
                        <input 
                          value={editLead.company_name || ''} 
                          onChange={e => setEditLead({...editLead, company_name: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.company_name || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">CNPJ</p>
                      {isEditing ? (
                        <input 
                          value={editLead.company_cnpj || ''} 
                          onChange={e => setEditLead({...editLead, company_cnpj: formatCNPJ(e.target.value)})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.company_cnpj || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cidade</p>
                      {isEditing ? (
                        <input 
                          value={editLead.city || ''} 
                          onChange={e => setEditLead({...editLead, city: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.city || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estado</p>
                      {isEditing ? (
                        <input 
                          value={editLead.state || ''} 
                          onChange={e => setEditLead({...editLead, state: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.state || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Segmento / Nicho</p>
                      {isEditing ? (
                        <input 
                          value={editLead.segment || ''} 
                          onChange={e => setEditLead({...editLead, segment: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.segment || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Website</p>
                      {isEditing ? (
                        <input 
                          value={editLead.website || ''} 
                          onChange={e => setEditLead({...editLead, website: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLead.website || '–'}</p>
                          {selectedLead.website && (
                            <button 
                              onClick={() => window.open(selectedLead.website?.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`, '_blank')}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-blue-600"
                            >
                              <ICONS.ExternalLink size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">E-mail da Empresa</p>
                      {isEditing ? (
                        <input 
                          type="email"
                          value={editLead.company_email || ''} 
                          onChange={e => setEditLead({...editLead, company_email: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.company_email || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Instagram</p>
                      {isEditing ? (
                        <input 
                          value={editLead.company_instagram || ''} 
                          onChange={e => setEditLead({...editLead, company_instagram: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.company_instagram || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">LinkedIn</p>
                      {isEditing ? (
                        <input 
                          value={editLead.company_linkedin || ''} 
                          onChange={e => setEditLead({...editLead, company_linkedin: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.company_linkedin || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Telefone</p>
                      {isEditing ? (
                        <input 
                          value={editLead.company_phone || ''} 
                          onChange={e => setEditLead({...editLead, company_phone: formatPhoneBR(e.target.value)})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.company_phone || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">WhatsApp</p>
                      {isEditing ? (
                        <input 
                          value={editLead.company_whatsapp || ''} 
                          onChange={e => setEditLead({...editLead, company_whatsapp: formatPhoneBR(e.target.value)})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.company_whatsapp || '–'}</p>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Seção 2 - CONTATO / DECISOR */}
                <CollapsibleSection title="Contato / Decisor">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nome</p>
                      {isEditing ? (
                        <input 
                          value={editLead.contact_name || ''} 
                          onChange={e => setEditLead({...editLead, contact_name: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.contact_name || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cargo</p>
                      {isEditing ? (
                        <input 
                          value={editLead.contact_role || ''} 
                          onChange={e => setEditLead({...editLead, contact_role: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.contact_role || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">E-mail</p>
                      {isEditing ? (
                        <input 
                          type="email"
                          value={editLead.contact_email || ''} 
                          onChange={e => setEditLead({...editLead, contact_email: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.contact_email || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Telefone</p>
                      {isEditing ? (
                        <input 
                          value={editLead.contact_phone || ''} 
                          onChange={e => setEditLead({...editLead, contact_phone: formatPhoneBR(e.target.value)})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.contact_phone || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">WhatsApp</p>
                      {isEditing ? (
                        <input 
                          value={editLead.contact_whatsapp || ''} 
                          onChange={e => setEditLead({...editLead, contact_whatsapp: formatPhoneBR(e.target.value)})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.contact_whatsapp || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Instagram</p>
                      {isEditing ? (
                        <input 
                          value={editLead.contact_instagram || ''} 
                          onChange={e => setEditLead({...editLead, contact_instagram: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.contact_instagram || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">LinkedIn</p>
                      {isEditing ? (
                        <input 
                          value={editLead.contact_linkedin || ''} 
                          onChange={e => setEditLead({...editLead, contact_linkedin: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.contact_linkedin || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Notas do Contato</p>
                      {isEditing ? (
                        <textarea 
                          value={editLead.contact_notes || ''} 
                          onChange={e => setEditLead({...editLead, contact_notes: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white h-24"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-pre-wrap">{selectedLead.contact_notes || '–'}</p>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Seção 3 - DADOS DO NEGÓCIO */}
                <CollapsibleSection title="Dados do Negócio">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pipeline</p>
                      {isEditing ? (
                        <select 
                          value={editLead.pipeline_id} 
                          onChange={e => {
                            const pId = e.target.value;
                            const pipeline = pipelines.find(p => p.id === pId);
                            setEditLead({
                              ...editLead, 
                              pipeline_id: pId,
                              stage_id: pipeline?.stages[0].id || ''
                            });
                          }} 
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white appearance-none"
                        >
                          {pipelines.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{pipelines.find(p => p.id === selectedLead.pipeline_id)?.name || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Etapa</p>
                      {isEditing ? (
                        <select 
                          value={editLead.stage_id} 
                          onChange={e => setEditLead({...editLead, stage_id: e.target.value})} 
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white appearance-none"
                        >
                          <option value="">Selecione a Etapa</option>
                          {pipelines.find(p => p.id === (editLead.pipeline_id || activePipelineId))?.stages.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {pipelines.find(p => p.id === selectedLead.pipeline_id)?.stages.find(s => s.id === selectedLead.stage_id)?.name || '–'}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Título do Negócio</p>
                      {isEditing ? (
                        <input 
                          value={editLead.name || ''} 
                          onChange={e => setEditLead({...editLead, name: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.name || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor Estimado</p>
                      {isEditing ? (
                        <input 
                          type="number"
                          value={editLead.value || 0} 
                          onChange={e => setEditLead({...editLead, value: Number(e.target.value)})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {Number(selectedLead.value || 0).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Previsão de Fechamento</p>
                      {isEditing ? (
                        <input 
                          type="date"
                          value={editLead.closing_forecast || ''} 
                          onChange={e => setEditLead({...editLead, closing_forecast: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.closing_forecast || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Responsável</p>
                      {isEditing ? (
                        <select 
                          value={editLead.responsible_id || ''} 
                          onChange={e => setEditLead({...editLead, responsible_id: e.target.value})} 
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white appearance-none"
                        >
                          <option value="">Selecione o Responsável</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.responsible_name || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipo de Serviço</p>
                      {isEditing ? (
                        <input 
                          value={editLead.service_type || ''} 
                          onChange={e => setEditLead({...editLead, service_type: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.service_type || '–'}</p>
                      )}
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Notas do Negócio</p>
                      {isEditing ? (
                        <textarea 
                          value={editLead.notes || ''} 
                          onChange={e => setEditLead({...editLead, notes: e.target.value})}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white h-24"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-pre-wrap">{selectedLead.notes || '–'}</p>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>

                {selectedLead.custom_fields && Object.keys(selectedLead.custom_fields).length > 0 && (
                  <CollapsibleSection title="Campos Personalizados">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(selectedLead.custom_fields).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{key}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                <CollapsibleSection title="Histórico de Interações (Visão 360º)">
                  <div className="space-y-6">
                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <ICONS.Automation width="14" height="14" /> AI Summary
                        </h5>
                        <button 
                          onClick={() => handleAISummary(selectedLead.interactions || [])}
                          disabled={isSummarizing}
                          className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                        >
                          {isSummarizing ? 'Gerando...' : 'Atualizar Resumo'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                        {aiSummary || "Clique em 'Atualizar Resumo' para gerar um resumo executivo desta conta."}
                      </p>
                    </div>

                    <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                      {(selectedLead.interactions || [
                        { id: '1', type: 'status_change', title: 'Lead Criado', content: 'Lead entrou no funil via importação.', created_at: selectedLead.created_at },
                        { id: '2', type: 'note', title: 'Nota Adicionada', content: selectedLead.notes || 'Nenhuma nota inicial.', created_at: selectedLead.created_at }
                      ]).map((interaction, idx) => (
                        <div key={interaction.id} className="flex gap-6 relative">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center z-10 shadow-sm border-2 border-white dark:border-slate-900 ${
                            interaction.type === 'email' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                            interaction.type === 'call' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                            interaction.type === 'meeting' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                            'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {interaction.type === 'email' ? <ICONS.Mail width="18" height="18" /> :
                             interaction.type === 'call' ? <ICONS.Phone width="18" height="18" /> :
                             interaction.type === 'meeting' ? <ICONS.Collaboration width="18" height="18" /> :
                             <ICONS.Plus width="18" height="18" />}
                          </div>
                          <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{interaction.title}</h5>
                              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{new Date(interaction.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{interaction.content}</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-4 flex flex-wrap gap-3">
                         <button className="flex-1 min-w-[120px] py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">+ Nota</button>
                         <button className="flex-1 min-w-[120px] py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">+ Ligação</button>
                         <button className="flex-1 min-w-[120px] py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">+ Reunião</button>
                         <button className="flex-1 min-w-[120px] py-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-900/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all">Logar E-mail</button>
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            </div>

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
                  value={wonData.monthly_value}
                  onChange={e => setWonData({...wonData, monthly_value: Number(e.target.value)})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Tipo de Serviço</label>
                <input 
                  placeholder="Ex: Gestão de Tráfego"
                  value={wonData.service_type}
                  onChange={e => setWonData({...wonData, service_type: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                />
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: João Silva" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                    <input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="joao@empresa.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
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
    </div>
  );
};

export default SalesCRM;
