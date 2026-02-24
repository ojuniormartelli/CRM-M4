
import React from 'react';
import { ICONS } from '../constants';

import { Transaction } from '../types';

interface FinanceProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const Finance: React.FC<FinanceProps> = ({ transactions, setTransactions }) => {
  const totalRevenue = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestão Financeira</h2>
          <p className="text-slate-500 font-medium">Controle de receitas recorrentes e despesas da agência.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 shadow-sm transition-all">
            Relatórios Fiscais
          </button>
          <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-200 transition-all hover:bg-blue-700">
            Nova Transação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Receita Total</p>
          <h3 className="text-3xl font-black text-slate-900 leading-none">R$ {totalRevenue.toLocaleString()}</h3>
          <p className="text-xs font-bold text-emerald-600 mt-3 flex items-center gap-1">▲ {transactions.length} <span className="text-slate-400 font-medium">transações</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Despesas Operacionais</p>
          <h3 className="text-3xl font-black text-slate-900 leading-none">R$ {totalExpenses.toLocaleString()}</h3>
          <p className="text-xs font-bold text-red-500 mt-3 flex items-center gap-1">▼ {transactions.filter(t => t.type === 'expense').length} <span className="text-slate-400 font-medium">custos</span></p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lucro Líquido</p>
          <h3 className="text-3xl font-black text-white leading-none">R$ {netProfit.toLocaleString()}</h3>
          <div className="w-full bg-slate-700 h-1 rounded-full mt-4 overflow-hidden">
             <div className="bg-blue-400 h-full" style={{ width: `${Math.min(100, (netProfit / (totalRevenue || 1)) * 100)}%` }}></div>
          </div>
        </div>
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Churn Rate</p>
          <h3 className="text-3xl font-black text-blue-900 leading-none">1.2%</h3>
          <p className="text-xs font-bold text-blue-600 mt-3 italic font-medium text-blue-700">Excelente retenção</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-900 text-lg">Histórico de Transações</h3>
          <div className="flex gap-2">
             <input type="text" placeholder="Filtrar..." className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
              <tr>
                <th className="px-8 py-5">Entidade / Descrição</th>
                <th className="px-8 py-5">Categoria</th>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Valor</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-800 leading-none">{t.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{t.type === 'income' ? 'Receita' : 'Despesa'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">{t.category}</span>
                  </td>
                  <td className="px-8 py-5 font-medium text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-8 py-5">
                    <span className={`font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {t.type === 'income' ? '+' : '-'} R$ {Math.abs(Number(t.amount)).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl ${
                      t.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {t.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="text-blue-600 font-black text-xs hover:underline">DETALHES</button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma transação registrada</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <button className="text-[11px] font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest">Ver Todas as Movimentações</button>
        </div>
      </div>
    </div>
  );
};

export default Finance;
