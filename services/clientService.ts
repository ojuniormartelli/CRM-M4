
import { supabase } from '../lib/supabase';
import { mappers, isUUID } from '../lib/mappers';
import { M4Client } from '../types';

export const clientService = {
  async getAll(workspaceId?: string) {
    let query = supabase
      .from('m4_clients')
      .select('*');

    if (workspaceId && isUUID(workspaceId)) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
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
    // Check if client has transactions in new finance module
    const { count: finCount, error: finError } = await supabase
      .from('m4_fin_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('client_account_id', id);
    
    if (finError) throw finError;

    // Check if client has transactions in legacy module
    const { count: legacyCount, error: legacyError } = await supabase
      .from('m4_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('client_account_id', id);

    if (legacyError) throw legacyError;

    if ((finCount || 0) > 0 || (legacyCount || 0) > 0) {
      throw new Error('Não é possível excluir um cliente que possui lançamentos financeiros. Use a opção de arquivar (Ex-Cliente) em vez disso.');
    }

    const { error } = await supabase
      .from('m4_clients')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async archive(id: string) {
    // 1. Update client status to 'churned' (Ex-Cliente)
    const { error: updateError } = await supabase
      .from('m4_clients')
      .update({ status: 'churned' })
      .eq('id', id);
    
    if (updateError) throw updateError;

    // 2. Cancel associated client accounts
    const { error: accountError } = await supabase
      .from('m4_client_accounts')
      .update({ status: 'cancelado' })
      .eq('company_id', (await supabase.from('m4_clients').select('company_id').eq('id', id).single()).data?.company_id);
    
    // Note: We don't throw if no accounts found, but we log if error
    if (accountError) console.error('Error cancelling accounts:', accountError);

    // 3. Delete future/pending transactions
    const { error: deleteError } = await supabase
      .from('m4_fin_transactions')
      .delete()
      .eq('client_account_id', id)
      .eq('status', 'pending');

    if (deleteError) throw deleteError;

    // 4. Delete legacy pending transactions
    const { error: legacyDeleteError } = await supabase
      .from('m4_transactions')
      .delete()
      .eq('client_account_id', id)
      .in('status', ['Pendente', 'A Receber', 'A Pagar']);

    if (legacyDeleteError) throw legacyDeleteError;
  }
};
