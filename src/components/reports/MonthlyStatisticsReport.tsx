import React, { useState, useMemo, useRef } from 'react';
import { 
  Student, 
  CompetitionEvent, 
  Criterion, 
  Team, 
  WeeklyScore, 
  RankCategory,
  ClassInfo 
} from '../../types';
import { 
  calculateRank, 
  DEFAULT_THRESHOLDS, 
  normalizeRankCategory,
  isExcusedAbsent,
  isUnexcusedAbsent,
  isAnyAbsent
} from '../../utils/constants';
import { 
  Calendar, 
  CalendarRange, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  TrendingUp, 
  Users, 
  Sparkles, 
  Eye, 
  Clock, 
  Check, 
  FileText, 
  HelpCircle,
  ChevronDown,
  ArrowUpDown,
  UserCheck,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface MonthlyStatisticsReportProps {
  students: Student[];
  events: CompetitionEvent[];
  criteria: Criterion[];
  teams: Team[];
  allWeeklyScores: WeeklyScore[];
  currentClass: ClassInfo | null;
  teacherName?: string;
  selectedWeek?: number;
}

export interface StudentMonthlyStat {
  student: Student;
  goodDeedsCount: number;
  totalPositiveScore: number;
  positiveCriteriaList: Array<{ name: string; count: number; score: number }>;
  violationsCount: number;
  totalNegativeScore: number;
  violationCriteriaList: Array<{ name: string; count: number; score: number }>;
  absentDays: number;
  lateDays: number;
  weeklyBreakdown: Array<{ week: number; score: number; positive: number; negative: number }>;
  averageScore: number;
  rankCategory: RankCategory;
  stars: number;
  rankNumber: number;
  isConfirmed: boolean;
}

export const MONTH_PRESETS = [
  { month: 9, label: 'Tháng 9', defaultStart: 1, defaultEnd: 4 },
  { month: 10, label: 'Tháng 10', defaultStart: 5, defaultEnd: 8 },
  { month: 11, label: 'Tháng 11', defaultStart: 9, defaultEnd: 12 },
  { month: 12, label: 'Tháng 12', defaultStart: 13, defaultEnd: 16 },
  { month: 1, label: 'Tháng 1', defaultStart: 17, defaultEnd: 20 },
  { month: 2, label: 'Tháng 2', defaultStart: 21, defaultEnd: 24 },
  { month: 3, label: 'Tháng 3', defaultStart: 25, defaultEnd: 28 },
  { month: 4, label: 'Tháng 4', defaultStart: 29, defaultEnd: 32 },
  { month: 5, label: 'Tháng 5', defaultStart: 33, defaultEnd: 35 },
];

function escapeHtml(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const MonthlyStatisticsReport: React.FC<MonthlyStatisticsReportProps> = ({
  students,
  events,
  criteria,
  teams,
  allWeeklyScores,
  currentClass,
  teacherName = 'Giáo viên Chủ nhiệm',
  selectedWeek = 8
}) => {
  // Determine default month from selectedWeek
  const initialMonthPreset = useMemo(() => {
    const found = MONTH_PRESETS.find(p => selectedWeek >= p.defaultStart && selectedWeek <= p.defaultEnd);
    return found || MONTH_PRESETS[0];
  }, [selectedWeek]);

  // Selected Month and Week Range
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonthPreset.month);
  const [startWeek, setStartWeek] = useState<number>(initialMonthPreset.defaultStart);
  const [endWeek, setEndWeek] = useState<number>(initialMonthPreset.defaultEnd);

  // Filters & Sorting
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'number' | 'score_desc' | 'score_asc' | 'violations_desc' | 'positive_desc' | 'absent_desc'>('number');

  // Local student signature confirmations (In-App signing tracker)
  const [confirmedStudents, setConfirmedStudents] = useState<Record<string, boolean>>({});

  // Preview & Printing state
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [selectedStudentForSlip, setSelectedStudentForSlip] = useState<StudentMonthlyStat | null>(null);

  // When changing month preset, update weeks automatically
  const handleSelectMonthPreset = (monthNum: number) => {
    const preset = MONTH_PRESETS.find(p => p.month === monthNum);
    if (preset) {
      setSelectedMonth(preset.month);
      setStartWeek(preset.defaultStart);
      setEndWeek(preset.defaultEnd);
    }
  };

  // Weeks list within selected range
  const weeksInRange = useMemo(() => {
    const list: number[] = [];
    const minW = Math.min(startWeek, endWeek);
    const maxW = Math.max(startWeek, endWeek);
    for (let w = minW; w <= maxW; w++) {
      list.push(w);
    }
    return list;
  }, [startWeek, endWeek]);

  // Month Title Label
  const monthPresetObj = MONTH_PRESETS.find(p => p.month === selectedMonth);
  const periodLabel = `Tháng ${selectedMonth} (Tuần ${Math.min(startWeek, endWeek)} - Tuần ${Math.max(startWeek, endWeek)})`;

  // Filter events within selected weeks range
  const rangeEvents = useMemo(() => {
    const minW = Math.min(startWeek, endWeek);
    const maxW = Math.max(startWeek, endWeek);
    return events.filter(e => e.week >= minW && e.week <= maxW);
  }, [events, startWeek, endWeek]);

  // Attendance criteria helper
  const isAbsentEvent = (e: CompetitionEvent) => {
    const crit = criteria.find(c => c.criterionId === e.criterionId);
    const name = (crit?.name || e.criterionName || '').toLowerCase();
    const code = (crit?.code || '').toUpperCase();
    return (
      crit?.category === 'attendance' && 
      (name.includes('nghỉ') || name.includes('vắng') || code.includes('ABSENT'))
    );
  };

  const isLateEvent = (e: CompetitionEvent) => {
    const crit = criteria.find(c => c.criterionId === e.criterionId);
    const name = (crit?.name || e.criterionName || '').toLowerCase();
    const code = (crit?.code || '').toUpperCase();
    return e.score < 0 && (name.includes('muộn') || name.includes('trễ') || code === 'ON_TIME');
  };

  // Compile statistics per student
  const studentStats: StudentMonthlyStat[] = useMemo(() => {
    const minW = Math.min(startWeek, endWeek);
    const maxW = Math.max(startWeek, endWeek);
    const totalWeeksCount = Math.max(1, maxW - minW + 1);

    // Group weekly scores by studentId
    const scoresByStudent = new Map<string, WeeklyScore[]>();
    allWeeklyScores
      .filter(s => s.week >= minW && s.week <= maxW)
      .forEach(s => {
        const arr = scoresByStudent.get(s.studentId) || [];
        arr.push(s);
        scoresByStudent.set(s.studentId, arr);
      });

    // Group events by studentId
    const eventsByStudent = new Map<string, CompetitionEvent[]>();
    rangeEvents.forEach(e => {
      const arr = eventsByStudent.get(e.studentId) || [];
      arr.push(e);
      eventsByStudent.set(e.studentId, arr);
    });

    const compiled: StudentMonthlyStat[] = students.map(student => {
      const sEvents = eventsByStudent.get(student.studentId) || [];
      const sWeeklyScores = scoresByStudent.get(student.studentId) || [];

      // Positive events (Điểm tốt)
      const positiveEvents = sEvents.filter(e => e.score > 0);
      const totalPositiveScore = positiveEvents.reduce((acc, curr) => acc + curr.score, 0);

      // Group positive criteria
      const posCritMap = new Map<string, { name: string; count: number; score: number }>();
      positiveEvents.forEach(e => {
        const prev = posCritMap.get(e.criterionName) || { name: e.criterionName, count: 0, score: 0 };
        posCritMap.set(e.criterionName, {
          name: e.criterionName,
          count: prev.count + 1,
          score: prev.score + e.score
        });
      });
      const positiveCriteriaList = Array.from(posCritMap.values()).sort((a, b) => b.count - a.count);

      // Negative events (Lỗi vi phạm)
      const negativeEvents = sEvents.filter(e => e.score < 0);
      const totalNegativeScore = Math.abs(negativeEvents.reduce((acc, curr) => acc + curr.score, 0));

      // Group violation criteria
      const negCritMap = new Map<string, { name: string; count: number; score: number }>();
      negativeEvents.forEach(e => {
        const prev = negCritMap.get(e.criterionName) || { name: e.criterionName, count: 0, score: 0 };
        negCritMap.set(e.criterionName, {
          name: e.criterionName,
          count: prev.count + 1,
          score: prev.score + Math.abs(e.score)
        });
      });
      const violationCriteriaList = Array.from(negCritMap.values()).sort((a, b) => b.count - a.count);

      // Absences and Lates (Số ngày nghỉ, số lượt đi muộn)
      const absentDays = sEvents.filter(isAbsentEvent).length;
      const lateDays = sEvents.filter(isLateEvent).length;

      // Weekly score breakdown for all weeks in range
      const weeklyBreakdown = weeksInRange.map(w => {
        const found = sWeeklyScores.find(sc => sc.week === w);
        if (found) {
          return {
            week: w,
            score: found.finalScore,
            positive: found.totalPositive || 0,
            negative: Math.abs(found.totalNegative || 0)
          };
        }
        // If no score recorded for that week, fallback to 100
        return {
          week: w,
          score: 100,
          positive: 0,
          negative: 0
        };
      });

      // Average score in month
      const sumFinalScore = weeklyBreakdown.reduce((acc, curr) => acc + curr.score, 0);
      const averageScore = Math.round((sumFinalScore / totalWeeksCount) * 10) / 10;

      // Rank category based on thresholds (nếu vi phạm trong tháng từ 5 lỗi trở lên: không xếp loại Tốt)
      const rankInfo = calculateRank(averageScore, DEFAULT_THRESHOLDS, {
        violationsCount: negativeEvents.length,
        period: 'month'
      });

      return {
        student,
        goodDeedsCount: positiveEvents.length,
        totalPositiveScore,
        positiveCriteriaList,
        violationsCount: negativeEvents.length,
        totalNegativeScore,
        violationCriteriaList,
        absentDays,
        lateDays,
        weeklyBreakdown,
        averageScore,
        rankCategory: rankInfo.category,
        stars: rankInfo.stars,
        rankNumber: 0, // calculated below
        isConfirmed: !!confirmedStudents[student.studentId]
      };
    });

    // Sort descending by average score to determine rank numbers
    const sortedForRank = [...compiled].sort((a, b) => b.averageScore - a.averageScore);
    sortedForRank.forEach((st, idx) => {
      st.rankNumber = idx + 1;
    });

    return compiled;
  }, [
    students,
    startWeek,
    endWeek,
    weeksInRange,
    rangeEvents,
    allWeeklyScores,
    criteria,
    confirmedStudents
  ]);

  // Class-wide summary KPIs for the month
  const classSummary = useMemo(() => {
    const count = studentStats.length;
    if (count === 0) {
      return {
        totalStudents: 0,
        classAverage: 100,
        totalGoodDeeds: 0,
        totalViolations: 0,
        totalAbsences: 0,
        totalLates: 0,
        leadingTeam: 'Tổ 1',
        rankCounts: {
          'TỐT': 0,
          'KHÁ': 0,
          'ĐẠT': 0,
          'CHƯA ĐẠT': 0,
          'XUẤT SẮC': 0,
          'HOÀN THÀNH TỐT': 0,
          'CẦN CỐ GẮNG': 0,
          'CẦN HỖ TRỢ': 0
        }
      };
    }

    const totalAvg = studentStats.reduce((acc, s) => acc + s.averageScore, 0);
    const classAverage = Math.round((totalAvg / count) * 10) / 10;
    const totalGoodDeeds = studentStats.reduce((acc, s) => acc + s.goodDeedsCount, 0);
    const totalViolations = studentStats.reduce((acc, s) => acc + s.violationsCount, 0);
    const totalAbsences = studentStats.reduce((acc, s) => acc + s.absentDays, 0);
    const totalLates = studentStats.reduce((acc, s) => acc + s.lateDays, 0);

    const rankCounts: Record<string, number> = {
      'TỐT': 0,
      'KHÁ': 0,
      'ĐẠT': 0,
      'CHƯA ĐẠT': 0,
      'XUẤT SẮC': 0,
      'HOÀN THÀNH TỐT': 0,
      'CẦN CỐ GẮNG': 0,
      'CẦN HỖ TRỢ': 0
    };
    studentStats.forEach(s => {
      const norm = normalizeRankCategory(s.rankCategory);
      rankCounts[norm] = (rankCounts[norm] || 0) + 1;
      if (rankCounts[s.rankCategory] !== undefined) {
        rankCounts[s.rankCategory]++;
      }
    });

    // Calculate leading team in month
    const teamScoreMap = new Map<string, { total: number; count: number }>();
    studentStats.forEach(s => {
      const tName = s.student.teamName || 'Tổ 1';
      const prev = teamScoreMap.get(tName) || { total: 0, count: 0 };
      teamScoreMap.set(tName, {
        total: prev.total + s.averageScore,
        count: prev.count + 1
      });
    });

    let leadingTeam = 'Tổ 1';
    let highestTeamAvg = -1;
    teamScoreMap.forEach((val, tName) => {
      const avg = val.count > 0 ? val.total / val.count : 0;
      if (avg > highestTeamAvg) {
        highestTeamAvg = avg;
        leadingTeam = tName;
      }
    });

    return {
      totalStudents: count,
      classAverage,
      totalGoodDeeds,
      totalViolations,
      totalAbsences,
      totalLates,
      leadingTeam,
      rankCounts
    };
  }, [studentStats]);

  // Filter and Sort the list for UI display
  const filteredAndSortedStats = useMemo(() => {
    let result = [...studentStats];

    // Filter by team
    if (selectedTeamFilter !== 'all') {
      result = result.filter(s => s.student.teamName === selectedTeamFilter);
    }

    // Filter by rank category
    if (rankFilter !== 'all') {
      result = result.filter(s => {
        const norm = normalizeRankCategory(s.rankCategory);
        return norm === rankFilter || s.rankCategory === rankFilter;
      });
    }

    // Search by name or student number
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        s.student.fullName.toLowerCase().includes(q) ||
        String(s.student.studentNumber).includes(q) ||
        (s.student.studentCode || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (sortBy) {
      case 'number':
        result.sort((a, b) => a.student.studentNumber - b.student.studentNumber);
        break;
      case 'score_desc':
        result.sort((a, b) => b.averageScore - a.averageScore);
        break;
      case 'score_asc':
        result.sort((a, b) => a.averageScore - b.averageScore);
        break;
      case 'violations_desc':
        result.sort((a, b) => b.violationsCount - a.violationsCount);
        break;
      case 'positive_desc':
        result.sort((a, b) => b.goodDeedsCount - a.goodDeedsCount);
        break;
      case 'absent_desc':
        result.sort((a, b) => b.absentDays - a.absentDays);
        break;
    }

    return result;
  }, [studentStats, selectedTeamFilter, rankFilter, searchQuery, sortBy]);

  // Toggle in-app confirmation
  const handleToggleConfirm = (studentId: string) => {
    setConfirmedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleConfirmAll = () => {
    const updated: Record<string, boolean> = { ...confirmedStudents };
    studentStats.forEach(s => {
      updated[s.student.studentId] = true;
    });
    setConfirmedStudents(updated);
  };

  // --- Export Excel function ---
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Bảng ký xác nhận rèn luyện tháng
    const headerTitle = [
      [`BẢNG TỔNG HỢP KẾT QUẢ THI ĐUA & RÈN LUYỆN ${periodLabel.toUpperCase()}`],
      [`Trường: ${currentClass?.schoolName || 'Trường Phổ Thông'} - Lớp: ${currentClass?.className || 'Lớp học'}`],
      [`Năm học: ${currentClass?.schoolYear || '2026-2027'} - GVCN: ${teacherName}`],
      [`Ngày xuất dữ liệu: ${new Date().toLocaleDateString('vi-VN')}`],
      []
    ];

    const tableHeaders = [
      'STT',
      'Mã HS',
      'Họ và tên',
      'Tổ',
      'Chức vụ',
      'Điểm tốt (+lượt)',
      'Lỗi vi phạm (-lượt)',
      'Số ngày nghỉ (buổi)',
      'Số lần đi muộn',
      ...weeksInRange.map(w => `Tuần ${w}`),
      'ĐTB Tháng',
      'Xếp loại rèn luyện',
      'Trạng thái ký nhận',
      'CHỮ KÝ HỌC SINH',
      'GHI CHÚ / Ý KIẾN'
    ];

    const dataRows = studentStats
      .sort((a, b) => a.student.studentNumber - b.student.studentNumber)
      .map((s, idx) => [
        idx + 1,
        s.student.studentCode || s.student.studentId,
        s.student.fullName,
        s.student.teamName || 'Tổ',
        s.student.cadreRole || 'Học sinh',
        `${s.goodDeedsCount} (+${s.totalPositiveScore}đ)`,
        `${s.violationsCount} (-${s.totalNegativeScore}đ)`,
        s.absentDays,
        s.lateDays,
        ...s.weeklyBreakdown.map(wb => wb.score),
        s.averageScore,
        s.rankCategory,
        s.isConfirmed ? 'Đã ký xác nhận' : 'Chưa ký',
        '', // Cột trống cho học sinh ký tay
        ''
      ]);

    const finalAoa = [...headerTitle, tableHeaders, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(finalAoa);

    // Style column widths
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 12 }, // Mã HS
      { wch: 24 }, // Họ tên
      { wch: 10 }, // Tổ
      { wch: 12 }, // Chức vụ
      { wch: 16 }, // Điểm tốt
      { wch: 16 }, // Lỗi vi phạm
      { wch: 14 }, // Nghỉ học
      { wch: 14 }, // Đi muộn
      ...weeksInRange.map(() => ({ wch: 10 })),
      { wch: 12 }, // ĐTB
      { wch: 18 }, // Xếp loại
      { wch: 16 }, // Trạng thái
      { wch: 22 }, // Chữ ký học sinh
      { wch: 20 }, // Ghi chú
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Thống kê Tháng ${selectedMonth}`);

    // Sheet 2: Tổng quan & Chỉ số lớp
    const summaryRows = [
      ['BÁO CÁO CHỈ SỐ THI ĐUA TOÀN LỚP TRONG THÁNG'],
      ['Chỉ số', 'Giá trị'],
      ['Sĩ số học sinh', classSummary.totalStudents],
      ['Điểm trung bình cả lớp', classSummary.classAverage],
      ['Tổ dẫn đầu tháng', classSummary.leadingTeam],
      ['Tổng số lượt điểm tốt / việc tốt', classSummary.totalGoodDeeds],
      ['Tổng số lượt vi phạm kỷ luật', classSummary.totalViolations],
      ['Tổng số buổi nghỉ học cả lớp', classSummary.totalAbsences],
      ['Tổng số lượt đi muộn', classSummary.totalLates],
      [],
      ['PHÂN BỔ XẾP LOẠI RÈN LUYỆN'],
      ['Xếp loại', 'Điều kiện', 'Số lượng', 'Tỷ lệ %'],
      ['Tốt', 'Điểm TB ≥ 100 và dưới 5 lỗi vi phạm', classSummary.rankCounts['TỐT'], `${Math.round((classSummary.rankCounts['TỐT'] / classSummary.totalStudents) * 100) || 0}%`],
      ['Khá', 'Điểm TB 80 - dưới 100 (hoặc ≥ 100 nhưng có từ 5 lỗi vi phạm)', classSummary.rankCounts['KHÁ'], `${Math.round((classSummary.rankCounts['KHÁ'] / classSummary.totalStudents) * 100) || 0}%`],
      ['Đạt', 'Điểm TB 50 - dưới 80', classSummary.rankCounts['ĐẠT'], `${Math.round((classSummary.rankCounts['ĐẠT'] / classSummary.totalStudents) * 100) || 0}%`],
      ['Chưa đạt', 'Điểm TB dưới 50', classSummary.rankCounts['CHƯA ĐẠT'], `${Math.round((classSummary.rankCounts['CHƯA ĐẠT'] / classSummary.totalStudents) * 100) || 0}%`]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Chỉ số lớp');

    const fileName = `Bang_Ky_Xac_Nhan_Ren_Luyen_Thang_${selectedMonth}_Lop_${currentClass?.className || 'Hoc'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // --- Generate Standalone Printable HTML for Browser Print ---
  const handlePrintRoster = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép popup để xem bản in!');
      return;
    }

    const sortedList = [...studentStats].sort((a, b) => a.student.studentNumber - b.student.studentNumber);

    const tableRowsHtml = sortedList.map((s, idx) => {
      const normCat = normalizeRankCategory(s.rankCategory);
      const badgeColor = 
        normCat === 'TỐT' ? '#15803d' :
        normCat === 'KHÁ' ? '#1d4ed8' :
        normCat === 'ĐẠT' ? '#b45309' : '#b91c1c';

      const weeklyCells = s.weeklyBreakdown.map(w => 
        `<td style="text-align: center; border: 1px solid #334155; font-size: 10pt;">${w.score}</td>`
      ).join('');

      return `
        <tr style="height: 38px;">
          <td style="text-align: center; font-weight: bold; border: 1px solid #334155; font-size: 10.5pt;">${idx + 1}</td>
          <td style="text-align: left; font-weight: bold; padding: 4px 8px; border: 1px solid #334155; font-size: 11pt;">${escapeHtml(s.student.fullName)}</td>
          <td style="text-align: center; border: 1px solid #334155; font-size: 10.5pt;">${escapeHtml(s.student.teamName || 'Tổ')}</td>
          <td style="text-align: center; color: #15803d; font-weight: bold; border: 1px solid #334155; font-size: 10.5pt;">
            ${s.goodDeedsCount > 0 ? `+${s.totalPositiveScore}` : '0'}
          </td>
          <td style="text-align: center; color: #b91c1c; font-weight: bold; border: 1px solid #334155; font-size: 10.5pt;">
            ${s.violationsCount > 0 ? `-${s.totalNegativeScore}` : '0'}
          </td>
          <td style="text-align: center; border: 1px solid #334155; font-weight: bold; font-size: 10.5pt; ${s.absentDays > 0 ? 'color: #b45309;' : ''}">
            ${s.absentDays}
          </td>
          ${weeklyCells}
          <td style="text-align: center; font-weight: bold; border: 1px solid #334155; font-size: 11pt; background-color: #f8fafc;">${s.averageScore}</td>
          <td style="text-align: center; font-weight: bold; color: ${badgeColor}; border: 1px solid #334155; font-size: 10pt;">${s.rankCategory}</td>
          <td style="text-align: center; border: 1px solid #334155; width: 110px;">
            ${s.isConfirmed ? `<span style="font-size: 9pt; color: #047857; font-weight: bold;">Đã ký</span>` : ''}
          </td>
          <td style="border: 1px solid #334155; font-size: 9.5pt; padding: 2px 6px;"></td>
        </tr>
      `;
    }).join('');

    const weeksHeaders = weeksInRange.map(w => 
      `<th style="border: 1px solid #334155; padding: 6px 3px; font-size: 9.5pt; text-align: center; background-color: #f1f5f9;">T${w}</th>`
    ).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Bảng Ký Xác Nhận Rèn Luyện Tháng ${selectedMonth} - Lớp ${escapeHtml(currentClass?.className)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm 10mm 15mm 10mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.3;
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 10px;
    }
    .print-bar {
      position: sticky;
      top: 0;
      background: #1e1b4b;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-radius: 8px;
    }
    .btn-print {
      background: #4f46e5;
      color: #ffffff;
      font-weight: bold;
      padding: 8px 18px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .header-table td {
      border: none;
      vertical-align: top;
    }
    .org-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11pt;
    }
    .national-title {
      font-weight: bold;
      font-size: 11pt;
      text-align: center;
    }
    .national-motto {
      font-weight: bold;
      font-size: 11pt;
      text-align: center;
    }
    .motto-line {
      width: 160px;
      height: 1px;
      background: #000000;
      margin: 3px auto 0;
    }
    .main-title {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 15px;
      margin-bottom: 3px;
    }
    .sub-title {
      text-align: center;
      font-size: 11pt;
      font-style: italic;
      margin-bottom: 12px;
    }
    .roster-table th {
      border: 1px solid #334155;
      background-color: #f1f5f9;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 9.5pt;
      padding: 6px 4px;
      text-align: center;
    }
    .roster-table td {
      border: 1px solid #334155;
      padding: 4px;
    }
    .signatures-table {
      margin-top: 25px;
      page-break-inside: avoid;
    }
    .signatures-table td {
      border: none;
      text-align: center;
      vertical-align: top;
      width: 33.33%;
    }
    .sign-role {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11pt;
    }
    .sign-note {
      font-style: italic;
      font-size: 9.5pt;
      color: #475569;
      margin-bottom: 55px;
    }
    .sign-name {
      font-weight: bold;
      font-size: 11.5pt;
    }
    @media print {
      .print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
      .roster-table th {
        background-color: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <span style="font-weight: bold;">📄 BẢNG KÝ XÁC NHẬN ĐIỂM THI ĐUA & RÈN LUYỆN ${periodLabel.toUpperCase()}</span>
    <button class="btn-print" onclick="window.print()">🖨️ BẤM VÀO ĐÂY ĐỂ IN NGAY</button>
  </div>

  <!-- Quốc hiệu & Đơn vị -->
  <table class="header-table">
    <tr>
      <td style="width: 45%;">
        <div class="org-title">${escapeHtml(currentClass?.schoolName || 'TRƯỜNG PHỔ THÔNG TRUNG HỌC')}</div>
        <div>LỚP: <b>${escapeHtml(currentClass?.className || 'LỚP HỌC')}</b></div>
        <div>Năm học: ${escapeHtml(currentClass?.schoolYear || '2026-2027')}</div>
      </td>
      <td style="width: 55%;">
        <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="national-motto">Độc lập - Tự do - Hạnh phúc</div>
        <div class="motto-line"></div>
      </td>
    </tr>
  </table>

  <!-- Tiêu đề chính -->
  <div class="main-title">BẢNG TỔNG HỢP KẾT QUẢ THI ĐUA VÀ RÈN LUYỆN THÁNG ${selectedMonth}</div>
  <div class="sub-title">
    (Kỳ đánh giá: Từ Tuần ${Math.min(startWeek, endWeek)} đến Tuần ${Math.max(startWeek, endWeek)} - Học sinh ký tên xác nhận)
  </div>

  <!-- Bảng số liệu danh sách học sinh -->
  <table class="roster-table">
    <thead>
      <tr>
        <th style="width: 30px;">STT</th>
        <th>Họ và tên học sinh</th>
        <th style="width: 50px;">Tổ</th>
        <th style="width: 60px;">Điểm tốt (+)</th>
        <th style="width: 60px;">Vi phạm (-)</th>
        <th style="width: 50px;">Nghỉ</th>
        ${weeksHeaders}
        <th style="width: 55px;">ĐTB</th>
        <th style="width: 95px;">Xếp loại</th>
        <th style="width: 110px;">HỌC SINH KÝ TÊN</th>
        <th style="width: 90px;">Ghi chú</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <!-- Thống kê nhanh cuối bảng -->
  <div style="margin-top: 10px; font-size: 10pt; font-style: italic;">
    * Tổng kết tháng: Sĩ số ${classSummary.totalStudents} HS | Điểm TB lớp: ${classSummary.classAverage} điểm | Tổ dẫn đầu: ${classSummary.leadingTeam} | Tốt (≥100đ, &lt;5 lỗi): ${classSummary.rankCounts['TỐT']} HS, Khá (80-&lt;100đ): ${classSummary.rankCounts['KHÁ']} HS, Đạt (50-&lt;80đ): ${classSummary.rankCounts['ĐẠT']} HS, Chưa đạt (&lt;50đ): ${classSummary.rankCounts['CHƯA ĐẠT']} HS.
  </div>

  <!-- Chữ ký 3 bên -->
  <table class="signatures-table">
    <tr>
      <td>
        <div class="sign-role">ĐẠI DIỆN BAN CÁN SỰ</div>
        <div class="sign-note">(Lớp trưởng ký và ghi rõ họ tên)</div>
        <div class="sign-name">Lớp trưởng</div>
      </td>
      <td>
        <div class="sign-role">BAN GIÁM HIỆU DUYỆT</div>
        <div class="sign-note">(Ký và đóng dấu)</div>
      </td>
      <td>
        <div style="font-size: 10pt; font-style: italic; margin-bottom: 2px;">Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</div>
        <div class="sign-role">GIÁO VIÊN CHỦ NHIỆM</div>
        <div class="sign-note">(Ký và ghi rõ họ tên)</div>
        <div class="sign-name">${escapeHtml(teacherName)}</div>
      </td>
    </tr>
  </table>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
    });
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- Print Individual Evaluation Slips ---
  const handlePrintIndividualSlip = (st: StudentMonthlyStat) => {
    setSelectedStudentForSlip(st);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Filter bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-xs font-bold">
              <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
              <span>THỐNG KÊ RÈN LUYỆN THEO THÁNG • XUẤT BẢNG KÝ NHẬN</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Thống Kê Điểm Thi Đua & Xếp Loại Rèn Luyện Tháng
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Tổng hợp điểm tốt, lỗi vi phạm, số ngày nghỉ và xếp loại thi đua trong {weeksInRange.length} tuần. 
              Xuất file bảng danh sách khổ A4 có cột chữ ký xác nhận cho từng học sinh.
            </p>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintRoster}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              title="Mở bản in bảng ký xác nhận khổ A4 ngang"
            >
              <Printer className="w-4 h-4" />
              <span>In Bảng Ký Xác Nhận (A4)</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              title="Tải file Excel đầy đủ 2 Sheet có cột chữ ký học sinh"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* 2. Month Selector & Week Range Customization */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Month Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase shrink-0 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Chọn tháng:</span>
            </span>
            {MONTH_PRESETS.map(preset => {
              const isActive = selectedMonth === preset.month;
              return (
                <button
                  key={preset.month}
                  onClick={() => handleSelectMonthPreset(preset.month)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Week Range Customizer */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs shrink-0">
            <span className="font-semibold text-slate-600">Dải tuần:</span>
            <div className="flex items-center gap-1.5">
              <span>Từ</span>
              <select
                value={startWeek}
                onChange={(e) => setStartWeek(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 outline-none cursor-pointer"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Tuần {w}</option>
                ))}
              </select>

              <span>đến</span>
              <select
                value={endWeek}
                onChange={(e) => setEndWeek(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 outline-none cursor-pointer"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Tuần {w}</option>
                ))}
              </select>
            </div>

            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-[11px] ml-1">
              {weeksInRange.length} tuần
            </span>
          </div>
        </div>
      </div>

      {/* 3. Class KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {/* Card 1: Điểm TB Tháng */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Điểm TB Tháng</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-indigo-700">
              {classSummary.classAverage}
              <span className="text-xs font-normal text-slate-400 ml-1">/ 100đ</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Toàn bộ {classSummary.totalStudents} học sinh
            </p>
          </div>
        </div>

        {/* Card 2: Điểm tốt */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Việc tốt / Điểm tốt</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-700">
              +{classSummary.totalGoodDeeds}
              <span className="text-xs font-normal text-slate-400 ml-1">lượt</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Phát biểu, việc tốt, nỗ lực
            </p>
          </div>
        </div>

        {/* Card 3: Lỗi vi phạm */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Lỗi nề nếp vi phạm</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-700">
              {classSummary.totalViolations}
              <span className="text-xs font-normal text-slate-400 ml-1">lượt</span>
            </div>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">
              Cần khắc phục trong tháng tới
            </p>
          </div>
        </div>

        {/* Card 4: Số ngày nghỉ */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Chuyên cần & Nghỉ học</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-700">
              {classSummary.totalAbsences}
              <span className="text-xs font-normal text-slate-400 ml-1">buổi nghỉ</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {classSummary.totalLates} lượt đi muộn
            </p>
          </div>
        </div>

        {/* Card 5: Tổ dẫn đầu */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tổ dẫn đầu tháng</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-blue-700 truncate">
              {classSummary.leadingTeam}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dẫn đầu phong trào thi đua
            </p>
          </div>
        </div>
      </div>

      {/* 4. Controls: Search, Filter, Confirm All */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên học sinh, STT..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Team Filter */}
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option value="all">Tất cả các tổ</option>
            {teams.map(t => (
              <option key={t.teamId} value={t.teamName}>{t.teamName}</option>
            ))}
          </select>

          {/* Rank Filter */}
          <select
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option value="all">Tất cả xếp loại</option>
            <option value="TỐT">Tốt (ĐTB ≥ 100, &lt; 5 lỗi)</option>
            <option value="KHÁ">Khá (ĐTB 80 - dưới 100)</option>
            <option value="ĐẠT">Đạt (ĐTB 50 - dưới 80)</option>
            <option value="CHƯA ĐẠT">Chưa đạt (ĐTB &lt; 50)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option value="number">Thứ tự STT</option>
            <option value="score_desc">Điểm TB cao nhất</option>
            <option value="score_asc">Điểm TB thấp nhất</option>
            <option value="positive_desc">Nhiều điểm tốt nhất</option>
            <option value="violations_desc">Nhiều vi phạm nhất</option>
            <option value="absent_desc">Nhiều ngày nghỉ nhất</option>
          </select>
        </div>

        {/* Action: Confirm all */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleConfirmAll}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Đánh dấu đã ký cho toàn bộ học sinh"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ký nhanh toàn lớp ({Object.keys(confirmedStudents).length}/{studentStats.length})</span>
          </button>
        </div>
      </div>

      {/* 5. Main Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Bảng Danh Sách Học Sinh Kèm Chữ Ký Xác Nhận ({filteredAndSortedStats.length} học sinh)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Kỳ đánh giá: {periodLabel}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-4 min-w-[180px]">Học sinh</th>
                <th className="py-3 px-3 text-center w-20">Tổ</th>
                <th className="py-3 px-3 text-center w-28">Điểm tốt</th>
                <th className="py-3 px-3 text-center w-28">Lỗi vi phạm</th>
                <th className="py-3 px-3 text-center w-24">Nghỉ học</th>
                {weeksInRange.map(w => (
                  <th key={w} className="py-3 px-2 text-center w-14 text-slate-500 font-bold">
                    T{w}
                  </th>
                ))}
                <th className="py-3 px-3 text-center w-24 bg-indigo-50/50 text-indigo-900 font-black">
                  ĐTB Tháng
                </th>
                <th className="py-3 px-3 text-center w-32">Xếp loại</th>
                <th className="py-3 px-4 text-center w-36">Chữ ký xác nhận</th>
                <th className="py-3 px-3 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredAndSortedStats.map((st, idx) => {
                const normCategory = normalizeRankCategory(st.rankCategory);
                const rankColorClass = {
                  'TỐT': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  'KHÁ': 'bg-blue-100 text-blue-800 border-blue-200',
                  'ĐẠT': 'bg-amber-100 text-amber-800 border-amber-200',
                  'CHƯA ĐẠT': 'bg-rose-100 text-rose-800 border-rose-200',
                  'XUẤT SẮC': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  'HOÀN THÀNH TỐT': 'bg-blue-100 text-blue-800 border-blue-200',
                  'CẦN CỐ GẮNG': 'bg-amber-100 text-amber-800 border-amber-200',
                  'CẦN HỖ TRỢ': 'bg-rose-100 text-rose-800 border-rose-200',
                }[st.rankCategory] || {
                  'TỐT': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  'KHÁ': 'bg-blue-100 text-blue-800 border-blue-200',
                  'ĐẠT': 'bg-amber-100 text-amber-800 border-amber-200',
                  'CHƯA ĐẠT': 'bg-rose-100 text-rose-800 border-rose-200',
                }[normCategory] || 'bg-slate-100 text-slate-800';

                return (
                  <tr key={st.student.studentId} className="hover:bg-slate-50/60 transition-colors">
                    {/* STT */}
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {st.student.studentNumber}
                    </td>

                    {/* Họ và tên */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{st.student.fullName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>Hạng #{st.rankNumber}</span>
                        {st.student.cadreRole && st.student.cadreRole !== 'none' && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                            {st.student.cadreRole}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tổ */}
                    <td className="py-3 px-3 text-center font-semibold text-slate-600">
                      {st.student.teamName || 'Tổ'}
                    </td>

                    {/* Điểm tốt */}
                    <td className="py-3 px-3 text-center">
                      <div className="font-extrabold text-emerald-600">
                        +{st.totalPositiveScore}đ
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {st.goodDeedsCount} lượt
                      </div>
                    </td>

                    {/* Lỗi vi phạm */}
                    <td className="py-3 px-3 text-center">
                      <div className={`font-extrabold ${st.violationsCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {st.violationsCount > 0 ? `-${st.totalNegativeScore}đ` : '0đ'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {st.violationsCount} lỗi
                      </div>
                    </td>

                    {/* Số ngày nghỉ */}
                    <td className="py-3 px-3 text-center">
                      <div className={`font-bold ${st.absentDays > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                        {st.absentDays} buổi
                      </div>
                      {st.lateDays > 0 && (
                        <div className="text-[10px] text-rose-500">
                          {st.lateDays} lần trễ
                        </div>
                      )}
                    </td>

                    {/* Điểm từng tuần */}
                    {st.weeklyBreakdown.map(wb => (
                      <td key={wb.week} className="py-3 px-2 text-center font-semibold text-slate-700">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                          wb.score >= 105 ? 'bg-emerald-50 text-emerald-700 font-bold' :
                          wb.score < 95 ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-700'
                        }`}>
                          {wb.score}
                        </span>
                      </td>
                    ))}

                    {/* ĐTB Tháng */}
                    <td className="py-3 px-3 text-center bg-indigo-50/30">
                      <span className="text-sm font-black text-indigo-700">
                        {st.averageScore}
                      </span>
                    </td>

                    {/* Xếp loại rèn luyện */}
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider inline-block ${rankColorClass}`}>
                        {st.rankCategory}
                      </span>
                    </td>

                    {/* Chữ ký xác nhận */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleConfirm(st.student.studentId)}
                        className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                          st.isConfirmed
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {st.isConfirmed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đã ký nhận</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>Chưa ký</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handlePrintIndividualSlip(st)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Xem phiếu rèn luyện cá nhân"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredAndSortedStats.length === 0 && (
                <tr>
                  <td colSpan={10 + weeksInRange.length} className="py-12 text-center text-slate-400">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Modal Chi tiết Phiếu Cá Nhân */}
      {selectedStudentForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Phiếu Rèn Luyện Cá Nhân - {selectedStudentForSlip.student.fullName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudentForSlip(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between">
                <span>Kỳ đánh giá:</span>
                <strong className="text-slate-900">{periodLabel}</strong>
              </div>
              <div className="flex justify-between">
                <span>Tổ sinh hoạt:</span>
                <strong className="text-slate-900">{selectedStudentForSlip.student.teamName || 'Tổ'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Điểm trung bình tháng:</span>
                <strong className="text-indigo-700 text-sm font-black">{selectedStudentForSlip.averageScore} điểm</strong>
              </div>
              <div className="flex justify-between">
                <span>Xếp loại rèn luyện:</span>
                <strong className="text-emerald-700 font-bold">{selectedStudentForSlip.rankCategory}</strong>
              </div>
              <div className="flex justify-between">
                <span>Số lượt việc tốt:</span>
                <strong className="text-emerald-600">+{selectedStudentForSlip.goodDeedsCount} lượt (+{selectedStudentForSlip.totalPositiveScore}đ)</strong>
              </div>
              <div className="flex justify-between">
                <span>Số lượt vi phạm:</span>
                <strong className="text-rose-600">-{selectedStudentForSlip.violationsCount} lượt (-{selectedStudentForSlip.totalNegativeScore}đ)</strong>
              </div>
              <div className="flex justify-between">
                <span>Số buổi nghỉ học:</span>
                <strong className="text-amber-700">{selectedStudentForSlip.absentDays} buổi</strong>
              </div>
            </div>

            {/* Chi tiết lỗi nếu có */}
            {selectedStudentForSlip.violationCriteriaList.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 block">Các vi phạm cần khắc phục:</span>
                <ul className="text-xs text-rose-700 space-y-1 pl-4 list-disc">
                  {selectedStudentForSlip.violationCriteriaList.map((v, i) => (
                    <li key={i}>{v.name}: {v.count} lần (-{v.score}đ)</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Chữ ký 2 bên */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="text-center">
                <span className="block font-bold text-slate-800">HỌC SINH</span>
                <span className="text-[10px] italic">(Ký xác nhận)</span>
                <div className="mt-8 font-semibold text-slate-900">
                  {selectedStudentForSlip.isConfirmed ? '✓ Đã ký' : '...................'}
                </div>
              </div>
              <div className="text-center">
                <span className="block font-bold text-slate-800">GIÁO VIÊN CHỦ NHIỆM</span>
                <span className="text-[10px] italic">(Ký và xác nhận)</span>
                <div className="mt-8 font-semibold text-slate-900">{teacherName}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedStudentForSlip(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
