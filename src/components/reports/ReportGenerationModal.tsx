import React, { useState, useEffect, useMemo } from 'react';
import { 
  ReportType, 
  ClassInfo, 
  Student, 
  WeeklyScore, 
  CompetitionEvent, 
  Criterion, 
  Team,
  SavedReport,
  ReportStatistics,
  WeeklyCadreReview
} from '../../types';
import { 
  calculateWeeklyReportStatistics, 
  calculateMonthlyReportStatistics, 
  calculateSemesterReportStatistics, 
  calculateYearReportStatistics 
} from '../../utils/reportCalculations';
import { generateFullReportWithAI, CadreReportContext } from '../../services/aiService';
import { getWeeklyCadreReview, getClassWeeklyCadreReviews } from '../../services/firestoreService';
import { 
  Sparkles, 
  X, 
  Calendar, 
  BarChart2, 
  GraduationCap, 
  School, 
  AlertCircle,
  HelpCircle,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShieldCheck,
  Check
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

  // Cadre review integration states
  const [cadreReviews, setCadreReviews] = useState<WeeklyCadreReview[]>([]);
  const [isLoadingCadre, setIsLoadingCadre] = useState<boolean>(false);
  const [useCadreFeedback, setUseCadreFeedback] = useState<boolean>(true);
  const [showCadreDetails, setShowCadreDetails] = useState<boolean>(false);

  // Load cadre reviews whenever period or class changes
  useEffect(() => {
    if (!isOpen || !classInfo?.classId) return;

    let isMounted = true;
    setIsLoadingCadre(true);

    const loadCadreData = async () => {
      try {
        if (reportType === 'weekly') {
          const rev = await getWeeklyCadreReview(classInfo.classId, targetWeek);
          if (isMounted) {
            setCadreReviews(rev ? [rev] : []);
          }
        } else if (reportType === 'monthly') {
          const allRevs = await getClassWeeklyCadreReviews(classInfo.classId);
          if (isMounted) {
            const matched = allRevs.filter(r => r.weekNumber >= startWeek && r.weekNumber <= endWeek);
            if (matched.length > 0) {
              setCadreReviews(matched);
            } else {
              const weekList: WeeklyCadreReview[] = [];
              for (let w = startWeek; w <= endWeek; w++) {
                const r = await getWeeklyCadreReview(classInfo.classId, w);
                if (r) weekList.push(r);
              }
              if (isMounted) setCadreReviews(weekList);
            }
          }
        } else {
          const allRevs = await getClassWeeklyCadreReviews(classInfo.classId);
          if (isMounted) setCadreReviews(allRevs);
        }
      } catch (err) {
        console.warn('Error fetching cadre reviews for report:', err);
      } finally {
        if (isMounted) setIsLoadingCadre(false);
      }
    };

    loadCadreData();
    return () => { isMounted = false; };
  }, [isOpen, classInfo?.classId, reportType, targetWeek, startWeek, endWeek]);

  // Aggregate cadre reviews into structured context
  const cadreContext = useMemo<CadreReportContext | undefined>(() => {
    if (!useCadreFeedback) return undefined;

    if (reportType === 'weekly') {
      const rev = cadreReviews.find(r => r.weekNumber === targetWeek) || cadreReviews[0];
      if (!rev) return undefined;

      const teamsList = rev.teamAssessments
        ? Object.entries(rev.teamAssessments).map(([tName, item]) => ({
            teamName: item?.teamName || tName,
            authorName: item?.authorName || 'Tổ trưởng',
            content: item?.content || '',
            positiveMembers: item?.positiveMembers || '',
            warningMembers: item?.warningMembers || ''
          }))
        : [];

      return {
        cadreReviews: [rev],
        generalAssessment: rev.generalAssessment,
        academicAssessment: rev.academicAssessment,
        disciplineAssessment: rev.disciplineAssessment,
        hygieneAssessment: rev.hygieneAssessment,
        movementAssessment: rev.movementAssessment,
        treasurerAssessment: rev.treasurerAssessment,
        teamAssessments: teamsList,
        nextWeekGoals: rev.nextWeekGoals,
        teacherFeedback: rev.teacherFeedback,
        teacherFeedbackAuthor: rev.teacherFeedbackAuthor,
        useCadreFeedback: true
      };
    } else {
      // Monthly or multi-week aggregation
      if (cadreReviews.length === 0) return undefined;

      const generalList = cadreReviews.filter(r => r.generalAssessment).map(r => `Tuần ${r.weekNumber}: ${r.generalAssessment}`);
      const academicList = cadreReviews.filter(r => r.academicAssessment).map(r => `Tuần ${r.weekNumber}: ${r.academicAssessment}`);
      const disciplineList = cadreReviews.filter(r => r.disciplineAssessment).map(r => `Tuần ${r.weekNumber}: ${r.disciplineAssessment}`);
      const hygieneList = cadreReviews.filter(r => r.hygieneAssessment).map(r => `Tuần ${r.weekNumber}: ${r.hygieneAssessment}`);
      const movementList = cadreReviews.filter(r => r.movementAssessment).map(r => `Tuần ${r.weekNumber}: ${r.movementAssessment}`);
      const teacherFeedbackList = cadreReviews.filter(r => r.teacherFeedback).map(r => `Tuần ${r.weekNumber}: ${r.teacherFeedback}`);

      const teamAssessments: Array<{ teamName: string; authorName?: string; content: string; positiveMembers: string; warningMembers: string }> = [];
      teams.forEach(t => {
        const teamItems = cadreReviews.map(r => r.teamAssessments?.[t.teamName]).filter(Boolean);
        if (teamItems.length > 0) {
          const contents = teamItems.map(ti => ti.content).filter(Boolean).join('; ');
          const positives = teamItems.map(ti => ti.positiveMembers).filter(Boolean).join(', ');
          const warnings = teamItems.map(ti => ti.warningMembers).filter(Boolean).join(', ');
          teamAssessments.push({
            teamName: t.teamName,
            content: contents,
            positiveMembers: positives,
            warningMembers: warnings
          });
        }
      });

      return {
        cadreReviews,
        generalAssessment: generalList.join(' | '),
        academicAssessment: academicList.join(' | '),
        disciplineAssessment: disciplineList.join(' | '),
        hygieneAssessment: hygieneList.join(' | '),
        movementAssessment: movementList.join(' | '),
        teamAssessments,
        nextWeekGoals: cadreReviews[cadreReviews.length - 1]?.nextWeekGoals,
        teacherFeedback: teacherFeedbackList.join(' | '),
        useCadreFeedback: true
      };
    }
  }, [useCadreFeedback, reportType, targetWeek, cadreReviews, teams]);

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
        extraPrompt,
        cadreContext
      );

      const effectiveTeacherNotes = extraPrompt 
        ? `Lưu ý chỉ đạo của GVCN: ${extraPrompt}` 
        : (cadreContext?.teacherFeedback ? `Chỉ đạo của GVCN: ${cadreContext.teacherFeedback}` : '');

      const newReport: SavedReport = {
        reportId: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        teacherId,
        classId: classInfo?.classId || 'default',
        type: reportType,
        period: periodLabel,
        title: defaultTitle,
        content: generatedContent,
        teacherNotes: effectiveTeacherNotes,
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

          {/* Cadre & Teacher Remarks Reference Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCadreFeedback}
                  onChange={(e) => setUseCadreFeedback(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  3. Tham khảo nhận xét Ban cán sự lớp & GVCN
                </span>
              </label>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Sát thực tế lớp
              </span>
            </div>

            {useCadreFeedback && (
              <div className="space-y-2 pt-1 border-t border-slate-200/60 text-xs">
                {isLoadingCadre ? (
                  <p className="text-slate-400 italic text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 animate-spin text-indigo-500" />
                    Đang đồng bộ nhận xét Ban cán sự và ý kiến GVCN...
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                        {cadreReviews.length > 0 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {reportType === 'weekly' 
                                ? `Đã nạp sổ nhận xét Tuần ${targetWeek} (Lớp trưởng, các Lớp phó, 4 Tổ trưởng & GVCN)`
                                : `Đã tổng hợp ${cadreReviews.length} tuần nhận xét thực tế trong ${monthOption.split(' (')[0]}`
                              }
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>
                              {reportType === 'weekly'
                                ? `Tuần ${targetWeek} chưa có sổ ghi nhận riêng từ Ban cán sự (sẽ dùng dữ liệu chấm điểm thực tế)`
                                : `Chưa có bản ghi nhận xét nào trong khoảng thời gian này`
                              }
                            </span>
                          </>
                        )}
                      </span>
                      {cadreReviews.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowCadreDetails(!showCadreDetails)}
                          className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {showCadreDetails ? 'Thu gọn' : 'Xem chi tiết'}
                          {showCadreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Collapsible preview of cadre and teacher remarks */}
                    {showCadreDetails && cadreReviews.length > 0 && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-[11px] text-slate-700 max-h-48 overflow-y-auto animate-fade-in">
                        {cadreContext?.generalAssessment && (
                          <div>
                            <span className="font-bold text-slate-800">👤 Lớp trưởng / Chung:</span>{' '}
                            <span className="text-slate-600 italic">"{cadreContext.generalAssessment}"</span>
                          </div>
                        )}
                        {cadreContext?.academicAssessment && (
                          <div>
                            <span className="font-bold text-slate-800">📚 LP Học tập:</span>{' '}
                            <span className="text-slate-600 italic">"{cadreContext.academicAssessment}"</span>
                          </div>
                        )}
                        {cadreContext?.disciplineAssessment && (
                          <div>
                            <span className="font-bold text-slate-800">⚖️ LP Kỷ luật & Trật tự:</span>{' '}
                            <span className="text-slate-600 italic">"{cadreContext.disciplineAssessment}"</span>
                          </div>
                        )}
                        {cadreContext?.hygieneAssessment && (
                          <div>
                            <span className="font-bold text-slate-800">🧹 LP Lao động & Vệ sinh:</span>{' '}
                            <span className="text-slate-600 italic">"{cadreContext.hygieneAssessment}"</span>
                          </div>
                        )}
                        {cadreContext?.movementAssessment && (
                          <div>
                            <span className="font-bold text-slate-800">⭐ Bí thư (Đoàn - Đội):</span>{' '}
                            <span className="text-slate-600 italic">"{cadreContext.movementAssessment}"</span>
                          </div>
                        )}
                        {cadreContext?.teamAssessments && cadreContext.teamAssessments.length > 0 && (
                          <div>
                            <span className="font-bold text-slate-800">👥 Tổ trưởng 4 tổ:</span>
                            <div className="pl-2 space-y-0.5 mt-0.5">
                              {cadreContext.teamAssessments.map((t, idx) => (
                                <p key={idx} className="text-slate-600">
                                  • <span className="font-semibold text-slate-700">{t.teamName}:</span> {t.content || 'Nề nếp ổn định'}
                                  {t.positiveMembers ? ` (Khen: ${t.positiveMembers})` : ''}
                                  {t.warningMembers ? ` (Nhắc: ${t.warningMembers})` : ''}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        {cadreContext?.teacherFeedback && (
                          <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                            <span className="font-bold text-amber-900">📝 Ý kiến chỉ đạo từ GVCN đã ghi nhận:</span>{' '}
                            <p className="text-amber-800 italic mt-0.5">"{cadreContext.teacherFeedback}"</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick fill button if teacherFeedback exists and extraPrompt is empty */}
                    {cadreContext?.teacherFeedback && !extraPrompt && (
                      <button
                        type="button"
                        onClick={() => setExtraPrompt(cadreContext.teacherFeedback || '')}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Điền nhanh ý kiến chỉ đạo đã có của GVCN vào ô ghi chú bên dưới
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Teacher custom emphasis */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              4. Yêu cầu hoặc lưu ý riêng từ GVCN (tùy chọn)
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
