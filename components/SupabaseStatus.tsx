import React, { useState, useEffect } from 'react';
import { supabase, getSupabaseConfig } from '../lib/supabase';

const SupabaseStatus: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkConnection = async () => {
    // Check if configuration exists first
    const config = getSupabaseConfig();
    if (!config.url || !config.key || config.url.includes('placeholder')) {
      setStatus('error');
      setErrorMessage("Configuração do Supabase ausente ou inválida.");
      return;
    }

    setStatus('loading');
    try {
      // Use m4_workspaces instead of m4_settings as a heartbeat check
      // Also, include a small timeout or just check for the client existence
      if (!supabase) throw new Error("Cliente Supabase não inicializado");
      
      const { error } = await supabase.from('m4_workspaces').select('id').limit(1).maybeSingle();
      
      // If we get an error but it's not a connection error (e.g. 404 table not found),
      // we might still be "online" in a sense, but for this app we expect m4_workspaces.
      if (error) throw error;
      
      setStatus('ok');
      setErrorMessage(null);
    } catch (err: any) {
      // More descriptive error handling
      const isOffline = err.message?.includes('failed to fetch') || err.message?.includes('network');
      console.error("Supabase Connection Check:", err);
      
      setStatus('error');
      setErrorMessage(isOffline ? "Falha na rede (Servidor Inalcançável)" : (err.message || "Erro de Conexão"));
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 45000); // Check every 45s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative group">
      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border flex items-center gap-2 transition-all duration-300 ${
        status === 'ok' 
          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
          : status === 'loading'
          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
          : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${
          status === 'ok' ? 'bg-emerald-500 animate-pulse' : 
          status === 'loading' ? 'bg-amber-500 animate-spin' : 
          'bg-rose-500'
        }`} />
        {status === 'ok' ? 'Cloud Sync OK' : status === 'loading' ? 'Sincronizando...' : 'Offline / Erro de Conexão'}
      </div>

      {status === 'error' && errorMessage && (
        <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 text-[10px] font-bold text-rose-600 dark:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <p className="uppercase tracking-widest mb-1">Mensagem de Erro:</p>
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};

export default SupabaseStatus;
