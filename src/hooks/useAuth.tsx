import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  fbSignOut, 
  onAuthStateChanged,
  FirebaseUser,
  updateProfile
} from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile, AppLoginRole, RoleSessionInfo, ClassCadreRole } from '../types';
import { cleanFirestoreData, findStudentAccountByUsername } from '../services/firestoreService';

export const ROLE_CONFIGS: Record<AppLoginRole, {
  title: string;
  badge: string;
  category: 'gvcn' | 'to_truong' | 'cadre' | 'thanh_vien';
  cadreRole?: ClassCadreRole;
  teamName?: string;
  defaultStudentName?: string;
  defaultStudentId?: string;
  canGrade: boolean;
  canManageClass: boolean;
  description: string;
}> = {
  gvcn: {
    title: 'Giáo viên chủ nhiệm (GVCN)',
    badge: 'Toàn quyền lớp & Chấm 4 tổ',
    category: 'gvcn',
    canGrade: true,
    canManageClass: true,
    description: 'Toàn quyền quản lý lớp, chấm điểm thi đua cả 4 tổ, phân quyền cán sự, xuất báo cáo & đổi tên GVCN.'
  },
  lop_truong: {
    title: 'Lớp trưởng',
    badge: 'Ban cán sự lớp • Nhận xét chung',
    category: 'cadre',
    cadreRole: 'lop_truong',
    defaultStudentName: 'Lớp trưởng',
    canGrade: true,
    canManageClass: false,
    description: 'Ban cán sự lớp: Báo cáo nhận xét chung về nề nếp thi đua toàn lớp trong tuần và phương hướng phấn đấu tuần tới.'
  },
  lop_pho_hoc_tap: {
    title: 'Lớp phó Học tập',
    badge: 'Ban cán sự • Nhận xét học tập',
    category: 'cadre',
    cadreRole: 'lop_pho_hoc_tap',
    defaultStudentName: 'Lớp phó Học tập',
    canGrade: true,
    canManageClass: false,
    description: 'Ban cán sự lớp: Theo dõi, ghi nhận và nhận xét tình hình học tập, bài tập về nhà của lớp trong tuần.'
  },
  lop_pho_lao_dong: {
    title: 'Lớp phó Lao động & Vệ sinh',
    badge: 'Ban cán sự • Nhận xét vệ sinh',
    category: 'cadre',
    cadreRole: 'lop_pho_lao_dong',
    defaultStudentName: 'Lớp phó Lao động',
    canGrade: true,
    canManageClass: false,
    description: 'Ban cán sự lớp: Theo dõi, đánh giá công tác trực nhật, vệ sinh phòng học và bảo quản tài sản lớp.'
  },
  lop_pho_trat_tu: {
    title: 'Lớp phó Trật tự & Nề nếp',
    badge: 'Ban cán sự • Nhận xét kỷ luật',
    category: 'cadre',
    cadreRole: 'lop_pho_trat_tu',
    defaultStudentName: 'Lớp phó Trật tự',
    canGrade: true,
    canManageClass: false,
    description: 'Ban cán sự lớp: Theo dõi trật tự 15 phút đầu giờ, chuyên cần và kỷ luật chung.'
  },
  bi_thu: {
    title: 'Bí thư Chi đoàn',
    badge: 'Ban cán sự • Nhận xét phong trào',
    category: 'cadre',
    cadreRole: 'bi_thu',
    defaultStudentName: 'Bí thư Chi đoàn',
    canGrade: true,
    canManageClass: false,
    description: 'Ban cán sự lớp: Đánh giá các hoạt động phong trào Đoàn - Đội và hoạt động ngoại khóa.'
  },
  pho_bi_thu: {
    title: 'Phó Bí thư Chi đoàn',
    badge: 'Ban cán sự • Hỗ trợ phong trào',
    category: 'cadre',
    cadreRole: 'pho_bi_thu',
    defaultStudentName: 'Phó Bí thư',
    canGrade: true,
    canManageClass: false,
    description: 'Ban cán sự lớp: Hỗ trợ theo dõi các hoạt động phong trào, Đoàn - Đội và nề nếp lớp.'
  },
  to_truong_to_1: {
    title: 'Tổ trưởng Tổ 1',
    badge: 'Chấm thi đua Tổ 1',
    category: 'to_truong',
    teamName: 'Tổ 1',
    defaultStudentName: '',
    canGrade: true,
    canManageClass: false,
    description: 'Được GVCN phân quyền theo dõi và chấm thi đua cho các thành viên thuộc Tổ 1.'
  },
  to_truong_to_2: {
    title: 'Tổ trưởng Tổ 2',
    badge: 'Chấm thi đua Tổ 2',
    category: 'to_truong',
    teamName: 'Tổ 2',
    defaultStudentName: '',
    canGrade: true,
    canManageClass: false,
    description: 'Được GVCN phân quyền theo dõi và chấm thi đua cho các thành viên thuộc Tổ 2.'
  },
  to_truong_to_3: {
    title: 'Tổ trưởng Tổ 3',
    badge: 'Chấm thi đua Tổ 3',
    category: 'to_truong',
    teamName: 'Tổ 3',
    defaultStudentName: '',
    canGrade: true,
    canManageClass: false,
    description: 'Được GVCN phân quyền theo dõi và chấm thi đua cho các thành viên thuộc Tổ 3.'
  },
  to_truong_to_4: {
    title: 'Tổ trưởng Tổ 4',
    badge: 'Chấm thi đua Tổ 4',
    category: 'to_truong',
    teamName: 'Tổ 4',
    defaultStudentName: '',
    canGrade: true,
    canManageClass: false,
    description: 'Được GVCN phân quyền theo dõi và chấm thi đua cho các thành viên thuộc Tổ 4.'
  },
  to_truong_to_5: {
    title: 'Tổ trưởng Tổ 5',
    badge: 'Chấm thi đua Tổ 5',
    category: 'to_truong',
    teamName: 'Tổ 5',
    defaultStudentName: '',
    canGrade: true,
    canManageClass: false,
    description: 'Được GVCN phân quyền theo dõi và chấm thi đua cho các thành viên thuộc Tổ 5.'
  },
  thanh_vien: {
    title: 'Học sinh (Thành viên)',
    badge: 'Xem điểm & Bảng xếp hạng',
    category: 'thanh_vien',
    defaultStudentName: '',
    canGrade: false,
    canManageClass: false,
    description: 'Theo dõi bảng xếp hạng tuần, tra cứu điểm thi đua cá nhân và nội quy của lớp.'
  }
};

export interface LocalUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

// Safely attempts Firebase anonymous sign-in without throwing fatal error if disabled in Firebase console
async function tryFirebaseAnonymousSignIn(): Promise<FirebaseUser | null> {
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err: any) {
    console.warn('Firebase anonymous authentication unavailable or restricted (bypassed):', err?.code || err?.message);
    return null;
  }
}

interface AuthContextType {
  user: FirebaseUser | LocalUser | null;
  profile: UserProfile | null;
  appRole: AppLoginRole;
  roleSession: RoleSessionInfo;
  loading: boolean;
  error: string | null;
  signInWithGoogle: (role?: AppLoginRole) => Promise<void>;
  signInWithEmail: (email: string, pass: string, role?: AppLoginRole) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInDemo: (role?: AppLoginRole, studentName?: string) => Promise<void>;
  signInWithSelectedRole: (role: AppLoginRole, studentName?: string, studentId?: string) => Promise<void>;
  switchRole: (role: AppLoginRole, studentName?: string, studentId?: string) => void;
  updateTeacherDisplayName: (newName: string) => Promise<void>;
  loginAsStudent: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | LocalUser | null>(() => {
    const storedUid = typeof localStorage !== 'undefined' ? localStorage.getItem('gvcn_session_user_uid') : null;
    if (storedUid) {
      const storedRole = (localStorage.getItem('gvcn_app_role') as AppLoginRole) || 'gvcn';
      const storedName = localStorage.getItem('gvcn_session_user_name') || localStorage.getItem('gvcn_custom_teacher_name') || 'Thầy Phong Qui';
      const storedEmail = localStorage.getItem('gvcn_session_user_email') || `${storedRole}@smartclass.edu.vn`;
      return {
        uid: storedUid,
        email: storedEmail,
        displayName: storedName,
        photoURL: null,
        isAnonymous: true,
      };
    }
    return null;
  });
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const storedUid = typeof localStorage !== 'undefined' ? localStorage.getItem('gvcn_session_user_uid') : null;
    if (storedUid) {
      const storedRole = (localStorage.getItem('gvcn_app_role') as AppLoginRole) || 'gvcn';
      const storedName = localStorage.getItem('gvcn_session_user_name') || localStorage.getItem('gvcn_custom_teacher_name') || 'Thầy Phong Qui';
      const storedEmail = localStorage.getItem('gvcn_session_user_email') || `${storedRole}@smartclass.edu.vn`;
      return {
        uid: storedUid,
        email: storedEmail,
        displayName: storedName,
        photoURL: null,
        role: storedRole === 'gvcn' ? 'teacher' : (storedRole === 'thanh_vien' ? 'student' : 'team_leader'),
        appRole: storedRole,
        activeTeam: ROLE_CONFIGS[storedRole]?.teamName,
        teamName: ROLE_CONFIGS[storedRole]?.teamName,
        teamId: ROLE_CONFIGS[storedRole]?.teamName ? `team_${ROLE_CONFIGS[storedRole].teamName.replace(/\D/g, '')}` : undefined,
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // App Role State
  const [appRole, setAppRoleState] = useState<AppLoginRole>(() => {
    return (localStorage.getItem('gvcn_app_role') as AppLoginRole) || 'gvcn';
  });
  const [activeStudentName, setActiveStudentName] = useState<string>(() => {
    return localStorage.getItem('gvcn_active_student_name') || '';
  });
  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    return localStorage.getItem('gvcn_active_student_id') || '';
  });

  const cfg = ROLE_CONFIGS[appRole] || ROLE_CONFIGS.gvcn;
  const userRole: 'teacher' | 'team_leader' | 'student' | 'cadre' = 
    appRole === 'gvcn' ? 'teacher' : (appRole === 'thanh_vien' ? 'student' : (cfg.category === 'cadre' ? 'cadre' : 'team_leader'));
  const userTeamId = cfg.teamName ? `team_${cfg.teamName.replace(/\D/g, '')}` : undefined;

  const roleSession: RoleSessionInfo = {
    role: appRole,
    userRole,
    title: cfg.title,
    badge: cfg.badge,
    category: cfg.category,
    cadreRole: cfg.cadreRole,
    teamName: cfg.teamName,
    teamId: userTeamId,
    studentName: activeStudentName || cfg.defaultStudentName || '',
    studentId: activeStudentId || '',
    canGrade: cfg.canGrade,
    canManageClass: cfg.canManageClass,
  };

  const switchRole = (role: AppLoginRole, studentName?: string, studentId?: string) => {
    setAppRoleState(role);
    localStorage.setItem('gvcn_app_role', role);
    const targetName = studentName || ROLE_CONFIGS[role]?.defaultStudentName || '';
    const targetId = studentId || '';
    setActiveStudentName(targetName);
    setActiveStudentId(targetId);
    localStorage.setItem('gvcn_active_student_name', targetName);
    localStorage.setItem('gvcn_active_student_id', targetId);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          const savedTeacherName = localStorage.getItem('gvcn_custom_teacher_name') || 'Thầy Phong Qui';
          
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile({
              ...data,
              displayName: data.displayName || savedTeacherName
            });
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || savedTeacherName,
              photoURL: currentUser.photoURL,
              role: 'teacher',
              appRole: appRole,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, cleanFirestoreData(newProfile));
            setProfile(newProfile);
          }
        } catch (err) {
          console.warn('Could not sync user profile to firestore:', err);
          const savedTeacherName = localStorage.getItem('gvcn_custom_teacher_name') || 'Thầy Phong Qui';
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || savedTeacherName,
            photoURL: currentUser.photoURL,
            role: 'teacher',
            appRole: appRole,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        // If not in Firebase Auth, check if there is an active local session
        const storedUid = localStorage.getItem('gvcn_session_user_uid');
        if (storedUid) {
          const storedRole = (localStorage.getItem('gvcn_app_role') as AppLoginRole) || 'gvcn';
          const storedName = localStorage.getItem('gvcn_session_user_name') || localStorage.getItem('gvcn_custom_teacher_name') || 'Thầy Phong Qui';
          const storedEmail = localStorage.getItem('gvcn_session_user_email') || `${storedRole}@smartclass.edu.vn`;
          setUser({
            uid: storedUid,
            email: storedEmail,
            displayName: storedName,
            photoURL: null,
            isAnonymous: true,
          });
          setProfile({
            uid: storedUid,
            email: storedEmail,
            displayName: storedName,
            photoURL: null,
            role: storedRole === 'gvcn' ? 'teacher' : (storedRole === 'thanh_vien' ? 'student' : 'team_leader'),
            appRole: storedRole,
            activeTeam: ROLE_CONFIGS[storedRole]?.teamName,
            teamName: ROLE_CONFIGS[storedRole]?.teamName,
            teamId: ROLE_CONFIGS[storedRole]?.teamName ? `team_${ROLE_CONFIGS[storedRole].teamName.replace(/\D/g, '')}` : undefined,
            createdAt: new Date().toISOString(),
          });
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [appRole]);

  const signInWithSelectedRole = async (role: AppLoginRole, studentName?: string, studentId?: string) => {
    try {
      setError(null);
      setLoading(true);
      switchRole(role, studentName, studentId);

      const savedTeacher = localStorage.getItem('gvcn_custom_teacher_name') || 'Thầy Phong Qui';
      const classSlug = (localStorage.getItem('gvcn_custom_class_name') || 'lop').toLowerCase().replace(/[^a-z0-9]/g, '') || 'lop';
      const displayName = role === 'gvcn' ? savedTeacher : (studentName || ROLE_CONFIGS[role]?.defaultStudentName || 'Học sinh');
      const email = role === 'gvcn' ? `gvcn.${classSlug}@smartclass.edu.vn` : `${role}@smartclass.edu.vn`;

      // Safely attempt Firebase anonymous auth without crashing if provider is disabled in Firebase console
      let currentAuthUser = auth.currentUser;
      if (!currentAuthUser) {
        currentAuthUser = await tryFirebaseAnonymousSignIn();
      }

      const sessionUid = currentAuthUser?.uid || localStorage.getItem('gvcn_session_user_uid') || (role === 'gvcn' ? 'teacher_primary' : `user_${role}_${Date.now()}`);
      localStorage.setItem('gvcn_session_user_uid', sessionUid);
      localStorage.setItem('gvcn_session_user_email', email);
      localStorage.setItem('gvcn_session_user_name', displayName);

      const resolvedUser: FirebaseUser | LocalUser = currentAuthUser || {
        uid: sessionUid,
        email,
        displayName,
        photoURL: null,
        isAnonymous: true,
      };

      const newProfile: UserProfile = {
        uid: sessionUid,
        email,
        displayName,
        photoURL: null,
        role: role === 'gvcn' ? 'teacher' : (role === 'thanh_vien' ? 'student' : 'team_leader'),
        appRole: role,
        activeTeam: ROLE_CONFIGS[role]?.teamName,
        teamName: ROLE_CONFIGS[role]?.teamName,
        teamId: ROLE_CONFIGS[role]?.teamName ? `team_${ROLE_CONFIGS[role].teamName.replace(/\D/g, '')}` : undefined,
        activeStudentId: studentId,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', sessionUid), cleanFirestoreData(newProfile), { merge: true });
      } catch (e) {
        console.warn('Save user doc failed:', e);
      }

      setUser(resolvedUser);
      setProfile(newProfile);
    } catch (err: any) {
      console.error('Sign in with role error:', err);
      setError('Không thể đăng nhập với chức vụ đã chọn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (role: AppLoginRole = 'gvcn') => {
    try {
      setError(null);
      setLoading(true);
      switchRole(role);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        setError('Cửa sổ đăng nhập bị chặn. Vui lòng mở trang web trong tab mới hoặc dùng Đăng nhập 1 chạm.');
      } else {
        setError(err.message || 'Đăng nhập Google thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string, role: AppLoginRole = 'gvcn') => {
    try {
      setError(null);
      setLoading(true);
      switchRole(role);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Email sign in error:', err);
      setError(err.message || 'Email hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      setError(null);
      setLoading(true);
      switchRole('gvcn');
      localStorage.setItem('gvcn_custom_teacher_name', name.trim());
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await updateProfile(res.user, { displayName: name.trim() });
        const newProfile: UserProfile = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: name.trim(),
          photoURL: null,
          role: 'teacher',
          appRole: 'gvcn',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', res.user.uid), cleanFirestoreData(newProfile));
        setProfile(newProfile);
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'Đăng ký tài khoản thất bại');
    } finally {
      setLoading(false);
    }
  };

  const signInDemo = async (role: AppLoginRole = 'gvcn', studentName?: string) => {
    try {
      setError(null);
      setLoading(true);
      switchRole(role, studentName);

      const savedTeacher = localStorage.getItem('gvcn_custom_teacher_name') || 'Thầy Phong Qui';
      const classSlug = (localStorage.getItem('gvcn_custom_class_name') || 'lop').toLowerCase().replace(/[^a-z0-9]/g, '') || 'lop';
      const demoName = role === 'gvcn' 
        ? savedTeacher 
        : (studentName || ROLE_CONFIGS[role]?.defaultStudentName || 'Học sinh');
      const email = role === 'gvcn' ? `gvcn.${classSlug}@smartclass.edu.vn` : `${role}@smartclass.edu.vn`;

      let currentAuthUser = auth.currentUser;
      if (!currentAuthUser) {
        currentAuthUser = await tryFirebaseAnonymousSignIn();
      }

      const sessionUid = currentAuthUser?.uid || localStorage.getItem('gvcn_session_user_uid') || (role === 'gvcn' ? 'teacher_primary' : `user_demo_${role}`);
      localStorage.setItem('gvcn_session_user_uid', sessionUid);
      localStorage.setItem('gvcn_session_user_email', email);
      localStorage.setItem('gvcn_session_user_name', demoName);

      const resolvedUser: FirebaseUser | LocalUser = currentAuthUser || {
        uid: sessionUid,
        email,
        displayName: demoName,
        photoURL: null,
        isAnonymous: true,
      };

      const demoProfile: UserProfile = {
        uid: sessionUid,
        email,
        displayName: demoName,
        photoURL: null,
        role: role === 'gvcn' ? 'teacher' : (role === 'thanh_vien' ? 'student' : 'team_leader'),
        appRole: role,
        activeTeam: ROLE_CONFIGS[role]?.teamName,
        teamName: ROLE_CONFIGS[role]?.teamName,
        teamId: ROLE_CONFIGS[role]?.teamName ? `team_${ROLE_CONFIGS[role].teamName.replace(/\D/g, '')}` : undefined,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', sessionUid), cleanFirestoreData(demoProfile), { merge: true });
      } catch (e) {
        console.warn('Set doc failed on anon:', e);
      }

      setUser(resolvedUser);
      setProfile(demoProfile);
    } catch (err: any) {
      console.error('Demo sign in error:', err);
      setError('Không thể khởi tạo phiên bản dùng thử. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const loginAsStudent = async (username: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      setLoading(true);
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = pass.trim();

      if (!cleanUser || !cleanPass) {
        const msg = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu';
        setError(msg);
        return { success: false, error: msg };
      }

      const account = await findStudentAccountByUsername(cleanUser);
      if (!account) {
        const msg = `Không tìm thấy tài khoản "${cleanUser}". Vui lòng kiểm tra lại hoặc liên hệ Giáo viên chủ nhiệm để được cấp tài khoản.`;
        setError(msg);
        return { success: false, error: msg };
      }

      if (account.password !== cleanPass) {
        const msg = 'Mật khẩu không chính xác. Vui lòng thử lại hoặc nhờ GVCN cấp lại mật khẩu.';
        setError(msg);
        return { success: false, error: msg };
      }

      if (account.isActive === false) {
        const msg = 'Tài khoản này hiện đang tạm khóa. Vui lòng liên hệ GVCN để kích hoạt lại.';
        setError(msg);
        return { success: false, error: msg };
      }

      // Determine appropriate role based on account permissions & team
      let targetRole: AppLoginRole = 'thanh_vien';
      if (account.role === 'lop_truong' || account.cadreRole === 'lop_truong') {
        targetRole = 'lop_truong';
      } else if (account.cadreRole === 'lop_pho_hoc_tap') {
        targetRole = 'lop_pho_hoc_tap';
      } else if (account.cadreRole === 'lop_pho_lao_dong') {
        targetRole = 'lop_pho_lao_dong';
      } else if (account.cadreRole === 'lop_pho_trat_tu') {
        targetRole = 'lop_pho_trat_tu';
      } else if (account.cadreRole === 'bi_thu' || account.role === 'bi_thu') {
        targetRole = 'bi_thu';
      } else if (account.cadreRole === 'pho_bi_thu') {
        targetRole = 'pho_bi_thu';
      } else if (account.role === 'to_truong' || account.canGrade || (account as any).isTeamLeader) {
        const teamNum = (account.teamName || '').replace(/\D/g, '');
        if (teamNum === '1') targetRole = 'to_truong_to_1';
        else if (teamNum === '2') targetRole = 'to_truong_to_2';
        else if (teamNum === '3') targetRole = 'to_truong_to_3';
        else if (teamNum === '4') targetRole = 'to_truong_to_4';
        else if (teamNum === '5') targetRole = 'to_truong_to_5';
        else targetRole = 'to_truong_to_1';
      }

      switchRole(targetRole, account.fullName, account.studentId);
      localStorage.setItem('gvcn_student_account_user', account.username);

      let currentAuthUser = auth.currentUser;
      if (!currentAuthUser) {
        currentAuthUser = await tryFirebaseAnonymousSignIn();
      }

      const sessionUid = currentAuthUser?.uid || `std_${account.studentId || account.username}`;
      const email = `${account.username}@student.smartclass.edu.vn`;

      localStorage.setItem('gvcn_session_user_uid', sessionUid);
      localStorage.setItem('gvcn_session_user_email', email);
      localStorage.setItem('gvcn_session_user_name', account.fullName);

      const resolvedUser: FirebaseUser | LocalUser = currentAuthUser || {
        uid: sessionUid,
        email,
        displayName: account.fullName,
        photoURL: null,
        isAnonymous: true,
      };

      const studentProfile: UserProfile = {
        uid: sessionUid,
        email,
        displayName: account.fullName,
        photoURL: null,
        role: account.canGrade ? 'team_leader' : 'student',
        appRole: targetRole,
        activeTeam: account.teamName,
        teamName: account.teamName,
        teamId: account.teamName ? `team_${account.teamName.replace(/\D/g, '')}` : undefined,
        activeStudentId: account.studentId,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', sessionUid), cleanFirestoreData(studentProfile), { merge: true });
      } catch (e) {
        console.warn('Set student doc error:', e);
      }

      setUser(resolvedUser);
      setProfile(studentProfile);
      return { success: true };
    } catch (err: any) {
      console.error('Student login error:', err);
      const msg = err.message || 'Đăng nhập tài khoản học sinh thất bại';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const updateTeacherDisplayName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // Persist immediately in localStorage so it is 100% durable
    localStorage.setItem('gvcn_custom_teacher_name', trimmed);
    localStorage.setItem('gvcn_session_user_name', trimmed);

    // Optimistically update React profile state
    setProfile(prev => prev ? { ...prev, displayName: trimmed } : {
      uid: user?.uid || 'teacher_primary',
      email: user?.email || null,
      displayName: trimmed,
      photoURL: null,
      role: 'teacher',
      appRole: 'gvcn',
      createdAt: new Date().toISOString(),
    });

    if (user) {
      if (typeof (user as any).getIdToken === 'function') {
        try {
          await updateProfile(user as FirebaseUser, { displayName: trimmed });
        } catch (e) {
          console.warn('Update firebase user profile failed:', e);
        }
      }
      try {
        await setDoc(doc(db, 'users', user.uid), cleanFirestoreData({ displayName: trimmed }), { merge: true });
      } catch (e) {
        console.warn('Update firestore user doc failed:', e);
      }
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('gvcn_session_user_uid');
      localStorage.removeItem('gvcn_session_user_email');
      localStorage.removeItem('gvcn_session_user_name');
      localStorage.removeItem('gvcn_student_account_user');
      await fbSignOut(auth).catch(() => {});
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      appRole,
      roleSession,
      loading,
      error,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signInDemo,
      signInWithSelectedRole,
      switchRole,
      updateTeacherDisplayName,
      loginAsStudent,
      logout,
      clearError: () => setError(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
