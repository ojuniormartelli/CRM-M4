
import { 
  FinanceTransaction, 
  FinanceDreLine, 
  FinanceDreMode, 
  FinanceTransactionType,
  FinanceTransactionStatus
} from '../types/finance';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export const DRE_STRUCTURE = [
  { id: 'receita_bruta', label: '1) Receita Bruta', groups: ['receita_bruta'] },
  { id: 'deducoes', label: '2) Deduções', groups: ['deducoes'] },
  { id: 'receita_liquida', label: '3) Receita Líquida', isSubtotal: true, formula: ['receita_bruta', 'deducoes'] },
  { id: 'custos', label: '4) Custos dos Serviços/Produtos', groups: ['custos'] },
  { id: 'lucro_bruto', label: '5) Lucro Bruto', isSubtotal: true, formula: ['receita_liquida', 'custos'] },
  { id: 'despesas_operacionais', label: '6) Despesas Operacionais', groups: ['despesas_operacionais'] },
  { id: 'ebitda', label: '7) EBITDA Gerencial', isSubtotal: true, formula: ['lucro_bruto', 'despesas_operacionais'] },
  { id: 'depreciacao_amortizacao', label: '8) Depreciação/Amortização', groups: ['depreciacao_amortizacao'] },
  { id: 'resultado_operacional', label: '9) Resultado Operacional', isSubtotal: true, formula: ['ebitda', 'depreciacao_amortizacao'] },
  { id: 'resultado_financeiro', label: '10) Resultado Financeiro', groups: ['resultado_financeiro'] },
  { id: 'resultado_antes_ir', label: '11) Resultado Antes do IR/CSLL', isSubtotal: true, formula: ['resultado_operacional', 'resultado_financeiro'] },
  { id: 'impostos_resultado', label: '12) Impostos sobre o Resultado', groups: ['impostos_resultado'] },
  { id: 'lucro_liquido', label: '13) Lucro Líquido', isSubtotal: true, formula: ['resultado_antes_ir', 'impostos_resultado'] },
];

export const aggregateDreData = (
  transactions: FinanceTransaction[],
  mode: FinanceDreMode,
  startDate: Date,
  endDate: Date
): Record<string, { amount: number, categoryIds: string[] }> => {
  const totals: Record<string, { amount: number, categoryIds: string[] }> = {};
  
  // Initialize totals
  DRE_STRUCTURE.forEach(item => {
    totals[item.id] = { amount: 0, categoryIds: [] };
  });

  transactions.forEach(t => {
    // Only consider transactions that impact DRE
    if (!t.category?.impacts_dre) return;
    
    // Ignore transfers
    if (t.type === FinanceTransactionType.TRANSFER) return;

    const dateStr = mode === 'competence' ? t.competence_date : t.paid_at;
    if (!dateStr) return;

    const date = parseISO(dateStr);
    if (!isWithinInterval(date, { start: startOfDay(startDate), end: endOfDay(endDate) })) return;

    const amount = Number(t.amount);
    const multiplier = t.type === FinanceTransactionType.EXPENSE ? -1 : 1;
    const finalAmount = amount * multiplier;

    const group = t.category.dre_group || (t.type === FinanceTransactionType.INCOME ? 'receita_bruta' : 'despesas_operacionais');
    
    // Find which DRE line this group belongs to
    const line = DRE_STRUCTURE.find(l => l.groups?.includes(group));
    if (line) {
      totals[line.id].amount += finalAmount;
      if (t.category_id && !totals[line.id].categoryIds.includes(t.category_id)) {
        totals[line.id].categoryIds.push(t.category_id);
      }
    }
  });

  // Calculate subtotals
  DRE_STRUCTURE.forEach(item => {
    if (item.isSubtotal && item.formula) {
      totals[item.id].amount = item.formula.reduce((acc, id) => acc + totals[id].amount, 0);
    }
  });

  return totals;
};

export const getTransactionsForCategory = (
  transactions: FinanceTransaction[],
  categoryIds: string[],
  mode: FinanceDreMode,
  startDate: Date,
  endDate: Date
): FinanceTransaction[] => {
  return transactions.filter(t => {
    if (!t.category_id || !categoryIds.includes(t.category_id)) return false;
    
    const dateStr = mode === 'competence' ? t.competence_date : t.paid_at;
    if (!dateStr) return false;

    const date = parseISO(dateStr);
    return isWithinInterval(date, { start: startOfDay(startDate), end: endOfDay(endDate) });
  });
};
