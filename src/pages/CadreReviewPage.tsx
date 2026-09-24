import React, { useState } from 'react';
import { 
  FileText, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Users, 
  Sparkles,
  ShieldAlert,
  Award
} from 'lucide-react';
import { useClassData } from '../hooks/useClassData';
import { useAuth } from '../hooks/useAuth';
import { WeeklyCadreReviewSection } from '../components/cadre/WeeklyCadreReviewSection';

export const CadreReviewPage: React.FC = () => {
  const { 
    currentClass, 
    selectedWeek, 
    setSelectedWeek, 
    students,
    teamSummaries,
    weeklyCadreReview,
    cadreReviewLoading
  } = useClassData();
  const { roleSession } = useAuth();
  const [showPrintModal, setShowPrintModal] = useState(false);

  const isCadreOrTeacher = roleSession.category === 'gvcn' || roleSession.category === 'cadre' || roleSession.category === 'to_truong';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Header & Week Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              NHẬN XÉT CỦA BAN CÁN SỰ LỚP
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Báo cáo đánh giá tình hình nề nếp, học tập, kỷ luật & phong trào lớp {currentClass?.className || 'chủ nhiệm'}
          </p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
              disabled={selectedWeek <= 1}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-xs sm:text-sm text-indigo-950">
              Tuần {selectedWeek}
            </span>

            <button
              type="button"
              onClick={() => setSelectedWeek(Math.min(35, selectedWeek + 1))}
              disabled={selectedWeek >= 35}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Tuần tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">In báo cáo</span>
          </button>
        </div>
      </div>

      {/* Week Context Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Trạng thái</span>
          <div className="mt-1 flex items-center gap-1.5">
            {weeklyCadreReview?.status === 'approved' ? (
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã duyệt
              </span>
            ) : weeklyCadreReview?.status === 'submitted' ? (
              <span className="text-xs font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                Đã nộp • Chờ duyệt
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Đang ghi nhận
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Quyền của bạn</span>
          <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
            {roleSession.title}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sĩ số lớp</span>
          <span className="text-xs sm:text-sm font-bold text-indigo-700 mt-1 block">
            {students.length} học sinh
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Xếp hạng tổ</span>
          <span className="text-xs sm:text-sm font-bold text-emerald-700 mt-1 block">
            {teamSummaries.length > 0 ? `${teamSummaries[0]?.teamName} dẫn đầu` : '4 tổ thi đua'}
          </span>
        </div>
      </div>

      {/* Main Review Section Component */}
      <WeeklyCadreReviewSection onPrint={handlePrint} />
    </div>
  );
};
