
import React, { useState } from 'react';
import { Pipeline, Lead, Interaction } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import { aiService } from '../services/aiService';

interface SalesCRMProps {
  pipelines: Pipeline[];
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  onStatusChange: (leadId: string, status: 'won' | 'lost' | 'active') => Promise<void>;
}

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-6 px-10 hover:bg-slate-50 transition-all group"
      >
        <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-[0.2em]">{title}</h4>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ICONS.ChevronDown width="16" height="16" className="text-slate-400" />
        </div>
      </button>
      {isOpen && <div className="px-10 pb-10 animate-in fade-in slide-in-from-top-2 duration-300">{children}</div>}
    </div>
  );
};

const SalesCRM: React.FC<SalesCRMProps> = ({ pipelines, activePipelineId, setActivePipelineId, leads, setLeads, onStatusChange }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isAIScoring, setIsAIScoring] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    name: '', company: '', email: '', phone: '', value: 0, notes: ''
  });

  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    const leadData = {
      ...newLead,
      pipelineId: activePipelineId,
      stageId: activePipeline.stages[0].id,
      createdAt: new Date().toISOString()
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
      setNewLead({ name: '', company: '', email: '', phone: '', value: 0, notes: '' });
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
      setLeads(leads.map(l => l.id === leadId ? { ...l, stageId: targetStageId } : l));
      
      const { error } = await supabase
        .from('m4_leads')
        .update({ stageId: targetStageId })
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
6. Sugira uma 'closingForecast' (ex: 2024-12-15).

Retorne APENAS um objeto JSON válido com: name, company, value, notes, probability, temperature, closingForecast.`;

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
        .update({ aiScore: result.score, aiReasoning: result.reasoning })
        .eq('id', lead.id);

      if (!error) {
        const updatedLead = { ...lead, aiScore: result.score, aiReasoning: result.reasoning };
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


  const getLeadsByStage = (stageId: string) => leads.filter(l => l.pipelineId === activePipelineId && l.stageId === stageId && (l.status === 'active' || !l.status));
  const calculateStageTotal = (stageId: string) => getLeadsByStage(stageId).reduce((acc, curr) => acc + Number(curr.value), 0);

  const isStale = (lead: Lead) => {
    const activityDate = lead.lastActivityAt ? new Date(lead.lastActivityAt) : new Date(lead.createdAt);
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    return activityDate < fiveDaysAgo;
  };

  return (
    <div className="space-y-10 h-full flex flex-col relative animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">{activePipeline.name}</h2>
              <button 
                onClick={() => setIsPipelineModalOpen(true)}
                className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                title="Trocar Pipeline"
              >
                <ICONS.ChevronDown width="20" height="20" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nuvem Sincronizada</p>
              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
              <p className="text-blue-600 font-bold text-xs uppercase tracking-widest">{leads.filter(l => l.status === 'won').length} Ganhos este mês</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all hover:-translate-y-1">
            <ICONS.Plus /> NOVO NEGÓCIO
          </button>
        </div>
      </div>

      {isPipelineModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase">Selecionar Pipeline</h3>
              <button onClick={() => setIsPipelineModalOpen(false)} className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-all">
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
                  className={`w-full p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${activePipelineId === p.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-blue-200 bg-slate-50/30'}`}
                >
                  <div>
                    <p className={`font-black uppercase text-xs tracking-widest ${activePipelineId === p.id ? 'text-blue-600' : 'text-slate-400'}`}>Pipeline</p>
                    <p className="font-bold text-slate-900 mt-1">{p.name}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${activePipelineId === p.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white group-hover:border-blue-300'}`}>
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
              className={`w-[360px] flex flex-col bg-slate-100/30 rounded-[2.5rem] border transition-all duration-500 p-3 ${draggedLeadId ? 'border-blue-300 border-dashed bg-blue-50/20' : 'border-slate-200/40'}`}
            >
              <div className="p-6 flex justify-between items-center bg-white/60 rounded-[2rem] border-b border-slate-200/50 mb-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <h3 className="font-black text-slate-900 text-[12px] uppercase tracking-[0.2em]">{stage.name}</h3>
                  <div className="w-5 h-5 bg-indigo-50 text-indigo-400 rounded-lg flex items-center justify-center" title="Automações Ativas">
                    <ICONS.Automation width="12" height="12" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-slate-900 px-3 py-1 rounded-full text-[10px] font-black text-white">{getLeadsByStage(stage.id).length}</span>
                  <p className="text-[10px] font-black text-slate-400 mt-1">R$ {calculateStageTotal(stage.id).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-2 space-y-5 overflow-y-auto flex-1 max-h-[calc(100vh-340px)] scrollbar-none pb-6">
                {getLeadsByStage(stage.id).map((lead) => (
                  <div 
                    key={lead.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, lead.id)}
                    onClick={() => setSelectedLead(lead)}
                    className={`bg-white p-6 rounded-[1.75rem] border shadow-sm transition-all cursor-grab active:cursor-grabbing group hover:shadow-xl hover:-translate-y-1 ${isStale(lead) ? 'border-red-200 bg-red-50/10' : 'border-slate-200 hover:border-blue-400'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[9px] uppercase tracking-[0.15em] font-black text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-100/50 inline-block max-w-full break-words">{lead.company}</span>
                      {isStale(lead) && (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Negócio parado!"></div>
                      )}
                    </div>
                    <h4 className="font-black text-slate-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">{lead.name}</h4>
                    <p className="text-xs text-slate-400 font-bold mb-6">{lead.notes}</p>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        lead.temperature === 'Quente' ? 'bg-orange-100 text-orange-600' :
                        lead.temperature === 'Morno' ? 'bg-blue-100 text-blue-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {lead.temperature || 'Frio'}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lead.probability || 0}% Prob.</div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                      <div className="font-black text-slate-900 text-base">R$ {Number(lead.value).toLocaleString()}</div>
                      <img src={`https://i.pravatar.cc/120?u=${lead.id}`} className="w-9 h-9 rounded-2xl border-4 border-white shadow-xl" alt="Owner" />
                    </div>
                  </div>
                ))}
                <button onClick={() => setIsModalOpen(true)} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] hover:border-blue-400 hover:text-blue-600 hover:bg-white transition-all">+ NOVO LEAD</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase">Cadastrar no Supabase</h3>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <input required placeholder="Nome do Contato" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" />
              <input required placeholder="Empresa" value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" />
              <input required type="email" placeholder="E-mail" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" />
              <input required placeholder="WhatsApp" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" />
              <input type="number" placeholder="Valor Estimado" value={newLead.value} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50">
                  {isSyncing ? "SALVANDO..." : "SALVAR NA NUVEM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex justify-end">
          <div className="w-full md:w-[750px] bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-700">
            <div className="p-10 bg-white border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-200">{selectedLead.name.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedLead.name}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">{selectedLead.company}</p>
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      selectedLead.status === 'won' ? 'bg-emerald-100 text-emerald-600' :
                      selectedLead.status === 'lost' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-600'
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
                  className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all disabled:opacity-50"
                  title="Score com IA"
                >
                  {isAIScoring ? <span className="animate-spin block">◌</span> : <ICONS.Plus width="20" height="20" />}
                </button>
                <button 
                  onClick={() => handleEnrichSingleLead(selectedLead)}
                  disabled={isEnriching}
                  className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all disabled:opacity-50"
                  title="Enriquecer com IA"
                >
                  {isEnriching ? <span className="animate-spin block">◌</span> : <ICONS.Automation width="20" height="20" />}
                </button>
                <button onClick={() => handleDeleteLead(selectedLead.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all" title="Excluir">
                  <ICONS.X width="20" height="20" />
                </button>
                <button onClick={() => setSelectedLead(null)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all">
                  FECHAR
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="bg-white">
                <CollapsibleSection title="Negociação">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qualificação</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.qualification || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Score</p>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-black ${
                          (selectedLead.aiScore || 0) > 70 ? 'bg-emerald-100 text-emerald-700' :
                          (selectedLead.aiScore || 0) > 40 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {selectedLead.aiScore || 'N/A'}
                        </div>
                        {selectedLead.aiReasoning && (
                          <p className="text-[10px] text-slate-400 font-medium italic" title={selectedLead.aiReasoning}>
                            {selectedLead.aiReasoning}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Probabilidade</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.probability || 0}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temperatura</p>
                      <p className={`text-sm font-bold ${
                        selectedLead.temperature === 'Quente' ? 'text-orange-600' :
                        selectedLead.temperature === 'Morno' ? 'text-blue-600' :
                        'text-slate-600'
                      }`}>{selectedLead.temperature || 'Frio'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor total</p>
                      <p className="text-sm font-bold text-slate-900">R$ {Number(selectedLead.value).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previsão de fechamento</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.closingForecast || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fonte</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.source || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campanha</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.campaign || 'N/A'}</p>
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Contatos">
                  <div className="space-y-8">
                    {(selectedLead.contacts || []).map((contact, idx) => (
                      <div key={idx} className="space-y-6">
                        <div className="flex items-center gap-3">
                          <p className="text-base font-black text-slate-900">{contact.name}</p>
                          <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <ICONS.User width="12" height="12" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <button onClick={() => window.open(`tel:${contact.phone.replace(/\D/g, '')}`, '_blank')} className="flex items-center gap-4 group">
                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                              <ICONS.Phone width="18" height="18" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</p>
                              <p className="text-sm font-bold text-slate-700">{contact.phone || 'N/A'}</p>
                            </div>
                          </button>
                          <button onClick={() => window.open(`mailto:${contact.email}`, '_blank')} className="flex items-center gap-4 group">
                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                              <ICONS.Mail width="18" height="18" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                              <p className="text-sm font-bold text-slate-700">{contact.email || 'N/A'}</p>
                            </div>
                          </button>
                          <button 
                            onClick={() => window.open(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(contact.email)}`, '_blank')}
                            className="flex items-center gap-4 group"
                          >
                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-600 transition-all">
                              <ICONS.ExternalLink width="18" height="18" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gmail</p>
                              <p className="text-sm font-bold text-red-600">Ver conversas</p>
                            </div>
                          </button>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações adicionais</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cargo</p>
                              <p className="text-sm font-bold text-slate-700">{contact.role || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Link Whatsapp</p>
                              <button onClick={() => window.open(`https://wa.me/${contact.phone.replace(/\D/g, '')}`, '_blank')} className="text-sm font-bold text-blue-600 hover:underline">Abrir conversa</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-[11px] font-black uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all">
                      + Adicionar contato
                    </button>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Empresa">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.company}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.companyEmail || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.city || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CNPJ</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.cnpj || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razão Social</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.legalName || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.companyPhone || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instagram</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.instagram || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="mt-8 pt-8 border-t border-slate-50">
                    <button onClick={() => window.open(selectedLead.website || `https://www.google.com/search?q=${encodeURIComponent(selectedLead.company)}`, '_blank')} className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">
                      Abrir página da Empresa <ICONS.ExternalLink width="14" height="14" />
                    </button>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Responsável">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black">
                      {selectedLead.responsibleName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.responsibleName || 'Não atribuído'}</p>
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Histórico de Interações (Visão 360º)">
                  <div className="space-y-6">
                    <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                          <ICONS.Automation width="14" height="14" /> AI Summary
                        </h5>
                        <button 
                          onClick={() => handleAISummary(selectedLead.interactions || [])}
                          disabled={isSummarizing}
                          className="text-[10px] font-black text-indigo-600 hover:underline disabled:opacity-50"
                        >
                          {isSummarizing ? 'Gerando...' : 'Atualizar Resumo'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                        {aiSummary || "Clique em 'Atualizar Resumo' para gerar um resumo executivo desta conta."}
                      </p>
                    </div>

                    <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {(selectedLead.interactions || [
                      { id: '1', type: 'status_change', title: 'Lead Criado', content: 'Lead entrou no funil via importação.', createdAt: selectedLead.createdAt },
                      { id: '2', type: 'note', title: 'Nota Adicionada', content: selectedLead.notes || 'Nenhuma nota inicial.', createdAt: selectedLead.createdAt }
                    ]).map((interaction, idx) => (
                      <div key={interaction.id} className="flex gap-6 relative">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center z-10 shadow-sm border-2 border-white ${
                          interaction.type === 'email' ? 'bg-blue-50 text-blue-600' :
                          interaction.type === 'call' ? 'bg-emerald-50 text-emerald-600' :
                          interaction.type === 'meeting' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {interaction.type === 'email' ? <ICONS.Mail width="18" height="18" /> :
                           interaction.type === 'call' ? <ICONS.Phone width="18" height="18" /> :
                           interaction.type === 'meeting' ? <ICONS.Collaboration width="18" height="18" /> :
                           <ICONS.Plus width="18" height="18" />}
                        </div>
                        <div className="flex-1 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">{interaction.title}</h5>
                            <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(interaction.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">{interaction.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 flex flex-wrap gap-3">
                       <button className="flex-1 min-w-[120px] py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">+ Nota</button>
                       <button className="flex-1 min-w-[120px] py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">+ Ligação</button>
                       <button className="flex-1 min-w-[120px] py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">+ Reunião</button>
                       <button className="flex-1 min-w-[120px] py-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-100 transition-all">Logar E-mail</button>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
              </div>

              <div className="p-10 space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas & Insights</p>
                <div className="p-8 bg-white rounded-[2rem] border border-slate-100 text-slate-600 font-medium leading-relaxed shadow-sm">
                  {selectedLead.notes || "Nenhuma nota disponível."}
                </div>
              </div>
            </div>

            <div className="p-10 bg-white border-t border-slate-100 flex gap-4 shrink-0">
              <button 
                onClick={() => onStatusChange(selectedLead.id, 'won')}
                className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${selectedLead.status === 'won' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
              >
                MARCAR COMO GANHO
              </button>
              <button 
                onClick={() => onStatusChange(selectedLead.id, 'lost')}
                className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${selectedLead.status === 'lost' ? 'bg-red-600 text-white shadow-xl shadow-red-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              >
                MARCAR COMO PERDIDO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesCRM;
