
import { useState, useEffect, useMemo } from 'react';
import { financeService } from '../services/financeService';
import { 
  FinanceTransaction, 
  FinanceBankAccount, 
  FinanceDashboardStats, 
  CashFlowEntry, 
  FinanceDashboardFilters 
} from '../types/finance';
import { calculateDashboardStats, calculateCashFlow } from '../utils/financeDashboardUtils';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const useFinanceDashboard = (workspaceId: string) => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinanceBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FinanceDashboardFilters>({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    mode: 'combined'
  });

  const loadData = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [txs, accounts] = await Promise.all([
        financeService.getTransactions(workspaceId),
        financeService.getBankAccounts(workspaceId)
      ]);
      setTransactions(txs);
      setBankAccounts(accounts);
      setError(null);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError('Erro ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const stats = useMemo(() => 
    calculateDashboardStats(transactions, bankAccounts, filters),
    [transactions, bankAccounts, filters]
  );

  const cashFlow = useMemo(() => 
    calculateCashFlow(transactions, bankAccounts, filters),
    [transactions, bankAccounts, filters]
  );

  return {
    transactions,
    bankAccounts,
    loading,
    error,
    filters,
    setFilters,
    stats,
    cashFlow,
    refresh: loadData
  };
};
