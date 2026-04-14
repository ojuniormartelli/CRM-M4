
import React from 'react';
import { FinanceKpiData } from '../../types/finance';
import { financeUtils } from '../../utils/financeUtils';
import { 
  Percent, 
  Target, 
  Flame, 
  Timer, 
  TrendingUp, 
  TrendingDown,
  Activity
} from 'lucide-react';

interface FinanceKpiCardsProps {
  kpis: FinanceKpiData;
}

const FinanceKpiCards: React.FC<FinanceKpiCardsProps> = ({ kpis }) => {
  const cards = [
    {
      title: 'Margem Bruta',
      value: `${kpis.grossMargin.toFixed(1)}%`,
      icon: Percent,
      color: 'blue',
      description: 'Eficiência de produção/serviço'
    },
    {
      title: 'Margem EBITDA',
      value: `${kpis.ebitdaMargin.toFixed(1)}%`,
      icon: Activity,
      color: 'indigo',
      description: 'Eficiência operacional'
    },
    {
      title: 'Margem Líquida',
      value: `${kpis.netMargin.toFixed(1)}%`,
      icon: TrendingUp,
      color: kpis.netMargin >= 10 ? 'emerald' : kpis.netMargin > 0 ? 'blue' : 'rose',
      description: 'Lucratividade final'
    },
    {
      title: 'Ponto de Equilíbrio',
      value: financeUtils.formatCurrency(kpis.breakEvenPoint),
      icon: Target,
      color: 'amber',
      description: 'Faturamento mínimo necessário'
    },
    {
      title: 'Crescimento Receita',
      value: `${kpis.revenueGrowth.toFixed(1)}%`,
      icon: kpis.revenueGrowth >= 0 ? TrendingUp : TrendingDown,
      color: kpis.revenueGrowth >= 0 ? 'emerald' : 'rose',
      description: 'Vs período anterior'
    },
    {
      title: 'Burn Rate',
      value: financeUtils.formatCurrency(kpis.burnRate || 0),
      icon: Flame,
      color: 'rose',
      description: 'Consumo médio de caixa'
    },
    {
      title: 'Runway',
      value: kpis.runway ? `${kpis.runway.toFixed(1)} meses` : 'N/A',
      icon: Timer,
      color: (kpis.runway || 0) < 3 ? 'rose' : 'blue',
      description: 'Duração do caixa atual'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div 
          key={index}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600`}>
              <card.icon size={20} />
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.title}</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {card.value}
            </h3>
            <p className="text-[10px] font-medium text-slate-400">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FinanceKpiCards;
