
import React from 'react';
import { Lead, Pipeline } from '../../types';
import { metricsUtils } from '../../utils/metrics';

interface PerformanceScorecardProps {
  leads: Lead[];
  pipelines: Pipeline[];
}

export const PerformanceScorecard: React.FC<PerformanceScorecardProps> = ({ leads, pipelines }) => {
  const ranking = leads
    .filter(l => metricsUtils.isWonLead(l, pipelines))
    .reduce((acc: any[], lead) => {
      const seller = lead.responsible_name || 'Sistema';
      const existing = acc.find(a => a.name === seller);
      if (existing) {
        existing.sales += 1;
        existing.revenue += Number(lead.value) || 0;
        existing.leads += 1; // Simplificação: contando leads ganhos como leads totais por enquanto para o ranking
      } else {
        acc.push({ 
          name: seller, 
          sales: 1, 
          revenue: Number(lead.value) || 0, 
          leads: 1,
          img: `https://i.pravatar.cc/150?u=${seller}` 
        });
      }
      return acc;
    }, [])
    .map(v => ({
      ...v,
      conversionRate: v.leads > 0 ? (v.sales / v.leads) * 100 : 0,
      averageTicket: v.sales > 0 ? v.revenue / v.sales : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
      <h3 className="text-lg font-black text-foreground mb-8 uppercase tracking-widest">
        Scorecard de Performance
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Vendedor</th>
              <th className="pb-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Vendas</th>
              <th className="pb-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Conv. (%)</th>
              <th className="pb-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Receita</th>
              <th className="pb-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Ticket Médio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ranking.map((v, idx) => (
              <tr key={idx} className="group hover:bg-muted/30 transition-all">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={v.img} className="w-10 h-10 rounded-xl border-2 border-card shadow-sm" alt={v.name} />
                      {idx < 3 && (
                        <div className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm ${
                          idx === 0 ? 'bg-amber-400 text-amber-950' : 
                          idx === 1 ? 'bg-slate-300 text-slate-900' : 
                          'bg-orange-400 text-orange-950'
                        }`}>
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground">{v.name}</span>
                  </div>
                </td>
                <td className="py-4 text-center text-sm font-bold text-foreground">{v.sales}</td>
                <td className="py-4 text-center">
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                    v.conversionRate > 30 ? 'bg-emerald-50 text-emerald-600' : 
                    v.conversionRate > 15 ? 'bg-amber-50 text-amber-600' : 
                    'bg-red-50 text-red-600'
                  }`}>
                    {v.conversionRate.toFixed(1)}%
                  </span>
                </td>
                <td className="py-4 text-right text-sm font-black text-primary">R$ {v.revenue.toLocaleString()}</td>
                <td className="py-4 text-right text-sm font-medium text-muted-foreground">R$ {v.averageTicket.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {ranking.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-sm font-bold uppercase">Nenhum dado de performance disponível</p>
        </div>
      )}
    </div>
  );
};
