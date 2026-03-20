
import React, { useState } from 'react';
import { Pipeline, Lead, Interaction, Company, Contact, User } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { formatPhoneBR, formatCNPJ } from '../utils/formatters';
import { GoogleGenAI } from "@google/genai";
import { aiService } from '../services/aiService';

interface SalesCRMProps {
  pipelines: Pipeline[];
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  onStatusChange: (leadId: string, status: 'won' | 'lost' | 'active', extraData?: any) => Promise<void>;
  onImportLeads?: () => void;
  companies: Company[];
  contacts: Contact[];
  currentUser: User | null;
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

const SalesCRM: React.FC<SalesCRMProps> = ({ pipelines, activePipelineId, setActivePipelineId, leads, setLeads, onStatusChange, onImportLeads, companies, contacts, currentUser }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    niche: '', service_type: '', proposed_ticket: 0,
    company_id: '', contact_id: ''
  });
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '', cnpj: '', city: '', state: '', segment: '', phone: '', website: '', instagram: ''
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
      const companyId = companyData[0].id;
      
      // Handle primary contact
      if (contactMode === 'create' && primaryContact.name) {
        await supabase
          .from('m4_contacts')
          .insert([{
            ...primaryContact,
            company_id: companyId,
            workspace_id: currentUser?.workspace_id,
            is_primary: true
          }]);
      } else if (contactMode === 'select' && selectedContactId) {
        await supabase
          .from('m4_contacts')
          .update({ company_id: companyId, is_primary: true })
          .eq('id', selectedContactId);
      }

      setNewLead({ ...newLead, company_id: companyData[0].id, company: companyData[0].name });
      setIsCompanyModalOpen(false);
      setNewCompany({ name: '', cnpj: '', city: '', state: '', segment: '', phone: '', website: '', instagram: '' });
      setPrimaryContact({ name: '', email: '', phone: '', role: '' });
      setSelectedContactId('');
      setContactSearch('');
      setContactMode('select');
      window.location.reload();
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
      setNewLead({ ...newLead, contact_id: data[0].id, name: data[0].name, email: data[0].email, phone: data[0].phone });
      setIsContactModalOpen(false);
      setNewContact({ name: '', email: '', phone: '', role: '', company_id: '' });
      window.location.reload();
    }
    setIsSyncing(false);
  };

  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    
    // Encontrar dados da empresa selecionada se houver
    const selectedCompany = companies.find(c => c.id === newLead.company_id);
    const selectedContact = contacts.find(c => c.id === newLead.contact_id);

    const leadData = {
      ...newLead,
      company: selectedCompany?.name || newLead.company,
      name: selectedContact?.name || newLead.name,
      email: selectedContact?.email || newLead.email,
      phone: selectedContact?.phone || newLead.phone,
      pipeline_id: activePipelineId,
      stage_id: activePipeline.stages[0].id,
      workspace_id: currentUser?.workspace_id,
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
        niche: '', service_type: '', proposed_ticket: 0, next_action: '', next_action_date: '',
        company_id: '', contact_id: ''
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
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest">Nuvem Sincronizada</p>
              <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
              <p className="text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">{leads.filter(l => l.status === 'won').length} Ganhos este mês</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onImportLeads}
            className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
          >
            <ICONS.Database width="16" height="16" />
            Importar Leads (Planilha)
          </button>
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
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Novo Negócio</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Entidades (B2B)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Empresa</label>
                      <div className="flex gap-2">
                        <select 
                          value={newLead.company_id} 
                          onChange={e => {
                            const comp = companies.find(c => c.id === e.target.value);
                            setNewLead({...newLead, company_id: e.target.value, company: comp?.name || ''});
                          }} 
                          className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                        >
                          <option value="">Selecionar Empresa</option>
                          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button 
                          type="button" 
                          onClick={() => setIsCompanyModalOpen(true)}
                          className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all"
                          title="Nova Empresa"
                        >
                          <ICONS.Plus />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Contato</label>
                      <div className="flex gap-2">
                        <select 
                          value={newLead.contact_id} 
                          onChange={e => {
                            const cont = contacts.find(c => c.id === e.target.value);
                            setNewLead({...newLead, contact_id: e.target.value, name: cont?.name || '', email: cont?.email || '', phone: cont?.phone || ''});
                          }} 
                          className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                        >
                          <option value="">Selecionar Contato</option>
                          {contacts.filter(c => !newLead.company_id || c.company_id === newLead.company_id).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <button 
                          type="button" 
                          onClick={() => setIsContactModalOpen(true)}
                          className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all"
                          title="Novo Contato"
                          disabled={!newLead.company_id}
                        >
                          <ICONS.Plus />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {!newLead.company_id && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase">Ou cadastre manualmente:</p>
                      <div className="grid grid-cols-2 gap-4">
                        <input placeholder="Nome da Empresa" value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold" />
                        <input placeholder="Nome do Contato" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Dados do Negócio</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="email" placeholder="E-mail" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" />
                    <input required placeholder="WhatsApp" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Nicho/Segmento" value={newLead.niche} onChange={e => setNewLead({...newLead, niche: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                    <input placeholder="Tipo de Serviço" value={newLead.service_type} onChange={e => setNewLead({...newLead, service_type: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Valor Total</label>
                      <input type="number" placeholder="Valor Estimado" value={newLead.value} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Ticket Mensal</label>
                      <input type="number" placeholder="Ticket Proposto" value={newLead.proposed_ticket} onChange={e => setNewLead({...newLead, proposed_ticket: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50">
                  {isSyncing ? "SALVANDO..." : "CRIAR NEGÓCIO"}
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
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedLead.name}</h3>
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
                </div>
              </div>
              <div className="flex gap-3">
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
                <button onClick={() => setSelectedLead(null)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                  FECHAR
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="bg-white dark:bg-slate-900">
                <CollapsibleSection title="Negociação">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nome</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Qualificação</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.qualification || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">AI Score</p>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-black ${
                          (selectedLead.ai_score || 0) > 70 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                          (selectedLead.ai_score || 0) > 40 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {selectedLead.ai_score || 'N/A'}
                        </div>
                        {selectedLead.ai_reasoning && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic" title={selectedLead.ai_reasoning}>
                            {selectedLead.ai_reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Probabilidade</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.probability || 0}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Temperatura</p>
                      <p className={`text-sm font-bold ${
                        selectedLead.temperature === 'Quente' ? 'text-orange-600 dark:text-orange-400' :
                        selectedLead.temperature === 'Morno' ? 'text-blue-600 dark:text-blue-400' :
                        'text-slate-600 dark:text-slate-400'
                      }`}>{selectedLead.temperature || 'Frio'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nicho / Segmento</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.niche || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Serviço Principal</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.service_type || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ticket Proposto</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {Number(selectedLead.proposed_ticket || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Próxima Ação</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{selectedLead.next_action || 'Definir ação'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Próxima Ação</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.next_action_date || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor total</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {Number(selectedLead.value).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Previsão de fechamento</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.closing_forecast || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fonte</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.source || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Campanha</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.campaign || 'N/A'}</p>
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

                <CollapsibleSection title="Contatos">
                  <div className="space-y-8">
                    {(selectedLead.contacts || []).map((contact, idx) => (
                      <div key={idx} className="space-y-6">
                        <div className="flex items-center gap-3">
                          <p className="text-base font-black text-slate-900 dark:text-white">{contact.name}</p>
                          <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                            <ICONS.User width="12" height="12" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <button onClick={() => window.open(`tel:${contact.phone.replace(/\D/g, '')}`, '_blank')} className="flex items-center gap-4 group">
                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                              <ICONS.Phone width="18" height="18" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Telefone</p>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{contact.phone ? formatPhoneBR(contact.phone) : 'N/A'}</p>
                            </div>
                          </button>
                          <button onClick={() => window.open(`mailto:${contact.email}`, '_blank')} className="flex items-center gap-4 group">
                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                              <ICONS.Mail width="18" height="18" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">E-mail</p>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{contact.email || 'N/A'}</p>
                            </div>
                          </button>
                          <button 
                            onClick={() => window.open(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(contact.email)}`, '_blank')}
                            className="flex items-center gap-4 group"
                          >
                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl flex items-center justify-center group-hover:bg-red-50 dark:group-hover:bg-red-900/30 group-hover:text-red-600 dark:group-hover:text-red-400 transition-all">
                              <ICONS.ExternalLink width="18" height="18" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gmail</p>
                              <p className="text-sm font-bold text-red-600 dark:text-red-400">Ver conversas</p>
                            </div>
                          </button>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-4">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Informações adicionais</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Cargo</p>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{contact.role || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Link Whatsapp</p>
                              <button onClick={() => window.open(`https://wa.me/${contact.phone.replace(/\D/g, '')}`, '_blank')} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">Abrir conversa</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-600 text-[11px] font-black uppercase tracking-widest hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                      + Adicionar contato
                    </button>
                  </div>
                </CollapsibleSection>

            <CollapsibleSection title="Empresa">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nome</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.company}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">E-mail</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.company_email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cidade</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.city || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">CNPJ</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.cnpj ? formatCNPJ(selectedLead.cnpj) : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Razão Social</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.legal_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Telefone</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.company_phone ? formatPhoneBR(selectedLead.company_phone) : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Instagram</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.instagram || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800">
                <button onClick={() => window.open(selectedLead.website || `https://www.google.com/search?q=${encodeURIComponent(selectedLead.company)}`, '_blank')} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest hover:underline">
                  Abrir página da Empresa <ICONS.ExternalLink width="14" height="14" />
                </button>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Responsável">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-black">
                  {selectedLead.responsible_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Responsável</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.responsible_name || 'Não atribuído'}</p>
                </div>
              </div>
            </CollapsibleSection>

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

          <div className="p-10 space-y-6">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Notas & Insights</p>
            <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium leading-relaxed shadow-sm">
              {selectedLead.notes || "Nenhuma nota disponível."}
            </div>
          </div>
        </div>

        <div className="p-10 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-4 shrink-0">
          <button 
            onClick={() => {
              setWonData({
                ...wonData,
                monthly_value: Number(selectedLead.proposed_ticket || selectedLead.value || 0),
                service_type: selectedLead.service_type || ''
              });
              setIsWonModalOpen(true);
            }}
            className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${selectedLead.status === 'won' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 dark:shadow-none' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}`}
          >
            MARCAR COMO GANHO
          </button>
          <button 
            onClick={() => onStatusChange(selectedLead.id, 'lost')}
            className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${selectedLead.status === 'lost' ? 'bg-red-600 text-white shadow-xl shadow-red-100 dark:shadow-none' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'}`}
          >
            MARCAR COMO PERDIDO
          </button>
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
    </div>
  );
};

export default SalesCRM;
