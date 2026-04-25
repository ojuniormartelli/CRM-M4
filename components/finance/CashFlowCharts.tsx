
import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { CashFlowEntry, FinanceDashboardStats } from '../../types/finance';
import { financeUtils } from '../../utils/financeUtils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashFlowChartsProps {
  cashFlow: CashFlowEntry[];
  stats: FinanceDashboardStats;
}

const CashFlowCharts: React.FC<CashFlowChartsProps> = ({ cashFlow, stats }) => {
  const chartData = cashFlow.map(entry => ({
    ...entry,
    formattedDate: format(parseISO(entry.date), 'dd/MM', { locale: ptBR })
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 shadow-xl rounded-2xl">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{entry.name}:</span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {financeUtils.formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Saldo Acumulado */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="mb-6">
          <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Saldo Acumulado</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evolução do caixa no período</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAccumulated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="formattedDate" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="accumulated" 
                name="Saldo Acumulado"
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAccumulated)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Entradas vs Saídas */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="mb-6">
          <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Entradas vs Saídas</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Movimentação diária</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="formattedDate" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 20 }}
              />
              <Bar dataKey="entries" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exits" name="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CashFlowCharts;
