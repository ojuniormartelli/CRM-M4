import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import TechnicalPanel from './TechnicalPanel';
import AutomationPage from './Automation';
import { useTheme } from '../ThemeContext';
import { formatPhoneBR } from '../utils/formatters';
import { format } from 'date-fns';

import { ChevronDown } from 'lucide-react';
import { User, UserRole, JobRole, Service, FinanceCategory, PaymentMethod, Pipeline, FunnelStatus } from '../types';

interface SettingsProps {
  currentUser: User | null;
  onUserUpdate: (user: User) => void;
  settings: any;
  setSettings: (settings: any) => void;
  services: Service[];
  setServices: (services: Service[]) => void;
  fetchServices: () => Promise<void>;
  pipelines: Pipeline[];
  setPipelines: React.Dispatch<React.SetStateAction<Pipeline[]>>;
  activeTab: string;
  leads: any[];
  workspaceId: string;
}

const BackupTab = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const tables = [
    'm4_settings',
    'm4_job_roles',
    'm4_users',
    'm4_services',
    'm4_pipelines',
    'm4_stages',
    'm4_companies',
    'm4_contacts',
    'm4_leads',
    'm4_tasks',
    'm4_interactions',
    // New Finance Tables (m4_fin)
    'm4_fin_categories',
    'm4_fin_cost_centers',
    'm4_fin_bank_accounts',
    'm4_fin_transactions',
    'm4_fin_budgets',
    'm4_fin_payment_methods',
    // Legacy Finance Tables (for backup purposes)
    'm4_finance_categories',
    'm4_payment_methods',
    'm4_bank_accounts',
    'm4_credit_cards',
    'm4_client_accounts',
    'm4_transactions'
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setProgress('Iniciando exportação...');
    try {
      const backupData: any = {};
      for (const table of tables) {
        setProgress(`Exportando ${table}...`);
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        backupData[table] = data;
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = format(new Date(), 'dd_MM_yyyy');
      link.href = url;
      link.download = `backup_m4crm_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setProgress('Backup concluído com sucesso!');
    } catch (error: any) {
      alert('Erro ao exportar backup: ' + error.message);
      setProgress(null);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('ATENÇÃO: A restauração irá sobrescrever ou atualizar dados existentes com os mesmos IDs. Deseja continuar?')) return;

    setIsImporting(true);
    setProgress('Lendo arquivo de backup...');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target?.result as string);
          
          for (const table of tables) {
            if (backupData[table] && backupData[table].length > 0) {
              setProgress(`Restaurando ${table} (${backupData[table].length} registros)...`);
              const { error } = await supabase.from(table).upsert(backupData[table]);
              if (error) {
                console.error(`Erro ao restaurar ${table}:`, error);
                if (!window.confirm(`Erro ao restaurar ${table}: ${error.message}. Deseja continuar com as outras tabelas?`)) {
                  throw new Error('Importação interrompida pelo usuário.');
                }
              }
            }
          }

          setProgress('Restauração concluída com sucesso! Recarregando...');
          setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
          alert('Erro ao processar arquivo: ' + err.message);
          setIsImporting(false);
          setProgress(null);
        }
      };
      reader.readAsText(file);
    } catch (error: any) {
      alert('Erro ao importar backup: ' + error.message);
      setIsImporting(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Backup e Restauração</h3>
          <p className="text-xs text-slate-500 font-medium">Exporte todos os dados do seu CRM ou restaure de um arquivo anterior.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
              <ICONS.Download size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Exportar Dados</h4>
              <p className="text-xs text-slate-500 mt-1">Gere um arquivo JSON contendo todos os registros do sistema.</p>
            </div>
            <button 
              onClick={handleExport}
              disabled={isExporting || isImporting}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  EXPORTANDO...
                </>
              ) : (
                'GERAR BACKUP COMPLETO (.json)'
              )}
            </button>
          </div>

          <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center">
              <ICONS.Upload size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Restaurar Dados</h4>
              <p className="text-xs text-slate-500 mt-1">Importe dados de um arquivo JSON de backup anterior.</p>
            </div>
            <label className="block">
              <div className={`w-full py-4 bg-white dark:bg-slate-900 border-2 border-dashed ${isImporting ? 'border-emerald-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-all group`}>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImport}
                  disabled={isExporting || isImporting}
                  className="hidden" 
                />
                <span className="text-xs font-black text-slate-400 group-hover:text-emerald-600 uppercase tracking-widest">
                  {isImporting ? 'RESTAURANDO...' : 'RESTAURAR BACKUP (.json)'}
                </span>
              </div>
            </label>
          </div>
        </div>

        {progress && (
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-xs font-bold tracking-widest uppercase">{progress}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ 
  currentUser, 
  onUserUpdate, 
  settings,
  setSettings,
  services, 
  setServices, 
  fetchServices,
  pipelines,
  setPipelines,
  activeTab: parentActiveTab,
  leads,
  workspaceId
}) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'branding' | 'technical' | 'users' | 'roles' | 'profile' | 'services' | 'backup' | 'pipelines' | 'workspaces' | 'automation'>('branding');
  const [isSaving, setIsSaving] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [editingRole, setEditingRole] = useState<Partial<JobRole> | null>(null);
  const [editingPipeline, setEditingPipeline] = useState<Partial<Pipeline> | null>(null);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

    // Sync with parent active tab
    useEffect(() => {
      if (parentActiveTab === 'settings_profile') setActiveTab('profile');
      else if (parentActiveTab === 'settings_users') setActiveTab('users');
      else if (parentActiveTab === 'settings_workspaces') setActiveTab('workspaces');
      else if (parentActiveTab === 'settings_branding') setActiveTab('branding');
      else if (parentActiveTab === 'settings_services') setActiveTab('services');
      else if (parentActiveTab === 'settings_pipelines') setActiveTab('pipelines');
      else if (parentActiveTab === 'settings_automation') setActiveTab('automation');
      else if (parentActiveTab === 'settings_backup') setActiveTab('backup');
      else if (parentActiveTab === 'settings_technical') setActiveTab('technical');
      else if (parentActiveTab === 'settings') setActiveTab('branding');
  }, [parentActiveTab]);

  useEffect(() => {
    if (activeTab === 'services') {
      console.log('Aba SERVIÇOS aberta, buscando dados...');
      fetchServices().then(() => {
        console.log('Serviços carregados:', services);
      });
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      console.log('fetchData triggered. activeTab:', activeTab, 'currentUser:', currentUser);
      setLoading(true);
      try {
        if (activeTab === 'users' && (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.OWNER)) {
          const { data: usersData } = await supabase.from('m4_users').select('*, job_role:m4_job_roles(*)').order('name');
          if (usersData) setUsers(usersData);
          
          const { data: rolesData } = await supabase.from('m4_job_roles').select('*').order('level', { ascending: false });
          if (rolesData) setJobRoles(rolesData);
        }
        if (activeTab === 'roles') {
          console.log('Buscando cargos...');
          const { data: rolesData, error } = await supabase.from('m4_job_roles').select('*').order('level', { ascending: false });
          console.log('Cargos retornados:', rolesData, 'Erro:', error);
          if (rolesData) setJobRoles(rolesData);
        }
        if (activeTab === 'workspaces') {
          const { data: wsData } = await supabase.from('m4_workspaces').select('*');
          if (wsData) setWorkspaces(wsData);
        }
      } catch (err) {
        console.error('Error fetching settings data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('m4_users')
        .update({
          name: currentUser.name,
          avatar_url: currentUser.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) throw error;
      if (data) onUserUpdate(data);
      alert('Perfil atualizado com sucesso!');
    } catch (error: any) {
      alert('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !currentUser) return;
    
    // Map role based on job role level
    const selectedJobRole = jobRoles.find(r => r.id === editingUser.job_role_id);
    let mappedRole = UserRole.USER;
    if (selectedJobRole) {
      if (selectedJobRole.level >= 100) mappedRole = UserRole.OWNER;
      else if (selectedJobRole.level >= 50) mappedRole = UserRole.ADMIN;
    }
    
    // Permission check
    if (currentUser.role === UserRole.ADMIN && mappedRole === UserRole.OWNER) {
      alert('Admins não podem criar ou editar Owners.');
      return;
    }

    setIsSaving(true);
    try {
      const userData = { ...editingUser, role: mappedRole };
      
      // If it's a new user, we need to set the internal email
      if (!userData.username && !userData.id) {
          alert('Username é obrigatório para novos usuários.');
          return;
      }

      if (!userData.id && userData.username) {
        userData.email = `${userData.username}@crm.com`;
      }

      // Remove job_role object if it exists before saving
      const { job_role, ...payload } = userData as any;

      if (payload.id) {
        // Edit existing user - password changes are handled via handleResetPassword for security
        const { password, ...updatePayload } = payload;
        const { error } = await supabase
          .from('m4_users')
          .update(updatePayload)
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        // Create new user in Supabase Auth
        if (!userData.password || userData.password.length < 6) {
          throw new Error('A senha inicial deve ter pelo menos 6 caracteres.');
        }

        // 1. Sign Up the user to create the auth account
        // Note: In some environments this might sign out the admin.
        // We add must_change_password: true to the profile
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
              data: {
                full_name: userData.name,
                workspace_id: currentUser.workspace_id
              }
            }
        });

        if (authError) throw authError;

        if (authData.user) {
          // 2. The trigger handles initial m4_users creation, but we update extra fields
          // and ensure must_change_password is TRUE for admin-created users
          const { error: profileError } = await supabase
            .from('m4_users')
            .update({ 
               job_role_id: userData.job_role_id,
               username: userData.username,
               role: mappedRole,
               must_change_password: true,
               status: 'active',
               workspace_id: currentUser.workspace_id
            })
            .eq('id', authData.user.id);
          
          if (profileError) console.error('Error updating user profile:', profileError);
        }
      }
      
      const { data } = await supabase.from('m4_users').select('*, job_role:m4_job_roles(*)').order('name');
      if (data) setUsers(data);
      setIsUserModalOpen(false);
      setEditingUser(null);
      alert('Usuário salvo com sucesso! O primeiro acesso deve ser feito com a senha definida.');
    } catch (error: any) {
      alert('Erro ao salvar usuário: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete || !currentUser) return;

    if (userId === currentUser.id) {
      alert('Você não pode excluir seu próprio usuário.');
      return;
    }

    if (userToDelete.role === UserRole.OWNER) {
      const owners = users.filter(u => u.role === UserRole.OWNER);
      if (owners.length <= 1) {
        alert('Não é possível excluir o último Owner do sistema.');
        return;
      }
      if (currentUser.role !== UserRole.OWNER) {
        alert('Apenas Owners podem excluir outros Owners.');
        return;
      }
    }

    if (currentUser.role === UserRole.ADMIN && userToDelete.role !== UserRole.USER) {
      alert('Admins só podem excluir usuários comuns.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${userToDelete.name}? Esta ação não pode ser desfeita.`)) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('m4_users').delete().eq('id', userId);
      if (error) throw error;
      
      setUsers(users.filter(u => u.id !== userId));
      alert('Usuário excluído com sucesso!');
    } catch (error: any) {
      alert('Erro ao excluir usuário: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveService = async () => {
    if (!editingService?.name) return;
    console.log('Dados do novo serviço:', editingService);
    console.log('workspace_id usado:', currentUser?.workspace_id);
    
    setIsSaving(true);
    try {
      if (editingService.id) {
        const { error } = await supabase
          .from('m4_services')
          .update({ name: editingService.name, default_price: editingService.default_price })
          .eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('m4_services')
          .insert([{ 
            name: editingService.name, 
            default_price: editingService.default_price,
            workspace_id: currentUser?.workspace_id || null
          }]);
        if (error) throw error;
      }
      
      console.log('Serviço salvo com sucesso, recarregando lista...');
      await fetchServices();
      setIsServiceModalOpen(false);
      setEditingService(null);
    } catch (err: any) {
      console.error('Erro ao salvar serviço:', err);
      alert('Erro ao salvar serviço: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !currentUser) return;
    setIsSaving(true);
    try {
      if (editingRole.id) {
        const { error } = await supabase
          .from('m4_job_roles')
          .update(editingRole)
          .eq('id', editingRole.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('m4_job_roles')
          .insert([{ 
            ...editingRole,
            workspace_id: currentUser.workspace_id 
          }]);
        if (error) throw error;
      }
      
      const { data } = await supabase.from('m4_job_roles').select('*').order('level', { ascending: false });
      if (data) setJobRoles(data);
      setIsRoleModalOpen(false);
      setEditingRole(null);
      alert('Cargo salvo com sucesso!');
    } catch (error: any) {
      alert('Erro ao salvar cargo: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cargo?')) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('m4_job_roles').delete().eq('id', roleId);
      if (error) throw error;
      setJobRoles(jobRoles.filter(r => r.id !== roleId));
      alert('Cargo excluído com sucesso!');
    } catch (error: any) {
      alert('Erro ao excluir cargo: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPipeline || !editingPipeline.name) return;
    setIsSaving(true);
    try {
      const workspaceId = currentUser?.workspace_id || localStorage.getItem('m4_crm_workspace_id');
      if (!workspaceId) throw new Error("Workspace não identificado");

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
        if (!data) throw new Error("Erro ao criar funil");
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

        // 2. Separate updates and inserts
        const stagesToUpsert = processedStages.filter(s => s.id);
        const stagesToInsert = processedStages.filter(s => !s.id);

        if (stagesToUpsert.length > 0) {
          const { error: uError } = await supabase
            .from('m4_pipeline_stages')
            .upsert(stagesToUpsert);
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
      }

      setIsPipelineModalOpen(false);
      setEditingPipeline(null);
      alert('Funil salvo com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar pipeline:', error);
      alert('Erro ao salvar pipeline: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReorderPipeline = async (pipelineId: string, direction: 'up' | 'down') => {
    const idx = pipelines.findIndex(p => p.id === pipelineId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === pipelines.length - 1) return;

    const newPipelines = [...pipelines];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newPipelines[idx], newPipelines[targetIdx]] = [newPipelines[targetIdx], newPipelines[idx]];

    // Update positions in DB
    const updates = newPipelines.map((p, i) => ({
      id: p.id,
      name: p.name,
      workspace_id: p.workspace_id,
      position: i
    }));

    setPipelines(newPipelines);

    const { error } = await supabase.from('m4_pipelines').upsert(updates);
    if (error) alert('Erro ao reordenar pipelines: ' + error.message);
  };

  const handleResetPassword = async (userEmail: string) => {
    if (!userEmail) return;
    if (!window.confirm(`Enviar e-mail de recuperação de senha para ${userEmail}?`)) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: window.location.origin
      });

      if (error) throw error;
      alert('E-mail de recuperação enviado com sucesso!');
    } catch (error: any) {
      alert('Erro ao enviar e-mail: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const [passwordChange, setPasswordChange] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    if (passwordChange.new !== passwordChange.confirm) {
      alert('As senhas não coincidem!');
      return;
    }

    if (passwordChange.new.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordChange.new
      });

      if (error) throw error;

      alert('Senha alterada com sucesso via Supabase Auth!');
      setPasswordChange({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      alert('Erro ao alterar senha: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log('Attempting to save settings to Supabase...', settings);
      
      const payload = { 
        crm_name: settings.crm_name,
        company_name: settings.company_name,
        theme: settings.theme,
        primary_color: settings.primary_color,
        logo_url: settings.logo_url,
        city: settings.city,
        state: settings.state,
        cnpj: settings.cnpj,
        email: settings.email,
        website: settings.website,
        phone: settings.phone,
        zip_code: settings.zip_code,
        address: settings.address,
        address_number: settings.address_number,
        complement: settings.complement,
        neighborhood: settings.neighborhood,
        language: settings.language,
        workspace_id: currentUser?.workspace_id || settings.workspace_id || localStorage.getItem('m4_crm_workspace_id'),
        updated_at: new Date().toISOString() 
      };

      const { data, error } = await supabase
        .from('m4_settings')
        .upsert(payload, { onConflict: 'workspace_id' })
        .select()
        .single();

      if (error) {
        console.error('Supabase Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(error.message || 'Erro desconhecido no Supabase');
      }
      
      console.log('Settings saved successfully:', data);
      if (data) setSettings(data);
      
      // Apply theme immediately via context
      // We pass skipPersistence=true because we already saved the theme in the upsert above
      await setTheme((settings?.theme || 'light') as any, true);
      
      alert('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Full error during save:', error);
      
      let errorMessage = 'Erro ao salvar: ';
      if (error.message === 'Failed to fetch') {
        errorMessage += 'Falha na conexão com o Supabase. Verifique se a URL e a chave estão corretas no ambiente.';
      } else {
        errorMessage += error.message || 'Erro inesperado.';
      }
      
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, you'd upload to Supabase Storage
    // For now, we'll use a local URL or placeholder
    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings({ ...settings, logo_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-slate-200">
            <ICONS.Settings />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Configurações do CRM</h2>
            <p className="text-slate-500 font-medium">Personalize a identidade e o comportamento do seu workspace.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-100 transition-all disabled:opacity-50"
        >
          {isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
        </button>
      </div>


      {activeTab === 'services' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Catálogo de Serviços</h3>
              <p className="text-xs text-slate-500 font-medium">Gerencie os serviços e produtos oferecidos pela sua empresa.</p>
            </div>
            <button 
              onClick={() => {
                setEditingService({ name: '', default_price: 0 });
                setIsServiceModalOpen(true);
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <ICONS.Plus size={14} />
              NOVO SERVIÇO
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-800/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Serviço</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Padrão</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {services.map(service => (
                  <tr key={service.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{service.name}</p>
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.default_price)}
                      </p>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => {
                            setEditingService(service);
                            setIsServiceModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                        >
                          <ICONS.Edit size={14} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
                              const { error } = await supabase.from('m4_services').delete().eq('id', service.id);
                              if (!error) {
                                setServices(services.filter(s => s.id !== service.id));
                              }
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        >
                          <ICONS.Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-8 py-10 text-center text-slate-500 font-medium">
                      Nenhum serviço cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {isServiceModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-zoom-in-95">
                <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">
                    {editingService?.id ? 'EDITAR SERVIÇO' : 'NOVO SERVIÇO'}
                  </h3>
                  <button 
                    onClick={() => setIsServiceModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <ICONS.X size={20} className="text-slate-400" />
                  </button>
                </div>
                
                <div className="p-10 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Serviço</label>
                    <input
                      type="text"
                      value={editingService?.name || ''}
                      onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                      placeholder="Ex: Gestão de Tráfego"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Padrão (Sugestão)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        value={editingService?.default_price === 0 ? '' : (editingService?.default_price ?? '')}
                        onChange={(e) => setEditingService({ ...editingService, default_price: parseFloat(e.target.value) || 0 })}
                        className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-10 py-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setIsServiceModalOpen(false)}
                    className="px-6 py-3 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={handleSaveService}
                    disabled={isSaving}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'SALVANDO...' : 'SALVAR SERVIÇO'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'branding' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Identidade do Sistema (Branding)</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do CRM / Sistema</label>
                  <input 
                    type="text" 
                    value={settings?.crm_name || ''} 
                    onChange={e => setSettings({...settings, crm_name: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200" 
                    placeholder="Ex: Agency X CRM"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Logo do Workspace</label>
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                      {settings?.logo_url ? (
                        <img src={settings.logo_url} alt="Logo Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ICONS.Plus className="text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload}
                        className="hidden" 
                        id="logo-upload" 
                      />
                      <label 
                        htmlFor="logo-upload"
                        className="inline-block px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-700 transition-all border border-transparent dark:border-slate-700"
                      >
                        Upload Novo Logo
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium">Recomendado: PNG ou SVG transparente, 512x512px.</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Cor de Destaque (Primária)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={settings?.primary_color || '#2563eb'} 
                      onChange={e => setSettings({...settings, primary_color: e.target.value})}
                      className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent" 
                    />
                    <input 
                      type="text" 
                      value={settings?.primary_color || '#2563eb'} 
                      onChange={e => setSettings({...settings, primary_color: e.target.value})}
                      className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200 uppercase" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white space-y-8 relative overflow-hidden flex flex-col justify-center">
              <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <h3 className="text-lg font-black text-white/40 uppercase tracking-widest relative z-10">Preview Visual</h3>
              <div className="space-y-6 relative z-10">
                <div className="p-6 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center overflow-hidden">
                      {settings?.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-black text-lg">M4</span>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-sm leading-none">{settings?.crm_name || 'Sistema'}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase mt-1">{settings?.company_name || 'Agência'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 font-medium italic text-center">Aplicação da cor primária:</p>
                  <button 
                    style={{ backgroundColor: settings?.primary_color || '#2563eb' }}
                    className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 text-white"
                  >
                    Botão de Ação
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Informações de Contato</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Razão Social / Nome Fantasia</label>
                  <input 
                    type="text" 
                    value={settings?.company_name ?? ''} 
                    onChange={e => setSettings({...settings, company_name: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cidade</label>
                    <input 
                      type="text" 
                      value={settings?.city ?? ''} 
                      onChange={e => setSettings({...settings, city: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado</label>
                    <input 
                      type="text" 
                      value={settings?.state ?? ''} 
                      onChange={e => setSettings({...settings, state: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Website</label>
                  <input 
                    type="url" 
                    value={settings?.website ?? ''} 
                    onChange={e => setSettings({...settings, website: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200" 
                    placeholder="https://suaempresa.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp de Contato</label>
                  <input 
                    type="text" 
                    value={settings?.phone ?? ''} 
                    onChange={e => setSettings({...settings, phone: formatPhoneBR(e.target.value)})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200" 
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Painel de Preferências</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tema de Interface</label>
                  <div className="grid grid-cols-3 gap-4">
                    <button 
                      onClick={() => setSettings({...settings, theme: 'light'})}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${settings?.theme === 'light' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                    >
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
                        <ICONS.Dashboard size={18} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">CLARO</span>
                    </button>
                    <button 
                      onClick={() => setSettings({...settings, theme: 'dark'})}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${settings?.theme === 'dark' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                    >
                      <div className="w-10 h-10 bg-slate-900 rounded-xl shadow-sm border border-slate-800 flex items-center justify-center text-blue-400">
                        <ICONS.Automation size={18} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">ESCURO</span>
                    </button>
                    <button 
                      onClick={() => setSettings({...settings, theme: 'system'})}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${settings?.theme === 'system' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                    >
                      <div className="w-10 h-10 bg-slate-500 rounded-xl shadow-sm border border-slate-400 flex items-center justify-center text-white">
                        <ICONS.Settings size={18} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">SISTEMA</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Idioma Localização</label>
                  <select 
                    value={settings?.language || 'pt-BR'} 
                    onChange={e => setSettings({...settings, language: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'technical' && <TechnicalPanel />}

      {activeTab === 'automation' && <AutomationPage leads={leads} currentUser={currentUser} workspaceId={workspaceId} />}

      {activeTab === 'workspaces' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Meus Workspaces</h3>
              <p className="text-xs text-slate-500 font-medium">Gerencie os espaços de trabalho da sua organização.</p>
            </div>
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2">
              <ICONS.Plus size={14} />
              NOVO WORKSPACE
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workspaces.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                  <ICONS.Dashboard size={32} />
                </div>
                <p className="text-slate-500 font-medium">Nenhum workspace registrado. Operando no workspace atual.</p>
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 inline-block">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workspace ID Resolvido (Supabase):</p>
                  <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 mt-1">{currentUser?.workspace_id || 'Não resolvido'}</p>
                </div>
              </div>
            ) : (
              workspaces.map(ws => (
                <div key={ws.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg" style={{ backgroundColor: ws.color || '#2563eb' }}>
                      {ws.icon || ws.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">{ws.name}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workspace ID: {ws.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                      CONFIGURAR
                    </button>
                    <button className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">
                      <ICONS.X width="16" height="16" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {(activeTab === 'users' || activeTab === 'roles') && (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.OWNER) && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Usuários
            </button>
            <button 
              onClick={() => setActiveTab('roles')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'roles' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Cargos e Permissões
            </button>
          </div>
          {activeTab === 'users' ? (
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Gestão de Equipe</h3>
                <p className="text-xs text-slate-500 font-medium">Gerencie os usuários e permissões do seu workspace.</p>
              </div>
              <button 
                onClick={() => {
                  setEditingUser({ role: UserRole.USER });
                  setIsUserModalOpen(true);
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <ICONS.Plus size={14} />
                NOVO USUÁRIO
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Cargos e Permissões</h3>
                <p className="text-xs text-slate-500 font-medium">Defina os níveis de acesso e responsabilidades da equipe.</p>
              </div>
              <button 
                onClick={() => {
                  setEditingRole({ level: 1, permissions: {} });
                  setIsRoleModalOpen(true);
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <ICONS.Plus size={14} />
                NOVO CARGO
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-800/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Permissão</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {users.map(user => (
                  <tr key={user.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold overflow-hidden">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                          <p className="text-[10px] font-medium text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{user.username || user.email.split('@')[0]}</p>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        user.role === UserRole.OWNER ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        user.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{user.job_role?.name || '—'}</p>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${user.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => {
                            setEditingUser({
                              ...user,
                              username: user.username || user.email.split('@')[0],
                              job_role_id: user.job_role_id || user.job_role?.id || ''
                            });
                            setIsUserModalOpen(true);
                          }}
                          title="Editar"
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                        >
                          <ICONS.Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleResetPassword(user.email)}
                          title="Resetar Senha"
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                        >
                          <ICONS.Lock size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          title="Excluir"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        >
                          <ICONS.Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Cargos da Equipe</h3>
              <p className="text-xs text-slate-500 font-medium">Defina os cargos que podem ser atribuídos aos usuários.</p>
            </div>
            <button 
              onClick={() => {
                setEditingRole({});
                setIsRoleModalOpen(true);
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <ICONS.Plus size={14} />
              NOVO CARGO
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-800/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Cargo</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Criado em</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {jobRoles.map(role => (
                  <tr key={role.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{role.name}</p>
                    </td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-black">
                        {role.level}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-xs font-medium text-slate-500">{new Date(role.created_at).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => {
                            setEditingRole(role);
                            setIsRoleModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                        >
                          <ICONS.Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        >
                          <ICONS.Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'profile' && currentUser && (
        <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-10">
            <div className="flex items-center gap-8">
              <div className="relative group">
                <div className="w-24 h-24 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white text-2xl font-black overflow-hidden shadow-2xl shadow-indigo-200 dark:shadow-none">
                  {currentUser.avatar_url ? (
                    <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                  <ICONS.Camera size={18} className="text-slate-600 dark:text-slate-300" />
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          onUserUpdate({ ...currentUser, avatar_url: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{currentUser.name}</h3>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">{currentUser.role}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    value={currentUser.name ?? ''}
                    onChange={e => onUserUpdate({ ...currentUser, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Usuário</label>
                  <input 
                    type="text" 
                    value={currentUser.username || currentUser.email.split('@')[0]}
                    readOnly
                    className="w-full p-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-none font-bold outline-none text-slate-400 cursor-not-allowed" 
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50"
                >
                  {isSaving ? 'SALVANDO...' : 'ATUALIZAR PERFIL'}
                </button>
              </div>
            </form>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />

            <form onSubmit={handleChangePassword} className="space-y-6">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Alterar Senha</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nova Senha</label>
                    <div className="relative">
                      <input 
                        type={showPasswords.new ? "text" : "password"} 
                        required
                        value={passwordChange.new}
                        onChange={e => setPasswordChange({ ...passwordChange, new: e.target.value })}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 pr-12" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {showPasswords.new ? <ICONS.EyeOff size={18} /> : <ICONS.Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Confirmar Nova Senha</label>
                    <div className="relative">
                      <input 
                        type={showPasswords.confirm ? "text" : "password"} 
                        required
                        value={passwordChange.confirm}
                        onChange={e => setPasswordChange({ ...passwordChange, confirm: e.target.value })}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 pr-12" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {showPasswords.confirm ? <ICONS.EyeOff size={18} /> : <ICONS.Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {isSaving ? 'ALTERANDO...' : 'ALTERAR SENHA'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'pipelines' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Funis de Vendas</h3>
              <p className="text-xs text-slate-500 font-medium">Configure seus pipelines e as etapas do funil.</p>
            </div>
            <button 
              onClick={() => {
                setEditingPipeline({ name: '', stages: [{ id: Math.random().toString(), name: 'Novo Lead', status: FunnelStatus.INITIAL }] });
                setIsPipelineModalOpen(true);
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-2"
            >
              <ICONS.Plus size={18} /> NOVO FUNIL
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pipelines.map(pipeline => (
              <div key={pipeline.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                      <ICONS.Target size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{pipeline.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pipeline.stages?.length || 0} etapas configuradas</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => handleReorderPipeline(pipeline.id, 'up')}
                        disabled={pipelines.indexOf(pipeline) === 0}
                        className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                        title="Mover para cima"
                      >
                        <ChevronDown className="rotate-180" size={14} />
                      </button>
                      <button 
                        onClick={() => handleReorderPipeline(pipeline.id, 'down')}
                        disabled={pipelines.indexOf(pipeline) === pipelines.length - 1}
                        className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingPipeline(pipeline);
                        setIsPipelineModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                    >
                      <ICONS.Edit size={18} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm('Deseja realmente excluir este funil? Todos os leads vinculados perderão a referência.')) {
                          const { error } = await supabase.from('m4_pipelines').delete().eq('id', pipeline.id);
                          if (error) alert('Erro ao excluir: ' + error.message);
                          else setPipelines(prev => prev.filter(p => p.id !== pipeline.id));
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    >
                      <ICONS.Trash size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {pipeline.stages?.sort((a, b) => (a.position || 0) - (b.position || 0)).map((stage, idx) => (
                    <div key={stage.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-transparent group-hover:border-slate-100 dark:group-hover:border-slate-700 transition-all">
                      <div className="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-400 border border-slate-100 dark:border-slate-700">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex-1">{stage.name}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                        stage.status === FunnelStatus.INITIAL ? 'bg-blue-100 text-blue-600' :
                        stage.status === FunnelStatus.WON ? 'bg-emerald-100 text-emerald-600' :
                        stage.status === FunnelStatus.LOST ? 'bg-rose-100 text-rose-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {stage.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'backup' && currentUser?.role === UserRole.OWNER && (
        <BackupTab />
      )}

      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-zoom-in-95">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                {editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <ICONS.X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={editingUser.name || ''}
                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Username</label>
                  <input 
                    type="text" 
                    required
                    value={editingUser.username || ''}
                    onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                    placeholder="ex: joao.silva"
                    disabled={!!editingUser.id}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cargo</label>
                  <select 
                    value={editingUser.job_role_id || ''}
                    onChange={e => setEditingUser({ ...editingUser, job_role_id: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Selecione um cargo...</option>
                    {jobRoles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                {!editingUser.id && (
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Senha Inicial</label>
                    <div className="relative">
                      <input 
                        type={showPasswords['new_user'] ? "text" : "password"} 
                        required
                        value={editingUser.password || ''}
                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                        placeholder="Ex: M4@2024"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, 'new_user': !prev['new_user'] }))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPasswords['new_user'] ? <ICONS.EyeOff size={18} /> : <ICONS.Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 font-medium">O usuário será obrigado a alterar esta senha no primeiro acesso.</p>
                  </div>
                )}
                <div className={editingUser.id ? "col-span-2" : ""}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select 
                    value={editingUser.status ?? 'active'}
                    onChange={e => setEditingUser({ ...editingUser, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50"
                >
                  {isSaving ? 'SALVANDO...' : (editingUser.id ? 'SALVAR' : 'CRIAR USUÁRIO')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPipelineModalOpen && editingPipeline && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-zoom-in-95">
            <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">
                {editingPipeline.id ? 'EDITAR FUNIL' : 'NOVO FUNIL'}
              </h3>
              <button onClick={() => setIsPipelineModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <ICONS.X size={24} />
              </button>
            </div>
            <form onSubmit={handleSavePipeline} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Funil</label>
                <input 
                  type="text" 
                  required
                  value={editingPipeline.name || ''}
                  onChange={e => setEditingPipeline({ ...editingPipeline, name: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                  placeholder="Ex: Funil de Vendas Principal"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapas do Funil</label>
                  <button 
                    type="button"
                    onClick={() => {
                      const newStage = { id: Math.random().toString(), name: '', status: FunnelStatus.INTERMEDIATE };
                      setEditingPipeline({
                        ...editingPipeline,
                        stages: [...(editingPipeline.stages || []), newStage]
                      });
                    }}
                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-700"
                  >
                    <ICONS.Plus size={14} /> ADICIONAR ETAPA
                  </button>
                </div>

                <div className="space-y-3">
                  {editingPipeline.stages?.map((stage, idx) => (
                    <div key={stage.id} className="flex gap-3 items-start p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl text-xs font-black text-slate-400 border border-slate-100 dark:border-slate-800 mt-2">
                        {idx + 1}
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        <button 
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const newStages = [...(editingPipeline.stages || [])];
                            [newStages[idx - 1], newStages[idx]] = [newStages[idx], newStages[idx - 1]];
                            setEditingPipeline({ ...editingPipeline, stages: newStages });
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                        >
                          <ChevronDown className="rotate-180" size={14} />
                        </button>
                        <button 
                          type="button"
                          disabled={idx === (editingPipeline.stages?.length || 0) - 1}
                          onClick={() => {
                            const newStages = [...(editingPipeline.stages || [])];
                            [newStages[idx + 1], newStages[idx]] = [newStages[idx], newStages[idx + 1]];
                            setEditingPipeline({ ...editingPipeline, stages: newStages });
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                      <div className="flex-1 space-y-3">
                        <input 
                          type="text" 
                          required
                          value={stage.name}
                          onChange={e => {
                            const newStages = [...(editingPipeline.stages || [])];
                            newStages[idx] = { ...stage, name: e.target.value };
                            setEditingPipeline({ ...editingPipeline, stages: newStages });
                          }}
                          className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 text-sm"
                          placeholder="Nome da etapa"
                        />
                        <div className="flex gap-2">
                          {Object.values(FunnelStatus).map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => {
                                const newStages = [...(editingPipeline.stages || [])];
                                newStages[idx] = { ...stage, status };
                                setEditingPipeline({ ...editingPipeline, stages: newStages });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                stage.status === status 
                                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
                                  : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 border border-slate-100 dark:border-slate-800'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const newStages = editingPipeline.stages?.filter((_, i) => i !== idx);
                          setEditingPipeline({ ...editingPipeline, stages: newStages });
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all mt-2"
                      >
                        <ICONS.Trash size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsPipelineModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50"
                >
                  {isSaving ? 'SALVANDO...' : (editingPipeline.id ? 'SALVAR ALTERAÇÕES' : 'CRIAR FUNIL')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRoleModalOpen && editingRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-zoom-in-95">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                {editingRole.id ? 'Editar Cargo' : 'Novo Cargo'}
              </h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <ICONS.X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveRole} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Cargo</label>
                  <input 
                    type="text" 
                    required
                    value={editingRole.name || ''}
                    onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                    placeholder="ex: Gestor de Tráfego"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nível de Permissão</label>
                  <select 
                    required
                    value={editingRole.level || 10}
                    onChange={e => setEditingRole({ ...editingRole, level: parseInt(e.target.value) })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
                  >
                    <option value={100}>Owner (100)</option>
                    <option value={50}>Administrador (50)</option>
                    <option value={40}>Coordenador (40)</option>
                    <option value={30}>Supervisor (30)</option>
                    <option value={10}>Usuário (10)</option>
                  </select>
                  <p className="text-[9px] text-slate-400 mt-1 font-medium italic">Define as permissões automáticas do cargo.</p>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50"
                >
                  {isSaving ? 'SALVANDO...' : (editingRole.id ? 'SALVAR' : 'CRIAR CARGO')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;