
import React from 'react';
import { Lead, Pipeline } from '../../types';
import { metricsUtils } from '../../utils/metrics';

interface ForecastBreakdownProps {
  leads: Lead[];
  pipelines: Pipeline[];
}

export const ForecastBreakdown: React.FC<ForecastBreakdownProps> = ({ leads, pipelines }) => {
  const breakdown = metricsUtils.getForecastBreakdown(leads, pipelines);
  const weightedValue = metricsUtils.getPipelineValueWeighted(leads, pipelines);

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
      <h3 className="text-lg font-black text-foreground mb-6 uppercase tracking-widest">
        Previsão de Receita
      </h3>
      
      <div className="mb-8">
        <p className="text-xs text-muted-foreground uppercase font-black mb-1">Valor Ponderado (Weighted)</p>
        <p className="text-4xl font-black text-primary">R$ {weightedValue.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">Baseado na probabilidade de cada lead.</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              🔥 Alta Probabilidade (80-100%)
            </span>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{breakdown.high.count} leads</span>
          </div>
          <p className="text-xl font-black text-emerald-900 dark:text-emerald-300">R$ {breakdown.high.value.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
              🟡 Média Probabilidade (50-79%)
            </span>
            <span className="text-xs font-black text-amber-700 dark:text-amber-400">{breakdown.medium.count} leads</span>
          </div>
          <p className="text-xl font-black text-amber-900 dark:text-amber-300">R$ {breakdown.medium.value.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
              🔵 Baixa Probabilidade (0-49%)
            </span>
            <span className="text-xs font-black text-blue-700 dark:text-blue-400">{breakdown.low.count} leads</span>
          </div>
          <p className="text-xl font-black text-blue-900 dark:text-blue-300">R$ {breakdown.low.value.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Pessimista</p>
          <p className="text-xs font-black text-foreground">R$ {breakdown.high.value.toLocaleString()}</p>
        </div>
        <div className="text-center border-x border-border">
          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Realista</p>
          <p className="text-xs font-black text-primary">R$ {weightedValue.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Otimista</p>
          <p className="text-xs font-black text-foreground">R$ {(breakdown.high.value + breakdown.medium.value + breakdown.low.value).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};
