
import React from 'react';
import { Lead, Pipeline } from '../../types';
import { alertsUtils } from '../../utils/alerts';
import { ICONS } from '../../constants';

interface AlertsPanelProps {
  leads: Lead[];
  pipelines: Pipeline[];
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ leads, pipelines }) => {
  const hotLeads = alertsUtils.getHotLeadsWithoutAction(leads, pipelines);
  const closingSoon = alertsUtils.getDealsClosingSoon(leads, pipelines);
  const overdueFollowups = alertsUtils.getOverdueFollowups(leads, pipelines);
  const inactiveLeads = alertsUtils.getInactiveLeads(leads, pipelines);

  if (hotLeads.length === 0 && closingSoon.length === 0 && 
      overdueFollowups.length === 0 && inactiveLeads.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 p-6 rounded-2xl text-center">
        <div className="text-4xl mb-2">🎉</div>
        <h3 className="font-black text-emerald-900 dark:text-emerald-400">
          Nenhum alerta no momento!
        </h3>
        <p className="text-emerald-700 dark:text-emerald-300 text-sm">
          Seu funil está em dia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
        <ICONS.AlertTriangle className="text-amber-500" /> Alertas Inteligentes
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hotLeads.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 p-4 rounded-2xl">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-black text-orange-900 dark:text-orange-400 text-xs uppercase tracking-widest">Leads Quentes sem Ação</h4>
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{hotLeads.length}</span>
            </div>
            <p className="text-orange-700 dark:text-orange-300 text-xs mb-3">Leads quentes que não possuem ação agendada para hoje.</p>
            <button className="w-full py-2 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all">Agendar Follow-up</button>
          </div>
        )}

        {overdueFollowups.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-black text-red-900 dark:text-red-400 text-xs uppercase tracking-widest">Follow-ups Atrasados</h4>
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{overdueFollowups.length}</span>
            </div>
            <p className="text-red-700 dark:text-red-300 text-xs mb-3">Ações que deveriam ter sido realizadas e estão pendentes.</p>
            <button className="w-full py-2 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all">Ver Atrasados</button>
          </div>
        )}

        {closingSoon.length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 p-4 rounded-2xl">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-black text-emerald-900 dark:text-emerald-400 text-xs uppercase tracking-widest">Perto do Fechamento</h4>
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{closingSoon.length}</span>
            </div>
            <p className="text-emerald-700 dark:text-emerald-300 text-xs mb-3">Negócios com alta probabilidade e previsão para os próximos 7 dias.</p>
            <button className="w-full py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all">Priorizar Agora</button>
          </div>
        )}

        {inactiveLeads.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900/30 p-4 rounded-2xl">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-black text-slate-900 dark:text-slate-400 text-xs uppercase tracking-widest">Leads em Hibernação</h4>
              <span className="bg-slate-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{inactiveLeads.length}</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-xs mb-3">Leads sem nenhuma interação há mais de 30 dias.</p>
            <button className="w-full py-2 bg-slate-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Reativar Leads</button>
          </div>
        )}
      </div>
    </div>
  );
};
