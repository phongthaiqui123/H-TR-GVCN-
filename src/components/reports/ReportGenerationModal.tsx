import React, { useState } from 'react';
import { 
  ReportType, 
  ClassInfo, 
  Student, 
  WeeklyScore, 
  CompetitionEvent, 
  Criterion, 
  Team,
  SavedReport,
  ReportStatistics
} from '../../types';
import { 
  calculateWeeklyReportStatistics, 
  calculateMonthlyReportStatistics, 
  calculateSemesterReportStatistics, 
  calculateYearReportStatistics 
} from '../../utils/reportCalculations';
import { generateFullReportWithAI } from '../../services/aiService';
import { 
  Sparkles, 
  X, 
  Calendar, 
  BarChart2, 
  GraduationCap, 
  School, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ReportType;
  classInfo: ClassInfo | null;
  teacherId: string;
  selectedWeek: number;
  students: Student[];
  allWeeklyScores: WeeklyScore[];
  events: CompetitionEvent[];
  criteria: Criterion[];
  teams: Team[];
  onReportGenerated: (report: SavedReport) => void;
}

export const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({
  isOpen,
  onClose,
  initialType = 'weekly',
  classInfo,
  teacherId,
  selectedWeek,
  students,
  allWeeklyScores,
  events,
  criteria,
  teams,
  onReportGenerated
}) => {
  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [targetWeek, setTargetWeek] = useState<number>(selectedWeek);
  
  // Monthly parameters
  const [monthOption, setMonthOption] = useState<string>('Tháng 9 (Tuần 1 - 4)');
  const [startWeek, setStartWeek] = useState<number>(1);
  const [endWeek, setEndWeek] = useState<number>(4);

  // Semester parameter
  const [semester, setSemester] = useState<number>(1);

  // Year parameter
  const [schoolYear, setSchoolYear] = useState<string>(classInfo?.schoolYear || '2026-2027');

  // Teacher customized input
  const [extraPrompt, setExtraPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSelectMonth = (val: string) => {
    setMonthOption(val);
    if (val.includes('Tháng 9')) { setStartWeek(1); setEndWeek(4); }
    else if (val.includes('Tháng 10')) { setStartWeek(5); setEndWeek(8); }
    else if (val.includes('Tháng 11')) { setStartWeek(9); setEndWeek(12); }
    else if (val.includes('Tháng 12')) { setStartWeek(13); setEndWeek(16); }
    else if (val.includes('Tháng 1')) { setStartWeek(17); setEndWeek(20); }
    else if (val.includes('Tháng 2')) { setStartWeek(21); setEndWeek(24); }
    else if (val.includes('Tháng 3')) { setStartWeek(25); setEndWeek(28); }
    else if (val.includes('Tháng 4')) { setStartWeek(29); setEndWeek(32); }
    else if (val.includes('Tháng 5')) { setStartWeek(33); setEndWeek(35); }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg('');

    try {
      let stats: ReportStatistics;
      let periodLabel = '';
      let defaultTitle = '';

      if (reportType === 'weekly') {
        periodLabel = `Tuần ${targetWeek}`;
        defaultTitle = `BÁO CÁO CÔNG TÁC CHỦ NHIỆM TUẦN ${targetWeek} - LỚP ${classInfo?.className || ''}`;
        stats = calculateWeeklyReportStatistics(
          classInfo,
          students,
          allWeeklyScores,
          targetWeek,
          events,
          criteria,
          teams
        );
      } else if (reportType === 'monthly') {
        const mLabel = monthOption.split(' (')[0];
        periodLabel = `${mLabel} (Tuần ${startWeek} - ${endWeek})`;
        defaultTitle = `BÁO CÁO TỔNG KẾT THI ĐUA ${mLabel.toUpperCase()} - LỚP ${classInfo?.className || ''}`;
        stats = calculateMonthlyReportStatistics(
          classInfo,
          students,
          allWeeklyScores,
          startWeek,
          endWeek,
          events,
          criteria,
          teams,
          mLabel
        );
      } else if (reportType === 'semester') {
        periodLabel = `Học kỳ ${semester}`;
        defaultTitle = `BÁO CÁO SƠ KẾT CÔNG TÁC CHỦ NHIỆM HỌC KỲ ${semester} - LỚP ${classInfo?.className || ''}`;
        stats = calculateSemesterReportStatistics(
          classInfo,
          students,
          allWeeklyScores,
          semester,
          events,
          criteria,
          teams
        );
      } else {
        periodLabel = `Năm học ${schoolYear}`;
        defaultTitle = `BÁO CÁO TỔNG KẾT NĂM HỌC ${schoolYear} - LỚP ${classInfo?.className || ''}`;
        stats = calculateYearReportStatistics(
          classInfo,
          students,
          allWeeklyScores,
          schoolYear,
          events,
          criteria,
          teams
        );
      }

      // Generate pedagogical content narrative via Gemini
      const generatedContent = await generateFullReportWithAI(
        reportType,
        periodLabel,
        classInfo,
        stats,
        extraPrompt
      );

      const newReport: SavedReport = {
        reportId: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        teacherId,
        classId: classInfo?.classId || 'default',
        type: reportType,
        period: periodLabel,
        title: defaultTitle,
        content: generatedContent,
        teacherNotes: extraPrompt ? `Lưu ý chỉ đạo của GVCN: ${extraPrompt}` : '',
        statistics: stats,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByAI: true,
        status: 'draft'
      };

      onReportGenerated(newReport);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi tạo báo cáo. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-scale-in my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                TẠO BÁO CÁO CÔNG TÁC CHỦ NHIỆM
              </h2>
              <p className="text-xs text-slate-500">
                Lớp {classInfo?.className || 'Lớp học'} • Năm học {classInfo?.schoolYear || '2026-2027'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Type Selector */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Chọn loại báo cáo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setReportType('weekly')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  reportType === 'weekly'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold">Tuần</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('monthly')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  reportType === 'monthly'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold">Tháng</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('semester')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  reportType === 'semester'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold">Học kỳ</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('year')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  reportType === 'year'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <School className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold">Cuối năm</span>
              </button>
            </div>
          </div>

          {/* Time & Period Parameters */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Xác định thời gian báo cáo
            </label>

            {reportType === 'weekly' && (
              <div>
                <span className="text-xs text-slate-500 block mb-1.5 font-medium">Chọn tuần cần lập báo cáo:</span>
                <select
                  value={targetWeek}
                  onChange={(e) => setTargetWeek(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Tuần {w} {w === selectedWeek ? '(Tuần hiện tại)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'monthly' && (
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-slate-500 block mb-1.5 font-medium">Chọn tháng báo cáo:</span>
                  <select
                    value={monthOption}
                    onChange={(e) => handleSelectMonth(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Tháng 9 (Tuần 1 - 4)">Tháng 9 (Tuần 1 đến 4)</option>
                    <option value="Tháng 10 (Tuần 5 - 8)">Tháng 10 (Tuần 5 đến 8)</option>
                    <option value="Tháng 11 (Tuần 9 - 12)">Tháng 11 (Tuần 9 đến 12)</option>
                    <option value="Tháng 12 (Tuần 13 - 16)">Tháng 12 (Tuần 13 đến 16)</option>
                    <option value="Tháng 1 (Tuần 17 - 20)">Tháng 1 (Tuần 17 đến 20)</option>
                    <option value="Tháng 2 (Tuần 21 - 24)">Tháng 2 (Tuần 21 đến 24)</option>
                    <option value="Tháng 3 (Tuần 25 - 28)">Tháng 3 (Tuần 25 đến 28)</option>
                    <option value="Tháng 4 (Tuần 29 - 32)">Tháng 4 (Tuần 29 đến 32)</option>
                    <option value="Tháng 5 (Tuần 33 - 35)">Tháng 5 (Tuần 33 đến 35)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Từ tuần:</span>
                    <input
                      type="number"
                      min={1}
                      max={35}
                      value={startWeek}
                      onChange={(e) => setStartWeek(Number(e.target.value))}
                      className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500">Đến tuần:</span>
                    <input
                      type="number"
                      min={startWeek}
                      max={35}
                      value={endWeek}
                      onChange={(e) => setEndWeek(Number(e.target.value))}
                      className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {reportType === 'semester' && (
              <div>
                <span className="text-xs text-slate-500 block mb-1.5 font-medium">Chọn học kỳ:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSemester(1)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      semester === 1
                        ? 'border-indigo-600 bg-white text-indigo-700 shadow-xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Học kỳ 1 (Tuần 1 - 18)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSemester(2)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      semester === 2
                        ? 'border-indigo-600 bg-white text-indigo-700 shadow-xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Học kỳ 2 (Tuần 19 - 35)
                  </button>
                </div>
              </div>
            )}

            {reportType === 'year' && (
              <div>
                <span className="text-xs text-slate-500 block mb-1.5 font-medium">Năm học:</span>
                <input
                  type="text"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            )}
          </div>

          {/* Teacher custom emphasis */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              3. Yêu cầu hoặc lưu ý riêng từ GVCN (tùy chọn)
            </label>
            <textarea
              rows={3}
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
              placeholder="Ví dụ: Nhấn mạnh sự tiến bộ của Tổ 3 trong đợt thi đua 20/11; lưu ý nhắc nhở một số bạn còn quên vở bài tập..."
              className="w-full text-xs text-slate-800 border border-slate-200 rounded-2xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Pedagogical Principle Notice */}
          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              Hệ thống sẽ tính toán 100% số liệu (sĩ số, điểm TB, tỷ lệ chuyên cần, xếp hạng tổ) trực tiếp từ dữ liệu thi đua, sau đó AI hỗ trợ diễn giải văn phong hành chính sư phạm. Thầy/Cô toàn quyền duyệt và sửa đổi trước khi xuất bản.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Đang tổng hợp & soạn thảo...' : '✨ Bắt đầu tạo báo cáo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
