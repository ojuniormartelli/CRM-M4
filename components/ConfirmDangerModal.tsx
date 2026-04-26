
import React from 'react';
import { ICONS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDangerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  impactItems?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDangerModal: React.FC<ConfirmDangerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  impactItems = [],
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isLoading = false,
  variant = 'danger'
}) => {
  const variantConfig = {
    danger: {
      icon: <ICONS.Trash width="32" height="32" />,
      iconBg: 'bg-destructive/10 text-destructive',
      buttonBg: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      ringColor: 'ring-destructive/20'
    },
    warning: {
      icon: <ICONS.AlertCircle width="32" height="32" />,
      iconBg: 'bg-amber-500/10 text-amber-600',
      buttonBg: 'bg-amber-600 text-white hover:bg-amber-700',
      ringColor: 'ring-amber-500/20'
    },
    info: {
      icon: <ICONS.Archive width="32" height="32" />,
      iconBg: 'bg-blue-500/10 text-blue-600',
      buttonBg: 'bg-blue-600 text-white hover:bg-blue-700',
      ringColor: 'ring-blue-500/20'
    }
  };

  const config = variantConfig[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-[300]"
          />
          <div className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl border border-border pointer-events-auto overflow-hidden relative"
            >
              <div className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ${config.ringColor}`}>
                {config.icon}
              </div>
              
              <h3 className="text-2xl font-black text-foreground uppercase text-center mb-2 tracking-tight">
                {title}
              </h3>
              
              <p className="text-sm text-muted-foreground font-bold text-center mb-8 px-4">
                {description}
              </p>

              {impactItems.length > 0 && (
                <div className="bg-muted/50 rounded-2xl p-6 mb-8 border border-border">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Impacto da ação:</h4>
                  <ul className="space-y-3">
                    {impactItems.map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-xs font-bold text-foreground/80">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-muted/80 transition-all disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button 
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-4 ${config.buttonBg} rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all disabled:opacity-50 shadow-lg shadow-black/5 flex items-center justify-center gap-2`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDangerModal;
