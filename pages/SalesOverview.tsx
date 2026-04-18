
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead, Pipeline, User, PipelineStage, FunnelStatus } from '../types';
import { funnelUtils } from '../utils/funnel';
import { ICONS } from '../constants';
import { leadService } from '../services/leadService';
import { LeadImportWizard } from '../components/LeadImportWizard';
import { ChevronRight, Building, DollarSign, User as UserIcon, Globe, Mail, Instagram, Linkedin, Phone, MessageSquare, Briefcase, FileText, X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatCNPJ, formatPhoneBR } from '../utils/formatters';
import FunnelDashboard from '../components/FunnelDashboard';

interface SalesOverviewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  pipelines: Pipeline[];
  setActiveTab: (tab: string) => void;
  setActivePipelineId?: (id: string) => void;
  onNewLead: () => void;
  currentUser: User | null;
  fetchLeads?: () => Promise<void>;
}

const PIPELINE_OPTIONS = [
  { id: 'e167f4e8-4a19-4ab7-b655-f104004f8bf4', name: 'Vendas Comercial' },
  { id: '6262f0d6-8e20-496b-8076-f24e31e67fab', name: 'Gestão de Reuniões' }
];

const SalesOverview: React.FC<SalesOverviewProps> = ({ leads, setLeads, pipelines, setActiveTab, setActivePipelineId, onNewLead, currentUser, fetchLeads }) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState(() => {
    return pipelines[0]?.id || '';
  });
  const [recentLeadsFilter, setRecentLeadsFilter] = useState<'all' | 'with_pipeline' | 'without_pipeline'>('all');
  const [showAllRecentLeads, setShowAllRecentLeads] = useState(false);
  const [dbPipelines, setDbPipelines] = useState<any[]>(PIPELINE_OPTIONS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [selectedPipelineForEdit, setSelectedPipelineForEdit] = React.useState<string>('');

  React.useEffect(() => {
    supabase.from('m4_pipelines').select('id, name').order('name').then(({ data, error }) => {
      console.log('dbPipelines carregados:', data, error);
      if (data?.length) setDbPipelines(data);
    });
  }, []);

  const pipelineOptions = dbPipelines;

  console.log('pipelines carregados (prop):', pipelines);
  console.log('pipelines do banco (local):', dbPipelines);

  React.useEffect(() => {
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // Se o pipeline selecionado não for um UUID mas temos pipelines com UUIDs carregados,
    // atualizamos para o primeiro pipeline válido do banco.
    if (!isValidUUID(selectedPipelineId)) {
      const firstValid = pipelines.find(p => isValidUUID(p.id));
      if (firstValid) {
        setSelectedPipelineId(firstValid.id);
      } else if (pipelines.length > 0 && !selectedPipelineId) {
        setSelectedPipelineId(pipelines[0].id);
      }
    }
  }, [pipelines, selectedPipelineId]);

  const summary = funnelUtils.getLeadSummaryCounts(leads, pipelines);
  const activeLeads = leads.filter(l => funnelUtils.isLeadActive(l, pipelines));
  const totalValue = summary.totalValue;
  
  const filteredRecentLeads = [...leads]
    .filter(l => {
      if (recentLeadsFilter === 'with_pipeline') return !!(l as any).pipeline_id;
      if (recentLeadsFilter === 'without_pipeline') return !(l as any).pipeline_id;
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const recentLeads = showAllRecentLeads ? filteredRecentLeads : filteredRecentLeads.slice(0, 10);

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    console.log('Iniciando exclusão do lead:', selectedLead.id);
    
    try {
      await leadService.delete(selectedLead.id);
      console.log('Lead excluído com sucesso do banco');
      setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
      setSelectedLead(null);
      setIsEditingLead(false);
      setIsDeleting(false);
      alert('Lead excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const onImportComplete = (importedLeads: Lead[]) => {
    setLeads(importedLeads);
    if (fetchLeads) fetchLeads();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Pipelines de Vendas</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Visão Geral e Desempenho</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
          >
            {pipelineOptions.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all hover:-translate-y-1"
            >
              <ICONS.Upload width="20" height="20" /> IMPORTAR
            </button>
            <button 
              onClick={onNewLead}
              className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-1"
            >
              <ICONS.Plus /> NOVO LEAD
            </button>
          </div>
        </div>
      </div>

      <FunnelDashboard 
        leads={leads.filter(l => l.pipeline_id === selectedPipelineId || (!l.pipeline_id && selectedPipelineId === pipelines[0]?.id))} 
        stages={pipelines.find(p => p.id === selectedPipelineId)?.stages || []} 
        pipelines={pipelines}
      />

      {/* Import Wizard */}
      <LeadImportWizard
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        pipelines={pipelines}
        currentUser={currentUser}
        onImportComplete={onImportComplete}
      />

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none space-y-8 pb-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ICONS.Sales width="32" height="32" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads Ativos</p>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white">{activeLeads.length}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ICONS.Transactions width="32" height="32" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor em Pipeline</p>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
              </h3>
            </div>
          </div>
        </div>

        {/* Pipelines List */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight ml-2">Seus Funis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pipelines.length === 0 ? (
              <div className="col-span-full p-10 text-center text-slate-400 font-bold italic animate-pulse">Carregando pipelines...</div>
            ) : (
              pipelines.map(pipeline => {
                const pipelineLeads = activeLeads.filter(l => (l as any).pipeline_id === pipeline.id);
                const pipelineValue = pipelineLeads.reduce((acc, l) => acc + (l.value || 0), 0);
                
                return (
                  <button 
                    key={pipeline.id}
                    onClick={() => {
                      if (setActivePipelineId) {
                        setActivePipelineId(pipeline.id);
                        setActiveTab('sales');
                      } else {
                        setActiveTab(`pipeline_${pipeline.id}`);
                      }
                    }}
                    className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-blue-500 dark:hover:border-blue-400 transition-all text-left group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ICONS.Sales width="20" height="20" />
                      </div>
                      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                        {pipelineLeads.length} leads
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{pipeline.name}</h4>
                    <p className="text-slate-400 text-xs font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pipelineValue)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Leads Recentes</h3>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setRecentLeadsFilter('all')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${recentLeadsFilter === 'all' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setRecentLeadsFilter('with_pipeline')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${recentLeadsFilter === 'with_pipeline' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Com Pipeline
              </button>
              <button 
                onClick={() => setRecentLeadsFilter('without_pipeline')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${recentLeadsFilter === 'without_pipeline' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Sem Pipeline
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {recentLeads.length > 0 ? (
              recentLeads.map(lead => (
                <div 
                  key={lead.id} 
                  onClick={() => setSelectedLead(lead)}
                  className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {lead.contact_name ? lead.contact_name.charAt(0) : '?'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{lead.company_name || lead.contact_name || 'Sem Nome'}</p>
                      <div className="flex items-center gap-2">
                        {lead.company_name && lead.contact_name && (
                          <>
                            <p className="text-[10px] text-slate-500 font-bold">{lead.contact_name}</p>
                            <span className="text-[8px] text-slate-300 font-black">•</span>
                          </>
                        )}
                        <p className="text-[10px] text-slate-400 uppercase font-black">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                      {pipelines.find(p => p.id === (lead as any).pipeline_id)?.name || 'Sem Pipeline'}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                      funnelUtils.resolveLeadStatus(lead, funnelUtils.resolveLeadStage(lead, pipelines)) === FunnelStatus.WON ? 'bg-emerald-50 text-emerald-600' :
                      funnelUtils.resolveLeadStatus(lead, funnelUtils.resolveLeadStage(lead, pipelines)) === FunnelStatus.LOST ? 'bg-rose-50 text-rose-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {funnelUtils.resolveLeadStatus(lead, funnelUtils.resolveLeadStage(lead, pipelines))}
                    </span>
                    <ChevronRight className="text-slate-300 group-hover:text-blue-600 transition-colors" size={16} />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-slate-400 font-bold italic">Nenhum lead cadastrado</div>
            )}
          </div>
          
          {filteredRecentLeads.length > 10 && (
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-50 dark:border-slate-800 flex justify-center">
              <button 
                onClick={() => setShowAllRecentLeads(!showAllRecentLeads)}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                {showAllRecentLeads ? 'Mostrar Menos' : 'Ver Todos'}
                <ICONS.ChevronDown className={`transition-transform duration-300 ${showAllRecentLeads ? 'rotate-180' : ''}`} width="14" height="14" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lead Details Modal */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate min-w-0">
                      {isEditingLead ? 'Editando Lead' : (selectedLead.company_name || selectedLead.contact_name)}
                    </h2>
                    {!isEditingLead && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setIsEditingLead(true);
                            setEditedLead(selectedLead);
                            setSelectedPipelineForEdit(selectedLead.pipeline_id || '');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all"
                        >
                          ✏️ Editar Lead
                        </button>
                        
                        {!isDeleting ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDeleting(true);
                            }}
                            className="flex items-center justify-center w-10 h-10 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all border border-rose-100"
                            title="Excluir Lead"
                          >
                            <Trash2 size={20} />
                          </button>
                        ) : (
                          <div className="flex gap-2 animate-in fade-in zoom-in duration-300">
                            <button 
                              onClick={handleDeleteLead}
                              className="px-3 py-2 bg-rose-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-rose-700 transition-all shadow-sm"
                            >
                              Confirmar?
                            </button>
                            <button 
                              onClick={() => setIsDeleting(false)}
                              className="px-3 py-2 bg-slate-100 text-slate-600 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                              Não
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black px-2 py-1 bg-blue-600 text-white rounded-lg uppercase tracking-widest">
                      {pipelines.find(p => p.id === (selectedLead as any).pipeline_id)?.name || 'Sem Pipeline'}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                      selectedLead.status === 'won' ? 'bg-emerald-100 text-emerald-600' :
                      selectedLead.status === 'lost' ? 'bg-rose-100 text-rose-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {selectedLead.status}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedLead(null);
                    setIsEditingLead(false);
                    setIsDeleting(false);
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 transition-all shadow-sm border border-slate-100 dark:border-slate-700 shrink-0"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Pipeline Selector (Always show when editing) */}
                {isEditingLead && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">PIPELINE</h4>
                    <select
                      value={selectedPipelineForEdit}
                      onChange={e => setSelectedPipelineForEdit(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="">— Selecione um Pipeline —</option>
                      {dbPipelines.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Empresa */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <Building size={14} />
                      Informações da Empresa
                    </h4>
                    <div className="grid grid-cols-1 gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <EditableInfoItem 
                        label="Nome da Empresa" 
                        value={editedLead.company_name} 
                        originalValue={selectedLead.company_name}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, company_name: val })}
                      />
                      <EditableInfoItem 
                        label="CNPJ" 
                        value={editedLead.company_cnpj} 
                        originalValue={selectedLead.company_cnpj}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, company_cnpj: formatCNPJ(val) })}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <EditableInfoItem 
                          label="Cidade" 
                          value={editedLead.company_city} 
                          originalValue={selectedLead.company_city}
                          isEditing={isEditingLead}
                          onChange={(val) => setEditedLead({ ...editedLead, company_city: val })}
                        />
                        <EditableInfoItem 
                          label="Estado" 
                          value={editedLead.company_state} 
                          originalValue={selectedLead.company_state}
                          isEditing={isEditingLead}
                          onChange={(val) => setEditedLead({ ...editedLead, company_state: val })}
                        />
                      </div>
                      <EditableInfoItem 
                        label="Segmento" 
                        value={editedLead.company_niche} 
                        originalValue={selectedLead.company_niche}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, company_niche: val })}
                      />
                      <EditableInfoItem 
                        label="Website" 
                        value={editedLead.company_website} 
                        originalValue={selectedLead.company_website}
                        isEditing={isEditingLead}
                        isLink
                        onChange={(val) => setEditedLead({ ...editedLead, company_website: val })}
                      />
                      <EditableInfoItem 
                        label="Instagram Empresa" 
                        value={editedLead.company_instagram} 
                        originalValue={selectedLead.company_instagram}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, company_instagram: val })}
                      />
                      <EditableInfoItem 
                        label="LinkedIn Empresa" 
                        value={editedLead.company_linkedin} 
                        originalValue={selectedLead.company_linkedin}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, company_linkedin: val })}
                      />
                      <EditableInfoItem 
                        label="E-mail da Empresa" 
                        value={editedLead.company_email} 
                        originalValue={selectedLead.company_email}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, company_email: val })}
                      />
                      <EditableInfoItem 
                        label="Telefone da Empresa" 
                        value={editedLead.company_phone} 
                        originalValue={selectedLead.company_phone}
                        isEditing={isEditingLead}
                        isWhatsApp
                        onChange={(val) => setEditedLead({ ...editedLead, company_phone: formatPhoneBR(val) })}
                      />
                    </div>
                  </div>

                  {/* Contato */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <UserIcon size={14} />
                      Informações de Contato
                    </h4>
                    <div className="grid grid-cols-1 gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <EditableInfoItem 
                        label="Nome" 
                        value={editedLead.contact_name} 
                        originalValue={selectedLead.contact_name}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, contact_name: val })}
                      />
                      <EditableInfoItem 
                        label="Cargo" 
                        value={editedLead.contact_role} 
                        originalValue={selectedLead.contact_role}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, contact_role: val })}
                      />
                      <EditableInfoItem 
                        label="E-mail" 
                        value={editedLead.contact_email} 
                        originalValue={selectedLead.contact_email}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, contact_email: val })}
                      />
                      <EditableInfoItem 
                        label="Telefone" 
                        value={editedLead.contact_phone} 
                        originalValue={selectedLead.contact_phone}
                        isEditing={isEditingLead}
                        isWhatsApp
                        onChange={(val) => setEditedLead({ ...editedLead, contact_phone: formatPhoneBR(val) })}
                      />
                      <EditableInfoItem 
                        label="Instagram" 
                        value={editedLead.contact_instagram} 
                        originalValue={selectedLead.contact_instagram}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, contact_instagram: val })}
                      />
                      <EditableInfoItem 
                        label="LinkedIn" 
                        value={editedLead.contact_linkedin} 
                        originalValue={selectedLead.contact_linkedin}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, contact_linkedin: val })}
                      />
                    </div>
                  </div>
                </div>

                {/* Negócio */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={14} />
                    Detalhes do Negócio
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <EditableInfoItem 
                      label="Valor Estimado" 
                      value={editedLead.value} 
                      originalValue={formatCurrency(selectedLead.value || 0)}
                      isEditing={isEditingLead}
                      type="number"
                      onChange={(val) => setEditedLead({ ...editedLead, value: Number(val) })}
                    />
                    <EditableInfoItem 
                      label="Tipo de Serviço" 
                      value={editedLead.service_type} 
                      originalValue={selectedLead.service_type}
                      isEditing={isEditingLead}
                      onChange={(val) => setEditedLead({ ...editedLead, service_type: val })}
                    />
                    <EditableInfoItem 
                      label="Previsão" 
                      value={editedLead.closing_forecast} 
                      originalValue={selectedLead.closing_forecast}
                      isEditing={isEditingLead}
                      type="date"
                      onChange={(val) => setEditedLead({ ...editedLead, closing_forecast: val })}
                    />
                    <EditableInfoItem 
                      label="Temperatura" 
                      value={editedLead.temperature} 
                      originalValue={selectedLead.temperature}
                      isEditing={isEditingLead}
                      type="select"
                      options={['Frio', 'Morno', 'Quente']}
                      onChange={(val) => setEditedLead({ ...editedLead, temperature: val as any })}
                    />
                    <EditableInfoItem 
                      label="Probabilidade (%)" 
                      value={editedLead.probability} 
                      originalValue={selectedLead.probability ? `${selectedLead.probability}%` : '0%'}
                      isEditing={isEditingLead}
                      type="number"
                      onChange={(val) => setEditedLead({ ...editedLead, probability: Number(val) })}
                    />
                    <div className="md:col-span-3">
                      <EditableInfoItem 
                        label="Notas da Negociação" 
                        value={editedLead.business_notes} 
                        originalValue={selectedLead.business_notes}
                        isEditing={isEditingLead}
                        isTextArea
                        onChange={(val) => setEditedLead({ ...editedLead, business_notes: val })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                {isEditingLead ? (
                  <>
                    <button 
                      onClick={() => setIsEditingLead(false)}
                      className="px-8 py-4 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-300 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const updated = await leadService.update(selectedLead.id, { 
                            ...editedLead,
                            pipeline_id: selectedPipelineForEdit || null 
                          });
                          
                          setSelectedLead(updated)
                          setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l))
                          
                          // Refresh all leads to ensure state is fully updated
                          if (fetchLeads) {
                            await fetchLeads();
                          }
                          
                          setIsEditingLead(false)
                          
                        } catch (e: any) {
                          alert('Erro ao salvar: ' + e.message)
                        }
                      }}
                      className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                    >
                      Salvar Alterações
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setSelectedLead(null)}
                    className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
                  >
                    Fechar
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EditableInfoItem: React.FC<{ 
  label: string; 
  value: any; 
  originalValue: any;
  isEditing: boolean;
  isLink?: boolean;
  isWhatsApp?: boolean;
  isTextArea?: boolean;
  type?: string;
  options?: string[];
  onChange: (val: string) => void;
}> = ({ label, value, originalValue, isEditing, isLink, isWhatsApp, isTextArea, type = "text", options = [], onChange }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    {isEditing ? (
      isTextArea ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px]"
        />
      ) : type === "select" ? (
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        >
          <option value="">Selecione...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      )
    ) : (
      originalValue ? (
        <div className="flex items-center gap-2">
          {isLink ? (
            <a href={originalValue.startsWith('http') ? originalValue : `https://${originalValue}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline break-all">
              {originalValue}
            </a>
          ) : (
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 break-all">{originalValue}</p>
          )}
          {isWhatsApp && (
            <button 
              onClick={() => window.open(`https://wa.me/55${originalValue.replace(/\D/g, '')}`, '_blank')}
              className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
              title="Conversar no WhatsApp"
            >
              <MessageSquare width="12" height="12" />
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm font-medium text-slate-300 italic">Não informado</p>
      )
    )}
  </div>
);

export default SalesOverview;
