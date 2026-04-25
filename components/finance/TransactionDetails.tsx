
import React from 'react';
import { 
  FinanceTransaction, 
  FinanceTransactionType, 
  FinanceTransactionStatus 
} from '../../types/finance';
import { financeUtils } from '../../utils/financeUtils';
import { 
  X, 
  Calendar, 
  Tag, 
  Building2, 
  Edit3, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  History
} from 'lucide-react';

interface TransactionDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: FinanceTransaction | null;
  onEdit: (transaction: FinanceTransaction) => void;
  onDelete: (id: string) => void;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete
}) => {
  if (!isOpen || !transaction) return null;

  const getStatusIcon = (status: FinanceTransactionStatus) => {
    switch (status) {
      case FinanceTransactionStatus.PAID:
        return <CheckCircle2 className="text-emerald-500" size={24} />;
      case FinanceTransactionStatus.OVERDUE:
        return <AlertCircle className="text-rose-500" size={24} />;
      default:
        return <Clock className="text-amber-500" size={24} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              transaction.type === FinanceTransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 
              transaction.type === FinanceTransactionType.EXPENSE ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {transaction.type === FinanceTransactionType.INCOME ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Detalhes do Lançamento</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                Ref: #{transaction.id.substring(0, 8)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-none">
          {/* Main Info Card */}
          <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Descrição</p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{transaction.description}</h4>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                {getStatusIcon(transaction.status as FinanceTransactionStatus)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor</p>
                <p className={`text-2xl font-black ${
                  transaction.type === FinanceTransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {transaction.type === FinanceTransactionType.INCOME ? '+' : '-'} {financeUtils.formatCurrency(Number(transaction.amount))}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mt-1 ${financeUtils.getStatusColor(transaction.status)}`}>
                  {financeUtils.getStatusLabel(transaction.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</span>
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-6">
                  {financeUtils.formatDate(transaction.due_date)}
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</span>
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-6">
                  {transaction.category?.name || 'Geral'}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <History size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Competência</span>
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-6">
                  {financeUtils.formatDate(transaction.competence_date)}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conta Bancária</span>
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-6">
                  {transaction.bank_account?.name || 'Caixa'}
                </p>
              </div>

              {transaction.paid_at && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Data Pagamento</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 ml-6">
                    {financeUtils.formatDate(transaction.paid_at)}
                  </p>
                </div>
              )}

              {transaction.cost_center_id && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Centro de Custo</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-6">
                  {transaction.cost_center?.name || 'Não informado'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Observations / Edit History - PROMINENT POSITION */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 mb-4">
            <History size={16} className="text-blue-600" />
            <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Observações e Histórico de Alterações</h5>
          </div>
          <div className="bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100/50 dark:border-blue-900/30 min-h-[100px] shadow-inner">
            {transaction.notes && (
              <div className="mb-6 pb-6 border-b border-blue-100 dark:border-blue-900/30">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                  <span className="text-[9px] uppercase tracking-widest text-blue-500 block mb-2 font-black">Observações Recentes:</span>
                  {transaction.notes}
                </p>
              </div>
            )}
            {transaction.edit_history ? (
              <div className="space-y-3">
                <span className="text-[9px] uppercase tracking-widest text-slate-400 block font-black">Logs de Alteração:</span>
                <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-blue-50 dark:border-blue-900/20">
                  <pre className="text-[11px] font-bold text-slate-500 leading-relaxed whitespace-pre-wrap font-sans italic">
                    {transaction.edit_history}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <FileText size={24} className="text-slate-200 dark:text-slate-800 mb-2" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem histórico de alteração</p>
              </div>
            )}
          </div>
        </div>

        {/* CRM Link if any */}
        {(transaction.client_account_id || transaction.lead_id) && (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <User size={16} className="text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vínculo com CRM</span>
            </div>
            <p className="text-xs font-bold text-slate-500">
              Lançamento vinculado ao cliente ou lead para acompanhamento comercial.
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
          <button 
            onClick={onClose}
            className="flex items-center justify-center gap-2 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Fechar
          </button>
          <button 
            onClick={() => onEdit(transaction)}
            className="flex items-center justify-center gap-2 py-4 px-6 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none transition-all"
          >
            <Edit3 size={16} /> Editar Lançamento
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
