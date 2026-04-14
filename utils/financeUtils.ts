
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const financeUtils = {
  formatCurrency: (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  },

  formatDate: (date: string | Date, formatStr: string = 'dd/MM/yyyy') => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, formatStr, { locale: ptBR });
  },

  getStatusColor: (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-600';
      case 'pending': return 'bg-amber-50 text-amber-600';
      case 'overdue': return 'bg-rose-50 text-rose-600';
      case 'canceled': return 'bg-slate-50 text-slate-400';
      case 'draft': return 'bg-blue-50 text-blue-400';
      default: return 'bg-slate-50 text-slate-400';
    }
  },

  getStatusLabel: (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Atrasado';
      case 'canceled': return 'Cancelado';
      case 'draft': return 'Rascunho';
      default: return status;
    }
  },

  getTypeColor: (type: string) => {
    switch (type) {
      case 'income': return 'text-emerald-600';
      case 'expense': return 'text-rose-600';
      case 'transfer': return 'text-blue-600';
      case 'adjustment': return 'text-amber-600';
      default: return 'text-slate-600';
    }
  }
};
