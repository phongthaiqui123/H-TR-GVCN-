import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Save, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  BookOpen, 
  Award, 
  Calendar, 
  Clock, 
  Printer, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Check, 
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';
import { WeeklyCadreReview, WeeklyCadreReviewTeamItem, RoleSessionInfo } from '../../types';
import { useClassData } from '../../hooks/useClassData';
import { useAuth } from '../../hooks/useAuth';

interface WeeklyCadreReviewSectionProps {
  onPrint?: () => void;
}

export const WeeklyCadreReviewSection: React.FC<WeeklyCadreReviewSectionProps> = ({ onPrint }) => {
  const { 
    currentClass, 
    selectedWeek, 
    setSelectedWeek,
    students, 
    teams, 
    teamSummaries,
    teacherName,
    weeklyCadreReview, 
    cadreReviewLoading, 
    saveCadreReview 
  } = useClassData();
  
  const { roleSession } = useAuth();

  // Find real students assigned to cadre positions
  const realLopTruong = students.find(s => s.cadreRole === 'lop_truong');
  const realLopPhoHocTap = students.find(s => s.cadreRole === 'lop_pho_hoc_tap');
  const realLopPhoLaoDong = students.find(s => s.cadreRole === 'lop_pho_lao_dong');
  const realLopPhoTratTu = students.find(s => s.cadreRole === 'lop_pho_trat_tu');
  const realBiThu = students.find(s => s.cadreRole === 'bi_thu');

  // RBAC Permission checks
  const isGVCN = roleSession.category === 'gvcn';
  const isLopTruong = roleSession.category === 'cadre' && roleSession.cadreRole === 'lop_truong';
  const isLopPhoHocTap = roleSession.category === 'cadre' && roleSession.cadreRole === 'lop_pho_hoc_tap';
  const isLopPhoLaoDong = roleSession.category === 'cadre' && roleSession.cadreRole === 'lop_pho_lao_dong';
  const isLopPhoTratTu = roleSession.category === 'cadre' && roleSession.cadreRole === 'lop_pho_trat_tu';
  const isBiThu = roleSession.category === 'cadre' && roleSession.cadreRole === 'bi_thu';
  const isTeamLeader = roleSession.category === 'to_truong';
  const userTeamName = roleSession.teamName || 'Tổ 1';

  // Can this user edit anything?
  const canEditAny = isGVCN || isLopTruong || isLopPhoHocTap || isLopPhoLaoDong || isLopPhoTratTu || isBiThu || isTeamLeader;
  const isReadOnlyStudent = !canEditAny;

  // Granular section permissions
  const canEditGeneral = isGVCN || isLopTruong;
  const canEditAcademic = isGVCN || isLopTruong || isLopPhoHocTap;
  const canEditDiscipline = isGVCN || isLopTruong || isLopPhoTratTu;
  const canEditHygiene = isGVCN || isLopTruong || isLopPhoLaoDong;
  const canEditMovement = isGVCN || isLopTruong || isBiThu;
  const canEditTeam = (teamName: string) => {
    if (isGVCN || isLopTruong) return true;
    if (isTeamLeader && userTeamName === teamName) return true;
    return false;
  };
  const canEditTeacherFeedback = isGVCN;

  // Local draft state
  const [draft, setDraft] = useState<WeeklyCadreReview>(() => {
    return createInitialDraft(currentClass?.classId || '', selectedWeek, students, teacherName);
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'general' | 'study' | 'discipline' | 'hygiene' | 'teams' | 'gvcn'>('all');

  // Sync draft when weeklyCadreReview loads
  useEffect(() => {
    if (weeklyCadreReview) {
      setDraft(weeklyCadreReview);
    } else {
      setDraft(createInitialDraft(currentClass?.classId || '', selectedWeek, students, teacherName));
    }
  }, [weeklyCadreReview, selectedWeek, currentClass?.classId, students, teacherName]);

  function createInitialDraft(classId: string, week: number, stdList: typeof students, gvcnName: string): WeeklyCadreReview {
    const lt = stdList.find(s => s.cadreRole === 'lop_truong')?.fullName || 'Lớp trưởng';
    const lpht = stdList.find(s => s.cadreRole === 'lop_pho_hoc_tap')?.fullName || 'Lớp phó học tập';
    const lptt = stdList.find(s => s.cadreRole === 'lop_pho_trat_tu')?.fullName || 'Lớp phó trật tự';
    const lpld = stdList.find(s => s.cadreRole === 'lop_pho_lao_dong')?.fullName || 'Lớp phó lao động';
    const bt = stdList.find(s => s.cadreRole === 'bi_thu')?.fullName || 'Bí thư Chi đoàn';

    const teamsMap: Record<string, WeeklyCadreReviewTeamItem> = {};
    ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4', 'Tổ 5'].forEach(tm => {
      const leader = stdList.find(s => s.teamName === tm && (s.isTeamLeader || s.teamRole === 'to_truong'))?.fullName || `Tổ trưởng ${tm}`;
      teamsMap[tm] = {
        teamName: tm,
        authorName: leader,
        content: '',
        positiveMembers: '',
        warningMembers: '',
        rating: 'tot'
      };
    });

    return {
      reviewId: `wcr_${classId || 'class'}_w${week}`,
      classId: classId || '',
      weekNumber: week,
      generalAssessment: '',
      generalAuthorName: lt,
      academicAssessment: '',
      academicAuthorName: lpht,
      homeworkStatus: '',
      disciplineAssessment: '',
      disciplineAuthorName: lptt,
      attendanceDisciplineStatus: '',
      hygieneAssessment: '',
      hygieneAuthorName: lpld,
      sanitationStatus: '',
      movementAssessment: '',
      movementAuthorName: bt,
      teamAssessments: teamsMap,
      nextWeekGoals: '',
      teacherFeedback: '',
      teacherFeedbackAuthor: gvcnName || 'Giáo viên chủ nhiệm',
      status: 'draft',
      updatedBy: roleSession.displayName || 'Ban cán sự lớp',
      updatedByRole: roleSession.title,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  const handleSave = async (newStatus?: 'draft' | 'submitted' | 'approved') => {
    try {
      setSaving(true);
      const updated: WeeklyCadreReview = {
        ...draft,
        status: newStatus || draft.status,
        updatedBy: roleSession.displayName || 'Ban cán sự',
        updatedByRole: roleSession.title,
        updatedAt: new Date().toISOString()
      };
      await saveCadreReview(updated);
      setDraft(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving cadre review:', err);
    } finally {
      setSaving(false);
    }
  };

  // Quick suggestions generator
  const applyQuickTemplate = (field: 'general' | 'academic' | 'discipline' | 'hygiene' | 'goals') => {
    if (field === 'general') {
      setDraft(prev => ({
        ...prev,
        generalAssessment: `Tuần ${selectedWeek}, nhìn chung tập thể lớp duy trì tốt nề nếp kỷ luật và tinh thần thi đua. Đa số học sinh chấp hành nghiêm chỉnh nội quy nhà trường, đi học đầy đủ đúng giờ. Các tổ có sự nỗ lực vươn lên trong học tập và phong trào.`
      }));
    } else if (field === 'academic') {
      setDraft(prev => ({
        ...prev,
        academicAssessment: `Tuần ${selectedWeek}, phong trào học tập diễn ra nghiêm túc. Toàn lớp đạt nhiều giờ học tốt và tiết kiểm tra nghiêm túc. Đa số học sinh chuẩn bị bài và làm bài tập về nhà đầy đủ trước khi đến lớp. Cần lưu ý một số bạn môn Tự nhiên còn nộp bài muộn.`
      }));
    } else if (field === 'discipline') {
      setDraft(prev => ({
        ...prev,
        disciplineAssessment: `15 phút đầu giờ được thực hiện nghiêm túc, lớp trưởng và các tổ trưởng quản lý trật tự truy bài tốt. Tình hình chuyên cần ổn định, không có học sinh trốn tiết hay vi phạm kỷ luật nặng.`
      }));
    } else if (field === 'hygiene') {
      setDraft(prev => ({
        ...prev,
        hygieneAssessment: `Các tổ thực hiện trực nhật đúng giờ, phòng học sạch sẽ, bảng viết và bàn ghế ngay ngắn. Lớp luôn bảo quản tốt cơ sở vật chất, tắt điện và quạt trước khi ra về.`
      }));
    } else if (field === 'goals') {
      setDraft(prev => ({
        ...prev,
        nextWeekGoals: `1. Tiếp tục duy trì 100% tiết học Tốt trong tuần tới.\n2. Khắc phục triệt để tình trạng quên dụng cụ học tập và đi học muộn.\n3. Các tổ trưởng đôn đốc kiểm tra bài tập 15 phút đầu giờ.\n4. Đăng ký tham gia tích cực phong trào thi đua do Đoàn trường phát động.`
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Role Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Nhận xét của Ban cán sự lớp về tình hình trong tuần
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 uppercase">
                Tuần {selectedWeek}
              </span>
              {draft.status === 'approved' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt
                </span>
              ) : draft.status === 'submitted' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500 text-white">
                  Chờ GVCN duyệt
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-indigo-100">
                  Bản dự thảo
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-200 mt-1">
              Phân quyền ghi nhận: Lớp trưởng, Lớp phó, Bí thư, Tổ trưởng ghi báo cáo theo chức vụ • GVCN duyệt & chỉ đạo
            </p>
          </div>
        </div>

        {/* RBAC Status badge */}
        <div className="flex items-center gap-2 self-start md:self-center">
          {isReadOnlyStudent ? (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Chế độ đọc: Chỉ Ban cán sự lớp mới được nhập và chỉnh sửa</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Quyền: <strong>{roleSession.title}</strong></span>
            </div>
          )}

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In biên bản</span>
            </button>
          )}
        </div>
      </div>

      {/* Cadre Rosters Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Ban cán sự lớp phụ trách báo cáo tuần {selectedWeek}:</span>
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Đồng bộ theo thực tế phân quyền của lớp
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <span className="text-[10px] uppercase font-extrabold text-indigo-700 block">Lớp trưởng</span>
            <span className="font-bold text-slate-900 truncate block mt-0.5">
              {realLopTruong?.fullName || 'Chưa phân công'}
            </span>
            <span className="text-[10px] text-slate-500 block">Nhận xét chung & phương hướng</span>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
            <span className="text-[10px] uppercase font-extrabold text-blue-700 block">Lớp phó học tập</span>
            <span className="font-bold text-slate-900 truncate block mt-0.5">
              {realLopPhoHocTap?.fullName || 'Chưa phân công'}
            </span>
            <span className="text-[10px] text-slate-500 block">Học tập & bài tập về nhà</span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
            <span className="text-[10px] uppercase font-extrabold text-amber-700 block">Lớp phó trật tự</span>
            <span className="font-bold text-slate-900 truncate block mt-0.5">
              {realLopPhoTratTu?.fullName || 'Chưa phân công'}
            </span>
            <span className="text-[10px] text-slate-500 block">Kỷ luật, nề nếp 15 phút</span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-[10px] uppercase font-extrabold text-emerald-700 block">Lớp phó lao động</span>
            <span className="font-bold text-slate-900 truncate block mt-0.5">
              {realLopPhoLaoDong?.fullName || 'Chưa phân công'}
            </span>
            <span className="text-[10px] text-slate-500 block">Trực nhật & vệ sinh lớp</span>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100">
            <span className="text-[10px] uppercase font-extrabold text-purple-700 block">Bí thư Chi đoàn</span>
            <span className="font-bold text-slate-900 truncate block mt-0.5">
              {realBiThu?.fullName || 'Chưa phân công'}
            </span>
            <span className="text-[10px] text-slate-500 block">Phong trào Đoàn - Đội</span>
          </div>
        </div>
      </div>

      {/* Nav Tabs Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'all', label: 'Tất cả mục' },
          { id: 'general', label: '1. Nhận xét chung (Lớp trưởng)' },
          { id: 'study', label: '2. Học tập' },
          { id: 'discipline', label: '3. Kỷ luật & Trật tự' },
          { id: 'hygiene', label: '4. Lao động & Vệ sinh' },
          { id: 'teams', label: '5. Đánh giá 4 Tổ' },
          { id: 'gvcn', label: '6. Ý kiến GVCN' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === t.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SECTIONS */}
      <div className="space-y-6">
        
        {/* 1. ĐÁNH GIÁ CHUNG CỦA LỚP TRƯỞNG / BAN CÁN SỰ */}
        {(activeTab === 'all' || activeTab === 'general') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Đánh giá chung của Lớp trưởng về tình hình lớp trong tuần
                  </h3>
                  <p className="text-xs text-slate-500">
                    Người phụ trách: <strong>{draft.generalAuthorName || realLopTruong?.fullName || 'Lớp trưởng'}</strong>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {canEditGeneral && (
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('general')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Mẫu gợi ý</span>
                  </button>
                )}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  canEditGeneral ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {canEditGeneral ? 'Được phép nhập/sửa' : 'Chỉ đọc'}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nội dung đánh giá tổng thể nề nếp & thi đua tuần {selectedWeek}:
                </label>
                <textarea
                  rows={4}
                  value={draft.generalAssessment}
                  onChange={(e) => setDraft({ ...draft, generalAssessment: e.target.value })}
                  disabled={!canEditGeneral}
                  placeholder={canEditGeneral 
                    ? "Nhập nhận xét tổng quan của Lớp trưởng về tình hình nề nếp, học tập, thái độ và thi đua của lớp trong tuần..."
                    : "Chưa có nhận xét tổng quan từ Lớp trưởng."}
                  className={`w-full p-3.5 text-sm rounded-xl border transition-all leading-relaxed ${
                    canEditGeneral
                      ? 'bg-white border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Next week goals */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Phương hướng, chỉ tiêu phấn đấu tuần {selectedWeek + 1}:
                  </label>
                  {canEditGeneral && (
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('goals')}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>Gợi ý chỉ tiêu</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={draft.nextWeekGoals}
                  onChange={(e) => setDraft({ ...draft, nextWeekGoals: e.target.value })}
                  disabled={!canEditGeneral}
                  placeholder={canEditGeneral
                    ? "Nêu các mục tiêu cụ thể, biện pháp khắc phục tồn tại tuần qua và chỉ tiêu thi đua tuần tới..."
                    : "Chưa có chỉ tiêu tuần tới."}
                  className={`w-full p-3.5 text-sm rounded-xl border transition-all leading-relaxed ${
                    canEditGeneral
                      ? 'bg-white border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. NHẬN XÉT HỌC TẬP (LỚP PHÓ HỌC TẬP) */}
        {(activeTab === 'all' || activeTab === 'study') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Báo cáo tình hình Học tập (Lớp phó Học tập)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Người phụ trách: <strong>{draft.academicAuthorName || realLopPhoHocTap?.fullName || 'Lớp phó học tập'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canEditAcademic && (
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('academic')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>Mẫu học tập</span>
                  </button>
                )}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  canEditAcademic ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {canEditAcademic ? 'Được phép nhập/sửa' : 'Chỉ đọc'}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nhận xét giờ học, tiết kiểm tra và tinh thần học tập:
                </label>
                <textarea
                  rows={3}
                  value={draft.academicAssessment}
                  onChange={(e) => setDraft({ ...draft, academicAssessment: e.target.value })}
                  disabled={!canEditAcademic}
                  placeholder={canEditAcademic 
                    ? "Ghi nhận số lượng tiết học Tốt, tiết kiểm tra, tinh thần phát biểu xây dựng bài, sự tiến bộ của các bạn..."
                    : "Chưa có nhận xét học tập."}
                  className={`w-full p-3.5 text-sm rounded-xl border transition-all leading-relaxed ${
                    canEditAcademic
                      ? 'bg-white border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tình hình làm bài tập về nhà & chuẩn bị bài:
                </label>
                <input
                  type="text"
                  value={draft.homeworkStatus || ''}
                  onChange={(e) => setDraft({ ...draft, homeworkStatus: e.target.value })}
                  disabled={!canEditAcademic}
                  placeholder={canEditAcademic 
                    ? "VD: 100% các tổ hoàn thành bài tập, Tổ 2 có 1 bạn chưa mang SGK..."
                    : "Chưa ghi nhận."}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border transition-all ${
                    canEditAcademic
                      ? 'bg-white border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. NHẬN XÉT KỶ LUẬT & NỀ NẾP (LỚP PHÓ TRẬT TỰ) */}
        {(activeTab === 'all' || activeTab === 'discipline') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-amber-50/30 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Báo cáo Kỷ luật & Trật tự nề nếp (Lớp phó Trật tự)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Người phụ trách: <strong>{draft.disciplineAuthorName || realLopPhoTratTu?.fullName || 'Lớp phó trật tự'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canEditDiscipline && (
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('discipline')}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mẫu nề nếp</span>
                  </button>
                )}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  canEditDiscipline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {canEditDiscipline ? 'Được phép nhập/sửa' : 'Chỉ đọc'}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Đánh giá nề nếp 15 phút đầu giờ, trật tự trong giờ và đồng phục:
                </label>
                <textarea
                  rows={3}
                  value={draft.disciplineAssessment}
                  onChange={(e) => setDraft({ ...draft, disciplineAssessment: e.target.value })}
                  disabled={!canEditDiscipline}
                  placeholder={canEditDiscipline 
                    ? "Ghi nhận tình hình truy bài 15 phút, trang phục, tác phong, việc chấp hành quy định không dùng điện thoại..."
                    : "Chưa có nhận xét kỷ luật."}
                  className={`w-full p-3.5 text-sm rounded-xl border transition-all leading-relaxed ${
                    canEditDiscipline
                      ? 'bg-white border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Chuyên cần & các trường hợp cần nhắc nhở:
                </label>
                <input
                  type="text"
                  value={draft.attendanceDisciplineStatus || ''}
                  onChange={(e) => setDraft({ ...draft, attendanceDisciplineStatus: e.target.value })}
                  disabled={!canEditDiscipline}
                  placeholder={canEditDiscipline 
                    ? "VD: Cả lớp đi học đầy đủ, đúng giờ. 1 bạn nghỉ học có phép..."
                    : "Chưa ghi nhận."}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border transition-all ${
                    canEditDiscipline
                      ? 'bg-white border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. LAO ĐỘNG & VỆ SINH + PHONG TRÀO */}
        {(activeTab === 'all' || activeTab === 'hygiene') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Vệ sinh */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-emerald-50/50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    4A
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      Lao động & Vệ sinh
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Phụ trách: {draft.hygieneAuthorName || realLopPhoLaoDong?.fullName || 'Lớp phó lao động'}
                    </p>
                  </div>
                </div>
                {canEditHygiene && (
                  <button
                    type="button"
                    onClick={() => applyQuickTemplate('hygiene')}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Mẫu</span>
                  </button>
                )}
              </div>
              <div className="p-4 space-y-3">
                <textarea
                  rows={3}
                  value={draft.hygieneAssessment}
                  onChange={(e) => setDraft({ ...draft, hygieneAssessment: e.target.value })}
                  disabled={!canEditHygiene}
                  placeholder="Ghi nhận công tác trực nhật, vệ sinh phòng học, giữ gìn tài sản chung của lớp..."
                  className={`w-full p-3 text-xs sm:text-sm rounded-xl border transition-all ${
                    canEditHygiene ? 'bg-white border-slate-300 focus:border-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                />
                <input
                  type="text"
                  value={draft.sanitationStatus || ''}
                  onChange={(e) => setDraft({ ...draft, sanitationStatus: e.target.value })}
                  disabled={!canEditHygiene}
                  placeholder="Tổ trực nhật tuần này: VD Tổ 3 hoàn thành tốt..."
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    canEditHygiene ? 'bg-white border-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                />
              </div>
            </div>

            {/* Phong trào Đoàn Đội */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-purple-50/50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                    4B
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      Phong trào Đoàn - Đội
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Phụ trách: {draft.movementAuthorName || realBiThu?.fullName || 'Bí thư Chi đoàn'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  canEditMovement ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {canEditMovement ? 'Được sửa' : 'Chỉ đọc'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <textarea
                  rows={4}
                  value={draft.movementAssessment}
                  onChange={(e) => setDraft({ ...draft, movementAssessment: e.target.value })}
                  disabled={!canEditMovement}
                  placeholder="Ghi nhận hoạt động ngoại khóa, phong trào thi đua của Chi đoàn, văn thể mỹ, thiện nguyện..."
                  className={`w-full p-3 text-xs sm:text-sm rounded-xl border transition-all ${
                    canEditMovement ? 'bg-white border-slate-300 focus:border-purple-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. NHẬN XÉT CỦA TỪNG TỔ TRƯỞNG (TỔ 1, TỔ 2, TỔ 3, TỔ 4, TỔ 5) */}
        {(activeTab === 'all' || activeTab === 'teams') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-amber-50/30 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                  5
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Nhận xét thi đua của từng Tổ trưởng
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phân quyền: Tổ trưởng nào chỉ được nhập và chỉnh sửa cho Tổ của mình
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                4 - 5 Tổ thi đua
              </span>
            </div>

            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map((tmName) => {
                const item = draft.teamAssessments?.[tmName] || {
                  teamName: tmName,
                  authorName: `Tổ trưởng ${tmName}`,
                  content: '',
                  positiveMembers: '',
                  warningMembers: '',
                  rating: 'tot' as const
                };
                const canEditThisTeam = canEditTeam(tmName);
                const teamLeaderStd = students.find(s => s.teamName === tmName && (s.isTeamLeader || s.teamRole === 'to_truong'));
                const summary = teamSummaries.find(t => t.teamName === tmName);

                return (
                  <div 
                    key={tmName} 
                    className={`p-4 rounded-2xl border transition-all ${
                      canEditThisTeam
                        ? 'border-amber-300 bg-amber-50/30 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {tmName}
                        </span>
                        {summary && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {summary.totalScore} điểm
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        canEditThisTeam ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {canEditThisTeam ? 'Quyền sửa: Tổ của bạn' : 'Chỉ xem'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mb-2 flex items-center justify-between">
                      <span>Tổ trưởng: <strong>{teamLeaderStd?.fullName || item.authorName}</strong></span>
                      {canEditThisTeam && (
                        <button
                          type="button"
                          onClick={() => {
                            const newTeams = { ...draft.teamAssessments };
                            newTeams[tmName] = {
                              ...item,
                              content: `Tuần ${selectedWeek}, các thành viên trong ${tmName} tích cực học tập, đạt nhiều điểm tốt. Tinh thần đoàn kết, giúp đỡ nhau trong học tập.`
                            };
                            setDraft({ ...draft, teamAssessments: newTeams });
                          }}
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" /> Mẫu
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <textarea
                          rows={2}
                          value={item.content}
                          onChange={(e) => {
                            const newTeams = { ...draft.teamAssessments };
                            newTeams[tmName] = {
                              ...item,
                              content: e.target.value,
                              authorName: teamLeaderStd?.fullName || item.authorName
                            };
                            setDraft({ ...draft, teamAssessments: newTeams });
                          }}
                          disabled={!canEditThisTeam}
                          placeholder={canEditThisTeam 
                            ? `Nhập nhận xét của Tổ trưởng ${tmName} về các thành viên...`
                            : `Chưa có nhận xét của Tổ trưởng ${tmName}.`}
                          className={`w-full p-2.5 text-xs rounded-xl border transition-all ${
                            canEditThisTeam
                              ? 'bg-white border-amber-300 focus:border-amber-600 text-slate-900'
                              : 'bg-white/60 border-slate-200 text-slate-700 cursor-not-allowed'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-700 mb-0.5">
                            🌟 Khen ngợi, điểm tốt:
                          </label>
                          <input
                            type="text"
                            value={item.positiveMembers || ''}
                            onChange={(e) => {
                              const newTeams = { ...draft.teamAssessments };
                              newTeams[tmName] = { ...item, positiveMembers: e.target.value };
                              setDraft({ ...draft, teamAssessments: newTeams });
                            }}
                            disabled={!canEditThisTeam}
                            placeholder={canEditThisTeam ? "VD: Nam, Hoa điểm 10..." : "Chưa có"}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-rose-700 mb-0.5">
                            ⚠️ Cần khắc phục:
                          </label>
                          <input
                            type="text"
                            value={item.warningMembers || ''}
                            onChange={(e) => {
                              const newTeams = { ...draft.teamAssessments };
                              newTeams[tmName] = { ...item, warningMembers: e.target.value };
                              setDraft({ ...draft, teamAssessments: newTeams });
                            }}
                            disabled={!canEditThisTeam}
                            placeholder={canEditThisTeam ? "VD: Huy quên sách..." : "Chưa có"}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Ý KIẾN CHỈ ĐẠO CỦA GIÁO VIÊN CHỦ NHIỆM */}
        {(activeTab === 'all' || activeTab === 'gvcn') && (
          <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  6
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>Ý kiến nhận xét & Chỉ đạo của Giáo viên chủ nhiệm</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white">
                      GVCN
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Giáo viên: <strong>{teacherName || currentClass?.teacherName || 'Thầy Phong Qui'}</strong>
                  </p>
                </div>
              </div>

              {canEditTeacherFeedback && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(prev => ({
                      ...prev,
                      teacherFeedback: `Thầy ghi nhận và biểu dương sự nỗ lực của Ban cán sự lớp và toàn thể học sinh trong Tuần ${selectedWeek}. Các mục tiêu thi đua cơ bản hoàn thành tốt. Yêu cầu Lớp trưởng và các Tổ trưởng tiếp tục bám sát phương hướng tuần ${selectedWeek + 1}, đặc biệt là nề nếp 15 phút đầu giờ và chuyên cần.`
                    }));
                  }}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-100/70 hover:bg-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ý kiến mẫu GVCN</span>
                </button>
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <textarea
                rows={4}
                value={draft.teacherFeedback || ''}
                onChange={(e) => setDraft({ ...draft, teacherFeedback: e.target.value })}
                disabled={!canEditTeacherFeedback}
                placeholder={canEditTeacherFeedback 
                  ? "Nhập ý kiến chỉ đạo, nhận xét, dặn dò của GVCN gửi tới Ban cán sự và cả lớp..."
                  : (draft.teacherFeedback || "Chưa có ý kiến nhận xét của Giáo viên chủ nhiệm.")}
                className={`w-full p-3.5 text-sm rounded-xl border transition-all leading-relaxed ${
                  canEditTeacherFeedback
                    ? 'bg-white border-indigo-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-slate-900'
                    : 'bg-indigo-50/40 border-indigo-100 text-slate-800'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save / Action Bar */}
      {canEditAny && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-3 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              {saveSuccess ? (
                <strong className="text-emerald-600 font-bold">
                  ✓ Đã lưu nhận xét tuần {selectedWeek} thành công!
                </strong>
              ) : (
                <span>Nhận xét sẽ được đồng bộ và lưu vào hồ sơ thi đua của lớp</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Lưu nháp</span>
            </button>

            {isGVCN ? (
              <button
                type="button"
                onClick={() => handleSave('approved')}
                disabled={saving}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'GVCN Duyệt & Xuất bản'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave('submitted')}
                disabled={saving}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu & Nộp nhận xét'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
