import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Loader2, Sparkles, AlertCircle, Shield } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'loading' | 'info' | 'error';
  message: string;
  description?: string;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss?: (id: string) => void;
}

export const ToastContainer: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs sm:max-w-sm px-3 pointer-events-none space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`pointer-events-auto rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl border flex items-center gap-3 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-slate-950/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
                : toast.type === 'loading'
                ? 'bg-slate-950/95 border-violet-500/40 text-violet-300 shadow-violet-950/40'
                : toast.type === 'error'
                ? 'bg-slate-950/95 border-red-500/40 text-red-300 shadow-red-950/40'
                : 'bg-slate-950/95 border-slate-700/60 text-slate-200 shadow-slate-950/40'
            }`}
          >
            {/* Icon */}
            <div className="shrink-0">
              {toast.type === 'success' && (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 animate-bounce" />
                </div>
              )}
              {toast.type === 'loading' && (
                <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Message */}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white tracking-wide flex items-center gap-1.5">
                {toast.type === 'success' && <span className="text-emerald-400 font-extrabold">✓</span>}
                {toast.message}
              </p>
              {toast.description && (
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                  {toast.description}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export interface ProcessingOverlayProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  icon?: 'report' | 'evidence' | 'lock' | 'shield';
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  isOpen,
  title,
  subtitle,
  icon = 'shield'
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 select-none"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-slate-900 border border-violet-500/30 rounded-3xl p-6 shadow-2xl max-w-xs w-full text-center flex flex-col items-center space-y-4"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-violet-600/30 rounded-2xl blur-xl animate-pulse" />
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-violet-500/50 flex items-center justify-center text-violet-400 relative z-10 shadow-lg">
              {icon === 'report' ? (
                <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" />
              ) : icon === 'evidence' ? (
                <Shield className="w-8 h-8 text-violet-400 animate-pulse" />
              ) : (
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>

          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <motion.div
              className="bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-400 h-full rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: ['10%', '65%', '95%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
