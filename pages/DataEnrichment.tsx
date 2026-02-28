import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { Lead, Pipeline, Contact } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface DataEnrichmentProps {
  pipelines: Pipeline[];
  onImportComplete: () => void;
}

const DataEnrichment: React.FC<DataEnrichmentProps> = ({ pipelines, onImportComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: '',
    email: '',
    phone: '',
    company: '',
    segment: '',
    address: '',
    cnpj: ''
  });
  const [importedLeads, setImportedLeads] = useState<Partial<Lead>[]>([]);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState<number | null>(null);
  const [editingLead, setEditingLead] = useState<Partial<Lead> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState(pipelines[0]?.id || '');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

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
      const newMapping = { ...mapping };
      headers.forEach((h, index) => {
        const lower = h.toLowerCase();
        if (lower.includes('nome') || lower.includes('name') || lower.includes('contato')) newMapping.name = index.toString();
        else if (lower.includes('email') || lower.includes('e-mail') || lower.includes('mail')) newMapping.email = index.toString();
        else if (lower.includes('telefone') || lower.includes('phone') || lower.includes('celular') || lower.includes('whatsapp') || lower.includes('tel')) newMapping.phone = index.toString();
        else if (lower.includes('empresa') || lower.includes('company') || lower.includes('razão') || lower.includes('fantasia')) newMapping.company = index.toString();
        else if (lower.includes('segmento') || lower.includes('nicho') || lower.includes('segment') || lower.includes('setor')) newMapping.segment = index.toString();
        else if (lower.includes('endereço') || lower.includes('address') || lower.includes('rua')) newMapping.address = index.toString();
        else if (lower.includes('cidade') || lower.includes('city')) newMapping.city = index.toString();
        else if (lower.includes('estado') || lower.includes('state') || lower.includes('uf')) newMapping.state = index.toString();
        else if (lower.includes('cnpj')) newMapping.cnpj = index.toString();
        else if (lower.includes('instagram')) newMapping.instagram = index.toString();
        else if (lower.includes('site') || lower.includes('website')) newMapping.website = index.toString();
        else if (lower.includes('fonte') || lower.includes('source')) newMapping.source = index.toString();
        else if (lower.includes('campanha') || lower.includes('campaign')) newMapping.campaign = index.toString();
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
    localStorage.setItem('m4_last_mapping', JSON.stringify(mapping));
    
    const parsed: Partial<Lead>[] = csvRows.map(row => {
      const lead: Partial<Lead> = {
        name: mapping.name ? String(row[parseInt(mapping.name)] || '') : '',
        email: mapping.email ? String(row[parseInt(mapping.email)] || '') : '',
        phone: mapping.phone ? String(row[parseInt(mapping.phone)] || '') : '',
        company: mapping.company ? String(row[parseInt(mapping.company)] || '') : '',
        segment: mapping.segment ? String(row[parseInt(mapping.segment)] || '') : '',
        address: mapping.address ? String(row[parseInt(mapping.address)] || '') : '',
        city: mapping.city ? String(row[parseInt(mapping.city)] || '') : '',
        state: mapping.state ? String(row[parseInt(mapping.state)] || '') : '',
        cnpj: mapping.cnpj ? String(row[parseInt(mapping.cnpj)] || '') : '',
        instagram: mapping.instagram ? String(row[parseInt(mapping.instagram)] || '') : '',
        website: mapping.website ? String(row[parseInt(mapping.website)] || '') : '',
        source: mapping.source ? String(row[parseInt(mapping.source)] || '') : '',
        campaign: mapping.campaign ? String(row[parseInt(mapping.campaign)] || '') : '',
        value: 0,
        notes: '',
        additionalEmails: '',
        additionalPhones: '',
        contacts: []
      };

      // Collect all other emails and phones found in the row
      const otherEmails: string[] = [];
      const otherPhones: string[] = [];
      const otherData: string[] = [];

      row.forEach((cell, idx) => {
        const value = String(cell || '').trim();
        if (!value) return;

        // Skip already mapped columns
        const isMapped = Object.values(mapping).includes(idx.toString());
        if (isMapped) return;

        const header = csvHeaders[idx]?.toLowerCase() || '';
        
        if (value.includes('@') && value.includes('.')) {
          if (value !== lead.email) otherEmails.push(value);
        } else if (value.replace(/\D/g, '').length >= 8 && (header.includes('tel') || header.includes('cel') || header.includes('fone') || header.includes('phone'))) {
          if (value !== lead.phone) otherPhones.push(value);
        } else {
          otherData.push(`${csvHeaders[idx]}: ${value}`);
        }
      });

      if (otherEmails.length > 0) lead.additionalEmails = otherEmails.join(', ');
      if (otherPhones.length > 0) lead.additionalPhones = otherPhones.join(', ');
      if (otherData.length > 0) lead.notes = `Dados Adicionais: ${otherData.join(' | ')}`;

      return lead;
    });

    setImportedLeads(parsed.filter(l => l.name || l.email));
    setStep(3);
  };

  const handleEnrichLeads = async () => {
    setIsEnriching(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("API Key não configurada no ambiente. Por favor, verifique as configurações.");
        setIsEnriching(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Aqui está uma lista de leads importados (JSON): ${JSON.stringify(importedLeads)}.
Por favor, enriqueça esses dados:
1. Se a empresa estiver vazia, tente inferir pelo domínio do e-mail.
2. Sugira um 'value' (valor do negócio em reais, número inteiro) com base no porte provável da empresa (ex: B2B SaaS, e-commerce).
3. Adicione um 'notes' curto sugerindo uma estratégia de abordagem personalizada.
4. Padronize os nomes (primeira letra maiúscula).
5. Mantenha os campos 'segment' e 'address' se existirem.

Retorne APENAS um array JSON válido com os objetos contendo as chaves: name, email, phone, company, value, notes, segment, address.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text || "[]";
      const enriched = JSON.parse(text);
      setImportedLeads(enriched);
    } catch (error) {
      console.error("Erro ao enriquecer:", error);
      alert("Erro ao enriquecer leads com IA.");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleBrasilAPILookup = async () => {
    setIsEnriching(true);
    try {
      const enrichedLeads = await Promise.all(importedLeads.map(async (lead) => {
        if (!lead.cnpj) return lead;
        
        const cleanCnpj = lead.cnpj.replace(/\D/g, '');
        if (cleanCnpj.length !== 14) return lead;

        try {
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
          if (response.ok) {
            const data = await response.json();
            
            // Extract partners as contacts
            const partnersContacts: Contact[] = data.qsa?.map((p: any) => ({
              name: p.nome_socio,
              role: p.qualificacao_socio,
              email: '',
              phone: '',
              whatsappLink: ''
            })) || [];
            
            // Extract additional contacts
            const companyEmail = data.email || '';
            const companyPhone = [data.ddd_telefone_1, data.ddd_telefone_2].filter(Boolean).join(', ');

            return {
              ...lead,
              company: data.razao_social || data.nome_fantasia || lead.company,
              legalName: data.razao_social,
              segment: data.cnae_fiscal_descricao || lead.segment,
              address: `${data.logradouro}, ${data.numero} - ${data.bairro}`,
              city: data.municipio,
              state: data.uf,
              companyEmail: companyEmail,
              companyPhone: companyPhone,
              legalNature: data.natureza_juridica,
              contacts: partnersContacts,
              notes: lead.notes || `Empresa: ${data.razao_social}. Capital Social: R$ ${data.capital_social}. Natureza: ${data.natureza_juridica}.`
            };
          }
        } catch (e) {
          console.error(`Erro ao buscar CNPJ ${cleanCnpj}:`, e);
        }
        return lead;
      }));
      setImportedLeads(enrichedLeads as Partial<Lead>[]);
    } catch (error) {
      console.error("Erro no BrasilAPI:", error);
      alert("Erro ao consultar BrasilAPI.");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleGoogleSearch = (lead: Partial<Lead>) => {
    const query = `${lead.company || ''} ${lead.city || ''} CNPJ`.trim();
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  const updateLeadCnpj = (index: number, cnpj: string) => {
    const updated = [...importedLeads];
    updated[index] = { ...updated[index], cnpj };
    setImportedLeads(updated);
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
    const pipeline = pipelines.find(p => p.id === selectedPipeline) || pipelines[0];
    const stageId = pipeline?.stages[0]?.id;

    if (!stageId) {
      alert("Pipeline inválido ou sem estágios.");
      setIsSyncing(false);
      return;
    }

    const leadsToSave = selectedIndices.length > 0 
      ? importedLeads.filter((_, i) => selectedIndices.includes(i))
      : importedLeads;

    if (leadsToSave.length === 0) {
      alert("Nenhum lead selecionado para importação.");
      setIsSyncing(false);
      return;
    }

    const toInsert = leadsToSave.map(lead => ({
      ...lead,
      pipelineId: selectedPipeline,
      stageId: stageId,
      createdAt: new Date().toISOString()
    }));

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
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Importação & Enriquecimento</h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-2">Inteligência de Dados M4 Agency</p>
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
          <p className="text-slate-500 mb-10 max-w-md mx-auto font-medium leading-relaxed">Suporta arquivos <span className="text-blue-600 font-bold">.CSV</span> e <span className="text-blue-600 font-bold">.XLSX</span>. Nossa IA ajudará a mapear as colunas e enriquecer as informações.</p>
          
          <div className="flex flex-col items-center gap-4">
            <label className="inline-flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm hover:bg-blue-600 shadow-2xl transition-all cursor-pointer hover:-translate-y-1 active:scale-95">
              <ICONS.Plus /> SELECIONAR PLANILHA
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} ref={fileInputRef} />
            </label>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Dica: Use arquivos com cabeçalhos claros para melhor mapeamento</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <ICONS.Automation width="28" height="28" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Mapeamento Inteligente</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Relacione os campos da sua planilha aos campos do CRM</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {Object.keys(mapping).map((field) => (
              <div key={field} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 group hover:border-blue-200 transition-all shadow-sm">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                  Campo CRM: <span className="text-blue-600">{field.toUpperCase()}</span>
                </label>
                <select 
                  value={mapping[field]} 
                  onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 shadow-sm transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Ignorar --</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i.toString()}>{h}</option>
                  ))}
                </select>
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Revisão & Enriquecimento IA</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">{importedLeads.length} contatos identificados</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleBrasilAPILookup} 
                disabled={isEnriching || !importedLeads.some(l => l.cnpj)}
                className="px-8 py-4 bg-emerald-600 text-white rounded-[2rem] font-black text-sm uppercase hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all disabled:opacity-50 flex items-center gap-3 active:scale-95"
                title={!importedLeads.some(l => l.cnpj) ? "Mapeie uma coluna de CNPJ para usar esta opção" : ""}
              >
                {isEnriching ? <span className="animate-spin text-xl">◌</span> : <ICONS.Database />}
                {isEnriching ? "CONSULTANDO..." : "ENRIQUECER VIA BRASILAPI"}
              </button>
              <button 
                onClick={handleEnrichLeads} 
                disabled={isEnriching}
                className="px-8 py-4 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50 flex items-center gap-3 active:scale-95"
              >
                {isEnriching ? <span className="animate-spin text-xl">◌</span> : <ICONS.Automation />}
                {isEnriching ? "ENRIQUECENDO DADOS..." : "ENRIQUECER COM IA"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[2rem] border border-slate-100 mb-10 shadow-inner bg-slate-50/50">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-5 w-10">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500/20"
                      checked={selectedIndices.length === importedLeads.length && importedLeads.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIndices(importedLeads.map((_, i) => i));
                        else setSelectedIndices([]);
                      }}
                    />
                  </th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">Nome</th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">Empresa / Segmento</th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">CNPJ / Sócios</th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">Email / Tel</th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">Valor Est.</th>
                  <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-[0.2em]">Insights da IA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importedLeads.map((lead, i) => (
                  <tr 
                    key={i} 
                    onClick={() => handleEditLead(i)}
                    className={`hover:bg-blue-50/30 transition-colors cursor-pointer group/row ${selectedIndices.includes(i) ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-slate-200 text-blue-600 focus:ring-blue-500/20"
                        checked={selectedIndices.includes(i)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIndices([...selectedIndices, i]);
                          else setSelectedIndices(selectedIndices.filter(idx => idx !== i));
                        }}
                      />
                    </td>
                    <td className="px-6 py-5 min-w-[200px]">
                      <p className="font-black text-slate-900 group-hover/row:text-blue-600 transition-colors break-words">{lead.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase break-words">{lead.address || 'Sem endereço'}</p>
                    </td>
                    <td className="px-6 py-5 min-w-[250px]">
                      <div className="flex items-start gap-2">
                        <p className="font-bold text-slate-700 break-words flex-1">{lead.company || 'Pendente'}</p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGoogleSearch(lead);
                          }}
                          className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all shrink-0"
                          title="Pesquisar no Google"
                        >
                          <ICONS.Search width="14" height="14" />
                        </button>
                      </div>
                      <p className="text-[10px] text-blue-500 font-black uppercase break-words mt-1">{lead.segment || 'Sem segmento'}</p>
                    </td>
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text" 
                        placeholder="00.000.000/0000-00"
                        value={lead.cnpj || ''}
                        onChange={(e) => updateLeadCnpj(i, e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 mb-2"
                      />
                      {lead.partners && (
                        <div className="max-w-[300px]">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Sócios:</p>
                          <p className="text-[10px] text-slate-500 leading-tight" title={lead.partners}>{lead.partners}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-slate-600 font-medium">{lead.email}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{lead.phone}</p>
                      {(lead.additionalEmails || lead.additionalPhones) && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-[9px] font-black text-blue-400 uppercase">Contatos Extras:</p>
                          <p className="text-[10px] text-slate-400 max-w-[200px]">{lead.additionalEmails || lead.additionalPhones}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 font-black text-emerald-600">
                      {lead.value ? `R$ ${lead.value.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-5 text-[11px] text-slate-400 font-bold min-w-[250px]" title={lead.notes}>{lead.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-end justify-between p-10 bg-slate-900 rounded-[2.5rem] shadow-2xl">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">Pipeline de Destino</label>
              <select 
                value={selectedPipeline} 
                onChange={(e) => setSelectedPipeline(e.target.value)}
                className="w-full max-w-md p-5 bg-slate-800 border border-slate-700 rounded-2xl font-black text-white outline-none focus:ring-4 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-4 w-full lg:w-auto">
              <button onClick={() => setStep(2)} className="px-10 py-5 bg-slate-800 text-slate-400 rounded-[2rem] font-black text-sm hover:bg-slate-700 transition-all active:scale-95">
                VOLTAR
              </button>
              <button onClick={handleSaveImported} disabled={isSyncing} className="flex-1 lg:flex-none px-12 py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-sm hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50 active:scale-95">
                {isSyncing ? "SALVANDO..." : "FINALIZAR IMPORTAÇÃO"}
              </button>
            </div>
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
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Total</label>
                    <input type="number" value={editingLead.value || 0} onChange={(e) => setEditingLead({ ...editingLead, value: Number(e.target.value) })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Previsão de Fechamento</label>
                    <input type="date" value={editingLead.closingForecast || ''} onChange={(e) => setEditingLead({ ...editingLead, closingForecast: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
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
                      setEditingLead({ ...editingLead, contacts: [...contacts, { name: '', email: '', phone: '', role: '' }] });
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
                            contacts[idx].name = e.target.value;
                            setEditingLead({ ...editingLead, contacts });
                          }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">E-mail</label>
                          <input type="email" value={contact.email} onChange={(e) => {
                            const contacts = [...(editingLead.contacts || [])];
                            contacts[idx].email = e.target.value;
                            setEditingLead({ ...editingLead, contacts });
                          }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Telefone</label>
                          <input type="text" value={contact.phone} onChange={(e) => {
                            const contacts = [...(editingLead.contacts || [])];
                            contacts[idx].phone = e.target.value;
                            setEditingLead({ ...editingLead, contacts });
                          }} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cargo</label>
                          <input type="text" value={contact.role} onChange={(e) => {
                            const contacts = [...(editingLead.contacts || [])];
                            contacts[idx].role = e.target.value;
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
                      value={editingLead.legalName || ''} 
                      onChange={(e) => setEditingLead({ ...editingLead, legalName: e.target.value })} 
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
                    <input type="text" value={editingLead.cnpj || ''} onChange={(e) => setEditingLead({ ...editingLead, cnpj: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail Corporativo</label>
                    <input type="email" value={editingLead.companyEmail || ''} onChange={(e) => setEditingLead({ ...editingLead, companyEmail: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefone Corporativo</label>
                    <input type="text" value={editingLead.companyPhone || ''} onChange={(e) => setEditingLead({ ...editingLead, companyPhone: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-[56px]" />
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
                      value={editingLead.responsibleName || ''} 
                      onChange={(e) => setEditingLead({ ...editingLead, responsibleName: e.target.value })} 
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
