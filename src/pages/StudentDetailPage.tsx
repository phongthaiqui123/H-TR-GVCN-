import React, { useState, useEffect, useMemo } from 'react';
import { useClassData } from '../hooks/useClassData';
import { useAuth } from '../hooks/useAuth';
import { 
  Student, 
  WeeklyScore, 
  CompetitionEvent, 
  Criterion 
} from '../types';
import { 
  analyzeStudentWithAI, 
  generateStudentCommentWithAI, 
  generateParentMessageWithAI, 
  StudentAIAnalysis 
} from '../services/aiService';
import { 
  ArrowLeft, 
  Sparkles, 
  Award, 
  AlertTriangle, 
  Calendar, 
  Send, 
  Copy, 
  Check, 
  TrendingUp, 
  MessageSquare, 
  Clock, 
  Phone,
  Bookmark,
  Crown,
  ShieldCheck
} from 'lucide-react';
import { formatDateVN, CADRE_ROLES_META } from '../utils/constants';
import { TripleStudentCommentsModal } from '../components/modals/TripleStudentCommentsModal';
import { DraftParentMessageModal } from '../components/modals/DraftParentMessageModal';
import { QuickObservationModal } from '../components/modals/QuickObservationModal';

interface StudentDetailPageProps {
  studentId: string;
  onBack: () => void;
}

export const StudentDetailPage: React.FC<StudentDetailPageProps> = ({ studentId, onBack }) => {
  const { 
    currentClass, 
    selectedWeek, 
    students, 
    criteria, 
    events, 
    allWeeklyScores,
    studentsWithScores,
    observations
  } = useClassData();
  const { roleSession } = useAuth();
  const isTeamLeader = roleSession.category === 'to_truong';
  const isStudent = roleSession.category === 'thanh_vien';
  const myTeamName = roleSession.teamName || 'Tổ 1';

  const [isTripleModalOpen, setIsTripleModalOpen] = useState(false);
  const [isDraftParentModalOpen, setIsDraftParentModalOpen] = useState(false);
  const [isQuickObsModalOpen, setIsQuickObsModalOpen] = useState(false);

  const student = useMemo(() => {
    return students.find(s => s.studentId === studentId);
  }, [students, studentId]);

  const studentScoreInfo = useMemo(() => {
    return studentsWithScores.find(s => s.studentId === studentId);
  }, [studentsWithScores, studentId]);

  const studentObservations = useMemo(() => {
    return (observations || []).filter(o => o.studentId === studentId);
  }, [observations, studentId]);

  // Historical scores for this student (all weeks sorted)
  const historyScores = useMemo(() => {
    return (allWeeklyScores || [])
      .filter(s => s.studentId === studentId)
      .sort((a, b) => a.week - b.week);
  }, [allWeeklyScores, studentId]);

  // Events for this student in this class
  const studentEvents = useMemo(() => {
    return (events || [])
      .filter(e => e.studentId === studentId)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [events, studentId]);

  // Criteria statistics for this student (count of positive & negative)
  const criteriaStats = useMemo(() => {
    return (criteria || []).map(crit => {
      const positiveCount = studentEvents.filter(e => e.criterionId === crit.criterionId && e.score > 0).length;
      const negativeCount = studentEvents.filter(e => e.criterionId === crit.criterionId && e.score < 0).length;
      return {
        crit,
        positiveCount,
        negativeCount,
        totalBalance: positiveCount * (crit.positiveScore || 0) + negativeCount * (crit.negativeScore || 0)
      };
    });
  }, [criteria, studentEvents]);

  // AI Analysis States
  const [aiAnalysis, setAiAnalysis] = useState<StudentAIAnalysis | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // AI Comment States
  const [commentType, setCommentType] = useState('Nhận xét tuần');
  const [commentTone, setCommentTone] = useState('Khen ngợi và động viên');
  const [aiComment, setAiComment] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [copiedComment, setCopiedComment] = useState(false);

  // Parent Message States
  const [parentTone, setParentTone] = useState('Thân thiện, chân thành');
  const [parentExtraNote, setParentExtraNote] = useState('');
  const [parentMessage, setParentMessage] = useState('');
  const [loadingParentMessage, setLoadingParentMessage] = useState(false);
  const [copiedParentMsg, setCopiedParentMsg] = useState(false);

  // Auto-run or manual trigger AI analysis
  const handleRunAiAnalysis = async () => {
    if (!student) return;
    setLoadingAi(true);
    try {
      const result = await analyzeStudentWithAI(student, historyScores, studentEvents, criteria);
      setAiAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGenerateComment = async () => {
    if (!student) return;
    setLoadingComment(true);
    try {
      const res = await generateStudentCommentWithAI(
        student,
        commentType,
        commentTone,
        {
          currentScore: studentScoreInfo?.currentWeekScore || 100,
          rankCategory: studentScoreInfo?.rankCategory || 'Tốt',
          totalPositive: studentScoreInfo?.totalPositive || 0,
          totalNegative: studentScoreInfo?.totalNegative || 0,
        }
      );
      setAiComment(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComment(false);
    }
  };

  const handleGenerateParentMessage = async () => {
    if (!student) return;
    setLoadingParentMessage(true);
    try {
      const res = await generateParentMessageWithAI(
        student,
        parentTone,
        selectedWeek,
        {
          currentScore: studentScoreInfo?.currentWeekScore || 100,
          rankCategory: studentScoreInfo?.rankCategory || 'Tốt',
          positiveSummary: studentEvents.filter(e => e.score > 0).map(e => e.criterionName).slice(0, 3).join(', ') || 'Nề nếp tốt',
          negativeSummary: studentEvents.filter(e => e.score < 0).map(e => e.criterionName).slice(0, 2).join(', ') || 'Không có vi phạm lớn',
        },
        parentExtraNote
      );
      setParentMessage(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingParentMessage(false);
    }
  };

  // Initial AI trigger
  useEffect(() => {
    if (student) {
      handleRunAiAnalysis();
    }
  }, [student?.studentId]);

  if (!student) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Không tìm thấy thông tin học sinh.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold">
          Quay lại
        </button>
      </div>
    );
  }

  // Guard access for Team Leader - cannot view members outside their team
  if (isTeamLeader && student.teamName !== myTeamName) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-rose-200 text-center space-y-4 max-w-lg mx-auto mt-12 shadow-xs animate-fade-in">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h3 className="font-extrabold text-slate-900 text-lg">Giới hạn quyền truy cập</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Học sinh <strong className="text-slate-700">{student.fullName}</strong> thuộc <strong className="text-indigo-600">{student.teamName}</strong>. 
          Với vai trò Tổ trưởng <strong className="text-indigo-600">{myTeamName}</strong>, bạn chỉ được xem hồ sơ và ghi nhận sự việc đối với thành viên thuộc tổ mình.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          Quay lại danh sách {myTeamName}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Back button & Profile Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-xs text-slate-400 font-medium">Hồ sơ thi đua cá nhân</span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {student.fullName}
          </h1>
        </div>
      </div>

      {/* Main Student Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-indigo-100">
              {student.fullName.split(' ').slice(-1)[0].charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{student.fullName}</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {student.teamName}
                </span>

                {student.cadreRole && student.cadreRole !== 'none' && CADRE_ROLES_META[student.cadreRole] && (
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${CADRE_ROLES_META[student.cadreRole].badgeClass}`}>
                    {CADRE_ROLES_META[student.cadreRole].icon} {CADRE_ROLES_META[student.cadreRole].label}
                  </span>
                )}

                {(student.isTeamLeader || student.teamRole === 'to_truong') && (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    🎖️ Tổ trưởng (Được quyền chấm {student.teamName})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Lớp: <strong className="text-slate-700">{currentClass?.className}</strong> • STT: <strong className="text-slate-700">#{student.studentNumber}</strong> • {student.notes || 'Học sinh'}
              </p>
              {!isTeamLeader && student.parentPhone && (
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phụ huynh: {student.parentPhone}
                </p>
              )}
            </div>
          </div>

          {/* Quick Score Snapshot */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0">
            <div>
              <div className="text-xs text-slate-500">Điểm Tuần {selectedWeek}:</div>
              <div className="text-3xl font-black text-indigo-700 leading-tight">
                {studentScoreInfo?.currentWeekScore || 100} <span className="text-xs font-normal text-slate-500">điểm</span>
              </div>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${studentScoreInfo?.stars && studentScoreInfo.stars >= 4 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                {studentScoreInfo?.rankCategory || 'TỐT'}
              </span>
              <div className="text-xs text-amber-500 font-bold mt-1">
                {'⭐'.repeat(studentScoreInfo?.stars || 4)}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Thực Chiến Actions Toolbar */}
        {!isStudent ? (
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Bookmark className="w-4 h-4 text-indigo-500" />
              <span>Công cụ sư phạm thực chiến cho em {student.fullName}:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsQuickObsModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Ghi nhận sự việc / hành vi</span>
              </button>

              {!isTeamLeader && (
                <>
                  <button
                    onClick={() => setIsTripleModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    <span>3 Phiên Bản Nhận Xét (AI)</span>
                  </button>

                  <button
                    onClick={() => setIsDraftParentModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-teal-600" />
                    <span>Soạn tin nhắn Phụ Huynh</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Hồ sơ thi đua & rèn luyện cá nhân • Chế độ xem</span>
            <span className="text-[11px] text-slate-400">Dữ liệu được cập nhật từ GVCN & Ban cán sự</span>
          </div>
        )}
      </div>

      {/* Nhật ký ghi nhận hành vi của học sinh này */}
      {studentObservations.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm sm:text-base text-slate-800">
                📋 Sổ ghi nhận quan sát & hành vi ({studentObservations.length} sự việc)
              </h3>
            </div>
            {!isStudent && (
              <button
                onClick={() => setIsQuickObsModalOpen(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                + Thêm ghi nhận
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {studentObservations.map((obs) => (
              <div
                key={obs.observationId}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px]">
                      {obs.category}
                    </span>
                    {obs.severity !== 'Bình thường' && (
                      <span className="font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px]">
                        {obs.severity}
                      </span>
                    )}
                    <span className="text-slate-400 text-[10px]">{obs.date}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{obs.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2 Columns: Chart & AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Biểu đồ điểm 8-12 tuần */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm sm:text-base text-slate-800">
                📈 Biến động điểm qua các tuần
              </h3>
            </div>
            <span className="text-xs text-slate-400">8 tuần gần nhất</span>
          </div>

          <div className="h-40 flex items-end justify-between gap-2 px-2 pt-4">
            {historyScores.map((scoreItem) => {
              const minScore = 85;
              const maxScore = 120;
              const heightPercent = Math.min(100, Math.max(15, ((scoreItem.finalScore - minScore) / (maxScore - minScore)) * 100));
              const isSelected = scoreItem.week === selectedWeek;

              return (
                <div key={scoreItem.week} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-bold text-slate-700">
                    {scoreItem.finalScore}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden h-full flex items-end">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isSelected 
                          ? 'bg-indigo-600 shadow-sm' 
                          : scoreItem.finalScore >= 110 
                          ? 'bg-emerald-400' 
                          : scoreItem.finalScore < 95 
                          ? 'bg-rose-400' 
                          : 'bg-indigo-300'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-indigo-700 font-bold' : 'text-slate-400'}`}>
                    T{scoreItem.week}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Điểm trung bình tháng: <strong className="text-indigo-700">{studentScoreInfo?.monthlyScore || 100}đ</strong></span>
            <span>Xu hướng: <strong className={studentScoreInfo?.trend === 'up' ? 'text-emerald-600' : studentScoreInfo?.trend === 'down' ? 'text-rose-600' : 'text-slate-600'}>
              {studentScoreInfo?.trend === 'up' ? '↗ Tăng tiến' : studentScoreInfo?.trend === 'down' ? '↘ Giảm' : '→ Ổn định'}
            </strong></span>
          </div>
        </div>

        {/* AI Phân tích học sinh */}
        <div className="bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/40 p-5 rounded-2xl border border-indigo-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4 fill-white" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  🤖 Phân tích AI chuyên sâu
                </h3>
              </div>
              <button
                disabled={loadingAi}
                onClick={handleRunAiAnalysis}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                {loadingAi ? 'Đang phân tích...' : 'Làm mới AI'}
              </button>
            </div>

            {loadingAi ? (
              <div className="py-8 text-center text-xs text-indigo-600 animate-pulse">
                Đang tổng hợp dữ liệu và phân tích tâm lý, học lực học sinh...
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <div>
                  <span className="font-bold text-emerald-800 flex items-center gap-1 mb-1">
                    <Award className="w-3.5 h-3.5 text-emerald-600" /> Điểm mạnh & Điểm tích cực:
                  </span>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                    {(Array.isArray(aiAnalysis.strengths) && aiAnalysis.strengths.length > 0
                      ? aiAnalysis.strengths
                      : (aiAnalysis as any).positiveObservations || ['Chấp hành tốt nội quy chung của lớp', 'Tham gia đầy đủ các hoạt động nề nếp']
                    ).map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="font-bold text-rose-800 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Điểm cần cải thiện & Chú ý:
                  </span>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                    {(Array.isArray(aiAnalysis.weaknesses) && aiAnalysis.weaknesses.length > 0
                      ? aiAnalysis.weaknesses
                      : Array.isArray(aiAnalysis.areasToImprove) && aiAnalysis.areasToImprove.length > 0
                      ? aiAnalysis.areasToImprove
                      : (aiAnalysis as any).concerns || ['Cần tích cực phát biểu xây dựng bài hơn nữa']
                    ).map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-100/60 border border-indigo-200">
                  <span className="font-bold text-indigo-900">💡 Đề xuất sư phạm cho GVCN:</span>
                  <p className="mt-0.5 text-indigo-950 font-medium">
                    {aiAnalysis.supportSuggestion ||
                     (Array.isArray((aiAnalysis as any).suggestions) ? (aiAnalysis as any).suggestions.join('. ') : '') ||
                     aiAnalysis.summary ||
                     'Giao thêm nhiệm vụ trong tổ để khích lệ sự tự tin, khen ngợi các nỗ lực tiến bộ nhỏ.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Nhấn [Làm mới AI] để phân tích.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Thống kê 12 tiêu chí & Lịch sử thi đua */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Thống kê 12 tiêu chí */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm sm:text-base text-slate-800 pb-3 border-b border-slate-100 mb-3">
            📊 Thống kê theo 12 Tiêu chí thi đua
          </h3>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {criteriaStats.map(({ crit, positiveCount, negativeCount, totalBalance }) => (
              <div
                key={crit.criterionId}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
              >
                <div className="truncate mr-2">
                  <span className="font-bold text-slate-800">{crit.order}. {crit.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                    +{positiveCount}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                    -{negativeCount}
                  </span>
                  <span className={`w-8 text-right font-black ${totalBalance >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                    {totalBalance > 0 ? `+${totalBalance}` : totalBalance}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lịch sử thi đua (Events) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm sm:text-base text-slate-800 pb-3 border-b border-slate-100 mb-3">
            📋 Lịch sử sự kiện ghi nhận
          </h3>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {studentEvents.length > 0 ? (
              studentEvents.map((ev) => (
                <div
                  key={ev.eventId}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg font-black ${
                      ev.score > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {ev.score > 0 ? `+${ev.score}` : ev.score}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800">{ev.criterionName}</div>
                      <div className="text-[10px] text-slate-400">{formatDateVN(ev.date)} • Tuần {ev.week} {ev.note ? `• ${ev.note}` : ''}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                Chưa có sự kiện nào được ghi nhận.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* TẠO NHẬN XÉT HỌC SINH (AI) & SOẠN TIN NHẮN PHỤ HUYNH (AI) */}
      {!isStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Tạo nhận xét bằng AI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm sm:text-base text-slate-800">
                📝 Tạo nhận xét học sinh bằng AI
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Loại nhận xét</label>
              <select
                value={commentType}
                onChange={(e) => setCommentType(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Nhận xét tuần">Nhận xét tuần</option>
                <option value="Nhận xét tháng">Nhận xét tháng</option>
                <option value="Nhận xét học kỳ">Nhận xét học kỳ</option>
                <option value="Nhận xét cuối năm">Nhận xét cuối năm</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Sắc thái</label>
              <select
                value={commentTone}
                onChange={(e) => setCommentTone(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Khen ngợi và tuyên dương">Khen ngợi</option>
                <option value="Động viên khích lệ">Động viên</option>
                <option value="Nhắc nhở nhẹ nhàng">Nhắc nhở</option>
              </select>
            </div>
          </div>

          <button
            disabled={loadingComment}
            onClick={handleGenerateComment}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mb-3"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loadingComment ? 'Đang soạn nhận xét...' : '✨ Tạo nhận xét bằng AI'}</span>
          </button>

          {aiComment && (
            <div className="space-y-2">
              <textarea
                rows={4}
                value={aiComment}
                onChange={(e) => setAiComment(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed text-slate-800"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiComment);
                    setCopiedComment(true);
                    setTimeout(() => setCopiedComment(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedComment ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedComment ? 'Đã sao chép' : 'Sao chép nhận xét'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Soạn tin nhắn phụ huynh */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm sm:text-base text-slate-800">
                💬 Soạn tin nhắn Zalo/SMS gửi Phụ huynh
              </h3>
            </div>
          </div>

          <div className="space-y-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Giọng văn tin nhắn</label>
              <select
                value={parentTone}
                onChange={(e) => setParentTone(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Thân thiện, chân thành">Thân thiện</option>
                <option value="Chuyên nghiệp, trang trọng">Chuyên nghiệp</option>
                <option value="Khen ngợi và khích lệ gia đình">Khen ngợi</option>
                <option value="Nhắc nhở nhẹ nhàng và phối hợp">Nhắc nhở</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Lời nhắn thêm (tùy chọn)</label>
              <input
                type="text"
                placeholder="Ví dụ: Nhờ phụ huynh nhắc em đem màu vẽ thứ 4 tới..."
                value={parentExtraNote}
                onChange={(e) => setParentExtraNote(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <button
            disabled={loadingParentMessage}
            onClick={handleGenerateParentMessage}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mb-3"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loadingParentMessage ? 'Đang soạn tin nhắn...' : '✨ Soạn tin nhắn phụ huynh bằng AI'}</span>
          </button>

          {parentMessage && (
            <div className="space-y-2">
              <textarea
                rows={4}
                value={parentMessage}
                onChange={(e) => setParentMessage(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed text-slate-800"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(parentMessage);
                    setCopiedParentMsg(true);
                    setTimeout(() => setCopiedParentMsg(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedParentMsg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedParentMsg ? 'Đã sao chép' : 'Sao chép để gửi Zalo'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      )}

      {/* Prompt 10 Modals */}
      {studentScoreInfo && (
        <>
          <TripleStudentCommentsModal
            isOpen={isTripleModalOpen}
            onClose={() => setIsTripleModalOpen(false)}
            student={studentScoreInfo}
          />

          <DraftParentMessageModal
            isOpen={isDraftParentModalOpen}
            onClose={() => setIsDraftParentModalOpen(false)}
            student={studentScoreInfo}
          />
        </>
      )}

      <QuickObservationModal
        isOpen={isQuickObsModalOpen}
        onClose={() => setIsQuickObsModalOpen(false)}
        preSelectedStudentId={studentId}
      />
    </div>
  );
};
