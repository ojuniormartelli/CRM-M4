
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead, Pipeline, User, PipelineStage, FunnelStatus } from '../types';
import { ICONS } from '../constants';
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
  const [importStep, setImportStep] = useState(1);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedPipelineId, setSelectedPipelineId] = useState(() => {
    return pipelines[0]?.id || '';
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; total: number } | null>(null);
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

  const activeLeads = leads.filter(l => !l.status || (l.status !== 'won' && l.status !== 'lost' && l.status !== 'ganho' && l.status !== 'perdido'));
  
  const totalValue = activeLeads.reduce((acc, lead) => acc + (lead.value || 0), 0);
  
  const filteredRecentLeads = [...leads]
    .filter(l => {
      if (recentLeadsFilter === 'with_pipeline') return !!(l as any).pipeline_id;
      if (recentLeadsFilter === 'without_pipeline') return !(l as any).pipeline_id;
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const recentLeads = showAllRecentLeads ? filteredRecentLeads : filteredRecentLeads.slice(0, 10);

  const crmFields = [
    { id: 'company', label: 'Nome da Empresa', synonyms: ['empresa', 'company', 'razao social', 'nome fantasia', 'organization', 'nome_empresa'] },
    { id: 'cnpj', label: 'CNPJ', synonyms: ['documento', 'tax id', 'cnpj/cpf', 'company_cnpj'] },
    { id: 'city', label: 'Cidade', synonyms: ['municipio', 'city', 'localidade'] },
    { id: 'state', label: 'Estado', synonyms: ['uf', 'state', 'provincia', 'regiao'] },
    { id: 'niche', label: 'Segmento/Nicho', synonyms: ['nicho', 'setor', 'industria', 'industry', 'segmento', 'segment'] },
    { id: 'website', label: 'Website', synonyms: ['site', 'url', 'web'] },
    { id: 'company_email', label: 'E-mail da Empresa', synonyms: ['email empresa', 'email corporativo', 'e-mail', 'email'] },
    { id: 'company_phone', label: 'Telefone da Empresa', synonyms: ['telefone empresa', 'fone empresa', 'telefone'] },
    { id: 'company_whatsapp', label: 'WhatsApp da Empresa', synonyms: ['whats empresa', 'zap empresa', 'whatsapp', 'company_whatsapp'] },
    { id: 'company_linkedin', label: 'LinkedIn da Empresa', synonyms: ['linkedin empresa', 'linkedin', 'company_linkedin'] },
    { id: 'instagram', label: 'Instagram da Empresa', synonyms: ['insta empresa', 'ig empresa', 'instagram'] },
    { id: 'responsible_name', label: 'Nome do Contato', synonyms: ['contato', 'responsavel', 'nome', 'person', 'contact', 'decisor', 'nome_contato'] },
    { id: 'contact_role', label: 'Cargo do Contato', synonyms: ['cargo', 'funcao', 'role', 'position', 'departamento', 'contact_role'] },
    { id: 'email', label: 'E-mail do Contato', synonyms: ['email contato', 'email pessoal', 'email_contato'] },
    { id: 'phone', label: 'Telefone do Contato', synonyms: ['telefone contato', 'fone contato', 'celular', 'telefone_contato'] },
    { id: 'contact_whatsapp', label: 'WhatsApp do Contato', synonyms: ['whats contato', 'zap contato', 'whatsapp_contato', 'contact_whatsapp'] },
    { id: 'contact_instagram', label: 'Instagram do Contato', synonyms: ['insta contato', 'ig contato', 'instagram_contato', 'contact_instagram'] },
    { id: 'contact_linkedin', label: 'LinkedIn do Contato', synonyms: ['linkedin contato', 'linkedin_contato', 'contact_linkedin'] },
    { id: 'value', label: 'Valor Estimado', synonyms: ['valor', 'ticket', 'preco', 'price', 'value', 'investimento', 'valor_estimado'] },
    { id: 'service_type', label: 'Tipo de Serviço', synonyms: ['servico', 'produto', 'service', 'oferta', 'tipo_servico'] },
    { id: 'notes', label: 'Observações', synonyms: ['notas', 'obs', 'comentarios', 'description', 'detalhes'] },
  ];

  const downloadTemplate = () => {
    const headersTemplate = ["nome_empresa", "cnpj", "cidade", "estado", "segmento", "website", "email", "instagram", "linkedin", "telefone", "whatsapp", "nome_contato", "cargo_contato", "email_contato", "telefone_contato", "whatsapp_contato", "instagram_contato", "linkedin_contato", "valor_estimado", "tipo_servico", "observacoes"];
    
    const exampleData = [
      {
        nome_empresa: "Exemplo Empresa A",
        cnpj: "00.000.000/0001-00",
        cidade: "São Paulo",
        estado: "SP",
        segmento: "Tecnologia",
        website: "https://exemplo.com",
        email: "contato@exemplo.com",
        instagram: "@exemplo",
        linkedin: "linkedin.com/company/exemplo",
        telefone: "(11) 99999-9999",
        whatsapp: "(11) 99999-9999",
        nome_contato: "João Silva",
        cargo_contato: "Diretor",
        email_contato: "joao@exemplo.com",
        telefone_contato: "(11) 99999-9999",
        whatsapp_contato: "(11) 99999-9999",
        instagram_contato: "@joao_silva",
        linkedin_contato: "linkedin.com/in/joaosilva",
        valor_estimado: 5000,
        tipo_servico: "Consultoria",
        observacoes: "Lead quente vindo de indicação"
      },
      {
        nome_empresa: "Exemplo Empresa B",
        cnpj: "11.111.111/0001-11",
        cidade: "Rio de Janeiro",
        estado: "RJ",
        segmento: "Varejo",
        website: "https://lojaexemplo.com",
        email: "vendas@lojaexemplo.com",
        instagram: "@lojaexemplo",
        linkedin: "linkedin.com/company/lojaexemplo",
        telefone: "(21) 88888-8888",
        whatsapp: "(21) 88888-8888",
        nome_contato: "Maria Souza",
        cargo_contato: "Gerente",
        email_contato: "maria@lojaexemplo.com",
        telefone_contato: "(21) 88888-8888",
        whatsapp_contato: "(21) 88888-8888",
        instagram_contato: "@maria_souza",
        linkedin_contato: "linkedin.com/in/mariasouza",
        valor_estimado: 2500,
        tipo_servico: "Implementação",
        observacoes: "Interessada em novos sistemas"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(exampleData, { header: headersTemplate });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "modelo_leads_m4.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Use defval: '' to ensure we get empty strings instead of undefined
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      if (jsonData.length === 0) return;

      // Filter out completely empty rows (including the header if it's empty)
      const filteredData = jsonData.filter(row => 
        row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
      );

      if (filteredData.length === 0) return;

      const rawHeaders = filteredData[0].map(h => String(h).trim());
      setHeaders(rawHeaders);

      const rows = filteredData.slice(1).map(row => {
        const rowData: any = {};
        rawHeaders.forEach((header, index) => {
          rowData[header] = row[index];
        });
        return rowData;
      }).filter(row => {
        // Filter out rows that have no meaningful data
        return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
      });

      setCsvData(rows);

      // Auto-mapping logic using a strict lookup table
      const normalize = (str: string) => {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/_/g, ' ') // Replace underscores with spaces
          .replace(/\s+/g, ' ') // Remove extra spaces
          .trim();
      };

      const mappingLookup: Record<string, string> = {
        'nome empresa': 'company',
        'cnpj': 'cnpj',
        'cidade': 'city',
        'estado': 'state',
        'segmento': 'niche',
        'website': 'website',
        'email': 'company_email',
        'instagram': 'instagram',
        'telefone': 'company_phone',
        'whatsapp': 'company_whatsapp',
        'linkedin': 'company_linkedin',
        'nome contato': 'responsible_name',
        'cargo contato': 'contact_role',
        'email contato': 'email',
        'telefone contato': 'phone',
        'whatsapp contato': 'contact_whatsapp',
        'instagram contato': 'contact_instagram',
        'linkedin contato': 'contact_linkedin',
        'valor estimado': 'value',
        'tipo servico': 'service_type',
        'observacoes': 'notes',
      };

      const newMapping: Record<string, string> = {};
      rawHeaders.forEach(header => {
        const normalizedHeader = normalize(header);
        if (mappingLookup[normalizedHeader]) {
          newMapping[header] = mappingLookup[normalizedHeader];
        }
      });
      setMapping(newMapping);
      setImportStep(2);
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportError(null);

    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    const pipeline = pipelines.find(p => p.id === selectedPipelineId);
    const validPipelineId = isValidUUID(selectedPipelineId) ? selectedPipelineId : null;
    const stage = pipeline?.stages[0]?.id || '';
    const validStage = isValidUUID(stage) ? stage : null;
    const initialStatus = pipeline?.stages[0]?.status || 'active';

    const leadsToImport = csvData.map(row => {
      const leadObj: any = {
        pipeline_id: validPipelineId,
        stage: validStage,
        status: initialStatus,
      };

      Object.entries(mapping).forEach(([csvHeader, crmField]) => {
        if (crmField) {
          let value = row[csvHeader];
          if (crmField === 'value') {
            value = parseFloat(value) || 0;
          }
          leadObj[crmField] = value;
        }
      });

      // Set the required 'name' field as per user request
      leadObj.name = row['nome_empresa'] || row['nome_contato'] || 'Lead Importado';
      leadObj.company = row['nome_empresa'];

      // Allowed fields for insert as per user request
      const allowedFields = [
        'name', 'company', 'cnpj', 'city', 'state', 'niche', 'website', 'company_email', 
        'company_phone', 'company_whatsapp', 'company_linkedin', 'instagram', 
        'responsible_name', 'contact_role', 'email', 'phone', 'contact_whatsapp', 
        'contact_instagram', 'contact_linkedin', 'value', 'service_type', 
        'notes', 'pipeline_id', 'stage', 'status'
      ];

      // Clean the lead object: remove created_at, null, undefined, and empty strings
      const cleanLead = Object.fromEntries(
        Object.entries(leadObj)
          .filter(([k, v]) => allowedFields.includes(k) && v !== undefined && v !== null && v !== '')
      );

      return cleanLead;
    }).filter(lead => {
      // Filter out leads without a name (the primary field)
      return lead.name && String(lead.name).trim() !== '';
    });

    const { data, error } = await supabase
      .from('m4_leads')
      .insert(leadsToImport)
      .select();

    if (!error && data) {
      // Utility check for null pipeline_id as requested
      const leadsWithoutPipeline = data.filter(l => !l.pipeline_id);
      if (leadsWithoutPipeline.length > 0) {
        console.warn(`Aviso: ${leadsWithoutPipeline.length} leads foram importados sem um Pipeline associado (pipeline_id nulo).`);
      }

      setLeads(prev => [...prev, ...data]);
      setImportResult({ success: data.length, total: leadsToImport.length });
      setImportStep(3);
    } else {
      setImportError(error?.message || "Erro desconhecido ao importar leads.");
    }
    setIsImporting(false);
  };

  const resetImport = () => {
    setIsImportModalOpen(false);
    setImportStep(1);
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setImportResult(null);
    setImportError(null);
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    console.log('Iniciando exclusão do lead:', selectedLead.id);
    
    const { error } = await supabase
      .from('m4_leads')
      .delete()
      .eq('id', selectedLead.id);

    if (error) {
      console.error('Erro no Supabase ao excluir:', error);
      alert('Erro ao excluir: ' + error.message);
    } else {
      console.log('Lead excluído com sucesso do banco');
      setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
      setSelectedLead(null);
      setIsEditingLead(false);
      setIsDeleting(false);
      alert('Lead excluído com sucesso!');
    }
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
      />

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Importar Leads</h3>
              <button onClick={resetImport} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 scrollbar-none">
              {importStep === 1 && (
                <div className="space-y-8">
                  <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20 flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-black text-blue-900 dark:text-blue-100 uppercase tracking-tight">Modelo de Planilha</h4>
                      <p className="text-blue-600 dark:text-blue-400 text-sm font-bold">Baixe o modelo para garantir que os dados estejam no formato correto.</p>
                    </div>
                    <button 
                      onClick={downloadTemplate}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                    >
                      Download .XLSX
                    </button>
                  </div>

                  <div className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-16 text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 mx-auto">
                      <ICONS.Upload width="40" height="40" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Arraste seu arquivo CSV ou XLSX</h4>
                      <p className="text-slate-400 font-bold text-sm">ou clique no botão abaixo para selecionar</p>
                    </div>
                    <label className="inline-block px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest cursor-pointer hover:scale-105 transition-all">
                      Selecionar Arquivo
                      <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>
              )}

              {importStep === 2 && (
                <div className="space-y-8">
                  {/* Pipeline Selection Section - Highlighted */}
                  <div className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border-2 border-blue-100 dark:border-blue-900/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">PIPELINE DE DESTINO (OBRIGATÓRIO)</h4>
                      {!selectedPipelineId && (
                        <span className="text-[10px] font-bold text-rose-500 uppercase animate-pulse">Selecione um funil</span>
                      )}
                    </div>
                    <div className="relative">
                      <select 
                        value={selectedPipelineId}
                        onChange={(e) => setSelectedPipelineId(e.target.value)}
                        className="w-full p-5 bg-white dark:bg-slate-900 rounded-2xl border-none font-black text-slate-900 dark:text-white appearance-none shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="">Selecione o funil de destino...</option>
                        {pipelines.filter(p => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ICONS.ChevronDown width="20" height="20" className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Mapeamento de Colunas</h4>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Coluna da Planilha</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campo no CRM</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {headers.map(header => (
                            <tr key={header}>
                              <td className="p-4 font-bold text-slate-700 dark:text-slate-300 text-sm">{header}</td>
                              <td className="p-4">
                                <select 
                                  value={mapping[header] || ''}
                                  onChange={(e) => setMapping({...mapping, [header]: e.target.value})}
                                  className="w-full p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                                >
                                  <option value="">Ignorar coluna</option>
                                  {crmFields.map(f => (
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

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Preview dos Dados (Primeiras 3 linhas)</h4>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-x-auto border border-slate-100 dark:border-slate-800 scrollbar-none">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50">
                            {headers.map(h => (
                              <th key={h} className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {csvData.slice(0, 3).map((row, idx) => (
                            <tr key={idx}>
                              {headers.map(h => (
                                <td key={h} className="p-3 text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{row[h]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {importStep === 3 && importResult && (
                <div className="py-12 text-center space-y-8">
                  <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-[2rem] flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                    <ICONS.Check width="48" height="48" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Importação Concluída</h4>
                    <p className="text-slate-400 font-bold text-lg mt-2">
                      {importResult.success} leads importados com sucesso para {pipelines.find(p => p.id === selectedPipelineId)?.name}!
                    </p>
                  </div>
                  <button 
                    onClick={resetImport}
                    className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-blue-100 dark:shadow-none"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>

            {importStep === 2 && (
              <div className="p-10 pt-0 shrink-0 flex flex-col gap-4">
                {importError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold">
                    Erro ao importar: {importError}
                  </div>
                )}
                <div className="flex gap-4">
                  <button onClick={() => setImportStep(1)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Voltar</button>
                  <button 
                    onClick={handleImport}
                    disabled={isImporting || !selectedPipelineId}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 dark:shadow-none disabled:opacity-50 disabled:grayscale"
                  >
                    {isImporting ? 'IMPORTANDO...' : `IMPORTAR ${csvData.length} LEADS`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                      {lead.name ? lead.name.charAt(0) : '?'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{lead.name || 'Sem Nome'}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                      {pipelines.find(p => p.id === (lead as any).pipeline_id)?.name || 'Sem Pipeline'}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                      (lead.status === 'won' || lead.status === FunnelStatus.WON) ? 'bg-emerald-50 text-emerald-600' :
                      (lead.status === 'lost' || lead.status === FunnelStatus.LOST) ? 'bg-rose-50 text-rose-600' :
                      (lead.status === 'active' || lead.status === FunnelStatus.INITIAL || lead.status === FunnelStatus.INTERMEDIATE) ? 'bg-blue-50 text-blue-600' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {lead.status}
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
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {isEditingLead ? 'Editando Lead' : (selectedLead.company || selectedLead.name)}
                    </h2>
                    {!isEditingLead && (
                      <div className="flex items-center gap-2 mr-4">
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
                  className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 transition-all shadow-sm border border-slate-100 dark:border-slate-700"
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
                        value={editedLead.company} 
                        originalValue={selectedLead.company}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, company: val })}
                      />
                      <EditableInfoItem 
                        label="CNPJ" 
                        value={editedLead.cnpj} 
                        originalValue={selectedLead.cnpj}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, cnpj: formatCNPJ(val) })}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <EditableInfoItem 
                          label="Cidade" 
                          value={editedLead.city} 
                          originalValue={selectedLead.city}
                          isEditing={isEditingLead}
                          onChange={(val) => setEditedLead({ ...editedLead, city: val })}
                        />
                        <EditableInfoItem 
                          label="Estado" 
                          value={editedLead.state} 
                          originalValue={selectedLead.state}
                          isEditing={isEditingLead}
                          onChange={(val) => setEditedLead({ ...editedLead, state: val })}
                        />
                      </div>
                      <EditableInfoItem 
                        label="Segmento" 
                        value={editedLead.niche} 
                        originalValue={selectedLead.niche}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, niche: val })}
                      />
                      <EditableInfoItem 
                        label="Website" 
                        value={editedLead.website} 
                        originalValue={selectedLead.website}
                        isEditing={isEditingLead}
                        isLink
                        onChange={(val) => setEditedLead({ ...editedLead, website: val })}
                      />
                      <EditableInfoItem 
                        label="E-mail da Empresa" 
                        value={editedLead.company_email} 
                        originalValue={selectedLead.company_email}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, company_email: val })}
                      />
                      <EditableInfoItem 
                        label="LinkedIn da Empresa" 
                        value={editedLead.company_linkedin} 
                        originalValue={selectedLead.company_linkedin}
                        isEditing={isEditingLead}
                        isLink
                        onChange={(val) => setEditedLead({ ...editedLead, company_linkedin: val })}
                      />
                      <EditableInfoItem 
                        label="Telefone da Empresa" 
                        value={editedLead.company_phone} 
                        originalValue={selectedLead.company_phone}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, company_phone: formatPhoneBR(val) })}
                      />
                      <EditableInfoItem 
                        label="WhatsApp da Empresa" 
                        value={editedLead.company_whatsapp} 
                        originalValue={selectedLead.company_whatsapp}
                        isEditing={isEditingLead}
                        isWhatsApp
                        onChange={(val) => setEditedLead({ ...editedLead, company_whatsapp: formatPhoneBR(val) })}
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
                        value={editedLead.name} 
                        originalValue={selectedLead.name}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, name: val })}
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
                        value={editedLead.email} 
                        originalValue={selectedLead.email}
                        isEditing={isEditingLead}
                        onChange={(val) => setEditedLead({ ...editedLead, email: val })}
                      />
                      <EditableInfoItem 
                        label="WhatsApp" 
                        value={editedLead.contact_whatsapp} 
                        originalValue={selectedLead.contact_whatsapp}
                        isEditing={isEditingLead}
                        isWhatsApp
                        onChange={(val) => setEditedLead({ ...editedLead, contact_whatsapp: formatPhoneBR(val) })}
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
                        isLink
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
                        value={editedLead.notes} 
                        originalValue={selectedLead.notes}
                        isEditing={isEditingLead}
                        isTextArea
                        onChange={(val) => setEditedLead({ ...editedLead, notes: val })}
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
                          const { error } = await supabase
                            .from('m4_leads')
                            .update({ 
                              name: editedLead.name,
                              company: editedLead.company,
                              cnpj: editedLead.cnpj,
                              city: editedLead.city,
                              state: editedLead.state,
                              niche: editedLead.niche,
                              website: editedLead.website,
                              company_email: editedLead.company_email,
                              instagram: editedLead.instagram,
                              company_linkedin: editedLead.company_linkedin,
                              company_phone: editedLead.company_phone,
                              company_whatsapp: editedLead.company_whatsapp,
                              responsible_name: editedLead.responsible_name,
                              contact_role: editedLead.contact_role,
                              email: editedLead.email,
                              phone: editedLead.phone,
                              contact_whatsapp: editedLead.contact_whatsapp,
                              contact_instagram: editedLead.contact_instagram,
                              contact_linkedin: editedLead.contact_linkedin,
                              value: editedLead.value,
                              service_type: editedLead.service_type,
                              closing_forecast: editedLead.closing_forecast,
                              temperature: editedLead.temperature,
                              probability: editedLead.probability,
                              notes: editedLead.notes,
                              pipeline_id: selectedPipelineForEdit || null 
                            })
                            .eq('id', selectedLead.id)
                          
                          if (error) throw error
                          
                          const updated = { 
                            ...selectedLead, 
                            ...editedLead,
                            pipeline_id: selectedPipelineForEdit || null 
                          } as Lead
                          
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
