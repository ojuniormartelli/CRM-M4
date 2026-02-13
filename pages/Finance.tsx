
import React from 'react';
import { ICONS } from '../constants';

const Finance: React.FC = () => {
  const transactions = [
    { id: '1', name: 'Indústria Metalúrgica SA', amount: 15500, date: '2023-11-20', type: 'Receita', status: 'Pago', category: 'Mensalidade' },
    { id: '2', name: 'Google Ads (MCC Agência)', amount: -45000, date: '2023-11-19', type: 'Despesa', status: 'Pago', category: 'Tráfego Pago' },
    { id: '3', name: 'BioEstética Ltda', amount: 4200, date: '2023-11-15', type: 'Receita', status: 'Pendente', category: 'Mensalidade' },
    { id: '4', name: 'Amazon AWS - Cloud', amount: -2100, date: '2023-11-10', type: 'Despesa', status: 'Pago', category: 'Infraestrutura' },
    { id: '5', name: 'Tech Logistics', amount: 28000, date: '2023-11-05', type: 'Receita', status: 'Pago', category: 'Setup Projeto' },
  ];

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
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MRR (Faturamento Recorrente)</p>
          <h3 className="text-3xl font-black text-slate-900 leading-none">R$ 104.200</h3>
          <p className="text-xs font-bold text-emerald-600 mt-3 flex items-center gap-1">▲ 12.5% <span className="text-slate-400 font-medium">este mês</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Despesas Operacionais</p>
          <h3 className="text-3xl font-black text-slate-900 leading-none">R$ 48.300</h3>
          <p className="text-xs font-bold text-red-500 mt-3 flex items-center gap-1">▼ 2.1% <span className="text-slate-400 font-medium">custo reduzido</span></p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lucro Líquido</p>
          <h3 className="text-3xl font-black text-white leading-none">R$ 55.900</h3>
          <div className="w-full bg-slate-700 h-1 rounded-full mt-4 overflow-hidden">
             <div className="bg-blue-400 h-full w-[54%]"></div>
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
                    <p className="font-black text-slate-800 leading-none">{t.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{t.type}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">{t.category}</span>
                  </td>
                  <td className="px-8 py-5 font-medium text-slate-500">{t.date}</td>
                  <td className="px-8 py-5">
                    <span className={`font-black ${t.amount > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {t.amount > 0 ? '+' : ''} R$ {t.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl ${
                      t.status === 'Pago' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="text-blue-600 font-black text-xs hover:underline">DETALHES</button>
                  </td>
                </tr>
              ))}
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
