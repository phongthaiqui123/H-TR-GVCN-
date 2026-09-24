import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Users, 
  ListChecks, 
  RotateCw,
  Eye
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { AiWeeklyInsight } from '../../types';

interface AiWeeklyInsightCardProps {
  onSelectStudent?: (studentId: string) => void;
}

export const AiWeeklyInsightCard: React.FC<AiWeeklyInsightCardProps> = ({
  onSelectStudent
}) => {
  const { currentClass, selectedWeek, studentsWithScores, teamSummaries, events } = useClassData();
  const [insight, setInsight] = useState<AiWeeklyInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const weekEvents = events.filter(e => e.week === selectedWeek);
      const totalPos = weekEvents.filter(e => e.score > 0).reduce((sum, e) => sum + e.score, 0);
      const totalNeg = weekEvents.filter(e => e.score < 0).reduce((sum, e) => sum + Math.abs(e.score), 0);

      const statsSummary = {
        totalStudents: studentsWithScores.length,
        avgScore: teamSummaries.length > 0
          ? Math.round((teamSummaries.reduce((acc, t) => acc + t.avgScore, 0) / teamSummaries.length) * 10) / 10
          : 100,
        totalEvents: weekEvents.length,
        totalPositiveScore: totalPos,
        totalNegativeScore: totalNeg,
      };

      const anomalies = [];
      const lowScores = studentsWithScores.filter(s => s.currentWeekScore < (currentClass?.startingScore || 100) - 5);
      if (lowScores.length > 0) {
        anomalies.push({
          type: 'low_score_alert',
          count: lowScores.length,
          names: lowScores.slice(0, 3).map(s => s.fullName)
        });
      }

      const response = await fetch('/api/gemini/weekly-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: selectedWeek,
          classInfo: currentClass,
          statsSummary,
          studentsScores: studentsWithScores.map(s => ({
            studentId: s.studentId,
            fullName: s.fullName,
            teamName: s.teamName,
            finalScore: s.currentWeekScore,
            totalPositive: s.totalPositive,
            totalNegative: s.totalNegative,
            rankCategory: s.rankCategory,
          })),
          teamRankings: teamSummaries.map(t => ({
            teamName: t.teamName,
            avgScore: t.avgScore,
            rank: t.rank,
            studentCount: t.studentCount
          })),
          anomalies
        })
      });

      if (!response.ok) throw new Error('Không thể tạo phân tích tuần');
      const data = await response.json();
      setInsight(data.insight);
    } catch (err: any) {
      console.error('Failed to generate weekly insight:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi tạo phân tích');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!insight) return;
    const text = `[PHÂN TÍCH SƯ PHẠM TUẦN ${selectedWeek}] - LỚP ${currentClass?.className || ''}
1. TỔNG QUAN:
${insight.summary}

2. XU HƯỚNG TÍCH CỰC:
${insight.positiveTrends.map(t => `- ${t}`).join('\n')}

3. XU HƯỚNG CẦN LƯU Ý:
${insight.concernTrends.map(t => `- ${t}`).join('\n')}

4. HỌC SINH TIẾN BỘ:
${insight.improvingStudents.map(s => `- ${s.studentName}: ${s.note} (${s.evidence || ''})`).join('\n')}

5. HỌC SINH CẦN HỖ TRỢ:
${insight.decliningStudents.map(s => `- ${s.studentName}: ${s.note} (${s.evidence || ''})`).join('\n')}

6. HÀNH ĐỘNG GỢI Ý CHO GVCN:
${insight.suggestedActions.map(a => `- ${a}`).join('\n')}

(Phân tích hỗ trợ bởi GVCN Smart Class)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Phân Tích Sư Phạm & Nhận Xét Tuần {selectedWeek}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quy trình chuẩn: Số liệu thực tế → Phân tích AI → GVCN xem xét & quyết định
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {insight && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'AI đang phân tích dữ liệu...' : insight ? 'Phân Tích Lại' : 'Phân Tích Tuần Này'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Content */}
      {insight ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Summary */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Tổng Quan Tuần {selectedWeek}
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 leading-relaxed font-medium">
              {insight.summary}
            </p>
          </div>

          {/* 2 Columns: Positive Trends & Concerns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span>Xu Hướng Tích Cực</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {insight.positiveTrends.map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Vấn Đề Cần Lưu Ý</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {insight.concernTrends.map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Student Focus: Improving & Declining */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Improving */}
            <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                <Award className="w-4 h-4" />
                <span>Học Sinh Có Tiến Bộ Rõ Nét</span>
              </div>
              <div className="space-y-2">
                {insight.improvingStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Không có thay đổi đột biến.</p>
                ) : (
                  insight.improvingStudents.map((s, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{s.studentName}</span>
                        {s.evidence && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                            {s.evidence}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{s.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Need Attention */}
            <div className="p-4 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Học Sinh Cần Quan Tâm & Đồng Hành</span>
              </div>
              <div className="space-y-2">
                {insight.decliningStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Tất cả các em đều duy trì phong độ tốt.</p>
                ) : (
                  insight.decliningStudents.map((s, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{s.studentName}</span>
                        {s.evidence && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold">
                            {s.evidence}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{s.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Suggested Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <ListChecks className="w-4 h-4 text-indigo-500" />
              <span>Gợi Ý Hành Động Trọng Tâm Cho GVCN</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {insight.suggestedActions.map((act, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ethical AI Stamp */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Cam kết sư phạm:</strong> Mọi nhận định của AI đều dựa trên số liệu thực tế được tính toán bằng thuật toán. Thầy/Cô là người đưa ra quyết định giáo dục cuối cùng.
            </span>
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-8 space-y-2">
          <Sparkles className="w-8 h-8 mx-auto text-indigo-400/50" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Chưa có phân tích cho Tuần {selectedWeek}
          </p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Bấm nút "Phân Tích Tuần Này" để AI tự động tổng hợp xu hướng, tìm học sinh tiến bộ và đưa ra các khuyến nghị sư phạm hữu ích.
          </p>
        </div>
      )}
    </div>
  );
};
