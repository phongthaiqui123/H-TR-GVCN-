import React, { useState, useEffect } from 'react';
import { useClassData } from '../hooks/useClassData';
import { 
  Settings, 
  School, 
  ListChecks, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Check, 
  Sparkles,
  Award,
  Save,
  UserCheck,
  User,
  Edit3,
  Database,
  ShieldCheck,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ListOrdered
} from 'lucide-react';
import { Criterion } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ConfirmDeleteDemoModal } from '../components/modals/ConfirmDeleteDemoModal';

export const SettingsPage: React.FC = () => {
  const { 
    classes,
    currentClass, 
    criteria, 
    teacherName,
    updateTeacherName,
    updateClassConfig, 
    updateCriterion, 
    reorderCriterion,
    shiftCriterionStep,
    normalizeAllCriteria,
    addCriterion, 
    deleteCriterion,
    seedFullDemoClasses,
    reloadDemoDataAction,
    deleteDemoDataAction
  } = useClassData();

  // Demo state
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [seedProgress, setSeedProgress] = useState<{ status: string; percent: number } | null>(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [demoMessage, setDemoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Class & Teacher Info form
  const [teacherNameInput, setTeacherNameInput] = useState(teacherName);
  const [schoolName, setSchoolName] = useState(currentClass?.schoolName || localStorage.getItem('gvcn_custom_school_name') || '');
  const [className, setClassName] = useState(currentClass?.className || 'Lớp học');
  const [grade, setGrade] = useState(currentClass?.grade || 'Khối 11');
  const [schoolYear, setSchoolYear] = useState(currentClass?.schoolYear || '2026-2027');
  const [startingScore, setStartingScore] = useState(currentClass?.startingScore || 100);
  const [isSavedClass, setIsSavedClass] = useState(false);

  // Criteria Add/Edit & Reordering state
  const [isAddCritModal, setIsAddCritModal] = useState(false);
  const [newCritName, setNewCritName] = useState('');
  const [newCritDesc, setNewCritDesc] = useState('');
  const [newCritOrder, setNewCritOrder] = useState<number>(criteria.length + 1);
  const [newPositive, setNewPositive] = useState(1);
  const [newNegative, setNewNegative] = useState(-2);
  const [newCategory, setNewCategory] = useState<Criterion['category']>('behavior');
  const [deletingCritId, setDeletingCritId] = useState<string | null>(null);

  // Edit single criterion state
  const [editingCrit, setEditingCrit] = useState<Criterion | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editOrder, setEditOrder] = useState<number>(1);
  const [editPositive, setEditPositive] = useState<number>(1);
  const [editNegative, setEditNegative] = useState<number>(-1);
  const [editCategory, setEditCategory] = useState<Criterion['category']>('behavior');

  // Normalization feedback
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizeSuccessMsg, setNormalizeSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setTeacherNameInput(teacherName);
  }, [teacherName]);

  useEffect(() => {
    if (currentClass) {
      setSchoolName(currentClass.schoolName || localStorage.getItem('gvcn_custom_school_name') || '');
      setClassName(currentClass.className);
      setGrade(currentClass.grade);
      setSchoolYear(currentClass.schoolYear);
      setStartingScore(currentClass.startingScore);
      if (currentClass.teacherName) {
        setTeacherNameInput(currentClass.teacherName);
      }
    }
  }, [currentClass]);

  const handleApplyPrefix = (prefix: 'Cô' | 'Thầy') => {
    let clean = teacherNameInput.trim();
    clean = clean.replace(/^(Cô|Thầy|Thầy giáo|Cô giáo)\s+/i, '');
    setTeacherNameInput(`${prefix} ${clean}`.trim());
  };

  const handleSaveClassInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass) return;

    const trimmedTeacher = teacherNameInput.trim();
    if (trimmedTeacher) {
      await updateTeacherName(trimmedTeacher);
    }

    const trimmedClass = className.trim();
    if (trimmedClass) {
      localStorage.setItem('gvcn_custom_class_name', trimmedClass);
    }

    const trimmedSchool = schoolName.trim();
    localStorage.setItem('gvcn_custom_school_name', trimmedSchool);

    await updateClassConfig(currentClass.classId, {
      teacherName: trimmedTeacher || undefined,
      schoolName: trimmedSchool || undefined,
      className: trimmedClass,
      grade: grade.trim(),
      schoolYear: schoolYear.trim(),
      startingScore: Number(startingScore) || 100,
    });
    setIsSavedClass(true);
    setTimeout(() => setIsSavedClass(false), 2500);
  };

  const handleScoreChange = async (crit: Criterion, posVal: number, negVal: number) => {
    await updateCriterion({
      ...crit,
      positiveScore: posVal,
      negativeScore: negVal
    });
  };

  const handleDirectOrderChange = async (critId: string, newOrder: number) => {
    if (isNaN(newOrder) || newOrder < 1) return;
    await reorderCriterion(critId, newOrder);
    setNormalizeSuccessMsg(`Đã đổi số thứ tự và tự động chuẩn hóa liên tục 1 → ${criteria.length}!`);
    setTimeout(() => setNormalizeSuccessMsg(null), 3000);
  };

  const handleMoveUp = async (critId: string) => {
    await shiftCriterionStep(critId, 'up');
  };

  const handleMoveDown = async (critId: string) => {
    await shiftCriterionStep(critId, 'down');
  };

  const handleNormalizeAll = async () => {
    setIsNormalizing(true);
    try {
      await normalizeAllCriteria();
      setNormalizeSuccessMsg(`Đã chuẩn hóa thành công ${criteria.length} tiêu chí theo thứ tự liên tục 1 → ${criteria.length}, đồng bộ ngay với mục Chấm điểm 1-chạm!`);
      setTimeout(() => setNormalizeSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Error normalizing criteria:', err);
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleOpenEditModal = (crit: Criterion) => {
    setEditingCrit(crit);
    setEditName(crit.name);
    setEditDesc(crit.description || '');
    setEditOrder(crit.order || 1);
    setEditPositive(crit.positiveScore || 0);
    setEditNegative(crit.negativeScore || 0);
    setEditCategory(crit.category || 'behavior');
  };

  const handleSaveEditCrit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCrit || !editName.trim()) return;

    await updateCriterion({
      ...editingCrit,
      name: editName.trim(),
      description: editDesc.trim() || editName.trim(),
      order: Number(editOrder) || 1,
      positiveScore: Number(editPositive) || 0,
      negativeScore: Number(editNegative) || 0,
      category: editCategory
    });

    setEditingCrit(null);
    setNormalizeSuccessMsg(`Đã lưu thay đổi tiêu chí và tự động chuẩn hóa thứ tự liên tục!`);
    setTimeout(() => setNormalizeSuccessMsg(null), 3000);
  };

  const handleAddCriterionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCritName.trim()) return;

    await addCriterion({
      code: `CUSTOM_${Date.now()}`,
      name: newCritName.trim(),
      description: newCritDesc.trim() || newCritName.trim(),
      positiveScore: Number(newPositive) || 0,
      negativeScore: Number(newNegative) || 0,
      order: Number(newCritOrder) || (criteria.length + 1),
      active: true,
      category: newCategory
    });

    setNewCritName('');
    setNewCritDesc('');
    setNewPositive(1);
    setNewNegative(-2);
    setNewCategory('behavior');
    setIsAddCritModal(false);
    setNormalizeSuccessMsg(`Đã thêm tiêu chí mới và tự động chuẩn hóa thứ tự liên tục 1 → ${criteria.length + 1}!`);
    setTimeout(() => setNormalizeSuccessMsg(null), 3000);
  };

  const handleConfirmDeleteCrit = async () => {
    if (deletingCritId) {
      await deleteCriterion(deletingCritId);
      setDeletingCritId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          CÀI ĐẶT LỚP HỌC & TIÊU CHÍ THI ĐUA
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Cấu hình thông tin lớp, chỉnh sửa 12 tiêu chí, điểm cộng/trừ và chuẩn xuất phát thi đua.
        </p>
      </div>

      {/* 1. THÔNG TIN LỚP HỌC & ĐIỂM XUẤT PHÁT */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-base text-slate-800">
              Thông tin lớp học & Giáo viên chủ nhiệm
            </h2>
          </div>
          {isSavedClass && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full">
              <Check className="w-3.5 h-3.5" /> Đã lưu thành công
            </span>
          )}
        </div>

        <form onSubmit={handleSaveClassInfo} className="space-y-4 text-xs sm:text-sm">
          {/* Dedicated Teacher Name row */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Giáo viên chủ nhiệm lớp (GVCN)</span>
              </label>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Thêm nhanh danh xưng:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPrefix('Cô')}
                  className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 transition-colors cursor-pointer"
                >
                  + &quot;Cô&quot;
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPrefix('Thầy')}
                  className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                >
                  + &quot;Thầy&quot;
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                {(teacherNameInput.trim() || 'G').charAt(0).toUpperCase()}
              </div>
              <input
                id="input-settings-teacher-name"
                type="text"
                value={teacherNameInput}
                onChange={(e) => setTeacherNameInput(e.target.value)}
                placeholder="VD: Cô Nguyễn Mai Lan hoặc Thầy Trần Văn An"
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 pl-12">
              Tên giáo viên chủ nhiệm sẽ xuất hiện trong lời chào trang chủ, góc phải thanh tiêu đề, báo cáo xuất gửi Ban Giám Hiệu và sổ liên lạc phụ huynh.
            </p>
          </div>

          {/* Dedicated School Name row */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <label className="font-bold text-slate-800 flex items-center gap-2 mb-2">
              <School className="w-4 h-4 text-indigo-600" />
              <span>Tên trường học</span>
            </label>
            <input
              id="input-settings-school-name"
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="VD: Trường THPT Chuyên Lê Hồng Phong, THCS Chu Văn An..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 shadow-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Tên trường sẽ hiển thị trong tiêu đề hệ thống, báo cáo xuất Excel/PDF thi đua, sổ tay GVCN và mẫu thông báo phụ huynh.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên lớp</label>
              <input
                id="input-settings-class-name"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Khối lớp</label>
              <input
                id="input-settings-grade"
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Năm học</label>
              <input
                id="input-settings-school-year"
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Điểm xuất phát tuần (mặc định 100)
              </label>
              <input
                id="input-settings-starting-score"
                type="number"
                value={startingScore}
                onChange={(e) => setStartingScore(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-indigo-700"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="btn-save-class-settings"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thông tin trường, lớp & GVCN</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. CHỈNH SỬA & SẮP XẾP TIÊU CHÍ THI ĐUA */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-indigo-600" />
              Danh mục Tiêu chí thi đua ({criteria.length} tiêu chí)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Số thứ tự (STT) tự động chuẩn hóa liên tục từ 1 trở lên (1, 2, 3...) và đồng bộ hóa tức thì với mục Chấm điểm 1-chạm.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleNormalizeAll}
              disabled={isNormalizing}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
              title="Đánh lại số thứ tự liên tục từ 1 đến hết"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isNormalizing ? 'animate-spin' : ''}`} />
              <span>Chuẩn hóa STT (1 → {criteria.length})</span>
            </button>

            <button
              onClick={() => {
                setNewCritOrder(criteria.length + 1);
                setIsAddCritModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm tiêu chí mới</span>
            </button>
          </div>
        </div>

        {normalizeSuccessMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{normalizeSuccessMsg}</span>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {criteria.map((crit) => (
            <div
              key={crit.criterionId}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm hover:bg-slate-50/70 px-2 rounded-2xl transition-colors"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {/* Reorder controls */}
                <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                  <button
                    type="button"
                    disabled={crit.order <= 1}
                    onClick={() => handleMoveUp(crit.criterionId)}
                    title="Chuyển lên vị trí trước"
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={crit.order >= criteria.length}
                    onClick={() => handleMoveDown(crit.criterionId)}
                    title="Chuyển xuống vị trí sau"
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* STT Input */}
                <div className="flex items-center shrink-0 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={criteria.length}
                    value={crit.order}
                    onChange={(e) => handleDirectOrderChange(crit.criterionId, parseInt(e.target.value, 10))}
                    className="w-10 h-8 text-center font-black text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    title="Nhấp để đổi số thứ tự (tự động dời và chuẩn hóa 1..N)"
                  />
                </div>

                {/* Criterion Info */}
                <div className="min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{crit.name}</span>
                    {crit.category && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {crit.category === 'study' ? 'Học tập' :
                         crit.category === 'hygiene' ? 'Vệ sinh' :
                         crit.category === 'activity' ? 'Hoạt động' : 'Nề nếp'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5 max-w-md">
                    {crit.description}
                  </div>
                </div>
              </div>

              {/* Action Buttons & Scores */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-emerald-700 font-semibold">Cộng:</span>
                  <input
                    type="number"
                    value={crit.positiveScore}
                    onChange={(e) => handleScoreChange(crit, Number(e.target.value), crit.negativeScore)}
                    className="w-12 px-1.5 py-1 text-center font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-rose-700 font-semibold">Trừ:</span>
                  <input
                    type="number"
                    value={crit.negativeScore}
                    onChange={(e) => handleScoreChange(crit, crit.positiveScore, Number(e.target.value))}
                    className="w-12 px-1.5 py-1 text-center font-black text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(crit)}
                  title="Chỉnh sửa tiêu chí"
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {criteria.length > 5 && (
                  <button
                    onClick={() => setDeletingCritId(crit.criterionId)}
                    title="Xóa tiêu chí này"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. QUẢN LÝ DỮ LIỆU MẪU (DEMO DATA - 45 HỌC SINH/LỚP) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Database className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-base text-slate-900">
                Dữ liệu mẫu cho GVCN SMART CLASS (45 Học sinh/Lớp)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
              Tạo bộ dữ liệu mô phỏng thực tế <strong>2 lớp mẫu (12A1 & 12A2)</strong>, mỗi lớp <strong>đúng 45 học sinh</strong> (tổng 90 học sinh), chia <strong>5 tổ/lớp</strong>, <strong>8 tuần lịch sử thi đua</strong> với phân bố tự nhiên (tiến bộ, giảm điểm, ổn định, cần quan tâm) và đánh số mã học sinh rõ ràng: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700">12A1-001 → 12A1-045</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700">12A2-001 → 12A2-045</code>.
            </p>
          </div>

          {/* Nhóm nút chức năng quản lý demo */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              disabled={isSeedingDemo}
              onClick={async () => {
                setIsSeedingDemo(true);
                setDemoMessage(null);
                setSeedProgress({ status: 'Bắt đầu khởi tạo 90 học sinh / 2 lớp...', percent: 10 });
                try {
                  const res = await seedFullDemoClasses((status, percent) => {
                    setSeedProgress({ status, percent });
                  });
                  setDemoMessage({
                    type: 'success',
                    text: `Đã nạp thành công 2 lớp mẫu (12A1 & 12A2, 90 học sinh, 10 tổ, 8 tuần). ${res?.integritySummary || 'Toàn vẹn 100%!'}`,
                  });
                } catch (err: any) {
                  setDemoMessage({
                    type: 'error',
                    text: 'Có lỗi xảy ra khi tạo dữ liệu mẫu: ' + (err?.message || 'Không thể kết nối'),
                  });
                } finally {
                  setIsSeedingDemo(false);
                  setSeedProgress(null);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isSeedingDemo ? 'animate-spin' : ''}`} />
              <span>{isSeedingDemo ? 'Đang xử lý...' : 'Tạo dữ liệu mẫu (90 HS)'}</span>
            </button>

            <button
              type="button"
              disabled={isSeedingDemo}
              onClick={async () => {
                setIsSeedingDemo(true);
                setDemoMessage(null);
                setSeedProgress({ status: 'Đang làm mới toàn bộ 90 học sinh...', percent: 10 });
                try {
                  const res = await reloadDemoDataAction((status, percent) => {
                    setSeedProgress({ status, percent });
                  });
                  setDemoMessage({
                    type: 'success',
                    text: `Đã làm mới sạch sẽ 2 lớp mẫu (12A1 & 12A2, 90 học sinh, 8 tuần). ${res?.integritySummary || 'Toàn vẹn 100%!'}`,
                  });
                } catch (err: any) {
                  setDemoMessage({
                    type: 'error',
                    text: 'Có lỗi xảy ra khi làm mới: ' + (err?.message || 'Không thể kết nối'),
                  });
                } finally {
                  setIsSeedingDemo(false);
                  setSeedProgress(null);
                }
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Xóa và sinh lại toàn bộ dữ liệu mẫu ban đầu"
            >
              <RotateCcw className={`w-4 h-4 text-slate-600 ${isSeedingDemo ? 'animate-spin' : ''}`} />
              <span>Làm mới mẫu</span>
            </button>

            <button
              type="button"
              disabled={isSeedingDemo}
              onClick={() => setIsConfirmDeleteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-rose-300 hover:bg-rose-50/70 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Xóa dữ liệu mẫu</span>
            </button>
          </div>
        </div>

        {/* Thanh tiến trình khi nạp dữ liệu */}
        {seedProgress && (
          <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/90 rounded-2xl space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                {seedProgress.status}
              </span>
              <span className="font-mono">{seedProgress.percent}%</span>
            </div>
            <div className="w-full h-2 bg-indigo-200/60 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${seedProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Thông báo kết quả thao tác demo nếu có */}
        {demoMessage && (
          <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            demoMessage.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {demoMessage.type === 'success' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{demoMessage.text}</span>
          </div>
        )}

        {/* Cam kết an toàn & Thông tin dữ liệu demo hiện tại */}
        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Hiện trạng dữ liệu mẫu trong hệ thống:
            </div>
            <div>
              {classes.filter(c => c.isDemo || c.className === '12A1' || c.className === '12A2').length > 0 ? (
                <span className="text-emerald-700 font-semibold">
                  Đang có {classes.filter(c => c.isDemo || c.className === '12A1' || c.className === '12A2').length} lớp demo ({classes.filter(c => c.isDemo || c.className === '12A1' || c.className === '12A2').map(c => c.className).join(', ')}) với 45 HS/lớp.
                </span>
              ) : (
                <span className="text-slate-500">
                  Chưa có lớp dữ liệu mẫu nào. Bấm &ldquo;Tạo dữ liệu mẫu&rdquo; để nạp nhanh.
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-800 space-y-1">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Cam kết an toàn dữ liệu:
            </div>
            <p className="text-slate-600">
              Việc xóa dữ liệu mẫu <strong>tuyệt đối KHÔNG xóa dữ liệu thật</strong> do thầy cô nhập. Hệ thống chỉ xử lý các tài liệu mang cờ <code className="font-mono bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded">isDemo: true</code>.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: THÊM TIÊU CHÍ MỚI */}
      <Modal
        isOpen={isAddCritModal}
        onClose={() => setIsAddCritModal(false)}
        title="Thêm tiêu chí thi đua mới"
      >
        <form onSubmit={handleAddCriterionSubmit} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">
                Số thứ tự (STT) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={criteria.length + 1}
                required
                value={newCritOrder}
                onChange={(e) => setNewCritOrder(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-black text-indigo-700 text-center"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Phân nhóm tiêu chí
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as Criterion['category'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                <option value="behavior">Nề nếp / Kỷ luật</option>
                <option value="study">Học tập / Bài vở</option>
                <option value="hygiene">Vệ sinh / Trực nhật</option>
                <option value="activity">Hoạt động / Phong trào</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tên tiêu chí thi đua <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newCritName}
              onChange={(e) => setNewCritName(e.target.value)}
              placeholder="Ví dụ: Tham gia văn nghệ tích cực"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mô tả hành vi cụ thể</label>
            <input
              type="text"
              value={newCritDesc}
              onChange={(e) => setNewCritDesc(e.target.value)}
              placeholder="Ví dụ: Tích cực đóng góp tiết mục cho lớp..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Điểm cộng (+)</label>
              <input
                type="number"
                value={newPositive}
                onChange={(e) => setNewPositive(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Điểm trừ (-)</label>
              <input
                type="number"
                value={newNegative}
                onChange={(e) => setNewNegative(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none font-bold text-rose-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddCritModal(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
            >
              Thêm tiêu chí
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CHỈNH SỬA TIÊU CHÍ */}
      <Modal
        isOpen={!!editingCrit}
        onClose={() => setEditingCrit(null)}
        title={`Chỉnh sửa tiêu chí thi đua (STT #${editOrder})`}
      >
        <form onSubmit={handleSaveEditCrit} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">
                Số thứ tự (STT) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={criteria.length}
                required
                value={editOrder}
                onChange={(e) => setEditOrder(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-black text-indigo-700 text-center"
              />
              <p className="text-[10px] text-slate-400 mt-1 text-center">Tự động dời & chuẩn hóa 1..N</p>
            </div>

            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Phân nhóm tiêu chí
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as Criterion['category'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                <option value="behavior">Nề nếp / Kỷ luật</option>
                <option value="study">Học tập / Bài vở</option>
                <option value="hygiene">Vệ sinh / Trực nhật</option>
                <option value="activity">Hoạt động / Phong trào</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tên tiêu chí thi đua <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mô tả hành vi cụ thể</label>
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Điểm cộng (+)</label>
              <input
                type="number"
                value={editPositive}
                onChange={(e) => setEditPositive(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Điểm trừ (-)</label>
              <input
                type="number"
                value={editNegative}
                onChange={(e) => setEditNegative(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none font-bold text-rose-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingCrit(null)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
            >
              Lưu thay đổi & Chuẩn hóa STT
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DIALOG: XÓA TIÊU CHÍ */}
      <ConfirmDialog
        isOpen={!!deletingCritId}
        onClose={() => setDeletingCritId(null)}
        onConfirm={handleConfirmDeleteCrit}
        title="Xóa tiêu chí thi đua"
        message="Bạn có chắc muốn xóa tiêu chí này? Hành vi này không làm mất các sự kiện đã ghi nhận trước đó."
        confirmText="Xóa tiêu chí"
      />

      {/* CONFIRM MODAL: XÓA DỮ LIỆU MẪU */}
      <ConfirmDeleteDemoModal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => setIsConfirmDeleteModalOpen(false)}
        onSuccess={(stats) => {
          setDemoMessage({
            type: 'success',
            text: `Đã dọn dẹp an toàn ${stats.deletedClasses} lớp mẫu, ${stats.deletedStudents} hồ sơ học sinh và ${stats.deletedScores + stats.deletedEvents} điểm số/sự kiện mẫu. Toàn bộ dữ liệu thật được bảo vệ nguyên vẹn!`,
          });
        }}
      />
    </div>
  );
};
