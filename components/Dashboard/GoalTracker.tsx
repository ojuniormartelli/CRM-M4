
import React from 'react';
import { Lead, Pipeline } from '../../types';
import { goalsUtils } from '../../utils/goals';

interface GoalTrackerProps {
  leads: Lead[];
  pipelines: Pipeline[];
  monthlyGoal: number;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({
  leads,
  pipelines,
  monthlyGoal
}) => {
  const progress = goalsUtils.getMonthlyGoalProgress(leads, pipelines, monthlyGoal);
  const leadsNeeded = goalsUtils.getLeadsNeededForGoal(leads, pipelines, monthlyGoal);
  const burnRate = goalsUtils.getDailyBurnRate(leads, pipelines, monthlyGoal);
  const projection = goalsUtils.getGoalProjection(leads, pipelines, monthlyGoal);

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
      <h3 className="text-lg font-black text-foreground mb-6 uppercase tracking-widest">
        Meta Mensal
      </h3>
      
      {/* Barra de progresso */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-3xl font-black text-foreground">
              R$ {progress.current.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              de R$ {progress.goal.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-primary">
              {progress.progress.toFixed(0)}%
            </p>
          </div>
        </div>
        
        <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(progress.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Cards de informação */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 p-4 rounded-xl">
          <p className="text-xs text-muted-foreground uppercase font-black mb-1">
            Faltam
          </p>
          <p className="text-lg font-black text-foreground">
            R$ {progress.remaining.toLocaleString()}
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-xl">
          <p className="text-xs text-muted-foreground uppercase font-black mb-1">
            Leads Necessários
          </p>
          <p className="text-lg font-black text-foreground">
            {leadsNeeded}
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-xl">
          <p className="text-xs text-muted-foreground uppercase font-black mb-1">
            Dias Restantes
          </p>
          <p className="text-lg font-black text-foreground">
            {burnRate.daysRemaining}
          </p>
        </div>

        <div className={`bg-muted/50 p-4 rounded-xl ${
          burnRate.isViable ? 'border-2 border-emerald-500' : 'border-2 border-red-500'
        }`}>
          <p className="text-xs text-muted-foreground uppercase font-black mb-1">
            Ritmo/Dia
          </p>
          <p className="text-lg font-black text-foreground">
            R$ {burnRate.dailyRate.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Projeção */}
      <div className={`mt-4 p-4 rounded-xl ${
        projection.willAchieve 
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30'
          : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30'
      }`}>
        <p className="text-xs uppercase font-black mb-1 text-muted-foreground">
          Projeção (baseado no ritmo atual)
        </p>
        <p className={`text-xl font-black ${
          projection.willAchieve ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
        }`}>
          R$ {projection.projected.toLocaleString()}
          <span className="text-sm ml-2">
            ({projection.confidence.toFixed(0)}% da meta)
          </span>
        </p>
        <p className="text-xs mt-1 text-muted-foreground">
          {projection.willAchieve ? '✓ Você vai bater a meta!' : '⚠️ Acelere o ritmo!'}
        </p>
      </div>
    </div>
  );
};
