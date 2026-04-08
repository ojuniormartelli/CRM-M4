
import { supabase } from '../lib/supabase';
import { mappers } from '../lib/mappers';
import { M4Client } from '../types';

export const clientService = {
  async getAll() {
    const { data, error } = await supabase
      .from('m4_clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as M4Client[];
  },

  async create(client: Partial<M4Client>, workspaceId: string) {
    const payload = mappers.client(client, workspaceId);
    const { data, error } = await supabase
      .from('m4_clients')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data as M4Client;
  },

  async update(id: string, client: Partial<M4Client>) {
    const payload = mappers.client(client);
    const { data, error } = await supabase
      .from('m4_clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as M4Client;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('m4_clients')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
