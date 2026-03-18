
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';
import TechnicalPanel from './TechnicalPanel';
import { useTheme } from '../ThemeContext';

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'visual' | 'technical'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    id: undefined as string | undefined,
    tenant_id: 'default-tenant', // Default for single-tenant apps
    crm_name: 'M4 CRM',
    company_name: 'Agency Cloud',
    theme: theme, // Use theme from context initially
    primary_color: '#2563eb',
    logo_url: '',
    city: '',
    state: '',
    website_url: '',
    whatsapp_number: '',
    language: 'pt-BR'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('m4_settings').select('*').maybeSingle();
        if (error) {
          console.error('Error fetching settings:', error);
          // Ensure we at least have the correct theme from context if fetch fails
          setSettings(prev => ({ ...prev, theme }));
          return;
        }
        if (data) {
          setSettings(data);
        }
      } catch (err) {
        console.error('Unexpected error fetching settings:', err);
      }
    };
    fetchSettings();
  }, [theme]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log('Attempting to save settings to Supabase...', settings);
      
      const payload = { 
        ...settings, 
        tenant_id: settings.tenant_id || 'default-tenant',
        updated_at: new Date().toISOString() 
      };

      const { data, error } = await supabase
        .from('m4_settings')
        .upsert(payload, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) {
        console.error('Supabase Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(error.message || 'Erro desconhecido no Supabase');
      }
      
      console.log('Settings saved successfully:', data);
      if (data) setSettings(data);
      
      // Apply theme immediately via context
      // We pass skipPersistence=true because we already saved the theme in the upsert above
      await setTheme(settings.theme as any, true);
      
      alert('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Full error during save:', error);
      
      let errorMessage = 'Erro ao salvar: ';
      if (error.message === 'Failed to fetch') {
        errorMessage += 'Falha na conexão com o Supabase. Verifique se a URL e a chave estão corretas no ambiente.';
      } else {
        errorMessage += error.message || 'Erro inesperado.';
      }
      
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, you'd upload to Supabase Storage
    // For now, we'll use a local URL or placeholder
    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings({ ...settings, logo_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-slate-200">
            <ICONS.Settings />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Configurações do CRM</h2>
            <p className="text-slate-500 font-medium">Personalize a identidade e o comportamento do seu workspace.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-100 transition-all disabled:opacity-50"
        >
          {isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          Geral
        </button>
        <button 
          onClick={() => setActiveTab('visual')}
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'visual' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          Identidade Visual
        </button>
        <button 
          onClick={() => setActiveTab('technical')}
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'technical' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          Painel Técnico (SQL)
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Informações da Agência</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Agência / Empresa</label>
                <input 
                  type="text" 
                  value={settings.company_name} 
                  onChange={e => setSettings({...settings, company_name: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cidade</label>
                  <input 
                    type="text" 
                    value={settings.city} 
                    onChange={e => setSettings({...settings, city: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado</label>
                  <input 
                    type="text" 
                    value={settings.state} 
                    onChange={e => setSettings({...settings, state: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Website URL</label>
                <input 
                  type="url" 
                  value={settings.website_url} 
                  onChange={e => setSettings({...settings, website_url: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                  placeholder="https://suaagencia.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp Principal</label>
                <input 
                  type="text" 
                  value={settings.whatsapp_number} 
                  onChange={e => setSettings({...settings, whatsapp_number: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                  placeholder="+55 (11) 99999-9999"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Preferências do Sistema</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tema do Workspace</label>
                <div className="grid grid-cols-3 gap-4">
                  <button 
                    onClick={() => setSettings({...settings, theme: 'light'})}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${settings.theme === 'light' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                  >
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
                      <ICONS.Dashboard />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest dark:text-slate-300">Light</span>
                  </button>
                  <button 
                    onClick={() => setSettings({...settings, theme: 'dark'})}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${settings.theme === 'dark' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                  >
                    <div className="w-10 h-10 bg-slate-900 rounded-xl shadow-sm border border-slate-800 flex items-center justify-center text-blue-400">
                      <ICONS.Automation />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest dark:text-slate-300">Dark</span>
                  </button>
                  <button 
                    onClick={() => setSettings({...settings, theme: 'system'})}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${settings.theme === 'system' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                  >
                    <div className="w-10 h-10 bg-slate-500 rounded-xl shadow-sm border border-slate-400 flex items-center justify-center text-white">
                      <ICONS.Settings />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest dark:text-slate-300">System</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Idioma Padrão</label>
                <select 
                  value={settings.language} 
                  onChange={e => setSettings({...settings, language: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Branding</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do CRM</label>
                <input 
                  type="text" 
                  value={settings.crm_name} 
                  onChange={e => setSettings({...settings, crm_name: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                  placeholder="Ex: Agency X CRM"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Logo da Agência</label>
                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ICONS.Plus className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                      className="hidden" 
                      id="logo-upload" 
                    />
                    <label 
                      htmlFor="logo-upload"
                      className="inline-block px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-all"
                    >
                      Upload Novo Logo
                    </label>
                    <p className="text-[10px] text-slate-400 font-medium">Recomendado: PNG ou SVG transparente, 512x512px.</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Cor Primária</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={settings.primary_color} 
                    onChange={e => setSettings({...settings, primary_color: e.target.value})}
                    className="w-12 h-12 rounded-xl border-none cursor-pointer" 
                  />
                  <input 
                    type="text" 
                    value={settings.primary_color} 
                    onChange={e => setSettings({...settings, primary_color: e.target.value})}
                    className="flex-1 p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white space-y-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <h3 className="text-lg font-black uppercase tracking-widest relative z-10">Preview da Marca</h3>
            <div className="space-y-6 relative z-10">
              <div className="p-6 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center overflow-hidden">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-lg">M4</span>
                    )}
                  </div>
                  <div>
                    <p className="font-black text-sm leading-none">{settings.crm_name}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase mt-1">{settings.company_name}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-medium italic">Como seus botões e elementos ativos aparecerão:</p>
                <button 
                  style={{ backgroundColor: settings.primary_color }}
                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20"
                >
                  Botão de Exemplo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'technical' && <TechnicalPanel />}
    </div>
  );
};

export default Settings;
