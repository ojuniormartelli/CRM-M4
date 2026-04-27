
import React from 'react';
import { ICONS } from '../constants';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'primary',
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-300 pointer-events-auto relative z-10">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
          variant === 'danger' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
        }`}>
          {variant === 'danger' ? <ICONS.Trash className="w-8 h-8" /> : <ICONS.AlertTriangle className="w-8 h-8" />}
        </div>
        
        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">{message}</p>
        
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all flex items-center justify-center gap-2 ${
              variant === 'danger' 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-100 dark:shadow-none' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100 dark:shadow-none'
            } disabled:opacity-50 cursor-pointer pointer-events-auto`}
          >
            {isLoading && <span className="animate-spin text-lg">◌</span>}
            {isLoading ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
