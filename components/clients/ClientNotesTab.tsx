import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { M4Client } from '../../types';
import { FileText, Save, Info } from 'lucide-react';

interface ClientNotesTabProps {
  activeClient: M4Client;
  workspaceId: string;
  companies: any[];
  setCompanies: React.Dispatch<React.SetStateAction<any[]>>;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ClientNotesTab: React.FC<ClientNotesTabProps> = ({
  activeClient,
  workspaceId,
  companies,
  setCompanies,
  onShowToast,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [companyNotes, setCompanyNotes] = useState('');

  const matchedCompany = companies.find(com => com.id === activeClient.company_id);

  // Sync state with company notes
  useEffect(() => {
    if (matchedCompany) {
      setCompanyNotes(matchedCompany.notes || '');
    } else {
      setCompanyNotes('');
    }
  }, [activeClient.id, matchedCompany]);

  const handleSaveNotes = async () => {
    if (!activeClient.company_id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('m4_companies')
        .update({ notes: companyNotes, updated_at: new Date().toISOString() })
        .eq('id', activeClient.company_id)
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      // Update parent memorized state
      setCompanies(prev => prev.map(c => c.id === activeClient.company_id ? { ...c, notes: companyNotes } : c));
      onShowToast('Observações de handoff / onboarding salvas com sucesso!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao persistir notas da corporação', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
      <div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>Handoff Comercial & Observações</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">Notas herdadas diretamente da captação comercial e mapeamento de dores iniciais do lead.</p>
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Estas anotações de handoff representam o conhecimento estratégico captado durante a jornada de vendas. Use este scratchpad para planejar a jornada inicial do cliente, documentar acessos fornecidos (Pixel, Google Tag Manager, etc), ou descrever restrições e regras de negócio essenciais.
        </p>
      </div>

      <div className="space-y-4">
        <textarea
          rows={10}
          className="w-full p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-[1.5rem] text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white leading-relaxed"
          placeholder="Mapeamento de dores, acessos compartilhados, perfil geral de público-alvo, criativos que convertem mais e notas de transição de onboarding..."
          value={companyNotes}
          onChange={e => setCompanyNotes(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            onClick={handleSaveNotes}
            disabled={isProcessing}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isProcessing ? 'Gravando...' : 'Salvar Observações'}
          </button>
        </div>
      </div>
    </div>
  );
};
