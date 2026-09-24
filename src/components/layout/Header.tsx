import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClassData } from '../../hooks/useClassData';
import { 
  School, 
  Calendar, 
  ChevronDown, 
  Plus, 
  LogOut, 
  Sparkles, 
  RotateCcw,
  Check,
  Bell,
  TrendingDown,
  TrendingUp,
  Trophy,
  Bot,
  Edit3,
  Search,
  Lock,
  Unlock,
  Database,
  FileSpreadsheet,
  ArrowLeftRight,
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  Users,
  Trash2,
  Bookmark,
  Clock
} from 'lucide-react';
import { EditTeacherNameModal } from '../modals/EditTeacherNameModal';
import { ROLE_CONFIGS } from '../../hooks/useAuth';
import { AppLoginRole } from '../../types';
import { ClassManagementModal } from '../classes/ClassManagementModal';
import { WeekLockModal } from '../academic/WeekLockModal';
import { BackupRestoreModal } from '../system/BackupRestoreModal';
import { ExcelImportModal } from '../students/ExcelImportModal';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import { ConfirmDeleteDemoModal } from '../modals/ConfirmDeleteDemoModal';
import { CreateRealClassWizardModal } from '../modals/CreateRealClassWizardModal';
import { SchoolYearManagementModal } from '../system/SchoolYearManagementModal';
import { ProductionAuditModal } from '../system/ProductionAuditModal';
import { QuickObservationModal } from '../modals/QuickObservationModal';
import { DailySummaryModal } from '../modals/DailySummaryModal';
import { getUnifiedAcademicTimeInfo } from '../../utils/academicTime';

interface HeaderProps {
  onOpenClassModal?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateTab }) => {
  const { profile, logout, appRole, roleSession, switchRole } = useAuth();
  const { 
    classes, 
    filteredClasses,
    filterMode,
    setFilterMode,
    isDemoMode,
    currentClass, 
    setCurrentClass, 
    selectedWeek, 
    setSelectedWeek, 
    seedDemoData, 
    seedFullDemoClasses,
    teacherName, 
    students,
    isCurrentWeekLocked 
  } = useClassData();
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showWeekDropdown, setShowWeekDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isEditTeacherModalOpen, setIsEditTeacherModalOpen] = useState(false);
  const [isDeleteDemoModalOpen, setIsDeleteDemoModalOpen] = useState(false);

  // Prompt 5 Modals
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isWeekLockModalOpen, setIsWeekLockModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Prompt 9 Production Modals
  const [isCreateRealClassModalOpen, setIsCreateRealClassModalOpen] = useState(false);
  const [isSchoolYearModalOpen, setIsSchoolYearModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Prompt 10 Thực Chiến Modals
  const [isQuickObservationModalOpen, setIsQuickObservationModalOpen] = useState(false);
  const [isDailySummaryModalOpen, setIsDailySummaryModalOpen] = useState(false);

  const academicTimeInfo = React.useMemo(() => getUnifiedAcademicTimeInfo(), []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const notifications = [
    {
      id: 'notif-1',
      type: 'warning',
      icon: TrendingDown,
      iconColor: 'text-rose-600 bg-rose-50',
      title: 'Nguyễn Minh Anh giảm 6 điểm',
      desc: 'Vi phạm nói chuyện riêng và đi học muộn 2 lần.',
      time: '15 phút trước',
      actionTab: 'students',
    },
    {
      id: 'notif-2',
      type: 'success',
      icon: TrendingUp,
      iconColor: 'text-emerald-600 bg-emerald-50',
      title: 'Trần Gia Bảo tiến bộ +8 điểm',
      desc: 'Tích cực phát biểu và chuẩn bị bài chu đáo.',
      time: '1 giờ trước',
      actionTab: 'students',
    },
    {
      id: 'notif-3',
      type: 'trophy',
      icon: Trophy,
      iconColor: 'text-amber-600 bg-amber-50',
      title: 'Tổ 2 dẫn đầu thi đua tuần',
      desc: 'Điểm trung bình tổ đạt 108.2 điểm.',
      time: '3 giờ trước',
      actionTab: 'rankings',
    },
    {
      id: 'notif-4',
      type: 'ai',
      icon: Bot,
      iconColor: 'text-purple-600 bg-purple-50',
      title: `AI đã phân tích xong tuần ${selectedWeek}`,
      desc: 'Báo cáo nề nếp và kế hoạch sinh hoạt lớp đã sẵn sàng.',
      time: 'Hôm nay',
      actionTab: 'ai',
    },
  ];

  const handleCreateDemoData = async () => {
    setIsResetting(true);
    try {
      await seedFullDemoClasses();
      setShowClassDropdown(false);
    } catch (err) {
      console.error('Lỗi khi nạp dữ liệu mẫu:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 py-2.5">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Class Switcher & School Year */}
        <div className="flex items-center gap-3">
          {/* Class Dropdown Pill */}
          <div className="relative">
            <button
              id="btn-class-dropdown"
              onClick={() => setShowClassDropdown(!showClassDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              <div className={`w-6 h-6 rounded-lg text-white flex items-center justify-center font-bold text-xs ${
                currentClass?.isDemo ? 'bg-amber-600' : 'bg-emerald-700'
              }`}>
                {currentClass?.className ? currentClass.className.replace(/[^0-9a-zA-Z]/g, '').slice(0, 3) : 'Lớp'}
              </div>
              <div className="text-left">
                <span className="block font-bold text-xs sm:text-sm leading-tight text-slate-900 flex items-center gap-1.5">
                  <span>{currentClass?.className || 'Lớp học của bạn'}</span>
                  {currentClass?.isDemo ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold hidden sm:inline">
                      Demo
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold hidden sm:inline">
                      Thực tế
                    </span>
                  )}
                </span>
                <span className="block text-[10px] text-slate-500 font-normal leading-none">
                  {currentClass?.schoolYear || 'Năm học 2026–2027'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
            </button>

            {showClassDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowClassDropdown(false)} />
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Danh sách lớp ({classes.length})</span>
                    <button
                      onClick={() => {
                        setShowClassDropdown(false);
                        setIsCreateRealClassModalOpen(true);
                      }}
                      className="text-emerald-700 hover:text-emerald-800 text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Tạo lớp thật
                    </button>
                  </div>
                  
                  {/* Mode Filter Selector */}
                  <div className="px-3 py-1.5 bg-slate-50 border-y border-slate-100 flex items-center justify-between gap-1 text-[11px] font-bold">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        filterMode === 'all' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tất cả ({classes.length})
                    </button>
                    <button
                      onClick={() => setFilterMode('real')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        filterMode === 'real' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Lớp thật ({classes.filter(c => !c.isDemo).length})
                    </button>
                    <button
                      onClick={() => setFilterMode('demo')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        filterMode === 'demo' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Demo ({classes.filter(c => c.isDemo).length})
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                    {filteredClasses.map((cls) => (
                      <button
                        key={cls.classId}
                        onClick={() => {
                          setCurrentClass(cls);
                          setSelectedWeek(cls.currentWeek || 8);
                          setShowClassDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                          currentClass?.classId === cls.classId
                            ? cls.isDemo ? 'bg-amber-50 font-bold text-amber-900' : 'bg-emerald-50 font-bold text-emerald-900'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{cls.className}</span>
                            {cls.isDemo ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                Demo
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                Lớp thật
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{cls.schoolYear} • Sĩ số: {cls.studentCount || 45} HS</div>
                        </div>
                        {currentClass?.classId === cls.classId && (
                          <Check className="w-4 h-4 text-indigo-600" />
                        )}
                      </button>
                    ))}
                  </div>

                  {appRole === 'gvcn' && (
                    <div className="border-t border-slate-100 my-1 pt-1 space-y-0.5">
                      {/* Nút Khởi tạo lớp thật (Wizard 6 bước) */}
                      <button
                        onClick={() => {
                          setShowClassDropdown(false);
                          setIsCreateRealClassModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Khởi tạo lớp thật mới (Wizard 6 bước)...</span>
                      </button>

                      {/* Quản lý năm học */}
                      <button
                        onClick={() => {
                          setShowClassDropdown(false);
                          setIsSchoolYearModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Quản lý niên khóa & Năm học...</span>
                      </button>

                      {/* Kiểm toán hệ thống (Audit) */}
                      <button
                        onClick={() => {
                          setShowClassDropdown(false);
                          setIsAuditModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-indigo-700 hover:bg-indigo-50 font-bold cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Kiểm toán hệ thống (Production Audit)...</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowClassDropdown(false);
                          setIsClassModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500" />
                        <span>Quản lý lớp & Chuyển lớp...</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowClassDropdown(false);
                          setIsExcelImportModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Nhập học sinh từ Excel (.xlsx)...</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowClassDropdown(false);
                          setIsBackupModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Sao lưu & Khôi phục dữ liệu...</span>
                      </button>

                      {/* Demo Mode Actions: Chỉ hiển thị khi đang ở Demo mode để bảo vệ dữ liệu thật */}
                      {isDemoMode ? (
                        <>
                          <button
                            onClick={handleCreateDemoData}
                            disabled={isResetting}
                            className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-amber-800 hover:bg-amber-50 font-semibold cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isResetting ? 'animate-spin' : ''}`} />
                            <span>{isResetting ? 'Đang tạo 90 học sinh...' : 'Nạp lại dữ liệu mẫu (12A1 & 12A2 - 90 HS)'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowClassDropdown(false);
                              setIsDeleteDemoModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Xóa dữ liệu mẫu...</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleCreateDemoData}
                          disabled={isResetting}
                          className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 font-medium cursor-pointer"
                          title="Tạo thêm 2 lớp demo để trải nghiệm thử mà không ảnh hưởng lớp thật"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                          <span>Mở thêm lớp mẫu để tham khảo</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mode Status Pill Banner */}
          {isDemoMode ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>DỮ LIỆU DEMO (THỬ NGHIỆM)</span>
            </div>
          ) : (
            <div 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-xs"
              title={`Hệ thống sẵn sàng: ${academicTimeInfo.todayFormatted} • Năm học ${academicTimeInfo.schoolYear}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>GVCN THỰC CHIẾN</span>
              <span className="hidden xl:inline text-[11px] font-normal text-emerald-800">
                • {academicTimeInfo.todayFormatted}
              </span>
            </div>
          )}
        </div>

        {/* Right: Week selector, Notification Center, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sổ ghi nhận nhanh */}
          <button
            onClick={() => setIsQuickObservationModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/70 text-indigo-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Sổ Ghi Nhận Nhanh Học Sinh"
          >
            <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sổ ghi nhận</span>
          </button>

          {/* Tổng kết cuối ngày */}
          <button
            onClick={() => setIsDailySummaryModalOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200/70 text-amber-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Tổng Hợp Nhanh Cuối Ngày Bằng AI"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Tổng kết ngày</span>
          </button>

          {/* Quick Search Ctrl+K */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
            title="Tìm kiếm nhanh toàn trường (Ctrl+K / ⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Tìm kiếm</span>
            <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-400 font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Week Selector */}
          <div className="relative">
            <button
              id="btn-week-dropdown"
              onClick={() => setShowWeekDropdown(!showWeekDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                isCurrentWeekLocked 
                  ? 'bg-amber-50/90 hover:bg-amber-100 border-amber-300 text-amber-950' 
                  : 'bg-indigo-50/80 hover:bg-indigo-100/70 border-indigo-200/60 text-indigo-900'
              }`}
            >
              {isCurrentWeekLocked ? (
                <Lock className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>Tuần {selectedWeek}</span>
              {isCurrentWeekLocked && (
                <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                  Khóa sổ
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showWeekDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowWeekDropdown(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 max-h-72 overflow-y-auto">
                  <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Chọn tuần thi đua</span>
                  </div>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                    <button
                      key={w}
                      onClick={() => {
                        setSelectedWeek(w);
                        setShowWeekDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-left hover:bg-indigo-50/50 cursor-pointer ${
                        selectedWeek === w ? 'font-bold text-indigo-700 bg-indigo-50' : 'text-slate-700'
                      }`}
                    >
                      <span>Tuần {w}</span>
                      {w === (currentClass?.currentWeek || 8) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                          Hiện tại
                        </span>
                      )}
                    </button>
                  ))}

                  {appRole === 'gvcn' && (
                    <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                      <button
                        onClick={() => {
                          setShowWeekDropdown(false);
                          setIsWeekLockModalOpen(true);
                        }}
                        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-700 font-bold hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Quản lý 35 tuần & Khóa sổ</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 🔔 Notification Center */}
          <div className="relative">
            <button
              id="btn-notifications"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setHasUnread(false);
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors relative cursor-pointer"
              title="Thông báo lớp học"
            >
              <Bell className="w-4 h-4" />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 z-30 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-bold text-sm text-slate-900">Thông báo & Cảnh báo</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">4 tin mới</span>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {notifications.map((n) => {
                      const IconComponent = n.icon;
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            setShowNotifications(false);
                            if (onNavigateTab && n.actionTab) {
                              onNavigateTab(n.actionTab);
                            }
                          }}
                          className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 transition-colors cursor-pointer flex items-start gap-3"
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.iconColor}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className="font-bold text-xs text-slate-900 truncate">{n.title}</h5>
                              <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug mt-0.5">{n.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <span className="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer">
                      Đánh dấu tất cả là đã đọc
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Role & Profile Switcher */}
          <div className="relative flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <button
              id="btn-header-role-switcher"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 text-left p-1.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 transition-all cursor-pointer group shadow-2xs"
              title="Thông tin tài khoản đang sử dụng"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs text-white ${
                appRole === 'gvcn' 
                  ? 'bg-gradient-to-tr from-indigo-600 to-violet-600' 
                  : appRole === 'thanh_vien'
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                  : 'bg-gradient-to-tr from-amber-500 to-orange-600'
              }`}>
                {appRole === 'gvcn' ? (
                  teacherName.charAt(0).toUpperCase()
                ) : appRole === 'thanh_vien' ? (
                  <GraduationCap className="w-4 h-4" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
              </div>

              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                    {appRole === 'gvcn' ? teacherName : (roleSession.studentName || roleSession.title)}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                    appRole === 'gvcn'
                      ? 'bg-indigo-100 text-indigo-700'
                      : appRole === 'thanh_vien'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {appRole === 'gvcn' ? 'GVCN' : (roleSession.teamName ? `Tổ trưởng ${roleSession.teamName}` : 'Học sinh')}
                  </span>
                </div>
              </div>
            </button>

            {/* Quick edit teacher name button for GVCN */}
            {appRole === 'gvcn' && (
              <button
                id="btn-quick-edit-teacher"
                onClick={() => setIsEditTeacherModalOpen(true)}
                title="Đổi tên Giáo viên chủ nhiệm"
                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {/* Role & Profile Info Dropdown */}
            {showRoleDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowRoleDropdown(false)} />
                <div className="absolute right-0 mt-2 top-full w-72 bg-white rounded-3xl shadow-2xl border border-slate-200 p-3.5 z-30 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl mb-2.5">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Tài khoản đang đăng nhập
                    </p>
                    <p className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                      {appRole === 'gvcn' ? `🎓 ${teacherName}` : `🎒 ${roleSession.studentName || roleSession.title}`}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        appRole === 'gvcn'
                          ? 'bg-indigo-100 text-indigo-700'
                          : appRole === 'thanh_vien'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {roleSession.title}
                      </span>
                      {roleSession.teamName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                          {roleSession.teamName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-3 py-2 text-[11px] text-slate-500 bg-amber-50/70 border border-amber-200/70 rounded-xl mb-2.5 leading-relaxed">
                    🔒 <strong>Bảo mật tài khoản:</strong> Mỗi thành viên sử dụng tài khoản riêng biệt. Để chuyển tài khoản, vui lòng đăng xuất.
                  </div>

                  {/* Options footer */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    {appRole === 'gvcn' && (
                      <button
                        onClick={() => {
                          setShowRoleDropdown(false);
                          setIsEditTeacherModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 font-semibold hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Đổi tên Giáo viên chủ nhiệm</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowRoleDropdown(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 font-semibold hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất khỏi tài khoản</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              id="btn-logout"
              onClick={logout}
              title="Đăng xuất"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors ml-0.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <EditTeacherNameModal
        isOpen={isEditTeacherModalOpen}
        onClose={() => setIsEditTeacherModalOpen(false)}
      />

      {/* PROMPT 5 MODALS */}
      <ClassManagementModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
      />

      <WeekLockModal
        isOpen={isWeekLockModalOpen}
        onClose={() => setIsWeekLockModalOpen(false)}
      />

      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      <ExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
      />

      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectStudent={(studentId) => {
          if (onNavigateTab) onNavigateTab('grading');
        }}
      />

      <ConfirmDeleteDemoModal
        isOpen={isDeleteDemoModalOpen}
        onClose={() => setIsDeleteDemoModalOpen(false)}
      />

      {/* PROMPT 9 PRODUCTION MODALS */}
      <CreateRealClassWizardModal
        isOpen={isCreateRealClassModalOpen}
        onClose={() => setIsCreateRealClassModalOpen(false)}
        onSuccess={(targetTab) => {
          setIsCreateRealClassModalOpen(false);
          if (targetTab && onNavigateTab) {
            onNavigateTab(targetTab);
          }
        }}
      />

      <SchoolYearManagementModal
        isOpen={isSchoolYearModalOpen}
        onClose={() => setIsSchoolYearModalOpen(false)}
      />

      <ProductionAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* PROMPT 10 THỰC CHIẾN MODALS */}
      <QuickObservationModal
        isOpen={isQuickObservationModalOpen}
        onClose={() => setIsQuickObservationModalOpen(false)}
      />

      <DailySummaryModal
        isOpen={isDailySummaryModalOpen}
        onClose={() => setIsDailySummaryModalOpen(false)}
      />
    </header>
  );
};
