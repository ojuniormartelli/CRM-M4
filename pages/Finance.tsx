
import React, { useState, useMemo } from 'react';
import * as ICONS from 'lucide-react';
import { Transaction, BankAccount, CreditCard, ClientAccount, User, FinanceCategory, PaymentMethod } from '../types';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, addWeeks, addYears, addDays, isWithinInterval, isToday, isTomorrow, parseISO, isAfter, isSameDay, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mappers } from '../lib/mappers';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'motion/react';

interface FinanceProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  clientAccounts: ClientAccount[];
  financeCategories: FinanceCategory[];
  paymentMethods: PaymentMethod[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  setCreditCards: React.Dispatch<React.SetStateAction<CreditCard[]>>;
  currentUser?: User | null;
}

const Finance: React.FC<FinanceProps> = ({ 
  transactions, 
  bankAccounts, 
  creditCards, 
  clientAccounts,
  financeCategories,
  paymentMethods,
  setTransactions,
  setBankAccounts,
  setCreditCards,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'receivables' | 'payables' | 'cards'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // New states for transaction management
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    amount: 0,
    notes: ''
  });
  const [editTransaction, setEditTransaction] = useState<Partial<Transaction> & { updateScope?: 'single' | 'future' | 'all'; recurrence?: 'fixed' | 'variable'; months?: number | 'indefinite' }>({});
  const [isUpdateScopeModalOpen, setIsUpdateScopeModalOpen] = useState(false);
  const [isDeleteScopeModalOpen, setIsDeleteScopeModalOpen] = useState(false);

  const getRecurrenceSummary = (t: Partial<Transaction>) => {
    if (!t.is_recurring) return null;

    const interval = t.recurrence_interval || 1;
    const type = t.recurrence_type;
    const dayOfMonth = t.recurrence_day_of_month;
    const dayOfWeek = t.recurrence_day_of_week;
    const month = t.recurrence_month;
    const unit = t.recurrence_unit;

    const daysOfWeek = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const months = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

    if (type === 'monthly') {
      const intervalText = interval === 1 ? 'todo mês' : `a cada ${interval} meses`;
      return `Mensal: ${intervalText}, no dia ${dayOfMonth}`;
    }

    if (type === 'weekly' || type === 'quinzenal') {
      const intervalToUse = type === 'quinzenal' ? 2 : interval;
      const intervalText = intervalToUse === 1 ? 'toda' : `a cada ${intervalToUse} semanas, na`;
      const dayText = dayOfWeek !== undefined ? daysOfWeek[dayOfWeek] : 'dia selecionado';
      return `${type === 'quinzenal' ? 'Quinzenal' : 'Semanal'}: ${intervalText} ${dayText}`;
    }

    if (type === 'yearly') {
      const intervalText = interval === 1 ? 'todo ano' : `a cada ${interval} anos`;
      const dateText = (dayOfMonth && month) ? `em ${dayOfMonth}/${month.toString().padStart(2, '0')}` : 'na data selecionada';
      return `Anual: ${intervalText} ${dateText}`;
    }

    if (type === 'personalizado') {
      const unitMap: any = { days: 'dias', weeks: 'semanas', months: 'meses', years: 'anos' };
      return `Personalizado: A cada ${interval} ${unitMap[unit || 'days']}`;
    }

    return 'Configuração de recorrência';
  };
  
  // Date Filters
  const [dateRange, setDateRange] = useState<'current_month' | 'previous_month' | 'last_3_months' | 'next_3_months' | 'all' | 'custom'>('current_month');
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const generateProjections = (start: Date, end: Date) => {
    const projections: Transaction[] = [];
    
    // 1. Get all recurring transactions, grouped by recurring_id
    // We only want to project from the latest real transaction in each series
    const recurringGroups = new Map<string, Transaction>();
    transactions.filter(t => t.is_recurring && !t.is_projected).forEach(t => {
      const id = t.recurring_id || t.id;
      const existing = recurringGroups.get(id);
      if (!existing || isAfter(parseISO(t.date), parseISO(existing.date))) {
        recurringGroups.set(id, t);
      }
    });

    recurringGroups.forEach(baseTx => {
      let currentOccurrence = parseISO(baseTx.date);
      const interval = baseTx.recurrence_interval || 1;
      const unit = baseTx.recurrence_unit || 'months';
      const type = baseTx.recurrence_type;
      const endDate = baseTx.recurrence_end_date ? parseISO(baseTx.recurrence_end_date) : addMonths(new Date(), 12);
      
      // Limit projections to a reasonable future
      const maxFuture = addMonths(new Date(), 12);
      const effectiveEnd = end > maxFuture ? maxFuture : end;
      
      // Safety limit to avoid infinite loops
      let count = 0;
      const maxCount = 50;

      while (count < maxCount) {
        count++;
        let nextDate: Date;

        // Calculate next date based on type
        if (type === 'weekly' || type === 'semanal') {
          nextDate = addWeeks(currentOccurrence, interval);
          if (baseTx.recurrence_day_of_week !== undefined) {
            const currentDay = nextDate.getDay();
            const diff = baseTx.recurrence_day_of_week - currentDay;
            nextDate = addDays(nextDate, diff);
          }
        } else if (type === 'quinzenal') {
          nextDate = addWeeks(currentOccurrence, 2 * interval);
        } else if (type === 'monthly' || type === 'mensal') {
          nextDate = addMonths(currentOccurrence, interval);
          if (baseTx.recurrence_day_of_month) {
            const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
            const targetDay = Math.min(baseTx.recurrence_day_of_month, lastDay);
            nextDate.setDate(targetDay);
          }
        } else if (type === 'yearly' || type === 'anual') {
          nextDate = addYears(currentOccurrence, interval);
          if (baseTx.recurrence_month !== undefined) {
            nextDate.setMonth(baseTx.recurrence_month - 1);
          }
          if (baseTx.recurrence_day_of_month) {
            const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
            const targetDay = Math.min(baseTx.recurrence_day_of_month, lastDay);
            nextDate.setDate(targetDay);
          }
        } else if (type === 'personalizado' && unit) {
          if (unit === 'days') nextDate = addDays(currentOccurrence, interval);
          else if (unit === 'weeks') nextDate = addWeeks(currentOccurrence, interval);
          else if (unit === 'months') nextDate = addMonths(currentOccurrence, interval);
          else if (unit === 'years') nextDate = addYears(currentOccurrence, interval);
          else nextDate = addMonths(currentOccurrence, interval); // fallback
        } else {
          // Default to monthly if is_recurring is true but type is missing
          nextDate = addMonths(currentOccurrence, 1);
        }

        if (isAfter(nextDate, effectiveEnd) || isAfter(nextDate, endDate)) break;

        // Update currentOccurrence for next iteration
        currentOccurrence = nextDate;

        if (isAfter(nextDate, start) || isSameDay(nextDate, start)) {
          // Check if a real transaction already exists for this recurring_id and date
          const alreadyExists = transactions.find(t => 
            !t.is_projected &&
            (t.recurring_id === (baseTx.recurring_id || baseTx.id) || 
             (t.client_account_id === baseTx.client_account_id && t.description === baseTx.description)) &&
            (
              isSameDay(parseISO(t.date), nextDate) ||
              ((type?.includes('mon') || type?.includes('men')) ? 
                isSameMonth(parseISO(t.date), nextDate) && isSameYear(parseISO(t.date), nextDate) : false)
            )
          );

          if (!alreadyExists) {
            projections.push({
              id: `proj-${baseTx.id}-${nextDate.getTime()}`,
              description: baseTx.description,
              amount: baseTx.amount,
              type: baseTx.type,
              category: baseTx.category,
              status: baseTx.type === 'Receita' ? 'A Receber' : 'A Pagar',
              date: format(nextDate, 'yyyy-MM-dd'),
              due_date: format(nextDate, 'yyyy-MM-dd'),
              client_account_id: baseTx.client_account_id,
              bank_account_id: baseTx.bank_account_id,
              is_projected: true,
              is_recurring: true,
              recurring_id: baseTx.recurring_id || baseTx.id,
              created_at: new Date().toISOString()
            } as Transaction);
          }
        }
      }
    });

    return projections;
  };

  const filteredTransactions = useMemo(() => {
    let start = startOfMonth(new Date());
    let end = endOfMonth(new Date());

    if (dateRange === 'previous_month') {
      start = startOfMonth(subMonths(new Date(), 1));
      end = endOfMonth(subMonths(new Date(), 1));
    } else if (dateRange === 'last_3_months') {
      start = startOfMonth(subMonths(new Date(), 2));
      end = endOfMonth(new Date());
    } else if (dateRange === 'next_3_months') {
      start = startOfMonth(new Date());
      end = endOfMonth(addMonths(new Date(), 2));
    } else if (dateRange === 'custom') {
      start = parseISO(customStartDate);
      end = parseISO(customEndDate);
    } else if (dateRange === 'all') {
      const baseTransactions = [...transactions];
      const projections = generateProjections(startOfMonth(new Date()), addMonths(new Date(), 6));
      return [...baseTransactions, ...projections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const baseTransactions = transactions.filter(t => {
      const tDate = parseISO(t.date);
      return isWithinInterval(tDate, { start, end });
    });

    const projections = generateProjections(start, end);
    
    return [...baseTransactions, ...projections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, clientAccounts, dateRange, customStartDate, customEndDate]);

  const [newTransaction, setNewTransaction] = useState<Partial<Transaction> & { to_bank_account_id?: string; recurrence?: 'fixed' | 'variable'; months?: number | 'indefinite' }>({
    description: '',
    amount: 0,
    type: 'Receita',
    category: 'Mensalidade',
    status: 'Pendente',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'Boleto',
    bank_account_id: '',
    to_bank_account_id: '',
    credit_card_id: '',
    client_account_id: '',
    is_recurring: false,
    recurrence_type: 'monthly',
    recurrence_interval: 1,
    recurrence_day_of_month: new Date().getDate(),
    recurrence_day_of_week: new Date().getDay(),
    recurrence_month: new Date().getMonth() + 1,
    recurrence_unit: 'months',
    recurrence: 'fixed',
    months: 12
  });

  const [newBankAccount, setNewBankAccount] = useState<Partial<BankAccount>>({
    name: '',
    type: 'Corrente',
    balance: 0,
    currency: 'BRL'
  });

  const [newCreditCard, setNewCreditCard] = useState<Partial<CreditCard>>({
    name: '',
    limit_amount: 0,
    closing_day: 1,
    due_day: 10
  });

  const handleConfirmPayment = async () => {
    if (!selectedTransaction) return;
    if (!confirmData.accountId) {
      alert('Por favor, selecione uma conta de destino/origem.');
      return;
    }

    setIsSyncing(true);
    try {
      const isRevenue = selectedTransaction.type === 'Receita';
      const newStatus = isRevenue ? 'Recebido' : 'Pago';
      const amount = Number(confirmData.amount);

      // 1. Update Transaction with explicit whitelist
      const isRecurring = selectedTransaction.is_recurring;
      const updateData = {
        description: selectedTransaction.description,
        amount: Number(selectedTransaction.amount),
        type: selectedTransaction.type,
        category: selectedTransaction.category,
        status: newStatus,
        date: selectedTransaction.date,
        due_date: selectedTransaction.due_date,
        payment_method: selectedTransaction.payment_method,
        bank_account_id: confirmData.accountId,
        client_account_id: selectedTransaction.client_account_id || null,
        paid_date: new Date(confirmData.date).toISOString().split('T')[0],
        notes: confirmData.notes || selectedTransaction.notes,
        is_recurring: isRecurring,
        // Recurrence fields - explicitly nullified if is_recurring is false
        recurrence_type: isRecurring ? selectedTransaction.recurrence_type : null,
        recurrence: isRecurring ? selectedTransaction.recurrence : null,
        recurrence_interval: isRecurring ? selectedTransaction.recurrence_interval : null,
        recurrence_day_of_month: isRecurring ? selectedTransaction.recurrence_day_of_month : null,
        recurrence_day_of_week: isRecurring ? selectedTransaction.recurrence_day_of_week : null,
        recurrence_month: isRecurring ? selectedTransaction.recurrence_month : null,
        recurrence_unit: isRecurring ? selectedTransaction.recurrence_unit : null,
        recurrence_end_date: isRecurring ? selectedTransaction.recurrence_end_date : null,
        recurring_id: isRecurring ? selectedTransaction.recurring_id : null,
        edit_history: (selectedTransaction.edit_history || '') + (selectedTransaction.edit_history ? '\n' : '') + `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}: Marcado como ${newStatus}`,
        updated_at: new Date().toISOString()
      };

      let query;
      if (selectedTransaction.is_projected) {
        // If it's a projection, we insert it as a new transaction (realizing it)
        const insertData = {
          ...updateData,
          workspace_id: currentUser?.workspace_id,
          created_at: new Date().toISOString()
        };
        query = supabase.from('m4_transactions').insert([insertData]);
      } else {
        query = supabase.from('m4_transactions').update(updateData).eq('id', selectedTransaction.id);
      }

      const { data: updatedTx, error: txError } = await query.select();

      if (txError) throw txError;

      // 2. Update Bank Account Balance
      const account = bankAccounts.find(a => a.id === confirmData.accountId);
      if (account) {
        const newBalance = isRevenue 
          ? Number(account.balance) + amount
          : Number(account.balance) - amount;
        
        const { error: accError } = await supabase
          .from('m4_bank_accounts')
          .update({ balance: newBalance })
          .eq('id', account.id);
          
        if (accError) throw accError;
          
        setBankAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
      }

      if (updatedTx) {
        if (selectedTransaction.is_projected) {
          setTransactions(prev => [...prev, updatedTx[0]]);
        } else {
          setTransactions(prev => prev.map(t => t.id === selectedTransaction.id ? updatedTx[0] : t));
        }
      }

      setIsConfirmModalOpen(false);
      setIsDetailOpen(false);
      setSelectedTransaction(null);
    } catch (err: any) {
      console.error('Erro ao confirmar pagamento:', err);
      alert('Erro ao processar: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateTransaction = async (e?: React.FormEvent, scope?: 'single' | 'future' | 'all') => {
    if (e) e.preventDefault();
    if (!selectedTransaction) return;

    // If it's recurring and no scope is provided, open the scope modal
    if (selectedTransaction.recurring_id && !scope) {
      setIsUpdateScopeModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      // 🛡️ RECALCULAR SALDOS (Se alterou valor ou conta em transação PAGA)
      const isPaid = selectedTransaction.status === 'Pago' || selectedTransaction.status === 'Recebido' || selectedTransaction.status === 'Confirmado';
      const newStatus = editTransaction.status || selectedTransaction.status;
      const isStillPaid = newStatus === 'Pago' || newStatus === 'Recebido' || newStatus === 'Confirmado';

      // Gerar Histórico de Edição
      const changes: string[] = [];
      if (selectedTransaction.description !== editTransaction.description && editTransaction.description !== undefined) 
        changes.push(`Descrição: "${selectedTransaction.description}" para "${editTransaction.description}"`);
      if (Number(selectedTransaction.amount) !== Number(editTransaction.amount) && editTransaction.amount !== undefined) 
        changes.push(`Valor: R$ ${selectedTransaction.amount} para R$ ${editTransaction.amount}`);
      if (selectedTransaction.due_date !== editTransaction.due_date && editTransaction.due_date !== undefined) 
        changes.push(`Vencimento: ${selectedTransaction.due_date} para ${editTransaction.due_date}`);
      if (selectedTransaction.bank_account_id !== editTransaction.bank_account_id && editTransaction.bank_account_id !== undefined) 
        changes.push(`Conta trocada`);
      
      let newHistory = selectedTransaction.edit_history || '';
      if (changes.length > 0) {
        const logEntry = `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}: ${changes.join(' | ')}`;
        newHistory = newHistory ? `${newHistory}\n${logEntry}` : logEntry;
      }

      // 🛡️ WHITELIST PAYLOAD (BLINDAGEM)
      const updateData = {
        ...mappers.transaction(editTransaction, currentUser?.workspace_id),
        edit_history: newHistory,
        updated_at: new Date().toISOString(),
        updated_by: currentUser?.id
      };

      // Se a transação antiga estava paga, vamos reverter o saldo antigo
      if (isPaid) {
        const oldAccId = selectedTransaction.bank_account_id;
        const oldAcc = bankAccounts.find(a => a.id === oldAccId);
        if (oldAcc) {
          const oldAmount = Number(selectedTransaction.amount);
          const revertedBalance = selectedTransaction.type === 'Receita' 
            ? Number(oldAcc.balance) - oldAmount 
            : Number(oldAcc.balance) + oldAmount;
          
          await supabase.from('m4_bank_accounts').update({ balance: revertedBalance }).eq('id', oldAcc.id);
          // Atualiza estado local temporariamente (será sobrescrito se aplicarmos o novo saldo logo abaixo)
          setBankAccounts(prev => prev.map(a => a.id === oldAcc.id ? { ...a, balance: revertedBalance } : a));
          
          // Se a nova também está paga (que é o caso comum ao editar um valor), aplicamos o novo saldo
          if (isStillPaid) {
            const newAccId = updateData.bank_account_id || selectedTransaction.bank_account_id;
            // Pegamos o status atualizado do banco de contas para garantir consistência se a conta for a mesma
            const currentAccs = [...bankAccounts];
            const accIndex = currentAccs.findIndex(a => a.id === newAccId);
            if (accIndex !== -1) {
              const targetAcc = { ...currentAccs[accIndex] };
              // Se a conta for a mesma, o balance já foi revertido no passo anterior
              const baseBalance = newAccId === oldAccId ? revertedBalance : Number(targetAcc.balance);
              const newAmount = Number(updateData.amount !== undefined ? updateData.amount : selectedTransaction.amount);
              
              const finalBalance = (updateData.type || selectedTransaction.type) === 'Receita'
                ? baseBalance + newAmount
                : baseBalance - newAmount;

              await supabase.from('m4_bank_accounts').update({ balance: finalBalance }).eq('id', targetAcc.id);
              setBankAccounts(prev => prev.map(a => a.id === targetAcc.id ? { ...a, balance: finalBalance } : a));
            }
          }
        }
      } else if (isStillPaid) {
        // Se NÃO estava paga, mas AGORA está (ex: editou status para "Pago" no modal de edição)
        const newAccId = updateData.bank_account_id || selectedTransaction.bank_account_id;
        const targetAcc = bankAccounts.find(a => a.id === newAccId);
        if (targetAcc) {
          const newAmount = Number(updateData.amount !== undefined ? updateData.amount : selectedTransaction.amount);
          const finalBalance = (updateData.type || selectedTransaction.type) === 'Receita'
            ? Number(targetAcc.balance) + newAmount
            : Number(targetAcc.balance) - newAmount;

          await supabase.from('m4_bank_accounts').update({ balance: finalBalance }).eq('id', targetAcc.id);
          setBankAccounts(prev => prev.map(a => a.id === targetAcc.id ? { ...a, balance: finalBalance } : a));
        }
      }

      let query;
      if (selectedTransaction?.is_projected) {
        // If it's a projection, we insert it as a new transaction (realizing it)
        const insertData = {
          ...updateData,
          created_at: new Date().toISOString()
        };
        query = supabase.from('m4_transactions').insert([insertData]);
      } else {
        query = supabase.from('m4_transactions').update(updateData);
        if (scope === 'all' && selectedTransaction?.recurring_id) {
          query = query.eq('recurring_id', selectedTransaction.recurring_id).neq('status', 'Pago').neq('status', 'Recebido');
        } else if (scope === 'future' && selectedTransaction?.recurring_id) {
          query = query.eq('recurring_id', selectedTransaction.recurring_id).gte('date', selectedTransaction.date);
        } else if (selectedTransaction?.id) {
          query = query.eq('id', selectedTransaction.id);
        }
      }

      const { data, error } = await query.select();

      if (error) throw error;
      if (data) {
        if (selectedTransaction.is_projected) {
          setTransactions(prev => [...prev, ...data]);
        } else {
          setTransactions(prev => {
            return prev.map(t => {
              const updated = data.find(d => d.id === t.id);
              return updated ? updated : t;
            });
          });
        }
        setIsEditModalOpen(false);
        setIsUpdateScopeModalOpen(false);
        setIsDetailOpen(false);
        setSelectedTransaction(null);
      }
    } catch (err: any) {
      console.error('Erro ao atualizar lançamento:', err);
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteTransaction = async (scope?: 'single' | 'future' | 'all') => {
    if (!selectedTransaction) return;

    if (selectedTransaction.is_projected) {
      // If it's a projection, just close the modal (it's not in DB)
      setIsDeleteModalOpen(false);
      setIsDeleteScopeModalOpen(false);
      setIsDetailOpen(false);
      setSelectedTransaction(null);
      return;
    }

    // If it's recurring and no scope is provided, open the scope modal
    if (selectedTransaction.recurring_id && !scope) {
      setIsDeleteScopeModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      // Revert balance if paid/received (only for the single transaction being deleted)
      if (selectedTransaction.status === 'Pago' || selectedTransaction.status === 'Recebido') {
        const accountId = selectedTransaction.bank_account_id;
        if (accountId) {
          const account = bankAccounts.find(a => a.id === accountId);
          if (account) {
            const amount = Number(selectedTransaction.amount);
            const newBalance = selectedTransaction.type === 'Receita'
              ? Number(account.balance) - amount
              : Number(account.balance) + amount;
            
            await supabase
              .from('m4_bank_accounts')
              .update({ balance: newBalance })
              .eq('id', account.id);
            
            setBankAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
          }
        }
      }

      // Delete from Supabase
      let query = supabase.from('m4_transactions').delete();

      if (scope === 'all') {
        query = query.eq('recurring_id', selectedTransaction.recurring_id).neq('status', 'Pago').neq('status', 'Recebido');
      } else if (scope === 'future') {
        query = query.eq('recurring_id', selectedTransaction.recurring_id).gte('date', selectedTransaction.date).neq('status', 'Pago').neq('status', 'Recebido');
      } else {
        query = query.eq('id', selectedTransaction.id);
      }

      const { error } = await query;

      if (error) throw error;

      setTransactions(prev => {
        if (scope === 'all') {
          return prev.filter(t => t.recurring_id !== selectedTransaction.recurring_id || t.status === 'Pago' || t.status === 'Recebido');
        } else if (scope === 'future') {
          return prev.filter(t => t.recurring_id !== selectedTransaction.recurring_id || t.date < selectedTransaction.date || t.status === 'Pago' || t.status === 'Recebido');
        } else {
          return prev.filter(t => t.id !== selectedTransaction.id);
        }
      });

      setIsDeleteModalOpen(false);
      setIsDeleteScopeModalOpen(false);
      setIsDetailOpen(false);
      setSelectedTransaction(null);
    } catch (err: any) {
      console.error('Erro ao excluir lançamento:', err);
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      if (newTransaction.type === 'Transferência') {
        if (!newTransaction.bank_account_id || !newTransaction.to_bank_account_id) {
          alert("Selecione as contas de origem e destino.");
          return;
        }

        const fromAccount = bankAccounts.find(a => a.id === newTransaction.bank_account_id);
        const toAccount = bankAccounts.find(a => a.id === newTransaction.to_bank_account_id);

        if (!fromAccount || !toAccount) return;

        const description = `Transferência: ${fromAccount.name} → ${toAccount.name}`;
        const amount = Number(newTransaction.amount);

        // 1. Create Outgoing Transaction
        const outData = {
          description,
          amount,
          type: 'Despesa',
          category: 'Transferência',
          status: 'Confirmado',
          date: newTransaction.date,
          due_date: newTransaction.date,
          bank_account_id: fromAccount.id,
          workspace_id: currentUser?.workspace_id
        };

        // 2. Create Incoming Transaction
        const inData = {
          description,
          amount,
          type: 'Receita',
          category: 'Transferência',
          status: 'Confirmado',
          date: newTransaction.date,
          due_date: newTransaction.date,
          bank_account_id: toAccount.id,
          workspace_id: currentUser?.workspace_id
        };

        const { data: res, error: err } = await supabase.from('m4_transactions').insert([outData, inData]).select();
        
        if (!err && res) {
          setTransactions(prev => [...prev, ...res]);
          
          // Update Balances
          const newFromBalance = Number(fromAccount.balance) - amount;
          const newToBalance = Number(toAccount.balance) + amount;
          
          await supabase.from('m4_bank_accounts').update({ balance: newFromBalance }).eq('id', fromAccount.id);
          await supabase.from('m4_bank_accounts').update({ balance: newToBalance }).eq('id', toAccount.id);
          
          setBankAccounts(prev => prev.map(a => {
            if (a.id === fromAccount.id) return { ...a, balance: newFromBalance };
            if (a.id === toAccount.id) return { ...a, balance: newToBalance };
            return a;
          }));
        }
      } else {
        const transactionsToCreate: any[] = [];
        const isRecurring = newTransaction.is_recurring;
        const recurringId = isRecurring ? crypto.randomUUID() : null;
        const numMonths = newTransaction.months === 'indefinite' ? 24 : (newTransaction.months || 1);

        const baseDate = parseISO(newTransaction.date || new Date().toISOString().split('T')[0]);
        const baseDueDate = parseISO(newTransaction.due_date || new Date().toISOString().split('T')[0]);

        for (let i = 0; i < (isRecurring ? numMonths : 1); i++) {
          const currentDate = new Date(baseDate);
          const currentDueDate = new Date(baseDueDate);

          if (isRecurring) {
            const interval = newTransaction.recurrence_interval || 1;
            
            if (newTransaction.recurrence_type === 'monthly') {
              const monthsToAdd = i * interval;
              currentDate.setMonth(baseDate.getMonth() + monthsToAdd);
              currentDueDate.setMonth(baseDueDate.getMonth() + monthsToAdd);
              
              if (newTransaction.recurrence_day_of_month) {
                currentDate.setDate(newTransaction.recurrence_day_of_month);
                currentDueDate.setDate(newTransaction.recurrence_day_of_month);
              }
            } else if (newTransaction.recurrence_type === 'weekly' || newTransaction.recurrence_type === 'quinzenal') {
              const intervalToUse = newTransaction.recurrence_type === 'quinzenal' ? 2 : interval;
              const weeksToAdd = i * intervalToUse;
              currentDate.setDate(baseDate.getDate() + (weeksToAdd * 7));
              currentDueDate.setDate(baseDueDate.getDate() + (weeksToAdd * 7));

              if (newTransaction.recurrence_day_of_week !== undefined) {
                const currentDay = currentDate.getDay();
                const diff = newTransaction.recurrence_day_of_week - currentDay;
                currentDate.setDate(currentDate.getDate() + diff);
                currentDueDate.setDate(currentDueDate.getDate() + diff);
              }
            } else if (newTransaction.recurrence_type === 'yearly') {
              const yearsToAdd = i * interval;
              currentDate.setFullYear(baseDate.getFullYear() + yearsToAdd);
              currentDueDate.setFullYear(baseDueDate.getFullYear() + yearsToAdd);

              if (newTransaction.recurrence_day_of_month) {
                currentDate.setDate(newTransaction.recurrence_day_of_month);
                currentDueDate.setDate(newTransaction.recurrence_day_of_month);
              }
              if (newTransaction.recurrence_month) {
                currentDate.setMonth(newTransaction.recurrence_month - 1);
                currentDueDate.setMonth(newTransaction.recurrence_month - 1);
              }
            } else if (newTransaction.recurrence_type === 'personalizado') {
              const unit = newTransaction.recurrence_unit || 'days';
              if (unit === 'days') {
                currentDate.setDate(baseDate.getDate() + (i * interval));
                currentDueDate.setDate(baseDueDate.getDate() + (i * interval));
              } else if (unit === 'weeks') {
                currentDate.setDate(baseDate.getDate() + (i * interval * 7));
                currentDueDate.setDate(baseDueDate.getDate() + (i * interval * 7));
              } else if (unit === 'months') {
                currentDate.setMonth(baseDate.getMonth() + (i * interval));
                currentDueDate.setMonth(baseDueDate.getMonth() + (i * interval));
              } else if (unit === 'years') {
                currentDate.setFullYear(baseDate.getFullYear() + (i * interval));
                currentDueDate.setFullYear(baseDueDate.getFullYear() + (i * interval));
              }
            }
          }

          const amount = (i > 0 && newTransaction.recurrence === 'variable') ? 0 : Number(newTransaction.amount);
          const status = i > 0 ? 'Pendente' : newTransaction.status;

          transactionsToCreate.push({
            description: newTransaction.description,
            amount: amount,
            type: newTransaction.type,
            category: newTransaction.category,
            status: status,
            date: format(currentDate, 'yyyy-MM-dd'),
            due_date: format(currentDueDate, 'yyyy-MM-dd'),
            payment_method: newTransaction.payment_method,
            bank_account_id: newTransaction.bank_account_id || null,
            client_account_id: newTransaction.client_account_id || null,
            paid_date: (status === 'Pago' || status === 'Recebido') ? (newTransaction.paid_date || newTransaction.date) : null,
            notes: newTransaction.notes,
            workspace_id: currentUser?.workspace_id,
            recurring_id: recurringId,
            is_recurring: isRecurring,
            recurrence_type: isRecurring ? newTransaction.recurrence_type : null,
            recurrence: isRecurring ? newTransaction.recurrence : null,
            recurrence_interval: isRecurring ? newTransaction.recurrence_interval : null,
            recurrence_day_of_month: isRecurring ? newTransaction.recurrence_day_of_month : null,
            recurrence_day_of_week: isRecurring ? newTransaction.recurrence_day_of_week : null,
            recurrence_month: isRecurring ? newTransaction.recurrence_month : null,
            recurrence_unit: isRecurring ? newTransaction.recurrence_unit : null,
            recurrence_end_date: isRecurring ? newTransaction.recurrence_end_date : null
          });
        }

        const { data, error } = await supabase
          .from('m4_transactions')
          .insert(transactionsToCreate)
          .select();

        if (!error && data) {
          setTransactions(prev => [...prev, ...data]);
          
          // Update bank account balance if first transaction is paid
          const firstTransaction = data[0];
          if (firstTransaction.bank_account_id && (firstTransaction.status === 'Pago' || firstTransaction.status === 'Recebido')) {
            const account = bankAccounts.find(a => a.id === firstTransaction.bank_account_id);
            if (account) {
              const newBalance = firstTransaction.type === 'Receita' 
                ? Number(account.balance) + Number(firstTransaction.amount)
                : Number(account.balance) - Number(firstTransaction.amount);
              
              await supabase.from('m4_bank_accounts').update({ balance: newBalance }).eq('id', account.id);
              setBankAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
            }
          }
        } else if (error) {
          throw error;
        }
      }

      setIsModalOpen(false);
        setNewTransaction({
          description: '',
          amount: 0,
          type: 'Receita',
          category: 'Mensalidade',
          status: 'Pendente',
          date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          payment_method: 'Boleto',
          bank_account_id: '',
          to_bank_account_id: '',
          credit_card_id: '',
          client_account_id: '',
          is_recurring: false,
          recurrence_type: 'monthly',
          recurrence_interval: 1,
          recurrence: 'fixed',
          months: 12
        });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('m4_bank_accounts')
        .insert([{ ...newBankAccount, workspace_id: currentUser?.workspace_id }])
        .select();

      if (!error && data) {
        setBankAccounts([...bankAccounts, data[0]]);
        setIsBankModalOpen(false);
        setNewBankAccount({ name: '', type: 'Corrente', balance: 0, currency: 'BRL' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('m4_bank_accounts')
        .update({
          name: selectedAccount.name,
          type: selectedAccount.type,
          balance: selectedAccount.balance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAccount.id)
        .select();

      if (!error && data) {
        setBankAccounts(prev => prev.map(acc => acc.id === selectedAccount.id ? data[0] : acc));
        setSelectedAccount(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta? Todas as transações vinculadas perderão a referência.')) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('m4_bank_accounts')
        .delete()
        .eq('id', id);

      if (!error) {
        setBankAccounts(prev => prev.filter(acc => acc.id !== id));
        setSelectedAccount(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('m4_credit_cards')
        .insert([{ ...newCreditCard, workspace_id: currentUser?.workspace_id }])
        .select();

      if (!error && data) {
        setCreditCards([...creditCards, data[0]]);
        setIsCardModalOpen(false);
        setNewCreditCard({ name: '', limit_amount: 0, closing_day: 1, due_day: 10 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const totalRevenue = filteredTransactions
    .filter(t => t.type === 'Receita' && (t.status === 'Pago' || t.status === 'Recebido'))
    .reduce((acc, t) => acc + Number(t.amount), 0);
  
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'Despesa' && (t.status === 'Pago' || t.status === 'Recebido'))
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

  const mrr = clientAccounts
    .filter(a => a.status === 'ativo')
    .reduce((acc, a) => acc + (Number(a.monthly_value) || 0), 0);

  const pendingReceivables = filteredTransactions
    .filter(t => t.type === 'Receita' && (t.status === 'Pendente' || t.status === 'A Receber'))
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const chartData = useMemo(() => {
    return [
      { name: 'Entradas', value: totalRevenue, color: '#10b981' },
      { name: 'Saídas', value: totalExpenses, color: '#f43f5e' }
    ];
  }, [totalRevenue, totalExpenses]);

  const dueAlerts = transactions.filter(t => 
    t.status === 'Pendente' && 
    t.due_date && 
    (isToday(parseISO(t.due_date)) || isTomorrow(parseISO(t.due_date)))
  );

  const renderOverview = () => (
    <div className="space-y-8">
      {dueAlerts.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <ICONS.AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Vencimentos Próximos</p>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{dueAlerts.length} contas vencem hoje ou amanhã. Clique para detalhar.</p>
                </div>
              </div>
          <button 
            onClick={() => setActiveTab('receivables')}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all"
          >
            VER DETALHES
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Receita Total (Período)</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">R$ {totalRevenue.toLocaleString()}</h3>
          <p className="text-xs font-bold text-emerald-600 mt-3 flex items-center gap-1">▲ {filteredTransactions.filter(t => t.type === 'Receita').length} <span className="text-slate-400 font-medium">entradas</span></p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MRR (Recorrência)</p>
          <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-none">R$ {mrr.toLocaleString()}</h3>
          <p className="text-xs font-bold text-blue-400 mt-3 italic font-medium">Saúde da agência</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">A Receber</p>
          <h3 className="text-2xl font-black text-amber-600 dark:text-amber-500 leading-none">R$ {pendingReceivables.toLocaleString()}</h3>
          <p className="text-xs font-bold text-slate-400 mt-3 italic font-medium">Previsão de caixa</p>
        </div>
        <div className="bg-slate-900 dark:bg-slate-950 p-6 rounded-3xl shadow-xl shadow-slate-200 dark:shadow-none">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saldo em Contas</p>
          <h3 className="text-2xl font-black text-white leading-none">
            R$ {bankAccounts.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0).toLocaleString()}
          </h3>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Real</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6">
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-6">Resultado Financeiro</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Contas Bancárias</h3>
              <button onClick={() => setIsBankModalOpen(true)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"><ICONS.Plus className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhuma conta cadastrada</div>
              ) : (
                bankAccounts.map(account => (
                  <div 
                    key={account.id} 
                    onClick={() => setSelectedAccount(account)}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ICONS.Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white">{account.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{account.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800 dark:text-white">R$ {Number(account.balance).toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Sincronizado</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Últimas Movimentações</h3>
              <button onClick={() => setActiveTab('receivables')} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline">Ver Todas</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.slice(0, 5).map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {t.category === 'Transferência' && <ICONS.ArrowLeftRight className="w-3 h-3 text-blue-500" />}
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{t.description}</p>
                        </div>
                        <p className="text-[10px] text-slate-400">{format(parseISO(t.date), 'dd/MM/yyyy')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md uppercase tracking-wider">{t.category}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-black ${t.type === 'Receita' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'}`}>
                          {t.type === 'Receita' ? '+' : '-'} R$ {Math.abs(Number(t.amount)).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Cartões de Crédito</h3>
              <button onClick={() => setIsCardModalOpen(true)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"><ICONS.Plus className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              {creditCards.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">Nenhum cartão</div>
              ) : (
                creditCards.map(card => (
                  <div key={card.id} className="p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 text-white shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <ICONS.CreditCard className="w-6 h-6 text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.name}</span>
                    </div>
                    <div className="mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Limite Disponível</p>
                      <p className="text-xl font-black">R$ {Number(card.limit_amount).toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vencimento</p>
                        <p className="text-xs font-bold">Dia {card.due_day}</p>
                      </div>
                      <div className="w-8 h-5 bg-slate-700/50 rounded flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-blue-600 dark:bg-blue-700 p-6 rounded-3xl text-white shadow-xl shadow-blue-200 dark:shadow-none">
            <h3 className="font-black uppercase tracking-widest text-[10px] text-blue-200 mb-4">Fluxo de Caixa (Período)</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                  <span>Entradas</span>
                  <span>R$ {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-blue-800 dark:bg-blue-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                  <span>Saídas</span>
                  <span>R$ {totalExpenses.toLocaleString()}</span>
                </div>
                <div className="w-full bg-blue-800 dark:bg-blue-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-400 h-full" style={{ width: `${(totalExpenses / (totalRevenue || 1)) * 100}%` }}></div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('receivables')}
              className="w-full mt-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              Análise Detalhada
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactions = (filterType?: 'Receita' | 'Despesa') => (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">
          {filterType ? (filterType === 'Receita' ? 'Contas a Receber' : 'Contas a Pagar') : 'Movimentações'}
        </h3>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg transition-colors"><ICONS.Search className="w-4 h-4" /></button>
          <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg transition-colors"><ICONS.Filter className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTransactions
              .filter(t => !filterType || t.type === filterType)
              .map(t => (
                <tr 
                  key={t.id || `proj-${t.client_account_id}-${t.date}`} 
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer ${t.is_projected ? 'bg-slate-50/30 dark:bg-slate-800/30 italic' : ''}`}
                  onClick={() => {
                    setSelectedTransaction(t);
                    setIsDetailOpen(true);
                  }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {t.is_projected && <ICONS.Calendar className="w-3 h-3 text-blue-400" />}
                      {t.category === 'Transferência' && <ICONS.ArrowLeftRight className="w-3 h-3 text-blue-500" />}
                      {t.recurring_id && <ICONS.Repeat className="w-3 h-3 text-indigo-500" />}
                      <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{t.description}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                      {t.is_projected ? 'Projeção Automática' : (t.payment_method || 'Não definido')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md uppercase tracking-wider">{t.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{format(parseISO(t.due_date || t.date), 'dd/MM/yyyy')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                      t.status === 'Pago' || t.status === 'Recebido' || t.status === 'Confirmado'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                        : t.is_projected 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800' 
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {t.is_projected ? 'Projetado' : t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-black ${t.type === 'Receita' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'}`}>
                      {t.type === 'Receita' ? '+' : '-'} R$ {Math.abs(Number(t.amount)).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {t.status !== 'Pago' && t.status !== 'Recebido' ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTransaction(t);
                          setConfirmData({
                            date: new Date().toISOString().split('T')[0],
                            accountId: t.bank_account_id || '',
                            amount: t.amount,
                            notes: ''
                          });
                          setIsConfirmModalOpen(true);
                        }}
                        disabled={isSyncing}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
                      >
                        {t.type === 'Receita' ? 'Receber' : 'Pagar'}
                      </button>
                    ) : (
                      <button className="p-2 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
                        <ICONS.MoreVertical className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
            Minhas Finanças
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Controle simples do meu caixa, contas e cartões.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {[
              { id: 'current_month', label: 'Mês Atual' },
              { id: 'previous_month', label: 'Mês Anterior' },
              { id: 'last_3_months', label: '3 Meses' },
              { id: 'next_3_months', label: 'Próximos 3 Meses' },
              { id: 'all', label: 'Tudo' },
              { id: 'custom', label: 'Personalizado' }
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  dateRange === range.id 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <input 
                type="date" 
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase outline-none px-2 dark:text-white"
              />
              <span className="text-slate-400 text-[10px] font-black">ATÉ</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase outline-none px-2 dark:text-white"
              />
            </div>
          )}

          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-200 dark:shadow-none transition-all hover:bg-blue-700 flex items-center gap-2"
          >
            <ICONS.Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Transaction Detail Drawer/Modal */}
      {isDetailOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex justify-end">
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Detalhes do Lançamento</h3>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ICONS.X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedTransaction.type === 'Receita' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600'
                }`}>
                  {selectedTransaction.type === 'Receita' ? <ICONS.ArrowUpRight className="w-6 h-6" /> : <ICONS.ArrowDownRight className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">
                    R$ {Number(selectedTransaction.amount).toLocaleString()}
                  </p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{selectedTransaction.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedTransaction.status === 'Pago' || selectedTransaction.status === 'Recebido' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : selectedTransaction.status === 'Atrasado'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedTransaction.status}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Categoria</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedTransaction.category}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vencimento</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{format(parseISO(selectedTransaction.due_date || selectedTransaction.date), 'dd/MM/yyyy')}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Conta</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {bankAccounts.find(a => a.id === selectedTransaction.bank_account_id)?.name || 'Não definida'}
                  </p>
                </div>
                {selectedTransaction.paid_date && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-100 dark:border-emerald-800 col-span-2">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Data da Efetivação</p>
                    <p className="text-sm font-bold text-emerald-700">{format(parseISO(selectedTransaction.paid_date), 'dd/MM/yyyy')}</p>
                  </div>
                )}
              </div>

              {selectedTransaction.notes && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Observações</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{selectedTransaction.notes}"</p>
                </div>
              )}

              {selectedTransaction.recurring_id && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
                  <ICONS.Repeat className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-tight">Lançamento Recorrente</p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400">
                      {getRecurrenceSummary(selectedTransaction)} ({selectedTransaction.recurrence === 'fixed' ? 'Valor Fixo' : 'Valor Variável'})
                    </p>
                  </div>
                </div>
              )}

              {selectedTransaction.is_projected && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                  <ICONS.Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Este é um lançamento projetado automaticamente.</p>
                </div>
              )}

              {selectedTransaction.edit_history && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <ICONS.History size={14} className="text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico de Edições</p>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-none">
                    {selectedTransaction.edit_history.split('\n').map((entry, idx) => (
                      <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-[9px] text-slate-600 dark:text-slate-400 font-medium">
                        {entry}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 grid grid-cols-3 gap-3">
              <button 
                onClick={() => {
                  const tx = { ...selectedTransaction };
                  if (tx.is_recurring && !tx.recurrence_day_of_month && tx.due_date) {
                    const d = new Date(tx.due_date);
                    tx.recurrence_day_of_month = d.getUTCDate();
                    tx.recurrence_day_of_week = d.getUTCDay();
                    tx.recurrence_month = d.getUTCMonth() + 1;
                    if (!tx.recurrence_unit) tx.recurrence_unit = 'months';
                  }
                  setEditTransaction(tx);
                  setIsEditModalOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all group"
              >
                <ICONS.Edit2 className="w-5 h-5 mb-1 text-slate-400 group-hover:text-blue-600" />
                <span className="text-[10px] font-bold uppercase">Editar</span>
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-rose-300 dark:hover:border-rose-600 hover:text-rose-600 dark:hover:text-rose-400 transition-all group"
              >
                <ICONS.Trash2 className="w-5 h-5 mb-1 text-slate-400 group-hover:text-rose-600" />
                <span className="text-[10px] font-bold uppercase">Excluir</span>
              </button>
              {(selectedTransaction.status !== 'Pago' && selectedTransaction.status !== 'Recebido') && (
                <button 
                  onClick={() => {
                    setConfirmData({
                      date: new Date().toISOString().split('T')[0],
                      accountId: selectedTransaction.bank_account_id || '',
                      amount: selectedTransaction.amount,
                      notes: ''
                    });
                    setIsConfirmModalOpen(true);
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  <ICONS.CheckCircle2 className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold uppercase">Quitar</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Update Scope Modal */}
      {isUpdateScopeModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8 pb-4 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ICONS.Repeat size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Onde aplicar esta alteração?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Este lançamento faz parte de uma recorrência.</p>
            </div>

            <div className="p-8 pt-4 space-y-3">
              <button
                onClick={() => handleUpdateTransaction(undefined, 'single')}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 uppercase tracking-tight">Apenas este mês</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Altera somente o registro atual.</p>
              </button>
              <button
                onClick={() => handleUpdateTransaction(undefined, 'future')}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 uppercase tracking-tight">Este e os próximos</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Altera o atual e todos os futuros vinculados.</p>
              </button>
              <button
                onClick={() => handleUpdateTransaction(undefined, 'all')}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 uppercase tracking-tight">Todos (inclusive passados)</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Altera todo o histórico (exceto os já quitados).</p>
              </button>
              
              <button
                onClick={() => setIsUpdateScopeModalOpen(false)}
                className="w-full p-4 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {isConfirmModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                Confirmar {selectedTransaction.type === 'Receita' ? 'Recebimento' : 'Pagamento'}
              </h3>
              <button onClick={() => setIsConfirmModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <ICONS.X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Lançamento</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedTransaction.description}</p>
                <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">R$ {Number(selectedTransaction.amount).toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data Efetiva</label>
                  <input 
                    type="date"
                    value={confirmData.date}
                    onChange={e => setConfirmData({...confirmData, date: e.target.value})}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Efetivo</label>
                  <input 
                    type="number"
                    value={confirmData.amount}
                    onChange={e => setConfirmData({...confirmData, amount: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Conta de Destino/Origem</label>
                {bankAccounts.length > 0 ? (
                  <select 
                    value={confirmData.accountId || ''}
                    onChange={e => setConfirmData({...confirmData, accountId: e.target.value})}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white"
                  >
                    <option value="">Selecione uma conta...</option>
                    {bankAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} (Saldo: R$ {acc.balance.toLocaleString()})</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-lg">
                    <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">Nenhuma conta bancária cadastrada.</p>
                    <button className="text-xs text-rose-800 dark:text-rose-300 font-bold underline mt-1">Cadastrar conta agora</button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Observações (Opcional)</label>
                <textarea 
                  value={confirmData.notes}
                  onChange={e => setConfirmData({...confirmData, notes: e.target.value})}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm h-20 resize-none dark:text-white"
                  placeholder="Alguma nota sobre este pagamento?"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button 
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmPayment}
                disabled={isSyncing || !confirmData.accountId}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Scope Modal */}
      {isDeleteScopeModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8 pb-4 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ICONS.Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Onde aplicar esta exclusão?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Este lançamento faz parte de uma recorrência.</p>
            </div>

            <div className="p-8 pt-4 space-y-3">
              <button
                onClick={() => handleDeleteTransaction('single')}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 uppercase tracking-tight">Apenas este mês</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Exclui somente o registro atual.</p>
              </button>
              <button
                onClick={() => handleDeleteTransaction('future')}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 uppercase tracking-tight">Este e os próximos</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Exclui o atual e todos os futuros vinculados.</p>
              </button>
              <button
                onClick={() => handleDeleteTransaction('all')}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-left transition-all group"
              >
                <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 uppercase tracking-tight">Todos (inclusive passados)</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Exclui todo o histórico (exceto os já quitados).</p>
              </button>
              
              <button
                onClick={() => setIsDeleteScopeModalOpen(false)}
                className="w-full p-4 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {isDeleteModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <ICONS.AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Excluir Lançamento?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Esta ação não pode ser desfeita. 
                {(selectedTransaction.status === 'Pago' || selectedTransaction.status === 'Recebido') && (
                  <span className="block mt-2 font-bold text-rose-600 dark:text-rose-400">
                    Atenção: O saldo da conta vinculada será estornado automaticamente.
                  </span>
                )}
              </p>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => handleDeleteTransaction()}
                  disabled={isSyncing}
                  className="w-full py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all"
                >
                  {isSyncing ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-zoom-in-95">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Editar Lançamento</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTransaction} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-10 py-6 space-y-6 scrollbar-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                    <select 
                      value={editTransaction.type || ''} 
                      onChange={e => setEditTransaction({...editTransaction, type: e.target.value as any})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="Receita">Receita (+)</option>
                      <option value="Despesa">Despesa (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Valor</label>
                    <input 
                      type="number" 
                      required
                      value={editTransaction.amount} 
                      onChange={e => setEditTransaction({...editTransaction, amount: parseFloat(e.target.value) || 0})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Descrição</label>
                  <input 
                    required
                    value={editTransaction.description} 
                    onChange={e => setEditTransaction({...editTransaction, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
                    <select 
                      value={editTransaction.category || ''} 
                      onChange={e => setEditTransaction({...editTransaction, category: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      {financeCategories
                        .filter(c => c.type === editTransaction.type)
                        .map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data Vencimento</label>
                    <input 
                      type="date" 
                      value={editTransaction.due_date?.split('T')[0]} 
                      onChange={e => setEditTransaction({...editTransaction, due_date: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                  {(editTransaction.status === 'Pago' || editTransaction.status === 'Recebido') && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data Efetivação</label>
                      <input 
                        type="date" 
                        value={editTransaction.paid_date?.split('T')[0]} 
                        onChange={e => setEditTransaction({...editTransaction, paid_date: e.target.value})}
                        className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-emerald-900 dark:text-emerald-400"
                      />
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                        <ICONS.Repeat size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Recorrência</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Configurar lançamento repetido</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditTransaction({...editTransaction, is_recurring: !editTransaction.is_recurring})}
                      className={`w-12 h-6 rounded-full transition-all relative ${editTransaction.is_recurring ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editTransaction.is_recurring ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {editTransaction.is_recurring && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Frequência</label>
                          <select 
                            value={editTransaction.recurrence_type}
                            onChange={e => setEditTransaction({...editTransaction, recurrence_type: e.target.value as any})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          >
                            <option value="weekly">Semanal</option>
                            <option value="quinzenal">Quinzenal</option>
                            <option value="monthly">Mensal</option>
                            <option value="yearly">Anual</option>
                            <option value="personalizado">Personalizado</option>
                          </select>
                        </div>

                        {editTransaction.recurrence_type === 'monthly' && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia do Mês</label>
                            <select 
                              value={editTransaction.recurrence_day_of_month}
                              onChange={e => setEditTransaction({...editTransaction, recurrence_day_of_month: parseInt(e.target.value)})}
                              className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                            >
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>{day}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {editTransaction.recurrence_type === 'weekly' && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia da Semana</label>
                            <select 
                              value={editTransaction.recurrence_day_of_week}
                              onChange={e => setEditTransaction({...editTransaction, recurrence_day_of_week: parseInt(e.target.value)})}
                              className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                            >
                              <option value={0}>Domingo</option>
                              <option value={1}>Segunda-feira</option>
                              <option value={2}>Terça-feira</option>
                              <option value={3}>Quarta-feira</option>
                              <option value={4}>Quinta-feira</option>
                              <option value={5}>Sexta-feira</option>
                              <option value={6}>Sábado</option>
                            </select>
                          </div>
                        )}

                        {editTransaction.recurrence_type === 'yearly' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia</label>
                              <select 
                                value={editTransaction.recurrence_day_of_month}
                                onChange={e => setEditTransaction({...editTransaction, recurrence_day_of_month: parseInt(e.target.value)})}
                                className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                              >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                  <option key={day} value={day}>{day}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Mês</label>
                              <select 
                                value={editTransaction.recurrence_month}
                                onChange={e => setEditTransaction({...editTransaction, recurrence_month: parseInt(e.target.value)})}
                                className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                              >
                                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                                  <option key={i} value={i + 1}>{m}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {editTransaction.recurrence_type === 'personalizado' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Intervalo</label>
                              <input 
                                type="number"
                                min="1"
                                value={editTransaction.recurrence_interval}
                                onChange={e => setEditTransaction({...editTransaction, recurrence_interval: parseInt(e.target.value) || 1})}
                                className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Unidade</label>
                              <select 
                                value={editTransaction.recurrence_unit}
                                onChange={e => setEditTransaction({...editTransaction, recurrence_unit: e.target.value as any})}
                                className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                              >
                                <option value="days">Dias</option>
                                <option value="weeks">Semanas</option>
                                <option value="months">Meses</option>
                                <option value="years">Anos</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {editTransaction.recurrence_type !== 'personalizado' && editTransaction.recurrence_type !== 'quinzenal' && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Repetir a cada X {editTransaction.recurrence_type === 'monthly' ? 'meses' : editTransaction.recurrence_type === 'weekly' ? 'semanas' : 'anos'}</label>
                          <input 
                            type="number"
                            min="1"
                            value={editTransaction.recurrence_interval}
                            onChange={e => setEditTransaction({...editTransaction, recurrence_interval: parseInt(e.target.value) || 1})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo de Valor</label>
                          <select 
                            value={editTransaction.recurrence}
                            onChange={e => setEditTransaction({...editTransaction, recurrence: e.target.value as any})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          >
                            <option value="fixed">Valor Fixo</option>
                            <option value="variable">Valor Variável</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data Fim (Opcional)</label>
                          <input 
                            type="date"
                            value={editTransaction.recurrence_end_date || ''}
                            onChange={e => setEditTransaction({...editTransaction, recurrence_end_date: e.target.value})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Resumo da Recorrência</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {getRecurrenceSummary(editTransaction)}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Observações</label>
                  <textarea 
                    value={editTransaction.notes || ''} 
                    onChange={e => setEditTransaction({...editTransaction, notes: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white h-24 resize-none"
                  />
                </div>
              </div>

              <div className="p-10 pt-6 flex gap-4 border-t border-slate-50 dark:border-slate-800 shrink-0">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">FECHAR</button>
                <button 
                  type="button" 
                  onClick={() => setIsDeleteModalOpen(true)} 
                  className="px-6 py-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl font-black uppercase text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all border border-rose-100 dark:border-rose-800/50"
                >
                  <ICONS.Trash2 className="w-4 h-4" />
                </button>
                <button 
                  type="submit"
                  disabled={isSyncing}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50"
                >
                  {isSyncing ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-zoom-in-95">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0 gap-4">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase truncate min-w-0">Novo Lançamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTransaction} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-10 py-6 space-y-6 scrollbar-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                    <select 
                      value={newTransaction.type || ''} 
                      onChange={e => setNewTransaction({...newTransaction, type: e.target.value as any})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="Receita">Receita (+)</option>
                      <option value="Despesa">Despesa (-)</option>
                      <option value="Transferência">Transferência (⇄)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Valor</label>
                    <input 
                      type="number" 
                      required
                      placeholder="0,00"
                      value={newTransaction.amount === 0 ? '' : newTransaction.amount} 
                      onChange={e => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value) || 0})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Descrição</label>
                  <input 
                    required
                    placeholder="Ex: Mensalidade Cliente X"
                    value={newTransaction.description} 
                    onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                {newTransaction.type !== 'Transferência' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
                      <select 
                        value={newTransaction.category || ''} 
                        onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                      >
                        <option value="">Selecione...</option>
                        {financeCategories
                          .filter(c => c.type === newTransaction.type)
                          .map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        {financeCategories.length === 0 && (
                          <>
                            <option value="Mensalidade">Mensalidade</option>
                            <option value="Serviço Avulso">Serviço Avulso</option>
                            <option value="Infraestrutura">Infraestrutura</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Salários">Salários</option>
                            <option value="Impostos">Impostos</option>
                            <option value="Outros">Outros</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Status</label>
                      <select 
                        value={newTransaction.status || ''} 
                        onChange={e => setNewTransaction({...newTransaction, status: e.target.value as any})}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Pago">Pago / Recebido</option>
                        <option value="Atrasado">Atrasado</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data Vencimento</label>
                    <input 
                      type="date" 
                      value={newTransaction.due_date} 
                      onChange={e => setNewTransaction({...newTransaction, due_date: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                  {(newTransaction.status === 'Pago' || newTransaction.status === 'Recebido') && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data Efetivação</label>
                      <input 
                        type="date" 
                        value={newTransaction.paid_date} 
                        onChange={e => setNewTransaction({...newTransaction, paid_date: e.target.value})}
                        className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-emerald-900 dark:text-emerald-400"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Método de Pagamento</label>
                    <select 
                      value={newTransaction.payment_method} 
                      onChange={e => setNewTransaction({...newTransaction, payment_method: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      {paymentMethods.map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                      {paymentMethods.length === 0 && (
                        <>
                          <option value="Boleto">Boleto</option>
                          <option value="Pix">Pix</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Transferência">Transferência</option>
                          <option value="Dinheiro">Dinheiro</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                      {newTransaction.type === 'Transferência' ? 'Sair da Conta' : 'Conta Bancária'}
                    </label>
                    <select 
                      value={newTransaction.bank_account_id} 
                      onChange={e => setNewTransaction({...newTransaction, bank_account_id: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="">Nenhuma</option>
                      {bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                  </div>
                  {newTransaction.type === 'Transferência' ? (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Entrar na Conta</label>
                      <select 
                        required
                        value={newTransaction.to_bank_account_id} 
                        onChange={e => setNewTransaction({...newTransaction, to_bank_account_id: e.target.value})}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                      >
                        <option value="">Selecione a conta...</option>
                        {bankAccounts
                          .filter(acc => acc.id !== newTransaction.bank_account_id)
                          .map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Vincular a Cliente</label>
                      <select 
                        value={newTransaction.client_account_id} 
                        onChange={e => setNewTransaction({...newTransaction, client_account_id: e.target.value})}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                      >
                        <option value="">Nenhum</option>
                        {clientAccounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.company?.name || acc.service_type} - {acc.id.slice(0,8)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                        <ICONS.Repeat size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Recorrência</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Configurar lançamento repetido</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewTransaction({...newTransaction, is_recurring: !newTransaction.is_recurring})}
                      className={`w-12 h-6 rounded-full transition-all relative ${newTransaction.is_recurring ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newTransaction.is_recurring ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {newTransaction.is_recurring && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Frequência</label>
                          <select 
                            value={newTransaction.recurrence_type}
                            onChange={e => setNewTransaction({...newTransaction, recurrence_type: e.target.value as any})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          >
                            <option value="weekly">Semanal</option>
                            <option value="quinzenal">Quinzenal</option>
                            <option value="monthly">Mensal</option>
                            <option value="yearly">Anual</option>
                            <option value="personalizado">Personalizado</option>
                          </select>
                        </div>

                        {newTransaction.recurrence_type === 'monthly' && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia do Mês</label>
                            <select 
                              value={newTransaction.recurrence_day_of_month}
                              onChange={e => setNewTransaction({...newTransaction, recurrence_day_of_month: parseInt(e.target.value)})}
                              className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                            >
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>{day}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {newTransaction.recurrence_type === 'weekly' && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia da Semana</label>
                            <select 
                              value={newTransaction.recurrence_day_of_week}
                              onChange={e => setNewTransaction({...newTransaction, recurrence_day_of_week: parseInt(e.target.value)})}
                              className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                            >
                              <option value={0}>Domingo</option>
                              <option value={1}>Segunda-feira</option>
                              <option value={2}>Terça-feira</option>
                              <option value={3}>Quarta-feira</option>
                              <option value={4}>Quinta-feira</option>
                              <option value={5}>Sexta-feira</option>
                              <option value={6}>Sábado</option>
                            </select>
                          </div>
                        )}

                        {newTransaction.recurrence_type === 'yearly' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia</label>
                              <select 
                                value={newTransaction.recurrence_day_of_month}
                                onChange={e => setNewTransaction({...newTransaction, recurrence_day_of_month: parseInt(e.target.value)})}
                                className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                              >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                  <option key={day} value={day}>{day}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Mês</label>
                              <select 
                                value={newTransaction.recurrence_month}
                                onChange={e => setNewTransaction({...newTransaction, recurrence_month: parseInt(e.target.value)})}
                                className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                              >
                                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                                  <option key={i} value={i + 1}>{m}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {newTransaction.recurrence_type === 'personalizado' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Intervalo</label>
                              <input 
                                type="number"
                                min="1"
                                value={newTransaction.recurrence_interval}
                                onChange={e => setNewTransaction({...newTransaction, recurrence_interval: parseInt(e.target.value) || 1})}
                                className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Unidade</label>
                              <select 
                                value={newTransaction.recurrence_unit}
                                onChange={e => setNewTransaction({...newTransaction, recurrence_unit: e.target.value as any})}
                                className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                              >
                                <option value="days">Dias</option>
                                <option value="weeks">Semanas</option>
                                <option value="months">Meses</option>
                                <option value="years">Anos</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {newTransaction.recurrence_type !== 'personalizado' && newTransaction.recurrence_type !== 'quinzenal' && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Repetir a cada X {newTransaction.recurrence_type === 'monthly' ? 'meses' : newTransaction.recurrence_type === 'weekly' ? 'semanas' : 'anos'}</label>
                          <input 
                            type="number"
                            min="1"
                            value={newTransaction.recurrence_interval}
                            onChange={e => setNewTransaction({...newTransaction, recurrence_interval: parseInt(e.target.value) || 1})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo de Valor</label>
                          <select 
                            value={newTransaction.recurrence}
                            onChange={e => setNewTransaction({...newTransaction, recurrence: e.target.value as any})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          >
                            <option value="fixed">Valor Fixo</option>
                            <option value="variable">Valor Variável</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Duração (Meses)</label>
                          <select 
                            value={newTransaction.months}
                            onChange={e => setNewTransaction({...newTransaction, months: e.target.value === 'indefinite' ? 'indefinite' : parseInt(e.target.value)})}
                            className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white text-sm"
                          >
                            <option value={12}>12 Meses</option>
                            <option value={24}>24 Meses</option>
                            <option value={36}>36 Meses</option>
                            <option value="indefinite">Indeterminado</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Resumo da Recorrência</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {getRecurrenceSummary(newTransaction)}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Observações</label>
                  <textarea 
                    placeholder="Notas adicionais..."
                    value={newTransaction.notes || ''} 
                    onChange={e => setNewTransaction({...newTransaction, notes: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white h-24 resize-none"
                  />
                </div>
              </div>

              <div className="p-10 pt-6 flex gap-4 border-t border-slate-50 dark:border-slate-800 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">CANCELAR</button>
                <button 
                  onClick={handleCreateTransaction} 
                  disabled={isSyncing}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50"
                >
                  {isSyncing ? "SALVANDO..." : "CRIAR LANÇAMENTO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md flex flex-col shadow-2xl animate-zoom-in-95">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Nova Conta</h3>
              <button onClick={() => setIsBankModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateBankAccount} className="p-10 pt-0 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nome da Conta</label>
                <input 
                  required
                  placeholder="Ex: Itaú Principal"
                  value={newBankAccount.name}
                  onChange={e => setNewBankAccount({...newBankAccount, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                <select 
                  value={newBankAccount.type}
                  onChange={e => setNewBankAccount({...newBankAccount, type: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                >
                  <option value="Corrente">Corrente</option>
                  <option value="Poupança">Poupança</option>
                  <option value="Investimento">Investimento</option>
                  <option value="Caixa">Caixa (Dinheiro)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Saldo Inicial</label>
                <input 
                  type="number"
                  required
                  placeholder="0,00"
                  value={newBankAccount.balance === 0 ? '' : newBankAccount.balance}
                  onChange={e => setNewBankAccount({...newBankAccount, balance: parseFloat(e.target.value) || 0})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsBankModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">CANCELAR</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50">
                  {isSyncing ? "SALVANDO..." : "CRIAR CONTA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAccount && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-zoom-in-95">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Detalhes da Conta</h3>
              <button onClick={() => setSelectedAccount(null)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-10 py-6 space-y-8 scrollbar-none">
              <form onSubmit={handleUpdateBankAccount} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nome da Conta</label>
                    <input 
                      required
                      value={selectedAccount.name}
                      onChange={e => setSelectedAccount({...selectedAccount, name: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                    <select 
                      value={selectedAccount.type}
                      onChange={e => setSelectedAccount({...selectedAccount, type: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                    >
                      <option value="Corrente">Corrente</option>
                      <option value="Poupança">Poupança</option>
                      <option value="Investimento">Investimento</option>
                      <option value="Caixa">Caixa (Dinheiro)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Saldo Atual</label>
                  <input 
                    type="number"
                    required
                    value={selectedAccount.balance}
                    onChange={e => setSelectedAccount({...selectedAccount, balance: parseFloat(e.target.value) || 0})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => handleDeleteBankAccount(selectedAccount.id)}
                    className="px-6 py-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl font-black uppercase text-xs hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
                  >
                    EXCLUIR CONTA
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSyncing}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50"
                  >
                    {isSyncing ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Histórico Recente</h4>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {transactions
                        .filter(t => t.bank_account_id === selectedAccount.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map(t => (
                          <tr key={t.id} className="text-xs">
                            <td className="px-6 py-4 font-bold text-slate-500">{format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{t.description}</td>
                            <td className={`px-6 py-4 text-right font-black ${t.type === 'Receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {t.type === 'Receita' ? '+' : '-'} R$ {Math.abs(Number(t.amount)).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      {transactions.filter(t => t.bank_account_id === selectedAccount.id).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhuma transação encontrada</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md flex flex-col shadow-2xl animate-zoom-in-95">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Novo Cartão</h3>
              <button onClick={() => setIsCardModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateCreditCard} className="p-10 pt-0 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nome do Cartão</label>
                <input 
                  required
                  placeholder="Ex: Nubank Corporativo"
                  value={newCreditCard.name}
                  onChange={e => setNewCreditCard({...newCreditCard, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Limite Total</label>
                <input 
                  type="number"
                  required
                  placeholder="0,00"
                  value={newCreditCard.limit_amount === 0 ? '' : newCreditCard.limit_amount}
                  onChange={e => setNewCreditCard({...newCreditCard, limit_amount: parseFloat(e.target.value) || 0})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia Fechamento</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    max="31"
                    placeholder="Ex: 1"
                    value={newCreditCard.closing_day === 0 ? '' : newCreditCard.closing_day}
                    onChange={e => setNewCreditCard({...newCreditCard, closing_day: parseInt(e.target.value) || 0})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia Vencimento</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    max="31"
                    placeholder="Ex: 10"
                    value={newCreditCard.due_day === 0 ? '' : newCreditCard.due_day}
                    onChange={e => setNewCreditCard({...newCreditCard, due_day: parseInt(e.target.value) || 0})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsCardModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs">CANCELAR</button>
                <button type="submit" disabled={isSyncing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-100 dark:shadow-none transition-all disabled:opacity-50">
                  {isSyncing ? "SALVANDO..." : "ADICIONAR CARTÃO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
        {[
          { id: 'overview', label: 'Visão Geral', icon: <ICONS.PieChart className="w-4 h-4" /> },
          { id: 'receivables', label: 'A Receber', icon: <ICONS.ArrowDownLeft className="w-4 h-4" /> },
          { id: 'payables', label: 'A Pagar', icon: <ICONS.ArrowUpRight className="w-4 h-4" /> },
          { id: 'cards', label: 'Cartões', icon: <ICONS.CreditCard className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'receivables' && renderTransactions('Receita')}
        {activeTab === 'payables' && renderTransactions('Despesa')}
        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creditCards.map(card => (
              <div key={card.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl">
                    <ICONS.CreditCard className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{card.name}</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Limite Total</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">R$ {Number(card.limit_amount).toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Fechamento</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Dia {card.closing_day}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Vencimento</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Dia {card.due_day}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Finance;
