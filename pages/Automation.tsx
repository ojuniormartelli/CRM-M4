
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { Lead, Automation, User } from '../types';
import { automationService } from '../services/automationService';
import { supabase } from '../lib/supabase';
import AutomationForm from '../components/AutomationForm';
import ConfirmModal from '../components/ConfirmModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AutomationProps {
  leads: Lead[];
  currentUser: User | null;
}

const AutomationPage: React.FC<AutomationProps> = ({ leads, currentUser }) => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isUUID = (uuid: any) => typeof uuid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  const [workspaceId, setWorkspaceId] = useState<string>(() => {
    const initial = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id') || '';
    return isUUID(initial) ? initial : '';
  });

  const [isWorkspaceChecked, setIsWorkspaceChecked] = useState(false);

  useEffect(() => {
    const checkWorkspace = async () => {
      if (!isUUID(workspaceId)) {
        // Try to find any workspace in the database
        const { data: settings } = await supabase.from('m4_settings').select('workspace_id').maybeSingle();
        if (settings?.workspace_id && isUUID(settings.workspace_id)) {
          setWorkspaceId(settings.workspace_id);
          localStorage.setItem('m4_crm_workspace_id', settings.workspace_id);
        } else {
          // If still no workspace, try to find one from pipelines
          const { data: pipelines } = await supabase.from('m4_pipelines').select('workspace_id').not('workspace_id', 'is', null).limit(1);
          if (pipelines && pipelines.length > 0 && pipelines[0].workspace_id && isUUID(pipelines[0].workspace_id)) {
            setWorkspaceId(pipelines[0].workspace_id);
            localStorage.setItem('m4_crm_workspace_id', pipelines[0].workspace_id);
          }
        }
      }
      setIsWorkspaceChecked(true);
    };
    checkWorkspace();
  }, [currentUser, workspaceId]);

  const fetchAutomations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await automationService.list(workspaceId);
      setAutomations(data);
    } catch (err) {
      console.error('Error fetching automations:', err);
      setError('Não foi possível carregar as automações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isWorkspaceChecked) {
      fetchAutomations();
    }
  }, [workspaceId, isWorkspaceChecked]);

  const handleCreate = () => {
    setEditingAutomation(null);
    setIsFormOpen(true);
  };

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setAutomationToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!automationToDelete) return;
    try {
      setIsDeleting(true);
      await automationService.delete(automationToDelete);
      setAutomations(automations.filter(a => a.id !== automationToDelete));
      setIsDeleteModalOpen(false);
      setAutomationToDelete(null);
    } catch (err) {
      console.error('Error deleting automation:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await automationService.toggleActive(id, !currentStatus);
      setAutomations(automations.map(a => a.id === id ? updated : a));
    } catch (err) {
      console.error('Error toggling automation status:', err);
      alert('Erro ao alterar status da automação.');
    }
  };

  const handleSave = async (data: Partial<Automation>) => {
    try {
      if (editingAutomation) {
        const updated = await automationService.update(editingAutomation.id, data);
        setAutomations(automations.map(a => a.id === editingAutomation.id ? updated : a));
      } else {
        const created = await automationService.create(data, workspaceId);
        setAutomations([created, ...automations]);
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Error saving automation:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Automações</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Regras automáticas para otimizar sua agência.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all flex items-center gap-3 active:scale-95"
        >
          <ICONS.Plus /> Nova Automação
        </button>
      </div>

      {error && (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-3xl border border-red-100 dark:border-red-900/30 font-bold flex items-center gap-4">
          <ICONS.AlertTriangle />
          {error}
        </div>
      )}

      {automations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/50 p-20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6">
            <ICONS.Automation className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Nenhuma automação encontrada</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md font-medium mb-8">Comece criando sua primeira automação para economizar tempo e evitar erros manuais.</p>
          <button 
            onClick={handleCreate}
            className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 hover:text-white transition-all flex items-center gap-3"
          >
            <ICONS.Plus /> Criar Minha Primeira Automação
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {automations.map((a) => (
            <div key={a.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
                    <ICONS.Automation />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tight">{a.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{a.entity_type}</span>
                      <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{a.trigger_type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleToggleActive(a.id, a.is_active)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                      a.is_active 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' 
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">{a.is_active ? 'Ativa' : 'Pausada'}</span>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${a.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${a.is_active ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Condições</p>
                  <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                    {Array.isArray(a.trigger_conditions) ? a.trigger_conditions.length : (a.trigger_conditions ? 1 : 0)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Ações</p>
                  <p className="text-lg font-black text-slate-700 dark:text-slate-200">{a.actions?.length || 0}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Criada em {format(new Date(a.created_at), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(a)}
                    className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                    title="Editar"
                  >
                    <ICONS.Edit className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(a.id)}
                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    title="Excluir"
                  >
                    <ICONS.Trash className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AutomationForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        automation={editingAutomation}
        workspaceId={workspaceId}
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title="Excluir Automação"
        message="Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setAutomationToDelete(null);
        }}
        variant="danger"
        isLoading={isDeleting}
      />

      {/* AI COPILOT SECTION */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 rounded-[2.5rem] border border-blue-400 shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group mt-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="flex-1 relative z-10">
          <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">IA Copilot Inteligente</h3>
          <p className="text-blue-100 mb-6 font-medium">Deixe nossa IA analisar seus leads e sugerir as melhores automações de conversão.</p>
          
          <button 
            onClick={async () => {
              alert('Funcionalidade de sugestão por IA será integrada ao novo motor de automações em breve.');
            }}
            className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black hover:bg-blue-50 shadow-2xl transition-all flex items-center gap-3 active:scale-95"
          >
            <ICONS.Automation />
            SOLICITAR INSIGHTS DA IA
          </button>
        </div>
        <div className="w-40 h-40 bg-white/10 rounded-3xl flex items-center justify-center text-white backdrop-blur-sm border border-white/20 relative z-10 group-hover:rotate-6 transition-transform">
           <ICONS.Automation className="w-12 h-12" />
        </div>
      </div>
    </div>
  );
};

export default AutomationPage;
