
import { useState, useEffect, useMemo } from 'react';
import { financeService } from '../services/financeService';
import { 
  FinanceTransaction, 
  FinanceDreLine, 
  FinanceDreMode, 
  FinanceDreComparisonMode,
  FinanceDreData
} from '../types/finance';
import { aggregateDreData, DRE_STRUCTURE } from '../utils/financeDreUtils';
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  subYears, 
  differenceInDays, 
  addDays, 
  startOfDay, 
  endOfDay,
  parseISO,
  format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useFinanceDre = (workspaceId: string) => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    mode: 'competence' as FinanceDreMode,
    comparisonMode: 'none' as FinanceDreComparisonMode,
    costCenterId: undefined as string | undefined
  });

  const loadData = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      // Fetch all transactions for the workspace. 
      // In a real production app with millions of records, we would fetch only the needed range.
      // But for the drill-down and comparison, we'll fetch a generous range or handle it in the service.
      // For now, let's fetch all and filter in memory as per current project pattern.
      const txs = await financeService.getTransactions(workspaceId);
      setTransactions(txs);
      setError(null);
    } catch (err: any) {
      console.error('Error loading DRE data:', err);
      setError('Erro ao carregar dados da DRE.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const dreData = useMemo(() => {
    const start = parseISO(filters.startDate);
    const end = parseISO(filters.endDate);
    
    // Filter transactions by cost center if applied
    const filteredTxs = filters.costCenterId 
      ? transactions.filter(t => t.cost_center_id === filters.costCenterId)
      : transactions;

    const currentTotals = aggregateDreData(filteredTxs, filters.mode, start, end);
    
    let comparisonTotals: Record<string, { amount: number }> | null = null;
    let comparisonLabel = '';

    if (filters.comparisonMode !== 'none') {
      let compStart: Date;
      let compEnd: Date;

      if (filters.comparisonMode === 'previous_period') {
        const days = differenceInDays(end, start) + 1;
        compStart = addDays(start, -days);
        compEnd = addDays(end, -days);
        comparisonLabel = 'Período Anterior';
      } else {
        compStart = subYears(start, 1);
        compEnd = subYears(end, 1);
        comparisonLabel = 'Ano Anterior';
      }

      comparisonTotals = aggregateDreData(filteredTxs, filters.mode, compStart, compEnd);
    }

    const lines: FinanceDreLine[] = DRE_STRUCTURE.map(item => {
      const current = currentTotals[item.id];
      const comparison = comparisonTotals ? comparisonTotals[item.id] : null;
      
      let percentageChange = undefined;
      if (comparison && comparison.amount !== 0) {
        percentageChange = ((current.amount - comparison.amount) / Math.abs(comparison.amount)) * 100;
      }

      return {
        id: item.id,
        label: item.label,
        amount: current.amount,
        comparisonAmount: comparison?.amount,
        percentageChange,
        isSubtotal: !!item.isSubtotal,
        level: item.isSubtotal ? 0 : 1,
        categoryIds: current.categoryIds
      };
    });

    return {
      lines,
      periodLabel: `${format(start, 'dd/MM/yy')} - ${format(end, 'dd/MM/yy')}`,
      comparisonLabel
    };
  }, [transactions, filters]);

  return {
    loading,
    error,
    filters,
    setFilters,
    dreData,
    transactions, // Exported for drill-down
    refresh: loadData
  };
};
