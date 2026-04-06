
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { Lead } from '../types';
import { GoogleGenAI } from "@google/genai";

interface AutomationProps {
  leads: Lead[];
}

const Automation: React.FC<AutomationProps> = ({ leads }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const handleAiCopilot = async () => {
    setIsAiLoading(true);
    try {
      // Acesso seguro à chave API apenas no momento da execução
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      
      if (!apiKey) {
        setAiSuggestions(["API Key não configurada no ambiente."]);
        setIsAiLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analise estes dados de leads da minha agência de marketing M4 Digital: ${JSON.stringify(leads)}. 
      Sugira 3 regras de automação específicas para otimizar meu funil comercial. Retorne apenas uma lista simples de frases curtas.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const text = response.text || "Não foi possível gerar sugestões no momento.";
      setAiSuggestions(text.split('\n').filter(s => s.trim().length > 0));
    } catch (error) {
      console.error("Erro IA:", error);
      setAiSuggestions(["Erro ao conectar com a IA. Verifique sua chave API."]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const automations = [
    { id: '1', name: 'Onboarding Automático', trigger: 'Lead movido para "Onboarding"', action: 'Criar 5 tarefas de setup e enviar email', status: true },
    { id: '2', name: 'Aviso de Vencimento de Ads', trigger: '7 dias antes do fim do contrato', action: 'Enviar notificação no WhatsApp do gestor', status: true },
  ];

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Automações</h2>
          <p className="text-slate-500 dark:text-slate-400">Regras automáticas para otimizar sua agência.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
          <ICONS.Plus /> Criar Automação
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {automations.map((a) => (
          <div key={a.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><ICONS.Automation /></div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase ${a.status ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>{a.status ? 'Ativa' : 'Pausada'}</span>
                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${a.status ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                   <div className={`w-3 h-3 bg-white rounded-full transition-transform ${a.status ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">{a.name}</h3>
            <div className="space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium"><span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Gatilho:</span> {a.trigger}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 italic"><span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Ação:</span> {a.action}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 rounded-[2.5rem] border border-blue-400 shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="flex-1 relative z-10">
          <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">IA Copilot Inteligente</h3>
          <p className="text-blue-100 mb-6 font-medium">Deixe nossa IA analisar seus leads e sugerir as melhores automações de conversão.</p>
          
          {aiSuggestions.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 space-y-3 border border-white/20 animate-in fade-in slide-in-from-top-4">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Sugestões da IA:</p>
              {aiSuggestions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-white font-bold">
                  <div className="w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                  {s}
                </div>
              ))}
            </div>
          )}

          <button 
            onClick={handleAiCopilot}
            disabled={isAiLoading}
            className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black hover:bg-blue-50 shadow-2xl transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {isAiLoading ? <span className="animate-spin text-xl">◌</span> : <ICONS.Automation />}
            {isAiLoading ? 'ANALISANDO DADOS...' : 'SOLICITAR INSIGHTS DA IA'}
          </button>
        </div>
        <div className="w-40 h-40 bg-white/10 rounded-3xl flex items-center justify-center text-white backdrop-blur-sm border border-white/20 relative z-10 group-hover:rotate-6 transition-transform">
           <ICONS.Automation />
        </div>
      </div>
    </div>
  );
};

export default Automation;
