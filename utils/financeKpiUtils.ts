
import { 
  FinanceDreLine, 
  FinanceKpiData, 
  FinanceAlert, 
  FinanceBudget, 
  CashFlowEntry 
} from '../types/finance';

export const calculateKpis = (
  dreLines: FinanceDreLine[],
  comparisonDreLines: FinanceDreLine[] = [],
  cashFlow: CashFlowEntry[] = []
): FinanceKpiData => {
  const findAmount = (lines: FinanceDreLine[], id: string) => lines.find(l => l.id === id)?.amount || 0;

  const receitaLiquida = findAmount(dreLines, 'receita_liquida');
  const lucroBruto = findAmount(dreLines, 'lucro_bruto');
  const ebitda = findAmount(dreLines, 'ebitda');
  const lucroLiquido = findAmount(dreLines, 'lucro_liquido');

  const prevReceitaLiquida = findAmount(comparisonDreLines, 'receita_liquida');
  const prevLucroLiquido = findAmount(comparisonDreLines, 'lucro_liquido');

  // Margins
  const grossMargin = receitaLiquida !== 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
  const ebitdaMargin = receitaLiquida !== 0 ? (ebitda / receitaLiquida) * 100 : 0;
  const netMargin = receitaLiquida !== 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

  // Growth
  const revenueGrowth = prevReceitaLiquida !== 0 ? ((receitaLiquida - prevReceitaLiquida) / Math.abs(prevReceitaLiquida)) * 100 : 0;
  const netProfitGrowth = prevLucroLiquido !== 0 ? ((lucroLiquido - prevLucroLiquido) / Math.abs(prevLucroLiquido)) * 100 : 0;

  // Break-even (Simplified: Fixed Costs / Gross Margin %)
  // Fixed costs are usually Operational Expenses + Depreciation
  const fixedCosts = Math.abs(findAmount(dreLines, 'despesas_operacionais')) + Math.abs(findAmount(dreLines, 'depreciacao_amortizacao'));
  const breakEvenPoint = grossMargin !== 0 ? fixedCosts / (grossMargin / 100) : 0;

  // Burn Rate (Average negative cash flow in period)
  const negativeFlows = cashFlow.filter(c => c.result < 0);
  const burnRate = negativeFlows.length > 0 ? Math.abs(negativeFlows.reduce((acc, curr) => acc + curr.result, 0) / negativeFlows.length) : 0;

  // Runway (Current Balance / Burn Rate)
  const currentBalance = cashFlow.length > 0 ? cashFlow[cashFlow.length - 1].accumulated : 0;
  const runway = burnRate > 0 ? currentBalance / burnRate : undefined;

  return {
    grossMargin,
    ebitdaMargin,
    netMargin,
    breakEvenPoint,
    burnRate,
    runway,
    revenueGrowth,
    netProfitGrowth
  };
};

export const generateAlerts = (
  kpis: FinanceKpiData,
  budgets: FinanceBudget[],
  dreLines: FinanceDreLine[],
  cashFlow: CashFlowEntry[]
): FinanceAlert[] => {
  const alerts: FinanceAlert[] = [];

  // 1. Projected Negative Cash
  const negativeProjected = cashFlow.find(c => c.type === 'projected' && c.accumulated < 0);
  if (negativeProjected) {
    alerts.push({
      id: 'neg_cash',
      type: 'critical',
      title: 'Risco de Caixa Negativo',
      message: `Projeção indica saldo negativo em ${negativeProjected.date}.`,
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(negativeProjected.accumulated)
    });
  }

  // 2. Budget Deviation
  budgets.forEach(b => {
    const line = dreLines.find(l => l.group === b.dre_group || l.id === b.dre_group);
    if (line) {
      const isExpense = line.amount < 0;
      const deviation = line.amount - b.amount;
      const devPercent = b.amount !== 0 ? (Math.abs(deviation) / b.amount) * 100 : 0;

      if (isExpense && Math.abs(line.amount) > b.amount) {
        alerts.push({
          id: `budget_dev_${b.id}`,
          type: devPercent > 20 ? 'critical' : 'warning',
          title: `Orçamento Estourado: ${line.label}`,
          message: `Gasto acima do planejado em ${devPercent.toFixed(1)}%.`,
          percentage: devPercent
        });
      }
    }
  });

  // 3. Low Margins
  if (kpis.netMargin < 5 && kpis.netMargin > 0) {
    alerts.push({
      id: 'low_margin',
      type: 'warning',
      title: 'Margem Líquida Baixa',
      message: 'Sua margem líquida está abaixo de 5%. Considere revisar custos.',
      percentage: kpis.netMargin
    });
  } else if (kpis.netMargin < 0) {
    alerts.push({
      id: 'negative_margin',
      type: 'critical',
      title: 'Operação com Prejuízo',
      message: 'A margem líquida está negativa. A empresa está consumindo caixa.',
      percentage: kpis.netMargin
    });
  }

  return alerts;
};
