import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-100 dark:border-emerald-900/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40'
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" />,
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      border: 'border-rose-100 dark:border-rose-900/30',
      text: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-100 dark:bg-rose-900/40'
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-100 dark:border-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40'
    },
    warning: {
      icon: <AlertCircle className="w-5 h-5" />,
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-100 dark:border-amber-900/30',
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40'
    }
  };

  const style = config[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[500] px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border pointer-events-auto min-w-[320px] max-w-md"
          style={{ 
            backgroundColor: 'var(--background)',
            borderColor: 'var(--border)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${style.iconBg} ${style.text}`}>
            {style.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-black uppercase tracking-widest ${style.text} mb-0.5`}>
              {type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Atenção'}
            </p>
            <p className="text-sm font-bold text-foreground truncate">
              {message}
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
