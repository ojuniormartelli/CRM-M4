
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Lead, Pipeline, User, FunnelStatus } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { mappers } from '../lib/mappers';
import { Check, AlertTriangle, X, Upload, Download, ChevronRight, ChevronLeft, Search, Filter, Database, Users, Building, Mail, Phone, MessageSquare } from 'lucide-react';

interface LeadImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  pipelines: Pipeline[];
  currentUser: User | null;
  onImportComplete: (importedLeads: Lead[]) => void;
}

interface ImportRow {
  id: string;
  raw: any;
  mapped: Partial<Lead>;
  status: 'valid' | 'duplicate' | 'error';
  errors: string[];
  isDuplicate?: boolean;
  existingLeadId?: string;
}

const CRM_FIELDS = [
  // SEÇÃO 1 - DADOS DA EMPRESA PROSPECTADA
  { id: 'company_name', label: 'Nome da Empresa', aliases: ['empresa', 'company', 'company_name', 'razao social', 'nome fantasia', 'organization', 'nome_empresa', 'cliente'] },
  { id: 'company_cnpj', label: 'CNPJ da Empresa', aliases: ['cnpj', 'company_cnpj', 'documento', 'tax id', 'cnpj/cpf'] },
  { id: 'company_city', label: 'Cidade da Empresa', aliases: ['municipio', 'city', 'company_city', 'localidade', 'cidade'] },
  { id: 'company_state', label: 'Estado da Empresa', aliases: ['uf', 'state', 'company_state', 'provincia', 'regiao', 'estado'] },
  { id: 'company_niche', label: 'Segmento / Nicho', aliases: ['niche', 'setor', 'industria', 'industry', 'segmento', 'segment', 'company_segment', 'company_niche'] },
  { id: 'company_website', label: 'Website da Empresa', aliases: ['site', 'url', 'web', 'company_website', 'website'] },
  { id: 'company_email', label: 'E-mail da Empresa', aliases: ['email empresa', 'email corporativo', 'company_email'] },
  { id: 'company_instagram', label: 'Instagram da Empresa', aliases: ['instagram empresa', 'insta empresa', 'company_instagram'] },
  { id: 'company_linkedin', label: 'LinkedIn da Empresa', aliases: ['linkedin empresa', 'company_linkedin'] },
  { id: 'company_whatsapp', label: 'Telefone / WhatsApp da Empresa', aliases: ['telefone empresa', 'fone empresa', 'company_phone', 'company_whatsapp', 'whatsapp_empresa'] },

  // SEÇÃO 2 - CONTATO / DECISOR
  { id: 'contact_name', label: 'Nome do Contato', aliases: ['contato', 'responsavel', 'nome', 'person', 'contact', 'decisor', 'nome_contato', 'contact_name', 'name'] },
  { id: 'contact_role', label: 'Cargo do Contato', aliases: ['cargo', 'funcao', 'role', 'position', 'departamento', 'contact_role'] },
  { id: 'contact_email', label: 'E-mail do Contato', aliases: ['email contato', 'email pessoal', 'email_contato', 'e-mail', 'email', 'contact_email'] },
  { id: 'contact_instagram', label: 'Instagram do Contato', aliases: ['instagram contato', 'insta contato', 'contact_instagram'] },
  { id: 'contact_linkedin', label: 'LinkedIn do Contato', aliases: ['linkedin contato', 'contact_linkedin', 'linkedin'] },
  { id: 'contact_whatsapp', label: 'Telefone / WhatsApp do Contato', aliases: ['telefone contato', 'fone contato', 'celular', 'telefone_contato', 'telefone', 'contact_phone', 'contact_whatsapp', 'whatsapp_contato', 'phone'] },
  { id: 'contact_notes', label: 'Notas do Contato', aliases: ['notas contato', 'obs contato', 'contact_notes'] },

  // SEÇÃO 3 - DADOS DO NEGÓCIO
  { id: 'value', label: 'Valor Estimado', aliases: ['valor', 'ticket', 'preco', 'price', 'value', 'investimento', 'valor_estimado', 'estimated_value'] },
  { id: 'business_notes', label: 'Notas do Negócio', aliases: ['notas', 'obs', 'comentarios', 'description', 'detalhes', 'observacao', 'business_notes', 'notes'] },
  { id: 'service_type', label: 'Tipo de Serviço', aliases: ['servico', 'produto', 'service', 'oferta', 'tipo_servico'] },
  { id: 'source', label: 'Origem', aliases: ['source', 'origem', 'canal', 'meio'] },
  { id: 'campaign', label: 'Campanha', aliases: ['campaign', 'campanha', 'ads', 'marketing'] },
  { id: 'responsible_name', label: 'Responsável', aliases: ['vendedor', 'consultor', 'responsavel', 'responsible_id', 'id_responsavel', 'vendedor_id'], isInternal: true },
  { id: 'pipeline_name', label: 'Pipeline / Funil', aliases: ['funil', 'pipeline', 'pipeline_id', 'id_pipeline', 'funil_id'], isInternal: true },
  { id: 'stage_name', label: 'Etapa', aliases: ['etapa', 'fase', 'status_etapa', 'stage_id', 'id_etapa', 'etapa_id', 'stage'], isInternal: true },
];

export const LeadImportWizard: React.FC<LeadImportWizardProps> = ({ isOpen, onClose, pipelines, currentUser, onImportComplete }) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedResponsibleId, setSelectedResponsibleId] = useState('');
  const [deduplicationStrategy, setDeduplicationStrategy] = useState<'ignore' | 'update' | 'create'>('ignore');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState({ success: 0, updated: 0, ignored: 0, errors: 0 });
  const [dbUsers, setDbUsers] = useState<User[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFile(null);
      setHeaders([]);
      setRawData([]);
      setMapping({});
      setImportRows([]);
      setImportSummary({ success: 0, updated: 0, ignored: 0, errors: 0 });
      setIsProcessing(false);
      setIsImporting(false);
    } else {
      // Also reset when opening just in case
      setStep(1);
    }
  }, [isOpen]);

  // Fetch users for reference
  useEffect(() => {
    if (isOpen) {
      supabase.from('m4_users')
        .select('*')
        .eq('workspace_id', currentUser?.workspace_id)
        .then(({ data }) => {
          if (data) setDbUsers(data);
        });
    }
  }, [isOpen, currentUser]);

  // Initialize pipeline and responsible
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
      setSelectedStageId(pipelines[0].stages[0]?.id || '');
    }
    if (currentUser && !selectedResponsibleId) {
      setSelectedResponsibleId(currentUser.id);
    }
  }, [pipelines, currentUser]);

  useEffect(() => {
    const pipeline = pipelines.find(p => p.id === selectedPipelineId);
    if (pipeline && pipeline.stages.length > 0) {
      setSelectedStageId(pipeline.stages[0].id);
    }
  }, [selectedPipelineId]);

  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      if (jsonData.length < 1) return;

      const rawHeaders = jsonData[0].map(h => String(h).trim());
      const dataRows = jsonData.slice(1).map(row => {
        const obj: any = {};
        rawHeaders.forEach((h, i) => {
          obj[h] = row[i];
        });
        return obj;
      }).filter(row => Object.values(row).some(v => v !== ''));

      setHeaders(rawHeaders);
      setRawData(dataRows);

      // Intelligent Mapping
      const autoMapping: Record<string, string> = {};
      rawHeaders.forEach(header => {
        const normalized = normalize(header);
        const field = CRM_FIELDS.find(f => 
          normalize(f.label) === normalized || 
          f.aliases.some(a => normalize(a) === normalized)
        );
        if (field) autoMapping[header] = field.id;
      });
      setMapping(autoMapping);
      setStep(2);
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Load saved mapping
  useEffect(() => {
    const saved = localStorage.getItem('crm_import_mapping');
    if (saved && headers.length > 0) {
      try {
        const parsed = JSON.parse(saved);
        const newMapping = { ...mapping };
        headers.forEach(h => {
          if (parsed[h]) newMapping[h] = parsed[h];
        });
        setMapping(newMapping);
      } catch (e) {
        console.error('Error loading mapping', e);
      }
    }
  }, [headers]);

  // Save mapping when it changes
  useEffect(() => {
    if (Object.keys(mapping).length > 0) {
      localStorage.setItem('crm_import_mapping', JSON.stringify(mapping));
    }
  }, [mapping]);

  const processData = async () => {
    setIsProcessing(true);
    const rows: ImportRow[] = [];
    
    // Fetch existing leads for deduplication check
    const { data: existingLeads } = await supabase
      .from('m4_leads')
      .select('id, company_name, contact_email, contact_whatsapp, contact_name')
      .eq('workspace_id', currentUser?.workspace_id);

    rawData.forEach((rawRow, index) => {
      const mapped: any = {
        workspace_id: currentUser?.workspace_id,
        pipeline_id: selectedPipelineId,
        stage: selectedStageId,
        status: pipelines.find(p => p.id === selectedPipelineId)?.stages.find(s => s.id === selectedStageId)?.status || 'active',
        source: 'Importação',
        created_at: new Date().toISOString(),
        responsible_id: currentUser?.id,
        responsible_name: currentUser?.name
      };

      Object.entries(mapping).forEach(([header, fieldId]) => {
        if (fieldId) {
          let val = rawRow[header];
          
          // Basic normalization
          if (typeof val === 'string') {
            val = val.trim();
            if (val === '') val = null;
          }

          if (fieldId === 'value' || fieldId === 'proposed_ticket') {
            // Remove currency symbols and thousands separators, convert comma to dot
            const cleaned = String(val).replace(/[^\d,.-]/g, '');
            if (cleaned.includes(',') && cleaned.includes('.')) {
              // Format like 1.234,56
              val = parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
            } else if (cleaned.includes(',')) {
              // Format like 1234,56
              val = parseFloat(cleaned.replace(',', '.')) || 0;
            } else {
              val = parseFloat(cleaned) || 0;
            }
          }
          
          if (fieldId === 'company_cnpj' || fieldId === 'company_whatsapp' || fieldId === 'contact_whatsapp') {
            if (val) val = String(val).replace(/\D/g, '');
          }

          if (val !== null) {
            mapped[fieldId] = val;
          }
        }
      });

      // Resolve Names to IDs
      if (mapped.responsible_name) {
        const user = dbUsers.find(u => 
          normalize(u.name) === normalize(mapped.responsible_name) || 
          normalize(u.email) === normalize(mapped.responsible_name)
        );
        if (user) {
          mapped.responsible_id = user.id;
          mapped.responsible_name = user.name;
        }
      }
      
      if (mapped.pipeline_name) {
        const pipeline = pipelines.find(p => normalize(p.name) === normalize(mapped.pipeline_name));
        if (pipeline) {
          mapped.pipeline_id = pipeline.id;
        }
      }

      if (mapped.stage_name) {
        const pipeline = pipelines.find(p => p.id === mapped.pipeline_id);
        if (pipeline) {
          const stage = pipeline.stages.find(s => normalize(s.name) === normalize(mapped.stage_name));
          if (stage) {
            mapped.stage = stage.id;
            mapped.status = stage.status || 'active';
          }
        }
      }

      // Validation
      const errors: string[] = [];
      if (!mapped.company_name && !mapped.contact_name) {
        const errorMsg = `Linha ${index + 2}: Lead precisa de pelo menos company_name ou contact_name`;
        errors.push(errorMsg);
        console.warn(`[Import Error] ${errorMsg}`, rawRow);
      }

      // Deduplication Check
      const duplicate = existingLeads?.find(l => {
        const emailMatch = mapped.contact_email && l.contact_email && normalize(mapped.contact_email) === normalize(l.contact_email);
        const phoneMatch = mapped.contact_whatsapp && l.contact_whatsapp && mapped.contact_whatsapp === l.contact_whatsapp;
        const companyContactMatch = mapped.company_name && mapped.contact_name && l.company_name && l.contact_name && 
                                   normalize(mapped.company_name) === normalize(l.company_name) && 
                                   normalize(mapped.contact_name) === normalize(l.contact_name);
        
        return emailMatch || phoneMatch || companyContactMatch;
      });

      rows.push({
        id: `row-${index}`,
        raw: rawRow,
        mapped,
        status: errors.length > 0 ? 'error' : (duplicate ? 'duplicate' : 'valid'),
        errors,
        isDuplicate: !!duplicate,
        existingLeadId: duplicate?.id
      });
    });

    setImportRows(rows);
    setIsProcessing(false);
    setStep(3);
  };

  const executeImport = async () => {
    setIsImporting(true);
    const toInsert: any[] = [];
    const toUpdate: { id: string, data: any, rowIndex: number }[] = [];
    let ignored = 0;
    const rowErrors: { rowIndex: number, error: string }[] = [];

    console.log('🚀 INICIANDO IMPORTAÇÃO DE LEADS');
    console.log('Configurações:', {
      pipeline: selectedPipelineId,
      stage: selectedStageId,
      responsible: selectedResponsibleId,
      strategy: deduplicationStrategy
    });

    importRows.forEach((row, index) => {
      if (row.status === 'error') {
        rowErrors.push({ rowIndex: index, error: `Erro de validação: ${row.errors.join(', ')}` });
        return;
      }

      // Apply global settings from Step 4
      const finalData = {
        ...row.mapped,
        pipeline_id: selectedPipelineId || null,
        stage: selectedStageId || null,
        responsible_id: selectedResponsibleId || null,
        responsible_name: dbUsers.find(u => u.id === selectedResponsibleId)?.name || currentUser?.name || 'Sistema'
      };

      // 🛡️ CENTRALIZED PERSISTENCE: buildLeadInsertPayload
      const mappedPayload = mappers.lead(finalData, currentUser?.workspace_id);

      if (row.isDuplicate) {
        if (deduplicationStrategy === 'ignore') {
          ignored++;
          return;
        }
        if (deduplicationStrategy === 'update' && row.existingLeadId) {
          // 🛡️ Use isUpdate: true for deduplication updates to avoid overwriting with defaults
          const updatePayload = mappers.lead(finalData, currentUser?.workspace_id);
          const { created_at, workspace_id, ...updateData } = updatePayload;
          toUpdate.push({ id: row.existingLeadId, data: updateData, rowIndex: index });
          return;
        }
      }
      
      toInsert.push(mappedPayload);
    });

    let successCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    // Batch Insert
    if (toInsert.length > 0) {
      console.log('Payload de Inserção (primeiros 2):', toInsert.slice(0, 2));
      const { data, error } = await supabase.from('m4_leads').insert(toInsert).select();
      
      if (error) {
        console.error('❌ ERRO NO BATCH INSERT:', error);
        console.error('Detalhes do Erro:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        errorCount += toInsert.length;
        toInsert.forEach((_, i) => rowErrors.push({ rowIndex: i, error: `Falha na inserção: ${error.message}` }));
      } else {
        console.log('✅ BATCH INSERT SUCESSO:', data.length, 'leads');
        successCount = data.length;
      }
    }

    // Individual Updates
    for (const item of toUpdate) {
      const { error } = await supabase.from('m4_leads').update(item.data).eq('id', item.id);
      if (!error) {
        updateCount++;
      } else {
        console.error(`❌ ERRO NO UPDATE (ID: ${item.id}):`, error);
        errorCount++;
        rowErrors.push({ rowIndex: item.rowIndex, error: `Falha na atualização: ${error.message}` });
      }
    }

    setImportSummary({
      success: successCount,
      updated: updateCount,
      ignored: ignored,
      errors: errorCount
    });
    
    // Store row errors in a ref or state if needed, but for now we'll just show the summary
    // and maybe log them to console for the user to see in debug.
    (window as any).lastImportErrors = rowErrors;
    
    setStep(5);
    setIsImporting(false);
    
    // Refresh leads in parent
    const { data: refreshedLeads } = await supabase
      .from('m4_leads')
      .select('*')
      .eq('workspace_id', currentUser?.workspace_id);
    if (refreshedLeads) onImportComplete(refreshedLeads.map(mappers.leadFromDb));
  };

  const downloadTemplate = () => {
    const templateFields = CRM_FIELDS.filter(f => !(f as any).isInternal);
    const headersTemplate = templateFields.map(f => f.label);
    const exampleRow = templateFields.reduce((acc, f) => {
      if (f.id === 'value') acc[f.label] = 5000;
      else if (f.id === 'contact_email' || f.id === 'company_email') acc[f.label] = 'exemplo@empresa.com';
      else if (f.id === 'company_whatsapp' || f.id === 'contact_whatsapp') acc[f.label] = '(11) 99999-8888';
      else if (f.id === 'company_cnpj') acc[f.label] = '00.000.000/0001-00';
      else if (f.id === 'company_state') acc[f.label] = 'SP';
      else acc[f.label] = `Exemplo ${f.label.replace(' (*)', '')}`;
      return acc;
    }, {} as any);

    const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headersTemplate });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo de Importação");
    
    // Add instructions sheet
    const instructions = [
      ["INSTRUÇÕES DE IMPORTAÇÃO - CRM M4"],
      [""],
      ["REGRAS GERAIS:"],
      ["1. Preencha os dados seguindo as colunas deste modelo oficial."],
      ["2. Pelo menos um dos campos (Nome da Empresa ou Nome do Contato) deve estar preenchido."],
      ["3. O sistema normaliza automaticamente telefones e CNPJ (salva apenas números)."],
      ["4. Unificação: Use 'Telefone da Empresa' ou 'Telefone do Contato' para ligações e WhatsApp."],
      ["5. Valores financeiros devem usar ponto ou vírgula como separador decimal."],
      ["6. O destino da importação (Funil, Etapa e Responsável) será definido no aplicativo após o envio do arquivo."],
      [""],
      ["DETALHAMENTO DAS COLUNAS:"],
      ["Coluna", "Campo Interno", "Obrigatoriedade", "Descrição", "Exemplo"],
      ...templateFields.map(f => [
        f.label, 
        f.id, 
        "Opcional", 
        f.id === 'company_name' ? "Nome da empresa ou organização" :
        f.id === 'contact_name' ? "Nome da pessoa de contato principal" :
        f.id === 'value' ? "Valor monetário estimado do negócio" :
        f.id === 'company_whatsapp' ? "Telefone/WhatsApp da empresa (apenas números)" :
        f.id === 'contact_whatsapp' ? "Telefone/WhatsApp do contato (apenas números)" :
        `Dados de ${f.label.toLowerCase().replace(' (*)', '')}`,
        exampleRow[f.label]
      ])
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instruções");

    // Add Reference sheet
    const referenceData = [
      ["DADOS DE REFERÊNCIA"],
      [""],
      ["EXEMPLOS DE ORIGEM (Source):"],
      ["Indicação", "Google Ads", "Instagram", "LinkedIn", "Site", "Evento", "Outros"]
    ];
    const wsRef = XLSX.utils.aoa_to_sheet(referenceData);
    XLSX.utils.book_append_sheet(wb, wsRef, "Referências");

    XLSX.writeFile(wb, "modelo_oficial_importacao_leads.xlsx");
  };

  const downloadErrors = () => {
    const errorRows = importRows.filter(r => r.status === 'error');
    if (errorRows.length === 0) return;

    const data = errorRows.map(r => ({
      ...r.raw,
      ERROS_IMPORTACAO: r.errors.join('; ')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Erros de Importação");
    XLSX.writeFile(wb, "erros_importacao_leads.xlsx");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Importador Inteligente</h3>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${step >= s ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200 dark:bg-slate-800'}`} />
                ))}
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Passo {step} de 5</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              setStep(1);
              onClose();
            }} 
            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-none">
          
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-10 py-10">
              <div className="text-center space-y-4">
                <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Como você quer começar?</h4>
                <p className="text-slate-500 font-bold">Suba sua planilha atual ou use nosso modelo otimizado.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={downloadTemplate}
                  className="p-8 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] hover:border-blue-500 transition-all group text-left space-y-4"
                >
                  <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 shadow-sm transition-colors">
                    <Download size={28} />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Baixar Modelo</h5>
                    <p className="text-xs text-slate-500 font-bold mt-1">Planilha com colunas ideais e instruções de preenchimento.</p>
                  </div>
                </button>

                <label className="p-8 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-900/30 rounded-[2rem] hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all group text-left space-y-4 cursor-pointer">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
                    <Upload size={28} />
                  </div>
                  <div>
                    <h5 className="font-black text-blue-900 dark:text-blue-100 uppercase tracking-tight">Subir Planilha</h5>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">Arraste seu arquivo .xlsx ou .csv aqui para começar.</p>
                  </div>
                  <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Database size={14} /> Mapeamento de Colunas
              </h4>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800">
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Coluna na Planilha</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-10"><ChevronRight size={14} /></th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campo no CRM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {headers.map(header => (
                      <tr key={header} className="group hover:bg-white dark:hover:bg-slate-800 transition-colors">
                        <td className="p-5">
                          <p className="text-sm font-black text-slate-900 dark:text-white">{header}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[200px]">Ex: {rawData[0]?.[header] || '-'}</p>
                        </td>
                        <td className="p-5 text-center text-slate-300"><ChevronRight size={16} /></td>
                        <td className="p-5">
                          <select 
                            value={mapping[header] || ''}
                            onChange={(e) => setMapping({...mapping, [header]: e.target.value})}
                            className={`w-full p-3 rounded-xl border-2 font-bold text-xs transition-all outline-none ${mapping[header] ? 'border-blue-100 bg-blue-50/30 text-blue-600' : 'border-slate-100 bg-white dark:bg-slate-900 text-slate-400'}`}
                          >
                            <option value="">Ignorar esta coluna</option>
                            {CRM_FIELDS.map(f => (
                              <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Review de Importação</h4>
                  <p className="text-slate-500 font-bold mt-1">Analisamos {importRows.length} linhas da sua planilha.</p>
                </div>
                <div className="flex gap-4">
                  {importRows.some(r => r.status === 'error') && (
                    <button 
                      onClick={downloadErrors}
                      className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-2 hover:bg-rose-100 transition-all"
                    >
                      <Download size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Baixar Erros</span>
                    </button>
                  )}
                  <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[10px] font-black uppercase tracking-widest">Válidos</p>
                    <p className="text-xl font-black">{importRows.filter(r => r.status === 'valid').length}</p>
                  </div>
                  <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <p className="text-[10px] font-black uppercase tracking-widest">Duplicados</p>
                    <p className="text-xl font-black">{importRows.filter(r => r.status === 'duplicate').length}</p>
                  </div>
                  <div className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl border border-rose-100 dark:border-rose-900/30">
                    <p className="text-[10px] font-black uppercase tracking-widest">Erros</p>
                    <p className="text-xl font-black">{importRows.filter(r => r.status === 'error').length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto scrollbar-none">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Status</th>
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa / Contato</th>
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato Principal</th>
                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes / Erros</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {importRows.map((row) => (
                        <tr key={row.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-5">
                            {row.status === 'valid' && <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><Check size={16} /></div>}
                            {row.status === 'duplicate' && <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center"><AlertTriangle size={16} /></div>}
                            {row.status === 'error' && <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center"><X size={16} /></div>}
                          </td>
                          <td className="p-5">
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{row.mapped.company_name || 'Sem Empresa'}</p>
                            <p className="text-xs text-slate-500 font-bold">{row.mapped.contact_name || 'Sem Contato'}</p>
                          </td>
                          <td className="p-5">
                            <div className="flex flex-col gap-1">
                              {row.mapped.contact_email && <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><Mail size={10} /> {row.mapped.contact_email}</div>}
                              {row.mapped.contact_whatsapp && <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><Phone size={10} /> {row.mapped.contact_whatsapp}</div>}
                            </div>
                          </td>
                          <td className="p-5">
                            {row.status === 'error' ? (
                              <div className="flex flex-col gap-1">
                                {row.errors.map((err, i) => <span key={i} className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{err}</span>)}
                              </div>
                            ) : row.status === 'duplicate' ? (
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                                {deduplicationStrategy === 'ignore' ? 'Será ignorado' : deduplicationStrategy === 'update' ? 'Será atualizado' : 'Será duplicado'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Pronto para importar</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="max-w-2xl mx-auto space-y-10 py-6">
              <div className="text-center space-y-4">
                <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Configuração Final</h4>
                <p className="text-slate-500 font-bold">Defina o destino e o responsável para os leads importados.</p>
              </div>

              <div className="grid grid-cols-1 gap-8 bg-slate-50 dark:bg-slate-800/50 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pipeline de Destino</label>
                    <select 
                      value={selectedPipelineId}
                      onChange={(e) => setSelectedPipelineId(e.target.value)}
                      className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Etapa Inicial</label>
                    <select 
                      value={selectedStageId}
                      onChange={(e) => setSelectedStageId(e.target.value)}
                      className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      {pipelines.find(p => p.id === selectedPipelineId)?.stages.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável Padrão</label>
                  <select 
                    value={selectedResponsibleId}
                    onChange={(e) => setSelectedResponsibleId(e.target.value)}
                    className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {dbUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regra de Duplicidade</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'ignore', label: 'Ignorar', desc: 'Não importar' },
                      { id: 'update', label: 'Atualizar', desc: 'Sobrescrever' },
                      { id: 'create', label: 'Duplicar', desc: 'Criar novo' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setDeduplicationStrategy(opt.id as any)}
                        className={`p-5 rounded-2xl border-2 text-left transition-all ${deduplicationStrategy === opt.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-white dark:border-slate-900 bg-white dark:bg-slate-900 hover:border-slate-200'}`}
                      >
                        <p className={`text-xs font-black uppercase tracking-tight ${deduplicationStrategy === opt.id ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>{opt.label}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="max-w-2xl mx-auto py-10 text-center space-y-8">
              <div className="space-y-4">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <Check size={40} />
                </div>
                <h4 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Importação Finalizada</h4>
                <p className="text-slate-500 font-bold">Confira o resumo da operação abaixo.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Novos</p>
                  <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{importSummary.success}</p>
                </div>
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Atualizados</p>
                  <p className="text-3xl font-black text-blue-700 dark:text-blue-400">{importSummary.updated}</p>
                </div>
                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Ignorados</p>
                  <p className="text-3xl font-black text-amber-700 dark:text-amber-400">{importSummary.ignored}</p>
                </div>
                <div className="p-6 bg-rose-50 dark:bg-rose-900/20 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Erros</p>
                  <p className="text-3xl font-black text-rose-700 dark:text-rose-400">{importSummary.errors}</p>
                </div>
              </div>

              {importSummary.errors > 0 && (window as any).lastImportErrors && (
                <div className="bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/20 p-6 text-left">
                  <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertTriangle size={14} /> Detalhes dos Erros
                  </h5>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2 scrollbar-none">
                    {(window as any).lastImportErrors.map((err: any, i: number) => (
                      <div key={i} className="text-[10px] font-bold text-rose-500 bg-white dark:bg-slate-900 p-2 rounded-lg border border-rose-100 dark:border-rose-900/20">
                        Linha {err.rowIndex + 1}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6">
                <button 
                  onClick={() => {
                    setStep(1);
                    onClose();
                  }}
                  className="px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-slate-200 dark:shadow-none"
                >
                  Concluir e Ver Leads
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        {step > 1 && step < 5 && (
          <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
            <button 
              onClick={() => setStep(step - 1)}
              disabled={isProcessing || isImporting}
              className="flex items-center gap-2 px-8 py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-900 transition-all disabled:opacity-50"
            >
              <ChevronLeft size={18} /> Voltar
            </button>
            
            {step === 2 && (
              <button 
                onClick={processData}
                disabled={isProcessing || Object.values(mapping).length === 0}
                className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 dark:shadow-none disabled:opacity-50"
              >
                {isProcessing ? 'PROCESSANDO...' : 'REVISAR DADOS'} <ChevronRight size={18} />
              </button>
            )}

            {step === 3 && (
              <button 
                onClick={() => setStep(4)}
                disabled={importRows.filter(r => r.status !== 'error').length === 0}
                className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 dark:shadow-none disabled:opacity-50"
              >
                CONFIGURAR DESTINO <ChevronRight size={18} />
              </button>
            )}

            {step === 4 && (
              <button 
                onClick={executeImport}
                disabled={isImporting || !selectedPipelineId || !selectedStageId || !selectedResponsibleId}
                className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 dark:shadow-none disabled:opacity-50"
              >
                {isImporting ? 'IMPORTANDO...' : `IMPORTAR ${importRows.filter(r => r.status !== 'error').length} LEADS`} <Check size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
