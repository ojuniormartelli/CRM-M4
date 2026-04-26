
import { supabase } from '../lib/supabase';
import { isUUID } from '../lib/mappers';

export const crmService = {
  async getContacts(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    const { data, error } = await supabase
      .from('m4_contacts')
      .select('*, company:m4_companies(id, name)')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getProjects(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    const { data, error } = await supabase
      .from('m4_projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getEmails(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    const { data, error } = await supabase
      .from('m4_emails')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPosts(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    const { data, error } = await supabase
      .from('m4_posts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getCampaigns(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    const { data, error } = await supabase
      .from('m4_campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getServices(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    const { data, error } = await supabase
      .from('m4_services')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getPipelines(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];
    const { data: pData, error: pError } = await supabase
      .from('m4_pipelines')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position');
    
    if (pError) throw pError;

    const { data: sData, error: sError } = await supabase
      .from('m4_pipeline_stages')
      .select('*')
      .order('position');

    if (sError) throw sError;

    return (pData || []).map(p => ({
      ...p,
      stages: (sData || []).filter(s => s.pipeline_id === p.id)
    }));
  },

  async getSettings(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return null;
    const { data, error } = await supabase
      .from('m4_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
};
