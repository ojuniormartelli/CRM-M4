
import React from 'react';
import { Lead, PipelineStage, FunnelStatus } from '../types';
import { motion } from 'framer-motion';
import { ICONS } from '../constants';

interface FunnelDashboardProps {
  leads: Lead[];
  stages: PipelineStage[];
}

const FunnelDashboard: React.FC<FunnelDashboardProps> = ({ leads, stages }) => {
  const getStatusCount = (status: FunnelStatus) => {
    const statusStages = stages.filter(s => s.status === status).map(s => s.id);
    const isInitial = status === FunnelStatus.INITIAL;
    
    return leads.filter(l => {
      const isActive = !l.status || (l.status !== FunnelStatus.WON && l.status !== FunnelStatus.LOST && l.status !== 'won' && l.status !== 'lost');
      if (!isActive) return false;

      const stageExists = stages.some(s => s.id === l.stage);
      // If it's the initial status, also count leads with no stage or an invalid stage
      return statusStages.includes(l.stage) || (isInitial && (!l.stage || !stageExists));
    }).length;
  };

  const activeLeads = leads.filter(l => {
    const isActive = !l.status || (l.status !== FunnelStatus.WON && l.status !== FunnelStatus.LOST && l.status !== 'won' && l.status !== 'lost');
    return isActive;
  });

  const initialCount = getStatusCount(FunnelStatus.INITIAL);
  const intermediateCount = getStatusCount(FunnelStatus.INTERMEDIATE);
  const wonCount = getStatusCount(FunnelStatus.WON);
  const lostCount = getStatusCount(FunnelStatus.LOST);
  const total = activeLeads.length;

  const stats = [
    { label: 'Início (Novos)', count: initialCount, status: FunnelStatus.INITIAL, color: 'bg-blue-500', icon: <ICONS.Plus className="w-5 h-5" /> },
    { label: 'Meio (Nutrição)', count: intermediateCount, status: FunnelStatus.INTERMEDIATE, color: 'bg-amber-500', icon: <ICONS.Clock className="w-5 h-5" /> },
    { label: 'Ganho (Clientes)', count: wonCount, status: FunnelStatus.WON, color: 'bg-emerald-500', icon: <ICONS.CheckCircle className="w-5 h-5" /> },
    { label: 'Perdido (Desistência)', count: lostCount, status: FunnelStatus.LOST, color: 'bg-rose-500', icon: <ICONS.X className="w-5 h-5" /> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.status}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${stat.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stat.count}</h3>
            </div>
          </div>
          
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: total > 0 ? `${(stat.count / total) * 100}%` : '0%' }}
              className={`h-full ${stat.color}`}
            />
          </div>
          <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {total > 0 ? Math.round((stat.count / total) * 100) : 0}% do total
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default FunnelDashboard;
