
import { 
  FinanceTransaction, 
  FinanceBankAccount, 
  FinanceDashboardStats, 
  CashFlowEntry, 
  FinanceDashboardFilters,
  FinanceTransactionType,
  FinanceTransactionStatus
} from '../types/finance';
import { startOfDay, endOfDay, isWithinInterval, parseISO, addDays, format, isAfter, isBefore } from 'date-fns';

export const calculateDashboardStats = (
  transactions: FinanceTransaction[],
  bankAccounts: FinanceBankAccount[],
  filters: FinanceDashboardFilters
): FinanceDashboardStats => {
  const startDate = startOfDay(parseISO(filters.startDate));
  const endDate = endOfDay(parseISO(filters.endDate));
  const today = startOfDay(new Date());
  const next7Days = endOfDay(addDays(today, 7));

  let consolidatedBalance = bankAccounts.reduce((acc, curr) => acc + Number(curr.current_balance), 0);
  
  let realizedIncome = 0;
  let realizedExpense = 0;
  let projectedIncome = 0;
  let projectedExpense = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let next7DaysAmount = 0;

  const categoryTotals: Record<string, { name: string, income: number, expense: number }> = {};

  transactions.forEach(t => {
    const amount = Number(t.amount);
    const dueDate = parseISO(t.due_date);
    const paidDate = t.paid_at ? parseISO(t.paid_at) : null;
    const isIncome = t.type === FinanceTransactionType.INCOME;
    const isExpense = t.type === FinanceTransactionType.EXPENSE;

    // Filter by bank account if specified
    if (filters.bankAccountId && t.bank_account_id !== filters.bankAccountId) return;
    
    // Filter by category if specified
    if (filters.categoryId && t.category_id !== filters.categoryId) return;

    // Filter by cost center if specified
    if (filters.costCenterId && t.cost_center_id !== filters.costCenterId) return;

    // Realized (Paid)
    if (paidDate && isWithinInterval(paidDate, { start: startDate, end: endDate })) {
      if (isIncome) realizedIncome += amount;
      if (isExpense) realizedExpense += amount;
    }

    // Projected (Pending or Due in period)
    if (t.status === FinanceTransactionStatus.PENDING) {
      if (isWithinInterval(dueDate, { start: startDate, end: endDate })) {
        if (isIncome) projectedIncome += amount;
        if (isExpense) projectedExpense += amount;
      }

      // Overdue
      if (isBefore(dueDate, today)) {
        overdueCount++;
        overdueAmount += amount;
      }

      // Next 7 days
      if (isWithinInterval(dueDate, { start: today, end: next7Days })) {
        next7DaysAmount += amount;
      }
    }

    // Category aggregation for top categories
    if (t.category) {
      if (!categoryTotals[t.category.id]) {
        categoryTotals[t.category.id] = { name: t.category.name, income: 0, expense: 0 };
      }
      if (paidDate && isWithinInterval(paidDate, { start: startDate, end: endDate })) {
        if (isIncome) categoryTotals[t.category.id].income += amount;
        if (isExpense) categoryTotals[t.category.id].expense += amount;
      }
    }
  });

  const topExpenseCategory = Object.values(categoryTotals)
    .filter(c => c.expense > 0)
    .sort((a, b) => b.expense - a.expense)[0];

  const topIncomeCategory = Object.values(categoryTotals)
    .filter(c => c.income > 0)
    .sort((a, b) => b.income - a.income)[0];

  return {
    consolidatedBalance,
    realizedIncome,
    realizedExpense,
    realizedResult: realizedIncome - realizedExpense,
    projectedIncome,
    projectedExpense,
    projectedResult: projectedIncome - projectedExpense,
    overdueCount,
    overdueAmount,
    next7DaysAmount,
    topExpenseCategory: topExpenseCategory ? { name: topExpenseCategory.name, amount: topExpenseCategory.expense } : undefined,
    topIncomeCategory: topIncomeCategory ? { name: topIncomeCategory.name, amount: topIncomeCategory.income } : undefined
  };
};

export const calculateCashFlow = (
  transactions: FinanceTransaction[],
  bankAccounts: FinanceBankAccount[],
  filters: FinanceDashboardFilters
): CashFlowEntry[] => {
  const startDate = startOfDay(parseISO(filters.startDate));
  const endDate = endOfDay(parseISO(filters.endDate));
  const entries: Record<string, CashFlowEntry> = {};

  // Initialize daily entries
  let current = startDate;
  while (isBefore(current, endDate) || current.getTime() === endDate.getTime()) {
    const dateStr = format(current, 'yyyy-MM-dd');
    entries[dateStr] = {
      date: dateStr,
      entries: 0,
      exits: 0,
      result: 0,
      accumulated: 0,
      type: isAfter(current, new Date()) ? 'projected' : 'realized'
    };
    current = addDays(current, 1);
  }

  // Calculate daily totals
  transactions.forEach(t => {
    const amount = Number(t.amount);
    const isIncome = t.type === FinanceTransactionType.INCOME;
    const isExpense = t.type === FinanceTransactionType.EXPENSE;
    
    if (filters.bankAccountId && t.bank_account_id !== filters.bankAccountId) return;

    if (t.paid_at) {
      const dateStr = format(parseISO(t.paid_at), 'yyyy-MM-dd');
      if (entries[dateStr]) {
        if (isIncome) entries[dateStr].entries += amount;
        if (isExpense) entries[dateStr].exits += amount;
      }
    } else if (t.status === FinanceTransactionStatus.PENDING) {
      const dateStr = format(parseISO(t.due_date), 'yyyy-MM-dd');
      if (entries[dateStr]) {
        if (isIncome) entries[dateStr].entries += amount;
        if (isExpense) entries[dateStr].exits += amount;
      }
    }
  });

  // Calculate accumulated
  let accumulated = bankAccounts.reduce((acc, curr) => acc + Number(curr.current_balance), 0);
  // We need to adjust the initial accumulated based on transactions outside the filter if we want a true running balance,
  // but for simplicity and following the requirement of "saldo acumulado ao longo do tempo" in the period:
  
  const sortedEntries = Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));
  
  let runningBalance = accumulated; // Starting from current balance is tricky if we are looking at the past.
  // Better: calculate the balance at the start of the period.
  // Balance at Start = Current Balance - (Sum of all transactions between Start and Now)
  
  const now = new Date();
  let balanceAdjustment = 0;
  transactions.forEach(t => {
    const amount = Number(t.amount);
    const isIncome = t.type === FinanceTransactionType.INCOME;
    const isExpense = t.type === FinanceTransactionType.EXPENSE;
    const date = t.paid_at ? parseISO(t.paid_at) : null;

    if (date && isAfter(date, startDate)) {
      if (isIncome) balanceAdjustment += amount;
      if (isExpense) balanceAdjustment -= amount;
    }
  });

  runningBalance = accumulated - balanceAdjustment;

  return sortedEntries.map(entry => {
    entry.result = entry.entries - entry.exits;
    runningBalance += entry.result;
    entry.accumulated = runningBalance;
    return entry;
  });
};
