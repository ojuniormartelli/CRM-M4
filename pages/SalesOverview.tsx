
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Lead, Pipeline, User } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';

interface SalesOverviewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  pipelines: Pipeline[];
  setActiveTab: (tab: string) => void;
  onNewLead: () => void;
  currentUser: User | null;
}

const SalesOverview: React.FC<SalesOverviewProps> = ({ leads, setLeads, pipelines, setActiveTab, onNewLead, currentUser }) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedPipelineId, setSelectedPipelineId] = useState(() => {
    const firstValid = pipelines.find(p => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id));
    return firstValid?.id || pipelines[0]?.id || '';
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; total: number } | null>(null);
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);
  const [recentLeadsFilter, setRecentLeadsFilter] = useState<'all' | 'with_pipeline' | 'without_pipeline'>('all');
  const [showAllRecentLeads, setShowAllRecentLeads] = useState(false);

  React.useEffect(() => {
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!selectedPipelineId || !isValidUUID(selectedPipelineId)) {
      const firstValid = pipelines.find(p => isValidUUID(p.id));
      if (firstValid) {
        setSelectedPipelineId(firstValid.id);
      }
    }
  }, [pipelines, selectedPipelineId]);

  const activeLeads = leads.filter(l => l.status !== 'won' && l.status !== 'lost');
  
  const totalValue = activeLeads.reduce((acc, lead) => acc + (lead.value || 0), 0);
  
  const filteredRecentLeads = [...leads]
    .filter(l => {
      if (recentLeadsFilter === 'with_pipeline') return !!l.pipeline_id;
      if (recentLeadsFilter === 'without_pipeline') return !l.pipeline_id;
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const recentLeads = showAllRecentLeads ? filteredRecentLeads : filteredRecentLeads.slice(0, 10);

  const crmFields = [
    { id: 'company_name', label: 'Nome da Empresa', synonyms: ['empresa', 'company', 'razao social', 'nome fantasia', 'organization'] },
    { id: 'company_cnpj', label: 'CNPJ', synonyms: ['documento', 'tax id', 'cnpj/cpf'] },
    { id: 'company_city', label: 'Cidade', synonyms: ['municipio', 'city', 'localidade'] },
    { id: 'company_state', label: 'Estado', synonyms: ['uf', 'state', 'provincia', 'regiao'] },
    { id: 'company_segment', label: 'Segmento/Nicho', synonyms: ['nicho', 'setor', 'industria', 'industry', 'segmento'] },
    { id: 'company_website', label: 'Website', synonyms: ['site', 'url', 'web'] },
    { id: 'company_email', label: 'E-mail da Empresa', synonyms: ['email empresa', 'email corporativo', 'e-mail'] },
    { id: 'company_phone', label: 'Telefone da Empresa', synonyms: ['telefone empresa', 'fone empresa', 'telefone'] },
    { id: 'company_whatsapp', label: 'WhatsApp da Empresa', synonyms: ['whats empresa', 'zap empresa', 'whatsapp'] },
    { id: 'company_instagram', label: 'Instagram da Empresa', synonyms: ['insta empresa', 'ig empresa', 'instagram'] },
    { id: 'company_linkedin', label: 'LinkedIn da Empresa', synonyms: ['linkedin empresa', 'linkedin'] },
    { id: 'contact_name', label: 'Nome do Contato', synonyms: ['contato', 'responsavel', 'nome', 'person', 'contact', 'decisor'] },
    { id: 'contact_role', label: 'Cargo do Contato', synonyms: ['cargo', 'funcao', 'role', 'position', 'departamento'] },
    { id: 'contact_email', label: 'E-mail do Contato', synonyms: ['email contato', 'email pessoal', 'email'] },
    { id: 'contact_phone', label: 'Telefone do Contato', synonyms: ['telefone contato', 'fone contato', 'celular'] },
    { id: 'contact_whatsapp', label: 'WhatsApp do Contato', synonyms: ['whats contato', 'zap contato', 'whatsapp'] },
    { id: 'contact_instagram', label: 'Instagram do Contato', synonyms: ['insta contato', 'ig contato'] },
    { id: 'contact_linkedin', label: 'LinkedIn do Contato', synonyms: ['linkedin contato'] },
    { id: 'estimated_value', label: 'Valor Estimado', synonyms: ['valor', 'ticket', 'preco', 'price', 'value', 'investimento'] },
    { id: 'service_type', label: 'Tipo de Serviço', synonyms: ['servico', 'produto', 'service', 'oferta'] },
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
        'nome empresa': 'company_name',
        'cnpj': 'company_cnpj',
        'cidade': 'company_city',
        'estado': 'company_state',
        'segmento': 'company_segment',
        'website': 'company_website',
        'email': 'company_email',
        'instagram': 'company_instagram',
        'linkedin': 'company_linkedin',
        'telefone': 'company_phone',
        'whatsapp': 'company_whatsapp',
        'nome contato': 'contact_name',
        'cargo contato': 'contact_role',
        'email contato': 'contact_email',
        'telefone contato': 'contact_phone',
        'whatsapp contato': 'contact_whatsapp',
        'instagram contato': 'contact_instagram',
        'linkedin contato': 'contact_linkedin',
        'valor estimado': 'estimated_value',
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
    const stageId = pipeline?.stages[0]?.id || '';
    const validStageId = isValidUUID(stageId) ? stageId : null;

    const leadsToImport = csvData.map(row => {
      const leadObj: any = {
        pipeline_id: validPipelineId,
        stage: validStageId,
      };

      Object.entries(mapping).forEach(([csvHeader, crmField]) => {
        if (crmField) {
          let value = row[csvHeader];
          if (crmField === 'estimated_value') {
            value = parseFloat(value) || 0;
          }
          leadObj[crmField] = value;
        }
      });

      // Set the required 'name' field as per user request
      leadObj.name = leadObj.company_name || leadObj.contact_name || 'Lead Importado';

      // Allowed fields for insert as per user request
      const allowedFields = [
        'name', 'company_name', 'company_cnpj', 'company_city', 'company_state', 
        'company_segment', 'company_website', 'company_email', 'company_instagram', 
        'company_linkedin', 'company_phone', 'company_whatsapp', 'contact_name', 
        'contact_role', 'contact_email', 'contact_phone', 'contact_whatsapp', 
        'contact_instagram', 'contact_linkedin', 'estimated_value', 'service_type', 
        'notes', 'pipeline_id', 'stage'
      ];

      // Clean the lead object: remove created_at, null, undefined, and empty strings
      const cleanLead = Object.fromEntries(
        Object.entries(leadObj)
          .filter(([k, v]) => allowedFields.includes(k) && v !== undefined && v !== null && v !== '')
      );

      return cleanLead;
    }).filter(lead => {
      // Filter out leads without a company name or contact name (the primary fields)
      return (lead.company_name && String(lead.company_name).trim() !== '') || 
             (lead.contact_name && String(lead.contact_name).trim() !== '');
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

  const handleMoveLead = async (leadId: string, pipelineId: string) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pipelineId);
    
    if (!isUuid) {
      console.warn('Aguardando sincronização de pipelines com o servidor...');
      // Atualizamos o estado local para remover o badge imediatamente
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_id: pipelineId } : l));
      setMovingLeadId(null);
      return;
    }

    const pipeline = pipelines.find(p => p.id === pipelineId);
    const stageId = pipeline?.stages[0]?.id || '';

    const { error } = await supabase
      .from('m4_leads')
      .update({ pipeline_id: pipelineId, stage: stageId })
      .eq('id', leadId);

    if (!error) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_id: pipelineId, stage: stageId } : l));
      setMovingLeadId(null);
    } else {
      console.error('Erro ao mover lead:', error);
    }
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

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Pipelines de Vendas</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Visão Geral e Desempenho</p>
        </div>
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
            {pipelines.map(pipeline => {
              const pipelineLeads = activeLeads.filter(l => l.pipeline_id === pipeline.id);
              const pipelineValue = pipelineLeads.reduce((acc, l) => acc + (l.value || 0), 0);
              
              return (
                <button 
                  key={pipeline.id}
                  onClick={() => setActiveTab(`pipeline_${pipeline.id}`)}
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
            })}
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
                <div key={lead.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-black">
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
                    {!lead.pipeline_id && (
                      <div className="relative">
                        <button 
                          onClick={() => setMovingLeadId(movingLeadId === lead.id ? null : lead.id)}
                          className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center gap-1"
                        >
                          Sem Pipeline
                          <ICONS.ChevronDown width="12" height="12" />
                        </button>
                        
                        {movingLeadId === lead.id && (
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 p-2 space-y-1">
                            <p className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 mb-1">Mover para:</p>
                            {(pipelines.length > 0 ? pipelines : [
                              { id: 'fallback_p1', name: 'Vendas Comercial' },
                              { id: 'fallback_p2', name: 'Gestão de Reuniões' }
                            ]).map(p => (
                              <button
                                key={p.id}
                                onClick={() => handleMoveLead(lead.id, p.id)}
                                className="w-full text-left p-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-all flex items-center justify-between group"
                              >
                                {p.name}
                                <ICONS.ArrowRight width="14" height="14" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                      lead.status === 'won' ? 'bg-emerald-50 text-emerald-600' :
                      lead.status === 'lost' ? 'bg-rose-50 text-rose-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {lead.status}
                    </span>
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
    </div>
  );
};

export default SalesOverview;
