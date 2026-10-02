import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Global toast notifications ("Operação bem sucedida" style feedback).
 * Usage: const { showToast } = useToast(); showToast('Adicionado ao carrinho! 🛒');
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success', durationMs = 3500) => {
    const id = ++idRef.current;
    // Keep at most 4 toasts on screen
    setToasts(prev => [...prev.slice(-3), { id, message, type }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, durationMs);
  }, []);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={20} className="text-green-400 shrink-0" />,
    error: <AlertCircle size={20} className="text-red-400 shrink-0" />,
    info: <Info size={20} className="text-sky-400 shrink-0" />,
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast viewport — top-centre on mobile, bottom-right on desktop */}
      <div className="fixed inset-x-4 top-28 sm:top-auto sm:inset-x-auto sm:bottom-6 sm:right-6 z-[200] flex flex-col items-center sm:items-end gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className={`pointer-events-auto flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-2xl border max-w-sm ${
                t.type === 'error'
                  ? 'bg-red-950/95 border-red-800/60'
                  : 'bg-zinc-900/95 border-white/10'
              }`}
            >
              {icons[t.type]}
              <p className="text-sm font-medium text-white">{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
