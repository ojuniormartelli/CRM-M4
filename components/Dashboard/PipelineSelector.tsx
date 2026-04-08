
import React from 'react';
import { Pipeline } from '../../types';

interface PipelineSelectorProps {
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
  onSelect: (pipelineId: string | null) => void;
}

export const PipelineSelector: React.FC<PipelineSelectorProps> = ({
  pipelines,
  selectedPipelineId,
  onSelect
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-muted-foreground">Pipeline:</span>
      <select
        value={selectedPipelineId || 'all'}
        onChange={(e) => onSelect(e.target.value === 'all' ? null : e.target.value)}
        className="px-4 py-2 rounded-xl border border-border bg-card text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
      >
        <option value="all">Todas as Pipelines</option>
        {pipelines.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
};
