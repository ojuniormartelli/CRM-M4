
import React from 'react';
import { Lead, Pipeline } from '../../types';
import { metricsUtils } from '../../utils/metrics';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SourceAnalyticsProps {
  leads: Lead[];
  pipelines: Pipeline[];
}

const COLORS_PIE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'];

export const SourceAnalytics: React.FC<SourceAnalyticsProps> = ({ leads, pipelines }) => {
  const sourceDistribution = metricsUtils.getLeadsBySource(leads);
  const roiData = metricsUtils.getROIBySource(leads, pipelines);

  const pieData = sourceDistribution.map(s => ({
    name: s.source,
    value: s.count
  }));

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
      <h3 className="text-lg font-black text-foreground mb-8 uppercase tracking-widest">
        Análise de Fontes
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-64">
          <ResponsiveContainer width="100%" height={256} minWidth={0}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4 overflow-y-auto max-h-64 pr-2 scrollbar-none">
          {roiData.sort((a, b) => b.revenue - a.revenue).map((item, idx) => (
            <div key={idx} className="p-4 bg-muted/30 rounded-2xl border border-border">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black text-foreground uppercase tracking-widest">{item.source}</span>
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                  {item.conversionRate.toFixed(1)}% Conv.
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Receita</p>
                  <p className="text-lg font-black text-foreground">R$ {item.revenue.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Leads</p>
                  <p className="text-sm font-black text-foreground">{item.leads}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
