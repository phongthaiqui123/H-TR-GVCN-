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
  User
} from 'lucide-react';
import { AppLoginRole, Student } from '../types';
import { getPrimaryClass, getClassTeamPasscodes, getTeamLeaderPasscode, getClassStudents } from '../services/firestoreService';
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

  const currentSelectedTeamName = selectedRole === 'to_truong_to_1' ? 'Tổ 1'
    : selectedRole === 'to_truong_to_2' ? 'Tổ 2'
    : selectedRole === 'to_truong_to_3' ? 'Tổ 3'
    : selectedRole === 'to_truong_to_4' ? 'Tổ 4'
    : selectedRole === 'to_truong_to_5' ? 'Tổ 5'
    : 'Tổ 1';

  const handleQuickLogin = async () => {
    clearError();
    setPasscodeError(null);

    // Passcode validation when logging in as Team Leader
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

    if (selectedRole === 'gvcn' && teacherNameInput.trim()) {
      localStorage.setItem('gvcn_custom_teacher_name', teacherNameInput.trim());
      await updateTeacherDisplayName(teacherNameInput.trim());
      await signInWithSelectedRole(selectedRole, teacherNameInput.trim());
    } else if (selectedRole.startsWith('to_truong')) {
      const designatedStudent = classStudents.find(s => 
        normalizeTeamName(s.teamName) === currentSelectedTeamName && 
        (s.isTeamLeader || s.teamRole === 'to_truong' || (s as any).role === 'to_truong')
      ) || classStudents.find(s => normalizeTeamName(s.teamName) === currentSelectedTeamName);

      const studentName = designatedStudent ? designatedStudent.fullName : `Tổ trưởng ${currentSelectedTeamName}`;
      const studentId = designatedStudent ? designatedStudent.studentId : undefined;
      await signInWithSelectedRole(selectedRole, studentName, studentId);
    } else {
      await signInWithSelectedRole(selectedRole, currentRoleCfg.defaultStudentName);
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

            {/* 3 Main Role Category Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Role 1: GVCN */}
              <button
                type="button"
                id="role-btn-gvcn"
                onClick={() => {
                  setSelectedRole('gvcn');
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
                  Giáo viên chủ nhiệm
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  Toàn quyền quản lý, cấp tài khoản học sinh & tổng kết
                </p>
              </button>

              {/* Role 2: Tổ trưởng */}
              <button
                type="button"
                id="role-btn-to-truong"
                onClick={() => {
                  if (!selectedRole.startsWith('to_truong')) {
                    setSelectedRole('to_truong_to_1');
                  }
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
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  Phân quyền theo dõi & chấm thi đua các bạn trong tổ
                </p>
              </button>

              {/* Role 3: Học sinh / Thành viên */}
              <button
                type="button"
                id="role-btn-thanh-vien"
                onClick={() => setSelectedRole('thanh_vien')}
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
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  Xem điểm thi đua, cá nhân & bảng xếp hạng tuần
                </p>
              </button>
            </div>

            {/* Sub-selector & Pass code if "Tổ trưởng" is chosen */}
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

                {/* PASS CODE INPUT FIELD */}
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

            {/* Teacher Name & Class confirmation if GVCN is chosen */}
            {selectedRole === 'gvcn' && (
              <div className="mt-3.5 p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 animate-in fade-in duration-200 space-y-2">
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
                <div className="flex items-center gap-2 text-[11px] text-indigo-900 font-medium">
                  <span className="text-slate-500">Tài khoản:</span>
                  <code className="px-1.5 py-0.5 bg-white rounded border border-indigo-200 font-mono font-bold text-indigo-600">
                    gvcn.{className.toLowerCase().replace(/[^a-z0-9]/g, '') || 'lop'}
                  </code>
                  <span className="text-slate-400">• Đồng bộ theo thực tế lớp</span>
                </div>
              </div>
            )}

            {/* Student info if Thành viên is chosen */}
            {selectedRole === 'thanh_vien' && (
              <div className="mt-3.5 p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center justify-between gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Học sinh có thể đăng nhập bằng <strong>Mã tài khoản do GVCN cấp</strong> hoặc vào nhanh 1 chạm.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthMethod('student')}
                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  Nhập mã nick
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
                      : selectedRole.startsWith('to_truong')
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-300/40'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-300/40'
                  }`}
                >
                  {selectedRole.startsWith('to_truong') ? (
                    <>
                      <Lock className="w-4 h-4 text-amber-100" />
                      <span>
                        Xác nhận Pass code & Đăng nhập: <strong>{currentRoleCfg.title}</strong>
                      </span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200 fill-amber-200" />
                      <span>
                        Đăng nhập ngay với chức vụ: <strong>{currentRoleCfg.title}</strong>
                      </span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-slate-500 font-medium">
                  {selectedRole.startsWith('to_truong')
                    ? '🔒 Tổ trưởng cần nhập đúng pass code do GVCN thiết lập để truy cập quyền chấm điểm thi đua'
                    : '⚡ Vào thẳng trang làm việc ngay, không cần ghi nhớ mật khẩu'}
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
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={studentUsername}
                      onChange={(e) => setStudentUsername(e.target.value)}
                      placeholder="Ví dụ: 11a9_01 hoặc hs01"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder="Mặc định: 123456"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  id="btn-submit-student-login"
                  type="submit"
                  disabled={studentLoginLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{studentLoginLoading ? 'Đang xác thực...' : 'Đăng nhập vào lớp'}</span>
                </button>

                <p className="text-[11px] text-center text-slate-500 pt-1">
                  💡 Tổ trưởng đăng nhập bằng tài khoản này sẽ tự động nhận quyền chấm điểm Tổ.
                </p>
              </form>
            )}

            {/* Google Login with Selected Role */}
            {authMethod === 'google' && (
              <div className="space-y-3">
                <button
                  id="btn-google-login"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold transition-all shadow-xs cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  <span>Đăng nhập Google với vai trò: {currentRoleCfg.title}</span>
                </button>
              </div>
            )}

            {/* Email Password Form with Selected Role */}
            {authMethod === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      required
                      value={teacherNameInput}
                      onChange={(e) => setTeacherNameInput(e.target.value)}
                      placeholder="Thầy Phong Qui"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
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
                    placeholder="user@smartclass.edu.vn"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
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
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>

                <button
                  id="btn-submit-auth"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer mt-2"
                >
                  {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{isSignUp ? 'Tạo tài khoản' : `Đăng nhập vai trò ${currentRoleCfg.title}`}</span>
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      clearError();
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                  >
                    {isSignUp 
                      ? 'Đã có tài khoản? Đăng nhập ngay' 
                      : 'Chưa có tài khoản? Đăng ký tài khoản mới'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Phân quyền bảo mật: Tổ trưởng chỉ chấm tổ mình • GVCN toàn quyền</span>
          </div>
        </div>
      </div>
    </div>
  );
};
