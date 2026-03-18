
import React, { useState, useEffect } from 'react';
import { Company, Contact } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import { formatCNPJ, formatPhoneBR } from '../utils/formatters';

interface CompaniesProps {
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
}

const Companies: React.FC<CompaniesProps> = ({ companies, setCompanies, contacts, setContacts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '', cnpj: '', city: '', state: '', segment: '', website: '', instagram: '', phone: '', whatsapp: '', notes: ''
  });
  
  // Contact selection states
  const [contactMode, setContactMode] = useState<'select' | 'create'>('select');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);

  const [primaryContact, setPrimaryContact] = useState({
    name: '', email: '', phone: '', role: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const { data: companyData, error: companyError } = await supabase
      .from('m4_companies')
      .insert([newCompany])
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
            companyId,
            isPrimary: true
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
          .update({ companyId, isPrimary: true })
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
          .update({ isPrimary: false })
          .eq('companyId', editingCompany.id);

        const { data: contactData, error: contactError } = await supabase
          .from('m4_contacts')
          .insert([{
            ...primaryContact,
            companyId: editingCompany.id,
            isPrimary: true
          }])
          .select();
        
        if (contactError) {
          alert("Empresa atualizada, mas erro ao criar contato: " + contactError.message);
        } else if (contactData) {
          // Atualizar estado local: desmarcar antigos e adicionar novo
          const updatedContacts = contacts.map(c => 
            c.companyId === editingCompany.id ? { ...c, isPrimary: false } : c
          );
          setContacts([...updatedContacts, contactData[0]]);
        }
      } else if (contactMode === 'select' && selectedContactId) {
        // Primeiro, desmarcar outros contatos como primários para esta empresa
        await supabase
          .from('m4_contacts')
          .update({ isPrimary: false })
          .eq('companyId', editingCompany.id);

        const { data: contactData, error: contactError } = await supabase
          .from('m4_contacts')
          .update({ companyId: editingCompany.id, isPrimary: true })
          .eq('id', selectedContactId)
          .select();
        
        if (contactError) {
          alert("Empresa atualizada, mas erro ao associar contato: " + contactError.message);
        } else if (contactData) {
          // Atualizar estado local dos contatos
          const updatedContacts = contacts.map(c => {
            if (c.id === selectedContactId) return contactData[0];
            if (c.companyId === editingCompany.id) return { ...c, isPrimary: false };
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

  const openEditModal = (company: Company) => {
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
    
    // Encontrar o contato primário atual
    const primary = contacts.find(c => c.companyId === company.id && c.isPrimary);
    if (primary) {
      setSelectedContactId(primary.id);
      setContactSearch(primary.name);
    } else {
      setSelectedContactId('');
      setContactSearch('');
    }
    
    setContactMode('select');
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
                {contacts.find(c => c.companyId === company.id && c.isPrimary) && (
                  <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 pt-2">
                    <ICONS.User width="14" height="14" />
                    <span className="text-xs font-black uppercase tracking-widest">
                      {contacts.find(c => c.companyId === company.id && c.isPrimary)?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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
                <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
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
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Buscar Contato</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            value={contactSearch} 
                            onChange={e => {
                              setContactSearch(e.target.value);
                              setShowContactDropdown(true);
                            }} 
                            onFocus={() => setShowContactDropdown(true)}
                            className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" 
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
                                      <p className="text-[10px] text-slate-400">{c.email} • {c.phone}</p>
                                    </div>
                                    {selectedContactId === c.id && <ICONS.Check className="text-blue-600" width="16" height="16" />}
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center text-slate-400 text-xs font-bold">Nenhum contato encontrado</div>
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
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                          <input value={primaryContact.name} onChange={e => setPrimaryContact({...primaryContact, name: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold" placeholder="Nome do contato" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                          <input value={primaryContact.role} onChange={e => setPrimaryContact({...primaryContact, role: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold" placeholder="Ex: CEO" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                          <input type="email" value={primaryContact.email} onChange={e => setPrimaryContact({...primaryContact, email: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold" placeholder="email@contato.com" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                          <input value={primaryContact.phone} onChange={e => setPrimaryContact({...primaryContact, phone: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold" placeholder="(00) 00000-0000" />
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
            <div className="flex justify-between items-center p-10 pb-0 shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Editar Empresa</h3>
              <button onClick={() => { setIsEditModalOpen(false); resetForm(); }} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleUpdateCompany} className="flex-1 flex flex-col overflow-hidden">
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

                <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
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
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Buscar Contato</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            value={contactSearch} 
                            onChange={e => {
                              setContactSearch(e.target.value);
                              setShowContactDropdown(true);
                            }} 
                            onFocus={() => setShowContactDropdown(true)}
                            className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" 
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
                                      <p className="text-[10px] text-slate-400">{c.email} • {c.phone}</p>
                                    </div>
                                    {selectedContactId === c.id && <ICONS.Check className="text-blue-600" width="16" height="16" />}
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center text-slate-400 text-xs font-bold">Nenhum contato encontrado</div>
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
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                          <input value={primaryContact.name} onChange={e => setPrimaryContact({...primaryContact, name: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold" placeholder="Nome do contato" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                          <input value={primaryContact.role} onChange={e => setPrimaryContact({...primaryContact, role: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold" placeholder="Ex: CEO" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                          <input type="email" value={primaryContact.email} onChange={e => setPrimaryContact({...primaryContact, email: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold" placeholder="email@contato.com" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                          <input value={primaryContact.phone} onChange={e => setPrimaryContact({...primaryContact, phone: formatPhoneBR(e.target.value)})} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl border-none text-sm font-bold" placeholder="(00) 00000-0000" />
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
                <button type="button" onClick={() => { setIsEditModalOpen(false); resetForm(); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50">
                  {isSaving ? "SALVANDO..." : "ATUALIZAR EMPRESA"}
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

export default Companies;
