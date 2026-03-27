import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { Lead, Pipeline, Contact, User } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../lib/supabase';
import { formatCNPJ, formatPhoneBR } from '../utils/formatters';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface DataEnrichmentProps {
  pipelines: Pipeline[];
  onImportComplete: () => void;
  currentUser?: User | null;
}

const DataEnrichment: React.FC<DataEnrichmentProps> = ({ pipelines, onImportComplete, currentUser }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[][]>([]);
  
  // mapping stores: columnIndex -> { targetField, isCustom, customName, customType }
  const [mapping, setMapping] = useState<Record<number, { 
    target: string; 
    customName?: string; 
    customType?: string;
  }>>({});

  const [importedLeads, setImportedLeads] = useState<Partial<Lead>[]>([]);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number | null>(null);
  const [editingLead, setEditingLead] = useState<Partial<Lead> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggestingMapping, setIsSuggestingMapping] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState(pipelines[0]?.id || '');
  const [selectedStage, setSelectedStage] = useState(pipelines[0]?.stages[0]?.id || '');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const CRM_FIELDS = [
    { id: 'name', label: 'Nome / Título' },
    { id: 'company', label: 'Empresa / Razão Social' },
    { id: 'email', label: 'E-mail Principal' },
    { id: 'phone', label: 'Telefone' },
    { id: 'company_whatsapp', label: 'WhatsApp' },
    { id: 'company_linkedin', label: 'LinkedIn' },
    { id: 'niche', label: 'Segmento / Setor' },
    { id: 'city', label: 'Cidade' },
    { id: 'state', label: 'Estado' },
    { id: 'source', label: 'Origem / Fonte' },
    { id: 'notes', label: 'Observações' },
    { id: 'cnpj', label: 'CNPJ' },
    { id: 'website', label: 'Website' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'legal_name', label: 'Razão Social Jurídica' },
    { id: 'partners', label: 'Sócios / QSA' },
    { id: 'address', label: 'Endereço Completo' },
    { id: 'service_type', label: 'Tipo de Serviço' },
    { id: 'proposed_ticket', label: 'Ticket Proposto' },
    { id: 'company_whatsapp', label: 'WhatsApp da Empresa' },
    { id: 'company_linkedin', label: 'LinkedIn da Empresa' },
    { id: 'contact_whatsapp', label: 'WhatsApp do Contato' },
    { id: 'contact_linkedin', label: 'LinkedIn do Contato' },
  ];

  useEffect(() => {
    const pipeline = pipelines.find(p => p.id === selectedPipeline);
    if (pipeline && pipeline.stages.length > 0) {
      setSelectedStage(pipeline.stages[0].id);
    }
  }, [selectedPipeline, pipelines]);

  const handleAISuggestMapping = async () => {
    if (csvHeaders.length === 0) return;
    setIsSuggestingMapping(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("API Key não configurada.");
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é um engenheiro de dados especialista em CRM. 
Analise estes cabeçalhos de uma planilha de leads: ${JSON.stringify(csvHeaders)}.
Mapeie-os para os seguintes campos do CRM: ${JSON.stringify(CRM_FIELDS.map(f => f.id))}.
Considere variações: "tel", "celular", "whatsapp" -> phone; "empresa", "negócio", "razão social" -> company; "nicho", "setor" -> niche; "município" -> city; "cnpj" -> cnpj.
Retorne APENAS um objeto JSON onde as chaves são os ÍNDICES (0-based) das colunas da planilha e os valores são o ID do campo correspondente no CRM.
Se não encontrar correspondência clara, não inclua no objeto ou use null.
Exemplo: {"0": "name", "2": "email"}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const suggested = JSON.parse(response.text || "{}");
      const newMapping = { ...mapping };
      Object.keys(suggested).forEach(colIdx => {
        const idx = parseInt(colIdx);
        if (suggested[colIdx] && !isNaN(idx)) {
          newMapping[idx] = { target: suggested[colIdx] };
        }
      });
      setMapping(newMapping);
    } catch (error) {
      console.error("Erro ao sugerir mapeamento:", error);
    } finally {
      setIsSuggestingMapping(false);
    }
  };

  useEffect(() => {
    if (isEditModalOpen && modalContentRef.current) {
      const textareas = modalContentRef.current.querySelectorAll('textarea');
      textareas.forEach(ta => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    }
  }, [isEditModalOpen, editingLead]);

  useEffect(() => {
    const savedMapping = localStorage.getItem('m4_last_mapping');
    if (savedMapping) {
      try {
        setMapping(JSON.parse(savedMapping));
      } catch (e) {
        console.error("Erro ao carregar mapeamento salvo:", e);
      }
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (results) => {
          processRawData(results.data as any[][]);
        },
        header: false,
        skipEmptyLines: true
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        processRawData(json as any[][]);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Formato de arquivo não suportado. Use .csv ou .xlsx");
      setIsAnalyzing(false);
    }
  };

  const processRawData = (data: any[][]) => {
    if (data.length > 0) {
      const headers = data[0].map(h => String(h || '').trim());
      const rows = data.slice(1);
      
      setCsvHeaders(headers);
      setCsvRows(rows);
      
      // Intelligent Auto-mapping
      const newMapping: Record<number, { target: string }> = {};
      headers.forEach((h, index) => {
        const lower = h.toLowerCase();
        if (lower.includes('nome') || lower.includes('name') || lower.includes('contato')) newMapping[index] = { target: 'name' };
        else if (lower.includes('email') || lower.includes('e-mail') || lower.includes('mail')) newMapping[index] = { target: 'email' };
        else if (lower.includes('whatsapp') || lower.includes('wpp') || lower.includes('zap')) {
          if (lower.includes('empresa') || lower.includes('company')) newMapping[index] = { target: 'company_whatsapp' };
          else if (lower.includes('contato') || lower.includes('pessoal')) newMapping[index] = { target: 'contact_whatsapp' };
          else newMapping[index] = { target: 'whatsapp' };
        }
        else if (lower.includes('linkedin') || lower.includes('linked in')) {
          if (lower.includes('empresa') || lower.includes('company')) newMapping[index] = { target: 'company_linkedin' };
          else if (lower.includes('contato') || lower.includes('pessoal')) newMapping[index] = { target: 'contact_linkedin' };
          else newMapping[index] = { target: 'linkedin' };
        }
        else if (lower.includes('telefone') || lower.includes('phone') || lower.includes('celular') || lower.includes('tel')) newMapping[index] = { target: 'phone' };
        else if (lower.includes('empresa') || lower.includes('company') || lower.includes('razão') || lower.includes('fantasia')) newMapping[index] = { target: 'company_name' };
        else if (lower.includes('segmento') || lower.includes('nicho') || lower.includes('segment') || lower.includes('setor')) newMapping[index] = { target: 'segment' };
        else if (lower.includes('cidade') || lower.includes('city') || lower.includes('município')) newMapping[index] = { target: 'city' };
        else if (lower.includes('cnpj')) newMapping[index] = { target: 'company_cnpj' };
        else if (lower.includes('instagram')) newMapping[index] = { target: 'company_instagram' };
        else if (lower.includes('site') || lower.includes('website')) newMapping[index] = { target: 'website' };
        else if (lower.includes('fonte') || lower.includes('source') || lower.includes('origem')) newMapping[index] = { target: 'source' };
        else if (lower.includes('nota') || lower.includes('obs') || lower.includes('notes')) newMapping[index] = { target: 'notes' };
        else if (lower.includes('sócio') || lower.includes('socio') || lower.includes('partners')) newMapping[index] = { target: 'partners' };
      });
      
      setMapping(newMapping);
      setTimeout(() => {
        setIsAnalyzing(false);
        setStep(2);
      }, 800);
    } else {
      setIsAnalyzing(false);
      alert("O arquivo parece estar vazio.");
    }
  };

  const handleProcessMapping = () => {
    const parsed: Partial<Lead>[] = csvRows.map(row => {
      const lead: Partial<Lead> & { customFields?: Record<string, any> } = {
        value: 0,
        contacts: [],
        customFields: {}
      };

      Object.entries(mapping).forEach(([colIdxStr, config]) => {
        const colIdx = parseInt(colIdxStr);
        const value = row[colIdx];
        const cfg = config as { target: string; customName?: string; customType?: string };
        if (value === undefined || value === null || cfg.target === 'ignore') return;

        if (cfg.target === 'custom' && cfg.customName) {
          if (!lead.customFields) lead.customFields = {};
          lead.customFields[cfg.customName] = value;
        } else if (cfg.target !== 'custom') {
          (lead as any)[cfg.target] = String(value);
        }
      });

      return lead;
    });

    const validLeads = parsed.filter(l => l.name || l.company);
    if (validLeads.length === 0) {
      alert("Pelo menos o campo 'Nome' ou 'Empresa' deve estar mapeado e preenchido.");
      return;
    }

    setImportedLeads(validLeads);
    setSelectedIndices(validLeads.map((_, i) => i));
    setStep(3);
  };

  const handleEditLead = (index: number) => {
    setSelectedLeadIndex(index);
    setEditingLead({ ...importedLeads[index] });
    setIsEditModalOpen(true);
  };

  const saveEditedLead = () => {
    if (selectedLeadIndex !== null && editingLead) {
      const updated = [...importedLeads];
      updated[selectedLeadIndex] = editingLead;
      setImportedLeads(updated);
      setIsEditModalOpen(false);
      setSelectedLeadIndex(null);
      setEditingLead(null);
    }
  };

  const handleSaveImported = async () => {
    setIsSyncing(true);
    
    const leadsToSave = selectedIndices.length > 0 
      ? importedLeads.filter((_, i) => selectedIndices.includes(i))
      : importedLeads;

    if (leadsToSave.length === 0) {
      alert("Nenhum lead selecionado para importação.");
      setIsSyncing(false);
      return;
    }

    const toInsert = leadsToSave.map(lead => {
      const { contacts, ...leadData } = lead;
      return {
        ...leadData,
        pipeline_id: selectedPipeline,
        stage: selectedStage,
        workspace_id: currentUser?.workspace_id,
        created_at: new Date().toISOString(),
        next_action: 'Qualificar lead importado',
        next_action_date: new Date().toISOString().split('T')[0]
      };
    });

    const { error } = await supabase
      .from('m4_leads')
      .insert(toInsert);

    if (error) {
      alert("Erro ao salvar no Supabase: " + error.message);
    } else {
      onImportComplete();
    }
    setIsSyncing(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Importação de Leads</h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-2">Dados Enriquecidos Externamente (Ex: Manus)</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-500 ${step >= s ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-100 text-slate-400'}`}>
                {s}
              </div>
              {s < 3 && <div className={`w-6 h-1 rounded-full ${step > s ? 'bg-blue-600' : 'bg-slate-100'}`}></div>}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white p-16 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 text-center relative overflow-hidden group">
          {isAnalyzing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-blue-600 uppercase tracking-widest text-xs animate-pulse">Analisando Estrutura da Planilha...</p>
            </div>
          )}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-28 h-28 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-600 mx-auto mb-8 shadow-inner">
            <ICONS.Database width="48" height="48" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-4">Importe sua Planilha de Leads</h3>
          <p className="text-slate-500 mb-10 max-w-md mx-auto font-medium leading-relaxed">Envie um arquivo <span className="text-blue-600 font-bold">.CSV</span> ou <span className="text-blue-600 font-bold">.XLSX</span> com seus leads já enriquecidos (ex.: via Manus).</p>
          
          <div className="flex flex-col items-center gap-4">
            <label className="inline-flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm hover:bg-blue-600 shadow-2xl transition-all cursor-pointer hover:-translate-y-1 active:scale-95">
              <ICONS.Plus /> SELECIONAR PLANILHA
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} ref={fileInputRef} />
            </label>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Dica: Use colunas como nome, e-mail, telefone, empresa, cidade, segmento, origem, sócios, etc.</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <ICONS.Automation width="28" height="28" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Mapeamento de Colunas</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Conecte cada coluna da sua planilha a um campo do CRM</p>
              </div>
            </div>
            <button 
              onClick={handleAISuggestMapping}
              disabled={isSuggestingMapping}
              className="px-8 py-4 bg-amber-500 text-white rounded-[2rem] font-black text-sm uppercase hover:bg-amber-600 shadow-xl shadow-amber-100 transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {isSuggestingMapping ? <span className="animate-spin text-xl">◌</span> : <ICONS.Automation />}
              {isSuggestingMapping ? "ANALISANDO..." : "Sugerir Mapeamento com IA"}
            </button>
          </div>
          
          <div className="space-y-4 mb-12">
            <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-900 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest">
              <div className="col-span-4">Coluna na Planilha</div>
              <div className="col-span-4">Campo de Destino no CRM</div>
              <div className="col-span-4">Configuração Adicional</div>
            </div>
            {csvHeaders.map((header, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 items-center group hover:border-blue-200 transition-all shadow-sm">
                <div className="col-span-4">
                  <p className="font-black text-slate-900 truncate">{header}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Coluna {index + 1}</p>
                </div>
                <div className="col-span-4">
                  <select 
                    value={mapping[index]?.target || 'ignore'} 
                    onChange={(e) => setMapping({...mapping, [index]: { ...mapping[index], target: e.target.value }})}
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 shadow-sm transition-all appearance-none cursor-pointer"
                  >
                    <option value="ignore">-- Ignorar Coluna --</option>
                    <optgroup label="Campos Existentes">
                      {CRM_FIELDS.map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </optgroup>
                    <option value="custom">+ Criar Campo Personalizado</option>
                  </select>
                </div>
                <div className="col-span-4">
                  {mapping[index]?.target === 'custom' && (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Nome do Campo"
                        value={mapping[index]?.customName || ''}
                        onChange={(e) => setMapping({...mapping, [index]: { ...mapping[index], customName: e.target.value }})}
                        className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 shadow-sm transition-all"
                      />
                      <select
                        value={mapping[index]?.customType || 'text'}
                        onChange={(e) => setMapping({...mapping, [index]: { ...mapping[index], customType: e.target.value }})}
                        className="p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 shadow-sm transition-all appearance-none cursor-pointer"
                      >
                        <option value="text">Texto</option>
                        <option value="number">Número</option>
                        <option value="date">Data</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-8 border-t border-slate-50">
            <button onClick={() => setStep(1)} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-sm hover:bg-slate-200 transition-all active:scale-95">
              VOLTAR
            </button>
            <button onClick={handleProcessMapping} className="flex-1 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95">
              CONTINUAR PARA REVISÃO
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <ICONS.Automation width="28" height="28" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Configuração & Confirmação</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Revise os leads e confirme a importação para o pipeline selecionado</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
              <div className="flex flex-col">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Pipeline de Destino</label>
                <select 
                  value={selectedPipeline} 
                  onChange={(e) => setSelectedPipeline(e.target.value)}
                  className="p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none min-w-[200px]"
                >
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Estágio Inicial</label>
                <select 
                  value={selectedStage} 
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none min-w-[200px]"
                >
                  {pipelines.find(p => p.id === selectedPipeline)?.stages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="h-12 w-px bg-slate-200 mx-2 hidden lg:block"></div>
              <div className="text-right px-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionados</p>
                <p className="text-xl font-black text-blue-600">{selectedIndices.length} / {importedLeads.length}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[2rem] border border-slate-100 mb-10 shadow-inner bg-slate-50/50">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-5 w-10">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-600"
                      checked={selectedIndices.length === importedLeads.length && importedLeads.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIndices(importedLeads.map((_, i) => i));
                        else setSelectedIndices([]);
                      }}
                    />
                  </th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">Lead / Empresa</th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">Contato</th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">Nicho / Origem</th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">Campos Personalizados</th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importedLeads.map((lead, i) => (
                  <tr 
                    key={i} 
                    className={`hover:bg-blue-50/30 transition-colors ${selectedIndices.includes(i) ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="px-6 py-5">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-slate-200 text-blue-600"
                        checked={selectedIndices.includes(i)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIndices([...selectedIndices, i]);
                          else setSelectedIndices(selectedIndices.filter(idx => idx !== i));
                        }}
                      />
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-black text-slate-900">{lead.name || lead.company}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{lead.company}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-slate-600 font-medium">{lead.email}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{lead.phone ? formatPhoneBR(lead.phone) : ''}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-blue-500 font-black text-[10px] uppercase">{lead.niche || 'Pendente'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{lead.source || 'Importação'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(lead.custom_fields || {}).map(([key, val]) => (
                          <span key={key} className="px-2 py-1 bg-slate-100 text-[9px] font-bold text-slate-500 rounded-lg border border-slate-200">
                            {key}: {String(val)}
                          </span>
                        ))}
                        {Object.keys(lead.custom_fields || {}).length === 0 && <span className="text-slate-300 italic text-[10px]">Nenhum</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditLead(i)} className="p-2 text-slate-400 hover:text-blue-600 transition-all" title="Editar">
                          <ICONS.Settings width="16" height="16" />
                        </button>
                        
                        {deletingIndex === i ? (
                          <div className="flex gap-1 animate-in fade-in zoom-in duration-200">
                            <button 
                              onClick={() => {
                                setImportedLeads(prev => prev.filter((_, idx) => idx !== i));
                                setSelectedIndices(prev => prev.filter(idx => idx !== i).map(idx => idx > i ? idx - 1 : idx));
                                setDeletingIndex(null);
                              }}
                              className="px-2 py-1 bg-rose-600 text-white text-[9px] font-black rounded-lg uppercase tracking-tighter"
                            >
                              Sim
                            </button>
                            <button 
                              onClick={() => setDeletingIndex(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-600 text-[9px] font-black rounded-lg uppercase tracking-tighter"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeletingIndex(i)} 
                            className="p-2 text-slate-300 hover:text-rose-600 transition-all"
                            title="Remover da lista"
                          >
                            <ICONS.Plus className="rotate-45" width="16" height="16" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4 pt-8 border-t border-slate-50">
            <button onClick={() => setStep(2)} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-sm hover:bg-slate-200 transition-all">
              VOLTAR
            </button>
            <button 
              onClick={handleSaveImported} 
              disabled={isSyncing} 
              className="flex-1 px-12 py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-sm hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {isSyncing ? "SALVANDO..." : `CONFIRMAR IMPORTAÇÃO (${selectedIndices.length} LEADS)`}
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-12 pb-6 flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-3xl font-black text-slate-900">Editar Lead</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Refine os dados antes da importação</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all">
                <ICONS.X />
              </button>
            </div>

            <div ref={modalContentRef} className="flex-1 overflow-y-auto px-12 py-6 space-y-12">
              {/* Negociação */}
              <section className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <ICONS.Sales width="20" height="20" />
                  </div>
                  Negociação
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Negócio</label>
                    <textarea 
                      rows={1}
                      value={editingLead.name || ''} 
                      onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })} 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none overflow-hidden min-h-[56px]"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Qualificação</label>
                    <select value={editingLead.qualification || ''} onChange={(e) => setEditingLead({ ...editingLead, qualification: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]">
                      <option value="">Selecionar...</option>
                      <option value="1">1 - Muito Baixa</option>
                      <option value="2">2 - Baixa</option>
                      <option value="3">3 - Média</option>
                      <option value="4">4 - Alta</option>
                      <option value="5">5 - Muito Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp</label>
                    <input type="text" value={editingLead.company_whatsapp || ''} onChange={(e) => setEditingLead({ ...editingLead, company_whatsapp: formatPhoneBR(e.target.value) })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">LinkedIn</label>
                    <input type="text" value={editingLead.company_linkedin || ''} onChange={(e) => setEditingLead({ ...editingLead, company_linkedin: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Total</label>
                    <input type="number" value={editingLead.value || 0} onChange={(e) => setEditingLead({ ...editingLead, value: Number(e.target.value) })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Previsão de Fechamento</label>
                    <input type="date" value={editingLead.closing_forecast || ''} onChange={(e) => setEditingLead({ ...editingLead, closing_forecast: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fonte</label>
                    <textarea 
                      rows={1}
                      value={editingLead.source || ''} 
                      onChange={(e) => setEditingLead({ ...editingLead, source: e.target.value })} 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none overflow-hidden min-h-[56px]"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Campanha</label>
                    <textarea 
                      rows={1}
                      value={editingLead.campaign || ''} 
                      onChange={(e) => setEditingLead({ ...editingLead, campaign: e.target.value })} 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none overflow-hidden min-h-[56px]"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Contatos */}
              <section className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                      <ICONS.Clients width="20" height="20" />
                    </div>
                    Contatos
                  </h4>
                  <button 
                    onClick={() => {
                      const contacts = editingLead.contacts || [];
                      setEditingLead({ 
                        ...editingLead, 
                        contacts: [...contacts, { 
                          id: crypto.randomUUID(),
                          company_id: '',
                          name: '', 
                          email: '', 
                          phone: '', 
                          role: '',
                          is_primary: false,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        } as Contact] 
                      });
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
                  >
                    + Adicionar Contato
                  </button>
                </div>
                
                <div className="space-y-4">
                  {(editingLead.contacts || []).map((contact, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                      <button 
                        onClick={() => {
                          const contacts = [...(editingLead.contacts || [])];
                          contacts.splice(idx, 1);
                          setEditingLead({ ...editingLead, contacts });
                        }}
                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <ICONS.X width="16" height="16" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Nome</label>
                          <input type="text" value={contact.name} onChange={(e) => {
                            const contacts = [...(editingLead.contacts || [])];
                            contacts[idx] = { ...contacts[idx], name: e.target.value };
                            setEditingLead({ ...editingLead, contacts });
                          }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">E-mail</label>
                          <input type="email" value={contact.email} onChange={(e) => {
                            const contacts = [...(editingLead.contacts || [])];
                            contacts[idx] = { ...contacts[idx], email: e.target.value };
                            setEditingLead({ ...editingLead, contacts });
                          }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Telefone</label>
                          <input type="text" value={contact.phone} onChange={(e) => {
                            const contacts = [...(editingLead.contacts || [])];
                            contacts[idx] = { ...contacts[idx], phone: formatPhoneBR(e.target.value) };
                            setEditingLead({ ...editingLead, contacts });
                          }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">WhatsApp</label>
                          <input type="text" value={contact.whatsapp || ''} onChange={(e) => {
                            const contacts = [...(editingLead.contacts || [])];
                            contacts[idx] = { ...contacts[idx], whatsapp: formatPhoneBR(e.target.value) };
                            setEditingLead({ ...editingLead, contacts });
                          }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">LinkedIn</label>
                          <input type="text" value={contact.linkedin || ''} onChange={(e) => {
                            const contacts = [...(editingLead.contacts || [])];
                            contacts[idx] = { ...contacts[idx], linkedin: e.target.value };
                            setEditingLead({ ...editingLead, contacts });
                          }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cargo</label>
                          <input type="text" value={contact.role} onChange={(e) => {
                            const contacts = [...(editingLead.contacts || [])];
                            contacts[idx] = { ...contacts[idx], role: e.target.value };
                            setEditingLead({ ...editingLead, contacts });
                          }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!editingLead.contacts || editingLead.contacts.length === 0) && (
                    <p className="text-center py-8 text-slate-400 font-bold text-sm italic bg-white rounded-2xl border border-dashed border-slate-200">Nenhum contato cadastrado.</p>
                  )}
                </div>
              </section>

              {/* Empresa */}
              <section className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <ICONS.Drive width="20" height="20" />
                  </div>
                  Empresa
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Fantasia</label>
                    <textarea 
                      rows={1}
                      value={editingLead.company || ''} 
                      onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })} 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none overflow-hidden min-h-[56px]"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Razão Social</label>
                    <textarea 
                      rows={1}
                      value={editingLead.legal_name || ''} 
                      onChange={(e) => setEditingLead({ ...editingLead, legal_name: e.target.value })} 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none overflow-hidden min-h-[56px]"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CNPJ</label>
                    <input type="text" value={editingLead.cnpj || ''} onChange={(e) => setEditingLead({ ...editingLead, cnpj: formatCNPJ(e.target.value) })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail Corporativo</label>
                    <input type="email" value={editingLead.company_email || ''} onChange={(e) => setEditingLead({ ...editingLead, company_email: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefone Corporativo</label>
                    <input type="text" value={editingLead.company_phone || ''} onChange={(e) => setEditingLead({ ...editingLead, company_phone: formatPhoneBR(e.target.value) })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp Empresa</label>
                    <input type="text" value={editingLead.company_whatsapp || ''} onChange={(e) => setEditingLead({ ...editingLead, company_whatsapp: formatPhoneBR(e.target.value) })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">LinkedIn Empresa</label>
                    <input type="text" value={editingLead.company_linkedin || ''} onChange={(e) => setEditingLead({ ...editingLead, company_linkedin: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cidade</label>
                    <input type="text" value={editingLead.city || ''} onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Instagram</label>
                    <input type="text" value={editingLead.instagram || ''} onChange={(e) => setEditingLead({ ...editingLead, instagram: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Site</label>
                    <input type="text" value={editingLead.website || ''} onChange={(e) => setEditingLead({ ...editingLead, website: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                </div>
              </section>

              {/* Responsável */}
              <section className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                    <ICONS.Sales width="20" height="20" />
                  </div>
                  Responsável
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Responsável</label>
                    <textarea 
                      rows={1}
                      value={editingLead.responsible_name || ''} 
                      onChange={(e) => setEditingLead({ ...editingLead, responsible_name: e.target.value })} 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none overflow-hidden min-h-[56px]"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Notas Adicionais */}
              <section className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <ICONS.Tasks width="20" height="20" />
                  </div>
                  Notas Adicionais
                </h4>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observações</label>
                  <textarea 
                    value={editingLead.notes || ''} 
                    onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })} 
                    className="w-full p-6 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[150px]"
                    placeholder="Adicione observações ou insights sobre este lead..."
                  />
                </div>
              </section>
            </div>

            <div className="p-12 pt-6 flex gap-4 border-t border-slate-50 shrink-0">
              <button onClick={() => setIsEditModalOpen(false)} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-sm hover:bg-slate-200 transition-all active:scale-95">
                CANCELAR
              </button>
              <button onClick={saveEditedLead} className="flex-1 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95">
                SALVAR ALTERAÇÕES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataEnrichment;
