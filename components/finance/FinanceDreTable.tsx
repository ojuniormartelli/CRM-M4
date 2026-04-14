
import React from 'react';
import { FinanceDreLine, FinanceDreComparisonMode } from '../../types/finance';
import { financeUtils } from '../../utils/financeUtils';
import { ChevronRight, ChevronDown, Info, ArrowUp, ArrowDown } from 'lucide-react';

interface FinanceDreTableProps {
  lines: FinanceDreLine[];
  comparisonMode: FinanceDreComparisonMode;
  onDrillDown: (line: FinanceDreLine) => void;
}

const FinanceDreTable: React.FC<FinanceDreTableProps> = ({ 
  lines, 
  comparisonMode,
  onDrillDown
}) => {
  const renderLine = (line: FinanceDreLine) => {
    const isNegative = line.amount < 0;
    const hasComparison = comparisonMode !== 'none';

    return (
      <tr 
        key={line.id}
        className={`group transition-all ${
          line.isSubtotal 
            ? 'bg-slate-50/50 dark:bg-slate-800/50 font-black' 
            : 'hover:bg-slate-50/30 dark:hover:bg-slate-800/30 cursor-pointer'
        }`}
        onClick={() => !line.isSubtotal && onDrillDown(line)}
      >
        <td className="px-8 py-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${line.level * 1.5}rem` }}>
            <span className={`text-xs ${line.isSubtotal ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 font-bold'}`}>
              {line.label}
            </span>
            {!line.isSubtotal && (
              <Info size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
            )}
          </div>
        </td>
        
        <td className="px-8 py-4 text-right">
          <span className={`text-xs font-mono font-black ${
            line.isSubtotal 
              ? (isNegative ? 'text-rose-600' : 'text-slate-900 dark:text-white') 
              : (isNegative ? 'text-rose-500' : 'text-emerald-600')
          }`}>
            {financeUtils.formatCurrency(line.amount)}
          </span>
        </td>

        {hasComparison && (
          <>
            <td className="px-8 py-4 text-right">
              <span className="text-xs font-mono font-bold text-slate-400">
                {financeUtils.formatCurrency(line.comparisonAmount || 0)}
              </span>
            </td>
            <td className="px-8 py-4 text-right">
              <div className="flex items-center justify-end gap-1">
                {line.percentageChange !== undefined && (
                  <>
                    {line.percentageChange > 0 ? (
                      <ArrowUp size={12} className="text-emerald-500" />
                    ) : line.percentageChange < 0 ? (
                      <ArrowDown size={12} className="text-rose-500" />
                    ) : null}
                    <span className={`text-[10px] font-black ${
                      line.percentageChange > 0 ? 'text-emerald-500' : line.percentageChange < 0 ? 'text-rose-500' : 'text-slate-400'
                    }`}>
                      {Math.abs(line.percentageChange).toFixed(1)}%
                    </span>
                  </>
                )}
              </div>
            </td>
          </>
        )}
      </tr>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/30 dark:bg-slate-800/30">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Atual</th>
              {comparisonMode !== 'none' && (
                <>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Comparativo</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Var %</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {lines.map(renderLine)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceDreTable;
