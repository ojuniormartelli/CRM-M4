import React from 'react';
import { 
  CheckSquare, 
  Clock, 
  Activity, 
  Briefcase, 
  Users, 
  FileText,
  LayoutDashboard
} from 'lucide-react';

export type ClientTabId = 'summary' | 'tasks' | 'routines' | 'meetings' | 'services' | 'contacts' | 'notes';

interface ClientTabsProps {
  activeTab: ClientTabId;
  onChangeTab: (tab: ClientTabId) => void;
}

export const ClientTabs: React.FC<ClientTabsProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'summary' as const, label: 'Visão geral', icon: LayoutDashboard },
    { id: 'tasks' as const, label: 'Entregas', icon: CheckSquare },
    { id: 'services' as const, label: 'Financeiro', icon: Briefcase },
    { id: 'contacts' as const, label: 'Contatos', icon: Users },
    { id: 'notes' as const, label: 'Histórico', icon: FileText },
    { id: 'meetings' as const, label: 'Calls / Reuniões', icon: Activity },
    { id: 'routines' as const, label: 'Rotinas', icon: Clock },
  ];

  return (
    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-slate-100 dark:border-slate-800">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-none'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
