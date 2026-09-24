import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  RotateCcw, 
  CheckSquare, 
  Lock, 
  Plus, 
  Minus, 
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  X
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { Criterion } from '../../types';

interface QuickScoreBarProps {
  selectedStudentIds: string[];
  onClearSelection: () => void;
  onOpenBatchModal?: () => void;
  onOpenWeekLockModal?: () => void;
  evaluator?: {
    evaluatorId?: string;
    studentId?: string;
    name?: string;
    evaluatorName?: string;
    roleLabel?: string;
    evaluatorRole?: string;
  };
}

export const QuickScoreBar: React.FC<QuickScoreBarProps> = ({
  selectedStudentIds,
  onClearSelection,
  onOpenBatchModal,
  onOpenWeekLockModal,
  evaluator
}) => {
  const { 
    criteria, 
    batchAddEvents, 
    recentActions, 
    undoEvent, 
    isCurrentWeekLocked, 
    selectedWeek 
  } = useClassData();

  const [isProcessing, setIsProcessing] = useState(false);
  const [undoStatus, setUndoStatus] = useState<string | null>(null);

  // Most recent action
  const latestAction = recentActions[0];
  const isUndoable = latestAction && (Date.now() - latestAction.timestamp < 15 * 60 * 1000); // 15 mins

  // Find popular criteria for quick 1-tap scoring sorted by order
  const sortedCriteria = useMemo(() => {
    return [...criteria].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [criteria]);

  const positiveCriteria = sortedCriteria.filter(c => c.positiveScore > 0).slice(0, 4);
  const negativeCriteria = sortedCriteria.filter(c => c.negativeScore < 0).slice(0, 4);

  const handleQuickCriterion = async (criterion: Criterion) => {
    if (isCurrentWeekLocked) {
      alert(`Tuần ${selectedWeek} đã được khóa sổ. Không thể chấm thi đua.`);
      return;
    }
    if (selectedStudentIds.length === 0) return;

    setIsProcessing(true);
    try {
      const score = criterion.positiveScore > 0 ? criterion.positiveScore : criterion.negativeScore;
      await batchAddEvents(selectedStudentIds, criterion.criterionId, score, criterion.name, evaluator);
      onClearSelection();
    } catch (err: any) {
      alert(`Lỗi khi chấm điểm: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = async (eventId: string) => {
    setIsProcessing(true);
    try {
      const success = await undoEvent(eventId);
      if (success) {
        setUndoStatus('Đã hoàn tác sự kiện vừa chấm!');
        setTimeout(() => setUndoStatus(null), 3000);
      }
    } catch (err: any) {
      alert(`Không thể hoàn tác: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // If week is locked, show persistent warning bar
  if (isCurrentWeekLocked) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl bg-amber-900/90 text-amber-100 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-amber-700/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-2 text-xs">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Tuần {selectedWeek} đã khóa sổ thi đua:</strong> Dữ liệu được bảo toàn ở chế độ chỉ đọc.
          </span>
        </div>
        {onOpenWeekLockModal && (
          <button
            onClick={onOpenWeekLockModal}
            className="px-3 py-1 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
          >
            Quản lý khóa sổ
          </button>
        )}
      </div>
    );
  }

  // If students are selected, show Bulk Action Bar
  if (selectedStudentIds.length > 0) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-3xl bg-slate-900/95 text-white backdrop-blur-md p-3 sm:px-4 sm:py-3 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom-3">
        {/* Left: Selection info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
            {selectedStudentIds.length}
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">
              Đã chọn {selectedStudentIds.length} học sinh
            </div>
            <div className="text-[10px] text-slate-400">
              Nhấn 1 chạm để áp dụng ngay
            </div>
          </div>
          <button
            onClick={onClearSelection}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            title="Bỏ chọn tất cả"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Quick 1-tap criteria buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {positiveCriteria.map(crit => (
            <button
              key={crit.criterionId}
              onClick={() => handleQuickCriterion(crit)}
              disabled={isProcessing}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
              title={`[STT ${crit.order}] ${crit.name} (+${crit.positiveScore})`}
            >
              <span className="text-[10px] font-black opacity-80 bg-black/20 px-1 py-0.5 rounded">#{crit.order}</span>
              <span>+{crit.positiveScore}</span>
              <span className="truncate max-w-[80px] sm:max-w-[110px] font-normal">{crit.name}</span>
            </button>
          ))}

          {negativeCriteria.map(crit => (
            <button
              key={crit.criterionId}
              onClick={() => handleQuickCriterion(crit)}
              disabled={isProcessing}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
              title={`[STT ${crit.order}] ${crit.name} (${crit.negativeScore})`}
            >
              <span className="text-[10px] font-black opacity-80 bg-black/20 px-1 py-0.5 rounded">#{crit.order}</span>
              <span>{crit.negativeScore}</span>
              <span className="truncate max-w-[80px] sm:max-w-[110px] font-normal">{crit.name}</span>
            </button>
          ))}

          {onOpenBatchModal && (
            <button
              onClick={onOpenBatchModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Xem tất cả...
            </button>
          )}
        </div>
      </div>
    );
  }

  // If recent action exists within 15 minutes, show quick Undo Toast pill
  if (latestAction && isUndoable) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-slate-700/60 flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2">
        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate max-w-xs">
          Vừa chấm: <strong>{latestAction.studentName}</strong> (
          <span className={latestAction.score > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {latestAction.score > 0 ? `+${latestAction.score}` : latestAction.score}đ
          </span>{' '}
          - {latestAction.criterionName})
        </span>
        <button
          onClick={() => handleUndo(latestAction.eventId)}
          disabled={isProcessing}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 font-bold text-xs transition-colors cursor-pointer border border-slate-700"
        >
          <RotateCcw className="w-3 h-3" />
          Hoàn tác
        </button>
        {undoStatus && (
          <span className="text-[11px] text-emerald-400 font-semibold">{undoStatus}</span>
        )}
      </div>
    );
  }

  return null;
};
