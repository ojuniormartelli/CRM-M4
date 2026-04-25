
import React from 'react';
import { Lead, Pipeline } from '../../types';
import { metricsUtils } from '../../utils/metrics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StageConversionChartProps {
  leads: Lead[];
  pipelines: Pipeline[];
}

export const StageConversionChart: React.FC<StageConversionChartProps> = ({ leads, pipelines }) => {
  const stageRates = metricsUtils.getStageConversionRates(leads, pipelines);
  
  const data = Object.values(stageRates).map(rate => ({
    name: rate.stage,
    rate: rate.rate,
    total: rate.total,
    converted: rate.converted
  }));

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
      <h3 className="text-lg font-black text-foreground mb-8 uppercase tracking-widest">
        Conversão por Estágio
      </h3>
      
      <div style={{ height: 320 }} className="w-full">
        <ResponsiveContainer width="100%" height={320} minWidth={0}>
          <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.1} />
            <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: 'currentColor', fontSize: 10, fontWeight: 800}} className="text-muted-foreground" />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: 'currentColor', fontSize: 10, fontWeight: 800}} width={100} className="text-muted-foreground" />
            <Tooltip 
              contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
              itemStyle={{ color: 'var(--foreground)' }}
              formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Taxa de Conversão']}
            />
            <Bar dataKey="rate" radius={[0, 12, 12, 0]} barSize={32}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.rate > 30 ? '#10b981' : entry.rate > 15 ? '#f59e0b' : '#ef4444'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground p-2 bg-muted/30 rounded-lg">
            <span>{item.name}</span>
            <span className="text-foreground">{item.converted} / {item.total} leads ({item.rate.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};
