import React, { useState, useEffect } from 'react';
import { useAuth, ROLE_CONFIGS } from '../hooks/useAuth';
import { 
  School, 
  Sparkles, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Check, 
  UserCheck, 
  GraduationCap, 
  Users, 
  ArrowRight,
  Edit3,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Crown,
  BookOpen,
  Brush,
  Shield,
  Star,
  Plus,
  Search,
  ChevronDown,
  ArrowLeftRight
} from 'lucide-react';
import { AppLoginRole, Student, ClassCadreRole, ClassInfo } from '../types';
import { 
  getAllClasses,
  getPrimaryClass, 
  getClassTeamPasscodes, 
  getTeamLeaderPasscode, 
  getClassStudents,
  getGvcnPasscode,
  getCadrePasscodes
} from '../services/firestoreService';
import { normalizeTeamName } from '../utils/constants';

export const LoginPage: React.FC = () => {
  const { 
    user,
    isGoogleLinked,
    googleEmail,
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithSelectedRole,
    signInAsTeacher,
    loginAsStudent,
    updateTeacherDisplayName,
    logout,
    loading, 
    error, 
    clearError 
  } = useAuth();

  const [className, setClassName] = useState('Lớp 11A9');
  const [selectedRole, setSelectedRole] = useState<AppLoginRole>('gvcn');
  const [authMethod, setAuthMethod] = useState<'quick' | 'student' | 'email' | 'google'>('quick');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // GVCN Passcode State
  const [gvcnPasscode, setGvcnPasscode] = useState('');
  const [showGvcnPasscode, setShowGvcnPasscode] = useState(false);
  const [actualGvcnPasscode, setActualGvcnPasscode] = useState<string>('1234');

  // Cadre (Ban cán sự lớp) Passcode State
  const [cadrePasscode, setCadrePasscode] = useState('');
  const [showCadrePasscode, setShowCadrePasscode] = useState(false);
  const [actualCadrePasscodes, setActualCadrePasscodes] = useState<Record<string, string>>({
    lop_truong: '1234',
    lop_pho_hoc_tap: '1234',
    lop_pho_lao_dong: '1234',
    lop_pho_trat_tu: '1234',
    bi_thu: '1234',
    pho_bi_thu: '1234',
    cadre_general: '1234'
  });

  // Team Leader Passcode State
  const [teamPasscode, setTeamPasscode] = useState('');
  const [showTeamPasscode, setShowTeamPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [primaryClassId, setPrimaryClassId] = useState<string>('class_5A1_3loMHV');
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [isClassLoading, setIsClassLoading] = useState(false);
  const [classPasscodes, setClassPasscodes] = useState<Record<string, string>>({});
  const [hasTeam5, setHasTeam5] = useState(false);
  const [classStudents, setClassStudents] = useState<Student[]>([]);

  // Student selection and search state for 'thanh_vien' role
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentTeamFilter, setStudentTeamFilter] = useState<string>('all');

  // Student credential login
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentLoginLoading, setStudentLoginLoading] = useState(false);

  const [teacherNameInput, setTeacherNameInput] = useState(() => {
    const saved = localStorage.getItem('gvcn_custom_teacher_name');
    if (saved && saved !== 'Cô Nguyễn Mai Lan') return saved;
    return 'Qui Thái Phong';
  });
  const [isEditingTeacherName, setIsEditingTeacherName] = useState(false);

  const applyClass = async (cls: ClassInfo) => {
    setSelectedClass(cls);
    const targetId = cls.classId || cls.id || 'class_5A1_3loMHV';
    setPrimaryClassId(targetId);
    if (cls.className) setClassName(cls.className);
    localStorage.setItem('gvcn_active_class_id', targetId);

    if (cls.teacherName) {
      setTeacherNameInput(cls.teacherName);
      localStorage.setItem('gvcn_custom_teacher_name', cls.teacherName);
    }

    setIsClassLoading(true);

    try {
      // 1. Fetch Students of this specific class (real 11A9 or demo)
      const stdList = await getClassStudents(targetId);
      if (stdList && stdList.length > 0) {
        setClassStudents(stdList);
        setHasTeam5(stdList.some(s => normalizeTeamName(s.teamName) === 'Tổ 5'));
      } else {
        setClassStudents([]);
        setHasTeam5(false);
      }

      // 2. Fetch passcodes in parallel
      const [gvcnCode, cadreCodes, teamCodes] = await Promise.all([
        cls.gvcnPasscode ? Promise.resolve(cls.gvcnPasscode.trim()) : getGvcnPasscode(targetId).catch(() => '8643'),
        cls.cadrePasscodes ? Promise.resolve(cls.cadrePasscodes) : getCadrePasscodes(targetId).catch(() => ({})),
        getClassTeamPasscodes(targetId).catch(() => ({}))
      ]);

      setActualGvcnPasscode(gvcnCode || '8643');
      setActualCadrePasscodes(cadreCodes && Object.keys(cadreCodes).length > 0 ? cadreCodes : {
        lop_truong: '1260',
        lop_pho_hoc_tap: '1260',
        lop_pho_lao_dong: '1260',
        lop_pho_trat_tu: '1260',
        bi_thu: '1260',
        pho_bi_thu: '1260',
        cadre_general: '1260'
      });
      setClassPasscodes(teamCodes || {});
      if (teamCodes && teamCodes['Tổ 5']) {
        setHasTeam5(true);
      }
    } catch (e) {
      console.warn('Error loading class data in login:', e);
    } finally {
      setIsClassLoading(false);
    }
  };

  useEffect(() => {
    async function initClasses() {
      try {
        const list = await getAllClasses();
        const activeList = list.filter(c => c.status !== 'archived');
        setAvailableClasses(activeList);

        // Saved class in localStorage
        const savedClassId = localStorage.getItem('gvcn_active_class_id');
        const savedClass = savedClassId ? activeList.find(c => c.classId === savedClassId) : null;

        // ABSOLUTE PRIORITY:
        // 1. Real class 11A9 (class_5A1_3loMHV)
        // 2. Saved class if it is a real class
        // 3. Any non-demo class
        // 4. Saved class (if user specifically wanted demo)
        // 5. First active class
        const real11A9 = activeList.find(c => c.classId === 'class_5A1_3loMHV');
        const anyReal = activeList.find(c => !c.isDemo && (c.className?.includes('11A9') || c.studentCount === 45));

        const target = real11A9 || anyReal || (savedClass && !savedClass.isDemo ? savedClass : null) || activeList.find(c => !c.isDemo) || savedClass || activeList[0];
        if (target) {
          await applyClass(target);
        }
      } catch (err) {
        console.warn('Init login classes failed:', err);
      }
    }
    initClasses();
  }, []);

  const filteredStudents = React.useMemo(() => {
    let list = classStudents;
    if (studentTeamFilter !== 'all') {
      list = list.filter(s => normalizeTeamName(s.teamName) === studentTeamFilter);
    }
    if (studentSearchTerm.trim()) {
      const q = studentSearchTerm.trim().toLowerCase();
      list = list.filter(s => 
        s.fullName.toLowerCase().includes(q) || 
        (s.studentNumber && String(s.studentNumber).includes(q))
      );
    }
    return list;
  }, [classStudents, studentTeamFilter, studentSearchTerm]);

  const currentRoleCfg = ROLE_CONFIGS[selectedRole] || ROLE_CONFIGS.gvcn;
  const isCadreRole = ['lop_truong', 'lop_pho_hoc_tap', 'lop_pho_lao_dong', 'lop_pho_trat_tu', 'bi_thu', 'pho_bi_thu'].includes(selectedRole);

  const currentSelectedTeamName = selectedRole === 'to_truong_to_1' ? 'Tổ 1'
    : selectedRole === 'to_truong_to_2' ? 'Tổ 2'
    : selectedRole === 'to_truong_to_3' ? 'Tổ 3'
    : selectedRole === 'to_truong_to_4' ? 'Tổ 4'
    : selectedRole === 'to_truong_to_5' ? 'Tổ 5'
    : 'Tổ 1';

  const handleQuickLogin = async () => {
    clearError();
    setPasscodeError(null);

    // 1. Authentication for GVCN (Google Account Linking & Secure Access - Hidden Passcode)
    if (selectedRole === 'gvcn') {
      const finalTeacherName = teacherNameInput.trim() || 'Thầy Phong Qui';
      localStorage.setItem('gvcn_custom_teacher_name', finalTeacherName);
      await updateTeacherDisplayName(finalTeacherName);

      // If user has already linked Google account
      if (isGoogleLinked && (user || localStorage.getItem('gvcn_google_linked') === 'true')) {
        await signInWithSelectedRole('gvcn');
        return;
      }

      // If not yet linked with Google, initiate Google Sign-in to link Google account (1 Google = 1 GVCN)
      try {
        await signInWithGoogle('gvcn');
      } catch (e: any) {
        console.warn('Google sign-in flow:', e);
      }
      return;
    }

    // 2. Passcode validation for Ban cán sự lớp
    if (isCadreRole) {
      const trimmedCadrePasscode = cadrePasscode.trim();
      if (!trimmedCadrePasscode) {
        setPasscodeError(`Vui lòng nhập mã Passcode do GVCN cấp cho ${currentRoleCfg.title}!`);
        return;
      }

      let expectedCadre = actualCadrePasscodes[selectedRole] || actualCadrePasscodes['cadre_general'];
      if (!expectedCadre && primaryClassId) {
        try {
          const cp = await getCadrePasscodes(primaryClassId);
          expectedCadre = cp[selectedRole] || cp['cadre_general'];
        } catch (e) {
          console.warn('Error fetching cadre passcodes:', e);
        }
      }
      if (!expectedCadre && typeof localStorage !== 'undefined') {
        try {
          const cached = JSON.parse(localStorage.getItem(`gvcn_cadre_passcodes_${primaryClassId}`) || '{}');
          expectedCadre = cached[selectedRole] || cached['cadre_general'];
        } catch {}
      }
      expectedCadre = (expectedCadre || '1234').trim();

      if (trimmedCadrePasscode !== expectedCadre) {
        setPasscodeError(`Mã Passcode cho ${currentRoleCfg.title} không chính xác! Vui lòng liên hệ GVCN để nhận mã passcode (mặc định: 1234).`);
        return;
      }
    }

    // 3. Passcode validation when logging in as Team Leader
    if (selectedRole.startsWith('to_truong')) {
      const trimmedPasscode = teamPasscode.trim();
      if (!trimmedPasscode) {
        setPasscodeError(`Vui lòng nhập Pass code do GVCN tạo cho Tổ trưởng ${currentSelectedTeamName}!`);
        return;
      }

      // Check against current passcodes in state, Firestore or localStorage
      let expected = classPasscodes[currentSelectedTeamName];
      if (!expected && primaryClassId) {
        try {
          expected = await getTeamLeaderPasscode(primaryClassId, currentSelectedTeamName);
        } catch (e) {
          console.warn('Error fetching passcode:', e);
        }
      }
      if (!expected && typeof localStorage !== 'undefined') {
        const cached = JSON.parse(localStorage.getItem(`gvcn_passcodes_${primaryClassId}`) || '{}');
        expected = cached[currentSelectedTeamName];
      }
      expected = (expected || '1234').trim();

      if (trimmedPasscode !== expected) {
        setPasscodeError(`Mã Pass code cho Tổ trưởng ${currentSelectedTeamName} không chính xác! Vui lòng nhập đúng mã pass code do Giáo viên chủ nhiệm cấp.`);
        return;
      }
    }

    // Proceed to sign in
    if (isCadreRole) {
      const designatedStudent = classStudents.find(s => s.cadreRole === selectedRole);
      const studentName = designatedStudent ? designatedStudent.fullName : currentRoleCfg.defaultStudentName;
      const studentId = designatedStudent ? designatedStudent.studentId : undefined;
      await signInWithSelectedRole(selectedRole, studentName, studentId);
    } else if (selectedRole.startsWith('to_truong')) {
      const designatedStudent = classStudents.find(s => 
        normalizeTeamName(s.teamName) === currentSelectedTeamName && 
        (s.isTeamLeader || s.teamRole === 'to_truong' || (s as any).role === 'to_truong')
      ) || classStudents.find(s => normalizeTeamName(s.teamName) === currentSelectedTeamName);

      const studentName = designatedStudent ? designatedStudent.fullName : `Tổ trưởng ${currentSelectedTeamName}`;
      const studentId = designatedStudent ? designatedStudent.studentId : undefined;
      await signInWithSelectedRole(selectedRole, studentName, studentId);
    } else {
      const studentName = selectedStudent ? selectedStudent.fullName : (currentRoleCfg.defaultStudentName || 'Học sinh');
      const studentId = selectedStudent ? selectedStudent.studentId : undefined;
      await signInWithSelectedRole(selectedRole, studentName, studentId);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!studentUsername.trim() || !studentPassword.trim()) return;

    try {
      setStudentLoginLoading(true);
      await loginAsStudent(studentUsername.trim(), studentPassword.trim());
    } catch (err) {
      console.error('Student login error:', err);
    } finally {
      setStudentLoginLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (isSignUp) {
      if (!teacherNameInput.trim()) return;
      await signUpWithEmail(email, password, teacherNameInput.trim());
    } else {
      await signInWithEmail(email, password, selectedRole);
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    await signInWithGoogle(selectedRole);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center px-4">
        {/* Brand Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200/50 mb-3">
          <School className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          GVCN SMART CLASS
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600">
          Hệ thống quản lý nề nếp & thi đua 12 tiêu chí tích cực • {className}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-7 px-5 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
          
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* CLASS SELECTOR BAR */}
          <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/50 to-slate-50 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <School className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-900">{selectedClass?.className ? `Lớp ${selectedClass.className}` : 'Lớp 11A9'}</span>
                  {selectedClass?.isDemo ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      🧪 Lớp mẫu Demo 12A1
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      ⭐ Lớp thật chính thức (45 HS)
                    </span>
                  )}
                  {isClassLoading && (
                    <span className="text-[10px] text-indigo-600 font-medium animate-pulse">
                      Đang đồng bộ...
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  GVCN: <strong>{selectedClass?.teacherName || 'Qui Thái Phong'}</strong> • Sĩ số: <strong>{classStudents.length || 45} học sinh</strong> • 4 tổ
                </p>
              </div>
            </div>

            {/* Quick Switch Button or Dropdown */}
            {availableClasses.length > 1 && (
              <div className="relative self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowClassDropdown(!showClassDropdown)}
                  className="px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-[11px] font-bold text-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Chuyển đổi giữa Lớp thật 11A9 và Lớp Demo 12A1"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Đổi lớp ({availableClasses.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showClassDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showClassDropdown && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Chọn lớp hiển thị:
                    </div>
                    {availableClasses.map((cls) => {
                      const isSelected = selectedClass?.classId === cls.classId;
                      return (
                        <button
                          key={cls.classId}
                          type="button"
                          onClick={() => {
                            applyClass(cls);
                            setShowClassDropdown(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-950 font-bold border border-indigo-200'
                              : 'hover:bg-slate-50 text-slate-700 font-medium'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-extrabold">{cls.className}</span>
                              {cls.isDemo ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">Demo</span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">Lớp thật</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
                              GV: {cls.teacherName || 'Qui Thái Phong'} • {cls.studentCount || 45} HS
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 1: ROLE SELECTION */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center text-[11px] font-black">1</span>
                <span>Chọn chức vụ khi đăng nhập:</span>
              </label>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Phân quyền theo lớp
              </span>
            </div>

            {/* 4 Main Role Category Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Role 1: GVCN */}
              <button
                type="button"
                id="role-btn-gvcn"
                onClick={() => {
                  setSelectedRole('gvcn');
                  setPasscodeError(null);
                  if (authMethod === 'student') setAuthMethod('quick');
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedRole === 'gvcn'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">👨‍🏫</span>
                  {selectedRole === 'gvcn' && (
                    <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 mt-2">
                  GVCN lớp
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                  Toàn quyền quản trị & cấp mật mã
                </p>
              </button>

              {/* Role 2: Ban cán sự lớp */}
              <button
                type="button"
                id="role-btn-cadre"
                onClick={() => {
                  if (!isCadreRole) {
                    setSelectedRole('lop_truong');
                  }
                  setPasscodeError(null);
                  if (authMethod === 'student') setAuthMethod('quick');
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  isCadreRole
                    ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">👑</span>
                  {isCadreRole && (
                    <div className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 mt-2">
                  Ban cán sự
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                  Lớp trưởng, Lớp phó nhập nhận xét
                </p>
              </button>

              {/* Role 3: Tổ trưởng */}
              <button
                type="button"
                id="role-btn-to-truong"
                onClick={() => {
                  if (!selectedRole.startsWith('to_truong')) {
                    setSelectedRole('to_truong_to_1');
                  }
                  setPasscodeError(null);
                  if (authMethod === 'student') setAuthMethod('quick');
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedRole.startsWith('to_truong')
                    ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🎖️</span>
                  {selectedRole.startsWith('to_truong') && (
                    <div className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 mt-2">
                  Tổ trưởng
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                  Theo dõi & chấm điểm thi đua tổ
                </p>
              </button>

              {/* Role 4: Học sinh / Thành viên */}
              <button
                type="button"
                id="role-btn-thanh-vien"
                onClick={() => {
                  setSelectedRole('thanh_vien');
                  setPasscodeError(null);
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedRole === 'thanh_vien'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🧑‍🎓</span>
                  {selectedRole === 'thanh_vien' && (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 mt-2">
                  Học sinh
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                  Xem điểm thi đua & xếp hạng tuần
                </p>
              </button>
            </div>

            {/* A. GVCN GOOGLE AUTHENTICATION & SECURITY (PASSCODE FULLY HIDDEN) */}
            {selectedRole === 'gvcn' && (
              <div className="mt-3.5 p-4 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/90 rounded-2xl border-2 border-indigo-200 animate-in fade-in duration-200 space-y-3.5 shadow-xs">
                {/* 1. Header with Google & Security Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                        <span>Liên kết Tài khoản Google GVCN</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          1 Google = 1 GVCN
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Bảo mật cao cấp • Đã ẩn hoàn toàn Passcode để ngăn học sinh xâm nhập
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Google Authentication Status or Action */}
                {isGoogleLinked && (user?.email || googleEmail) ? (
                  <div className="p-3.5 bg-white rounded-xl border-2 border-emerald-300 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {user?.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt="Avatar" 
                            className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover shadow-2xs" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs border border-emerald-300">
                            {(user?.displayName || 'GV')[0]}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{user?.displayName || teacherNameInput || 'Giáo viên'}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Đã xác thực Google
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">{user?.email || googleEmail}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await logout();
                          localStorage.removeItem('gvcn_google_linked');
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-50 border border-slate-200"
                        title="Đăng xuất khỏi tài khoản Google hiện tại"
                      >
                        Đổi tài khoản
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Tài khoản GVCN đã được bảo vệ độc quyền bởi Google</span>
                      </span>
                      <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {user?.email === 'phongthaiqui@gmail.com' ? 'Lớp thật 11A9 & Demo 12A1' : 'Tự động tải Lớp Demo 12A1'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Google Login Call-to-Action Button */}
                    <button
                      type="button"
                      onClick={() => signInWithGoogle('gvcn')}
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-2xl border-2 border-indigo-200 bg-white hover:bg-indigo-50/70 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs hover:border-indigo-400 cursor-pointer group"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span className="text-indigo-950 group-hover:text-indigo-600 font-extrabold">
                        Đăng nhập GVCN bằng Google (Tự động liên kết tài khoản)
                      </span>
                    </button>

                    {/* Explanatory security callout */}
                    <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 space-y-1.5 font-medium">
                      <div className="flex items-start gap-1.5 text-indigo-950 font-bold">
                        <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <span>Cơ chế bảo mật chống học sinh xâm nhập:</span>
                      </div>
                      <p className="text-slate-600 pl-5">
                        • <strong>1 Google = 1 GVCN:</strong> Mỗi tài khoản Google chỉ được liên kết và quản lý duy nhất 1 tài khoản GVCN.
                      </p>
                      <p className="text-slate-600 pl-5">
                        • <strong>Đã ẩn Passcode hoàn toàn:</strong> Học sinh không có tài khoản Google của Giáo viên sẽ không thể vào tài khoản GVCN.
                      </p>
                    </div>

                    {/* Quick Demo Preview Option for evaluations */}
                    <div className="pt-2 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Dành cho thẩm định / Đánh giá nhanh:
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const demoName = teacherNameInput.trim() || 'Thầy Phong Qui';
                          localStorage.setItem('gvcn_custom_teacher_name', demoName);
                          await updateTeacherDisplayName(demoName);
                          await signInAsTeacher(demoName);
                        }}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
                      >
                        Khám phá Lớp Demo 12A1 (4 tổ, 14 tiêu chí)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B. BAN CÁN SỰ LỚP SUB-SELECTOR & PASSCODE */}
            {isCadreRole && (
              <div className="mt-3.5 p-3.5 bg-sky-50/90 rounded-2xl border-2 border-sky-300 animate-in fade-in duration-200 space-y-3">
                <div>
                  <p className="text-xs font-bold text-sky-950 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-sky-600" />
                      <span>Chọn chức vụ Ban cán sự để nhập nhận xét:</span>
                    </span>
                    <span className="text-[10px] text-sky-700 font-bold bg-white px-2 py-0.5 rounded-full border border-sky-200">
                      Nhận xét tuần
                    </span>
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'lop_truong' as AppLoginRole, name: 'Lớp trưởng', icon: '👑', desc: 'Nhận xét chung' },
                      { id: 'lop_pho_hoc_tap' as AppLoginRole, name: 'LP Học tập', icon: '📚', desc: 'Nhận xét học tập' },
                      { id: 'lop_pho_lao_dong' as AppLoginRole, name: 'LP Lao động', icon: '🧹', desc: 'Vệ sinh & trực nhật' },
                      { id: 'lop_pho_trat_tu' as AppLoginRole, name: 'LP Trật tự', icon: '🛡️', desc: 'Kỷ luật & nề nếp' },
                      { id: 'bi_thu' as AppLoginRole, name: 'Bí thư', icon: '⭐', desc: 'Hoạt động Đoàn/Đội' },
                      { id: 'pho_bi_thu' as AppLoginRole, name: 'Phó Bí thư', icon: '✨', desc: 'Hỗ trợ phong trào' },
                    ].map((c) => {
                      const cadreStudent = classStudents.find(s => s.cadreRole === c.id);
                      const studentLabel = cadreStudent ? cadreStudent.fullName : c.name;
                      const isSelected = selectedRole === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedRole(c.id);
                            setPasscodeError(null);
                          }}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                              : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-100/60'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{c.icon}</span>
                            <span className="text-xs font-bold">{c.name}</span>
                          </div>
                          <span className={`block text-[10px] truncate mt-0.5 ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                            {studentLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MANDATORY CADRE PASSCODE INPUT */}
                <div className="pt-2.5 border-t border-sky-200/90">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-sky-700" />
                      <span>Nhập Passcode Ban cán sự ({currentRoleCfg.title}):</span>
                    </label>
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-100/90 px-2 py-0.5 rounded-full border border-sky-300">
                      Do GVCN cấp
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-sky-600 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showCadrePasscode ? "text" : "password"}
                      value={cadrePasscode}
                      onChange={(e) => {
                        setCadrePasscode(e.target.value);
                        setPasscodeError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickLogin();
                        }
                      }}
                      placeholder={`Nhập passcode của ${currentRoleCfg.title}...`}
                      maxLength={12}
                      className={`w-full pl-9 pr-14 py-2 border-2 rounded-xl text-sm font-mono tracking-wider font-bold transition-all focus:outline-none focus:ring-2 ${
                        passcodeError
                          ? 'border-rose-400 bg-rose-50/70 text-rose-900 focus:ring-rose-500/20'
                          : 'border-sky-300 bg-white text-slate-900 focus:border-sky-600 focus:ring-sky-500/20 shadow-xs'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCadrePasscode(!showCadrePasscode)}
                      className="absolute right-2.5 top-2 text-xs font-semibold text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded cursor-pointer"
                      title={showCadrePasscode ? "Ẩn pass code" : "Hiện pass code"}
                    >
                      {showCadrePasscode ? (
                        <EyeOff className="w-4 h-4 text-slate-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </div>

                  {passcodeError ? (
                    <div className="mt-2 p-2 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-[11px] font-bold flex items-start gap-1.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                      <span>{passcodeError}</span>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-sky-900/90 leading-relaxed font-medium">
                      🔒 Ban cán sự lớp dùng mã passcode do GVCN thiết lập để đăng nhập vào ghi nhận và nhập nhận xét nề nếp tuần.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* C. TỔ TRƯỞNG SUB-SELECTOR & PASSCODE */}
            {selectedRole.startsWith('to_truong') && (
              <div className="mt-3.5 p-3.5 bg-amber-50/90 rounded-2xl border-2 border-amber-300 animate-in fade-in duration-200 space-y-3">
                <div>
                  <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>Chọn tổ của bạn:</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'to_truong_to_1' as AppLoginRole, name: 'Tổ 1' },
                      { id: 'to_truong_to_2' as AppLoginRole, name: 'Tổ 2' },
                      { id: 'to_truong_to_3' as AppLoginRole, name: 'Tổ 3' },
                      { id: 'to_truong_to_4' as AppLoginRole, name: 'Tổ 4' },
                      ...(hasTeam5 ? [{ id: 'to_truong_to_5' as AppLoginRole, name: 'Tổ 5' }] : [])
                    ].map((t) => {
                      const leader = classStudents.find(s => 
                        normalizeTeamName(s.teamName) === t.name && 
                        (s.isTeamLeader || s.teamRole === 'to_truong' || (s as any).role === 'to_truong')
                      );
                      const leaderLabel = leader ? leader.fullName : `Tổ trưởng ${t.name}`;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedRole(t.id);
                            setPasscodeError(null);
                          }}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                            selectedRole === t.id
                              ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                              : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                          }`}
                        >
                          <span className="block text-xs font-bold">{t.name}</span>
                          <span className={`block text-[10px] truncate ${selectedRole === t.id ? 'text-amber-100' : 'text-slate-500'}`}>
                            {leaderLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MANDATORY TEAM PASSCODE INPUT */}
                <div className="pt-2.5 border-t border-amber-200/90">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-700" />
                      <span>Nhập Pass code của Tổ trưởng {currentSelectedTeamName}:</span>
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                      Do GVCN phân quyền
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-amber-600 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showTeamPasscode ? "text" : "password"}
                      value={teamPasscode}
                      onChange={(e) => {
                        setTeamPasscode(e.target.value);
                        setPasscodeError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickLogin();
                        }
                      }}
                      placeholder={`Nhập mã pass code của ${currentSelectedTeamName}...`}
                      maxLength={10}
                      className={`w-full pl-9 pr-14 py-2 border-2 rounded-xl text-sm font-mono tracking-wider font-bold transition-all focus:outline-none focus:ring-2 ${
                        passcodeError
                          ? 'border-rose-400 bg-rose-50/70 text-rose-900 focus:ring-rose-500/20'
                          : 'border-amber-300 bg-white text-slate-900 focus:border-amber-600 focus:ring-amber-500/20 shadow-xs'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTeamPasscode(!showTeamPasscode)}
                      className="absolute right-2.5 top-2 text-xs font-semibold text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded cursor-pointer"
                      title={showTeamPasscode ? "Ẩn pass code" : "Hiện pass code"}
                    >
                      {showTeamPasscode ? (
                        <EyeOff className="w-4 h-4 text-slate-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </div>

                  {passcodeError ? (
                    <div className="mt-2 p-2 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-[11px] font-bold flex items-start gap-1.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                      <span>{passcodeError}</span>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-amber-900/90 leading-relaxed font-medium">
                      🔒 Chỉ học sinh giữ vai trò <strong>Tổ trưởng {currentSelectedTeamName}</strong> được GVCN cấp mã pass code mới có thể đăng nhập vào chấm điểm thi đua.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* D. HỌC SINH / THÀNH VIÊN - DANH SÁCH HỌC SINH LỚP THẬT (TRA CỨU & XEM ĐIỂM) */}
            {selectedRole === 'thanh_vien' && (
              <div className="mt-3.5 p-4 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/90 rounded-2xl border-2 border-emerald-300 animate-in fade-in duration-200 space-y-3.5 shadow-xs">
                {/* Header with Title and Mode switch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <span>Danh sách Học sinh {selectedClass?.className ? `Lớp ${selectedClass.className}` : 'Lớp 11A9'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          {classStudents.length} học sinh
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Chọn tên học sinh để vào xem điểm thi đua cá nhân & xếp hạng tuần
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAuthMethod(authMethod === 'student' ? 'quick' : 'student')}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{authMethod === 'student' ? 'Đóng nhập mã nick' : 'Đăng nhập mã nick / mật khẩu'}</span>
                  </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm học sinh theo họ tên hoặc số thứ tự..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  {/* Team Filter */}
                  <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {['all', 'Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4', ...(hasTeam5 ? ['Tổ 5'] : [])].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setStudentTeamFilter(t)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                          studentTeamFilter === t
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {t === 'all' ? 'Tất cả tổ' : t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Student list grid with scroll */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-emerald-50">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Không tìm thấy học sinh nào phù hợp trong {selectedClass?.className || 'lớp'}.
                    </div>
                  ) : (
                    filteredStudents.map((std, idx) => {
                      const isSelected = selectedStudent?.studentId === std.studentId;
                      const isCadre = std.cadreRole && std.cadreRole !== 'none';
                      const isLeader = std.isTeamLeader || std.teamRole === 'to_truong';
                      
                      return (
                        <div
                          key={std.studentId}
                          onClick={() => setSelectedStudent(std)}
                          className={`p-2 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                            isSelected
                              ? 'bg-emerald-100/90 border-emerald-500 shadow-2xs ring-1 ring-emerald-500/20'
                              : 'bg-white/80 hover:bg-emerald-50/70 border-emerald-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0">
                              {std.studentNumber || idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">{std.fullName}</span>
                                {isCadre && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-200">
                                    👑 {ROLE_CONFIGS[std.cadreRole as AppLoginRole]?.title || 'Ban cán sự'}
                                  </span>
                                )}
                                {isLeader && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    🎖️ Tổ trưởng
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {std.teamName || 'Thành viên'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isSelected ? (
                              <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-300">
                                Đã chọn ✓
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 px-2 py-0.5 rounded hover:bg-emerald-100/60"
                              >
                                Chọn xem điểm
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedStudent ? (
                  <div className="p-2.5 bg-emerald-100/70 rounded-xl border border-emerald-300 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5 truncate">
                      <span>Đang chọn:</span>
                      <strong className="text-emerald-800 underline truncate">{selectedStudent.fullName}</strong>
                      <span className="text-[10px] text-slate-500 shrink-0">({selectedStudent.teamName})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin()}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <span>Vào xem điểm ngay</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-800 font-medium text-center">
                    💡 Nhấp vào tên của bạn trong danh sách trên để xem điểm cá nhân, hoặc nhấn nút dưới để vào chế độ chung.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: LOGIN ACTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center text-[11px] font-black">2</span>
                <span>Phương thức đăng nhập:</span>
              </label>

              {/* Method toggles */}
              <div className="flex p-0.5 bg-slate-100 rounded-xl text-[11px] font-semibold text-slate-600">
                <button
                  type="button"
                  id="tab-method-quick"
                  onClick={() => setAuthMethod('quick')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    authMethod === 'quick' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Nhanh 1 chạm
                </button>
                <button
                  type="button"
                  id="tab-method-student"
                  onClick={() => setAuthMethod('student')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    authMethod === 'student' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Tài khoản HS
                </button>
                <button
                  type="button"
                  id="tab-method-email"
                  onClick={() => setAuthMethod('email')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    authMethod === 'email' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  id="tab-method-google"
                  onClick={() => setAuthMethod('google')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    authMethod === 'google' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Google
                </button>
              </div>
            </div>

            {/* Quick 1-tap button */}
            {authMethod === 'quick' && (
              <div className="space-y-3">
                <button
                  id="btn-login-selected-role"
                  type="button"
                  onClick={handleQuickLogin}
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-sm font-bold text-white shadow-md transition-all transform active:scale-98 cursor-pointer ${
                    selectedRole === 'gvcn'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-300/40'
                      : isCadreRole
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sky-300/40'
                      : selectedRole.startsWith('to_truong')
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-300/40'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-300/40'
                  }`}
                >
                  {selectedRole === 'gvcn' ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-indigo-100" />
                      <span>{isGoogleLinked ? 'Tiếp tục vào trang Quản lý GVCN (Google)' : 'Đăng nhập GVCN bằng Google'}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : isCadreRole ? (
                    <>
                      <Lock className="w-4 h-4 text-sky-100" />
                      <span>
                        Xác nhận Passcode & Đăng nhập: <strong>{currentRoleCfg.title}</strong>
                      </span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : selectedRole.startsWith('to_truong') ? (
                    <>
                      <Lock className="w-4 h-4 text-amber-100" />
                      <span>
                        Xác nhận Passcode & Đăng nhập: <strong>{currentRoleCfg.title}</strong>
                      </span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-200 fill-emerald-200" />
                      <span>
                        {selectedStudent 
                          ? `Vào xem điểm: ${selectedStudent.fullName}` 
                          : `Vào xem điểm & Xếp hạng: ${currentRoleCfg.title}`}
                      </span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-slate-500 font-medium">
                  {selectedRole === 'gvcn'
                    ? '🔒 Bảo mật tài khoản GVCN bằng Google Account • Đã ẩn Passcode để ngăn học sinh truy cập'
                    : isCadreRole
                    ? '🔒 Yêu cầu Passcode Ban cán sự lớp do GVCN cấp để vào nhập nhận xét nề nếp tuần'
                    : selectedRole.startsWith('to_truong')
                    ? '🔒 Yêu cầu Passcode Tổ trưởng do GVCN cấp để truy cập quyền chấm điểm thi đua'
                    : '⚡ Chế độ xem dành cho học sinh, vào thẳng không cần mật khẩu'}
                </p>
              </div>
            )}

            {/* Student Credential Form */}
            {authMethod === 'student' && (
              <form onSubmit={handleStudentSubmit} className="space-y-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 animate-fade-in">
                <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Dành cho học sinh đăng nhập bằng tài khoản do GVCN cấp</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên đăng nhập (hoặc Mã học sinh)
                  </label>
                  <input
                    type="text"
                    required
                    value={studentUsername}
                    onChange={(e) => setStudentUsername(e.target.value)}
                    placeholder="VD: hs.nguyenvana hoặc 11A9_01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu học sinh
                  </label>
                  <input
                    type="password"
                    required
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="Mật khẩu 6 số do GVCN cấp..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={studentLoginLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {studentLoginLoading ? (
                    <span>Đang xác thực...</span>
                  ) : (
                    <>
                      <span>Đăng nhập tài khoản học sinh</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Email form */}
            {authMethod === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-fade-in">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên Giáo viên
                    </label>
                    <input
                      type="text"
                      required
                      value={teacherNameInput}
                      onChange={(e) => setTeacherNameInput(e.target.value)}
                      placeholder="Thầy Phong Qui"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="giaovien@gmail.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    {isSignUp ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    {isSignUp ? 'Đăng ký ngay' : 'Đăng nhập Email'}
                  </button>
                </div>
              </form>
            )}

            {/* Google Login button */}
            {authMethod === 'google' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3 animate-fade-in">
                <p className="text-xs text-slate-600 font-medium">
                  Đăng nhập đồng bộ tài khoản Google Workspace hoặc Gmail cá nhân
                </p>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Tiếp tục với Google</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <span>Phiên bản v2.6.0 • Quản lý nề nếp thi đua tích cực</span>
            <span className="font-semibold text-indigo-600">Được tối ưu cho GVCN & Ban cán sự</span>
          </div>
        </div>
      </div>
    </div>
  );
};
