
import React, { useEffect, useRef } from 'react';
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
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Pequeno delay para garantir que o elemento está no DOM e visível após a animação
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }

        if (e.key === 'Tab' && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timer);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

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
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              aria-describedby="modal-description"
              className="bg-card rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl border border-border pointer-events-auto overflow-hidden relative focus:outline-none"
              tabIndex={-1}
            >
              <div className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ${config.ringColor}`}>
                {config.icon}
              </div>
              
              <h3 id="modal-title" className="text-2xl font-black text-foreground uppercase text-center mb-2 tracking-tight">
                {title}
              </h3>
              
              <p id="modal-description" className="text-sm text-muted-foreground font-bold text-center mb-8 px-4">
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
                  ref={cancelButtonRef}
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-muted/80 transition-all disabled:opacity-50 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
                >
                  {cancelLabel}
                </button>
                <button 
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-4 ${config.buttonBg} rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all disabled:opacity-50 shadow-lg shadow-black/5 flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background`}
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

