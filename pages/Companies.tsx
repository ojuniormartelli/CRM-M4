
import React, { useState, useEffect } from 'react';
import { Company, Contact, User, Task, TaskStatus, Priority } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { formatCNPJ, formatPhoneBR } from '../utils/formatters';

interface CompaniesProps {
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  currentUser: User | null;
}

const Companies: React.FC<CompaniesProps> = ({ companies, setCompanies, contacts, setContacts, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '', cnpj: '', city: '', state: '', segment: '', website: '', instagram: '', phone: '', whatsapp: '', notes: ''
  });
  
  // Tasks state
  const [companyTasks, setCompanyTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'tasks'>('details');
  
  // Contact selection states
  const [contactMode, setContactMode] = useState<'select' | 'create'>('select');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);

  const [primaryContact, setPrimaryContact] = useState({
    name: '', email: '', phone: '', role: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isContactEditModalOpen, setIsContactEditModalOpen] = useState(false);
  const [isContactNewModalOpen, setIsContactNewModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContactData, setNewContactData] = useState<Partial<Contact>>({
    name: '', email: '', phone: '', role: '', whatsapp: '', instagram: '', linkedin: '', notes: '', is_primary: false, company_id: ''
  });

  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies();
    }
  }, [companies.length]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('m4_companies')
        .select('*')
        .order('name');

      if (error) {
        console.error('Erro ao carregar empresas:', error);
        return;
      }

      if (data) {
        setCompanies(data);
      }
    } catch (err) {
      console.error('Erro inesperado ao carregar empresas:', err);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { data, error } = await supabase
      .from('m4_contacts')
      .insert([{
        ...newContactData,
        ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
      }])
      .select('*, company:m4_companies(id, name, city, state)');

    if (error) {
      alert("Erro ao salvar contato: " + error.message);
    } else if (data) {
      setContacts([...contacts, data[0]]);
      setIsContactNewModalOpen(false);
      setNewContactData({
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
      .update(newContactData)
      .eq('id', editingContact.id)
      .select('*, company:m4_companies(id, name, city, state)');

    if (error) {
      alert("Erro ao atualizar contato: " + error.message);
    } else if (data) {
      setContacts(contacts.map(c => c.id === editingContact.id ? data[0] : c));
      setIsContactEditModalOpen(false);
    }
    setIsSaving(false);
  };

  const openEditContactModal = (contact: Contact) => {
    setEditingContact(contact);
    setNewContactData({
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
    setIsContactEditModalOpen(true);
  };

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
      
      if (contactMode === 'create' && primaryContact.name) {
        const { data: contactData, error: contactError } = await supabase
          .from('m4_contacts')
          .insert([{
            ...primaryContact,
            company_id: companyId,
            is_primary: true,
            ...(currentUser?.workspace_id ? { workspace_id: currentUser.workspace_id } : {})
          }])
          .select();
        
        if (contactError) {
          alert("Empresa salva, mas erro ao criar contato: " + contactError.message);
        } else if (contactData) {
          setContacts([...contacts, contactData[0]]);
        }
      } else if (contactMode === 'select' && selectedContactId) {
        // Garantir que outros contatos desta empresa não sejam primários (caso o contato selecionado já pertencesse a outra ou se houve algum erro prévio)
        // Embora para uma NOVA empresa isso seja menos provável, o contato selecionado pode estar vindo de "sem empresa"
        const { data: contactData, error: contactError } = await supabase
          .from('m4_contacts')
          .update({ company_id: companyId, is_primary: true })
          .eq('id', selectedContactId)
          .select();
        
        if (contactError) {
          alert("Empresa salva, mas erro ao associar contato: " + contactError.message);
        } else if (contactData) {
          setContacts(contacts.map(c => c.id === selectedContactId ? contactData[0] : c));
        }
      }

      setCompanies([...companies, companyData[0]]);
      setIsModalOpen(false);
      resetForm();
    }
    setIsSaving(false);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setIsSaving(true);
    
    const { data: companyData, error: companyError } = await supabase
      .from('m4_companies')
      .update(newCompany)
      .eq('id', editingCompany.id)
      .select();

    if (companyError) {
      alert("Erro ao atualizar empresa: " + companyError.message);
    } else if (companyData) {
      if (contactMode === 'create' && primaryContact.name) {
        // Desmarcar outros contatos como primários para esta empresa antes de criar o novo primário
        await supabase
          .from('m4_contacts')
          .update({ is_primary: false })
          .eq('company_id', editingCompany.id);

        const { data: contactData, error: contactError } = await supabase
          .from('m4_contacts')
          .insert([{
            ...primaryContact,
            company_id: editingCompany.id,
            workspace_id: currentUser?.workspace_id,
            is_primary: true
          }])
          .select();
        
        if (contactError) {
          alert("Empresa atualizada, mas erro ao criar contato: " + contactError.message);
        } else if (contactData) {
          // Atualizar estado local: desmarcar antigos e adicionar novo
          const updatedContacts = contacts.map(c => 
            c.company_id === editingCompany.id ? { ...c, is_primary: false } : c
          );
          setContacts([...updatedContacts, contactData[0]]);
        }
      } else if (contactMode === 'select' && selectedContactId) {
        // Primeiro, desmarcar outros contatos como primários para esta empresa
        await supabase
          .from('m4_contacts')
          .update({ is_primary: false })
          .eq('company_id', editingCompany.id);

        const { data: contactData, error: contactError } = await supabase
          .from('m4_contacts')
          .update({ company_id: editingCompany.id, is_primary: true })
          .eq('id', selectedContactId)
          .select();
        
        if (contactError) {
          alert("Empresa atualizada, mas erro ao associar contato: " + contactError.message);
        } else if (contactData) {
          // Atualizar estado local dos contatos
          const updatedContacts = contacts.map(c => {
            if (c.id === selectedContactId) return contactData[0];
            if (c.company_id === editingCompany.id) return { ...c, is_primary: false };
            return c;
          });
          setContacts(updatedContacts);
        }
      }

      setCompanies(companies.map(c => c.id === editingCompany.id ? companyData[0] : c));
      setIsEditModalOpen(false);
      resetForm();
    }
    setIsSaving(false);
  };

  const resetForm = () => {
    setNewCompany({
      name: '', cnpj: '', city: '', state: '', segment: '', website: '', instagram: '', phone: '', whatsapp: '', notes: ''
    });
    setPrimaryContact({ name: '', email: '', phone: '', role: '' });
    setSelectedContactId('');
    setContactSearch('');
    setContactMode('select');
    setEditingCompany(null);
  };

  const openEditModal = async (company: Company) => {
    setEditingCompany(company);
    setNewCompany({
      name: company.name,
      cnpj: company.cnpj,
      city: company.city,
      state: company.state,
      segment: company.segment,
      website: company.website,
      instagram: company.instagram,
      phone: company.phone,
      whatsapp: company.whatsapp,
      notes: company.notes
    });
    
    // Fetch company tasks
    const { data: tasksData } = await supabase
      .from('m4_tasks')
      .select('*')
      .eq('company_id', company.id)
      .order('due_date', { ascending: true });
    
    if (tasksData) setCompanyTasks(tasksData);
    
    // Encontrar o contato primário atual
    const primary = contacts.find(c => c.company_id === company.id && c.is_primary);
    if (primary) {
      setSelectedContactId(primary.id);
      setContactSearch(primary.name);
    } else {
      setSelectedContactId('');
      setContactSearch('');
    }
    
    setContactMode('select');
    setIsEditing(false);
    setIsEditModalOpen(true);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone?.includes(contactSearch)
  );

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm) ||
    c.segment?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">EMPRESAS</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Gestão de Contas Jurídicas</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-1"
        >
          <ICONS.Plus /> NOVA EMPRESA
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none space-y-8 pb-10">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
          <ICONS.Search className="text-slate-400" width="20" height="20" />
          <input 
            type="text" 
            placeholder="Buscar por nome, CNPJ ou segmento..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:ring-0 w-full font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map(company => (
            <div 
              key={company.id}
              onClick={() => openEditModal(company)}
              className="group bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl shadow-sm group-hover:shadow-md transition-all">
                  {company.name.charAt(0)}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {company.segment || 'Geral'}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(company);
                    }}
                    className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <ICONS.Plus className="rotate-45" width="16" height="16" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{company.name}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mb-6">{company.city}, {company.state}</p>
              
              <div className="space-y-3 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <ICONS.Phone width="14" height="14" />
                  <span className="text-xs font-bold">{company.phone ? formatPhoneBR(company.phone) : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <ICONS.Mail width="14" height="14" />
                  <span className="text-xs font-bold">{company.website || 'N/A'}</span>
                </div>
                {contacts.find(c => c.company_id === company.id && c.is_primary) && (
                  <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 pt-2">
                    <ICONS.User width="14" height="14" />
                    <span className="text-xs font-black uppercase tracking-widest">
                      {contacts.find(c => c.company_id === company.id && c.is_primary)?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modais de Contato (Novo/Editar) */}
      {(isContactNewModalOpen || isContactEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 pb-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  {isContactNewModalOpen ? "Novo Contato" : "Editar Contato"}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Informações do Relacionamento</p>
              </div>
              <button onClick={() => { setIsContactNewModalOpen(false); setIsContactEditModalOpen(false); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                <ICONS.X className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={isContactNewModalOpen ? handleCreateContact : handleUpdateContact} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                  <input required value={newContactData.name} onChange={e => setNewContactData({...newContactData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</label>
                  <input value={newContactData.role} onChange={e => setNewContactData({...newContactData, role: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Diretor Comercial" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                  <input type="email" value={newContactData.email} onChange={e => setNewContactData({...newContactData, email: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                  <input value={newContactData.phone} onChange={e => setNewContactData({...newContactData, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                  <input value={newContactData.whatsapp} onChange={e => setNewContactData({...newContactData, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="WhatsApp" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instagram</label>
                  <input value={newContactData.instagram} onChange={e => setNewContactData({...newContactData, instagram: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="@perfil" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">LinkedIn</label>
                  <input value={newContactData.linkedin} onChange={e => setNewContactData({...newContactData, linkedin: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="linkedin.com/in/..." />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setIsContactNewModalOpen(false); setIsContactEditModalOpen(false); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50 shadow-xl shadow-blue-100 dark:shadow-none">
                  {isSaving ? "SALVANDO..." : "SALVAR CONTATO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Nova Empresa</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
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
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                    <input value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 0000-0000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input value={newCompany.whatsapp} onChange={e => setNewCompany({...newCompany, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Contato Principal (Opcional)</p>
                    <button 
                      type="button"
                      onClick={() => setContactMode(contactMode === 'select' ? 'create' : 'select')}
                      className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest flex items-center gap-2"
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
                              {filteredContacts.length > 0 ? (
                                filteredContacts.map(c => (
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

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Notas</label>
                  <textarea value={newCompany.notes} onChange={e => setNewCompany({...newCompany, notes: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white h-32" placeholder="Observações sobre a empresa..." />
                </div>
              </div>
              <div className="p-10 pt-0 shrink-0 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50">
                  {isSaving ? "SALVANDO..." : "SALVAR EMPRESA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <div className="flex items-center gap-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">
                  {isEditing ? `EDITANDO: ${editingCompany?.name}` : editingCompany?.name}
                </h3>
                {!isEditing && (
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'details' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Detalhes
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('tasks')}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tasks' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Tarefas ({companyTasks.length})
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && activeTab === 'details' && (
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
                      // Reset form to original values
                      if (editingCompany) {
                        setNewCompany({
                          name: editingCompany.name,
                          cnpj: editingCompany.cnpj,
                          city: editingCompany.city,
                          state: editingCompany.state,
                          segment: editingCompany.segment,
                          website: editingCompany.website,
                          instagram: editingCompany.instagram,
                          phone: editingCompany.phone,
                          whatsapp: editingCompany.whatsapp,
                          notes: editingCompany.notes
                        });
                      }
                    } else {
                      setIsEditModalOpen(false); 
                      resetForm(); 
                      setActiveTab('details');
                    }
                  }} 
                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <ICONS.Plus className="rotate-45" />
                </button>
              </div>
            </div>
            
            {activeTab === 'details' ? (
              <form onSubmit={handleUpdateCompany} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-none">
                  {isEditing ? (
                    <>
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
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                          <input value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 0000-0000" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                          <input value={newCompany.whatsapp} onChange={e => setNewCompany({...newCompany, whatsapp: formatPhoneBR(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
                        </div>
                      </div>

                      <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Contato Principal</p>
                          <button 
                            type="button"
                            onClick={() => setContactMode(contactMode === 'select' ? 'create' : 'select')}
                            className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest flex items-center gap-2"
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
                                    {filteredContacts.length > 0 ? (
                                      filteredContacts.map(c => (
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
                                <input value={primaryContact.phone} onChange={e => setPrimaryContact({...primaryContact, phone: formatPhoneBR(primaryContact.phone)})} className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl border-none text-sm font-bold text-slate-900 dark:text-white dark:placeholder:text-slate-400" placeholder="(00) 00000-0000" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Notas</label>
                        <textarea value={newCompany.notes} onChange={e => setNewCompany({...newCompany, notes: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white h-32" placeholder="Observações sobre a empresa..." />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nome da Empresa</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white truncate" title={editingCompany?.name}>{editingCompany?.name || '–'}</p>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">CNPJ</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{editingCompany?.cnpj || '–'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Localização</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                            {editingCompany?.city || editingCompany?.state ? `${editingCompany?.city || '–'}, ${editingCompany?.state || '–'}` : '–'}
                          </p>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Segmento</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{editingCompany?.segment || '–'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Website</p>
                          {editingCompany?.website ? (
                            <a 
                              href={editingCompany.website.startsWith('http') ? editingCompany.website : `https://${editingCompany.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-lg font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block"
                              title={editingCompany.website}
                            >
                              {editingCompany.website}
                            </a>
                          ) : (
                            <p className="text-lg font-bold text-slate-400 dark:text-slate-500">–</p>
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Instagram</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white truncate" title={editingCompany?.instagram}>{editingCompany?.instagram || '–'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Telefone</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{editingCompany?.phone ? formatPhoneBR(editingCompany.phone) : '–'}</p>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">WhatsApp</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{editingCompany?.whatsapp ? formatPhoneBR(editingCompany.whatsapp) : '–'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contato Principal</p>
                          <button 
                            type="button"
                            onClick={() => {
                              setNewContactData({ ...newContactData, company_id: editingCompany?.id });
                              setIsContactNewModalOpen(true);
                            }}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
                          >
                            <ICONS.Plus width="12" height="12" /> Novo Contato
                          </button>
                        </div>
                        
                        {(() => {
                          const contact = contacts.find(c => c.id === selectedContactId);
                          if (!contact) return <p className="text-lg font-bold text-slate-400 dark:text-slate-500 italic">Nenhum associado</p>;
                          
                          return (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl space-y-4 relative group">
                              <button 
                                type="button"
                                onClick={() => openEditContactModal(contact)}
                                className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-700 text-slate-400 hover:text-blue-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <ICONS.Edit width="14" height="14" />
                              </button>
                              
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1 min-w-0">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nome</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{contact.name || '–'}</p>
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cargo</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{contact.role || '–'}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1 min-w-0">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={contact.email}>{contact.email || '–'}</p>
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Telefone</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{contact.phone ? formatPhoneBR(contact.phone) : '–'}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1 min-w-0">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</p>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{contact.whatsapp ? formatPhoneBR(contact.whatsapp) : '–'}</p>
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Instagram</p>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{contact.instagram || '–'}</p>
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LinkedIn</p>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{contact.linkedin || '–'}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Notas</p>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{editingCompany?.notes || '–'}</p>
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
                          if (editingCompany) {
                            setNewCompany({
                              name: editingCompany.name,
                              cnpj: editingCompany.cnpj,
                              city: editingCompany.city,
                              state: editingCompany.state,
                              segment: editingCompany.segment,
                              website: editingCompany.website,
                              instagram: editingCompany.instagram,
                              phone: editingCompany.phone,
                              whatsapp: editingCompany.whatsapp,
                              notes: editingCompany.notes
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
                    <button type="button" onClick={() => { setIsEditModalOpen(false); resetForm(); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Fechar</button>
                  )}
                </div>
              </form>
            ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-none">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tarefas Vinculadas</h4>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-black uppercase">
                    {companyTasks.length} TAREFAS
                  </span>
                </div>
                
                {companyTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <ICONS.Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Nenhuma tarefa encontrada</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vincule tarefas a esta empresa para visualizá-las aqui</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companyTasks.map(task => (
                      <div key={task.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                task.status === TaskStatus.DONE ? 'bg-emerald-500' :
                                task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-500' :
                                'bg-slate-300'
                              }`} />
                              <h5 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{task.title}</h5>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                <ICONS.Calendar className="w-3 h-3" />
                                {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem data'}
                              </div>
                              <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${
                                task.priority === Priority.HIGH ? 'bg-rose-100 text-rose-600' :
                                task.priority === Priority.MEDIUM ? 'bg-amber-100 text-amber-600' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {task.priority}
                              </div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            task.status === TaskStatus.DONE ? 'bg-emerald-100 text-emerald-600' :
                            task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {task.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-10 pt-0 shrink-0">
                <button onClick={() => { setIsEditModalOpen(false); resetForm(); setActiveTab('details'); }} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Fechar</button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Companies;
