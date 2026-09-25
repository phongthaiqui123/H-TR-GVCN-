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
  Star
} from 'lucide-react';
import { AppLoginRole, Student, ClassCadreRole } from '../types';
import { 
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
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithSelectedRole,
    loginAsStudent,
    updateTeacherDisplayName,
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
  const [primaryClassId, setPrimaryClassId] = useState<string>('primary_class');
  const [classPasscodes, setClassPasscodes] = useState<Record<string, string>>({});
  const [hasTeam5, setHasTeam5] = useState(false);
  const [classStudents, setClassStudents] = useState<Student[]>([]);

  // Student credential login
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentLoginLoading, setStudentLoginLoading] = useState(false);

  const [teacherNameInput, setTeacherNameInput] = useState(() => {
    const saved = localStorage.getItem('gvcn_custom_teacher_name');
    if (saved && saved !== 'Cô Nguyễn Mai Lan') return saved;
    return 'Thầy Phong Qui';
  });
  const [isEditingTeacherName, setIsEditingTeacherName] = useState(false);

  useEffect(() => {
    getPrimaryClass().then((cls) => {
      if (cls) {
        const targetId = cls.classId || cls.id || 'primary_class';
        setPrimaryClassId(targetId);
        if (cls.className) setClassName(cls.className);
        if (cls.teacherName && !localStorage.getItem('gvcn_custom_teacher_name')) {
          setTeacherNameInput(cls.teacherName);
        }

        // Fetch GVCN passcode
        if (cls.gvcnPasscode) {
          setActualGvcnPasscode(cls.gvcnPasscode.trim());
        } else {
          getGvcnPasscode(targetId).then(code => setActualGvcnPasscode(code.trim())).catch(console.warn);
        }

        // Fetch Cadre passcodes
        if (cls.cadrePasscodes) {
          setActualCadrePasscodes(cls.cadrePasscodes);
        } else {
          getCadrePasscodes(targetId).then(cp => setActualCadrePasscodes(cp)).catch(console.warn);
        }

        // Fetch Team passcodes
        getClassTeamPasscodes(targetId).then(passcodes => {
          setClassPasscodes(passcodes);
          if (passcodes['Tổ 5']) {
            setHasTeam5(true);
          }
        }).catch(console.warn);

        getClassStudents(targetId).then(stdList => {
          if (stdList && stdList.length > 0) {
            setClassStudents(stdList);
            if (stdList.some(s => normalizeTeamName(s.teamName) === 'Tổ 5')) {
              setHasTeam5(true);
            }
          }
        }).catch(console.warn);
      }
    }).catch(console.warn);
  }, []);

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

    // 1. Passcode validation for GVCN
    if (selectedRole === 'gvcn') {
      const trimmedGvcnPasscode = gvcnPasscode.trim();
      if (!trimmedGvcnPasscode) {
        setPasscodeError('Vui lòng nhập Passcode bảo vệ tài khoản Giáo viên chủ nhiệm!');
        return;
      }

      let expectedGvcn = actualGvcnPasscode;
      if (!expectedGvcn && primaryClassId) {
        try {
          expectedGvcn = await getGvcnPasscode(primaryClassId);
        } catch (e) {
          console.warn('Error fetching GVCN passcode:', e);
        }
      }
      if (!expectedGvcn && typeof localStorage !== 'undefined') {
        expectedGvcn = localStorage.getItem(`gvcn_passcode_${primaryClassId}`) || '1234';
      }
      expectedGvcn = (expectedGvcn || '1234').trim();

      if (trimmedGvcnPasscode !== expectedGvcn) {
        setPasscodeError('Mã Passcode GVCN không chính xác! Vui lòng nhập đúng mã passcode (mặc định: 1234).');
        return;
      }
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
    if (selectedRole === 'gvcn') {
      const finalTeacherName = teacherNameInput.trim() || 'Thầy Phong Qui';
      localStorage.setItem('gvcn_custom_teacher_name', finalTeacherName);
      await updateTeacherDisplayName(finalTeacherName);
      await signInWithSelectedRole(selectedRole, finalTeacherName);
    } else if (isCadreRole) {
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
      await signInWithSelectedRole(selectedRole, currentRoleCfg.defaultStudentName || 'Học sinh');
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

            {/* A. GVCN INFO & PASSCODE INPUT */}
            {selectedRole === 'gvcn' && (
              <div className="mt-3.5 p-3.5 bg-indigo-50/80 rounded-2xl border-2 border-indigo-200 animate-in fade-in duration-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">GVCN:</span>
                    {isEditingTeacherName ? (
                      <input
                        type="text"
                        value={teacherNameInput}
                        onChange={(e) => setTeacherNameInput(e.target.value)}
                        placeholder="Thầy Phong Qui"
                        className="px-2.5 py-1 text-xs font-bold text-slate-900 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                        {teacherNameInput || 'Thầy Phong Qui'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Lớp:</span>
                    <span className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {className || 'Lớp của Thầy/Cô'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingTeacherName) {
                          localStorage.setItem('gvcn_custom_teacher_name', teacherNameInput.trim());
                        }
                        setIsEditingTeacherName(!isEditingTeacherName);
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer ml-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingTeacherName ? 'Xong' : 'Sửa'}</span>
                    </button>
                  </div>
                </div>

                {/* MANDATORY GVCN PASSCODE INPUT */}
                <div className="pt-2.5 border-t border-indigo-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      <span>Nhập Passcode bảo mật tài khoản GVCN:</span>
                    </label>
                    <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                      Bảo vệ quyền GVCN
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-indigo-600 pointer-events-none">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showGvcnPasscode ? "text" : "password"}
                      value={gvcnPasscode}
                      onChange={(e) => {
                        setGvcnPasscode(e.target.value);
                        setPasscodeError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickLogin();
                        }
                      }}
                      placeholder="Nhập mã passcode GVCN (mặc định: 1234)..."
                      maxLength={15}
                      className={`w-full pl-9 pr-14 py-2 border-2 rounded-xl text-sm font-mono tracking-wider font-bold transition-all focus:outline-none focus:ring-2 ${
                        passcodeError
                          ? 'border-rose-400 bg-rose-50/70 text-rose-900 focus:ring-rose-500/20'
                          : 'border-indigo-300 bg-white text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20 shadow-xs'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGvcnPasscode(!showGvcnPasscode)}
                      className="absolute right-2.5 top-2 text-xs font-semibold text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded cursor-pointer"
                      title={showGvcnPasscode ? "Ẩn pass code" : "Hiện pass code"}
                    >
                      {showGvcnPasscode ? (
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
                    <p className="mt-1.5 text-[11px] text-indigo-900/90 leading-relaxed font-medium">
                      🔒 Tài khoản GVCN được bảo vệ bằng passcode riêng để tránh học sinh tự ý truy cập quyền quản trị lớp.
                    </p>
                  )}
                </div>
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

            {/* D. HỌC SINH / THÀNH VIÊN INFO (ẨN HOÀN TOÀN MÃ PASSCODE) */}
            {selectedRole === 'thanh_vien' && (
              <div className="mt-3.5 p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-emerald-950 text-xs sm:text-sm">Chế độ xem dành cho học sinh</h5>
                    <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                      Bạn có thể xem ngay điểm thi đua cá nhân, bảng xếp hạng tuần và nhận xét của ban cán sự ở chế độ đọc an toàn.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthMethod('student')}
                  className="px-3 py-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer shadow-xs"
                >
                  Đăng nhập mã nick
                </button>
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
                      <Lock className="w-4 h-4 text-indigo-100" />
                      <span>Xác nhận Passcode & Đăng nhập GVCN</span>
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
                        Vào xem điểm & Xếp hạng: <strong>{currentRoleCfg.title}</strong>
                      </span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-slate-500 font-medium">
                  {selectedRole === 'gvcn'
                    ? '🔒 Yêu cầu nhập đúng Passcode GVCN để truy cập toàn quyền quản trị'
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
