import { supabase } from '../lib/supabase';
import { mappers } from '../lib/mappers';
import { Lead } from '../types';

export const leadService = {
  async getAll() {
    console.log('leadService.getAll() called');

    const { data, error } = await supabase
      .from('m4_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('leadService.getAll() error:', error);
      throw error;
    }

    console.log('leadService.getAll() success, leads count:', data?.length);
    return (data || []).map(mappers.leadFromDb);
  },

  async create(lead: Partial<Lead>, workspaceId: string) {
    const payload = mappers.lead(lead, workspaceId);

    const { data, error } = await supabase
      .from('m4_leads')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('leadService.create() error:', error, payload);
      throw error;
    }

    return mappers.leadFromDb(data);
  },

  async update(id: string, lead: Partial<Lead>) {
    const payload = mappers.lead(lead);

    const { data, error } = await supabase
      .from('m4_leads')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('leadService.update() error:', error, { id, payload });
      throw error;
    }

    return mappers.leadFromDb(data);
  },

  async updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('m4_leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('leadService.updateStatus() error:', error, { id, status });
      throw error;
    }

    return mappers.leadFromDb(data);
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('m4_leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('leadService.delete() error:', error, { id });
      throw error;
    }
  },
};