import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Plus, 
  Trash2,
  Bookmark
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  job_role?: string;
  company_id?: string;
  workspace_id?: string;
}

interface ClientContactsTabProps {
  companyId: string | null;
  workspaceId: string;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ClientContactsTab: React.FC<ClientContactsTabProps> = ({
  companyId,
  workspaceId,
  contacts,
  setContacts,
  onShowToast,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states to add contact
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const linkedContacts = contacts.filter(c => c.company_id === companyId);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !companyId) return;

    setIsProcessing(true);
    try {
      const payload = {
        name: newContactName.trim(),
        email: newContactEmail.trim() || null,
        whatsapp: newContactPhone.trim() || null,
        job_role: newContactRole.trim() || null,
        company_id: companyId,
        workspace_id: workspaceId
      };

      const { data, error } = await supabase
        .from('m4_contacts')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setContacts(prev => [...prev, data]);
      onShowToast(`Sucesso! Ponto de contato "${payload.name}" cadastrado.`, 'success');

      // Reset
      setNewContactName('');
      setNewContactEmail('');
      setNewContactPhone('');
      setNewContactRole('');
      setShowAddForm(false);
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao cadastrar contato', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (!window.confirm(`Deseja remover o contato ${contactName}?`)) return;
    
    try {
      const { error } = await supabase
        .from('m4_contacts')
        .delete()
        .eq('id', contactId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      setContacts(prev => prev.filter(c => c.id !== contactId));
      onShowToast('Contato removido!', 'success');
    } catch (err: any) {
      onShowToast('Falha ao remover contato', 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Pontos de Contato Vinculados</h3>
          <p className="text-xs text-slate-500 mt-1">Pontos focais, tomadores de decisão e gestores de contas do lado do cliente.</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          {showAddForm ? 'Fechar' : 'Novo Contato'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddContact} className="p-5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-120 dark:border-slate-800 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Informações de contato</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Nome completo do contato focal..."
              value={newContactName}
              onChange={e => setNewContactName(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Cargo (Ex: Diretor de Marketing, CEO, CMO)..."
              value={newContactRole}
              onChange={e => setNewContactRole(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="E-mail corporativo..."
              value={newContactEmail}
              onChange={e => setNewContactEmail(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="WhatsApp ou Telefone com DDD..."
              value={newContactPhone}
              onChange={e => setNewContactPhone(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end mt-1">
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              {isProcessing ? 'Registrando...' : 'Cadastrar novo contato'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {linkedContacts.length === 0 ? (
          <div className="p-12 border border-dashed border-slate-100 dark:border-slate-850 rounded-2xl text-center text-slate-400">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span className="block text-sm font-bold text-slate-800 dark:text-white">Nenhum ponto focal associado</span>
            <span className="block text-xs mt-1">Cadastre as pessoas do lado do cliente para facilitar o contato operacional do squad.</span>
          </div>
        ) : (
          linkedContacts.map((c) => (
            <div key={c.id} className="p-5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-slate-200 dark:hover:border-slate-750 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center font-bold">
                  <UserIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <span className="text-sm font-black text-slate-900 dark:text-white block">{c.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest mt-0.5">{c.job_role || 'Facilitador / Ponto Focal'}</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 text-xs text-slate-500 pr-2">
                {c.email && (
                  <span className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                    {c.email}
                  </span>
                )}
                {c.whatsapp && (
                  <span className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                    {c.whatsapp}
                  </span>
                )}
                <button
                  onClick={() => handleDeleteContact(c.id, c.name)}
                  className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg dark:bg-slate-900 dark:hover:bg-rose-950/20 md:opacity-0 group-hover:opacity-100 transition-all cursor-pointer self-start md:self-center"
                  title="Apagar este contato"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
