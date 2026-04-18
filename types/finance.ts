
export enum FinanceTransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
  REVENUE = 'income',
  DESPESA = 'expense',
  TRANSFERENCIA = 'transfer'
}

export enum FinanceTransactionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  RECEIVED = 'paid',
  OVERDUE = 'overdue',
  TO_RECEIVE = 'pending',
  TO_PAY = 'pending',
  CONFIRMED = 'paid',
  DRAFT = 'draft',
  CANCELED = 'canceled'
}

export enum FinanceBankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  INVESTMENT = 'investment',
  CASH = 'cash',
  CREDIT = 'credit',
  CREDIT_ACCOUNT = 'credit_account'
}

export enum FinanceCategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  BOTH = 'both'
}

export enum FinanceCounterpartyType {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  EMPLOYEE = 'employee',
  OTHER = 'other',
  SUPPLIER = 'supplier',
  PARTNER = 'partner'
}

export enum FinanceClassificationType {
  VARIABLE_COST = 'variable_cost',
  FIXED_COST = 'fixed_cost',
  REVENUE = 'revenue',
  INVESTMENT = 'investment',
  TAX = 'tax',
  OPERATIONAL = 'operational',
  NON_OPERATIONAL = 'non_operational',
  FINANCIAL = 'financial'
}

export interface FinanceCategory {
  id: string;
  workspace_id: string;
  name: string;
  type: FinanceTransactionType | string;
  color?: string;
  icon?: string;
  is_active: boolean;
  parent_id?: string;
  level?: number;
  order?: number;
  impacts_dre?: boolean;
  dre_group?: string;
  classification_type?: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceBankAccount {
  id: string;
  workspace_id: string;
  name: string;
  type: FinanceBankAccountType | string;
  institution?: string;
  bank?: string;
  balance: number;
  current_balance?: number;
  initial_balance?: number;
  initial_balance_date?: string;
  currency?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: string;
  workspace_id: string;
  description: string;
  amount: any;
  type: FinanceTransactionType | string;
  category_id: string;
  bank_account_id: string;
  destination_bank_account_id?: string;
  status: FinanceTransactionStatus | string;
  issue_date: string;
  competence_date: string;
  due_date: string;
  paid_at?: string;
  paid_date?: string;
  date?: string;
  notes?: string;
  attachments?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  
  // Recurrence & Projection
  is_projected?: boolean;
  is_recurring?: boolean;
  recurring_id?: string;
  parent_transaction_id?: string;
  recurrence?: any;
  recurrence_type?: string;
  recurrence_pattern?: string;
  recurrence_unit?: string;
  recurrence_frequency?: string;
  recurrence_interval?: any;
  recurrence_day_of_month?: any;
  recurrence_day_of_week?: any;
  recurrence_month?: any;
  recurrence_end_date?: string;
  recurrence_occurrences?: number;
  
  // Relations
  category?: any;
  bank_account?: any;
  client_account_id?: string;
  credit_card_id?: string;
  counterparty_id?: string;
  cost_center_id?: string;
  lead_id?: string;
  company_id?: string;
  payment_method?: string;
  counterparty?: any;
}

export interface FinanceCostCenter {
  id: string;
  workspace_id: string;
  name: string;
  code?: string;
  description?: string;
  order?: number;
  is_active: boolean;
  created_at: string;
}

export interface FinanceCounterparty {
  id: string;
  workspace_id: string;
  name: string;
  type: FinanceCounterpartyType | string;
  document?: string;
  email?: string;
  phone?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface FinanceDreLine {
  id: string;
  name?: string;
  label?: string;
  type?: 'group' | 'account' | string;
  level?: number;
  values?: Record<string, number>;
  total?: number;
  amount?: number;
  comparisonAmount?: number;
  percentageChange?: number;
  isSubtotal?: boolean;
  categoryIds?: string[];
  is_percentage?: boolean;
  parent_id?: string;
  group?: string;
}

export interface FinanceBudget {
  id: string;
  workspace_id: string;
  name: string;
  year: number;
  scenario: FinanceBudgetScenario | string;
  items: any[];
  amount?: number;
  dre_group?: string;
  period?: string;
  category_id?: string;
  cost_center_id?: string;
  created_at: string;
}

export interface CashFlowEntry {
  date: string;
  type?: string;
  inflow?: number;
  outflow?: number;
  balance?: number;
  projected_balance?: number;
  entries?: number;
  exits?: number;
  result?: number;
  accumulated?: number;
}

export interface FinanceDashboardStats {
  total_income?: number;
  total_expense?: number;
  net_balance?: number;
  projected_income?: number;
  projected_expense?: number;
  cash_balance?: number;
  overdueCount?: number;
  overdueAmount?: number;
  next7DaysAmount?: number;
  consolidatedBalance?: number;
  realizedIncome?: number;
  realizedExpense?: number;
  realizedResult?: number;
  projectedResult?: number;
  projectedIncome?: number;
  projectedExpense?: number;
  topExpenseCategory?: any;
  topIncomeCategory?: any;
}

export interface FinanceDashboardFilters {
  start_date?: string;
  end_date?: string;
  startDate?: string;
  endDate?: string;
  bank_account_ids?: string[];
  bankAccountId?: string | string[];
  category_ids?: string[];
  categoryId?: string | string[];
  cost_center_ids?: string[];
  costCenterId?: string | string[];
  mode?: string;
}

export interface FinanceKpiData {
  label?: string;
  value?: number;
  previous_value?: number;
  change_percentage?: number;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'good' | 'warning' | 'critical';
  grossMargin?: number;
  ebitdaMargin?: number;
  netMargin?: number;
  breakEvenPoint?: number;
  revenueGrowth?: number;
  burnRate?: number;
  runway?: number;
  netProfitGrowth?: number;
}

export interface FinanceAlert {
  id: string;
  type?: 'overdue' | 'low_balance' | 'budget_exceeded' | string;
  title?: string;
  message?: string;
  severity?: 'info' | 'warning' | 'error' | string;
  value?: any;
  percentage?: number;
  created_at?: string;
}

export interface ClientAccount {
  id: string;
  workspace_id: string;
  name: string;
  balance: number;
  lead_id?: string;
  company_id?: string;
  status?: string;
  service_type?: string;
  service_name?: string;
  start_date?: string;
  end_date?: string;
  billing_model?: string;
  monthly_value?: number;
  notes?: string;
  due_day?: number;
  company?: any;
  created_at: string;
}

export interface CreditCard {
  id: string;
  workspace_id: string;
  name: string;
  limit: number;
  limit_amount?: number;
  closing_day: number;
  due_day: number;
  created_at: string;
}

export type FinanceBudgetScenario = 'planned' | 'actual' | 'forecast' | 'realistic' | 'optimistic' | 'pessimistic';
export type FinanceDreMode = 'monthly' | 'quarterly' | 'yearly' | 'competence' | 'cash';
export type FinanceDreComparisonMode = 'none' | 'previous_period' | 'previous_year' | 'budget';

// Aliases for compatibility
export type Transaction = FinanceTransaction;
export type BankAccount = FinanceBankAccount;
export type PaymentMethod = any;
export type FinancePaymentMethod = any;
export type FinanceDreData = any;
export type FinanceClassificationTypeAlias = any;
export type FinanceCategoryTypeAlias = any;
export type FinanceCounterpartyTypeAlias = any;
