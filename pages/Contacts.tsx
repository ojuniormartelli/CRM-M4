
import React, { useState, useEffect } from 'react';
import { Contact, Company } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';

interface ContactsProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  companies: Company[];
}

const Contacts: React.FC<ContactsProps> = ({ contacts, setContacts, companies }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '', email: '', phone: '', role: '', whatsapp: '', instagram: '', linkedin: '', notes: '', isPrimary: false, companyId: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '', cnpj: '', city: '', state: '', segment: '', phone: '', website: '', instagram: ''
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
      .insert([newCompany])
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
            companyId,
            isPrimary: true
          }]);
      } else if (contactMode === 'select' && selectedContactId) {
        await supabase
          .from('m4_contacts')
          .update({ companyId, isPrimary: true })
          .eq('id', selectedContactId);
      }

      setNewContact({ ...newContact, companyId: companyData[0].id });
      setIsCompanyModalOpen(false);
      setNewCompany({ name: '', cnpj: '', city: '', state: '', segment: '', phone: '', website: '', instagram: '' });
      setPrimaryContact({ name: '', email: '', phone: '', role: '' });
      setSelectedContactId('');
      setContactSearch('');
      setContactMode('select');
      window.location.reload();
    }
    setIsSaving(false);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const { data, error } = await supabase
      .from('m4_contacts')
      .insert([newContact])
      .select();

    if (error) {
      alert("Erro ao salvar contato: " + error.message);
    } else if (data) {
      setContacts([...contacts, data[0]]);
      setIsModalOpen(false);
      setNewContact({
        name: '', email: '', phone: '', role: '', whatsapp: '', instagram: '', linkedin: '', notes: '', isPrimary: false, companyId: ''
      });
    }
    setIsSaving(false);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || 'Empresa não vinculada';
  };

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
              className="group bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl shadow-sm group-hover:shadow-md transition-all">
                  {contact.name.charAt(0)}
                </div>
                {contact.isPrimary && (
                  <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    Principal
                  </div>
                )}
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{contact.name}</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1 uppercase tracking-widest">{contact.role || 'Contato'}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mb-6">{getCompanyName(contact.companyId)}</p>
              
              <div className="space-y-3 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <ICONS.Phone width="14" height="14" />
                  <span className="text-xs font-bold">{contact.phone || 'N/A'}</span>
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
                      <select required value={newContact.companyId} onChange={e => setNewContact({...newContact, companyId: e.target.value})} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white">
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
                    <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 0000-0000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input value={newContact.whatsapp} onChange={e => setNewContact({...newContact, whatsapp: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="(00) 00000-0000" />
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
                    id="isPrimary"
                    checked={newContact.isPrimary} 
                    onChange={e => setNewContact({...newContact, isPrimary: e.target.checked})}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPrimary" className="text-sm font-bold text-slate-700 dark:text-slate-300">Este é o contato principal da empresa</label>
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
                    <input value={newCompany.cnpj} onChange={e => setNewCompany({...newCompany, cnpj: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Segmento</label>
                    <input value={newCompany.segment} onChange={e => setNewCompany({...newCompany, segment: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" placeholder="Ex: Tecnologia" />
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
