
import { User } from '../types';

export enum FinanceTransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment'
}

export enum FinanceTransactionStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELED = 'canceled'
}

export enum FinanceCategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  BOTH = 'both'
}

export enum FinanceClassificationType {
  OPERATIONAL = 'operacional',
  NON_OPERATIONAL = 'nao_operacional',
  FINANCIAL = 'financeiro',
  TAX = 'tributario'
}

export enum FinanceCounterpartyType {
  CUSTOMER = 'cliente',
  SUPPLIER = 'fornecedor',
  EMPLOYEE = 'colaborador',
  PARTNER = 'parceiro',
  OTHER = 'outro'
}

export enum FinanceBankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CASH = 'cash',
  CREDIT_ACCOUNT = 'credit_account',
  INVESTMENT = 'investment'
}

export interface FinanceCategory {
  id: string;
  workspace_id: string;
  name: string;
  type: FinanceCategoryType;
  parent_id?: string;
  level: number;
  order: number;
  is_active: boolean;
  impacts_dre: boolean;
  dre_group?: string;
  classification_type: FinanceClassificationType;
  created_at: string;
  updated_at: string;
}

export interface FinanceCostCenter {
  id: string;
  workspace_id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceCounterparty {
  id: string;
  workspace_id: string;
  name: string;
  type: FinanceCounterpartyType;
  document?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceBankAccount {
  id: string;
  workspace_id: string;
  name: string;
  bank?: string;
  type: FinanceBankAccountType;
  initial_balance: number;
  initial_balance_date: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  currency: string;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: string;
  workspace_id: string;
  type: FinanceTransactionType;
  status: FinanceTransactionStatus;
  description: string;
  amount: number;
  issue_date: string;
  due_date: string;
  paid_at?: string;
  competence_date: string;
  bank_account_id: string;
  destination_bank_account_id?: string; // For transfers
  counterparty_id?: string;
  category_id?: string;
  cost_center_id?: string;
  payment_method?: string;
  reference_code?: string;
  notes?: string;
  attachment_url?: string;
  is_recurring: boolean;
  recurrence_group_id?: string;
  recurrence_frequency?: 'weekly' | 'monthly' | 'yearly';
  recurrence_interval?: number;
  recurrence_end_date?: string;
  parent_transaction_id?: string;
  generation_mode?: 'manual' | 'automatic';
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  category?: FinanceCategory;
  bank_account?: FinanceBankAccount;
  counterparty?: FinanceCounterparty;
  cost_center?: FinanceCostCenter;
}

export interface FinanceDashboardStats {
  consolidatedBalance: number;
  realizedIncome: number;
  realizedExpense: number;
  realizedResult: number;
  projectedIncome: number;
  projectedExpense: number;
  projectedResult: number;
  overdueCount: number;
  overdueAmount: number;
  next7DaysAmount: number;
  topExpenseCategory?: { name: string; amount: number };
  topIncomeCategory?: { name: string; amount: number };
}

export interface CashFlowEntry {
  date: string;
  entries: number;
  exits: number;
  result: number;
  accumulated: number;
  type: 'realized' | 'projected';
}

export interface FinanceDashboardFilters {
  startDate: string;
  endDate: string;
  bankAccountId?: string;
  categoryId?: string;
  costCenterId?: string;
  mode: 'realized' | 'projected' | 'combined';
}

export type FinanceDreMode = 'competence' | 'cash';
export type FinanceDreComparisonMode = 'none' | 'previous_period' | 'previous_year';

export interface FinanceDreLine {
  id: string;
  label: string;
  group?: string;
  amount: number;
  comparisonAmount?: number;
  percentageChange?: number;
  isSubtotal: boolean;
  level: number;
  children?: FinanceDreLine[];
  categoryIds?: string[];
}

export interface FinanceDreData {
  lines: FinanceDreLine[];
  periodLabel: string;
  comparisonLabel?: string;
}

export type FinanceBudgetScenario = 'optimistic' | 'realistic' | 'pessimistic';

export interface FinanceBudget {
  id: string;
  workspace_id: string;
  category_id?: string;
  dre_group?: string;
  cost_center_id?: string;
  period: string; // YYYY-MM
  amount: number;
  scenario: FinanceBudgetScenario;
  created_at: string;
  updated_at: string;
}

export interface FinanceKpiData {
  grossMargin: number;
  ebitdaMargin: number;
  netMargin: number;
  breakEvenPoint: number;
  burnRate?: number;
  runway?: number;
  revenueGrowth: number;
  netProfitGrowth: number;
  ticketMedio?: number;
}

export interface FinanceAlert {
  id: string;
  type: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  value?: string;
  percentage?: number;
}
