
import React, { useState, useEffect } from 'react';
import { Contact, Company, User } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { formatCNPJ, formatPhoneBR } from '../utils/formatters';

interface ContactsProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  currentUser: User | null;
  isModalOpen?: boolean;
  setIsModalOpen?: (isOpen: boolean) => void;
  renderOnlyModal?: boolean;
}

const Contacts: React.FC<ContactsProps> = ({ 
  contacts, 
  setContacts, 
  companies, 
  setCompanies, 
  currentUser,
  isModalOpen: externalIsModalOpen,
  setIsModalOpen: setExternalIsModalOpen,
  renderOnlyModal = false
}) => {
  const [internalIsModalOpen, setInternalIsModalOpen] = useState(false);
  const isModalOpen = externalIsModalOpen !== undefined ? externalIsModalOpen : internalIsModalOpen;
  const setIsModalOpen = setExternalIsModalOpen !== undefined ? setExternalIsModalOpen : setInternalIsModalOpen;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '', email: '', phone: '', role: '', whatsapp: '', instagram: '', linkedin: '', notes: '', is_primary: false, company_id: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '', cnpj: '', city: '', state: '', segment: '', phone: '', whatsapp: '', email: '', website: '', instagram: '', linkedin: '', notes: ''
  });

  // Contact selection states for New Company form
  const [contactMode, setContactMode] = useState<'select' | 'create'>('select');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [primaryContact, setPrimaryContact] = useState({
    name: '', email: '', phone: '', role: ''
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { data: companyData, error: companyError } = await supabase
      .from('m4_companies')
      .insert([{
        ...newCompany,
        ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
      }])
      .select();

    if (companyError) {
      alert("Erro ao salvar empresa: " + companyError.message);
    } else if (companyData) {
      const companyId = companyData[0].id;

      // Handle primary contact
      if (contactMode === 'create' && primaryContact.name) {
        await supabase
          .from('m4_contacts')
          .insert([{
            ...primaryContact,
            company_id: companyId,
            workspace_id: currentUser?.workspace_id,
            is_primary: true
          }]);
      } else if (contactMode === 'select' && selectedContactId) {
        await supabase
          .from('m4_contacts')
          .update({ company_id: companyId, is_primary: true })
          .eq('id', selectedContactId);
      }

      setNewContact({ ...newContact, company_id: companyData[0].id });
      setCompanies([...companies, companyData[0]]);
      setIsCompanyModalOpen(false);
      setNewCompany({ name: '', cnpj: '', city: '', state: '', segment: '', phone: '', whatsapp: '', email: '', website: '', instagram: '', linkedin: '', notes: '' });
      setPrimaryContact({ name: '', email: '', phone: '', role: '' });
      setSelectedContactId('');
      setContactSearch('');
      setContactMode('select');
    }
    setIsSaving(false);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const { data, error } = await supabase
      .from('m4_contacts')
      .insert([{
        ...newContact,
        ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
      }])
      .select('*, company:m4_companies(id, name, city, state)');

    if (error) {
      alert("Erro ao salvar contato: " + error.message);
    } else if (data) {
      setContacts([...contacts, data[0]]);
      setIsModalOpen(false);
      setNewContact({
        name: '', email: '', phone: '', role: '', whatsapp: '', instagram: '', linkedin: '', notes: '', is_primary: false, company_id: ''
      });
    }
    setIsSaving(false);
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setIsSaving(true);
    
    const { data, error } = await supabase
      .from('m4_contacts')
      .update(newContact)
      .eq('id', editingContact.id)
      .select('*, company:m4_companies(id, name, city, state)');

    if (error) {
      alert("Erro ao atualizar contato: " + error.message);
    } else if (data) {
      setContacts(contacts.map(c => c.id === editingContact.id ? data[0] : c));
      setIsEditModalOpen(false);
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setNewContact({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
      whatsapp: contact.whatsapp,
      instagram: contact.instagram,
      linkedin: contact.linkedin,
      notes: contact.notes,
      is_primary: contact.is_primary,
      company_id: contact.company_id
    });
    setIsEditing(false);
    setIsEditModalOpen(true);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCompanyName = (contact: Contact) => {
    return contact.company?.name || companies.find(c => c.id === contact.company_id)?.name || 'Empresa não vinculada';
  };

  if (renderOnlyModal) {
    return (
      <>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 pb-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Novo Contato</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Informações do Relacionamento</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                  <ICONS.X className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateContact} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                    <input required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Nome completo" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</label>
                    <input value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Diretor Comercial" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                    <input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                    <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
                    <button type="button" onClick={() => setIsCompanyModalOpen(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest">+ Nova Empresa</button>
                  </div>
                  <select value={newContact.company_id} onChange={e => setNewContact({...newContact, company_id: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white">
                    <option value="">Selecione uma empresa</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50 shadow-xl shadow-blue-100 dark:shadow-none">
                    {isSaving ? "SALVANDO..." : "SALVAR CONTATO"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isCompanyModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-10 pb-0 shrink-0">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Nova Empresa</h3>
                <button onClick={() => setIsCompanyModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                  <ICONS.Plus className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleCreateCompany} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome da Empresa</label>
                      <input required value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: M4 Marketing" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CNPJ</label>
                      <input value={newCompany.cnpj} onChange={e => setNewCompany({...newCompany, cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                      <input value={newCompany.city} onChange={e => setNewCompany({...newCompany, city: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: São Paulo" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                      <input value={newCompany.state} onChange={e => setNewCompany({...newCompany, state: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: SP" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Segmento / Nicho</label>
                      <input value={newCompany.segment} onChange={e => setNewCompany({...newCompany, segment: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Energia Solar" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Website</label>
                      <input value={newCompany.website} onChange={e => setNewCompany({...newCompany, website: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="https://..." />
                    </div>
                  </div>
                </div>
                <div className="p-10 pt-0 shrink-0 flex gap-4">
                  <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 dark:shadow-none disabled:opacity-50">
                    {isSaving ? 'SALVANDO...' : 'CADASTRAR EMPRESA'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">CONTATOS</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Gestão de Pessoas e Relacionamentos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-1"
        >
          <ICONS.Plus /> NOVO CONTATO
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none space-y-8 pb-10">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
          <ICONS.Search className="text-slate-400" width="20" height="20" />
          <input 
            type="text" 
            placeholder="Buscar por nome, e-mail ou cargo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:ring-0 w-full font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map(contact => (
            <div 
              key={contact.id}
              onClick={() => openEditModal(contact)}
              className="group bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl shadow-sm group-hover:shadow-md transition-all">
                  {contact.name.charAt(0)}
                </div>
                {contact.is_primary && (
                  <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    Principal
                  </div>
                )}
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{contact.name}</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1 uppercase tracking-widest">{contact.role || 'Contato'}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mb-6">{getCompanyName(contact)}</p>
              
              <div className="space-y-3 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <ICONS.Phone width="14" height="14" />
                  <span className="text-xs font-bold">{contact.phone ? formatPhoneBR(contact.phone) : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <ICONS.Mail width="14" height="14" />
                  <span className="text-xs font-bold">{contact.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Novo Contato</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: João Silva" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Empresa</label>
                    <div className="flex gap-2">
                      <select required value={newContact.company_id} onChange={e => setNewContact({...newContact, company_id: e.target.value})} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white">
                        <option value="">Selecionar Empresa</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => setIsCompanyModalOpen(true)}
                        className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all"
                        title="Nova Empresa"
                      >
                        <ICONS.Plus />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                    <input value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Diretor Comercial" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                    <input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="joao@empresa.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                    <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input value={newContact.whatsapp} onChange={e => setNewContact({...newContact, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
                    <input value={newContact.instagram} onChange={e => setNewContact({...newContact, instagram: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="@usuario" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn</label>
                    <input value={newContact.linkedin} onChange={e => setNewContact({...newContact, linkedin: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="linkedin.com/in/..." />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="is_primary"
                    checked={newContact.is_primary} 
                    onChange={e => setNewContact({...newContact, is_primary: e.target.checked})}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_primary" className="text-sm font-bold text-slate-700 dark:text-slate-300">Este é o contato principal da empresa</label>
                </div>
              </div>
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50">
                  {isSaving ? "SALVANDO..." : "SALVAR CONTATO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">
                {isEditing ? `EDITANDO: ${editingContact?.name}` : editingContact?.name}
              </h3>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-all"
                    title="Editar"
                  >
                    <ICONS.Edit className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => { 
                    if (isEditing) {
                      setIsEditing(false);
                      if (editingContact) {
                        setNewContact({
                          name: editingContact.name,
                          email: editingContact.email,
                          phone: editingContact.phone,
                          role: editingContact.role,
                          whatsapp: editingContact.whatsapp,
                          instagram: editingContact.instagram,
                          linkedin: editingContact.linkedin,
                          notes: editingContact.notes,
                          is_primary: editingContact.is_primary,
                          company_id: editingContact.company_id
                        });
                      }
                    } else {
                      setIsEditModalOpen(false); 
                      setEditingContact(null); 
                    }
                  }} 
                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <ICONS.Plus className="rotate-45" />
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdateContact} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                        <input required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: João Silva" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Empresa</label>
                        <select required value={newContact.company_id} onChange={e => setNewContact({...newContact, company_id: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white">
                          <option value="">Selecionar Empresa</option>
                          {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                        <input value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Diretor Comercial" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                        <input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="joao@empresa.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                        <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                        <input value={newContact.whatsapp} onChange={e => setNewContact({...newContact, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
                        <input value={newContact.instagram} onChange={e => setNewContact({...newContact, instagram: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="@usuario" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">LinkedIn</label>
                        <input value={newContact.linkedin} onChange={e => setNewContact({...newContact, linkedin: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="linkedin.com/in/..." />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <input 
                        type="checkbox" 
                        id="is_primary_edit"
                        checked={newContact.is_primary} 
                        onChange={e => setNewContact({...newContact, is_primary: e.target.checked})}
                        className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="is_primary_edit" className="text-sm font-bold text-slate-700 dark:text-slate-300">Este é o contato principal da empresa</label>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Notas</label>
                      <textarea value={newContact.notes} onChange={e => setNewContact({...newContact, notes: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white h-32" placeholder="Observações sobre o contato..." />
                    </div>
                  </>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-[2rem] flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-3xl">
                        {editingContact?.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white">{editingContact?.name}</h4>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">{editingContact?.role || 'Contato'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Empresa</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white truncate" title={editingContact ? getCompanyName(editingContact) : '–'}>{editingContact ? getCompanyName(editingContact) : '–'}</p>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">E-mail</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white truncate" title={editingContact?.email}>{editingContact?.email || '–'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Telefone</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{editingContact?.phone ? formatPhoneBR(editingContact.phone) : '–'}</p>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">WhatsApp</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{editingContact?.whatsapp ? formatPhoneBR(editingContact.whatsapp) : '–'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Instagram</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white truncate" title={editingContact?.instagram}>{editingContact?.instagram || '–'}</p>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">LinkedIn</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white truncate" title={editingContact?.linkedin}>{editingContact?.linkedin || '–'}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Notas</p>
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{editingContact?.notes || '–'}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                {isEditing ? (
                  <>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsEditing(false);
                        if (editingContact) {
                          setNewContact({
                            name: editingContact.name,
                            email: editingContact.email,
                            phone: editingContact.phone,
                            role: editingContact.role,
                            whatsapp: editingContact.whatsapp,
                            instagram: editingContact.instagram,
                            linkedin: editingContact.linkedin,
                            notes: editingContact.notes,
                            is_primary: editingContact.is_primary,
                            company_id: editingContact.company_id
                          });
                        }
                      }} 
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs"
                    >
                      Cancelar
                    </button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50 shadow-xl shadow-blue-100 dark:shadow-none">
                      {isSaving ? "SALVANDO..." : "SALVAR"}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingContact(null); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Fechar</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Nova Empresa</h3>
              <button onClick={() => setIsCompanyModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateCompany} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome da Empresa</label>
                  <input required value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: M4 Marketing" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">CNPJ</label>
                    <input value={newCompany.cnpj} onChange={e => setNewCompany({...newCompany, cnpj: formatCNPJ(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Segmento</label>
                    <input value={newCompany.segment} onChange={e => setNewCompany({...newCompany, segment: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Tecnologia" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                    <input value={newCompany.city} onChange={e => setNewCompany({...newCompany, city: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: São Paulo" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                    <input value={newCompany.state} onChange={e => setNewCompany({...newCompany, state: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: SP" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail da Empresa</label>
                    <input type="email" value={newCompany.email} onChange={e => setNewCompany({...newCompany, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="contato@empresa.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Instagram</label>
                    <input value={newCompany.instagram} onChange={e => setNewCompany({...newCompany, instagram: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="@perfil" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                    <input value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input value={newCompany.whatsapp} onChange={e => setNewCompany({...newCompany, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Contato Principal (Opcional)</p>
                    <button 
                      type="button"
                      onClick={() => setContactMode(contactMode === 'select' ? 'create' : 'select')}
                      className="text-[10px] font-black text-slate-400 dark:text-gray-300 hover:text-blue-600 uppercase tracking-widest flex items-center gap-2"
                    >
                      {contactMode === 'select' ? '+ Novo Contato' : 'Selecionar Existente'}
                    </button>
                  </div>

                  {contactMode === 'select' ? (
                    <div className="relative">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Buscar Contato</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            value={contactSearch} 
                            onChange={e => {
                              setContactSearch(e.target.value);
                              setShowContactDropdown(true);
                            }} 
                            onFocus={() => setShowContactDropdown(true)}
                            className="w-full p-4 bg-white dark:bg-slate-700 rounded-2xl border-none font-bold text-slate-900 dark:text-white dark:placeholder:text-slate-400" 
                            placeholder="Digite nome, e-mail ou telefone..." 
                          />
                          {showContactDropdown && contactSearch && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-[110] max-h-60 overflow-y-auto scrollbar-none">
                              {contacts.filter(c => 
                                c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                c.phone?.includes(contactSearch)
                              ).length > 0 ? (
                                contacts.filter(c => 
                                  c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                  c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                  c.phone?.includes(contactSearch)
                                ).map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedContactId(c.id);
                                      setContactSearch(c.name);
                                      setShowContactDropdown(false);
                                    }}
                                    className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between group"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{c.email} • {c.phone}</p>
                                    </div>
                                    {selectedContactId === c.id && <ICONS.Check className="text-blue-600" width="16" height="16" />}
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs font-bold">Nenhum contato encontrado</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Nome</label>
                          <input value={primaryContact.name} onChange={e => setPrimaryContact({...primaryContact, name: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white dark:placeholder:text-slate-400" placeholder="Nome do contato" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Cargo</label>
                          <input value={primaryContact.role} onChange={e => setPrimaryContact({...primaryContact, role: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white dark:placeholder:text-slate-400" placeholder="Ex: CEO" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">E-mail</label>
                          <input type="email" value={primaryContact.email} onChange={e => setPrimaryContact({...primaryContact, email: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white dark:placeholder:text-slate-400" placeholder="email@contato.com" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest ml-1">Telefone</label>
                          <input value={primaryContact.phone} onChange={e => setPrimaryContact({...primaryContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white dark:placeholder:text-slate-400" placeholder="(00) 00000-0000" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                    <input value={newCompany.city} onChange={e => setNewCompany({...newCompany, city: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: São Paulo" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                    <input value={newCompany.state} onChange={e => setNewCompany({...newCompany, state: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: SP" />
                  </div>
                </div>
              </div>
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50">
                  {isSaving ? "SALVANDO..." : "SALVAR EMPRESA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Contacts;
