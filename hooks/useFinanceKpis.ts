
import { useMemo } from 'react';
import { 
  FinanceDreLine, 
  FinanceBudget, 
  CashFlowEntry, 
  FinanceKpiData, 
  FinanceAlert 
} from '../types/finance';
import { calculateKpis, generateAlerts } from '../utils/financeKpiUtils';

export const useFinanceKpis = (
  dreLines: FinanceDreLine[],
  comparisonDreLines: FinanceDreLine[],
  cashFlow: CashFlowEntry[],
  budgets: FinanceBudget[]
) => {
  const kpis = useMemo(() => 
    calculateKpis(dreLines, comparisonDreLines, cashFlow),
    [dreLines, comparisonDreLines, cashFlow]
  );

  const alerts = useMemo(() => 
    generateAlerts(kpis, budgets, dreLines, cashFlow),
    [kpis, budgets, dreLines, cashFlow]
  );

  return {
    kpis,
    alerts
  };
};
