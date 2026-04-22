
import React from 'react';
import { Pipeline, UserRole, User } from '../../types';
import { ICONS } from '../../constants';

interface PipelineSelectorProps {
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
  onSelect: (pipelineId: string | null) => void;
  setActiveTab?: (tab: string) => void;
  currentUser?: User | null;
}

export const PipelineSelector: React.FC<PipelineSelectorProps> = ({
  pipelines,
  selectedPipelineId,
  onSelect,
  setActiveTab,
  currentUser
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-muted-foreground">Pipeline:</span>
      <div className="flex bg-card rounded-xl border border-border shadow-sm p-1">
        <select
          value={selectedPipelineId || 'all'}
          onChange={(e) => onSelect(e.target.value === 'all' ? null : e.target.value)}
          className="bg-transparent border-none text-foreground text-xs font-bold focus:ring-0 cursor-pointer pl-3 pr-8 py-1.5"
        >
          <option value="all">Todas as Pipelines</option>
          {pipelines.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        
        {setActiveTab && (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.OWNER) && (
          <button
            onClick={() => setActiveTab('settings_pipelines')}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
            title="Gerenciar Pipelines"
          >
            <ICONS.Settings width="16" height="16" />
          </button>
        )}
      </div>
    </div>
  );
};
