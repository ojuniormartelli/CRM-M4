
import React from 'react';
import { FinanceAlert } from '../../types/finance';
import { AlertCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react';

interface FinanceAlertsPanelProps {
  alerts: FinanceAlert[];
}

const FinanceAlertsPanel: React.FC<FinanceAlertsPanelProps> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4">
        <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Alertas Gerenciais</h4>
        <span className="px-2 py-1 bg-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-widest rounded-lg">
          {alerts.length} {alerts.length === 1 ? 'Alerta' : 'Alertas'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert) => (
          <div 
            key={alert.id}
            className={`p-6 rounded-[2.5rem] border flex items-start gap-4 transition-all hover:shadow-md ${
              alert.type === 'critical' 
                ? 'bg-rose-50 border-rose-100' 
                : alert.type === 'warning' 
                  ? 'bg-amber-50 border-amber-100' 
                  : 'bg-blue-50 border-blue-100'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
              alert.type === 'critical' 
                ? 'bg-white text-rose-600' 
                : alert.type === 'warning' 
                  ? 'bg-white text-amber-600' 
                  : 'bg-white text-blue-600'
            }`}>
              {alert.type === 'critical' ? <AlertCircle size={24} /> : alert.type === 'warning' ? <AlertTriangle size={24} /> : <Info size={24} />}
            </div>
            
            <div className="flex-1">
              <h5 className={`text-sm font-black tracking-tight ${
                alert.type === 'critical' ? 'text-rose-900' : alert.type === 'warning' ? 'text-amber-900' : 'text-blue-900'
              }`}>
                {alert.title}
              </h5>
              <p className={`text-xs font-medium mt-1 ${
                alert.type === 'critical' ? 'text-rose-700' : alert.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
              }`}>
                {alert.message}
              </p>
              {alert.value && (
                <p className="text-xs font-black mt-2 text-slate-900">{alert.value}</p>
              )}
            </div>

            <button className="self-center p-2 text-slate-400 hover:text-slate-600 transition-all">
              <ChevronRight size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinanceAlertsPanel;
