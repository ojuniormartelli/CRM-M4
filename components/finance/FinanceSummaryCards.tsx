
import React from 'react';
import { FinanceDashboardStats } from '../../types/finance';
import { financeUtils } from '../../utils/financeUtils';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Target
} from 'lucide-react';

interface FinanceSummaryCardsProps {
  stats: FinanceDashboardStats;
}

const FinanceSummaryCards: React.FC<FinanceSummaryCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Saldo Consolidado',
      value: stats.consolidatedBalance,
      icon: Wallet,
      color: 'blue',
      description: 'Total em todas as contas'
    },
    {
      title: 'Entradas Realizadas',
      value: stats.realizedIncome,
      icon: TrendingUp,
      color: 'emerald',
      description: 'Recebimentos confirmados'
    },
    {
      title: 'Saídas Realizadas',
      value: stats.realizedExpense,
      icon: TrendingDown,
      color: 'rose',
      description: 'Pagamentos confirmados'
    },
    {
      title: 'Resultado Realizado',
      value: stats.realizedResult,
      icon: Target,
      color: stats.realizedResult >= 0 ? 'emerald' : 'rose',
      description: 'Lucro/Prejuízo de caixa'
    },
    {
      title: 'Entradas Projetadas',
      value: stats.projectedIncome,
      icon: ArrowUpRight,
      color: 'blue',
      description: 'Previsão de recebimentos'
    },
    {
      title: 'Saídas Projetadas',
      value: stats.projectedExpense,
      icon: ArrowDownRight,
      color: 'amber',
      description: 'Previsão de pagamentos'
    },
    {
      title: 'Saldo Projetado',
      value: stats.consolidatedBalance + stats.projectedResult,
      icon: Calendar,
      color: 'indigo',
      description: 'Saldo final estimado'
    },
    {
      title: 'Contas Vencidas',
      value: stats.overdueAmount,
      icon: AlertCircle,
      color: 'rose',
      description: `${stats.overdueCount} lançamentos em atraso`,
      isAlert: stats.overdueCount > 0
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div 
          key={index}
          className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all ${
            card.isAlert ? 'ring-2 ring-rose-500/20 border-rose-100' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-${card.color}-50 dark:bg-${card.color}-900/20 text-${card.color}-600`}>
              <card.icon size={20} />
            </div>
            {card.isAlert && (
              <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                Alerta
              </span>
            )}
          </div>
          
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.title}</p>
            <h3 className={`text-xl font-black tracking-tight ${
              card.color === 'rose' && card.value > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'
            }`}>
              {financeUtils.formatCurrency(card.value)}
            </h3>
            <p className="text-[10px] font-medium text-slate-400">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FinanceSummaryCards;
