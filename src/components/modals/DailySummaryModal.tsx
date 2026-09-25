import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle, 
  Copy, 
  Check, 
  Clock, 
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { useAuth } from '../../hooks/useAuth';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DailySummaryResult {
  summary: string;
  pedagogicalNote: string;
  highlights: string[];
  recommendations: string[];
}

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentClass, events, students, selectedWeek } = useClassData();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiResult, setAiResult] = useState<DailySummaryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter events of the selected date
  const dayEvents = useMemo(() => {
    return events.filter(e => e.date === selectedDate);
  }, [events, selectedDate]);

  // Real data calculations
  const stats = useMemo(() => {
    let positiveScore = 0;
    let negativeScore = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    const studentEventMap: Record<string, { positive: number; negative: number; count: number; name: string }> = {};

    for (const ev of dayEvents) {
      if (!studentEventMap[ev.studentId]) {
        studentEventMap[ev.studentId] = {
          positive: 0,
          negative: 0,
          count: 0,
          name: ev.studentName || 'Học sinh'
        };
      }
      studentEventMap[ev.studentId].count += 1;

      if (ev.score >= 0) {
        positiveScore += ev.score;
        positiveCount += 1;
        studentEventMap[ev.studentId].positive += ev.score;
      } else {
        negativeScore += ev.score;
        negativeCount += 1;
        studentEventMap[ev.studentId].negative += Math.abs(ev.score);
      }
    }

    const studentList = Object.entries(studentEventMap).map(([sId, data]) => ({
      studentId: sId,
      name: data.name,
      ...data
    }));

    const topPositiveStudents = [...studentList]
      .filter(s => s.positive > 0)
      .sort((a, b) => b.positive - a.positive)
      .slice(0, 3);

    const topAttentionStudents = [...studentList]
      .filter(s => s.negative > 0)
      .sort((a, b) => b.negative - a.negative)
      .slice(0, 3);

    return {
      totalEvents: dayEvents.length,
      positiveScore,
      negativeScore,
      positiveCount,
      negativeCount,
      activeStudentsCount: studentList.length,
      topPositiveStudents,
      topAttentionStudents
    };
  }, [dayEvents]);

  if (!isOpen) return null;

  const handleGenerateSummary = async () => {
    setLoadingAi(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/gemini/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          className: currentClass?.className || 'Lớp học',
          stats,
          events: dayEvents.map(e => ({
            studentName: e.studentName,
            criterionName: e.criterionName,
            score: e.score,
            note: e.note
          }))
        })
      });

      if (!response.ok) throw new Error('Không thể kết nối đến máy chủ AI');
      const data = await response.json();
      setAiResult(data);
    } catch (err: any) {
      console.error('Daily summary failed:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi tổng hợp');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCopy = () => {
    if (!aiResult) return;
    const text = `[NHẬT KÝ SƯ PHẠM NGÀY ${selectedDate}] - LỚP ${currentClass?.className || ''}
1. TỔNG QUAN:
${aiResult.summary}

2. NHẬN XÉT SƯ PHẠM:
${aiResult.pedagogicalNote}

3. ĐIỂM SÁNG TRONG NGÀY:
${aiResult.highlights.map(h => `- ${h}`).join('\n')}

4. GỢI Ý HÀNH ĐỘNG NGÀY MAI:
${aiResult.recommendations.map(r => `- ${r}`).join('\n')}

Số liệu thực tế: ${stats.totalEvents} sự kiện (+${stats.positiveScore}đ, ${stats.negativeScore}đ), ${stats.activeStudentsCount} học sinh tham gia.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Tổng Hợp Nhanh Cuối Ngày
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lớp {currentClass?.className || 'Lớp học'} • Năm học {currentClass?.schoolYear || '2026-2027'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Date Picker Bar */}
          <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Chọn ngày tổng kết:
              </span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setAiResult(null);
              }}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Quick Metrics of the day */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sự kiện</span>
              <p className="text-base font-bold text-slate-900 dark:text-white">{stats.totalEvents}</p>
            </div>
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Điểm cộng</span>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">+{stats.positiveScore}đ</p>
            </div>
            <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-800/40">
              <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Điểm trừ</span>
              <p className="text-base font-bold text-rose-600 dark:text-rose-400">{stats.negativeScore}đ</p>
            </div>
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-800/40">
              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">Học sinh ghi nhận</span>
              <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">{stats.activeStudentsCount}</p>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateSummary}
            disabled={loadingAi}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${loadingAi ? 'animate-spin' : ''}`} />
            <span>{loadingAi ? 'AI đang tổng hợp và phân tích sư phạm...' : 'AI Tổng Hợp Tình Hình Trong Ngày'}</span>
          </button>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AI Result Card */}
          {aiResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50"
            >
              <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-3">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Bản Tổng Kết Ngày (Gợi ý Sư Phạm)</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tổng quan ngày
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {aiResult.summary}
                </p>
              </div>

              {/* Pedagogical Note */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nhận xét sư phạm
                </span>
                <p className="text-xs text-indigo-950 dark:text-indigo-200 italic leading-relaxed bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  "{aiResult.pedagogicalNote}"
                </p>
              </div>

              {/* Highlights & Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <Award className="w-3.5 h-3.5" />
                    <span>Điểm sáng trong ngày</span>
                  </div>
                  <ul className="text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
                    {aiResult.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-800/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Gợi ý hành động ngày mai</span>
                  </div>
                  <ul className="text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                    {aiResult.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
};
