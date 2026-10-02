import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Tailwind max-width class for the panel */
  maxWidth?: string;
  /** Set to false when the content renders its own close button */
  showCloseButton?: boolean;
}

/**
 * Shared modal shell for all new feature modals.
 * - Closes on ESC key and on outside click (backdrop)
 * - Locks body scroll while open
 * - Animates with the site's design language
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  maxWidth = 'max-w-xl',
  showCloseButton = true,
}) => {
  // ESC key + body scroll lock
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 bg-white w-full ${maxWidth} rounded-[40px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col`}
          >
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="absolute top-5 right-5 z-20 p-2 bg-white/10 backdrop-blur-md rounded-full text-zinc-900 hover:bg-zinc-100 transition-all"
              >
                <X size={22} />
              </button>
            )}
            <div className="overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
