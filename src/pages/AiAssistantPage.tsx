import React, { useState, useMemo, useEffect } from 'react';
import { useClassData } from '../hooks/useClassData';
import { useAuth } from '../hooks/useAuth';
import { 
  Student, 
  TeacherNote, 
  AiInsightItem, 
  StudentCommentTone, 
  StudentCommentType, 
  ParentMessagePurpose 
} from '../types';
import { 
  chatWithAI, 
  analyzeClass, 
  generateStudentComment, 
  generateParentMessage, 
  generateWeeklyReport, 
  solvePedagogicalIncident,
  clearAiCache 
} from '../services/aiService';
import { 
  generateRuleBasedInsights, 
  detectImprovedStudents, 
  detectStudentsNeedingAttention, 
  getTopViolations, 
  getTeamAnalytics 
} from '../services/aiAnalyticsService';
import { getTeacherNotes, saveTeacherNote } from '../services/firestoreService';
import { 
  Sparkles, 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  RefreshCw, 
  Copy, 
  Check, 
  ShieldAlert, 
  FileText, 
  UserCheck, 
  HelpCircle, 
  X, 
  Info,
  Calendar,
  Users,
  Award
} from 'lucide-react';
import { formatDateVN } from '../utils/constants';

type MainTab = 'insights' | 'chat' | 'students_tracking' | 'class_analysis' | 'drafting' | 'incidents';

export const AiAssistantPage: React.FC = () => {
  const { 
    currentClass, 
    selectedWeek, 
    setSelectedWeek,
    students, 
    criteria, 
    events, 
    allWeeklyScores,
    studentsWithScores,
    teams
  } = useClassData();
  const { roleSession } = useAuth();
  const isTeamLeader = roleSession.category === 'to_truong';
  const myTeamName = roleSession.teamName || 'Tổ 1';

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<MainTab>('insights');

  // Teacher notes
  const [teacherNotes, setTeacherNotes] = useState<TeacherNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedStudentForNote, setSelectedStudentForNote] = useState<string>('');
  const [savingNote, setSavingNote] = useState(false);

  // Applied insights tracker (for GVCN to confirm/accept insights)
  const [acknowledgedInsights, setAcknowledgedInsights] = useState<Record<string, boolean>>({});
  const [dismissedInsights, setDismissedInsights] = useState<Record<string, boolean>>({});
  const [activeExplainInsight, setActiveExplainInsight] = useState<AiInsightItem | null>(null);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string; time: string }>>([
    {
      role: 'model',
      text: isTeamLeader
        ? `Xin chào ${roleSession.studentName || 'Tổ trưởng'}! Tôi là Trợ lý AI đồng hành cùng ${myTeamName} lớp ${currentClass?.className || ''}. Tôi có thể tư vấn cách động viên thành viên, phân công trực nhật, nhắc nhở nề nếp thi đua và xây dựng tinh thần đoàn kết cho ${myTeamName}.`
        : `Xin chào Thầy/Cô! Tôi là "Bộ Não AI GVCN" hỗ trợ công tác chủ nhiệm lớp ${currentClass?.className || ''}. Tôi phân tích dữ liệu thi đua, nề nếp và học tập dựa trên số liệu thực tế của lớp để tư vấn sư phạm cho Thầy/Cô.`,
      time: 'Vừa xong',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Class Deep Analysis State
  const [classAnalysisResult, setClassAnalysisResult] = useState<any>(null);
  const [isLoadingClassAnalysis, setIsLoadingClassAnalysis] = useState(false);

  // Pedagogical Drafting States
  const [draftingMode, setDraftingMode] = useState<'comment' | 'parent_message' | 'weekly_report'>('comment');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [commentType, setCommentType] = useState<StudentCommentType>('Nhận xét tuần');
  const [commentTone, setCommentTone] = useState<StudentCommentTone>('positive');
  const [generatedComment, setGeneratedComment] = useState('');
  const [isLoadingComment, setIsLoadingComment] = useState(false);

  const [parentPurpose, setParentPurpose] = useState<ParentMessagePurpose>('weeklyUpdate');
  const [parentExtraNote, setParentExtraNote] = useState('');
  const [generatedParentMsg, setGeneratedParentMsg] = useState('');
  const [isLoadingParentMsg, setIsLoadingParentMsg] = useState(false);

  const [generatedWeeklyReport, setGeneratedWeeklyReport] = useState('');
  const [isLoadingWeeklyReport, setIsLoadingWeeklyReport] = useState(false);

  // Incident solving states
  const [incidentScenario, setIncidentScenario] = useState('');
  const [incidentOutput, setIncidentOutput] = useState('');
  const [isLoadingIncident, setIsLoadingIncident] = useState(false);

  // Copy indicator
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load teacher notes for student
  useEffect(() => {
    if (selectedStudentForNote) {
      getTeacherNotes(selectedStudentForNote)
        .then(notes => setTeacherNotes(notes))
        .catch(err => console.warn('Could not load teacher notes:', err));
    }
  }, [selectedStudentForNote]);

  // Set default student if list loaded
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].studentId);
    }
    if (students.length > 0 && !selectedStudentForNote) {
      setSelectedStudentForNote(students[0].studentId);
    }
  }, [students, selectedStudentId, selectedStudentForNote]);

  // --- Real-time Rule-based AI Insights ---
  const ruleBasedInsights = useMemo(() => {
    const fallbackClass: any = currentClass || {
      classId: 'default',
      className: 'Lớp học',
      grade: '10',
      schoolYear: '2026-2027',
      semester: 1,
      currentWeek: selectedWeek,
      startingScore: 100,
      teacherId: 'teacher1',
      totalStudents: students.length,
      createdAt: ''
    };
    return generateRuleBasedInsights(
      fallbackClass,
      students,
      allWeeklyScores,
      events,
      criteria,
      teams,
      selectedWeek
    );
  }, [currentClass, students, allWeeklyScores, events, criteria, teams, selectedWeek]);

  // Improved students in current week
  const improvedStudents = useMemo(() => {
    return detectImprovedStudents(students, allWeeklyScores, selectedWeek, events);
  }, [students, allWeeklyScores, selectedWeek, events]);

  // Students needing attention
  const attentionStudents = useMemo(() => {
    return detectStudentsNeedingAttention(students, allWeeklyScores, selectedWeek, events);
  }, [students, allWeeklyScores, selectedWeek, events]);

  // Top violations
  const topViolations = useMemo(() => {
    return getTopViolations(events, criteria, selectedWeek);
  }, [events, criteria, selectedWeek]);

  // Team rankings
  const teamAnalytics = useMemo(() => {
    return getTeamAnalytics(teams, students, allWeeklyScores, selectedWeek);
  }, [teams, students, allWeeklyScores, selectedWeek]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // --- 1. Chatbot Handlers ---
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim() || isLoadingChat) return;

    const userMsg = {
      role: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setIsLoadingChat(true);

    try {
      const contextData = {
        classInfo: currentClass,
        week: selectedWeek,
        totalStudents: students.length,
        students: students.map(s => ({
          studentId: s.studentId,
          fullName: s.fullName,
          studentNumber: s.studentNumber,
          teamId: s.teamId,
          cadreRole: s.cadreRole
        })),
        weeklyScores: allWeeklyScores.filter(s => s.week === selectedWeek),
        recentScores: allWeeklyScores,
        events: events.slice(0, 30),
        criteria: criteria.map(c => ({ id: c.criterionId, name: c.name, type: c.type || (c.positiveScore > 0 ? 'positive' : 'negative') })),
        teams: teamAnalytics.rankedTeams,
        topViolations
      };

      const reply = await chatWithAI(textToSend, contextData, chatMessages.map(m => ({ role: m.role, text: m.text })));

      setChatMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: reply,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: 'Xin lỗi Thầy/Cô, hệ thống đang gặp gián đoạn tạm thời. Thầy/Cô có thể kiểm tra danh sách học sinh và xếp hạng ở các thẻ phân tích bên cạnh.',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // --- 2. Class Deep Analysis Handler ---
  const handleRunClassAnalysis = async () => {
    setIsLoadingClassAnalysis(true);
    try {
      const res = await analyzeClass(
        currentClass || 'Lớp học',
        selectedWeek,
        students,
        teams,
        events,
        allWeeklyScores,
        criteria
      );
      setClassAnalysisResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingClassAnalysis(false);
    }
  };

  // --- 3. Save Teacher Note Handler ---
  const handleSaveNote = async () => {
    if (!newNoteContent.trim() || !selectedStudentForNote) return;
    setSavingNote(true);
    try {
      const studentObj = students.find(s => s.studentId === selectedStudentForNote);
      await saveTeacherNote({
        teacherId: currentClass?.teacherId || 'teacher1',
        studentId: selectedStudentForNote,
        studentName: studentObj?.fullName || 'Học sinh',
        note: newNoteContent.trim(),
        week: selectedWeek,
        date: new Date().toISOString().split('T')[0]
      });
      setNewNoteContent('');
      // Reload notes
      const notes = await getTeacherNotes(selectedStudentForNote);
      setTeacherNotes(notes);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  // --- 4. Drafting Handlers ---
  const handleGenerateComment = async () => {
    const student = students.find(s => s.studentId === selectedStudentId);
    if (!student) return;
    setIsLoadingComment(true);

    const scoreInfo = studentsWithScores.find(s => s.studentId === student.studentId);
    try {
      const res = await generateStudentComment(
        student,
        commentType,
        commentTone,
        {
          currentScore: scoreInfo?.currentWeekScore || 100,
          rankCategory: scoreInfo?.rankCategory || 'Tốt',
          trendDescription: 'Duy trì thi đua tốt'
        }
      );
      setGeneratedComment(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingComment(false);
    }
  };

  const handleGenerateParentMessage = async () => {
    const student = students.find(s => s.studentId === selectedStudentId);
    if (!student) return;
    setIsLoadingParentMsg(true);

    const scoreInfo = studentsWithScores.find(s => s.studentId === student.studentId);
    try {
      const res = await generateParentMessage(
        student,
        parentPurpose,
        selectedWeek,
        {
          currentScore: scoreInfo?.currentWeekScore || 100,
          rankCategory: scoreInfo?.rankCategory || 'Tốt'
        },
        parentExtraNote
      );
      setGeneratedParentMsg(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingParentMsg(false);
    }
  };

  const handleGenerateWeeklyReport = async () => {
    setIsLoadingWeeklyReport(true);
    try {
      const scoresThisWeek = allWeeklyScores.filter(s => s.week === selectedWeek);
      const avg = scoresThisWeek.length > 0 
        ? (scoresThisWeek.reduce((acc, c) => acc + c.finalScore, 0) / scoresThisWeek.length).toFixed(1)
        : 100;

      const summaryData = {
        totalStudents: students.length,
        avgScore: avg,
        leadingTeam: teamAnalytics.rankedTeams[0]?.teamName || 'Tổ 1',
        topStudents: studentsWithScores.slice(0, 3).map(s => `${s.fullName} (${s.currentWeekScore}đ)`),
        improvedStudents: improvedStudents.slice(0, 3).map(s => `${s.studentName} (+${s.delta}đ)`),
        needAttentionStudents: attentionStudents.slice(0, 3).map(s => `${s.studentName} (${s.reason})`),
        topInfractions: topViolations.slice(0, 3).map(v => `${v.name} (${v.count} lần)`),
      };

      const res = await generateWeeklyReport(currentClass || 'Lớp học', selectedWeek, summaryData);
      setGeneratedWeeklyReport(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingWeeklyReport(false);
    }
  };

  // --- 5. Incident Solution Handler ---
  const handleSolveIncident = async (scenario?: string) => {
    const text = scenario || incidentScenario;
    if (!text.trim()) return;
    setIsLoadingIncident(true);
    try {
      const res = await solvePedagogicalIncident(text, {
        className: currentClass?.className,
        week: selectedWeek,
        totalStudents: students.length
      });
      setIncidentOutput(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingIncident(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 rounded-3xl shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isTeamLeader ? `TRỢ LÝ AI TỔ TRƯỞNG • ${myTeamName}` : 'BỘ NÃO AI GVCN • GEMINI 3.8 FLASH'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {isTeamLeader ? `Trợ Lý Thi Đua AI Đồng Hành Cùng ${myTeamName}` : 'Trợ Lý Sư Phạm Số Cho Giáo Viên Chủ Nhiệm'}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/90 max-w-2xl">
              {isTeamLeader 
                ? `Hỗ trợ Tổ trưởng phân tích nề nếp, gợi ý cách khích lệ thành viên và chuẩn bị kế hoạch thi đua cho ${myTeamName}.`
                : 'Phân tích dữ liệu thi đua khách quan • Phát hiện sớm xu hướng • Gợi ý giải pháp nhân văn • Quyền quyết định luôn thuộc về Thầy/Cô.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {/* Week Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium">
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>Tuần:</span>
              <select 
                value={selectedWeek} 
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-transparent font-bold text-white outline-none cursor-pointer"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w} className="text-slate-900">
                    Tuần {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear cache */}
            <button
              onClick={() => {
                clearAiCache();
                alert('Đã xóa bộ nhớ đệm AI. Dữ liệu mới nhất sẽ được tải lại.');
              }}
              title="Làm mới bộ nhớ đệm AI"
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Philosophy Badge */}
        <div className="mt-4 pt-3 border-t border-indigo-700/50 flex flex-wrap items-center gap-4 text-xs text-indigo-200">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <strong>Nguyên tắc:</strong> AI phân tích dữ liệu & gợi ý ➔ GVCN kiểm tra & xác nhận
          </span>
          <span className="text-indigo-300/60">•</span>
          <span>Không tự ý trừ/cộng điểm</span>
          <span className="text-indigo-300/60">•</span>
          <span>Không dán nhãn tiêu cực học sinh</span>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 no-scrollbar">
        {(isTeamLeader
          ? [
              { id: 'insights', label: `🎯 Phát hiện ${myTeamName}`, icon: AlertTriangle, count: ruleBasedInsights.length },
              { id: 'chat', label: `💬 Hỏi đáp AI ${myTeamName}`, icon: MessageSquare },
              { id: 'students_tracking', label: '🌟 Tiến bộ & Nhắc nhở', icon: Users, count: improvedStudents.length + attentionStudents.length },
              { id: 'class_analysis', label: `📊 Tổng hợp ${myTeamName}`, icon: TrendingUp },
            ]
          : [
              { id: 'insights', label: '🎯 Phát hiện & Cảnh báo', icon: AlertTriangle, count: ruleBasedInsights.length },
              { id: 'chat', label: '💬 Hỏi đáp AI GVCN', icon: MessageSquare },
              { id: 'students_tracking', label: '🌟 Tiến bộ & Cần chú ý', icon: Users, count: improvedStudents.length + attentionStudents.length },
              { id: 'class_analysis', label: '📊 Phân tích Lớp & Tổ', icon: TrendingUp },
              { id: 'drafting', label: '📝 Soạn thảo Sư phạm', icon: FileText },
              { id: 'incidents', label: '🛡️ Tình huống Sư phạm', icon: ShieldAlert },
            ]
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PHÁT HIỆN & CẢNH BÁO THÔNG MINH (RULE-BASED INSIGHTS)              */}
      {/* ========================================================================= */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>5 Phát hiện Quan Trọng Tuần {selectedWeek}</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                  Dữ liệu thực tế xác thực
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Các sự kiện và xu hướng được trích xuất trực tiếp từ nhật ký thi đua và điểm tuần.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ruleBasedInsights.map((insight) => {
              const isAcknowledged = acknowledgedInsights[insight.id];
              const isDismissed = dismissedInsights[insight.id];
              if (isDismissed) return null;

              const severityColors = {
                critical: 'border-rose-300 bg-rose-50/40 text-rose-900',
                warning: 'border-amber-300 bg-amber-50/40 text-amber-900',
                positive: 'border-emerald-300 bg-emerald-50/40 text-emerald-900',
                info: 'border-indigo-300 bg-indigo-50/40 text-indigo-900',
              }[insight.severity];

              const badgeColors = {
                critical: 'bg-rose-100 text-rose-800 border-rose-200',
                warning: 'bg-amber-100 text-amber-800 border-amber-200',
                positive: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                info: 'bg-indigo-100 text-indigo-800 border-indigo-200',
              }[insight.severity];

              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-3xl border transition-all duration-200 shadow-xs flex flex-col justify-between ${severityColors} ${
                    isAcknowledged ? 'opacity-70 ring-2 ring-emerald-500/20' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeColors}`}>
                        {insight.severity === 'positive' && '🌟 Tích cực'}
                        {insight.severity === 'warning' && '⚠️ Cần lưu ý'}
                        {insight.severity === 'critical' && '🚨 Cảnh báo quan trọng'}
                        {insight.severity === 'info' && 'ℹ️ Thông tin'}
                      </span>

                      <button
                        onClick={() => setActiveExplainInsight(insight)}
                        className="text-xs font-semibold underline text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Vì sao?</span>
                      </button>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900">{insight.title}</h3>
                    <p className="text-xs text-slate-700 leading-relaxed">{insight.description}</p>

                    {insight.suggestedAction && (
                      <div className="p-2.5 rounded-2xl bg-white/70 border border-slate-200/60 text-xs text-slate-800 space-y-1">
                        <span className="font-bold text-indigo-800 flex items-center gap-1">
                          💡 Gợi ý hành động:
                        </span>
                        <p>{insight.suggestedAction}</p>
                      </div>
                    )}
                  </div>

                  {/* Teacher Decision Actions */}
                  <div className="pt-3 mt-3 border-t border-slate-200/50 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500 font-medium">
                      {isAcknowledged ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> GVCN đã ghi nhận
                        </span>
                      ) : (
                        'Chờ GVCN xem xét'
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setDismissedInsights(prev => ({ ...prev, [insight.id]: true }));
                        }}
                        className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                      >
                        Bỏ qua
                      </button>

                      <button
                        onClick={() => {
                          setAcknowledgedInsights(prev => ({ ...prev, [insight.id]: !prev[insight.id] }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isAcknowledged
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        }`}
                      >
                        {isAcknowledged ? 'Hủy ghi nhận' : 'Áp dụng gợi ý'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {ruleBasedInsights.length === 0 && (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-sm">
              Chưa ghi nhận sự kiện đặc biệt nào cần cảnh báo trong tuần {selectedWeek}.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRỢ LÝ HỎI ĐÁP AI GVCN (CHAT WITH INTENT DETECTION)                 */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                AI
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  Hội thoại với Trợ lý AI GVCN
                </h3>
                <p className="text-[11px] text-slate-400">
                  Được cung cấp toàn bộ dữ liệu tuần {selectedWeek} của lớp {currentClass?.className}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setChatMessages([
                  {
                    role: 'model',
                    text: 'Hộp thoại đã được đặt lại. Thầy/Cô có câu hỏi gì về tình hình lớp hoặc học sinh không ạ?',
                    time: 'Vừa xong',
                  },
                ]);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Làm sạch đoạn chat
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0 pl-1">Gợi ý câu hỏi:</span>
            {[
              'Ai tiến bộ nhất tuần này?',
              'Ai cần quan tâm, nhắc nhở?',
              'Lỗi vi phạm nào nhiều nhất?',
              'Tổ nào đang dẫn đầu thi đua?',
              'Gợi ý chủ đề sinh hoạt lớp tuần tới',
              'Làm sao giúp học sinh hay nói chuyện riêng?'
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoadingChat}
                className="text-xs px-3 py-1 rounded-xl bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    msg.role === 'user'
                      ? 'bg-slate-800 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {msg.role === 'user' ? 'GV' : 'AI'}
                </div>

                <div className="space-y-1">
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white font-medium rounded-tr-xs'
                        : 'bg-slate-100 text-slate-800 border border-slate-200/60 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <div
                    className={`text-[10px] text-slate-400 px-1 ${
                      msg.role === 'user' ? 'text-right' : ''
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {isLoadingChat && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  AI
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200/60 text-xs text-indigo-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Bộ não AI đang tính toán dữ liệu và tổng hợp lời giải đáp...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-100 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhập câu hỏi cho AI (ví dụ: 'Phân tích em Minh', 'Ai bị giảm điểm?')..."
                className="flex-1 text-xs sm:text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isLoadingChat}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TIẾN BỘ & CẦN CHÚ Ý (DELTAS & ATTENTION TRACKER)                     */}
      {/* ========================================================================= */}
      {activeTab === 'students_tracking' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CỘT 1: HỌC SINH TIẾN BỘ VƯỢT BẬC */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-800">
                      Học sinh tiến bộ nổi bật (+Điểm)
                    </h3>
                    <p className="text-xs text-slate-500">So sánh với tuần trước (Tuần {selectedWeek - 1 > 0 ? selectedWeek - 1 : 1})</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
                  {improvedStudents.length} em
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {improvedStudents.length > 0 ? (
                  improvedStudents.map((item) => (
                    <div
                      key={item.studentId}
                      className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-200 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>{item.studentName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-xs">
                            +{item.delta} điểm
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {item.previousScore}đ ➔ <strong className="text-emerald-700">{item.currentScore}đ</strong>
                        </span>
                      </div>

                      <div className="text-slate-600 text-[11px] space-y-1">
                        <span className="font-semibold text-slate-700">Minh chứng thực tế:</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                          {item.evidence.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedStudentId(item.studentId);
                            setCommentTone('praise');
                            setDraftingMode('comment');
                            setActiveTab('drafting');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] cursor-pointer"
                        >
                          Tạo lời khen ngợi
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Chưa có học sinh nào tăng điểm vượt trội trong tuần này.
                  </div>
                )}
              </div>
            </div>

            {/* CỘT 2: HỌC SINH CẦN QUAN TÂM & HỖ TRỢ */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-800">
                      Học sinh cần quan tâm & hỗ trợ
                    </h3>
                    <p className="text-xs text-slate-500">Dựa trên biến động điểm và sự kiện nề nếp</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-black text-xs">
                  {attentionStudents.length} em
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {attentionStudents.length > 0 ? (
                  attentionStudents.map((item) => (
                    <div
                      key={item.studentId}
                      className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span>{item.studentName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.severity === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.severity === 'high' ? 'Cần hỗ trợ sớm' : 'Cần theo dõi'}
                          </span>
                        </div>
                        <span className="font-bold text-rose-700">
                          {item.currentScore}đ
                        </span>
                      </div>

                      <p className="text-slate-700 font-medium text-[11px]">
                        Lý do: {item.reason}
                      </p>

                      <div className="text-slate-600 text-[11px] space-y-1">
                        <span className="font-semibold text-slate-700">Minh chứng vi phạm/giảm:</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                          {item.evidence.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-2 rounded-xl bg-white/80 border border-amber-200/80 text-[11px] text-amber-950 font-medium">
                        👉 Đề xuất GVCN: {item.suggestion}
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedStudentId(item.studentId);
                            setParentPurpose('concern');
                            setDraftingMode('parent_message');
                            setActiveTab('drafting');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] cursor-pointer"
                        >
                          Nhắn tin phụ huynh
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Nề nếp lớp học ổn định, không có học sinh nào giảm sút đáng báo động.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GHI CHÚ QUAN SÁT CỦA GVCN */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <span>Sổ tay Ghi chú Quan sát của GVCN</span>
            </h3>
            <p className="text-xs text-slate-500">
              Các ghi chú bảo mật này sẽ được nạp vào ngữ cảnh của AI để đưa ra gợi ý sư phạm sát sao nhất với tính cách học sinh.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={selectedStudentForNote}
                onChange={(e) => setSelectedStudentForNote(e.target.value)}
                className="text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
              >
                {students.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.studentNumber}. {s.fullName} ({s.teamName || `Tổ ${s.teamId}`})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Nhập ghi chú (VD: Em nhút nhát, dạo này tập trung hơn, gia đình neo đơn...)"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="md:col-span-2 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-300"
              />
            </div>

            <div className="flex justify-end">
              <button
                disabled={!newNoteContent.trim() || savingNote}
                onClick={handleSaveNote}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{savingNote ? 'Đang lưu...' : 'Lưu ghi chú vào hồ sơ AI'}</span>
              </button>
            </div>

            {teacherNotes.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2">Các ghi chú gần đây:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {teacherNotes.slice(0, 6).map((note) => (
                    <div key={note.noteId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="font-bold text-indigo-900">{note.studentName}</div>
                      <p className="text-slate-600 mt-0.5">{note.note}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Tuần {note.week || selectedWeek} • {formatDateVN(note.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PHÂN TÍCH TOÀN DIỆN LỚP & TỔ THI ĐUA                                */}
      {/* ========================================================================= */}
      {activeTab === 'class_analysis' && (
        <div className="space-y-6">
          {/* Top Control */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-base text-slate-800">
                Báo cáo Phân tích Toàn diện Lớp {currentClass?.className} - Tuần {selectedWeek}
              </h2>
              <p className="text-xs text-slate-500">
                AI tổng hợp số liệu 12 tiêu chí, điểm trung bình các tổ và đề xuất hành động trọng tâm.
              </p>
            </div>

            <button
              onClick={handleRunClassAnalysis}
              disabled={isLoadingClassAnalysis}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoadingClassAnalysis ? 'AI Đang phân tích...' : '✨ Khởi chạy phân tích chuyên sâu'}</span>
            </button>
          </div>

          {/* Code-first Quick Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Điểm TB Lớp Tuần {selectedWeek}</span>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {classAnalysisResult?.classAverage || 
                  (allWeeklyScores.filter(s => s.week === selectedWeek).length > 0 
                    ? (allWeeklyScores.filter(s => s.week === selectedWeek).reduce((a, b) => a + b.finalScore, 0) / allWeeklyScores.filter(s => s.week === selectedWeek).length).toFixed(1)
                    : 100)}đ
              </div>
              <span className="text-[11px] text-slate-400">Trên thang chuẩn 100 điểm</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Tổ dẫn đầu tuần</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {teamAnalytics.rankedTeams[0]?.teamName || 'Tổ 1'}
              </div>
              <span className="text-[11px] text-slate-400">
                Điểm TB: {teamAnalytics.rankedTeams[0]?.avgScore || 100}đ
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Lỗi nề nếp cần chấn chỉnh</span>
              <div className="text-lg font-bold text-rose-700 mt-1 truncate">
                {topViolations[0]?.name || 'Không có vi phạm lớn'}
              </div>
              <span className="text-[11px] text-slate-400">
                {topViolations[0] ? `${topViolations[0].count} lượt bị trừ điểm` : 'Duy trì kỷ luật tốt'}
              </span>
            </div>
          </div>

          {/* Deep Analysis Content */}
          {classAnalysisResult ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 mb-2">Đánh giá chung của AI</h3>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {classAnalysisResult.summary}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-emerald-700 uppercase mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Các chuyển biến tích cực
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700 pl-2">
                    {classAnalysisResult.improvements?.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-rose-700 uppercase mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Vấn đề cần quan tâm khắc phục
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700 pl-2">
                    {classAnalysisResult.concerns?.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations & Teams */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 mb-2">Xếp hạng & Tình hình các Tổ</h3>
                  <div className="space-y-2">
                    {teamAnalytics.rankedTeams.map((t) => (
                      <div key={t.teamId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[11px]">
                            {t.rank}
                          </span>
                          <span className="font-bold text-slate-800">{t.teamName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-indigo-700">{t.avgScore}đ</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.trend === 'up' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {t.trend === 'up' ? '↑ Tiến bộ' : '→ Ổn định'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                  <h4 className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Kế hoạch hành động khuyến nghị cho GVCN tuần tới:
                  </h4>
                  <div className="space-y-2 pt-1">
                    {classAnalysisResult.recommendations?.map((rec: string, i: number) => (
                      <div key={i} className="text-xs text-indigo-950 flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-indigo-100">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                          {i + 1}
                        </span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-xs">
              Nhấn nút [Khởi chạy phân tích chuyên sâu] ở trên để AI tạo bản đánh giá toàn diện.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SOẠN THẢO SƯ PHẠM (NHẬN XÉT, TIN NHẮN, BÁO CÁO TUẦN)               */}
      {/* ========================================================================= */}
      {activeTab === 'drafting' && (
        <div className="space-y-6">
          {/* Submode Switcher */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
            {[
              { id: 'comment', label: 'Tạo Lời Nhận Xét Học Sinh' },
              { id: 'parent_message', label: 'Soạn Tin Nhắn Phụ Huynh' },
              { id: 'weekly_report', label: 'Soạn Báo Cáo Tuần (10 Mục)' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setDraftingMode(m.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  draftingMode === m.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 5.1: VIẾT NHẬN XÉT HỌC SINH */}
          {draftingMode === 'comment' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Tạo Lời Nhận Xét Học Sinh Chuẩn Mực Sư Phạm
                </h3>
                <p className="text-xs text-slate-500">
                  AI kết hợp điểm số, xu hướng và ghi chú của GVCN để tạo lời nhận xét ấm áp, mang tính xây dựng.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Chọn học sinh:</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
                  >
                    {students.map((s) => (
                      <option key={s.studentId} value={s.studentId}>
                        {s.studentNumber}. {s.fullName} ({s.teamName || `Tổ ${s.teamId}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Loại nhận xét:</label>
                  <select
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as StudentCommentType)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
                  >
                    <option value="Nhận xét tuần">Nhận xét tuần</option>
                    <option value="Nhận xét tháng">Nhận xét tháng</option>
                    <option value="Nhận xét học kỳ">Nhận xét học kỳ</option>
                    <option value="Khen ngợi nỗ lực">Khen ngợi nỗ lực</option>
                    <option value="Nhắc nhở nề nếp">Nhắc nhở nề nếp</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sắc thái (5 mức):</label>
                  <select
                    value={commentTone}
                    onChange={(e) => setCommentTone(e.target.value as StudentCommentTone)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
                  >
                    <option value="praise">🌟 Khen ngợi nồng nhiệt</option>
                    <option value="positive">😊 Tích cực, khích lệ</option>
                    <option value="encouragement">💪 Động viên cố gắng</option>
                    <option value="improvement">🎯 Định hướng hoàn thiện</option>
                    <option value="reminder">⚠️ Nhắc nhở nhẹ nhàng</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateComment}
                  disabled={isLoadingComment}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isLoadingComment ? 'Đang soạn nhận xét...' : '✨ Tạo nhận xét bằng AI'}</span>
                </button>
              </div>

              {generatedComment && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900">Nội dung nhận xét gợi ý:</span>
                    <button
                      onClick={() => handleCopy(generatedComment, 'comment')}
                      className="px-3 py-1 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedText === 'comment' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === 'comment' ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans bg-white p-3 rounded-xl border border-slate-200/70">
                    {generatedComment}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 5.2: SOẠN TIN NHẮN PHỤ HUYNH */}
          {draftingMode === 'parent_message' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Soạn Tin Nhắn Gửi Phụ Huynh (Zalo / SMS / Sổ Liên Lạc)
                </h3>
                <p className="text-xs text-slate-500">
                  Nội dung súc tích, văn phong lịch sự, tôn trọng phụ huynh và nhấn mạnh tinh thần hợp tác.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Chọn học sinh:</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
                  >
                    {students.map((s) => (
                      <option key={s.studentId} value={s.studentId}>
                        {s.studentNumber}. {s.fullName} ({s.teamName || `Tổ ${s.teamId}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mục đích tin nhắn:</label>
                  <select
                    value={parentPurpose}
                    onChange={(e) => setParentPurpose(e.target.value as ParentMessagePurpose)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-semibold"
                  >
                    <option value="weeklyUpdate">Báo cáo thi đua tuần định kỳ</option>
                    <option value="praise">Khen ngợi biểu dương thành tích</option>
                    <option value="progress">Thông báo tiến bộ rõ rệt</option>
                    <option value="reminder">Nhắc nhở nhẹ về nề nếp</option>
                    <option value="concern">Cần phối hợp giải quyết vấn đề</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú thêm của GVCN (nếu có):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhắc mang sách giáo khoa mới, động viên con ngủ sớm..."
                  value={parentExtraNote}
                  onChange={(e) => setParentExtraNote(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              {/* Warning Banner */}
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Lưu ý:</strong> AI chỉ hỗ trợ soạn thảo văn bản mẫu. Giáo viên cần kiểm tra kỹ trước khi gửi tới phụ huynh.
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateParentMessage}
                  disabled={isLoadingParentMsg}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isLoadingParentMsg ? 'Đang soạn tin nhắn...' : '✨ Tạo tin nhắn Zalo/SMS'}</span>
                </button>
              </div>

              {generatedParentMsg && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900">Bản thảo tin nhắn gửi phụ huynh:</span>
                    <button
                      onClick={() => handleCopy(generatedParentMsg, 'parent_msg')}
                      className="px-3 py-1 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedText === 'parent_msg' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === 'parent_msg' ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans bg-white p-3 rounded-xl border border-slate-200/70 whitespace-pre-wrap">
                    {generatedParentMsg}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 5.3: SOẠN BÁO CÁO TUẦN 10 MỤC */}
          {draftingMode === 'weekly_report' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Soạn Báo Cáo Công Tác Chủ Nhiệm Tuần {selectedWeek} (Chuẩn Sư Phạm 10 Mục)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bao gồm đầy đủ chuyên cần, xếp hạng tổ, tuyên dương, các lỗi nề nếp và phương hướng tuần tới.
                  </p>
                </div>

                <button
                  onClick={handleGenerateWeeklyReport}
                  disabled={isLoadingWeeklyReport}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isLoadingWeeklyReport ? 'Đang tổng hợp báo cáo...' : '✨ Tự động lập báo cáo tuần'}</span>
                </button>
              </div>

              {generatedWeeklyReport && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900">Nội dung Báo cáo Tuần hoàn chỉnh:</span>
                    <button
                      onClick={() => handleCopy(generatedWeeklyReport, 'weekly_report')}
                      className="px-3 py-1 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedText === 'weekly_report' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === 'weekly_report' ? 'Đã sao chép' : 'Sao chép báo cáo'}</span>
                    </button>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans bg-white p-4 rounded-xl border border-slate-200/70 whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                    {generatedWeeklyReport}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: GIẢI QUYẾT TÌNH HUỐNG SƯ PHẠM (4 BƯỚC NHÂN VĂN)                    */}
      {/* ========================================================================= */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-800 mb-1 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <span>Trợ Lý Giải Quyết Tình Huống Sư Phạm (Quy trình 4 bước)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Nhập tình huống thực tế hoặc chọn mẫu bên dưới để nhận quy trình xử lý không làm tổn thương học sinh.
              </p>
            </div>

            {/* Quick Scenario Samples */}
            <div className="flex flex-wrap gap-2">
              {[
                'Học sinh không chịu làm bài tập và có biểu hiện chống đối',
                'Phụ huynh phản ánh con bị bạn cô lập, tẩy chay trong lớp',
                'Hai học sinh cãi vã, va chạm xô xát trong giờ ra chơi',
                'Học sinh thường xuyên ngủ gật và nghiện chơi game',
                'Học sinh bị nghi ngờ lấy trộm đồ của bạn cùng bàn'
              ].map((sc, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIncidentScenario(sc);
                    handleSolveIncident(sc);
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {sc}
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <textarea
                rows={3}
                placeholder="Mô tả cụ thể tình huống xảy ra ở lớp..."
                value={incidentScenario}
                onChange={(e) => setIncidentScenario(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />

              <div className="flex justify-end">
                <button
                  disabled={!incidentScenario.trim() || isLoadingIncident}
                  onClick={() => handleSolveIncident()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isLoadingIncident ? 'Đang xây dựng quy trình...' : '✨ Tạo quy trình giải quyết 4 bước'}</span>
                </button>
              </div>
            </div>
          </div>

          {incidentOutput && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm sm:text-base text-slate-800">
                  Quy trình 4 bước gợi ý từ Trợ lý Sư phạm AI
                </h3>
                <button
                  onClick={() => handleCopy(incidentOutput, 'incident')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  {copiedText === 'incident' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText === 'incident' ? 'Đã sao chép' : 'Sao chép giải pháp'}</span>
                </button>
              </div>

              <div className="text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100 font-sans">
                {incidentOutput}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXPLAINABILITY MODAL ("Vì sao?")                                          */}
      {/* ========================================================================= */}
      {activeExplainInsight && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Cơ sở dữ liệu & Giải thích sư phạm
                  </h3>
                  <p className="text-xs text-slate-400">Tính minh bạch & giải trình của AI</p>
                </div>
              </div>
              <button
                onClick={() => setActiveExplainInsight(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-900 block mb-1">Tiêu đề phát hiện:</span>
                <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-medium">
                  {activeExplainInsight.title}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1">Số liệu thực tế trích xuất từ Firestore:</span>
                <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-800">
                  {activeExplainInsight.evidence}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1">Mục tiêu sư phạm hướng tới:</span>
                <p className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-indigo-950 font-medium">
                  {activeExplainInsight.goal}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveExplainInsight(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
