import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { useAuth } from '../../hooks/useAuth';

export const BatchUndoToast: React.FC = () => {
  const { roleSession } = useAuth();
  const { lastBatchResult, clearLastBatchResult, undoBatchEvents } = useClassData();
  const [isUndoing, setIsUndoing] = useState(false);
  const [countdown, setCountdown] = useState(7);

  useEffect(() => {
    if (!lastBatchResult || roleSession.category === 'thanh_vien') return;
    setCountdown(7);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearLastBatchResult();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lastBatchResult, clearLastBatchResult, roleSession.category]);

  if (!lastBatchResult || roleSession.category === 'thanh_vien') return null;

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await undoBatchEvents(lastBatchResult.eventIds);
    } catch (err) {
      console.error('Undo failed:', err);
    } finally {
      setIsUndoing(false);
      clearLastBatchResult();
    }
  };

  const isPositive = lastBatchResult.score >= 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 max-w-md w-[calc(100vw-2rem)] shadow-xl rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-md text-white p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                Đã ghi nhận {lastBatchResult.count} học sinh
              </p>
              <p className="text-xs text-slate-400 truncate">
                {lastBatchResult.criterionName} ({isPositive ? `+${lastBatchResult.score}` : lastBatchResult.score}đ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndo}
              disabled={isUndoing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
              <span>Hoàn tác ({countdown}s)</span>
            </button>
            <button
              onClick={clearLastBatchResult}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
