
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
      const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
      if (!apiKey) {
        alert("API Key não configurada.");
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
          <div className="w-full md:w-[750px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-700">
            <div className="p-10 border-b border-slate-50 flex justify-between items-start">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white font-black text-3xl shadow-2xl">{selectedLead.name.charAt(0)}</div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900">{selectedLead.name}</h3>
                  <p className="text-slate-400 font-black uppercase text-[11px] tracking-widest">{selectedLead.company}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDeleteLead(selectedLead.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all">Excluir</button>
                <button onClick={() => setSelectedLead(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl transition-all">Fechar</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-12">
               <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                    <p className="text-[11px] font-black text-blue-400 uppercase mb-3">Valor do Negócio</p>
                    <p className="text-4xl font-black text-blue-700">R$ {Number(selectedLead.value).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => handleEnrichSingleLead(selectedLead)}
                    disabled={isEnriching}
                    className="flex-1 p-8 bg-indigo-600 text-white rounded-[2.5rem] font-black flex flex-col items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isEnriching ? <span className="animate-spin text-2xl">◌</span> : <ICONS.Automation width="32" height="32" />}
                    <span className="text-xs uppercase tracking-widest">{isEnriching ? "ENRIQUECENDO..." : "ENRIQUECER COM IA"}</span>
                  </button>
               </div>
               
               <div className="space-y-4">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Notas & Insights</p>
                  <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-600 font-medium leading-relaxed">
                    {selectedLead.notes || "Nenhuma nota disponível."}
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => window.open(`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`, '_blank')} className="flex items-center justify-between p-7 bg-white border border-slate-100 rounded-[2rem] hover:border-emerald-400 transition-all">
                     <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><ICONS.MessageCircle /></div>
                        <p className="text-base font-black text-slate-800">Abrir WhatsApp</p>
                     </div>
                  </button>
                  <a href={`mailto:${selectedLead.email}`} className="flex items-center justify-between p-7 bg-white border border-slate-100 rounded-[2rem] hover:border-blue-400 transition-all">
                     <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><ICONS.Mail /></div>
                        <p className="text-base font-black text-slate-800">Enviar E-mail</p>
                     </div>
                  </a>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesCRM;
