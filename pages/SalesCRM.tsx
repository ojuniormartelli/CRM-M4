
import React, { useState } from 'react';
import { Pipeline, Lead } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";

interface SalesCRMProps {
  pipelines: Pipeline[];
  activePipelineId: string;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
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

const SalesCRM: React.FC<SalesCRMProps> = ({ pipelines, activePipelineId, leads, setLeads }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  
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
      const apiKey = process.env.GEMINI_API_KEY;
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

Retorne APENAS um objeto JSON válido com: name, company, value, notes.`;

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

  const getLeadsByStage = (stageId: string) => leads.filter(l => l.pipelineId === activePipelineId && l.stageId === stageId);
  const calculateStageTotal = (stageId: string) => getLeadsByStage(stageId).reduce((acc, curr) => acc + Number(curr.value), 0);

  return (
    <div className="space-y-10 h-full flex flex-col relative animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{activePipeline.name}</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Nuvem Sincronizada</p>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all hover:-translate-y-1">
            <ICONS.Plus /> NOVO NEGÓCIO
          </button>
        </div>
      </div>

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
                    className="bg-white p-6 rounded-[1.75rem] border border-slate-200 shadow-sm transition-all cursor-grab active:cursor-grabbing group hover:shadow-xl hover:-translate-y-1 hover:border-blue-400"
                  >
                    <span className="text-[9px] uppercase tracking-[0.15em] font-black text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-100/50 mb-4 inline-block">{lead.company}</span>
                    <h4 className="font-black text-slate-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">{lead.name}</h4>
                    <p className="text-xs text-slate-400 font-bold line-clamp-2 mb-6">{lead.notes}</p>
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
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">{selectedLead.company}</p>
                </div>
              </div>
              <div className="flex gap-3">
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
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Criada em</p>
                      <p className="text-sm font-bold text-slate-900">{new Date(selectedLead.createdAt).toLocaleString('pt-BR')}</p>
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
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.city || 'N/A'}</p>
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
              </div>

              <div className="p-10 space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas & Insights</p>
                <div className="p-8 bg-white rounded-[2rem] border border-slate-100 text-slate-600 font-medium leading-relaxed shadow-sm">
                  {selectedLead.notes || "Nenhuma nota disponível."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesCRM;
