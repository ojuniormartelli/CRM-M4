
import React, { useState, useEffect } from 'react';
import { Pipeline, PipelineStage, Lead, Interaction, Company, Contact, User, LeadTemperature, Task, FormTemplate, FormResponse, Priority, TaskStatus, Service, FunnelStatus, M4Client } from '../types';
import { FinanceBankAccount } from '../types/finance';
import { ICONS } from '../constants';
import { mappers } from '../lib/mappers';
import { supabase } from '../lib/supabase';
import { formatPhoneBR, formatCNPJ } from '../utils/formatters';
import { GoogleGenAI } from "@google/genai";
import { aiService } from '../services/aiService';
import { leadService } from '../services/leadService';
import { clientService } from '../services/clientService';
import { metricsUtils } from '../utils/metrics';
import { funnelUtils } from '../utils/funnel';
import { useCRMStore } from '../lib/store';
import { leadSchema } from '../lib/validation';
import { LeadSkeleton } from '../components/Skeleton';
import ConfirmDangerModal from '../components/ConfirmDangerModal';
import Toast, { ToastType } from '../components/Toast';
import { LayoutGrid, SortAsc, SortDesc, Trash2, X, Edit, Plus, Clock, ArrowRight, ChevronDown, MessageSquare, Calendar, List, FileText, Package, CheckCircle2, AlertCircle, Sparkles, Brain, Linkedin, Instagram, Phone, Mail, Users, Archive, Ban, Maximize2, Minimize2, Briefcase, Globe, MapPin, Percent } from 'lucide-react';
import { ClientServiceContract, servicesUtils } from '../utils/services';

interface SalesCRMProps {
  pipelines: Pipeline[];
  setPipelines: React.Dispatch<React.SetStateAction<Pipeline[]>>;
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onStatusChange: (leadId: string, status: 'won' | 'lost' | 'active', extraData?: Record<string, unknown>) => Promise<void>;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  currentUser: User | null;
  services: Service[];
  bankAccounts: FinanceBankAccount[];
  isModalOpen?: boolean;
  setIsModalOpen?: (isOpen: boolean) => void;
  renderOnlyModal?: boolean;
  setActiveTab: (tab: string) => void;
  workspaceId: string;
  clients?: M4Client[];
  setClients?: React.Dispatch<React.SetStateAction<M4Client[]>>;
  selectedLeadId?: string | null;
  setSelectedLeadId?: (id: string | null) => void;
  setSelectedClientId?: (id: string | null) => void;
}

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-4 px-6 hover:bg-muted/50 transition-all group"
      >
        <h4 className="text-sm font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-[0.2em]">{title}</h4>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ICONS.ChevronDown width="16" height="16" className="text-muted-foreground" />
        </div>
      </button>
      {isOpen && <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">{children}</div>}
    </div>
  );
};

interface MultiSelectServicesProps {
  selectedServices: string[];
  onChange: (services: string[]) => void;
  servicesList: { id: string; name: string; default_price?: number }[];
  placeholder?: string;
}

const MultiSelectServices: React.FC<MultiSelectServicesProps> = ({
  selectedServices = [],
  onChange,
  servicesList = [],
  placeholder = "Selecione os serviços..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleService = (serviceName: string) => {
    let updated: string[];
    if (selectedServices.includes(serviceName)) {
      updated = selectedServices.filter(s => s !== serviceName);
    } else {
      updated = [...selectedServices, serviceName];
    }
    onChange(updated);
  };

  const handleRemove = (e: React.MouseEvent, serviceName: string) => {
    e.stopPropagation();
    onChange(selectedServices.filter(s => s !== serviceName));
  };

  const filteredServices = servicesList.filter(s =>
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[48px] p-2.5 bg-muted rounded-2xl border-none font-bold text-foreground flex flex-wrap gap-1.5 items-center cursor-pointer select-none relative"
      >
        {selectedServices.length === 0 ? (
          <span className="text-muted-foreground text-xs ml-2">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selectedServices.map((serviceName, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] uppercase font-black tracking-normal px-2.5 py-1 rounded-xl shadow-xs"
              >
                {serviceName}
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, serviceName)}
                  className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-all cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="ml-auto pr-1">
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-[300] overflow-hidden max-h-[300px] flex flex-col">
          <div className="p-2.5 border-b border-border shrink-0">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar serviço..."
              className="w-full p-2.5 bg-muted rounded-xl border-none text-xs font-bold text-foreground focus:outline-none"
            />
          </div>
          <div className="overflow-y-auto p-1 py-1.5 space-y-0.5 scrollbar-none">
            {filteredServices.length === 0 ? (
              <p className="text-[10px] font-black text-muted-foreground uppercase py-4 text-center">Nenhum serviço encontrado</p>
            ) : (
              filteredServices.map((service) => {
                const isSelected = selectedServices.includes(service.name);
                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.name)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-muted/50 transition-all select-none text-xs font-bold uppercase tracking-tight ${
                      isSelected ? 'text-primary bg-primary/5' : 'text-foreground'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded text-primary focus:ring-primary w-4 h-4 pointer-events-none border-border"
                    />
                    <span>{service.name}</span>
                    {service.default_price && service.default_price > 0 && (
                      <span className="ml-auto text-[10px] text-muted-foreground font-medium">
                        R$ {service.default_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
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
    <div className="flex items-center w-full px-4 md:px-6 py-3 md:py-4 bg-card border-b border-border gap-2 md:gap-4 shrink-0 overflow-hidden">
      {onMove && (
        <button 
          onClick={() => onMove('prev')}
          disabled={currentIndex <= 0 || isUpdating}
          className="flex items-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground hover:bg-muted/80 rounded-xl transition-all disabled:opacity-30 shrink-0 font-black text-[9px] md:text-[10px] uppercase tracking-widest"
        >
          <ArrowRight className="w-3 h-3 rotate-180" />
          <span className="hidden xs:inline">Voltar</span>
        </button>
      )}

      <div className="flex items-center flex-1 justify-center gap-1 md:gap-3 overflow-hidden">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div 
              className={`flex flex-col items-center min-w-[60px] md:min-w-[90px] relative group ${onStageClick && !isUpdating ? 'cursor-pointer' : ''}`}
              onClick={() => onStageClick && !isUpdating && onStageClick(stage.id)}
            >
              <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[9px] md:text-xs font-black z-10 transition-all duration-500 border md:border-2 ${
                index === currentIndex 
                  ? 'bg-primary text-primary-foreground border-primary/20 shadow-lg shadow-primary/20 scale-110' 
                  : index < currentIndex
                    ? 'bg-primary/10 text-primary border-transparent'
                    : 'bg-muted text-muted-foreground border-transparent'
              } ${onStageClick && !isUpdating && index !== currentIndex ? 'group-hover:scale-105 group-hover:border-primary/30' : ''}`}>
                {index < currentIndex ? <ICONS.Check width="12" height="12" /> : index + 1}
              </div>
              <span className={`mt-1.5 text-[7px] md:text-[8px] font-black uppercase tracking-tight text-center transition-colors duration-500 line-clamp-1 max-w-full px-0.5 ${
                index === currentIndex ? 'text-primary' : 'text-muted-foreground'
              } ${onStageClick && !isUpdating && index !== currentIndex ? 'group-hover:text-foreground' : ''}`}>
                {stage.name}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div className={`flex-1 h-[1px] min-w-[5px] md:min-w-[15px] -mt-5 md:-mt-6 rounded-full transition-colors duration-1000 ${
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
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all disabled:opacity-30 shadow-lg shadow-primary/20 shrink-0 font-black text-[9px] md:text-[10px] uppercase tracking-widest"
        >
          <span className="hidden xs:inline">Avançar</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

const isRecurrentService = (name: string): boolean => {
  const nameL = name.toLowerCase();
  return (
    nameL.includes('tráfego') ||
    nameL.includes('gestão') ||
    nameL.includes('mensal') ||
    nameL.includes('retentor') ||
    nameL.includes('recorrente') ||
    nameL.includes('ads') ||
    nameL.includes('social') ||
    nameL.includes('suporte') ||
    nameL.includes('squad') ||
    nameL.includes('assessoria') ||
    nameL.includes('seo') ||
    nameL.includes('feed')
  );
};

interface LeadFinancialServiceBlockProps {
  servicesCatalog: Service[];
  selectedConfigs: ClientServiceContract[];
  onChange: (newConfigs: ClientServiceContract[]) => void;
}

const LeadFinancialServiceBlock: React.FC<LeadFinancialServiceBlockProps> = ({
  servicesCatalog = [],
  selectedConfigs = [],
  onChange
}) => {
  const handleCheckboxChange = (s: Service) => {
    const isChecked = selectedConfigs.some(item => item.name === s.name);
    let updatedConfigs = [...selectedConfigs];
    
    if (isChecked) {
      updatedConfigs = updatedConfigs.filter(item => item.name !== s.name);
    } else {
      const recurrent = isRecurrentService(s.name);
      const base_price_val = Number(s.default_price) || 0;
      updatedConfigs.push({
        name: s.name,
        price: base_price_val,
        billing_type: recurrent ? "recorrente" : "parcelado",
        installments: recurrent ? 1 : 3,
        installment_value: recurrent ? 0 : Math.round((base_price_val / 3) * 105) / 100, // standard calculation
        include_in_monthly: true,
        active: true,
        base_price: base_price_val,
        custom_price: undefined,
        use_custom_price: false
      });
    }
    onChange(updatedConfigs);
  };

  const handleTypeChange = (idx: number, billing_type: 'recorrente' | 'parcelado') => {
    const newConfigs = [...selectedConfigs];
    const config = newConfigs[idx];
    const isRecurrent = billing_type === 'recorrente';
    newConfigs[idx] = {
      ...config,
      billing_type,
      installments: isRecurrent ? 1 : 3,
      installment_value: isRecurrent ? 0 : Math.round((config.price / 3) * 100) / 100
    };
    onChange(newConfigs);
  };

  const handlePriceChange = (idx: number, val: number) => {
    const newConfigs = [...selectedConfigs];
    const config = newConfigs[idx];
    newConfigs[idx] = {
      ...config,
      price: val,
      custom_price: val,
      use_custom_price: true,
      installment_value: config.billing_type === 'parcelado' ? Math.round((val / (config.installments || 3)) * 100) / 100 : 0
    };
    onChange(newConfigs);
  };

  const handleInstallmentsChange = (idx: number, val: number) => {
    const newConfigs = [...selectedConfigs];
    const config = newConfigs[idx];
    const sanitVal = Math.max(1, val);
    newConfigs[idx] = {
      ...config,
      installments: sanitVal,
      installment_value: Math.round((config.price / sanitVal) * 100) / 100
    };
    onChange(newConfigs);
  };

  const recSum = selectedConfigs
    .filter(c => c.billing_type === 'recorrente')
    .reduce((sum, c) => sum + (c.price || 0), 0);

  const insSum = selectedConfigs
    .filter(c => c.billing_type === 'parcelado' && c.include_in_monthly)
    .reduce((sum, c) => sum + (c.installments && c.installments > 0 ? ((c.price || 0) / c.installments) : 0), 0);

  const totalMonthly = recSum + insSum;

  return (
    <div className="space-y-6">
      {/* Services selector checklists */}
      <div className="space-y-3 pb-3">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block ml-1">Serviços Propostos</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {servicesCatalog.map(s => {
            const isChecked = selectedConfigs.some(item => item.name === s.name);
            return (
              <label 
                key={s.id || s.name} 
                className={`flex items-center gap-3 p-4 border rounded-2xl cursor-pointer hover:bg-muted/50 transition-all select-none ${
                  isChecked ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-muted/20"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleCheckboxChange(s)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-xs font-black text-foreground uppercase tracking-tight leading-none mb-1">{s.name}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">R$ {s.default_price?.toLocaleString('pt-BR') || '0,00'}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Pricing custom configuration tables */}
      {selectedConfigs.length > 0 && (
        <div className="space-y-4 p-5 bg-muted/25 rounded-3xl border border-border/60">
          <h5 className="text-[10px] font-black text-foreground uppercase tracking-wider mb-2">Configuração Avançada de Preços</h5>
          
          <div className="space-y-3">
            {selectedConfigs.map((config, idx) => {
              const isRecurrent = config.billing_type === 'recorrente';
              return (
                <div key={config.name + idx} className="p-4 bg-card border border-border rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-sm">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-foreground uppercase tracking-tight">{config.name}</span>
                    <div className="flex gap-2 mt-1.5 text-[9px] font-black">
                      <button
                        type="button"
                        onClick={() => handleTypeChange(idx, 'recorrente')}
                        className={`px-2 py-1 rounded-lg ${isRecurrent ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground'}`}
                      >
                        🔁 RECORRENTE
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTypeChange(idx, 'parcelado')}
                        className={`px-2 py-1 rounded-lg ${!isRecurrent ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-muted text-muted-foreground'}`}
                      >
                        📅 PARCELADO
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-28 space-y-1">
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Preço Acordado (R$)</span>
                      <input
                        type="number"
                        value={config.price || ''}
                        onChange={e => handlePriceChange(idx, Number(e.target.value))}
                        className="w-full bg-muted border-0 rounded-lg p-2 text-xs font-bold text-foreground"
                        placeholder="0"
                      />
                    </div>
                    {!isRecurrent && (
                      <div className="w-20 space-y-1">
                        <span className="text-[9px] font-black uppercase text-muted-foreground block">Parcelas</span>
                        <input
                          type="number"
                          min="1"
                          value={config.installments || 3}
                          onChange={e => handleInstallmentsChange(idx, Number(e.target.value))}
                          className="w-full bg-muted border-0 rounded-lg p-2 text-xs font-bold text-foreground"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Consolidated financial summary Section C */}
          <div className="space-y-4 pt-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Seção C — Resumo Financeiro Consolidado</span>
            <div className="p-5 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase">
                <span>Mensal Recorrente (Recorrência)</span>
                <span className="text-foreground">R$ {recSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase border-b border-border pb-2">
                <span>Parcelas Ativas Projetadas</span>
                <span className="text-foreground">R$ {insSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-xs font-black text-foreground uppercase tracking-tight">Mensalidade Atual Estimada</span>
                <span className="text-lg font-black text-primary">R$ {totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
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
  renderOnlyModal = false,
  setActiveTab,
  workspaceId,
  clients = [],
  setClients,
  selectedLeadId,
  setSelectedLeadId,
  setSelectedClientId
}) => {
  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Sync selectedLead and selectedLeadId
  useEffect(() => {
    if (selectedLeadId && leads.length > 0) {
      const match = leads.find(l => l.id === selectedLeadId);
      if (match) {
        setSelectedLead(match);
      }
    }
  }, [selectedLeadId, leads]);

  // Keep selectedLead in sync with the latest data in the leads stream to avoid stale views
  useEffect(() => {
    if (selectedLead) {
      const latest = leads.find(l => l.id === selectedLead.id);
      if (latest) {
        // Only trigger set state if some values have actually mutated to avoid unnecessary renders
        if (
          latest.stage !== selectedLead.stage ||
          latest.status !== selectedLead.status ||
          latest.value !== selectedLead.value ||
          latest.pipeline_id !== selectedLead.pipeline_id ||
          JSON.stringify(latest.custom_fields) !== JSON.stringify(selectedLead.custom_fields) ||
          latest.company_name !== selectedLead.company_name ||
          latest.contact_name !== selectedLead.contact_name ||
          latest.next_action !== selectedLead.next_action ||
          latest.next_action_date !== selectedLead.next_action_date
        ) {
          setSelectedLead(latest);
        }
      } else {
        // Closed if it was deleted
        setSelectedLead(null);
      }
    }
  }, [leads, selectedLead?.id]);

  useEffect(() => {
    if (selectedLead === null && selectedLeadId && setSelectedLeadId) {
      setSelectedLeadId(null);
    }
  }, [selectedLead, selectedLeadId, setSelectedLeadId]);

  // --- AUTOMACAO ONBOARDING -> OPERACAO ---
  const [onboardingConversion, setOnboardingConversion] = useState<{
    isOpen: boolean;
    lead: Lead;
    targetStageId: string;
    company_name: string;
    cnpj: string;
    status: 'active' | 'paused' | 'churned';
    contract_start_date: string;
    monthly_value: number;
    services: string[];
    manager_id: string;
    company_id: string;
    contact_id: string;
    contact_name: string;
    contact_email: string;
    contact_whatsapp: string;
    contact_instagram: string;
    notes: string;
    services_configs?: ClientServiceContract[];
    company_city?: string;
    company_state?: string;
    company_niche?: string;
    company_website?: string;
    company_email?: string;
    company_instagram?: string;
    company_linkedin?: string;
    company_whatsapp?: string;
    contact_role?: string;
    contact_linkedin?: string;
    contact_notes?: string;
    value?: number;
    proposed_ticket?: number;
    source?: string;
    campaign?: string;
    closing_forecast?: string;
    temperature?: string;
    probability?: number;
    custom_fields?: Record<string, any>;
  } | null>(null);

  const [duplicateWarning, setDuplicateWarning] = useState<{
    isOpen: boolean;
    lead: Lead;
    targetStageId: string;
    existingClient: any;
    reason: string;
  } | null>(null);

  // Check duplicity logic
  const checkDuplicity = async (lead: Lead) => {
    if (!workspaceId) return null;
    
    // 1. check duplicate by lead_id
    const { data: byLead, error: errLead } = await supabase
      .from('m4_clients')
      .select('*, company:m4_companies(*)')
      .eq('lead_id', lead.id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .maybeSingle();
      
    if (byLead) {
      return { client: byLead, reason: `Já existe um cliente operacional vinculado a este lead comercial: ${byLead.company_name} (ID: ${byLead.id}).` };
    }
    
    // 2. check duplicate by company_id
    if (lead.company_id) {
      const { data: byCompany, error: errComp } = await supabase
        .from('m4_clients')
        .select('*, company:m4_companies(*)')
        .eq('company_id', lead.company_id)
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .maybeSingle();
        
      if (byCompany) {
        return { client: byCompany, reason: `Já existe um cliente operacional vinculado a esta mesma empresa parceira: ${byCompany.company_name} (ID: ${byCompany.id}).` };
      }
    }
    
    // 3. check duplicate by CNPJ
    const cnpjToCheck = (lead.company_cnpj || (lead as any).cnpj || '').replace(/\D/g, '');
    if (cnpjToCheck) {
      const { data: allClients, error: errAll } = await supabase
        .from('m4_clients')
        .select('*, company:m4_companies(*)')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null);
        
      if (allClients) {
        const found = allClients.find(c => {
          const clientCnpj = (c.company?.cnpj || '').replace(/\D/g, '');
          return clientCnpj === cnpjToCheck;
        });
        if (found) {
          return { client: found, reason: `Já existe um cliente operacional com o mesmo CNPJ (${lead.company_cnpj || (lead as any).cnpj}) cadastrado: ${found.company_name} (ID: ${found.id}).` };
        }
      }
    }
    
    return null;
  };

  // Helper case-insensitive, accent-insensitive
  const isOnboardingConcluidoStage = (stageName?: string) => {
    if (!stageName) return false;
    const normalized = stageName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return normalized === 'onboarding concluido' || normalized === 'onboarding concluído';
  };

  const handleStageTransitionCheck = async (lead: Lead, targetStageId: string, isFromDragAndDrop: boolean, originalStageId: string) => {
    const targetStage = activePipeline.stages.find(s => s.id === targetStageId);
    if (!targetStage) return false;

    if (isOnboardingConcluidoStage(targetStage.name)) {
      setIsSyncing(true);
      try {
        const duplicityResult = await checkDuplicity(lead);
        if (duplicityResult) {
          setDuplicateWarning({
            isOpen: true,
            lead,
            targetStageId,
            existingClient: duplicityResult.client,
            reason: duplicityResult.reason
          });
          setIsSyncing(false);
          return true; // we handled this!
        } else {
          // Pre-fill fields
          // Prefill services with custom configurations
          let initialConfigs: ClientServiceContract[] = [];
          if (lead.services && lead.services.length > 0) {
            initialConfigs = servicesUtils.parseClientServices(lead.services, services);
          }

          if (initialConfigs.length === 0) {
            let leadServices: string[] = [];
            if (Array.isArray(lead.services) && lead.services.length > 0) {
              leadServices = [...lead.services];
            } else if (lead.service_type) {
              leadServices.push(lead.service_type);
            }

            initialConfigs = leadServices.map(srvName => {
              // Handle JSON or plain string
              if (srvName && srvName.trim().startsWith('{')) {
                try {
                  const p = JSON.parse(srvName);
                  if (p.name) return p;
                } catch(e) {}
              }
              const matchedCatalog = services.find(s => s.name?.toLowerCase() === srvName?.toLowerCase());
              const defaultPrice = matchedCatalog ? Number(matchedCatalog.default_price) : 0;
              const recurrent = isRecurrentService(srvName);
              return {
                name: srvName,
                price: defaultPrice,
                billing_type: recurrent ? 'recorrente' : 'parcelado',
                installments: recurrent ? 1 : 3,
                installment_value: recurrent ? 0 : Math.round((defaultPrice / 3) * 100) / 100,
                include_in_monthly: true,
                active: true,
                base_price: defaultPrice,
                custom_price: undefined,
                use_custom_price: false
              } as ClientServiceContract;
            });
          }

          // Build leadServices as names array for legacy fields
          const leadServices = initialConfigs.map(c => c.name);

          // Calculate initial totals
          const initialRecurrentSum = initialConfigs
            .filter(c => c.billing_type === 'recorrente')
            .reduce((acc, c) => acc + c.price, 0);

          const initialInstallmentSum = initialConfigs
            .filter(c => c.billing_type === 'parcelado' && c.include_in_monthly)
            .reduce((acc, c) => acc + (c.installments && c.installments > 0 ? (c.price / c.installments) : 0), 0);

          const calculatedValue = initialRecurrentSum + initialInstallmentSum;

          setOnboardingConversion({
            isOpen: true,
            lead,
            targetStageId,
            company_name: lead.company_name || 'Sem empresa',
            cnpj: lead.company_cnpj || (lead as any).cnpj || '',
            status: 'active',
            contract_start_date: new Date().toISOString().split('T')[0],
            monthly_value: calculatedValue > 0 ? calculatedValue : (lead.proposed_ticket || lead.value || 0),
            services: leadServices,
            manager_id: lead.responsible_id || currentUser?.id || '',
            company_id: lead.company_id || '',
            contact_id: lead.contact_id || '',
            contact_name: lead.contact_name || 'Sem nome',
            contact_email: lead.contact_email || lead.email || '',
            contact_whatsapp: lead.contact_whatsapp || lead.whatsapp || '',
            contact_instagram: lead.contact_instagram || '',
            notes: lead.business_notes || lead.notes || '',
            services_configs: initialConfigs,
            // Extra company fields
            company_city: lead.company_city || '',
            company_state: lead.company_state || '',
            company_niche: lead.company_niche || '',
            company_website: lead.company_website || '',
            company_email: lead.company_email || '',
            company_instagram: lead.company_instagram || '',
            company_linkedin: lead.company_linkedin || '',
            company_whatsapp: lead.company_whatsapp || '',
            // Extra contact fields
            contact_role: lead.contact_role || '',
            contact_linkedin: lead.contact_linkedin || '',
            contact_notes: lead.contact_notes || '',
            // Deal business fields
            value: calculatedValue > 0 ? calculatedValue : (lead.value || 0),
            proposed_ticket: calculatedValue > 0 ? calculatedValue : (lead.proposed_ticket || 0),
            source: lead.source || '',
            campaign: lead.campaign || '',
            closing_forecast: lead.closing_forecast || '',
            temperature: lead.temperature || 'Frio',
            probability: lead.probability || 0,
            custom_fields: lead.custom_fields || {}
          });
          setIsSyncing(false);
          return true; // we handled this!
        }
      } catch (err) {
        console.error("Erro na verificação de transição de onboarding:", err);
        showToast("Erro ao processar transição de onboarding", "error");
        setIsSyncing(false);
        return false;
      }
    }
    return false;
  };

  const handleCancelConversion = () => {
    setOnboardingConversion(null);
    showToast("Conversão de onboarding cancelada pelo usuário.", "warning");
  };

  const handleCloseDuplicateWarning = () => {
    setDuplicateWarning(null);
  };

  const handleOpenExistingClient = () => {
    setDuplicateWarning(null);
    setActiveTab('clients');
    showToast("Navegando para a página operacional existente.", "success");
  };

  const updateServicesConfigsAndCalculations = (newConfigs: ClientServiceContract[]) => {
    if (!onboardingConversion) return;
    
    const processedConfigs = newConfigs.map(c => {
      const bPrice = c.base_price !== undefined ? c.base_price : c.price;
      const effectivePrice = c.use_custom_price && c.custom_price !== undefined ? c.custom_price : bPrice;
      const installmentVal = c.billing_type === 'parcelado' ? Number((effectivePrice / (c.installments || 1)).toFixed(2)) : 0;
      return {
        ...c,
        base_price: bPrice,
        price: effectivePrice,
        installment_value: installmentVal
      };
    });

    const recurrentTotal = processedConfigs
      .filter(c => c.billing_type === 'recorrente')
      .reduce((sum, c) => sum + (c.price || 0), 0);

    const installmentTotal = processedConfigs
      .filter(c => c.billing_type === 'parcelado' && c.include_in_monthly)
      .reduce((sum, c) => sum + (c.installments && c.installments > 0 ? ((c.price || 0) / c.installments) : 0), 0);

    const totalCurrentValue = recurrentTotal + installmentTotal;
    const serviceNames = processedConfigs.map(c => c.name);

    setOnboardingConversion({
      ...onboardingConversion,
      services_configs: processedConfigs,
      services: serviceNames,
      monthly_value: Number(totalCurrentValue.toFixed(2)),
      value: Number(totalCurrentValue.toFixed(2)),
      proposed_ticket: Number(totalCurrentValue.toFixed(2))
    });
  };

  const handleSaveConversion = async (andOpenPage: boolean) => {
    if (!onboardingConversion) return;
    if (!onboardingConversion.company_name) {
      showToast("O nome fantasia do cliente é obrigatório.", "error");
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Create or update company
      let finalCompanyId = onboardingConversion.company_id;
      if (!finalCompanyId) {
        const { data: newComp, error: errNewComp } = await supabase
          .from('m4_companies')
          .insert([
            mappers.company({
              name: onboardingConversion.company_name,
              cnpj: onboardingConversion.cnpj,
              whatsapp: onboardingConversion.company_whatsapp || onboardingConversion.contact_whatsapp,
              email: onboardingConversion.company_email || onboardingConversion.contact_email,
              instagram: onboardingConversion.company_instagram,
              notes: onboardingConversion.notes,
              website: onboardingConversion.company_website,
              city: onboardingConversion.company_city,
              state: onboardingConversion.company_state
            }, workspaceId)
          ])
          .select()
          .single();
        if (errNewComp) throw errNewComp;
        if (newComp) finalCompanyId = newComp.id;
      } else {
        const { error: errUpdateComp } = await supabase
          .from('m4_companies')
          .update(mappers.company({
            name: onboardingConversion.company_name,
            cnpj: onboardingConversion.cnpj,
            whatsapp: onboardingConversion.company_whatsapp || onboardingConversion.contact_whatsapp,
            email: onboardingConversion.company_email || onboardingConversion.contact_email,
            instagram: onboardingConversion.company_instagram,
            notes: onboardingConversion.notes,
            website: onboardingConversion.company_website,
            city: onboardingConversion.company_city,
            state: onboardingConversion.company_state
          }, workspaceId))
          .eq('id', finalCompanyId);
        if (errUpdateComp) throw errUpdateComp;
      }

      // 2. Create or update contact
      let finalContactId = onboardingConversion.contact_id;
      const contactPayload = {
        name: onboardingConversion.contact_name || 'Sem nome',
        email: onboardingConversion.contact_email,
        whatsapp: onboardingConversion.contact_whatsapp.replace(/\D/g, ''),
        instagram: onboardingConversion.contact_instagram,
        role: onboardingConversion.contact_role,
        linkedin: onboardingConversion.contact_linkedin,
        notes: onboardingConversion.contact_notes || onboardingConversion.notes,
        is_primary: true,
        company_id: finalCompanyId
      };
      
      if (!finalContactId) {
        const { data: newCont, error: errNewCont } = await supabase
          .from('m4_contacts')
          .insert([
            mappers.contact(contactPayload, workspaceId)
          ])
          .select()
          .single();
        if (errNewCont) throw errNewCont;
        if (newCont) finalContactId = newCont.id;
      } else {
        const { error: errUpdateCont } = await supabase
          .from('m4_contacts')
          .update(mappers.contact(contactPayload, workspaceId))
          .eq('id', finalContactId);
        if (errUpdateCont) throw errUpdateCont;
      }

      // 3. Mark lead as won and update its stage and relationships
      const updatedLead = await leadService.update(onboardingConversion.lead.id, {
        stage: onboardingConversion.targetStageId,
        company_id: finalCompanyId || undefined,
        contact_id: finalContactId || undefined,
        company_name: onboardingConversion.company_name,
        company_cnpj: onboardingConversion.cnpj,
        company_city: onboardingConversion.company_city,
        company_state: onboardingConversion.company_state,
        company_niche: onboardingConversion.company_niche,
        company_website: onboardingConversion.company_website,
        company_email: onboardingConversion.company_email,
        company_instagram: onboardingConversion.company_instagram,
        company_linkedin: onboardingConversion.company_linkedin,
        company_whatsapp: onboardingConversion.company_whatsapp,
        contact_name: onboardingConversion.contact_name,
        contact_role: onboardingConversion.contact_role,
        contact_email: onboardingConversion.contact_email,
        contact_instagram: onboardingConversion.contact_instagram,
        contact_linkedin: onboardingConversion.contact_linkedin,
        contact_whatsapp: onboardingConversion.contact_whatsapp,
        contact_notes: onboardingConversion.contact_notes,
        value: onboardingConversion.value,
        proposed_ticket: onboardingConversion.proposed_ticket,
        source: onboardingConversion.source,
        campaign: onboardingConversion.campaign,
        closing_forecast: onboardingConversion.closing_forecast || undefined,
        temperature: onboardingConversion.temperature as LeadTemperature,
        probability: onboardingConversion.probability,
        business_notes: onboardingConversion.notes,
        custom_fields: onboardingConversion.custom_fields,
        status: 'won' as any
      }, workspaceId);

      // Log interaction
      if (currentUser) {
        const interactionTask = {
          title: `Onboarding concluído - Cliente criado`,
          description: `Onboarding finalizado com sucesso. O cliente operacional ${onboardingConversion.company_name} foi criado no sistema.`,
          type: 'Outro' as const,
          status: 'Concluído',
          task_type: 'commercial' as const,
          lead_id: onboardingConversion.lead.id,
          company_id: finalCompanyId,
          interaction_success: true,
          due_date: new Date().toISOString()
        };
        const taskPayload = mappers.task(interactionTask, workspaceId);
        await supabase.from('m4_tasks').insert([taskPayload]);
      }

      // 4. Create the operational client
      const serialized = onboardingConversion.services_configs
        ? servicesUtils.serializeClientServices(onboardingConversion.services_configs.map(c => ({
            name: c.name,
            price: c.price,
            active: true,
            billing_type: c.billing_type,
            installments: c.installments,
            installment_value: c.installment_value,
            include_in_monthly: c.include_in_monthly,
            remaining_installments: c.installments,
            paid_installments: 0,
            base_price: c.base_price,
            custom_price: c.custom_price,
            use_custom_price: c.use_custom_price
          })))
        : onboardingConversion.services;

      const clientPayload: Partial<M4Client> = {
        lead_id: onboardingConversion.lead.id,
        company_id: finalCompanyId || undefined,
        company_name: onboardingConversion.company_name,
        status: onboardingConversion.status,
        contract_start_date: onboardingConversion.contract_start_date,
        monthly_value: onboardingConversion.monthly_value,
        services: serialized,
        manager_id: onboardingConversion.manager_id || undefined,
      };
      
      const createdClient = await clientService.create(clientPayload, workspaceId);

      // 5. Update local state
      if (setClients) {
        const latestClients = await clientService.getAll(workspaceId);
        setClients(latestClients);
      }
      
      const latestLeads = await leadService.getAll(workspaceId);
      setLeads(latestLeads);

      showToast(`Cliente operacional ${onboardingConversion.company_name} criado com sucesso!`, "success");
      setOnboardingConversion(null);
      
      if (andOpenPage) {
        if (createdClient && createdClient.id && setSelectedClientId) {
          setSelectedClientId(createdClient.id);
          
          // Also store in recents!
          try {
            const recentsJSON = localStorage.getItem('m4_recent_clients');
            let recents: string[] = recentsJSON ? JSON.parse(recentsJSON) : [];
            recents = recents.filter(id => id !== createdClient.id);
            recents.unshift(createdClient.id);
            recents = recents.slice(0, 3);
            localStorage.setItem('m4_recent_clients', JSON.stringify(recents));
            window.dispatchEvent(new Event('m4_recent_clients_changed'));
          } catch (e) {
            console.error('Failed to update recent clients:', e);
          }
        }
        setActiveTab('clients');
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Erro ao criar cliente operacional.", "error");
    } finally {
      setIsSyncing(false);
    }
  };
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
      workspace_id: workspaceId,
      answers: Object.entries(formAnswers).map(([question_id, value]) => ({ question_id, value })),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('m4_form_responses').insert([response]).select();

    if (!error && data) {
      setFormResponses([...formResponses, data[0] as FormResponse]);
      
      const newInteraction = {
        id: Math.random().toString(36), // Temporary ID for state
        lead_id: selectedLead.id,
        workspace_id: workspaceId,
        type: 'ai_insight',
        title: `Sondagem Realizada: ${selectedTemplate.title}`,
        content: `Formulário preenchido durante reunião. ${Object.keys(formAnswers).length} perguntas respondidas.`,
        created_at: new Date().toISOString(),
        interaction_success: true,
        task_type: 'commercial'
      };

      // Also add an interaction to the lead in DB
      await supabase.from('m4_interactions').insert([newInteraction]);

      setInteractions([newInteraction as any, ...interactions]);

      setIsExecutingForm(false);
      setSelectedTemplate(null);
      setFormAnswers({});
    }
    setIsSavingForm(false);
  };

  // Fetch form templates and responses
  useEffect(() => {
    const fetchFormTemplates = async () => {
      const { data } = await supabase.from('m4_form_templates').select('*').eq('workspace_id', workspaceId);
      if (data) setFormTemplates(data);
    };

    if (workspaceId) fetchFormTemplates();
  }, [workspaceId]);

  useEffect(() => {
    if (selectedLead && workspaceId) {
      const fetchFormResponses = async () => {
        const { data } = await supabase
          .from('m4_form_responses')
          .select('*')
          .eq('lead_id', selectedLead.id)
          .eq('workspace_id', workspaceId);
        if (data) setFormResponses(data);
      };

      fetchFormResponses();
    }
  }, [selectedLead, workspaceId]);

  // Fetch interactions (tasks + events)
  useEffect(() => {
    if (selectedLead && workspaceId) {
      const fetchInteractions = async () => {
        const { data: taskData } = await supabase
          .from('m4_tasks')
          .select('*')
          .eq('lead_id', selectedLead.id)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });
        
        const { data: activityData } = await supabase
          .from('m4_interactions')
          .select('*')
          .eq('lead_id', selectedLead.id)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        let combined = [...(taskData || [])];
        
        if (activityData) {
          activityData.forEach(act => {
            combined.push({
              id: act.id,
              title: act.title || 'Interação',
              description: act.content || act.note || '',
              type: act.type as any,
              status: 'Concluído',
              created_at: act.created_at,
              interaction_success: act.success !== false,
              task_type: 'commercial',
              is_legacy_interaction: true
            } as any);
          });
        }

        // Sort combined list by created_at desc
        combined.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setInteractions(combined as Task[]);
      };
      fetchInteractions();
    }
  }, [selectedLead, workspaceId]);

  const handleRegisterInteraction = async () => {
    if (!selectedLead || !interactionNote.trim() || !currentUser) return;

    setIsRegisteringInteraction(true);
    try {
      // 🛡️ CONSOLIDAÇÃO: Agora salvamos interações como tarefas concluídas do domínio comercial
      const interactionTask = {
        title: `${interactionType} (${interactionResult}): ${interactionNote.substring(0, 30)}${interactionNote.length > 30 ? '...' : ''}`,
        description: interactionNote,
        type: interactionType,
        status: 'Concluído',
        task_type: 'commercial' as const,
        lead_id: selectedLead.id,
        company_id: selectedLead.company_id,
        interaction_success: interactionResult !== 'Não atendeu',
        interaction_note: interactionNote,
        due_date: new Date().toISOString()
      };

      const payload = mappers.task(interactionTask, currentUser.workspace_id);

      const { data: interactionResultData, error } = await supabase
        .from('m4_tasks')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (interactionResultData) {
        setInteractions([interactionResultData as Task, ...interactions]);
        setTasks([interactionResultData as Task, ...tasks]); // Também atualiza a lista global de tarefas
        setInteractionNote('');
        setInteractionResult('Sucesso');
        setShowInteractionForm(false);
        showToast('Interação registrada com sucesso');
      }
    } catch (error: any) {
      console.error('Error registering interaction:', error);
      showToast(error.message || 'Erro ao registrar interação', 'error');
    } finally {
      setIsRegisteringInteraction(false);
    }
  };
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editLead, setEditLead] = useState<Partial<Lead>>({});
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editLeadData, setEditLeadData] = useState<Partial<Lead>>({});

  useEffect(() => {
    if (selectedLead) {
      setEditLeadData({
        company_name: selectedLead.company_name || '',
        company_cnpj: selectedLead.company_cnpj || '',
        company_city: selectedLead.company_city || '',
        company_state: selectedLead.company_state || '',
        company_niche: selectedLead.company_niche || '',
        company_website: selectedLead.company_website || '',
        company_email: selectedLead.company_email || '',
        company_instagram: selectedLead.company_instagram || '',
        company_linkedin: selectedLead.company_linkedin || '',
        company_whatsapp: selectedLead.company_whatsapp || '',
        contact_name: selectedLead.contact_name || '',
        contact_role: selectedLead.contact_role || '',
        contact_email: selectedLead.contact_email || '',
        contact_instagram: selectedLead.contact_instagram || '',
        contact_linkedin: selectedLead.contact_linkedin || '',
        contact_whatsapp: selectedLead.contact_whatsapp || '',
        contact_notes: selectedLead.contact_notes || '',
        value: selectedLead.value || 0,
        proposed_ticket: selectedLead.proposed_ticket || 0,
        source: selectedLead.source || '',
        campaign: selectedLead.campaign || '',
        responsible_id: selectedLead.responsible_id || '',
        closing_forecast: selectedLead.closing_forecast || '',
        temperature: selectedLead.temperature || LeadTemperature.COLD,
        probability: selectedLead.probability || 0,
        business_notes: selectedLead.business_notes || '',
        custom_fields: selectedLead.custom_fields || {},
        services: selectedLead.services || [],
      });
      const parsed = servicesUtils.parseClientServices(selectedLead.services || [], services);
      setEditServicesConfigs(parsed);
      setIsEditingLead(false);
    } else {
      setIsEditingLead(false);
      setEditServicesConfigs([]);
    }
  }, [selectedLead, services]);

  const handleSaveLeadDetails = async () => {
    if (!selectedLead) return;
    setIsSyncing(true);
    try {
      const resName = users.find(u => u.id === editLeadData.responsible_id)?.name || '';
      const updateData = {
        ...editLeadData,
        responsible_name: resName || undefined,
      };

      const updatedLead = await leadService.update(selectedLead.id, updateData, workspaceId);
      setLeads(prevLeads => prevLeads.map(l => l.id === selectedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
      setIsEditingLead(false);
      showToast('Dados cadastrais do lead atualizados com sucesso!');
    } catch (error: any) {
      console.error('Error updating lead details:', error);
      showToast(error.message || 'Erro ao atualizar dados do lead', 'error');
    } finally {
      setIsSyncing(false);
    }
  };
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
  const [interactions, setInteractions] = useState<Task[]>([]);
  const [selectedInteractiveItem, setSelectedInteractiveItem] = useState<(Task & { is_legacy_interaction?: boolean }) | null>(null);

  const formatDateTimeLocal = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch {
      return '';
    }
  };

  const handleSaveInteractiveItem = async () => {
    if (!selectedInteractiveItem || !workspaceId) return;
    setIsSyncing(true);
    try {
      if (selectedInteractiveItem.is_legacy_interaction) {
        const { error } = await supabase
          .from('m4_interactions')
          .update({
            title: selectedInteractiveItem.title,
            note: selectedInteractiveItem.description,
            content: selectedInteractiveItem.description,
            type: selectedInteractiveItem.type,
            created_at: selectedInteractiveItem.due_date ? new Date(selectedInteractiveItem.due_date).toISOString() : selectedInteractiveItem.created_at
          })
          .eq('id', selectedInteractiveItem.id);

        if (error) throw error;
      } else {
        const payload = mappers.task({
          title: selectedInteractiveItem.title,
          description: selectedInteractiveItem.description,
          status: selectedInteractiveItem.status,
          priority: selectedInteractiveItem.priority,
          type: selectedInteractiveItem.type,
          due_date: selectedInteractiveItem.due_date ? new Date(selectedInteractiveItem.due_date).toISOString() : null
        }, workspaceId);

        const { error } = await supabase
          .from('m4_tasks')
          .update(payload)
          .eq('id', selectedInteractiveItem.id);

        if (error) throw error;

        setTasks(prev => prev.map(t => t.id === selectedInteractiveItem.id ? { ...t, ...selectedInteractiveItem } : t));
      }

      setInteractions(prev => prev.map(item => item.id === selectedInteractiveItem.id ? { ...item, ...selectedInteractiveItem } : item));

      showToast('Atividade atualizada com sucesso');
      setSelectedInteractiveItem(null);
    } catch (error: any) {
      console.error('Error updating activity:', error);
      showToast(error.message || 'Erro ao atualizar atividade', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteInteractiveItem = async () => {
    if (!selectedInteractiveItem) return;
    
    if (!window.confirm('Tem certeza de que deseja excluir esta atividade permanentemente?')) {
      return;
    }

    setIsSyncing(true);
    try {
      if (selectedInteractiveItem.is_legacy_interaction) {
        const { error } = await supabase
          .from('m4_interactions')
          .delete()
          .eq('id', selectedInteractiveItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('m4_tasks')
          .delete()
          .eq('id', selectedInteractiveItem.id);

        if (error) throw error;

        setTasks(prev => prev.filter(t => t.id !== selectedInteractiveItem.id));
      }

      setInteractions(prev => prev.filter(item => item.id !== selectedInteractiveItem.id));

      showToast('Atividade excluída com sucesso');
      setSelectedInteractiveItem(null);
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      showToast(error.message || 'Erro ao excluir atividade', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const [interactionNote, setInteractionNote] = useState('');
  const [interactionType, setInteractionType] = useState<Interaction['type']>('WhatsApp');
  const [interactionSuccess, setInteractionSuccess] = useState(true);
  const [interactionResult, setInteractionResult] = useState<'Envio de mensagem' | 'Sucesso' | 'Não atendeu'>('Sucesso');
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [isRegisteringInteraction, setIsRegisteringInteraction] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string, type: ToastType, isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  // UX: Configuração do modal de confirmação
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

  const { 
    filterMode, setFilterMode, 
    sortOrder, setSortOrder,
    viewMode, setViewMode,
    cardDensity, setCardDensity,
    columnWidth, setColumnWidth,
    isLoadingLeads 
  } = useCRMStore();
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({
    title: '',
    description: '',
    due_date: new Date().toISOString().slice(0, 16),
    priority: Priority.MEDIUM,
    type: 'task',
    task_type: 'commercial'
  });
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [showWonSuccess, setShowWonSuccess] = useState(false);
  const [showLostSuccess, setShowLostSuccess] = useState(false);
  const [wonData, setWonData] = useState({
    monthly_value: 0,
    service_type: '',
    services: [] as string[],
    start_date: new Date().toISOString().split('T')[0],
    bank_account_id: ''
  });
  const [lostData, setLostData] = useState({
    reason: '',
    notes: ''
  });
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [showReactivateSuccess, setShowReactivateSuccess] = useState(false);
  const [reactivateData, setReactivateData] = useState({
    reason: '',
    stageId: '',
    next_action: '',
    next_action_date: ''
  });
  
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    company_name: '',
    company_cnpj: '',
    company_city: '',
    company_state: '',
    company_niche: '',
    company_website: '',
    company_email: '',
    company_whatsapp: '',
    company_instagram: '',
    contact_name: '',
    contact_role: '',
    contact_email: '',
    contact_whatsapp: '',
    contact_instagram: '',
    contact_notes: '',
    pipeline_id: activePipelineId,
    stage: activePipeline?.stages?.[0]?.id || '',
    value: 0,
    business_notes: '',
    service_type: '',
    services: [] as string[],
    campaign: '',
    responsible_id: currentUser?.id || '',
    status: 'active'
  });
  const [creationServicesConfigs, setCreationServicesConfigs] = useState<ClientServiceContract[]>([]);
  const [editServicesConfigs, setEditServicesConfigs] = useState<ClientServiceContract[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('m4_users')
        .select('*')
        .eq('status', 'active')
        .eq('workspace_id', workspaceId);
      if (data) setUsers(data);
    };
    if (workspaceId) fetchUsers();
  }, [workspaceId]);



  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '', cnpj: '', city: '', state: '', segment: '', whatsapp: '', email: '', website: '', instagram: '', notes: ''
  });
  
  // Contact selection states for New Company form
  const [contactMode, setContactMode] = useState<'select' | 'create'>('select');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [primaryContact, setPrimaryContact] = useState({
    name: '', email: '', role: '', whatsapp: ''
  });

  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '', email: '', role: '', whatsapp: '', instagram: '', company_id: ''
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    const { data: companyData, error: companyError } = await supabase
      .from('m4_companies')
      .insert([{
        ...newCompany,
        workspace_id: workspaceId
      }])
      .select();

    if (companyError) {
      showToast(companyError.message || "Erro ao salvar empresa", "error");
    } else if (companyData) {
      const createdCompany = companyData[0];
      const companyId = createdCompany.id;
      
      setCompanies(prev => [...prev, createdCompany].sort((a, b) => a.name.localeCompare(b.name)));

      // Handle primary contact
      if (contactMode === 'create' && primaryContact.name) {
        // 🛡️ WHITELIST PAYLOAD (BLINDAGEM)
        const contactPayload = mappers.contact({
          ...primaryContact,
          company_id: companyId,
          is_primary: true
        }, workspaceId);

        const { data: contactData } = await supabase
          .from('m4_contacts')
          .insert([contactPayload])
          .select();
        
        if (contactData) {
          setContacts(prev => [...prev, contactData[0]].sort((a, b) => a.name.localeCompare(b.name)));
        }
      } else if (contactMode === 'select' && selectedContactId) {
        const { data: contactData } = await supabase
          .from('m4_contacts')
          .update({ company_id: companyId, is_primary: true })
          .eq('id', selectedContactId)
          .eq('workspace_id', workspaceId)
          .select();
        
        if (contactData) {
          setContacts(prev => prev.map(c => c.id === selectedContactId ? contactData[0] : c));
        }
      }

      setNewLead({ ...newLead, company_id: companyId, company: createdCompany.name });
      setIsCompanyModalOpen(false);
      setNewCompany({ name: '', cnpj: '', city: '', state: '', segment: '', website: '' });
      setPrimaryContact({ name: '', email: '', role: '', whatsapp: '' });
      setSelectedContactId('');
      setContactSearch('');
      setContactMode('select');
    }
    setIsSyncing(false);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    
    // 🛡️ WHITELIST PAYLOAD (BLINDAGEM)
    const contactPayload = mappers.contact({
      ...newContact,
      company_id: newLead.company_id
    }, workspaceId);

    const { data, error } = await supabase
      .from('m4_contacts')
      .insert([contactPayload])
      .select();

    if (error) {
      showToast(error.message || "Erro ao salvar contato", "error");
    } else if (data) {
      const createdContact = data[0];
      setContacts(prev => [...prev, createdContact].sort((a, b) => a.name.localeCompare(b.name)));
      setNewLead({ ...newLead, contact_id: createdContact.id, contact_name: createdContact.name, contact_email: createdContact.email, contact_whatsapp: createdContact.whatsapp });
      setIsContactModalOpen(false);
      setNewContact({ name: '', email: '', role: '', whatsapp: '', company_id: '' });
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

    const updateData = {
      ...editLead,
      status: targetStatus as any,
    };

    try {
      const updatedLead = await leadService.update(selectedLead.id, updateData, workspaceId);
      setLeads(leads.map(l => l.id === selectedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
      setIsEditing(false);
    } catch (error: any) {
      showToast(error.message || "Erro ao atualizar lead", "error");
    }
    setIsSyncing(false);
  };

  const [isStageConfigModalOpen, setIsStageConfigModalOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Global keydown event listener to close active modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (confirmModal.isOpen) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          return;
        }
        if (isCompanyModalOpen) {
          setIsCompanyModalOpen(false);
          return;
        }
        if (isContactModalOpen) {
          setIsContactModalOpen(false);
          return;
        }
        if (isLostModalOpen) {
          setIsLostModalOpen(false);
          return;
        }
        if (isWonModalOpen) {
          setIsWonModalOpen(false);
          return;
        }
        if (selectedInteractiveItem) {
          setSelectedInteractiveItem(null);
          return;
        }
        if (isNewTaskModalOpen) {
          setIsNewTaskModalOpen(false);
          return;
        }
        if (isStageConfigModalOpen) {
          setIsStageConfigModalOpen(false);
          return;
        }
        if (isPipelineModalOpen) {
          setIsPipelineModalOpen(false);
          return;
        }
        if (isModalOpen) {
          setIsModalOpen(false);
          return;
        }
        if (selectedLead) {
          setSelectedLead(null);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    confirmModal.isOpen,
    isCompanyModalOpen,
    isContactModalOpen,
    isLostModalOpen,
    isWonModalOpen,
    isNewTaskModalOpen,
    selectedInteractiveItem,
    isStageConfigModalOpen,
    isPipelineModalOpen,
    isModalOpen,
    selectedLead,
    setIsModalOpen
  ]);

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
    if (!editingPipeline || !editingPipeline.name || !workspaceId) return;
    setIsSaving(true);
    try {
      const pipelineData = {
        name: editingPipeline.name,
        workspace_id: workspaceId,
        position: editingPipeline.position ?? pipelines.length
      };

      let pipelineId = editingPipeline.id;
      if (pipelineId) {
        const { error } = await supabase
          .from('m4_pipelines')
          .update(pipelineData)
          .eq('id', pipelineId)
          .eq('workspace_id', workspaceId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('m4_pipelines')
          .insert(pipelineData)
          .select()
          .single();
        if (error) throw error;
        if (!data) throw new Error("Erro ao criar funil: dados não retornados");
        pipelineId = data.id;
      }

      // Save stages
      if (editingPipeline.stages) {
        const processedStages = editingPipeline.stages.map((s, idx) => {
          const stage: any = {
            pipeline_id: pipelineId,
            workspace_id: workspaceId,
            name: s.name,
            position: idx,
            color: s.color || 'blue',
            status: s.status || FunnelStatus.INTERMEDIATE
          };
          
          if (s.id && s.id.length > 20 && !s.id.includes('.')) {
            stage.id = s.id;
          }
          
          return stage;
        });

        // 1. Identify stages to delete
        if (editingPipeline.id) {
          const { data: dbStages } = await supabase
            .from('m4_pipeline_stages')
            .select('id')
            .eq('pipeline_id', pipelineId)
            .eq('workspace_id', workspaceId);
          
          if (dbStages) {
            const currentIds = processedStages.map(s => s.id).filter(Boolean);
            const toDelete = dbStages.filter(s => !currentIds.includes(s.id)).map(s => s.id);
            if (toDelete.length > 0) {
              const { error: delError } = await supabase
                .from('m4_pipeline_stages')
                .delete()
                .in('id', toDelete)
                .eq('workspace_id', workspaceId);
              if (delError) throw delError;
            }
          }
        }

        // 2. Separate into updates and inserts for better reliability
        const stagesToUpdate = processedStages.filter(s => s.id);
        const stagesToInsert = processedStages.filter(s => !s.id);

        if (stagesToUpdate.length > 0) {
          const { error: uError } = await supabase
            .from('m4_pipeline_stages')
            .upsert(stagesToUpdate);
          if (uError) throw uError;
        }

        if (stagesToInsert.length > 0) {
          const { error: iError } = await supabase
            .from('m4_pipeline_stages')
            .insert(stagesToInsert);
          if (iError) throw iError;
        }
      }

      // Refresh pipelines
      const { data: pData } = await supabase
        .from('m4_pipelines')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position');
      
      const { data: sData } = await supabase
        .from('m4_pipeline_stages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position');
      
      if (pData) {
        const fullPipelines = pData.map(p => ({
          ...p,
          stages: (sData || []).filter(s => s.pipeline_id === p.id)
        }));
        setPipelines(fullPipelines);
        
        // If we just edited the active pipeline, update it in UI too
        if (activePipelineId === pipelineId) {
          setActivePipelineId(pipelineId);
        }
      }
      
      setIsStageConfigModalOpen(false);
      showToast("Funil salvo com sucesso!");
    } catch (err: any) {
      console.error("Erro ao salvar pipeline:", err);
      showToast(err.message || "Erro ao salvar pipeline", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCreationServicesConfigs([]);
    setNewLead({ 
      company_name: '',
      company_cnpj: '',
      company_city: '',
      company_state: '',
      company_niche: '',
      company_website: '',
      company_email: '',
      company_whatsapp: '',
      contact_name: '',
      contact_role: '',
      contact_email: '',
      contact_whatsapp: '',
      contact_notes: '',
      pipeline_id: activePipelineId,
      stage: activePipeline?.stages?.[0]?.id || '',
      value: 0,
      business_notes: '',
      service_type: '',
      services: [],
      campaign: '',
      responsible_id: currentUser?.id || '',
      status: 'active'
    });
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Zod Validation
    const validation = leadSchema.safeParse(newLead);
    if (!validation.success) {
      const errors = validation.error.issues.map(err => err.message).join('\n');
      showToast("Ops! " + errors, "warning");
      return;
    }

    setIsSyncing(true);
    
    const selectedPipeline = pipelines.find(p => p.id === (newLead.pipeline_id || activePipelineId));
    const targetStageId = newLead.stage || selectedPipeline?.stages[0].id;
    const targetStage = selectedPipeline?.stages.find(s => s.id === targetStageId);
    const targetStatus = targetStage?.status || 'active';

    try {
      const leadData = {
        ...newLead,
        pipeline_id: newLead.pipeline_id || activePipelineId,
        stage: targetStageId,
        status: targetStatus as any,
        responsible_name: users.find(u => u.id === newLead.responsible_id)?.name || currentUser?.name || 'Administrador',
      };

      const createdLead = await leadService.create(leadData, currentUser?.workspace_id || '');
      setLeads([...leads, createdLead]);
      setIsModalOpen(false);
      setCreationServicesConfigs([]);
      setNewLead({ 
        company_name: '',
        company_cnpj: '',
        company_city: '',
        company_state: '',
        company_niche: '',
        company_website: '',
        company_email: '',
        company_whatsapp: '',
        company_instagram: '',
        contact_name: '',
        contact_role: '',
        contact_email: '',
        contact_whatsapp: '',
        contact_instagram: '',
        contact_notes: '',
        pipeline_id: activePipelineId,
        stage: activePipeline?.stages?.[0]?.id || '',
        value: 0,
        business_notes: '',
        service_type: '',
        services: [],
        campaign: '',
        responsible_id: currentUser?.id || '',
        status: 'active'
      });
    } catch (error: any) {
      showToast(error.message || "Erro ao salvar no Supabase", "error");
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
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;
      const originalStageId = lead.stage;

      const targetStage = activePipeline.stages.find(s => s.id === targetStageId);
      const targetStatus = targetStage?.status || 'active';

      // Intercept movement to ONBOARDING CONCLUIDO
      const handled = await handleStageTransitionCheck(lead, targetStageId, true, originalStageId);
      if (handled) {
        setDraggedLeadId(null);
        return;
      }

      // Intercept movement from lost to active stage
      if (lead.status === 'lost' && targetStatus !== FunnelStatus.LOST) {
        setSelectedLead(lead);
        setReactivateData({
          reason: '',
          stageId: targetStageId,
          next_action: '',
          next_action_date: ''
        });
        setIsReactivateModalOpen(true);
        setDraggedLeadId(null);
        return;
      }

      // Otimista: atualiza UI primeiro
      const originalLeads = [...leads];
      setLeads(leads.map(l => l.id === leadId ? { ...l, stage: targetStageId, status: targetStatus as any } : l));
      
      try {
        await leadService.update(leadId, { 
          stage: targetStageId,
          status: targetStatus as any
        }, workspaceId);
      } catch (error: any) {
        setLeads(originalLeads); // Reverte se falhar
        showToast(error.message || "Erro ao atualizar estágio", "error");
      }
    }
    setDraggedLeadId(null);
  };

  const handleMoveToStage = async (lead: Lead, targetStageId: string) => {
    if (!targetStageId || targetStageId === lead.stage) return;

    const originalStageId = lead.stage;
    const targetStage = activePipeline.stages.find(s => s.id === targetStageId);
    if (!targetStage) return;

    // Intercept movement to ONBOARDING CONCLUIDO
    const handled = await handleStageTransitionCheck(lead, targetStageId, false, originalStageId);
    if (handled) return;

    const targetStatus = targetStage.status;
    const targetStageName = targetStage.name;

    // Intercept movement from lost to active stage
    if (lead.status === 'lost' && targetStatus !== FunnelStatus.LOST) {
      setSelectedLead(lead);
      setReactivateData({
        reason: '',
        stageId: targetStageId,
        next_action: '',
        next_action_date: ''
      });
      setIsReactivateModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const updatedLead = await leadService.update(lead.id, { 
        stage: targetStageId,
        status: targetStatus as any
      }, workspaceId);
      
      setLeads(leads.map(l => l.id === lead.id ? updatedLead : l));
      
      if (selectedLead?.id === lead.id) {
        setSelectedLead(updatedLead);
      }

      // Log interaction
      if (currentUser) {
        const interactionTask = {
          title: `Lead movido para a etapa: ${targetStageName}`,
          description: `O lead foi movido para a etapa ${targetStageName}`,
          type: 'Outro' as const,
          status: 'Concluído',
          task_type: 'commercial' as const,
          lead_id: lead.id,
          company_id: lead.company_id,
          interaction_success: true,
          due_date: new Date().toISOString()
        };
        
        const payload = mappers.task(interactionTask, currentUser.workspace_id);
        
        const { data: interactionData } = await supabase
          .from('m4_tasks')
          .insert([payload])
          .select()
          .single();
          
        if (interactionData && selectedLead?.id === lead.id) {
          setInteractions([interactionData as Task, ...interactions]);
          setTasks([interactionData as Task, ...tasks]);
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
    setIsSaving(true);
    try {
      if (!workspaceId) throw new Error("Workspace ID is required");
      await leadService.delete(id, workspaceId);
      setLeads(leads.filter(l => l.id !== id));
      setSelectedLead(null);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      showToast('Negócio movido para a lixeira');
    } catch (error: any) {
      console.error('Erro ao excluir lead:', error);
      showToast(error.message || 'Erro ao excluir lead', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveLead = async (lead: Lead) => {
    setIsSaving(true);
    try {
      if (!workspaceId) throw new Error("Workspace ID is required");
      // Como não temos deleted_at no banco atual, usamos status 'archived' ou 'paused'
      // Para manter histórico sem remover do banco físico
      await leadService.update(lead.id, { status: 'paused' as any }, workspaceId);
      setLeads(leads.map(l => l.id === lead.id ? { ...l, status: 'paused' as any } : l));
      setSelectedLead(null);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      showToast('Lead arquivado com sucesso');
    } catch (error: any) {
      console.error('Erro ao arquivar lead:', error);
      showToast(error.message || 'Erro ao arquivar lead', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Helpers para Modais de Confirmação
  const showDeleteConfirm = (lead: Lead) => {
    setConfirmModal({
      isOpen: true,
      title: 'Mover para Lixeira?',
      description: `Deseja remover o lead da ${lead.company_name || lead.company || 'empresa'} da sua visão ativa?`,
      impactItems: [
        'O negócio será movido para a lixeira e poderá ser recuperado.',
        'As tarefas vinculadas serão preservadas no banco de dados.',
        'O lead sairá do funil comercial principal mas o histórico continua salvo.'
      ],
      confirmLabel: 'Mover para Lixeira',
      variant: 'danger',
      action: () => handleDeleteLead(lead.id)
    });
  };

  const showArchiveConfirm = (lead: Lead) => {
    setConfirmModal({
      isOpen: true,
      title: 'Arquivar Negócio?',
      description: `Deseja remover ${lead.company_name || lead.company || 'este lead'} da visualização ativa?`,
      impactItems: [
        'O lead será movido para o status "Pausado".',
        'Todo o histórico de interações será preservado.',
        'O lead sairá do funil visual mas permanecerá no banco.'
      ],
      confirmLabel: 'Arquivar Lead',
      variant: 'info',
      action: () => handleArchiveLead(lead)
    });
  };

  const showLostConfirm = (lead: Lead) => {
    // Para Perda, primeiro abrimos o modal de motivo que já existe
    setSelectedLead(lead);
    setLostData({
      reason: String(lead.custom_fields?.loss_reason || ''),
      notes: ''
    });
    setIsLostModalOpen(true);
  };

  const showWonConfirm = (lead: Lead) => {
    setSelectedLead(lead);
    setWonData({
      monthly_value: Number(lead.value) || 0,
      service_type: '',
      services: [],
      start_date: new Date().toISOString().split('T')[0],
      bank_account_id: ''
    });
    setIsWonModalOpen(true);
  };

  const handleEnrichSingleLead = async (lead: Lead) => {
    setIsEnriching(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        showToast("API Key não configurada. Verifique as configurações.", "warning");
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

Retorne APENAS um objeto JSON válido com: name (nome do contato), company (nome da empresa), value, notes, probability, temperature, closing_forecast, niche, service_type, ai_score.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const enriched = JSON.parse(response.text || "{}");
      
      const { error } = await supabase
        .from('m4_leads')
        .update(enriched)
        .eq('id', lead.id)
        .eq('workspace_id', workspaceId);

      if (!error) {
        const updatedLead = { ...lead, ...enriched };
        setLeads(leads.map(l => l.id === lead.id ? updatedLead : l));
        setSelectedLead(updatedLead);
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Erro ao enriquecer lead', 'error');
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
        .eq('id', lead.id)
        .eq('workspace_id', workspaceId);

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

  const handleAISummary = async (activities: Task[]) => {
    if (activities.length === 0) return;
    setIsSummarizing(true);
    try {
      const summary = await aiService.summarizeInteractions(activities.map(a => ({
        id: a.id,
        lead_id: a.lead_id || '',
        type: (a.type as any) || 'Outro',
        note: a.interaction_note || a.description || '',
        success: a.interaction_success !== false,
        workspace_id: a.workspace_id || '',
        created_at: a.created_at
      })));
      setAiSummary(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSummarizing(false);
    }
  };


  const leadsByStage = React.useMemo(() => {
    let filtered = leads;
    if (filterMode === 'my_day') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(l => l.next_action_date && l.next_action_date <= today && funnelUtils.isLeadActive(l, pipelines));
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === 'recent') {
        const dateA = new Date(a.last_activity_at || a.created_at).getTime();
        const dateB = new Date(b.last_activity_at || b.created_at).getTime();
        return dateB - dateA; // Most recent first
      }
      if (sortOrder === 'alphabetical') {
        const nameA = (a.company?.name || a.company_name || a.name || '').toLowerCase();
        const nameB = (b.company?.name || b.company_name || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortOrder === 'value') {
        return (Number(b.value) || 0) - (Number(a.value) || 0);
      }
      return 0;
    });

    return funnelUtils.groupLeadsByStage(sorted, activePipeline);
  }, [leads, activePipeline, filterMode, sortOrder]);

  const getLeadsByStage = (stageId: string) => leadsByStage[stageId] || [];
  
  const calculateStageTotal = (stageId: string) => {
    return getLeadsByStage(stageId).reduce((acc, lead) => acc + (Number(lead.value) || 0), 0);
  };

  const totalLeadsInPipeline = React.useMemo(() => {
    return (leads || []).filter(l => {
      // Mesma lógica do funnelUtils.groupLeadsByStage
      const matchesPipeline = !l.pipeline_id || l.pipeline_id === activePipeline.id;
      const isActive = funnelUtils.isLeadActive(l, pipelines);
      return matchesPipeline && isActive;
    }).length;
  }, [leads, activePipeline, pipelines]);

  const totalFilteredLeads = React.useMemo(() => {
    return Object.values(leadsByStage).reduce((acc, current) => acc + current.length, 0);
  }, [leadsByStage]);

  const leadsHiddenByFilter = totalLeadsInPipeline > 0 && totalFilteredLeads === 0 && filterMode === 'my_day';

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
      showToast('Negócio marcado como GANHO! parabéns!');
      setTimeout(() => {
        setIsWonModalOpen(false);
        setShowWonSuccess(false);
        setSelectedLead(null);
      }, 3000);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Erro ao marcar ganho', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLostConfirm = async () => {
    if (!selectedLead) return;
    setIsSyncing(true);
    try {
      await onStatusChange(selectedLead.id, 'lost', lostData);

      // Create or update a local interaction record for instant UX update on the timeline
      setInteractions(prev => {
        const hasLossRecord = prev.some(item => (item.type as string) === 'loss_record');
        if (hasLossRecord) {
          return prev.map(item => {
            if ((item.type as string) === 'loss_record') {
              return {
                ...item,
                description: `Motivo da perda: ${lostData.reason || 'Não informado'}`,
                created_at: new Date().toISOString()
              };
            }
            return item;
          });
        } else {
          const lossTimelineItem = {
            id: 'loss-' + Date.now(),
            title: 'Lead Perdido',
            description: `Motivo da perda: ${lostData.reason || 'Não informado'}`,
            type: 'loss_record',
            status: 'Concluído',
            created_at: new Date().toISOString(),
            interaction_success: false,
            task_type: 'commercial'
          };
          return [lossTimelineItem as any, ...prev];
        }
      });

      // Update selectedLead locally with the loss reason & lost status so the loss banner shows immediately
      const updatedLead = {
        ...selectedLead,
        status: 'lost' as const,
        custom_fields: {
          ...(selectedLead.custom_fields || {}),
          loss_reason: lostData.reason || 'Não informado',
          lost_at: new Date().toISOString()
        }
      };
      setSelectedLead(updatedLead);

      setShowLostSuccess(true);
      showToast('Negócio marcado como PERDIDO. Analise os motivos para melhorar.');
      setTimeout(() => {
        setIsLostModalOpen(false);
        setShowLostSuccess(false);
        setSelectedLead(null);
      }, 3000);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Erro ao marcar perda', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReactivateConfirm = async () => {
    if (!selectedLead) return;
    setIsSyncing(true);
    try {
      const targetStageId = reactivateData.stageId || activePipeline.stages[0]?.id || '';
      
      await onStatusChange(selectedLead.id, 'active', {
        reason: reactivateData.reason,
        stageId: targetStageId,
        next_action: reactivateData.next_action || undefined,
        next_action_date: reactivateData.next_action_date ? new Date(reactivateData.next_action_date).toISOString() : null
      });

      // Insert reactivation record locally to update timeline immediately
      const reactTimelineItem = {
        id: 'react-' + Date.now(),
        title: 'Lead Reativado',
        description: `Motivo da reativação: ${reactivateData.reason || 'Não informado'}${reactivateData.next_action ? ` | Próxima Ação: ${reactivateData.next_action}` : ''}`,
        type: 'reactivation_record',
        status: 'Concluído',
        created_at: new Date().toISOString(),
        interaction_success: true,
        task_type: 'commercial'
      };

      setInteractions(prev => [reactTimelineItem as any, ...prev]);

      // If next action is specified, prepend local task to interactions state for direct visibility
      if (reactivateData.next_action && reactivateData.next_action_date) {
        const localTask = {
          id: 'task-' + Date.now(),
          title: `Follow-up: ${reactivateData.next_action}`,
          description: `Ação definida na reativação do lead: ${reactivateData.reason || 'Sem observações'}`,
          type: 'task',
          status: 'Pendente',
          due_date: new Date(reactivateData.next_action_date).toISOString(),
          created_at: new Date().toISOString()
        };
        setInteractions(prev => [localTask as any, ...prev]);
      }

      // Update selectedLead locally so changes are immediately displayed in the 360-view
      const updatedLead = {
        ...selectedLead,
        status: 'active' as const,
        stage: targetStageId,
        custom_fields: {
          ...(selectedLead.custom_fields || {}),
          reactivated_at: new Date().toISOString(),
          reactivation_reason: reactivateData.reason || 'Não informado',
          loss_reason: null,
          lost_at: null
        }
      };
      setSelectedLead(updatedLead);

      setShowReactivateSuccess(true);
      showToast('Negócio REATIVADO com sucesso e movido de volta para o funil.');
      setTimeout(() => {
        setIsReactivateModalOpen(false);
        setShowReactivateSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Erro ao reativar o lead', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !currentUser) return;
    setIsSyncing(true);
    try {
      // 🛡️ WHITELIST PAYLOAD (BLINDAGEM)
      const taskPayload = mappers.task({
        ...newTaskData,
        lead_id: selectedLead.id,
        company_id: selectedLead.company_id,
        status: 'Pendente'
      }, workspaceId);

      const { data, error } = await supabase
        .from('m4_tasks')
        .insert([taskPayload])
        .select();

      if (error) throw error;
      if (data && data[0]) {
        const newTask = data[0] as Task;
        setTasks([newTask, ...tasks]);
        setInteractions([newTask, ...interactions]);
        setIsNewTaskModalOpen(false);
        setNewTaskData({
          title: '',
          description: '',
          due_date: new Date().toISOString().slice(0, 16),
          priority: Priority.MEDIUM,
          type: 'task',
          task_type: 'commercial'
        });
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Erro ao criar tarefa", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  if (renderOnlyModal) {
    return (
      <>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4">
            <div className="bg-card rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg border border-border overflow-hidden pointer-events-auto relative z-[10000]">
              <div className="flex justify-between items-center p-10 pb-0 shrink-0">
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Novo Negócio</h3>
                <button onClick={handleCloseModal} className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all">
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
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome da Empresa (*)</label>
                        <input required value={newLead.company_name} onChange={e => setNewLead({...newLead, company_name: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: M4 Marketing" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">CNPJ</label>
                        <input value={newLead.company_cnpj} onChange={e => setNewLead({...newLead, company_cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="00.000.000/0000-00" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cidade</label>
                        <input value={newLead.company_city} onChange={e => setNewLead({...newLead, company_city: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: São Paulo" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Estado</label>
                        <input value={newLead.company_state} onChange={e => setNewLead({...newLead, company_state: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: SP" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Segmento / Nicho</label>
                        <input value={newLead.company_niche} onChange={e => setNewLead({...newLead, company_niche: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: Energia Solar" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Website</label>
                        <input value={newLead.company_website} onChange={e => setNewLead({...newLead, company_website: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="https://..." />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail da Empresa</label>
                        <input type="email" value={newLead.company_email} onChange={e => setNewLead({...newLead, company_email: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="contato@empresa.com" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone / WhatsApp (Empresa)</label>
                        <input value={newLead.company_whatsapp} onChange={e => setNewLead({...newLead, company_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="(00) 00000-0000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Instagram (Empresa)</label>
                        <input value={newLead.company_instagram} onChange={e => setNewLead({...newLead, company_instagram: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="@usuario" />
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
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome do Contato (*)</label>
                        <input required value={newLead.contact_name} onChange={e => setNewLead({...newLead, contact_name: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="Nome do contato" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cargo</label>
                        <input value={newLead.contact_role} onChange={e => setNewLead({...newLead, contact_role: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="Ex: Diretor Comercial" />
                      </div>
                    </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                      <input value={newLead.contact_whatsapp} onChange={e => setNewLead({...newLead, contact_whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Instagram (Contato)</label>
                      <input value={newLead.contact_instagram} onChange={e => setNewLead({...newLead, contact_instagram: e.target.value})} className="w-full p-4 bg-card rounded-2xl border-none font-bold text-foreground shadow-sm" placeholder="@usuario" />
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
                          className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground cursor-pointer"
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
                          className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground cursor-pointer"
                        >
                          <option value="">Selecione a Etapa</option>
                          {pipelines.find(p => p.id === (newLead.pipeline_id || activePipelineId))?.stages.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Campanha / Origem</label>
                        <input value={newLead.campaign || ''} onChange={e => setNewLead({...newLead, campaign: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground" placeholder="Ex: Tráfego Ads" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Responsável Comercial</label>
                        <select 
                          value={newLead.responsible_id || ''} 
                          onChange={e => setNewLead({...newLead, responsible_id: e.target.value})} 
                          className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground cursor-pointer"
                        >
                          <option value="">Selecione o Responsável</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Bloco Unificado de Serviços e Condições Financeiras */}
                    <div className="border-t border-border/40 pt-6">
                      <LeadFinancialServiceBlock
                        servicesCatalog={services}
                        selectedConfigs={creationServicesConfigs}
                        onChange={(configs) => {
                          setCreationServicesConfigs(configs);
                          const recSum = configs.filter(c => c.billing_type === 'recorrente').reduce((sum, c) => sum + (c.price || 0), 0);
                          const insSum = configs.filter(c => c.billing_type === 'parcelado' && c.include_in_monthly).reduce((sum, c) => sum + (c.installments && c.installments > 0 ? ((c.price || 0) / c.installments) : 0), 0);
                          const total = recSum + insSum;
                          setNewLead(prev => ({
                            ...prev,
                            value: total,
                            proposed_ticket: total,
                            services: servicesUtils.serializeClientServices(configs)
                          }));
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Notas do Negócio</label>
                      <textarea value={newLead.business_notes || ''} onChange={e => setNewLead({...newLead, business_notes: e.target.value})} className="w-full p-4 bg-muted rounded-2xl border-none font-bold text-foreground h-24" placeholder="Algum detalhe relevante sobre a negociação..." />
                    </div>

                  </div>
                </div>
                <div className="p-10 border-t border-border flex gap-4 justify-end bg-card shrink-0">
                  <button type="button" onClick={handleCloseModal} className="px-6 py-4 bg-muted text-muted-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted/80 transition-all">Cancelar</button>
                  <button type="submit" disabled={isSyncing} className="px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2">
                    {isSyncing ? <ICONS.RefreshCw className="animate-spin" width="16" height="16" /> : <ICONS.Plus width="16" height="16" />}
                    CRIAR NEGÓCIO
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // Calculate high-level pipeline metrics
  const activeLeads = leads.filter(l => funnelUtils.isLeadActive(l, pipelines) && (!l.pipeline_id || l.pipeline_id === activePipeline.id));
  const totalValueInActiveStages = activeLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const staleLeadsCount = activeLeads.filter(l => isStale(l)).length;
  
  const totalFinishedLeads = leads.filter(l => (!l.pipeline_id || l.pipeline_id === activePipeline.id) && (l.status === 'won' || l.status === 'lost'));
  const winRatePercent = totalFinishedLeads.length === 0 ? 0 : Math.round((leads.filter(l => (!l.pipeline_id || l.pipeline_id === activePipeline.id) && l.status === 'won').length / totalFinishedLeads.length) * 100);

  // Simple local states for layout and quick filters
  const [searchTerm, setSearchTerm] = useState('');
  const [temperatureFilter, setTemperatureFilter] = useState<'all' | 'Quente' | 'Morno' | 'Frio'>('all');

  const filteredLocalLeads = React.useMemo(() => {
    let result = leads;
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(l => 
        (l.company_name || '').toLowerCase().includes(q) ||
        (l.name || '').toLowerCase().includes(q) ||
        (l.company_niche || '').toLowerCase().includes(q) ||
        (l.responsible_name || '').toLowerCase().includes(q)
      );
    }
    if (temperatureFilter !== 'all') {
      result = result.filter(l => l.temperature === temperatureFilter);
    }
    return result;
  }, [leads, searchTerm, temperatureFilter]);

  const localLeadsByStage = React.useMemo(() => {
    let filtered = filteredLocalLeads;
    if (filterMode === 'my_day') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(l => l.next_action_date && l.next_action_date <= today && funnelUtils.isLeadActive(l, pipelines));
    }
    return funnelUtils.groupLeadsByStage(filtered, activePipeline);
  }, [filteredLocalLeads, activePipeline, filterMode, pipelines]);

  const getLocalLeadsByStage = (stageId: string) => localLeadsByStage[stageId] || [];

  const handleOpenNewLeadModal = () => {
    setNewLead({
      company_name: '', company_cnpj: '', company_city: '', company_state: '', company_niche: '', company_website: '',
      company_email: '', company_whatsapp: '', company_instagram: '', contact_name: '', contact_role: '', contact_email: '',
      contact_whatsapp: '', contact_instagram: '', contact_notes: '', pipeline_id: activePipelineId, 
      stage: activePipeline?.stages?.[0]?.id || '', value: 0, business_notes: '', service_type: '', services: [], campaign: '',
      responsible_id: currentUser?.id || '', status: 'active'
    });
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-501">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Pipeline de Vendas</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            Gestão Comercial • {activePipeline.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Pipeline Switcher selector */}
          <button 
            type="button"
            onClick={() => setIsPipelineModalOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            📂 FUNIL: {activePipeline.name} <ICONS.ChevronRight className="rotate-90 w-4 h-4 text-muted-foreground" />
          </button>

          {/* Kanban vs List display toggles */}
          <div className="flex items-center bg-muted/60 p-1.5 rounded-2xl border border-border/40">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-card text-primary shadow-sm' : 'text-slate-500 hover:text-foreground'}`}
              title="Visualização em Kanban"
            >
              <LayoutGrid width="14" height="14" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-slate-500 hover:text-foreground'}`}
              title="Visualização em Lista"
            >
              <List width="14" height="14" />
            </button>
          </div>

          <button 
            onClick={handleOpenNewLeadModal}
            className="flex items-center gap-2 px-5 py-3.5 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-primary/20"
          >
            <ICONS.Plus width="14" height="14" /> Novo Negócio
          </button>
        </div>
      </div>

      {/* 2. Top Funnel Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
        <div className="p-5 bg-card border border-border rounded-3xl shadow-sm">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Negócios Ativos</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-foreground">{activeLeads.length}</span>
            <span className="text-xs text-muted-foreground font-bold uppercase">leads</span>
          </div>
        </div>
        <div className="p-5 bg-card border border-border rounded-3xl shadow-sm">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Volume Financeiro Estimado</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-primary">R$ {totalValueInActiveStages.toLocaleString('pt-BR')}</span>
          </div>
        </div>
        <div className="p-5 bg-card border border-border rounded-3xl shadow-sm">
          <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Estagnados (&gt; 5 Dias)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-500">{staleLeadsCount}</span>
            <span className="text-xs text-rose-400 font-bold uppercase">leads</span>
          </div>
        </div>
        <div className="p-5 bg-card border border-border rounded-3xl shadow-sm">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Taxa de Conversão</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-green-600 dark:text-green-400">{winRatePercent}%</span>
            <span className="text-xs text-muted-foreground font-bold uppercase">win-rate</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center mb-6 shrink-0 bg-muted/20 p-4 rounded-2xl border border-border/50">
        <div className="flex flex-1 max-w-md items-center gap-3 bg-card border border-border px-4 py-2.5 rounded-xl">
          <ICONS.Search className="text-muted-foreground w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar por empresa, contato ou nicho..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-xs font-bold text-foreground focus:outline-none placeholder-muted-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Temperatura:</span>
          {['all', 'Quente', 'Morno', 'Frio'].map(t => (
            <button
              key={t}
              onClick={() => setTemperatureFilter(t as any)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                temperatureFilter === t 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'bg-card border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              {t === 'all' ? 'TUDO' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main CRM Content View */}
      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-x-auto pb-6 -mx-6 px-6 scrollbar-none relative">
          <div className="flex gap-5 h-full min-w-max pb-4">
            {activePipeline.stages.map(stage => {
              const stageLeads = getLocalLeadsByStage(stage.id);
              const stageValue = stageLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
              
              return (
                <div 
                  key={stage.id}
                  onDragOver={(e) => onDragOver(e)}
                  onDrop={(e) => onDrop(e, stage.id)}
                  style={{ width: `${columnWidth || 290}px` }}
                  className={`flex flex-col bg-muted/25 rounded-[2rem] border transition-all p-3 shrink-0 ${
                    draggedLeadId ? 'border-primary/20 bg-primary/5 border-dashed' : 'border-border/40'
                  }`}
                >
                  {/* Column Header */}
                  <div className="p-4 bg-card rounded-2xl border border-border/50 mb-4 shadow-sm flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="font-black text-foreground text-[10px] uppercase tracking-wider">{stage.name}</h3>
                      <p className="text-[9px] font-black text-muted-foreground mt-0.5">R$ {stageValue.toLocaleString('pt-BR')}</p>
                    </div>
                    <span className="bg-foreground dark:bg-muted px-2.5 py-0.5 rounded-full text-[9px] font-black text-background dark:text-foreground">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 space-y-4 overflow-y-auto max-h-[calc(100vh-340px)] scrollbar-none pb-4">
                    {stageLeads.length === 0 ? (
                      <div className="h-24 border border-dashed border-border/60 rounded-2xl flex items-center justify-center text-center p-4">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-relaxed">Arraste negócios aqui</span>
                      </div>
                    ) : (
                      stageLeads.map(lead => {
                        const isLeadStale = isStale(lead);
                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, lead.id)}
                            onClick={() => setSelectedLead(lead)}
                            className={`p-4 bg-card rounded-2xl border hover:border-primary shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 relative group ${
                              isLeadStale ? 'border-amber-400 bg-amber-50/10' : 'border-border'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-[8px] font-black uppercase text-primary rounded-md truncate max-w-[120px]">
                                {lead.company_niche || 'Geral'}
                              </span>
                              {lead.temperature === 'Quente' && (
                                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="Lead Quente!" />
                              )}
                            </div>

                            <h4 className="text-xs font-black text-foreground group-hover:text-primary transition-colors truncate">{lead.company_name || 'Sem Empresa'}</h4>
                            <p className="text-[9px] font-bold text-muted-foreground tracking-wider mb-3 truncate">{lead.contact_name || lead.name || 'Contato Indefinido'}</p>

                            <div className="flex items-center justify-between border-t border-border/50 pt-3 pt-3 mt-3 text-[10px] font-black text-foreground">
                              <span>R$ {Number(lead.value).toLocaleString('pt-BR')}</span>
                              <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleMoveLeadStage(lead, 'prev'); }}
                                  className="p-1 bg-muted rounded-md text-muted-foreground hover:text-foreground"
                                  title="Mover anterior"
                                >
                                  <ICONS.ChevronLeft className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleMoveLeadStage(lead, 'next'); }}
                                  className="p-1 bg-muted rounded-md text-muted-foreground hover:text-foreground"
                                  title="Mover posterior"
                                >
                                  <ICONS.ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-card border border-border rounded-3xl shadow-sm">
          {activeLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Nenhum negócio ativo registrado</span>
            </div>
          ) : (
            <div className="min-w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Empresa</th>
                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Contato</th>
                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Estágio</th>
                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Valor</th>
                    <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Temperatura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLocalLeads.map(l => (
                    <tr 
                      key={l.id} 
                      onClick={() => setSelectedLead(l)}
                      className="hover:bg-muted/15 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-black text-xs text-foreground uppercase">{l.company_name}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">{l.contact_name || l.name || '-'}</td>
                      <td className="px-6 py-4 text-xs font-black uppercase text-primary">
                        {activePipeline.stages.find(s => s.id === l.stage)?.name || 'Outro'}
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-foreground">R$ {Number(l.value || 0).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          l.temperature === 'Quente' ? 'bg-orange-500/10 text-orange-600' : l.temperature === 'Morno' ? 'bg-blue-500/10 text-blue-600' : 'bg-muted text-muted-foreground'
                        }`}>
                          {l.temperature || 'Frio'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. slide-over Lead 360 detailed timeline */}
      {selectedLead && (() => {
        // Safe interactive helper within drawer scope
        const renderField = (
          icon: React.ReactNode, 
          label: string, 
          value: string | number | undefined, 
          placeholder: string, 
          linkType?: 'email' | 'phone' | 'url' | 'instagram' | 'linkedin'
        ) => {
          const isValueFilled = value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== '0';
          const displayVal = isValueFilled ? String(value) : placeholder;

          let renderValue = <span className="text-xs font-bold break-all text-foreground/90">{displayVal}</span>;

          if (isValueFilled && linkType) {
            if (linkType === 'email') {
              renderValue = <a href={`mailto:${displayVal}`} className="text-xs font-bold break-all text-blue-600 dark:text-blue-400 hover:underline">{displayVal}</a>;
            } else if (linkType === 'phone') {
              renderValue = <a href={`https://wa.me/${displayVal.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold break-all text-emerald-605 dark:text-emerald-405 hover:underline">{formatPhoneBR(displayVal)}</a>;
            } else if (linkType === 'url') {
              const fullUrl = displayVal.startsWith('http') ? displayVal : `https://${displayVal}`;
              renderValue = <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold break-all text-blue-600 dark:text-blue-400 hover:underline">{displayVal}</a>;
            } else if (linkType === 'instagram') {
              const handle = displayVal.replace('@', '');
              renderValue = <a href={`https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold break-all text-pink-600 dark:text-pink-400 hover:underline">{displayVal.startsWith('@') ? displayVal : `@${displayVal}`}</a>;
            } else if (linkType === 'linkedin') {
              const handle = displayVal.includes('linkedin.com') ? displayVal : `https://linkedin.com/in/${displayVal}`;
              const fullLnk = handle.startsWith('http') ? handle : `https://${handle}`;
              renderValue = <a href={fullLnk} target="_blank" rel="noopener noreferrer" className="text-xs font-bold break-all text-blue-600 dark:text-blue-400 hover:underline">{displayVal}</a>;
            }
          }

          return (
            <div className={`p-3 rounded-2xl border transition-all ${isValueFilled ? 'bg-muted/12 border-border/40 hover:bg-muted/20' : 'bg-muted/5 border-dashed border-border/20 opacity-55'}`}>
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">{label}</span>
              <div className="flex items-start gap-1.5">
                {icon && <span className={`shrink-0 mt-0.5 ${isValueFilled ? 'text-primary' : 'text-muted-foreground/30'}`}>{icon}</span>}
                <div className="flex-1 min-w-0 pr-1">
                  {renderValue}
                </div>
              </div>
            </div>
          );
        };

        const customFieldsKeysList = selectedLead.custom_fields ? Object.keys(selectedLead.custom_fields).filter(k => k !== 'loss_reason') : [];

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex justify-end pointer-events-auto">
            <div className="bg-card w-full max-w-4xl h-full border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-6 border-b border-border flex justify-between items-center shrink-0 bg-card">
                <div>
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight truncate max-w-[450px]">
                    {selectedLead.company_name || 'Sem Empresa'}
                  </h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                    Ficha do Lead • {selectedLead.contact_name || 'Contato Indefinido'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="p-2.5 bg-muted text-muted-foreground rounded-xl hover:bg-muted/85 transition-all cursor-pointer"
                >
                  <ICONS.Plus className="rotate-45 w-5 h-5" />
                </button>
              </div>

              {/* Slider Workspace Container: Split Left (Block A Card Data) and Right (Block B Operations) */}
              <div className="flex-1 overflow-hidden flex divide-x divide-border">
                {/* ----------------- LEFT PANEL: Block A - Complete Data ----------------- */}
                <div className="w-1/2 h-full flex flex-col overflow-hidden bg-card">
                  {/* Sub-Header for Left Block A */}
                  <div className="p-4 border-b border-border bg-muted/10 shrink-0 flex justify-between items-center bg-card">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.12em]">A. Cadastro & Comercial</span>
                    {!isEditingLead ? (
                      <button 
                        onClick={() => setIsEditingLead(true)}
                        className="text-[9.5px] font-black uppercase text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer bg-blue-500/5 px-2.5 py-1.5 rounded-xl border border-blue-500/10"
                      >
                        <Edit className="w-3 h-3" />
                        Editar Dados
                      </button>
                    ) : (
                      <button 
                        onClick={() => setIsEditingLead(false)}
                        className="text-[9.5px] font-black uppercase text-rose-600 dark:text-rose-400 hover:underline cursor-pointer bg-rose-500/5 px-2.5 py-1.5 rounded-xl border border-rose-500/10"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  {/* Scrollable Data Area */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {!isEditingLead ? (
                      /* ===================== VIEW MODE ===================== */
                      <div className="space-y-6 pb-6">
                        {/* Section A.1: Dados da Empresa */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 border-b border-border/40 pb-1 cursor-default">
                            <Package className="w-3.5 h-3.5 text-primary" />
                            <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">1. Dados da Empresa</h5>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            {renderField(<Package className="w-3.5 h-3.5 text-foreground/50" />, 'Empresa', selectedLead.company_name, 'Sem Razão Social')}
                            {renderField(<Package className="w-3.5 h-3.5 text-foreground/50" />, 'Nome Fantasia', selectedLead.custom_fields?.nome_fantasia !== undefined ? String(selectedLead.custom_fields.nome_fantasia) : undefined, 'Não preenchido')}
                            {renderField(<FileText className="w-3.5 h-3.5 text-foreground/50" />, 'CNPJ', selectedLead.company_cnpj || (selectedLead as any).cnpj, 'Sem CNPJ')}
                            {renderField(<LayoutGrid className="w-3.5 h-3.5 text-foreground/50" />, 'Nicho / Segmento', selectedLead.company_niche || (selectedLead as any).niche, 'Sem segmento')}
                            {renderField(<MapPin className="w-3.5 h-3.5 text-foreground/50" />, 'Cidade / UF', selectedLead.company_city && selectedLead.company_state ? `${selectedLead.company_city} - ${selectedLead.company_state}` : (selectedLead.company_city || selectedLead.company_state || undefined), 'Sem localização')}
                            {renderField(<Globe className="w-3.5 h-3.5 text-foreground/50" />, 'Website', selectedLead.company_website || (selectedLead as any).website, 'Sem site', 'url')}
                            {renderField(<Phone className="w-3.5 h-3.5 text-foreground/50" />, 'WhatsApp Empresa', selectedLead.company_whatsapp, 'Sem WhatsApp', 'phone')}
                            {renderField(<Mail className="w-3.5 h-3.5 text-foreground/50" />, 'E-mail Comercial', selectedLead.company_email || (selectedLead as any).email, 'Sem e-mail', 'email')}
                            {renderField(<Instagram className="w-3.5 h-3.5 text-foreground/50" />, 'Instagram Empresa', selectedLead.company_instagram, 'Sem Instagram', 'instagram')}
                            {renderField(<Linkedin className="w-3.5 h-3.5 text-foreground/50" />, 'LinkedIn Empresa', selectedLead.company_linkedin, 'Sem LinkedIn', 'linkedin')}
                          </div>
                          {/* Corporate Notes */}
                          <div className="p-3 bg-muted/5 border border-border/30 rounded-2xl">
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Notas Comerciais da Empresa</span>
                            {selectedLead.business_notes || (selectedLead as any).notes ? (
                              <p className="text-xs font-semibold text-foreground/90 whitespace-pre-wrap leading-relaxed">{selectedLead.business_notes || (selectedLead as any).notes}</p>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic">Nenhuma anotação registrada</span>
                            )}
                          </div>
                        </div>

                        {/* Section A.2: Dados do Contato */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 border-b border-border/40 pb-1 cursor-default">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">2. Dados do Contato Principal</h5>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            {renderField(<Users className="w-3.5 h-3.5 text-foreground/50" />, 'Contato principal', selectedLead.contact_name || selectedLead.name, 'Contato indefinido')}
                            {renderField(<Briefcase className="w-3.5 h-3.5 text-foreground/50" />, 'Cargo / Função', selectedLead.contact_role, 'Sem cargo')}
                            {renderField(<Phone className="w-3.5 h-3.5 text-foreground/50" />, 'WhatsApp Contato', selectedLead.contact_whatsapp || selectedLead.whatsapp, 'Sem WhatsApp', 'phone')}
                            {renderField(<Mail className="w-3.5 h-3.5 text-foreground/50" />, 'E-mail Contato', selectedLead.contact_email || selectedLead.email, 'Sem e-mail', 'email')}
                            {renderField(<Instagram className="w-3.5 h-3.5 text-foreground/50" />, 'Instagram Contato', selectedLead.contact_instagram, 'Sem Instagram', 'instagram')}
                            {renderField(<Linkedin className="w-3.5 h-3.5 text-foreground/50" />, 'LinkedIn Contato', selectedLead.contact_linkedin, 'Sem LinkedIn', 'linkedin')}
                          </div>
                          {/* Contact Notes */}
                          {selectedLead.contact_notes && (
                            <div className="p-3 bg-muted/5 border border-border/40 rounded-2xl">
                              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Observações do Contato</span>
                              <p className="text-xs font-semibold text-foreground/90 whitespace-pre-wrap leading-relaxed">{selectedLead.contact_notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Section A.3: Proposta Comercial / Serviços */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 border-b border-border/40 pb-1 cursor-default">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">3. Proposta & Serviços</h5>
                          </div>
                          
                          {/* List of services and consolidated value */}
                          {(() => {
                            const configs = servicesUtils.parseClientServices(selectedLead.services || [], services);
                            const recSum = configs.filter(c => c.billing_type === 'recorrente').reduce((sum, c) => sum + (c.price || 0), 0);
                            const insSum = configs.filter(c => c.billing_type === 'parcelado' && c.include_in_monthly).reduce((sum, c) => sum + (c.installments && c.installments > 0 ? ((c.price || 0) / c.installments) : 0), 0);
                            const total = recSum + insSum;

                            return (
                              <div className="space-y-2">
                                {configs.length === 0 ? (
                                  <p className="text-[10px] font-bold text-muted-foreground/60 italic p-3 text-center border border-dashed border-border/20 rounded-2xl bg-muted/5">
                                    Nenhum serviço ou proposta financeira unificada configurada para este Lead.
                                  </p>
                                ) : (
                                  <div className="p-3 bg-muted/20 border border-border/50 rounded-2xl space-y-2">
                                    {configs.map((c, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-foreground max-w-[60%] truncate uppercase text-[10px]">{c.name}</span>
                                        <div className="text-right">
                                          <span className="font-black text-foreground">R$ {c.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                          <span className="text-[8px] text-muted-foreground block uppercase font-bold">
                                            {c.billing_type === 'recorrente' ? '🔁 recorrente' : `📅 parcelado (${c.installments}x)`}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="pt-2 border-t border-border/40 flex justify-between items-baseline">
                                      <span className="text-[10px] font-black text-muted-foreground uppercase">Mensalidade Estimada</span>
                                      <span className="text-sm font-black text-primary">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Remaining meaningful fields */}
                          <div className="grid grid-cols-2 gap-2.5">
                            {renderField(<ArrowRight className="w-3.5 h-3.5 text-foreground/50" />, 'Origem do Lead', selectedLead.source, 'Busca Orgânica')}
                            {renderField(<Sparkles className="w-3.5 h-3.5 text-foreground/50" />, 'Campanha', selectedLead.campaign, 'Sem campanha')}
                            {renderField(
                              <Users className="w-3.5 h-3.5 text-foreground/50" />, 
                              'Responsável Comercial', 
                              selectedLead.responsible_name || users.find(u => u.id === selectedLead.responsible_id)?.name, 
                              'Nenhum responsável'
                            )}
                          </div>
                        </div>

                        {/* Section A.4: Campos Complementares / Importados */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 border-b border-border/40 pb-1 cursor-default">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">4. Campos Dinâmicos / Importados</h5>
                          </div>
                          {customFieldsKeysList.length === 0 ? (
                            <p className="text-[10px] font-bold text-muted-foreground/60 italic p-3 text-center border border-dashed border-border/20 rounded-2xl bg-muted/5">
                              Nenhum campo adicional encontrado. Campos extras oriundos de planilhas ou enrichments do AI aparecerão aqui.
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-2.5">
                              {customFieldsKeysList.map(key => (
                                <div key={key}>
                                  {renderField(
                                    <Sparkles className="w-3.5 h-3.5 text-foreground/50" />, 
                                    key.replace(/_/g, ' ').toUpperCase(), 
                                    String(selectedLead.custom_fields?.[key] || ''), 
                                    'Sem dados'
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* ===================== FULL EDIT MODE ===================== */
                      <div className="space-y-6 pb-6">
                        {/* Edit Section 1: Empresa */}
                        <div className="space-y-4 bg-muted/10 p-4 border border-border/60 rounded-3xl">
                          <div className="flex items-center gap-1.5 border-b border-border/40 pb-1.5 non-interactive">
                            <Package className="w-4 h-4 text-primary animate-pulse" />
                            <h5 className="text-[10px] font-black text-foreground uppercase tracking-widest font-sans">1. Dados da Empresa</h5>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Nome / Razão Social</label>
                            <input 
                              type="text" 
                              value={editLeadData.company_name || ''} 
                              onChange={e => setEditLeadData({...editLeadData, company_name: e.target.value})}
                              className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                              placeholder="Razão Social"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">CNPJ</label>
                              <input 
                                type="text" 
                                value={editLeadData.company_cnpj || ''} 
                                onChange={e => setEditLeadData({...editLeadData, company_cnpj: formatCNPJ(e.target.value)})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="00.000.000/0000-00"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Nicho / Segmento</label>
                              <input 
                                type="text" 
                                value={editLeadData.company_niche || ''} 
                                onChange={e => setEditLeadData({...editLeadData, company_niche: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="Segmento de mercado"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Cidade</label>
                              <input 
                                type="text" 
                                value={editLeadData.company_city || ''} 
                                onChange={e => setEditLeadData({...editLeadData, company_city: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="Cidade"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Estado (UF)</label>
                              <input 
                                type="text" 
                                value={editLeadData.company_state || ''} 
                                onChange={e => setEditLeadData({...editLeadData, company_state: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="UF"
                                maxLength={2}
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Website / URL</label>
                            <input 
                              type="text" 
                              value={editLeadData.company_website || ''} 
                              onChange={e => setEditLeadData({...editLeadData, company_website: e.target.value})}
                              className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                              placeholder="https://empresa.com"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">WhatsApp Empresa</label>
                              <input 
                                type="text" 
                                value={editLeadData.company_whatsapp || ''} 
                                onChange={e => setEditLeadData({...editLeadData, company_whatsapp: formatPhoneBR(e.target.value)})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="(00) 00000-0000"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">E-mail Comercial</label>
                              <input 
                                type="email" 
                                value={editLeadData.company_email || ''} 
                                onChange={e => setEditLeadData({...editLeadData, company_email: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="contato@empresa.com"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Instagram Empresa</label>
                              <input 
                                type="text" 
                                value={editLeadData.company_instagram || ''} 
                                onChange={e => setEditLeadData({...editLeadData, company_instagram: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="@empresa"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">LinkedIn Empresa</label>
                              <input 
                                type="text" 
                                value={editLeadData.company_linkedin || ''} 
                                onChange={e => setEditLeadData({...editLeadData, company_linkedin: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="linkedin.com/company/nome"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Observações da Empresa</label>
                            <textarea 
                              value={editLeadData.business_notes || ''} 
                              onChange={e => setEditLeadData({...editLeadData, business_notes: e.target.value})}
                              className="w-full bg-card border border-border p-2.5 rounded-xl font-semibold text-xs text-foreground focus:outline-none min-h-[75px]"
                              placeholder="Notas de prospecção comercial da empresa..."
                            />
                          </div>
                        </div>

                        {/* Edit Section 2: Contato */}
                        <div className="space-y-4 bg-muted/10 p-4 border border-border/60 rounded-3xl">
                          <div className="flex items-center gap-1.5 border-b border-border/40 pb-1.5 non-interactive">
                            <Users className="w-4 h-4 text-primary" />
                            <h5 className="text-[10px] font-black text-foreground uppercase tracking-widest font-sans">2. Dados do Contato Principal</h5>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Nome do Contato</label>
                            <input 
                              type="text" 
                              value={editLeadData.contact_name || ''} 
                              onChange={e => setEditLeadData({...editLeadData, contact_name: e.target.value})}
                              className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                              placeholder="Nome do decisor / representante"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Cargo / Função</label>
                              <input 
                                type="text" 
                                value={editLeadData.contact_role || ''} 
                                onChange={e => setEditLeadData({...editLeadData, contact_role: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="Cargo"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">WhatsApp Contato</label>
                              <input 
                                type="text" 
                                value={editLeadData.contact_whatsapp || ''} 
                                onChange={e => setEditLeadData({...editLeadData, contact_whatsapp: formatPhoneBR(e.target.value)})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="(00) 00000-0000"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">E-mail Contato</label>
                              <input 
                                type="email" 
                                value={editLeadData.contact_email || ''} 
                                onChange={e => setEditLeadData({...editLeadData, contact_email: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="email@contato.com"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Instagram Contato</label>
                              <input 
                                type="text" 
                                value={editLeadData.contact_instagram || ''} 
                                onChange={e => setEditLeadData({...editLeadData, contact_instagram: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="@instagram"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">LinkedIn Contato</label>
                            <input 
                              type="text" 
                              value={editLeadData.contact_linkedin || ''} 
                              onChange={e => setEditLeadData({...editLeadData, contact_linkedin: e.target.value})}
                              className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                              placeholder="linkedin.com/in/nome"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Anotações do Contato</label>
                            <textarea 
                              value={editLeadData.contact_notes || ''} 
                              onChange={e => setEditLeadData({...editLeadData, contact_notes: e.target.value})}
                              className="w-full bg-card border border-border p-2.5 rounded-xl font-semibold text-xs text-foreground focus:outline-none min-h-[60px]"
                              placeholder="Anotações com foco pessoal no contato..."
                            />
                          </div>
                        </div>

                        {/* Edit Section 3: Comercial */}
                        <div className="space-y-4 bg-muted/10 p-4 border border-border/60 rounded-3xl">
                          <div className="flex items-center gap-1.5 border-b border-border/40 pb-1.5 non-interactive">
                            <Clock className="w-4 h-4 text-primary" />
                            <h5 className="text-[10px] font-black text-foreground uppercase tracking-widest font-sans">3. Detalhes Técnicos & Comerciais</h5>
                          </div>

                          {/* Bloco Unificado de Proposta/Serviços */}
                          <div className="bg-card p-4 rounded-2xl border border-border/60">
                            <LeadFinancialServiceBlock
                              servicesCatalog={services}
                              selectedConfigs={editServicesConfigs}
                              onChange={(configs) => {
                                setEditServicesConfigs(configs);
                                const recSum = configs.filter(c => c.billing_type === 'recorrente').reduce((sum, c) => sum + (c.price || 0), 0);
                                const insSum = configs.filter(c => c.billing_type === 'parcelado' && c.include_in_monthly).reduce((sum, c) => sum + (c.installments && c.installments > 0 ? ((c.price || 0) / c.installments) : 0), 0);
                                const total = recSum + insSum;
                                setEditLeadData(prev => ({
                                  ...prev,
                                  value: total,
                                  proposed_ticket: total,
                                  services: servicesUtils.serializeClientServices(configs)
                                }));
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Origem do Lead</label>
                              <input 
                                type="text" 
                                value={editLeadData.source || ''} 
                                onChange={e => setEditLeadData({...editLeadData, source: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="Origem"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">UTM Campanha</label>
                              <input 
                                type="text" 
                                value={editLeadData.campaign || ''} 
                                onChange={e => setEditLeadData({...editLeadData, campaign: e.target.value})}
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                placeholder="Campanha"
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">Responsável Comercial</label>
                              <select 
                                value={editLeadData.responsible_id || ''} 
                                onChange={e => setEditLeadData({...editLeadData, responsible_id: e.target.value})} 
                                className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none cursor-pointer"
                              >
                                <option value="">Sem responsável</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Edit Section 4: Dynamic Custom Fields */}
                        <div className="space-y-4 bg-muted/10 p-4 border border-border/60 rounded-3xl">
                          <div className="flex items-center gap-1.5 border-b border-border/40 pb-1.5 non-interactive">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <h5 className="text-[10px] font-black text-foreground uppercase tracking-widest font-sans">4. Campos Importados / Personalizados</h5>
                          </div>
                          {Object.keys(editLeadData.custom_fields || {}).length === 0 ? (
                            <p className="text-[10px] font-bold text-muted-foreground/60 italic">Nenhum campo personalizado cadastrado neste lead.</p>
                          ) : (
                            <div className="space-y-3.5">
                              {Object.entries(editLeadData.custom_fields || {}).map(([key, val]) => (
                                <div key={key} className="space-y-1">
                                  <label className="text-[8.5px] font-black text-muted-foreground uppercase tracking-widest ml-0.5">{key.replace(/_/g, ' ').toUpperCase()}</label>
                                  <input 
                                    type="text" 
                                    value={String(val || '')} 
                                    onChange={e => {
                                      const nextC = { ...(editLeadData.custom_fields || {}) };
                                      nextC[key] = e.target.value;
                                      setEditLeadData({...editLeadData, custom_fields: nextC});
                                    }}
                                    className="w-full bg-card border border-border p-2.5 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom Actions for Edit Mode */}
                        <div className="flex gap-2.5 pt-4">
                          <button
                            onClick={handleSaveLeadDetails}
                            disabled={isSyncing}
                            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-55 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            {isSyncing ? 'Salvando...' : 'Salvar Ficha'}
                          </button>
                          <button
                            onClick={() => setIsEditingLead(false)}
                            className="px-5 py-3.5 bg-muted hover:bg-muted/80 text-muted-foreground font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ----------------- RIGHT PANEL: Block B - Operation Central ----------------- */}
                <div className="w-1/2 h-full flex flex-col overflow-hidden bg-muted/8">
                  {/* High Intensity Controls Card at the Top of Operation panel */}
                  <div className="p-5 border-b border-border shrink-0 bg-card space-y-4">
                    {/* Block Title */}
                    <div className="flex justify-between items-center cursor-default">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.12em]">B. Central de Operações</span>
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-wider rounded-md">Atividade Realtime</span>
                    </div>

                    {/* Estágio Transition Selector */}
                    <div className="p-3 bg-muted/12 border border-border/50 rounded-2xl">
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Mover Estágio Principal</span>
                      <select
                        value={selectedLead.stage}
                        onChange={e => handleMoveToStage(selectedLead, e.target.value)}
                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-black text-primary uppercase select-none focus:outline-none cursor-pointer"
                      >
                        {activePipeline.stages.map(s => (
                          <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Commercial Operation Triggers panel (win, lose, IA, delete) */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleStageTransitionCheck(selectedLead, 'Onboarding', false, selectedLead.stage)}
                        className="py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer text-center"
                      >
                        🚀 Onboarding
                      </button>
                      <button
                        onClick={() => handleEnrichSingleLead(selectedLead)}
                        className="py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        ⚡️ IA Enrich
                      </button>
                      <button
                        onClick={() => showWonConfirm(selectedLead)}
                        className="py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer text-center"
                      >
                        🏅 Ganhar
                      </button>
                      <button
                        onClick={() => showLostConfirm(selectedLead)}
                        className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer text-center"
                      >
                        💀 Perder
                      </button>
                      <button
                        onClick={() => showDeleteConfirm(selectedLead)}
                        className="col-span-2 py-2 bg-muted text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer text-center"
                      >
                        🗑️ Excluir Lead / Cancelar Negócio
                      </button>
                    </div>
                  </div>

                  {/* Tabbed Interactive Area (Timeline vs Tarefas) at the Bottom */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header Tabs */}
                    <div className="flex border-b border-border shrink-0 bg-card">
                      {['history', 'tasks'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab360(tab as any)}
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                            activeTab360 === tab ? 'text-primary border-b-2 border-primary bg-muted/15' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {tab === 'history' ? 'Timeline / Histórico' : 'Tarefas Pendentes'}
                        </button>
                      ))}
                    </div>

                    {/* Content Box with Scroll */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {activeTab360 === 'history' && (
                        <div className="space-y-4">
                          {/* Interaction registration note form */}
                          <div className="p-3 bg-card rounded-2xl shadow-xs border border-border flex flex-col gap-2.5">
                            <textarea
                              placeholder="Registrar anotação de follow-up ou contato..."
                              value={interactionNote}
                              onChange={e => setInteractionNote(e.target.value)}
                              className="w-full bg-muted/60 border border-border/35 rounded-xl p-2.5 text-xs font-semibold focus:outline-none placeholder-muted-foreground/60 min-h-[60px] resize-none"
                            />
                            <button
                              onClick={handleRegisterInteraction}
                              disabled={isRegisteringInteraction}
                              className="px-4 py-1.5 bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-wider rounded-lg hover:opacity-90 transition-all self-end cursor-pointer"
                            >
                              Registrar Notas
                            </button>
                          </div>

                          {/* Chronological events */}
                          <div className="space-y-2.5">
                            {interactions.length === 0 ? (
                              <div className="text-center p-6 border border-dashed border-border/20 rounded-2xl bg-muted/5 cursor-default">
                                <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest leading-loose">Sem interações registradas nesta timeline</span>
                              </div>
                            ) : (
                              interactions.map(item => (
                                <div 
                                  key={item.id} 
                                  onClick={() => setSelectedInteractiveItem(item)}
                                  className="p-3 bg-card border border-border/50 rounded-xl shadow-xs hover:border-primary/30 transition-all cursor-pointer hover:bg-muted/15"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="text-[8.5px] font-black uppercase text-primary tracking-widest">{item.title}</span>
                                    <span className="text-[8px] font-bold text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                                  </div>
                                  <p className="text-[10.5px] font-semibold text-foreground/85 mt-1.5 leading-relaxed">{item.description}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab360 === 'tasks' && (
                        <div className="space-y-4">
                          {/* Task adder form */}
                          <div className="p-3 bg-card rounded-2xl border border-border shadow-xs flex flex-col gap-2.5">
                            <input
                              placeholder="Adicionar nova tarefa de follow-up..."
                              value={newTaskData.title || ''}
                              onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                              className="w-full bg-muted/60 border border-border/35 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none placeholder-muted-foreground/60"
                            />
                            <button
                              onClick={handleCreateTask}
                              className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-black text-[9px] uppercase tracking-wider self-end cursor-pointer"
                            >
                              Criar Tarefa
                            </button>
                          </div>

                          {/* list of tasks */}
                          <div className="space-y-2">
                            {tasks.filter(t => t.lead_id === selectedLead.id).length === 0 ? (
                              <div className="text-center p-6 border border-dashed border-border/20 rounded-2xl bg-muted/5 cursor-default">
                                <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest leading-loose">Nenhuma tarefa pendente</span>
                              </div>
                            ) : (
                              tasks.filter(t => t.lead_id === selectedLead.id).map(t => (
                                <div 
                                  key={t.id} 
                                  onClick={() => setSelectedInteractiveItem(t)}
                                  className="p-3 bg-card border border-border/50 rounded-xl flex justify-between items-center shadow-xs cursor-pointer hover:border-primary/30 hover:bg-muted/15 transition-all"
                                >
                                  <span className="text-xs font-semibold text-foreground/85 pr-2">{t.title}</span>
                                  <span className="text-[8.5px] font-black uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground shrink-0">{t.status}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. Pipelines selection popup */}
      {isPipelineModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] p-8 border border-border shadow-2xl animate-zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Alterar Pipeline</h3>
              <button onClick={() => setIsPipelineModalOpen(false)} className="p-2.5 bg-muted text-muted-foreground rounded-xl">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <div className="space-y-2">
              {pipelines.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setActivePipelineId?.(p.id); setIsPipelineModalOpen(false); }}
                  className={`w-full p-4.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    activePipelineId === p.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-wider">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Configure pipeline stages popup */}
      {isStageConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-[2.5rem] p-8 border border-border shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Estágios do Funil</h3>
              <button onClick={() => setIsStageConfigModalOpen(false)} className="p-2.5 bg-muted rounded-xl">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">Gerencie os estágios e ordens de pipeline comercial ativos.</p>
              {activePipeline.stages.map(s => (
                <div key={s.id} className="p-4 bg-muted/20 border border-border rounded-xl flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-foreground">{s.name}</span>
                  <span className="text-[9px] font-black uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Won state popup */}
      {isWonModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] p-8 border border-border shadow-2xl">
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">🎉 Negócio Ganho!</h3>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-6">Confirme o valor financeiro consolidado mensal do cliente.</p>
            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase block">Valor Final (Retentor Mensal Fee)</label>
                <input 
                  type="number" 
                  value={wonData.monthly_value || ''} 
                  onChange={e => setWonData({...wonData, monthly_value: Number(e.target.value)})}
                  className="w-full bg-muted rounded-xl p-3 text-sm font-bold text-foreground focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setIsWonModalOpen(false)} className="px-5 py-3.5 bg-muted text-muted-foreground rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={handleWonConfirm} className="px-5 py-3.5 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase hover:bg-emerald-600">Salvar Ganhos</button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Lost state popup */}
      {isLostModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] p-8 border border-border shadow-2xl">
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">💀 Negócio Perdido</h3>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-6">Informe o motivo comercial para fins de métricas.</p>
            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase block">Motivo</label>
                <select 
                  value={lostData.reason || ''} 
                  onChange={e => setLostData({...lostData, reason: e.target.value})}
                  className="w-full bg-muted rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none"
                >
                  <option value="">Selecione o Motivo</option>
                  <option value="Preço alto">Preço alto</option>
                  <option value="Sem fit / perfil">Sem fit / perfil</option>
                  <option value="Decidiu fazer interno">Decidiu fazer interno</option>
                  <option value="Sem retorno do decisor">Sem retorno do decisor</option>
                  <option value="Outro">Outro motivo</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setIsLostModalOpen(false)} className="px-5 py-3.5 bg-muted text-muted-foreground rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={handleLostConfirm} className="px-5 py-3.5 bg-rose-500 text-white rounded-xl text-xs font-black uppercase hover:bg-rose-600">Salvar Feedback</button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Reactor status popup */}
      {isReactivateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] p-8 border border-border shadow-2xl">
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">⚡️ Reativar Lead</h3>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-6">Mover este lead novamente para as colunas ativas.</p>
            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase block">Motivo da Reativação</label>
                <textarea 
                  value={reactivateData.reason || ''} 
                  onChange={e => setReactivateData({...reactivateData, reason: e.target.value})}
                  className="w-full bg-muted rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none h-20 resize-none animate-in fade-in"
                  placeholder="Por que decidiu retomar o contato?"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setIsReactivateModalOpen(false)} className="px-5 py-3.5 bg-muted text-muted-foreground rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={handleReactivateConfirm} className="px-5 py-3.5 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase hover:opacity-90">Reativar</button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Active Onboarding Conversion Modal */}
      {onboardingConversion && onboardingConversion.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card rounded-[2.5rem] w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl border border-border overflow-hidden">
            <div className="flex justify-between items-center p-8 border-b border-border shrink-0">
              <div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Onboarding de Operação</h3>
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">Associação de Planos e Serviços Contratados</p>
              </div>
              <button onClick={handleCancelConversion} className="p-2.5 bg-muted rounded-xl hover:bg-muted/80 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* SEÇÃO PRINCIPAL — PRÉVIA COMPLETA DE IMPORTAÇÃO (COLUNA ESQUERDA) */}
                <div className="lg:col-span-6 space-y-6 lg:border-r lg:border-border lg:pr-8 pr-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
                      <ICONS.Sales width="16" height="16" />
                    </div>
                    <h4 className="text-xs font-black text-rose-500 uppercase tracking-wider">PRÉVIA COMPLETA DA IMPORTAÇÃO DOS DADOS</h4>
                  </div>
                  
                  {/* 1. Dados da Empresa */}
                  <div className="bg-muted/10 p-6 border border-border/60 rounded-[1.8rem] space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                      <Briefcase className="w-4 h-4 text-rose-500" />
                      <h4 className="text-xs font-black text-foreground uppercase tracking-wider">1. Dados da Empresa</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Razão Social / Empresa</label>
                        <input
                          type="text"
                          value={onboardingConversion.company_name}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, company_name: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          placeholder="Ex: Minha Empresa LTDA"
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Nome Fantasia</label>
                        <input
                          type="text"
                          value={onboardingConversion.custom_fields?.nome_fantasia || ''}
                          onChange={e => {
                            const newCF = { ...(onboardingConversion.custom_fields || {}) };
                            newCF.nome_fantasia = e.target.value;
                            setOnboardingConversion({ ...onboardingConversion, custom_fields: newCF });
                          }}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          placeholder="Ex: Nome da Loja"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">CNPJ</label>
                        <input
                          type="text"
                          value={onboardingConversion.cnpj || ''}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, cnpj: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          placeholder="00.000.000/0000-00"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Nicho / Segmento</label>
                        <input
                          type="text"
                          value={onboardingConversion.company_niche || ''}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, company_niche: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          placeholder="Ex: E-commerce de Moda"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Cidade</label>
                        <input
                          type="text"
                          value={onboardingConversion.company_city || ''}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, company_city: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          placeholder="Cidade"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Estado (UF)</label>
                        <input
                          type="text"
                          value={onboardingConversion.company_state || ''}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, company_state: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          placeholder="Ex: SP"
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Website</label>
                        <div className="relative">
                          <Globe className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground/60" />
                          <input
                            type="text"
                            value={onboardingConversion.company_website || ''}
                            onChange={e => setOnboardingConversion({ ...onboardingConversion, company_website: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl p-3 pl-10 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="www.empresa.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">WhatsApp Empresa</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-3 w-4 h-4 text-emerald-500/80" />
                          <input
                            type="text"
                            value={onboardingConversion.company_whatsapp || ''}
                            onChange={e => setOnboardingConversion({ ...onboardingConversion, company_whatsapp: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl p-3 pl-10 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">E-mail Comercial</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground/60" />
                          <input
                            type="text"
                            value={onboardingConversion.company_email || ''}
                            onChange={e => setOnboardingConversion({ ...onboardingConversion, company_email: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl p-3 pl-10 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="contato@empresa.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Instagram Empresa</label>
                        <div className="relative">
                          <Instagram className="absolute left-3.5 top-3 w-4 h-4 text-pink-500/80" />
                          <input
                            type="text"
                            value={onboardingConversion.company_instagram || ''}
                            onChange={e => setOnboardingConversion({ ...onboardingConversion, company_instagram: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl p-3 pl-10 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="@empresa"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">LinkedIn Empresa</label>
                        <div className="relative">
                          <Linkedin className="absolute left-3.5 top-3 w-4 h-4 text-blue-500/80" />
                          <input
                            type="text"
                            value={onboardingConversion.company_linkedin || ''}
                            onChange={e => setOnboardingConversion({ ...onboardingConversion, company_linkedin: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl p-3 pl-10 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="linkedin.com/company/..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Dados do Contato Principal */}
                  <div className="bg-muted/10 p-6 border border-border/60 rounded-[1.8rem] space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                      <Users className="w-4 h-4 text-rose-500" />
                      <h4 className="text-xs font-black text-foreground uppercase tracking-wider">2. Dados do Contato Principal</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Nome</label>
                        <input
                          type="text"
                          value={onboardingConversion.contact_name}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, contact_name: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          placeholder="Nome do Contato Principal"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Cargo / Função</label>
                        <input
                          type="text"
                          value={onboardingConversion.contact_role || ''}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, contact_role: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          placeholder="Ex: Diretor de Marketing"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">WhatsApp Contato</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-3 w-4 h-4 text-emerald-500/80" />
                          <input
                            type="text"
                            value={onboardingConversion.contact_whatsapp}
                            onChange={e => setOnboardingConversion({ ...onboardingConversion, contact_whatsapp: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl p-3 pl-10 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">E-mail Contato</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground/60" />
                          <input
                            type="text"
                            value={onboardingConversion.contact_email}
                            onChange={e => setOnboardingConversion({ ...onboardingConversion, contact_email: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl p-3 pl-10 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="email@contato.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Instagram Contato</label>
                        <div className="relative">
                          <Instagram className="absolute left-3.5 top-3 w-4 h-4 text-pink-500/80" />
                          <input
                            type="text"
                            value={onboardingConversion.contact_instagram}
                            onChange={e => setOnboardingConversion({ ...onboardingConversion, contact_instagram: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl p-3 pl-10 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="@Instagram"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">LinkedIn Contato</label>
                        <div className="relative">
                          <Linkedin className="absolute left-3.5 top-3 w-4 h-4 text-blue-500/80" />
                          <input
                            type="text"
                            value={onboardingConversion.contact_linkedin || ''}
                            onChange={e => setOnboardingConversion({ ...onboardingConversion, contact_linkedin: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl p-3 pl-10 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                            placeholder="linkedin.com/in/..."
                          />
                        </div>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Notas do Contato Principal</label>
                        <textarea
                          value={onboardingConversion.contact_notes || ''}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, contact_notes: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none h-16 resize-none"
                          placeholder="Notas e recomendações do contato decisor..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Campos Dinâmicos & Importados */}
                  <div className="bg-muted/10 p-6 border border-border/60 rounded-[1.8rem] space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                      <Sparkles className="w-4 h-4 text-rose-500" />
                      <h4 className="text-xs font-black text-foreground uppercase tracking-wider">3. Campos Dinâmicos & Importados</h4>
                    </div>

                    {Object.keys(onboardingConversion.custom_fields || {}).filter(k => k !== 'nome_fantasia' && k !== 'loss_reason').length === 0 ? (
                      <p className="text-[10px] font-bold text-muted-foreground/60 italic pl-1">Nenhum campo personalizado ou planilha importada cadastrada.</p>
                    ) : (
                      <div className="space-y-3.5">
                        {Object.entries(onboardingConversion.custom_fields || {})
                          .filter(([k]) => k !== 'nome_fantasia' && k !== 'loss_reason')
                          .map(([key, val]) => (
                            <div key={key} className="space-y-1">
                              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider ml-0.5">{key.replace(/_/g, ' ')}</label>
                              <input 
                                type="text" 
                                value={String(val || '')} 
                                onChange={e => {
                                  const nextC = { ...(onboardingConversion.custom_fields || {}) };
                                  nextC[key] = e.target.value;
                                  setOnboardingConversion({...onboardingConversion, custom_fields: nextC});
                                }}
                                className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none"
                              />
                            </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notas Gerais */}
                  <div className="bg-muted/10 p-6 border border-border/60 rounded-[1.8rem] space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                      <FileText className="w-4 h-4 text-rose-500" />
                      <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Notas & Histórico do Comercial</h4>
                    </div>
                    <textarea
                      value={onboardingConversion.notes || ''}
                      onChange={e => setOnboardingConversion({ ...onboardingConversion, notes: e.target.value })}
                      className="w-full bg-card border border-border rounded-xl p-3.5 text-xs font-bold text-foreground focus:outline-none placeholder-muted-foreground h-28 resize-none"
                      placeholder="Histórico e notas gerais de vendas para a operação..."
                    />
                  </div>
                </div>

                {/* SEÇÕES B & C — CONFIGURAÇÕES FINANCEIRAS & OPERACIONAIS (COLUNA DIREITA) */}
                <div className="lg:col-span-6 space-y-6">
                  
                  {/* Seção B — Serviços e condições financeiras */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <LayoutGrid width="16" height="16" />
                      </div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-wider">Seção B — Serviços e Condições Financeiras</h4>
                    </div>

                    <div className="mt-3">
                      <LeadFinancialServiceBlock
                        servicesCatalog={services}
                        selectedConfigs={onboardingConversion.services_configs || []}
                        onChange={(configs) => {
                          updateServicesConfigsAndCalculations(configs);
                        }}
                      />
                    </div>
                  </div>

                  {/* Atribuição & Parâmetros Operacionais */}
                  <div className="bg-muted/10 p-6 border border-border/60 rounded-[1.8rem] space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                      <LayoutGrid className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Vínculo Operacional & Origem Comercial</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1 block">Início das Operações</label>
                        <input
                          type="date"
                          value={onboardingConversion.contract_start_date}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, contract_start_date: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1 block">Gestor de Sucesso (CS/Operação)</label>
                        <select
                          value={onboardingConversion.manager_id || ''}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, manager_id: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground cursor-pointer focus:outline-none"
                        >
                          <option value="">Selecione um Gestor</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Origem do Lead</label>
                        <input
                          type="text"
                          value={onboardingConversion.source || ''}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, source: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none"
                          placeholder="Ex: Instagram Ads"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Campanha de Origem</label>
                        <input
                          type="text"
                          value={onboardingConversion.campaign || ''}
                          onChange={e => setOnboardingConversion({ ...onboardingConversion, campaign: e.target.value })}
                          className="w-full bg-card border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none"
                          placeholder="Ex: Black Friday 2026"
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase pl-1">Responsável Comercial (Origem)</label>
                        <select
                          value={onboardingConversion.lead.responsible_id || ''}
                          disabled={true}
                          className="w-full bg-muted/20 border border-border/40 rounded-xl p-3 text-xs font-bold text-muted-foreground cursor-not-allowed focus:outline-none"
                        >
                          <option value="">
                            {users.find(u => u.id === onboardingConversion.lead.responsible_id)?.name || 'Sem responsável comercial'}
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-between bg-card items-center shrink-0">
              <button onClick={handleCancelConversion} className="px-5 py-3 bg-muted text-muted-foreground rounded-xl text-xs font-black uppercase">Cancelar</button>
              <div className="flex gap-3">
                <button onClick={() => handleSaveConversion(false)} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-all">Apenas Salvar</button>
                <button onClick={() => handleSaveConversion(true)} className="px-5 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase hover:opacity-90 transition-all shadow-md shadow-primary/10">Salvar e Abrir Cliente</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. Atividade popup edit modal */}
      {selectedInteractiveItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-[2.5rem] p-8 border border-border shadow-2xl animate-zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Editar Atividade / Tarefa</h3>
              <button 
                onClick={() => setSelectedInteractiveItem(null)} 
                className="p-2.5 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block ml-0.5">Título</label>
                <input 
                  type="text" 
                  value={selectedInteractiveItem.title || ''} 
                  onChange={e => setSelectedInteractiveItem({...selectedInteractiveItem, title: e.target.value})}
                  className="w-full bg-muted/60 border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none"
                  placeholder="Título da atividade"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block ml-0.5">Descrição / Anotação</label>
                <textarea 
                  rows={4}
                  value={selectedInteractiveItem.description || ''} 
                  onChange={e => setSelectedInteractiveItem({...selectedInteractiveItem, description: e.target.value})}
                  className="w-full bg-muted/60 border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none resize-none"
                  placeholder="Conteúdo detalhado..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block ml-0.5">Tipo</label>
                  <select 
                    value={selectedInteractiveItem.type || 'task'} 
                    onChange={e => setSelectedInteractiveItem({...selectedInteractiveItem, type: e.target.value as any})}
                    className="w-full bg-muted/60 border border-border p-3 rounded-xl font-bold text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="task">📝 Tarefa / Follow-up</option>
                    <option value="call">📞 Ligação</option>
                    <option value="WhatsApp">💬 WhatsApp</option>
                    <option value="meeting">🤝 Reunião</option>
                    <option value="email">📧 E-mail</option>
                    <option value="proposal">📄 Proposta</option>
                    <option value="other">🔮 Outro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block ml-0.5">Prazo / Realização</label>
                  <input 
                    type="datetime-local" 
                    value={formatDateTimeLocal(selectedInteractiveItem.due_date || selectedInteractiveItem.created_at)} 
                    onChange={e => setSelectedInteractiveItem({...selectedInteractiveItem, due_date: e.target.value})}
                    className="w-full bg-muted/60 border border-border p-3 rounded-xl font-bold text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {!selectedInteractiveItem.is_legacy_interaction && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block ml-0.5">Status</label>
                    <select 
                      value={selectedInteractiveItem.status || 'Pendente'} 
                      onChange={e => setSelectedInteractiveItem({...selectedInteractiveItem, status: e.target.value})}
                      className="w-full bg-muted/60 border border-border p-3 rounded-xl font-bold text-xs text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="Pendente">⏳ Pendente</option>
                      <option value="Em Execução">🏃 Em Execução</option>
                      <option value="Revisão">🧐 Revisão</option>
                      <option value="Concluído">✅ Concluído</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block ml-0.5">Prioridade</label>
                    <select 
                      value={selectedInteractiveItem.priority || Priority.MEDIUM} 
                      onChange={e => setSelectedInteractiveItem({...selectedInteractiveItem, priority: e.target.value as any})}
                      className="w-full bg-muted/60 border border-border p-3 rounded-xl font-bold text-xs text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="Baixa">🟢 Baixa</option>
                      <option value="Média">🟡 Média</option>
                      <option value="Alta">🟠 Alta</option>
                      <option value="Urgente">🔴 Urgente</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t border-border shrink-0">
              <button 
                onClick={handleDeleteInteractiveItem}
                className="px-5 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedInteractiveItem(null)} 
                  className="px-5 py-3.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveInteractiveItem}
                  className="px-5 py-3.5 bg-primary hover:opacity-90 text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. Duplicate Warning Modal */}
      {duplicateWarning && duplicateWarning.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] p-8 border border-border shadow-2xl">
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight mb-2">⚠️ Cliente Já Registrado</h3>
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed mb-6">{duplicateWarning.reason}</p>
            <div className="flex gap-3 justify-end leading-none">
              <button onClick={handleCloseDuplicateWarning} className="px-5 py-3.5 bg-muted text-muted-foreground rounded-xl text-xs font-black uppercase">Fechar</button>
              <button onClick={handleOpenExistingClient} className="px-5 py-3.5 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase hover:opacity-90">Abrir Cliente Existente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesCRM;
