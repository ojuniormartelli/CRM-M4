
import { supabase } from '../lib/supabase';
import { mappers, isUUID } from '../lib/mappers';
import { M4Client } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const workspaceId = localStorage.getItem('m4_crm_workspace_id');
  const userId = localStorage.getItem('m4_crm_user_id');

  let errorMessage = 'Erro desconhecido';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    errorMessage = (error as any).message || (error as any).details || JSON.stringify(error);
  }

  const errInfo = {
    error: errorMessage,
    authInfo: { userId: userId || 'unknown', workspaceId },
    operationType,
    path
  };
  
  console.error('Client Service Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const clientService = {
  async getAll(workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) return [];

    try {
      const { data, error } = await supabase
        .from('m4_clients')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as M4Client[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'm4_clients');
      return [];
    }
  },

  async create(client: Partial<M4Client>, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para criar cliente');
    const payload = mappers.client(client, workspaceId);

    try {
      const { data, error } = await supabase
        .from('m4_clients')
        .insert([payload])
        .select()
        .single();
      
      if (error) throw error;
      return data as M4Client;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'm4_clients');
      throw error;
    }
  },

  async update(id: string, client: Partial<M4Client>, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para atualizar cliente');
    const payload = mappers.client(client);

    try {
      const { data, error } = await supabase
        .from('m4_clients')
        .update(payload)
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();
      
      if (error) throw error;
      return data as M4Client;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_clients');
      throw error;
    }
  },

  async delete(id: string, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para excluir cliente');
    try {
      // 1. Verificações de integridade (financeiro)
      const [{ count: finCount }, { count: legacyCount }] = await Promise.all([
        supabase
          .from('m4_fin_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('client_account_id', id),
        supabase
          .from('m4_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('client_account_id', id)
      ]);

      if ((finCount || 0) > 0 || (legacyCount || 0) > 0) {
        throw new Error('Não é possível excluir um cliente que possui lançamentos financeiros. Use a opção de arquivar (Ex-Cliente) em vez disso.');
      }

      // 2. Physical Delete (since deleted_at column is missing)
      const { error } = await supabase
        .from('m4_clients')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId);
      
      if (error) throw error;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'm4_clients');
      throw error;
    }
  },

  async archive(id: string, workspaceId: string) {
    if (!workspaceId || !isUUID(workspaceId)) throw new Error('Workspace ID obrigatório para arquivar cliente');
    try {
      // 1. Get client company before archiving
      const { data: client, error: fetchError } = await supabase
        .from('m4_clients')
        .select('company_id')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single();
      
      if (fetchError) throw fetchError;
      if (!client) throw new Error('Cliente não encontrado');

      // 2. Update client status to 'churned'
      const { error: updateError } = await supabase
        .from('m4_clients')
        .update({ status: 'churned' })
        .eq('id', id)
        .eq('workspace_id', workspaceId);
      
      if (updateError) throw updateError;

      // 3. Cancel associated client accounts
      if (client.company_id) {
        await supabase
          .from('m4_client_accounts')
          .update({ status: 'cancelado' })
          .eq('company_id', client.company_id)
          .eq('workspace_id', workspaceId);
      }

      // 4. Delete future/pending transactions
      await supabase
        .from('m4_fin_transactions')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('client_account_id', id)
        .eq('status', 'pending');

      await supabase
        .from('m4_transactions')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('client_account_id', id)
        .in('status', ['Pendente', 'A Receber', 'A Pagar']);

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'm4_clients');
      throw error;
    }
  }
};

