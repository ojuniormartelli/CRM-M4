import React, { useState, useEffect } from 'react';
import { M4Client, Task } from '../../types';
import { 
  Briefcase, 
  Layers, 
  Sparkles, 
  Download, 
  Check, 
  Clock,
  HelpCircle,
  FileText,
  BookmarkCheck,
  AlertCircle,
  Edit2,
  Trash2,
  Plus,
  Save,
  X
} from 'lucide-react';
import { taskService } from '../../services/taskService';
import { servicesUtils, ClientServiceContract } from '../../utils/services';
import { supabase } from '../../lib/supabase';
import { financeService } from '../../services/financeService';

interface ClientServicesTabProps {
  activeClient: M4Client;
  services: any[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  setClients?: React.Dispatch<React.SetStateAction<M4Client[]>>;
}

interface ServiceTemplatePlaybook {
  title: string;
  description: string;
  recurrence_type: 'daily' | 'weekly' | 'monthly';
  priority: string;
}

// Full, rich playbooks template catalog
const PLAYBOOKS_MAPPING: Record<string, ServiceTemplatePlaybook[]> = {
  'Google Ads': [
    { title: 'Auditoria Mensal de Campanhas Google Ads', description: 'Revisar índice de qualidade de anúncios, termos de pesquisa indesejados e ajustes de orçamentos de lances.', recurrence_type: 'monthly', priority: 'Alta' },
    { title: 'Limpeza Semanal de Termos Irrelevantes (Google)', description: 'Analisar termos de pesquisa ativados na semana e negativar termos sem conversão para otimizar investimento.', recurrence_type: 'weekly', priority: 'Alta' },
    { title: 'Acompanhamento Diário de Orçamento Google Ads', description: 'Revisar o consumo de verba diária programada da marca para garantir estabilidade.', recurrence_type: 'daily', priority: 'Alta' }
  ],
  'Meta Ads': [
    { title: 'Revisão Visual de Criativos Meta Ads', description: 'Avaliar anúncios com alta frequência ou fadiga visual no Meta Manager e sinalizar o squad de criação.', recurrence_type: 'weekly', priority: 'Alta' },
    { title: 'Análise Semanal de Leads e Funil (Meta)', description: 'Acompanhamento focado em Custo por Lead (CPL), taxa de cliques (CTR) e qualidade do pixel.', recurrence_type: 'weekly', priority: 'Média' },
    { title: 'Controle Diário de Leads & Automações Meta', description: 'Validar se todos os cadastros capturados no dia integraram de forma correta no CRM.', recurrence_type: 'daily', priority: 'Média' }
  ],
  'Landing Page': [
    { title: 'Teste de Carregamento e Conversão da LP', description: 'Verificar se formulários registram webhooks corretamente e testar velocidade Mobile via PageSpeed.', recurrence_type: 'monthly', priority: 'Alta' },
    { title: 'Auditoria Visual e Correções Mobile LP', description: 'Varredura semanal para assegurar sintonia estética, links e legibilidade em todas as resoluções.', recurrence_type: 'weekly', priority: 'Baixa' }
  ],
  'Site': [
    { title: 'Backup de Banco de Dados e Atualização de Plugins', description: 'Manutenção mensal técnica, preventiva e de segurança no ambiente WordPress/CMS da marca.', recurrence_type: 'monthly', priority: 'Média' },
    { title: 'Identificação Semanal de Páginas 404', description: 'Acompanhamento ativo de links quebrados e erros gerados no carregamento institucional.', recurrence_type: 'weekly', priority: 'Baixa' }
  ],
  'SEO': [
    { title: 'Auditoria Técnica SEO & Core Web Vitals', description: 'Revisão geral estrutural de velocidade, tags H1-H3 e problemas de indexabilidade no Google orgânico.', recurrence_type: 'monthly', priority: 'Média' },
    { title: 'Acompanhamento de Rank no Google Search Console', description: 'Analisar posições dos termos orgânicos chaves e cliques gerados.', recurrence_type: 'weekly', priority: 'Média' }
  ],
  'Social Media': [
    { title: 'Aprovação Mensal do Cronograma de Conteúdos', description: 'Postula grade de postagens e envia pautas e templates visuais para a aprovação do cliente.', recurrence_type: 'monthly', priority: 'Média' },
    { title: 'Programação de Grades e Posts Semanais', description: 'Agendar posts e stories aprovados nas contas nativos via Meta Business Suite.', recurrence_type: 'weekly', priority: 'Alta' }
  ],
  'Design': [
    { title: 'Alinhamento Mensal de Estética e Assets Design', description: 'Debate interno com diretor de criação para revisar guias de estilos de marcas operantes.', recurrence_type: 'monthly', priority: 'Baixa' }
  ],
  'Copywriting': [
    { title: 'Mapeamento Semanal de Pautas e Copys', description: 'Estruturação de termos chaves de copywriting, tom de voz e briefing de copys do cronograma.', recurrence_type: 'weekly', priority: 'Média' }
  ]
};

const isServiceContracted = (serviceCategoryName: string, clientServices: string[] = []) => {
  return clientServices.some(clientSrv => {
    let rawName = clientSrv;
    if (clientSrv.startsWith('{') && clientSrv.endsWith('}')) {
      try {
        const parsed = JSON.parse(clientSrv);
        rawName = parsed.name || '';
      } catch (e) {}
    }
    const s1 = rawName.toLowerCase();
    const s2 = serviceCategoryName.toLowerCase();
    return s1.includes(s2) || s2.includes(s1) || 
      (s2 === 'google ads' && s1.includes('tráfego')) || 
      (s2 === 'meta ads' && s1.includes('tráfego')) || 
      (s1 === 'tráfego pago' && (s2.includes('ads') || s2.includes('tráfego')));
  });
};

const isServiceRecurrentLocal = (name: string): boolean => {
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

export const ClientServicesTab: React.FC<ClientServicesTabProps> = ({
  activeClient,
  services,
  tasks,
  setTasks,
  onShowToast,
  setClients,
}) => {
  const [isInstalling, setIsInstalling] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContracts, setEditingContracts] = useState<ClientServiceContract[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // New service inline form state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number | ''>('');

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Load finance variables
  useEffect(() => {
    const fetchFinanceConfig = async () => {
      try {
        const { data: accounts } = await supabase
          .from('m4_fin_bank_accounts')
          .select('*')
          .eq('is_active', true);
        if (accounts) setBankAccounts(accounts);

        const { data: cats } = await supabase
          .from('m4_fin_categories')
          .select('*')
          .eq('type', 'income')
          .eq('is_active', true);
        if (cats) setCategories(cats);
      } catch (err) {
        console.error('[ClientServicesTab] Error loading banks/categories:', err);
      }
    };
    fetchFinanceConfig();
  }, [activeClient.workspace_id]);

  const syncFinancialLaunches = async (client: M4Client, contracts: ClientServiceContract[]) => {
    try {
      if (!client.workspace_id) return;

      // 1. Fetch existing accounts on m4_client_accounts for this company
      const { data: existingAccounts, error: accFetchError } = await supabase
        .from('m4_client_accounts')
        .select('*')
        .eq('company_id', client.company_id);

      if (accFetchError) {
        console.error('[syncFinancialLaunches] Error fetching m4_client_accounts:', accFetchError);
        return;
      }

      const activeContractsMap = new Set<string>();

      // 2. Process each contract in editingContracts
      for (const contract of contracts) {
        activeContractsMap.add(contract.name.toLowerCase());

        const notesObj = {
          bank_account_id: contract.bank_account_id || null,
          category_id: contract.category_id || null,
          installments: contract.billing_type === 'parcelado' ? (contract.installments || 1) : null,
          remaining_installments: contract.billing_type === 'parcelado' ? (contract.installments || 1) : null,
          current_installment: 1,
        };
        const notesStr = JSON.stringify(notesObj);

        const matchedAccount = (existingAccounts || []).find(
          acc => acc.service_name.toLowerCase() === contract.name.toLowerCase()
        );

        if (matchedAccount) {
          // Update existing account
          const { error: updateErr } = await supabase
            .from('m4_client_accounts')
            .update({
              monthly_value: contract.price,
              due_day: contract.due_day || 5,
              status: contract.active ? 'ativo' : 'cancelado',
              billing_model: contract.billing_type || 'recorrente',
              start_date: contract.start_date || null,
              notes: notesStr,
              updated_at: new Date().toISOString()
            })
            .eq('id', matchedAccount.id);

          if (updateErr) {
            console.error('[syncFinancialLaunches] Error updating account:', updateErr);
          }
        } else {
          // Insert new account
          const { error: insertErr } = await supabase
            .from('m4_client_accounts')
            .insert([{
              workspace_id: client.workspace_id,
              company_id: client.company_id,
              lead_id: client.lead_id || null,
              service_name: contract.name,
              service_type: 'custom',
              monthly_value: contract.price,
              due_day: contract.due_day || 5,
              status: contract.active ? 'ativo' : 'cancelado',
              billing_model: contract.billing_type || 'recorrente',
              start_date: contract.start_date || null,
              notes: notesStr,
            }]);

          if (insertErr) {
            console.error('[syncFinancialLaunches] Error inserting account:', insertErr);
          }
        }
      }

      // 3. Deactivate any client accounts that are no longer in active contracts
      const removedAccounts = (existingAccounts || []).filter(
        acc => acc.status === 'ativo' && !activeContractsMap.has(acc.service_name.toLowerCase())
      );

      for (const remAcc of removedAccounts) {
        const { error: cancelErr } = await supabase
          .from('m4_client_accounts')
          .update({
            status: 'cancelado',
            updated_at: new Date().toISOString()
          })
          .eq('id', remAcc.id);

        if (cancelErr) {
          console.error('[syncFinancialLaunches] Error canceling removed account:', cancelErr);
        }
      }

      // 4. Trigger unified financeService contract synchronization
      const syncResult = await financeService.syncContracts(client.workspace_id);
      
      if (syncResult.createdCount > 0) {
        onShowToast(`${syncResult.createdCount} novos lançamentos financeiros agendados com sucesso no Organizador!`, 'success');
      } else {
        onShowToast('Serviços salvos e organizador sincronizado em dia!', 'success');
      }

    } catch (err) {
      console.error('[syncFinancialLaunches] Unexpected error:', err);
      onShowToast('Ocorreu um erro ao sincronizar lançamentos contratados.', 'error');
    }
  };

  const keys = Object.keys(PLAYBOOKS_MAPPING);
  const clientSrvs = activeClient.services || [];
  
  const defaultTab = keys.find(k => isServiceContracted(k, clientSrvs)) || keys[0];
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>(defaultTab);

  const handleImportPlaybook = async (serviceName: string, playbook: ServiceTemplatePlaybook) => {
    setIsInstalling(playbook.title);
    try {
      const routinePayload = {
        title: playbook.title,
        description: playbook.description,
        status: 'Ativo',
        priority: playbook.priority,
        client_id: activeClient.id,
        company_id: activeClient.company_id || null,
        workspace_id: activeClient.workspace_id || '',
        task_type: 'operational' as const,
        type: 'task' as const,
        is_recurring: true,
        recurrence_type: playbook.recurrence_type
      };

      const created = await taskService.create(routinePayload, activeClient.workspace_id || '');
      setTasks(prev => [created, ...prev]);
      onShowToast(`Sucesso! Rotina "${created.title}" instalada no playbook de atendimento comercial.`, 'success');
    } catch (err: any) {
      onShowToast('Falha ao importar playbook do canal', 'error');
    } finally {
      setIsInstalling(null);
    }
  };

  const startEditMode = () => {
    const currentList = servicesUtils.parseClientServices(activeClient.services, services);
    setEditingContracts(currentList);
    setNewServiceName('');
    setNewServicePrice('');
    setIsEditing(true);
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    setEditingContracts(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, price: newPrice };
      }
      return item;
    }));
  };

  const handleRemoveEditingContract = (index: number) => {
    setEditingContracts(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleNewServiceSelected = (name: string) => {
    setNewServiceName(name);
    const matched = services.find(s => s.name === name);
    if (matched) {
      setNewServicePrice(matched.default_price || 0);
    } else {
      setNewServicePrice('');
    }
  };

  const handleAddEditingContract = () => {
    if (!newServiceName) {
      onShowToast('Por favor, selecione ou informe o serviço contratado.', 'warning');
      return;
    }
    
    // Check if ya exists
    if (editingContracts.some(c => c.name.toLowerCase() === newServiceName.toLowerCase())) {
      onShowToast('Este serviço já está listado no escopo.', 'warning');
      return;
    }

    const price = Number(newServicePrice) || 0;
    const recurrent = isServiceRecurrentLocal(newServiceName);
    
    setEditingContracts(prev => [...prev, {
      name: newServiceName,
      price,
      billing_type: recurrent ? 'recorrente' : 'parcelado',
      installments: recurrent ? 1 : 3,
      installment_value: recurrent ? 0 : Math.round((price / 3) * 100) / 100,
      include_in_monthly: true,
      active: true
    }]);

    setNewServiceName('');
    setNewServicePrice('');
    onShowToast('Serviço adicionado à lista de edição.', 'info');
  };

  const saveServicesChanges = async () => {
    setIsSaving(true);
    try {
      const serialized = servicesUtils.serializeClientServices(editingContracts);
      
      const recTotal = editingContracts
        .filter(c => c.billing_type === 'recorrente')
        .reduce((sum, c) => sum + (c.price || 0), 0);
      const insTotal = editingContracts
        .filter(c => c.billing_type === 'parcelado' && c.include_in_monthly)
        .reduce((sum, c) => sum + (c.installment_value || (c.price / (c.installments || 1))), 0);
      const totalMRR = Number((recTotal + insTotal).toFixed(2));

      const { error } = await supabase
        .from('m4_clients')
        .update({
          services: serialized,
          monthly_value: totalMRR
        })
        .eq('id', activeClient.id);

      if (error) throw error;

      // Update local clients list
      if (setClients) {
        setClients(prev => prev.map(c => {
          if (c.id === activeClient.id) {
            return {
              ...c,
              services: serialized,
              monthly_value: totalMRR
            };
          }
          return c;
        }));
      }

      // Synchronize automatic launches on active financial counts
      await syncFinancialLaunches(activeClient, editingContracts);

      setIsEditing(false);
      onShowToast('Serviços e MRR consolidado atualizados com sucesso no contrato.', 'success');
    } catch (e: any) {
      onShowToast('Ocorreu um erro ao atualizar os serviços contratados.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Human-readable services lists mapped for display/iteration
  const activeContractsParsed = servicesUtils.parseClientServices(activeClient.services, services);
  const hasClientServices = activeContractsParsed.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-880 shadow-sm space-y-8 animate-in fade-in duration-300">
      
      {/* Tab Header with Edit actions toggle */}
      <div className="flex justify-between items-center bg-slate-50/40 dark:bg-slate-950/20 p-5 rounded-3xl border border-slate-100/50 dark:border-slate-800/40">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Serviços & Canais Contratados</span>
            <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-md dark:bg-blue-950/20 dark:text-blue-400">
              Handoff Comercial
            </span>
          </h3>
          <p className="text-xs text-slate-500">Canais herdados diretamente do onboarding que definem o escopo de atuação do squad operacional.</p>
        </div>

        {!isEditing && (
          <button 
            type="button"
            onClick={startEditMode}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Editar Valores & Serviços
          </button>
        )}
      </div>

      {isEditing ? (
        /* ==================== EDIT MODE PANEL ==================== */
        <div className="p-6 border-2 border-dashed border-blue-100 dark:border-blue-950/50 rounded-3xl bg-blue-50/10 dark:bg-blue-950/5 space-y-6 animate-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850">
            <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest block">
              🔧 Gerenciar Escopo do Contrato
            </span>
            <span className="text-[10px] font-bold text-slate-400 italic">
              A soma dos valores atualizará automaticamente o MRR consolidado do cliente
            </span>
          </div>

          {/* List of services in edit status */}
          <div className="space-y-3">
            {editingContracts.length > 0 ? (
              editingContracts.map((srv, index) => {
                const isRecurrent = srv.billing_type === 'recorrente';
                return (
                  <div key={srv.name + index} className="p-4 bg-white dark:bg-slate-950 rounded-2xl flex flex-col gap-4 shadow-3xs border border-slate-100 dark:border-slate-850">
                    
                    {/* Upper row: Main scope and prices */}
                    <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-905 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Canal</span>
                          <strong className="text-sm font-black text-slate-900 dark:text-white block">{srv.name}</strong>
                          
                          {/* Selector toggle */}
                          <div className="flex gap-2 mt-1 font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingContracts(prev => prev.map((item, idx) => {
                                  if (idx === index) {
                                    return {
                                      ...item,
                                      billing_type: 'recorrente',
                                      installments: 1,
                                      installment_value: 0
                                    };
                                  }
                                  return item;
                                }));
                              }}
                              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md transition-all ${
                                isRecurrent
                                  ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/30'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              🔁 Recorrente
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingContracts(prev => prev.map((item, idx) => {
                                  if (idx === index) {
                                    return {
                                      ...item,
                                      billing_type: 'parcelado',
                                      installments: 3,
                                      installment_value: Math.round((item.price / 3) * 100) / 100
                                    };
                                  }
                                  return item;
                                }));
                              }}
                              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md transition-all ${
                                !isRecurrent
                                  ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              📅 Parcelado
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 self-end xl:self-auto">
                        {/* Price input */}
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black uppercase text-slate-400 block">
                            {isRecurrent ? 'Mensalidade (R$)' : 'Valor Total (R$)'}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-black text-slate-400">R$</span>
                            <input 
                              type="number"
                              step="10"
                              min="0"
                              value={srv.price}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setEditingContracts(prev => prev.map((item, idx) => {
                                  if (idx === index) {
                                    return {
                                      ...item,
                                      price: val,
                                      installment_value: item.billing_type === 'parcelado' ? (item.installments && item.installments > 0 ? Number((val / item.installments).toFixed(2)) : 0) : 0
                                    };
                                  }
                                  return item;
                                }));
                              }}
                              className="pl-8 pr-1.5 py-1.5 w-28 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {!isRecurrent && (
                          <>
                            {/* Installments selector */}
                            <div className="space-y-0.5 w-16">
                              <label className="text-[9px] font-black uppercase text-slate-400 block">Parcelas</label>
                              <select
                                value={srv.installments || 3}
                                onChange={(e) => {
                                  const count = parseInt(e.target.value) || 1;
                                  setEditingContracts(prev => prev.map((item, idx) => {
                                    if (idx === index) {
                                      return {
                                        ...item,
                                        installments: count,
                                        installment_value: Number((item.price / count).toFixed(2))
                                      };
                                    }
                                    return item;
                                  }));
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-2 py-1.5 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none"
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map(n => (
                                  <option key={n} value={n}>{n}x</option>
                                ))}
                              </select>
                            </div>

                            {/* Installment value read-only indicator */}
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-black uppercase text-slate-400 block">Vl. Parcela</span>
                              <span className="text-xs font-black text-amber-600 block pt-1.5 whitespace-nowrap">
                                R$ {(srv.installment_value || (srv.price / (srv.installments || 1))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            {/* Include in monthly checkbox */}
                            <div className="flex items-center gap-1.5 pt-4">
                              <input
                                type="checkbox"
                                id={`inc-monthly-tab-${index}`}
                                checked={srv.include_in_monthly !== false}
                                onChange={(e) => {
                                  setEditingContracts(prev => prev.map((item, idx) => {
                                    if (idx === index) {
                                      return {
                                        ...item,
                                        include_in_monthly: e.target.checked
                                      };
                                    }
                                    return item;
                                  }));
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 border-slate-300"
                              />
                              <label htmlFor={`inc-monthly-tab-${index}`} className="text-[9px] font-black text-slate-400 uppercase tracking-wider cursor-pointer select-none">
                                Mensalidade
                              </label>
                            </div>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveEditingContract(index)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer self-end xl:self-auto"
                          title="Remover serviço"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Lower row: detailed payment schedule metadata picker */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-850/50 mt-1">
                      {isRecurrent ? (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 block">Dia de Vencimento Mensal</label>
                          <select
                            value={srv.due_day || 5}
                            onChange={(e) => {
                              const day = parseInt(e.target.value) || 5;
                              setEditingContracts(prev => prev.map((item, idx) => {
                                if (idx === index) {
                                  return { ...item, due_day: day };
                                }
                                return item;
                              }));
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <option key={day} value={day}>Todo dia {day}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 block">Data de Início / 1ª Parcela</label>
                          <input
                            type="date"
                            value={srv.start_date || new Date().toISOString().split('T')[0]}
                            onChange={(e) => {
                              const date = e.target.value;
                              setEditingContracts(prev => prev.map((item, idx) => {
                                if (idx === index) {
                                  return { ...item, start_date: date };
                                }
                                return item;
                              }));
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 block">Conta para Recebimento</label>
                        <select
                          value={srv.bank_account_id || ''}
                          onChange={(e) => {
                            const accId = e.target.value || undefined;
                            setEditingContracts(prev => prev.map((item, idx) => {
                              if (idx === index) {
                                return { ...item, bank_account_id: accId };
                              }
                              return item;
                            }));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                        >
                          <option value="">Selecione uma conta...</option>
                          {bankAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 block">Categoria Receita</label>
                        <select
                          value={srv.category_id || ''}
                          onChange={(e) => {
                            const catId = e.target.value || undefined;
                            setEditingContracts(prev => prev.map((item, idx) => {
                              if (idx === index) {
                                return { ...item, category_id: catId };
                              }
                              return item;
                            }));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                        >
                          <option value="">Selecione uma categoria...</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs italic">
                Nenhum serviço vinculado no momento. Adicione um abaixo.
              </div>
            )}
          </div>

          {/* New service inline inclusion line */}
          <div className="p-4 bg-slate-100/40 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3">
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Adicionar Novo Serviço Ativo</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <select
                  value={newServiceName}
                  onChange={(e) => handleNewServiceSelected(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-850 dark:text-white"
                >
                  <option value="">Selecione um serviço do catálogo</option>
                  {services.map(s => (
                    <option key={s.id || s.name} value={s.name}>{s.name}</option>
                  ))}
                  {/* Fallback to custom entry if catalog doesn't cover */}
                  <option value="Tráfego Pago">Tráfego Pago</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Meta Ads">Meta Ads</option>
                  <option value="Inbound Marketing">Inbound Marketing</option>
                  <option value="Gestão de Redes Sociais">Gestão de Redes Sociais</option>
                  <option value="Identidade Visual">Identidade Visual</option>
                  <option value="Assessoria CRM">Assessoria CRM</option>
                  <option value="CRO / Landing Page">CRO / Landing Page</option>
                </select>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">R$</span>
                <input 
                  type="number"
                  min="0"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value !== '' ? Number(e.target.value) : '')}
                  className="pl-8 pr-3 py-2.5 w-full bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-extrabold text-slate-850 dark:text-white focus:outline-none"
                  placeholder="Valor mensal"
                />
              </div>

              <button
                type="button"
                onClick={handleAddEditingContract}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                Adicionar ao Escopo
              </button>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center">
            {/* Dynamic visual total MRR calculator feedback */}
            {(() => {
              const recSum = editingContracts
                .filter(c => c.billing_type === 'recorrente')
                .reduce((sum, c) => sum + (c.price || 0), 0);
              const insSum = editingContracts
                .filter(c => c.billing_type === 'parcelado' && c.include_in_monthly)
                .reduce((sum, c) => sum + (srv => srv.installment_value || (srv.price / (srv.installments || 1)))(c), 0);
              const totalVal = recSum + insSum;
              return (
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-405 tracking-widest block">Novo Saldo Mensal Consolidado</span>
                  <strong className="text-sm font-black text-blue-600 dark:text-blue-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVal)}
                  </strong>
                  {insSum > 0 && (
                    <span className="text-[9px] text-slate-400 block font-medium">
                      R$ {recSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} base + R$ {insSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em parcelas
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-855 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveServicesChanges}
                disabled={isSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Gravando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== NORMAL READ-ONLY MODE ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hasClientServices ? (
            activeContractsParsed.map((srv, sIdx) => {
              const matchedAccount = bankAccounts.find(a => a.id === srv.bank_account_id);
              const matchedCategory = categories.find(c => c.id === srv.category_id);
              return (
                <div key={srv.name + sIdx} className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-3xs">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Canal Ativo</span>
                        <strong className="text-sm font-extrabold text-slate-950 dark:text-white block">{srv.name}</strong>
                      </div>
                    </div>
                    <div className="text-right font-sans">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Valor</span>
                      <strong className="text-sm font-black text-blue-600 dark:text-blue-400 block mt-0.5 whitespace-nowrap">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(srv.price)}
                      </strong>
                    </div>
                  </div>

                  {/* Payment Details Metadata block */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex flex-col gap-1.5 text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Tipo Faturamento</span>
                      <span className="text-slate-600 dark:text-slate-400 font-bold self-end text-right">
                        {srv.billing_type === 'parcelado' ? `📅 Parcelado (${srv.installments || 1}x)` : '🔁 Recorrência'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Vencimento</span>
                      <span className="text-slate-600 dark:text-slate-400 font-bold self-end text-right">
                        {srv.billing_type === 'parcelado' 
                          ? `${srv.start_date ? new Date(srv.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}`
                          : `Todo dia ${srv.due_day || 5}`
                        }
                      </span>
                    </div>

                    {matchedAccount && (
                      <div className="flex justify-between items-top gap-1">
                        <span className="text-slate-400">Conta Destino</span>
                        <span className="font-sans normal-case text-slate-700 dark:text-slate-300 font-bold text-right truncate max-w-[120px]" title={matchedAccount.name}>
                          {matchedAccount.name}
                        </span>
                      </div>
                    )}

                    {matchedCategory && (
                      <div className="flex justify-between items-top gap-1">
                        <span className="text-slate-400">Categoria</span>
                        <span className="font-sans normal-case text-slate-700 dark:text-slate-300 font-bold text-right truncate max-w-[120px]" title={matchedCategory.name}>
                          {matchedCategory.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-8 text-center text-slate-400 text-sm">
              Nenhum serviço ou canal de entrega mapeado no onboarding.
            </div>
          )}
        </div>
      )}

      {/* Suggested Playbooks Engine: Prepare for automation */}
      <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-650" />
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                Catálogo Geral de Playbooks Operacionais
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Instale templates operacionais recomendados por canal no playbook ativo de rotinas do seu cliente.
            </p>
          </div>
        </div>

        {/* Tab Selection Filter for Playbook Categories */}
        <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-100 dark:border-slate-800/80 font-bold">
          {keys.map(catKey => {
            const isContracted = isServiceContracted(catKey, clientSrvs);
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategoryTab(catKey)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  selectedCategoryTab === catKey
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>{catKey}</span>
                {isContracted ? (
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedCategoryTab === catKey ? 'bg-white text-blue-600' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  }`}>
                    Contratado
                  </span>
                ) : (
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedCategoryTab === catKey ? 'bg-blue-500 text-blue-100' : 'bg-slate-205/60 dark:bg-slate-800 text-slate-400'
                  }`}>
                    Disponível
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Category Templates Grid representation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PLAYBOOKS_MAPPING[selectedCategoryTab]?.map((playbook, idx) => {
            const isAlreadyPresent = tasks.some(t => 
              t.client_id === activeClient.id && 
              t.is_recurring && 
              t.task_type === 'operational' &&
              t.title === playbook.title
            );

            return (
              <div 
                key={selectedCategoryTab + playbook.title + idx} 
                className={`p-5 rounded-3xl border flex flex-col justify-between gap-5 transition-all ${
                  isAlreadyPresent 
                    ? 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-850/40' 
                    : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 shadow-2xs hover:shadow-sm'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-blue-650 uppercase tracking-widest">Rotina Recomendada</span>
                    <span className="text-[8px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {playbook.recurrence_type === 'weekly' ? 'Semanal' : playbook.recurrence_type === 'monthly' ? 'Mensal' : 'Diária'}
                    </span>
                  </div>
                  <span className={`text-base font-black block ${isAlreadyPresent ? 'text-slate-450 line-through' : 'text-slate-900 dark:text-white'}`}>
                    {playbook.title}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {playbook.description}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-50/80 dark:border-slate-880/30">
                  <span className="text-[9px] font-extrabold uppercase text-slate-400">
                    Prioridade: <strong className="text-slate-600 dark:text-slate-300 font-black">{playbook.priority}</strong>
                  </span>
                  
                  {isAlreadyPresent ? (
                    <span className="text-[10px] text-emerald-600 font-black flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-100/30">
                      <Check className="w-3.5 h-3.5" />
                      Instalada no Playbook
                    </span>
                  ) : (
                    <button
                      onClick={() => handleImportPlaybook(selectedCategoryTab, playbook)}
                      disabled={isInstalling === playbook.title}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isInstalling === playbook.title ? 'Instalando...' : 'Importar Rotina'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
