import React, { useState, useMemo, useEffect } from 'react';
import { useClassData } from '../hooks/useClassData';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { 
  Zap, 
  Search, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Users, 
  CheckSquare,
  Square,
  Sparkles,
  Info,
  Check,
  Award,
  Layers,
  ShieldCheck,
  AlertTriangle,
  GraduationCap,
  Lock,
  UserCheck
} from 'lucide-react';
import { formatDateVN, checkGradingPermission, normalizeTeamName, CADRE_ROLES_META } from '../utils/constants';
import { Student, Criterion } from '../types';
import { QuickScoreBar } from '../components/grading/QuickScoreBar';
import { WeekLockModal } from '../components/academic/WeekLockModal';

const isGenericDummyName = (name?: string) => {
  if (!name) return true;
  const lower = name.trim().toLowerCase();
  return [
    'tô vĩnh phát',
    'võ phương thảo',
    'lê hoàng nam',
    'cao thu trang',
    'phạm tuấn kiệt',
    'nguyễn minh anh',
    'học sinh',
    'tổ trưởng',
    'lớp trưởng',
    'lớp phó',
    'bí thư'
  ].includes(lower) || lower.startsWith('tổ trưởng') || lower.startsWith('học sinh');
};

export const GradingPage: React.FC = () => {
  const { 
    selectedWeek, 
    students, 
    criteria, 
    events, 
    studentsWithScores, 
    teacherName,
    quickAddEvent, 
    batchAddEvents,
    removeEvent,
    isCurrentWeekLocked
  } = useClassData();

  const { showToast } = useToast();
  const { appRole, roleSession } = useAuth();
  const [isWeekLockModalOpen, setIsWeekLockModalOpen] = useState(false);

  // Check if logged in user is a team leader or has grading authorization
  const isLeaderAccount = Boolean(
    roleSession.category === 'to_truong' ||
    roleSession.canGrade === true ||
    appRole.startsWith('to_truong')
  );

  const loggedInTeam = useMemo(() => {
    return normalizeTeamName(roleSession.teamName || '');
  }, [roleSession.teamName]);

  // Mode: single student or batch criteria
  const [gradingMode, setGradingMode] = useState<'single' | 'batch'>('single');

  // Evaluator mode: teacher or student
  const [evaluatorType, setEvaluatorType] = useState<'teacher' | 'student'>(() => {
    return isLeaderAccount ? 'student' : 'teacher';
  });
  const [evaluatorStudentId, setEvaluatorStudentId] = useState<string>('');

  // Real team leader for the active evaluator team
  const realTeamLeader = useMemo(() => {
    const targetTeam = loggedInTeam || 'Tổ 1';
    return (roleSession.studentId ? students.find(s => s.studentId === roleSession.studentId) : null)
      || students.find(s => normalizeTeamName(s.teamName) === targetTeam && (s.isTeamLeader || s.teamRole === 'to_truong' || (s as any).role === 'to_truong'))
      || (roleSession.studentName && !isGenericDummyName(roleSession.studentName) ? students.find(s => normalizeTeamName(s.teamName) === targetTeam && s.fullName.toLowerCase() === roleSession.studentName?.toLowerCase()) : null)
      || students.find(s => normalizeTeamName(s.teamName) === targetTeam);
  }, [students, loggedInTeam, roleSession.studentId, roleSession.studentName]);

  // Sync evaluator state with logged in app role
  useEffect(() => {
    if (isLeaderAccount) {
      setEvaluatorType('student');
      if (realTeamLeader) {
        setEvaluatorStudentId(realTeamLeader.studentId);
      }
    } else if (roleSession.category === 'gvcn') {
      setEvaluatorType('teacher');
    }
  }, [isLeaderAccount, roleSession.category, realTeamLeader]);

  // Auto-pick first team leader for student evaluator if empty
  useEffect(() => {
    if (!evaluatorStudentId && students.length > 0) {
      if (isLeaderAccount && realTeamLeader) {
        setEvaluatorStudentId(realTeamLeader.studentId);
        return;
      }
      const leader = students.find(s => s.isTeamLeader || s.teamRole === 'to_truong' || (s as any).role === 'to_truong');
      if (leader) {
        setEvaluatorStudentId(leader.studentId);
      } else {
        setEvaluatorStudentId(students[0].studentId);
      }
    }
  }, [students, evaluatorStudentId, isLeaderAccount, realTeamLeader]);

  // Current evaluator student object
  const currentStudentEvaluator = useMemo(() => {
    if (evaluatorStudentId) {
      const found = students.find(s => s.studentId === evaluatorStudentId);
      if (found) return found;
    }
    if (realTeamLeader) return realTeamLeader;
    return students[0];
  }, [students, evaluatorStudentId, realTeamLeader]);

  // Check if current student evaluator is authorized as a team leader
  const isStudentEvaluatorLeader = useMemo(() => {
    if (isLeaderAccount) return true;
    return Boolean(
      currentStudentEvaluator?.isTeamLeader || 
      currentStudentEvaluator?.teamRole === 'to_truong' || 
      (currentStudentEvaluator as any)?.role === 'to_truong'
    );
  }, [isLeaderAccount, currentStudentEvaluator]);

  // Evaluator's active team name
  const activeEvaluatorTeam = useMemo(() => {
    if (isLeaderAccount && loggedInTeam) return loggedInTeam;
    return normalizeTeamName(currentStudentEvaluator?.teamName || 'Tổ 1');
  }, [isLeaderAccount, loggedInTeam, currentStudentEvaluator]);

  // Distinct teams present in class
  const distinctTeams = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      const norm = normalizeTeamName(s.teamName);
      if (norm) set.add(norm);
    });
    if (set.size === 0) {
      return ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'];
    }
    return Array.from(set).sort();
  }, [students]);

  // Evaluator display name
  const evaluatorDisplayName = useMemo(() => {
    if (evaluatorType === 'teacher') {
      return teacherName || 'Giáo viên chủ nhiệm';
    }
    if (currentStudentEvaluator?.fullName) {
      return currentStudentEvaluator.fullName;
    }
    if (realTeamLeader?.fullName) {
      return realTeamLeader.fullName;
    }
    if (roleSession.studentName && !isGenericDummyName(roleSession.studentName)) {
      return roleSession.studentName;
    }
    return `Tổ trưởng ${activeEvaluatorTeam}`;
  }, [evaluatorType, teacherName, currentStudentEvaluator, realTeamLeader, roleSession.studentName, activeEvaluatorTeam]);

  // Single mode state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync team filter when student evaluator changes
  useEffect(() => {
    if (evaluatorType === 'student' || isLeaderAccount) {
      setSelectedTeamFilter(activeEvaluatorTeam);
    }
  }, [evaluatorType, isLeaderAccount, activeEvaluatorTeam]);

  // Filter single students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // If student evaluator or team leader, lock strictly to their team
      if (evaluatorType === 'student' || isLeaderAccount) {
        if (!isStudentEvaluatorLeader && !isLeaderAccount) return false;
        if (normalizeTeamName(s.teamName) !== activeEvaluatorTeam) return false;
      } else {
        // Teacher mode: allow team filter
        if (selectedTeamFilter !== 'all' && normalizeTeamName(s.teamName) !== normalizeTeamName(selectedTeamFilter)) {
          return false;
        }
      }

      const matchSearch = !searchQuery || s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || `${s.studentNumber}`.includes(searchQuery);
      return matchSearch;
    });
  }, [students, evaluatorType, isLeaderAccount, isStudentEvaluatorLeader, activeEvaluatorTeam, selectedTeamFilter, searchQuery]);

  // Ensure active student belongs to allowed pool
  useEffect(() => {
    if (filteredStudents.length > 0) {
      const existsInFiltered = filteredStudents.some(s => s.studentId === selectedStudentId);
      if (!existsInFiltered) {
        setSelectedStudentId(filteredStudents[0].studentId);
      }
    }
  }, [filteredStudents, selectedStudentId]);

  // Active student in single mode
  const activeStudent = useMemo(() => {
    if (selectedStudentId) {
      const found = studentsWithScores.find(s => s.studentId === selectedStudentId);
      if (found && filteredStudents.some(s => s.studentId === found.studentId)) {
        return found;
      }
    }
    if (filteredStudents.length > 0) {
      const firstId = filteredStudents[0].studentId;
      return studentsWithScores.find(s => s.studentId === firstId);
    }
    return undefined;
  }, [studentsWithScores, selectedStudentId, filteredStudents]);

  // Sorted criteria by order (strictly sequential 1..N)
  const sortedCriteria = useMemo(() => {
    return [...criteria].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [criteria]);

  // Positive & Negative criteria lists derived from sorted criteria
  const positiveCriteria = useMemo(() => {
    return sortedCriteria.filter(c => c.positiveScore > 0);
  }, [sortedCriteria]);

  const negativeCriteria = useMemo(() => {
    return sortedCriteria.filter(c => c.negativeScore !== 0);
  }, [sortedCriteria]);

  // Tab for 1-tap grading
  const [gradingCriteriaTab, setGradingCriteriaTab] = useState<'all' | 'positive' | 'negative'>('all');

  // Batch mode state
  const [batchCriterionId, setBatchCriterionId] = useState<string>(criteria[0]?.criterionId || '');
  const [batchScoreType, setBatchScoreType] = useState<'positive' | 'negative'>('positive');
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [batchNote, setBatchNote] = useState<string>('');

  // Selected batch criterion object
  const selectedBatchCrit = useMemo(() => {
    return sortedCriteria.find(c => c.criterionId === batchCriterionId) || sortedCriteria[0];
  }, [sortedCriteria, batchCriterionId]);

  // Dynamic 8 quick actions derived directly from user's configured criteria in Settings
  const dynamicQuickActions = useMemo(() => {
    const topPositive = positiveCriteria.slice(0, 4).map(c => ({
      criterion: c,
      type: 'positive' as const,
      label: c.name,
      score: c.positiveScore,
      icon: '🟢',
      color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950 font-bold'
    }));
    const topNegative = negativeCriteria.slice(0, 4).map(c => ({
      criterion: c,
      type: 'negative' as const,
      label: c.name,
      score: c.negativeScore,
      icon: '🔴',
      color: 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-950 font-bold'
    }));
    return [...topPositive, ...topNegative];
  }, [positiveCriteria, negativeCriteria]);

  // Helper to get current evaluator payload
  const getEvaluatorPayload = () => {
    if (evaluatorType === 'teacher') {
      return {
        evaluatorId: 'teacher',
        studentId: 'teacher',
        name: teacherName || 'Giáo viên chủ nhiệm',
        evaluatorName: teacherName || 'Giáo viên chủ nhiệm',
        roleLabel: 'Giáo viên chủ nhiệm',
        evaluatorRole: 'Giáo viên chủ nhiệm'
      };
    }
    const evName = evaluatorDisplayName;
    return {
      evaluatorId: currentStudentEvaluator?.studentId || realTeamLeader?.studentId || roleSession.studentId || 'leader',
      studentId: currentStudentEvaluator?.studentId || realTeamLeader?.studentId || roleSession.studentId || 'leader',
      name: evName,
      evaluatorName: evName,
      roleLabel: `Tổ trưởng ${activeEvaluatorTeam}`,
      evaluatorRole: `Tổ trưởng ${activeEvaluatorTeam}`
    };
  };

  // Helper to verify permission before grading a target student
  const verifyGradingPermission = (targetTeamName: string): { allowed: boolean; reason?: string } => {
    return checkGradingPermission(
      {
        isTeacher: evaluatorType === 'teacher' || roleSession.category === 'gvcn',
        isTeamLeader: isStudentEvaluatorLeader || isLeaderAccount,
        teamName: activeEvaluatorTeam,
        name: evaluatorDisplayName
      },
      targetTeamName
    );
  };

  // Handler for 1-tap single grade
  const handleQuickGrade = async (action: typeof dynamicQuickActions[0]) => {
    await handleCriterionClick(action.criterion, action.type === 'positive');
  };

  // Handler for detailed criteria click
  const handleCriterionClick = async (crit: Criterion, isPositive: boolean) => {
    if (!activeStudent || isSubmitting) return;

    // Check permission
    const perm = verifyGradingPermission(activeStudent.teamName);
    if (!perm.allowed) {
      showToast(perm.reason || 'Bạn không có quyền chấm học sinh này', 'error');
      return;
    }

    setIsSubmitting(true);
    const scoreVal = isPositive ? crit.positiveScore : crit.negativeScore;
    const noteText = customNote.trim() || crit.name;

    try {
      await quickAddEvent(
        activeStudent.studentId, 
        crit.criterionId, 
        scoreVal, 
        noteText,
        getEvaluatorPayload()
      );
      showToast(
        `Đã ${scoreVal > 0 ? 'cộng ' + scoreVal : 'trừ ' + Math.abs(scoreVal)} điểm [STT ${crit.order}: ${crit.name}] cho ${activeStudent.fullName}`,
        scoreVal > 0 ? 'success' : 'warning'
      );
      setCustomNote('');
    } catch (e) {
      console.error('Grading error:', e);
      showToast('Có lỗi khi lưu điểm', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch toggle student
  const toggleBatchStudent = (student: Student) => {
    if (evaluatorType === 'student' || isLeaderAccount) {
      if (!isStudentEvaluatorLeader && !isLeaderAccount) {
        showToast('Bạn chưa được phân quyền Tổ trưởng nên không thể chấm thi đua', 'error');
        return;
      }
      if (normalizeTeamName(student.teamName) !== activeEvaluatorTeam) {
        showToast(`Bạn chỉ được chấm học sinh thuộc ${activeEvaluatorTeam}`, 'error');
        return;
      }
    }

    setBatchSelectedIds(prev => 
      prev.includes(student.studentId) ? prev.filter(item => item !== student.studentId) : [...prev, student.studentId]
    );
  };

  // Select all permitted students
  const selectAllStudents = () => {
    if (evaluatorType === 'student' || isLeaderAccount) {
      if (!isStudentEvaluatorLeader && !isLeaderAccount) {
        showToast('Bạn chưa được phân quyền Tổ trưởng', 'error');
        return;
      }
      const myTeamIds = students
        .filter(s => normalizeTeamName(s.teamName) === activeEvaluatorTeam)
        .map(s => s.studentId);
      setBatchSelectedIds(myTeamIds);
    } else {
      setBatchSelectedIds(students.map(s => s.studentId));
    }
  };

  const deselectAllStudents = () => {
    setBatchSelectedIds([]);
  };

  const selectTeamStudents = (teamName: string) => {
    const normTeam = normalizeTeamName(teamName);
    if (evaluatorType === 'student' || isLeaderAccount) {
      if ((!isStudentEvaluatorLeader && !isLeaderAccount) || normTeam !== activeEvaluatorTeam) {
        showToast(`Bạn chỉ được phép chấm học sinh thuộc ${activeEvaluatorTeam}`, 'error');
        return;
      }
    }
    const teamIds = students.filter(s => normalizeTeamName(s.teamName) === normTeam).map(s => s.studentId);
    setBatchSelectedIds(prev => Array.from(new Set([...prev, ...teamIds])));
  };

  // Submit batch grading
  const handleApplyBatchGrade = async () => {
    if (batchSelectedIds.length === 0 || !selectedBatchCrit || isSubmitting) return;

    // Check permission for each selected student
    if (evaluatorType === 'student' || isLeaderAccount) {
      if (!isStudentEvaluatorLeader && !isLeaderAccount) {
        showToast('Bạn chưa được phân quyền Tổ trưởng nên không có quyền chấm điểm', 'error');
        return;
      }
      const invalidStudents = students.filter(
        s => batchSelectedIds.includes(s.studentId) && normalizeTeamName(s.teamName) !== activeEvaluatorTeam
      );
      if (invalidStudents.length > 0) {
        showToast(`Chỉ được chấm học sinh cùng thuộc ${activeEvaluatorTeam}`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    const scoreVal = batchScoreType === 'positive' 
      ? selectedBatchCrit.positiveScore 
      : selectedBatchCrit.negativeScore;
    const noteText = batchNote.trim() || selectedBatchCrit.name;

    try {
      await batchAddEvents(
        batchSelectedIds, 
        selectedBatchCrit.criterionId, 
        scoreVal, 
        noteText,
        getEvaluatorPayload()
      );
      showToast(
        `Đã áp dụng ${scoreVal > 0 ? '+' + scoreVal : scoreVal} điểm (${selectedBatchCrit.name}) cho ${batchSelectedIds.length} học sinh`,
        'success'
      );
      setBatchSelectedIds([]);
      setBatchNote('');
    } catch (err) {
      console.error('Batch grading error:', err);
      showToast('Có lỗi xảy ra khi chấm nhiều học sinh', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recent week events
  const recentEvents = useMemo(() => {
    return events.filter(e => e.week === selectedWeek).slice(0, 15);
  }, [events, selectedWeek]);

  // RBAC: Chế độ phân quyền - Chỉ ban cán sự lớp và tổ trưởng được phân quyền mới được nhập điểm
  if (roleSession.category === 'thanh_vien' || (!roleSession.canGrade && roleSession.category !== 'gvcn')) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Giới hạn quyền nhập điểm thi đua</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
          Theo quy chế của lớp, <strong>chỉ Ban cán sự lớp, Tổ trưởng được phân quyền và Giáo viên chủ nhiệm</strong> mới có thể nhập điểm thi đua và chỉnh sửa dữ liệu.
        </p>
        <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 max-w-md mx-auto text-left space-y-1">
          <p className="font-bold text-slate-800">Tài khoản hiện tại: {roleSession.studentName || 'Học sinh'} ({roleSession.title})</p>
          <p>• Để nhập điểm: Đăng nhập bằng tài khoản Tổ trưởng (nhập đúng Pass code do GVCN cấp) hoặc Ban cán sự lớp.</p>
          <p>• Tài khoản học sinh có thể theo dõi Bảng xếp hạng tuần và nhận xét của Ban cán sự lớp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* CẢNH BÁO KHÓA SỔ THI ĐUA */}
      {isCurrentWeekLocked && (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Tuần {selectedWeek} đã được khóa sổ thi đua
              </h3>
              <p className="text-xs text-amber-700">
                Dữ liệu điểm thi đua được bảo toàn ở chế độ chỉ đọc. Mở khóa sổ nếu cần bổ sung hoặc điều chỉnh điểm.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsWeekLockModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap self-end sm:self-auto"
          >
            Quản lý tuần & Khóa sổ
          </button>
        </div>
      )}

      {/* TOP EVALUATOR SWITCHER: Giáo viên chủ nhiệm HOẶC Học sinh (Tổ trưởng) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        {isLeaderAccount ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider block w-fit mb-0.5">
                  Tài khoản Tổ trưởng • {activeEvaluatorTeam}
                </span>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  🎖️ {evaluatorDisplayName}
                </h2>
                <p className="text-xs text-slate-500">
                  Bạn có toàn quyền chấm điểm thi đua cho tất cả thành viên thuộc <strong>{activeEvaluatorTeam}</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Được phép chấm {activeEvaluatorTeam}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Phân quyền người chấm thi đua
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    {evaluatorType === 'teacher' 
                      ? `🎓 ${teacherName || 'Giáo viên chủ nhiệm'}`
                      : `🎒 ${evaluatorDisplayName} (${activeEvaluatorTeam})`}
                  </h2>
                </div>
              </div>

              {/* Toggle Type */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl self-start md:self-auto">
                <button
                  onClick={() => setEvaluatorType('teacher')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    evaluatorType === 'teacher'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>GVCN chấm ({teacherName.replace(/^(Cô|Thầy)\s+/i, '')})</span>
                </button>

                <button
                  onClick={() => setEvaluatorType('student')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    evaluatorType === 'student'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Học sinh (Tổ trưởng)</span>
                </button>
              </div>
            </div>

            {/* When Student Evaluator is selected: Student Picker & Permission Indicator */}
            {evaluatorType === 'student' && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Chọn học sinh thực hiện chấm:</span>
                  </label>

                  <select
                    value={evaluatorStudentId}
                    onChange={(e) => setEvaluatorStudentId(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-sm"
                  >
                    <optgroup label="🎖️ Các Tổ trưởng (Được GVCN phân quyền chấm tổ)">
                      {students.filter(s => s.isTeamLeader || s.teamRole === 'to_truong' || (s as any).role === 'to_truong').map(s => (
                        <option key={s.studentId} value={s.studentId}>
                          🎖️ #{s.studentNumber} {s.fullName} - Tổ trưởng {normalizeTeamName(s.teamName)} (Được chấm {normalizeTeamName(s.teamName)})
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="👤 Ban cán sự & Học sinh khác (Chưa có quyền chấm)">
                      {students.filter(s => !s.isTeamLeader && s.teamRole !== 'to_truong' && (s as any).role !== 'to_truong').map(s => (
                        <option key={s.studentId} value={s.studentId}>
                          #{s.studentNumber} {s.fullName} ({normalizeTeamName(s.teamName)}) - {s.cadreRole && s.cadreRole !== 'none' ? CADRE_ROLES_META[s.cadreRole]?.label || s.cadreRole : 'Thành viên'}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Permission Banner */}
                {isStudentEvaluatorLeader ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-950 font-medium">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Xác nhận quyền:</strong> Em <strong>{currentStudentEvaluator?.fullName}</strong> là <strong>Tổ trưởng {activeEvaluatorTeam}</strong>. Em được quyền chấm thi đua cho tất cả các bạn trong <strong>{activeEvaluatorTeam}</strong>.
                      </span>
                    </div>
                    <span className="hidden sm:inline-block px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-bold shrink-0">
                      Hợp lệ
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-950 font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Không có quyền chấm thi đua:</span> Em <strong>{currentStudentEvaluator?.fullName}</strong> chưa được Giáo viên chủ nhiệm phân quyền <strong>Tổ trưởng</strong>.
                      <p className="text-[11px] text-rose-800 mt-0.5">
                        Theo quy định: Chỉ học sinh được GVCN phân quyền Tổ trưởng mới được chấm thi đua các bạn cùng thuộc tổ với mình. Để phân quyền cho em này, GVCN hãy vào tab <strong>Học sinh &gt; Phân quyền Ban cán sự &amp; Tổ trưởng</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Top Header & Tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Zap className="w-5 h-5 fill-white" />
            </span>
            CHẤM THI ĐUA • TUẦN {selectedWeek}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {evaluatorType === 'teacher' 
              ? 'Chế độ Giáo viên chủ nhiệm: Toàn quyền chấm mọi học sinh trong lớp.'
              : isStudentEvaluatorLeader
              ? `Chế độ Tổ trưởng: Chỉ chấm học sinh thuộc ${activeEvaluatorTeam}.`
              : 'Học sinh chưa có quyền chấm điểm.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl shrink-0">
          <button
            onClick={() => setGradingMode('single')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              gradingMode === 'single'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Chấm từng em</span>
          </button>
          <button
            onClick={() => setGradingMode('batch')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              gradingMode === 'batch'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Chấm theo tiêu chí (Nhiều em)</span>
          </button>
        </div>
      </div>

      {/* BLOCKED WARNING IF STUDENT EVALUATOR HAS NO PERMISSION */}
      {evaluatorType === 'student' && !isStudentEvaluatorLeader && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-amber-950">
            Chức năng chấm điểm đang tạm khóa
          </h3>
          <p className="text-xs sm:text-sm text-amber-900 max-w-lg mx-auto leading-relaxed">
            Em <strong>{currentStudentEvaluator?.fullName}</strong> ({activeEvaluatorTeam}) chưa được Giáo viên chủ nhiệm phân quyền <strong>Tổ trưởng</strong>.
            <br />
            <strong>Quy định:</strong> Chỉ học sinh được GVCN phân quyền Tổ trưởng mới được chấm thi đua các học sinh cùng thuộc tổ với mình. Ví dụ: chỉ tổ trưởng tổ 1 mới chấm thi đua được cho học sinh thuộc tổ 1.
          </p>
          <div className="pt-2">
            <span className="text-xs font-bold text-indigo-700 bg-white px-3 py-1 rounded-full border border-amber-200">
              Chuyển sang "GVCN chấm" hoặc chọn một Tổ trưởng ở phía trên để tiếp tục
            </span>
          </div>
        </div>
      )}

      {/* MODE 1: CHẤM TỪNG EM (1-TAP) */}
      {gradingMode === 'single' && (evaluatorType === 'teacher' || isStudentEvaluatorLeader) && (
        <div className="space-y-6">
          {/* STEP 1: CHỌN HỌC SINH */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h2 className="font-bold text-sm sm:text-base text-slate-800">
                  1. Chọn học sinh
                  {(evaluatorType === 'student' || isLeaderAccount) && (
                    <span className="text-xs font-bold text-emerald-700 ml-1.5">
                      ({activeEvaluatorTeam})
                    </span>
                  )}
                </h2>
                <span className="text-xs text-slate-400 font-medium">({filteredStudents.length} học sinh)</span>
              </div>

              {/* Filter by Team & Search */}
              <div className="flex items-center gap-2">
                {evaluatorType === 'teacher' ? (
                  <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
                    {['all', ...distinctTeams].map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTeamFilter(t)}
                        className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                          selectedTeamFilter === t
                            ? 'bg-white text-indigo-700 shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t === 'all' ? 'Tất cả' : t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-xl">
                    Chỉ hiển thị {activeEvaluatorTeam}
                  </span>
                )}

                <div className="relative w-36 sm:w-44">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên / STT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Students list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-52 overflow-y-auto p-1">
              {filteredStudents.map((std) => {
                const isSelected = activeStudent?.studentId === std.studentId;
                const scoreObj = studentsWithScores.find(s => s.studentId === std.studentId);
                const currentScore = scoreObj?.currentWeekScore || 100;

                return (
                  <button
                    key={std.studentId}
                    id={`student-btn-${std.studentId}`}
                    onClick={() => setSelectedStudentId(std.studentId)}
                    className={`p-2 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="truncate mr-1">
                      <div className="text-xs font-bold truncate">
                        #{std.studentNumber}. {std.fullName}
                      </div>
                      <div className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {std.teamName}
                      </div>
                    </div>

                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-indigo-700 shadow-xs'
                    }`}>
                      {currentScore}đ
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Student Active Banner */}
            {activeStudent && (
              <div className="mt-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
                    {activeStudent.fullName.split(' ').slice(-1)[0].charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-indigo-950">
                        #{activeStudent.studentNumber}. {activeStudent.fullName}
                      </h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-indigo-800 border border-indigo-200">
                        {activeStudent.teamName}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-700 font-medium mt-0.5">
                      Xếp loại: <strong>{activeStudent.rankCategory}</strong> • {'⭐'.repeat(activeStudent.stars)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-xs text-indigo-600 font-medium">Điểm hiện tại:</span>
                    <div className="text-2xl font-black text-indigo-900 leading-none">
                      {activeStudent.currentWeekScore} <span className="text-xs font-normal">điểm</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 border-l border-indigo-200 pl-3">
                    <span className="text-emerald-700 font-bold">+{activeStudent.totalPositive}</span> / 
                    <span className="text-rose-700 font-bold ml-1">-{activeStudent.totalNegative}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: 1-TAP FAST BUTTONS - FULLY SYNCHRONIZED WITH SETTINGS CRITERIA */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h2 className="font-bold text-sm sm:text-base text-slate-800">
                  2. Chấm điểm 1-chạm (Đồng bộ theo Tiêu chí STT 1 → {sortedCriteria.length})
                </h2>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setGradingCriteriaTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    gradingCriteriaTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({sortedCriteria.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGradingCriteriaTab('positive')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    gradingCriteriaTab === 'positive'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <span>🟢 Điểm cộng</span>
                  <span className="text-[10px] px-1 bg-white/20 rounded-full">({positiveCriteria.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGradingCriteriaTab('negative')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    gradingCriteriaTab === 'negative'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span>🔴 Điểm trừ</span>
                  <span className="text-[10px] px-1 bg-white/20 rounded-full">({negativeCriteria.length})</span>
                </button>
              </div>
            </div>

            {/* Quick 8 Highlights Ribbon when tab is 'all' */}
            {gradingCriteriaTab === 'all' && dynamicQuickActions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Phím tắt nhanh hàng đầu (tự động theo STT 1..{sortedCriteria.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {dynamicQuickActions.map((action, idx) => (
                    <button
                      key={idx}
                      disabled={!activeStudent || isSubmitting}
                      onClick={() => handleQuickGrade(action)}
                      className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-xs active:scale-95 select-none ${action.color} disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-1 text-[11px] font-black opacity-80 mb-0.5">
                        <span className="px-1.5 py-0.2 bg-black/10 rounded-md">#{action.criterion.order}</span>
                        <span>{action.icon}</span>
                      </div>
                      <div className="font-extrabold text-xs sm:text-sm leading-tight truncate max-w-[140px]">
                        {action.label}
                      </div>
                      <div className={`text-xs font-black mt-1 px-2.5 py-0.5 rounded-full ${
                        action.score > 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {action.score > 0 ? `+${action.score}` : action.score} điểm
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Criteria List / Grid corresponding to active tab, strictly sorted by order */}
            {gradingCriteriaTab === 'positive' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {positiveCriteria.map(crit => (
                  <button
                    key={crit.criterionId}
                    disabled={!activeStudent || isSubmitting}
                    onClick={() => handleCriterionClick(crit, true)}
                    className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <span className="text-[11px] font-black text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full mb-1">
                      #{crit.order}
                    </span>
                    <div className="text-sm font-extrabold leading-snug truncate max-w-full">
                      {crit.name}
                    </div>
                    <div className="text-xs font-black mt-1.5 px-3 py-0.5 rounded-full bg-emerald-600 text-white">
                      +{crit.positiveScore} điểm
                    </div>
                  </button>
                ))}
              </div>
            )}

            {gradingCriteriaTab === 'negative' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {negativeCriteria.map(crit => (
                  <button
                    key={crit.criterionId}
                    disabled={!activeStudent || isSubmitting}
                    onClick={() => handleCriterionClick(crit, false)}
                    className="p-3.5 rounded-2xl border-2 border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-950 font-bold transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <span className="text-[11px] font-black text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-full mb-1">
                      #{crit.order}
                    </span>
                    <div className="text-sm font-extrabold leading-snug truncate max-w-full">
                      {crit.name}
                    </div>
                    <div className="text-xs font-black mt-1.5 px-3 py-0.5 rounded-full bg-rose-600 text-white">
                      {crit.negativeScore} điểm
                    </div>
                  </button>
                ))}
              </div>
            )}

            {gradingCriteriaTab === 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {sortedCriteria.map(crit => (
                  <div
                    key={crit.criterionId}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-200 transition-colors flex items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[11px] flex items-center justify-center shrink-0">
                          {crit.order}
                        </span>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {crit.name}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate ml-6.5 mt-0.5">
                        {crit.description}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {crit.positiveScore > 0 && (
                        <button
                          disabled={!activeStudent || isSubmitting}
                          onClick={() => handleCriterionClick(crit, true)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title={`Chấm +${crit.positiveScore}đ cho [STT ${crit.order}] ${crit.name}`}
                        >
                          +{crit.positiveScore}đ
                        </button>
                      )}
                      {crit.negativeScore !== 0 && (
                        <button
                          disabled={!activeStudent || isSubmitting}
                          onClick={() => handleCriterionClick(crit, false)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title={`Chấm ${crit.negativeScore}đ cho [STT ${crit.order}] ${crit.name}`}
                        >
                          {crit.negativeScore}đ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ghi chú */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Ghi chú thêm nếu cần (ví dụ: nhiệt tình giúp bạn dọn lớp, tiết 2...)"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="flex-1 text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: CHẤM THEO TIÊU CHÍ (NHIỀU EM) */}
      {gradingMode === 'batch' && (evaluatorType === 'teacher' || isStudentEvaluatorLeader) && (
        <div className="space-y-6">
          {/* BƯỚC A: CHỌN TIÊU CHÍ */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <h2 className="font-bold text-sm sm:text-base text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                A
              </span>
              Chọn tiêu chí chấm điểm
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Tiêu chí áp dụng:
                </label>
                <select
                  value={batchCriterionId}
                  onChange={(e) => setBatchCriterionId(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {sortedCriteria.map((c) => (
                    <option key={c.criterionId} value={c.criterionId}>
                      {c.order}. {c.name} (+{c.positiveScore}đ / {c.negativeScore}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Loại điểm:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchScoreType('positive')}
                    className={`py-2 px-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      batchScoreType === 'positive'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Điểm cộng (+{selectedBatchCrit?.positiveScore || 1}đ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchScoreType('negative')}
                    className={`py-2 px-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      batchScoreType === 'negative'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Trừ điểm ({selectedBatchCrit?.negativeScore || -1}đ)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Ghi chú sự kiện (tùy chọn):
              </label>
              <input
                type="text"
                placeholder={`Ví dụ: ${selectedBatchCrit?.name || 'Hoàn thành bài tập tốt'} tiết 1...`}
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* BƯỚC B: CHỌN DANH SÁCH HỌC SINH */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <h2 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  B
                </span>
                Chọn các học sinh nhận điểm ({batchSelectedIds.length} đã chọn)
              </h2>

              {/* Quick Select Toolbars */}
              <div className="flex flex-wrap items-center gap-1.5">
                {evaluatorType === 'teacher' ? (
                  <>
                    <button
                      type="button"
                      onClick={selectAllStudents}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                    >
                      Chọn cả lớp ({students.length})
                    </button>
                    {distinctTeams.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => selectTeamStudents(t)}
                        className="px-2 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        + {t}
                      </button>
                    ))}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                  >
                    Chọn cả {activeEvaluatorTeam}
                  </button>
                )}
                <button
                  type="button"
                  onClick={deselectAllStudents}
                  className="px-2 py-1 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {/* Students Checkbox Grid grouped by Team */}
            <div className="space-y-4">
              {(evaluatorType === 'teacher' ? distinctTeams : [activeEvaluatorTeam]).map((teamName) => {
                const teamStudents = students.filter(s => normalizeTeamName(s.teamName) === normalizeTeamName(teamName));
                const isTeamAllowed = evaluatorType === 'teacher' || normalizeTeamName(teamName) === activeEvaluatorTeam;
                const allTeamSelected = isTeamAllowed && teamStudents.length > 0 && teamStudents.every(s => batchSelectedIds.includes(s.studentId));

                return (
                  <div 
                    key={teamName} 
                    className={`p-3 rounded-2xl border transition-all ${
                      isTeamAllowed 
                        ? 'bg-slate-50 border-slate-200' 
                        : 'bg-slate-100/50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">{teamName}</span>
                        {isTeamAllowed ? (
                          <span className="text-[11px] text-slate-400">
                            ({teamStudents.filter(s => batchSelectedIds.includes(s.studentId)).length}/{teamStudents.length} đã chọn)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Không thuộc tổ quản lý (Khóa)
                          </span>
                        )}
                      </div>

                      {isTeamAllowed && (
                        <button
                          type="button"
                          onClick={() => {
                            if (allTeamSelected) {
                              setBatchSelectedIds(prev => prev.filter(id => !teamStudents.some(s => s.studentId === id)));
                            } else {
                              selectTeamStudents(teamName);
                            }
                          }}
                          className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          {allTeamSelected ? 'Bỏ chọn tổ' : 'Chọn cả tổ'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {teamStudents.map((std) => {
                        const isChecked = batchSelectedIds.includes(std.studentId);
                        return (
                          <div
                            key={std.studentId}
                            onClick={() => isTeamAllowed && toggleBatchStudent(std)}
                            className={`p-2 rounded-xl border flex items-center gap-2 transition-all select-none ${
                              !isTeamAllowed
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : isChecked
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold cursor-pointer'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-white shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <div className="truncate text-xs">
                              #{std.studentNumber}. {std.fullName}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ACTION APPLY BAR */}
            <div className="mt-5 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-indigo-950 text-sm">
                  Sẵn sàng áp dụng cho <span className="text-indigo-600 text-base">{batchSelectedIds.length}</span> học sinh
                </div>
                <div className="text-xs text-indigo-700">
                  {batchScoreType === 'positive' ? 'Cộng' : 'Trừ'}{' '}
                  <strong>
                    {batchScoreType === 'positive'
                      ? `+${selectedBatchCrit?.positiveScore || 1}`
                      : `${selectedBatchCrit?.negativeScore || -1}`} điểm
                  </strong>{' '}
                  ({selectedBatchCrit?.name})
                </div>
              </div>

              <button
                type="button"
                disabled={batchSelectedIds.length === 0 || isSubmitting}
                onClick={handleApplyBatchGrade}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>
                  Áp dụng cho {batchSelectedIds.length} học sinh
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NHẬT KÝ SỰ KIỆN VỪA CHẤM (EVENT LOG VỚI NGƯỜI CHẤM) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm sm:text-base text-slate-800">
              Nhật ký sự kiện vừa ghi nhận (Tuần {selectedWeek})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Hiển thị người thực hiện chấm</span>
        </div>

        <div className="space-y-2">
          {recentEvents.length > 0 ? (
            recentEvents.map((ev) => (
              <div
                key={ev.eventId}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-black px-2.5 py-1 rounded-xl ${
                    ev.score > 0 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {ev.score > 0 ? `+${ev.score}` : ev.score}
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                      <span>{ev.studentName || 'Học sinh'}</span>
                      <span className="font-normal text-slate-600">• {ev.criterionName}</span>
                      {ev.evaluatorName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {ev.evaluatorRole || ev.evaluatorName}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatDateVN(ev.date)} {ev.note ? `• ${ev.note}` : ''}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    removeEvent(ev);
                    showToast(`Đã hoàn tác sự kiện của ${ev.studentName}`, 'info');
                  }}
                  title="Xóa sự kiện này và tính lại điểm"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs sm:text-sm text-slate-400">
              Chưa có sự kiện nào được ghi nhận trong tuần {selectedWeek}.
            </div>
          )}
        </div>
      </div>

      {/* DOCK CHẤM THI ĐUA NHANH & HOÀN TÁC 1 CHẠM */}
      <QuickScoreBar
        selectedStudentIds={batchSelectedIds}
        onClearSelection={() => setBatchSelectedIds([])}
        onOpenBatchModal={() => setGradingMode('batch')}
        onOpenWeekLockModal={() => setIsWeekLockModalOpen(true)}
        evaluator={getEvaluatorPayload()}
      />

      {/* MODAL QUẢN LÝ 35 TUẦN HỌC & KHÓA SỔ */}
      <WeekLockModal
        isOpen={isWeekLockModalOpen}
        onClose={() => setIsWeekLockModalOpen(false)}
      />
    </div>
  );
};
