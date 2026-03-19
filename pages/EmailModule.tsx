
import React, { useState, useEffect } from 'react';
import { EmailMessage, User } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';

interface EmailModuleProps {
  emails: EmailMessage[];
  setEmails: React.Dispatch<React.SetStateAction<EmailMessage[]>>;
  currentUser: User | null;
}

const EmailModule: React.FC<EmailModuleProps> = ({ emails, setEmails, currentUser }) => {
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts' | 'trash'>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [newEmail, setNewEmail] = useState({ recipient: '', subject: '', body: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGmailConnected(true);
        console.log("Google tokens received:", event.data.tokens);
        // In a real app, you'd trigger a sync here
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGmail = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (error) {
      console.error("Error connecting to Gmail:", error);
      alert("Erro ao conectar com o Google.");
    }
  };

  const filteredEmails = emails.filter(e => e.folder === activeFolder);

  const handleSelectEmail = async (email: EmailMessage) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      // Mark as read in Supabase
      const { error } = await supabase.from('m4_emails').update({ is_read: true }).eq('id', email.id);
      if (!error) {
        setEmails(emails.map(e => e.id === email.id ? { ...e, is_read: true } : e));
      }
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    
    const emailData = {
      sender_name: 'M4 Admin',
      sender_email: 'admin@m4digital.com',
      recipient_email: newEmail.recipient,
      subject: newEmail.subject,
      body: newEmail.body,
      folder: 'sent',
      is_read: true,
      workspace_id: currentUser?.workspace_id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('m4_emails').insert([emailData]).select();

    if (!error && data) {
      setEmails([data[0], ...emails]);
      setIsComposeOpen(false);
      setNewEmail({ recipient: '', subject: '', body: '' });
      // Fallback: Abrir cliente de email do sistema também
      window.open(`mailto:${newEmail.recipient}?subject=${encodeURIComponent(newEmail.subject)}&body=${encodeURIComponent(newEmail.body)}`);
    } else {
      alert("Erro ao salvar email: " + error?.message);
    }
    setIsSyncing(false);
  };

  const FolderBtn = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => { setActiveFolder(id); setSelectedEmail(null); }}
      className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all font-bold text-sm ${
        activeFolder === id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon />
        {label}
      </div>
      {id === 'inbox' && emails.filter(e => !e.is_read).length > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeFolder === id ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
          {emails.filter(e => !e.is_read).length}
        </span>
      )}
    </button>
  );

  return (
    <div className="h-full flex gap-8 animate-in fade-in duration-700">
      {/* Sidebar Folders */}
      <div className="w-64 space-y-8 h-full flex flex-col">
        <button 
          onClick={() => setIsComposeOpen(true)}
          className="w-full py-5 bg-gradient-to-r from-blue-700 to-indigo-600 text-white rounded-[1.75rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 hover:-translate-y-1 transition-all"
        >
          Escrever E-mail
        </button>
        
        <nav className="space-y-2">
          <FolderBtn id="inbox" label="Caixa de Entrada" icon={ICONS.Mail} />
          <FolderBtn id="sent" label="Enviados" icon={ICONS.Automation} />
          <FolderBtn id="drafts" label="Rascunhos" icon={ICONS.Drive} />
          <FolderBtn id="trash" label="Lixeira" icon={ICONS.Plus} />
        </nav>

        <div className="mt-auto p-6 bg-slate-900 rounded-[2.5rem] text-white">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Dica de Produtividade</p>
          <div className="flex flex-col gap-4">
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Use o botão <span className="text-white font-bold">"Ver no Gmail"</span> nos cards dos leads para abrir conversas externas instantaneamente.
            </p>
            <button 
              onClick={() => window.open('https://mail.google.com', '_blank')}
              className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Abrir Gmail
            </button>
          </div>
        </div>
      </div>

      {/* Main Mail Area */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex overflow-hidden">
        {/* List Pane */}
        <div className={`w-[45%] border-r border-slate-50 flex flex-col h-full ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
           <div className="p-8 border-b border-slate-50">
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{activeFolder}</h3>
           </div>
           <div className="flex-1 overflow-y-auto scrollbar-none divide-y divide-slate-50">
             {filteredEmails.length === 0 ? (
               <div className="p-20 text-center text-slate-300">
                 <ICONS.Mail />
                 <p className="mt-4 font-bold uppercase text-[10px] tracking-widest">Pasta Vazia</p>
               </div>
             ) : (
               filteredEmails.map(email => (
                 <div 
                   key={email.id}
                   onClick={() => handleSelectEmail(email)}
                   className={`p-6 cursor-pointer transition-all hover:bg-blue-50/30 group relative ${selectedEmail?.id === email.id ? 'bg-blue-50/50' : ''}`}
                 >
                   {!email.is_read && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-600 rounded-r-full"></div>}
                   <div className="flex justify-between items-start mb-2">
                     <h4 className={`text-sm ${!email.is_read ? 'font-black text-slate-900' : 'font-medium text-slate-500'}`}>{email.sender_name}</h4>
                     <span className="text-[10px] font-bold text-slate-400">{new Date(email.created_at).toLocaleDateString()}</span>
                   </div>
                   <h5 className={`text-xs mb-1 truncate ${!email.is_read ? 'font-black text-slate-800' : 'text-slate-600'}`}>{email.subject}</h5>
                   <p className="text-[11px] text-slate-400 line-clamp-1 italic">{email.body}</p>
                 </div>
               ))
             )}
           </div>
        </div>

        {/* Content Pane */}
        <div className="flex-1 flex flex-col h-full bg-white relative">
          {selectedEmail ? (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-500">
               <div className="p-10 border-b border-slate-50 flex justify-between items-start sticky top-0 bg-white z-10">
                 <div className="flex items-center gap-6">
                   <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-xl text-slate-400 border border-slate-100 uppercase">
                     {selectedEmail.sender_name[0]}
                   </div>
                   <div>
                     <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedEmail.subject}</h2>
                     <p className="text-xs font-bold text-slate-400 mt-1">De: <span className="text-blue-600">{selectedEmail.sender_email}</span> para você</p>
                   </div>
                 </div>
                 <div className="flex gap-2">
                   <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-blue-600 hover:bg-blue-50 transition-all"><ICONS.Collaboration /></button>
                   <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 hover:bg-red-50 transition-all"><ICONS.Plus className="rotate-45" /></button>
                 </div>
               </div>
               
               <div className="flex-1 p-12 overflow-y-auto bg-slate-50/30 scrollbar-thin">
                 <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[400px]">
                    <p className="text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">{selectedEmail.body}</p>
                 </div>
               </div>

               <div className="p-8 border-t border-slate-100 flex gap-4 bg-white sticky bottom-0">
                  <button className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all">Responder Agora</button>
                  <button className="px-8 py-4 border border-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Encaminhar</button>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center">
               <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-100 mb-8 border border-slate-100">
                  <ICONS.Mail />
               </div>
               <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Nenhuma mensagem selecionada</h3>
               <p className="text-slate-400 font-medium max-w-xs mt-4">Selecione um e-mail da lista para ler o conteúdo completo aqui.</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-widest">Nova Mensagem</h3>
              <button onClick={() => setIsComposeOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <ICONS.Plus className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="p-10 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center border-b border-slate-100 py-4">
                  <label className="text-[10px] font-black text-slate-300 uppercase w-20">Para:</label>
                  <input required type="email" value={newEmail.recipient} onChange={e => setNewEmail({...newEmail, recipient: e.target.value})} className="flex-1 bg-transparent border-none outline-none font-bold text-slate-800" placeholder="cliente@email.com" />
                </div>
                <div className="flex items-center border-b border-slate-100 py-4">
                  <label className="text-[10px] font-black text-slate-300 uppercase w-20">Assunto:</label>
                  <input required type="text" value={newEmail.subject} onChange={e => setNewEmail({...newEmail, subject: e.target.value})} className="flex-1 bg-transparent border-none outline-none font-bold text-slate-800" placeholder="Título do e-mail" />
                </div>
              </div>
              <textarea 
                required
                value={newEmail.body} 
                onChange={e => setNewEmail({...newEmail, body: e.target.value})} 
                className="w-full h-64 p-6 bg-slate-50 rounded-[1.75rem] border-none outline-none font-medium text-slate-700 resize-none placeholder:text-slate-300" 
                placeholder="Escreva sua mensagem aqui..."
              />
              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={isSyncing} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                  {isSyncing ? "ENVIANDO..." : <><ICONS.Automation /> ENVIAR E-MAIL</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailModule;
