import React, { useState, useMemo } from 'react';
import { 
  Student, 
  CompetitionEvent, 
  Criterion, 
  Team 
} from '../../types';
import { batchAddCompetitionEvents } from '../../services/firestoreService';
import { 
  AlertTriangle, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  CheckCircle2, 
  MessageSquare,
  Clock,
  Sparkles,
  ChevronDown,
  X,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface StudentViolationsReportProps {
  students: Student[];
  events: CompetitionEvent[];
  criteria: Criterion[];
  teams: Team[];
  selectedWeek: number;
  classId?: string;
  className?: string;
  schoolName?: string;
  teacherName?: string;
  onSelectWeek?: (week: number) => void;
}

export interface StudentViolationGroup {
  criterionId: string;
  criterionName: string;
  count: number; // Số lượt vi phạm
  penaltyPerTime: number; // Mức điểm trừ mỗi lượt
  totalPenalty: number; // Tổng điểm trừ
  dates: string[];
  notes: string[];
}

export interface StudentViolationSummary {
  student: Student;
  totalViolationsCount: number; // Tổng số lượt vi phạm
  totalPenaltyPoints: number; // Tổng điểm trừ
  violationsList: StudentViolationGroup[];
}

export const StudentViolationsReport: React.FC<StudentViolationsReportProps> = ({
  students,
  events,
  criteria,
  teams,
  selectedWeek,
  classId,
  className = '11A9',
  schoolName = 'Trường THPT Phan Văn Trị',
  teacherName = 'Qui Thái Phong',
  onSelectWeek
}) => {
  // Filters
  const [filterWeek, setFilterWeek] = useState<number | 'all'>(selectedWeek);
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyViolations, setOnlyViolations] = useState<boolean>(true);
  const [seedingLoading, setSeedingLoading] = useState(false);

  // Copy status
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Individual modal preview for printing slip
  const [selectedStudentForSlip, setSelectedStudentForSlip] = useState<StudentViolationSummary | null>(null);

  // Seed sample violations for instant testing
  const handleSeedSampleViolations = async () => {
    if (!classId || students.length === 0 || criteria.length === 0) return;
    setSeedingLoading(true);
    try {
      const sampleCrit = criteria.filter(c => c.negativeScore < 0 || c.type === 'negative');
      if (sampleCrit.length === 0) return;

      const weekNum = typeof filterWeek === 'number' ? filterWeek : selectedWeek;
      const targetStudents = students.slice(0, 10);
      const newEvents: CompetitionEvent[] = [];

      targetStudents.forEach((st, idx) => {
        const crit1 = sampleCrit[idx % sampleCrit.length];
        const crit2 = sampleCrit[(idx + 2) % sampleCrit.length];
        
        newEvents.push({
          eventId: `evt_sample_${Date.now()}_${idx}_1`,
          classId,
          teacherId: st.teacherId || 'teacher_default',
          studentId: st.studentId,
          studentName: st.fullName,
          studentTeamName: st.teamName,
          teamName: st.teamName,
          criterionId: crit1.criterionId,
          criterionName: crit1.name,
          week: weekNum,
          date: new Date().toISOString().split('T')[0],
          score: crit1.negativeScore || -10,
          scoreChange: crit1.negativeScore || -10,
          type: 'negative',
          createdAt: new Date().toISOString(),
          note: idx % 2 === 0 ? 'Vi phạm tiết truy bài đầu giờ' : 'Chưa nghiêm túc trong giờ học',
          evaluatorName: teacherName,
          evaluatorRole: 'Giáo viên chủ nhiệm'
        });

        if (idx % 2 === 0) {
          newEvents.push({
            eventId: `evt_sample_${Date.now()}_${idx}_2`,
            classId,
            teacherId: st.teacherId || 'teacher_default',
            studentId: st.studentId,
            studentName: st.fullName,
            studentTeamName: st.teamName,
            teamName: st.teamName,
            criterionId: crit2.criterionId,
            criterionName: crit2.name,
            week: weekNum,
            date: new Date().toISOString().split('T')[0],
            score: crit2.negativeScore || -5,
            scoreChange: crit2.negativeScore || -5,
            type: 'negative',
            createdAt: new Date().toISOString(),
            note: 'Tổ trưởng ghi nhận trong sổ theo dõi',
            evaluatorName: 'Tổ trưởng',
            evaluatorRole: 'Tổ trưởng'
          });
        }
      });

      await batchAddCompetitionEvents(newEvents, classId, weekNum);
      window.location.reload();
    } catch (err) {
      console.warn('Seed violations error:', err);
    } finally {
      setSeedingLoading(false);
    }
  };

  // Criteria lookup map
  const criteriaMap = useMemo(() => {
    const map = new Map<string, Criterion>();
    criteria.forEach(c => map.set(c.criterionId, c));
    return map;
  }, [criteria]);

  // Negative criteria IDs
  const negativeCriteriaIds = useMemo(() => {
    const set = new Set<string>();
    criteria.forEach(c => {
      if (c.negativeScore < 0 || c.type === 'negative') {
        set.add(c.criterionId);
      }
    });
    return set;
  }, [criteria]);

  // Filtered raw violation events
  const filteredViolationEvents = useMemo(() => {
    return events.filter(e => {
      // 1. Check if event is a violation
      const eventScore = typeof e.score === 'number' ? e.score : (typeof e.scoreChange === 'number' ? e.scoreChange : 0);
      const isNegativeEvent = eventScore < 0 || 
                              e.type === 'negative' || 
                              negativeCriteriaIds.has(e.criterionId);
      if (!isNegativeEvent) return false;

      // 2. Filter by week
      if (filterWeek !== 'all' && e.week !== filterWeek) return false;

      // 3. Filter by team
      if (filterTeam !== 'all') {
        const student = students.find(s => s.studentId === e.studentId);
        const teamName = e.studentTeamName || e.teamName || student?.teamName;
        if (teamName !== filterTeam) return false;
      }

      return true;
    });
  }, [events, filterWeek, filterTeam, negativeCriteriaIds, students]);

  // Aggregate violation stats per student
  const studentViolationSummaries: StudentViolationSummary[] = useMemo(() => {
    // Filter base students list
    let targetStudents = students;
    if (filterTeam !== 'all') {
      targetStudents = targetStudents.filter(s => s.teamName === filterTeam);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      targetStudents = targetStudents.filter(s => 
        s.fullName.toLowerCase().includes(q) || 
        String(s.studentNumber).includes(q) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(q))
      );
    }

    // Group events by studentId
    const studentEventsMap = new Map<string, CompetitionEvent[]>();
    filteredViolationEvents.forEach(e => {
      if (!studentEventsMap.has(e.studentId)) {
        studentEventsMap.set(e.studentId, []);
      }
      studentEventsMap.get(e.studentId)!.push(e);
    });

    const summaries: StudentViolationSummary[] = [];

    targetStudents.forEach(st => {
      const studentEvts = studentEventsMap.get(st.studentId) || [];
      
      // Group by criterion
      const criterionGroups = new Map<string, StudentViolationGroup>();

      studentEvts.forEach(evt => {
        const crit = criteriaMap.get(evt.criterionId);
        const name = evt.criterionName || crit?.name || 'Vi phạm nề nếp';
        const evtScore = typeof evt.score === 'number' && evt.score !== 0 
          ? evt.score 
          : (typeof evt.scoreChange === 'number' && evt.scoreChange !== 0 ? evt.scoreChange : (crit?.negativeScore || -5));
        const penaltyPer = evtScore < 0 ? evtScore : -Math.abs(evtScore);

        if (!criterionGroups.has(name)) {
          criterionGroups.set(name, {
            criterionId: evt.criterionId,
            criterionName: name,
            count: 0,
            penaltyPerTime: penaltyPer,
            totalPenalty: 0,
            dates: [],
            notes: []
          });
        }

        const grp = criterionGroups.get(name)!;
        grp.count += 1;
        grp.totalPenalty += penaltyPer;
        if (evt.createdAt) {
          try {
            const d = new Date(evt.createdAt);
            grp.dates.push(`${d.toLocaleDateString('vi-VN')} (${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`);
          } catch {
            grp.dates.push(evt.createdAt);
          }
        }
        if (evt.note && evt.note.trim()) {
          grp.notes.push(evt.note.trim());
        }
      });

      const violationsList = Array.from(criterionGroups.values()).sort((a, b) => b.count - a.count);
      const totalViolationsCount = violationsList.reduce((acc, v) => acc + v.count, 0);
      const totalPenaltyPoints = violationsList.reduce((acc, v) => acc + v.totalPenalty, 0);

      // Only include students with violations if filter is active
      if (!onlyViolations || totalViolationsCount > 0) {
        summaries.push({
          student: st,
          totalViolationsCount,
          totalPenaltyPoints,
          violationsList
        });
      }
    });

    // Sort: students with most violations first
    return summaries.sort((a, b) => {
      if (b.totalViolationsCount !== a.totalViolationsCount) {
        return b.totalViolationsCount - a.totalViolationsCount;
      }
      return a.student.studentNumber - b.student.studentNumber;
    });
  }, [students, filterTeam, searchQuery, filteredViolationEvents, criteriaMap, onlyViolations]);

  // Overall statistics
  const totalViolationsOverall = useMemo(() => {
    return studentViolationSummaries.reduce((sum, s) => sum + s.totalViolationsCount, 0);
  }, [studentViolationSummaries]);

  const totalPenaltyOverall = useMemo(() => {
    return studentViolationSummaries.reduce((sum, s) => sum + s.totalPenaltyPoints, 0);
  }, [studentViolationSummaries]);

  const studentsWithViolationsCount = useMemo(() => {
    return studentViolationSummaries.filter(s => s.totalViolationsCount > 0).length;
  }, [studentViolationSummaries]);

  // Top common violations
  const topCommonViolations = useMemo(() => {
    const counts = new Map<string, { count: number; totalPenalty: number }>();
    filteredViolationEvents.forEach(e => {
      const name = e.criterionName || criteriaMap.get(e.criterionId)?.name || 'Vi phạm';
      const cur = counts.get(name) || { count: 0, totalPenalty: 0 };
      const evtScore = typeof e.score === 'number' && e.score !== 0 ? e.score : (typeof e.scoreChange === 'number' ? e.scoreChange : -5);
      const penalty = evtScore < 0 ? evtScore : -Math.abs(evtScore);
      counts.set(name, {
        count: cur.count + 1,
        totalPenalty: cur.totalPenalty + penalty
      });
    });

    return Array.from(counts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [filteredViolationEvents, criteriaMap]);

  // Generate parent message text for a student
  const generateParentNotificationText = (item: StudentViolationSummary): string => {
    const { student, violationsList, totalViolationsCount, totalPenaltyPoints } = item;
    const weekText = filterWeek === 'all' ? 'Toàn bộ các tuần qua' : `Tuần ${filterWeek}`;

    let msg = `[THÔNG BÁO TÌNH HÌNH VI PHẠM THI ĐUA NỀ NẾP]\n`;
    msg += `Kính gửi Quý Phụ huynh em: ${student.fullName} (STT: ${student.studentNumber} - ${student.teamName})\n`;
    msg += `Lớp: ${className} • ${schoolName}\n`;
    msg += `Thời gian theo dõi: ${weekText}\n\n`;
    msg += `Giáo viên chủ nhiệm xin thông báo các lỗi vi phạm nề nếp thi đua của em trong kỳ theo dõi như sau:\n`;

    if (violationsList.length === 0) {
      msg += `Em không có vi phạm nào trong thời gian này. Tinh thần học tập và nề nếp rất tốt!\n`;
    } else {
      violationsList.forEach((v, idx) => {
        msg += `${idx + 1}. ${v.criterionName}: ${v.count} lượt vi phạm (Tổng điểm trừ: ${v.totalPenalty} điểm)\n`;
        if (v.notes.length > 0) {
          msg += `   - Ghi chú: ${v.notes.join('; ')}\n`;
        }
      });

      msg += `\n* TỔNG KẾT VI PHẠM:\n`;
      msg += `- Tổng số lượt vi phạm: ${totalViolationsCount} lượt\n`;
      msg += `- Tổng điểm thi đua bị trừ: ${totalPenaltyPoints} điểm\n\n`;
      msg += `Kính mong Quý Phụ huynh phối hợp cùng GVCN và nhà trường để nhắc nhở, đôn đốc em chấp hành nghiêm túc nội quy lớp học, khắc phục các thiếu sót để tiến bộ hơn trong thời gian tới.\n\n`;
    }

    msg += `Trân trọng,\nGVCN: ${teacherName}`;
    return msg;
  };

  // Copy single parent notification to clipboard
  const handleCopySingleNotification = (item: StudentViolationSummary) => {
    const text = generateParentNotificationText(item);
    navigator.clipboard.writeText(text);
    setCopiedStudentId(item.student.studentId);
    setTimeout(() => setCopiedStudentId(null), 2500);
  };

  // Copy all violation summaries
  const handleCopyAllNotifications = () => {
    const weekText = filterWeek === 'all' ? 'TỔNG HỢP CÁC TUẦN' : `TUẦN ${filterWeek}`;
    let fullText = `=== DANH SÁCH HỌC SINH CÓ LỖI VI PHẠM THI ĐUA - LỚP ${className} (${weekText}) ===\n`;
    fullText += `Trường: ${schoolName} • GVCN: ${teacherName}\n`;
    fullText += `Tổng số học sinh vi phạm: ${studentsWithViolationsCount} em • Tổng lượt vi phạm: ${totalViolationsOverall} lượt\n\n`;

    const violators = studentViolationSummaries.filter(s => s.totalViolationsCount > 0);
    if (violators.length === 0) {
      fullText += `Không có học sinh nào vi phạm trong tuần này. Toàn lớp duy trì nề nếp thi đua xuất sắc!\n`;
    } else {
      violators.forEach((item, idx) => {
        fullText += `[${idx + 1}] ${item.student.fullName} (STT ${item.student.studentNumber} - ${item.student.teamName}):\n`;
        item.violationsList.forEach(v => {
          fullText += `   • ${v.criterionName}: ${v.count} lượt (${v.totalPenalty}đ)\n`;
        });
        fullText += `   => Tổng cộng: ${item.totalViolationsCount} lượt vi phạm (Trừ: ${item.totalPenaltyPoints} điểm)\n\n`;
      });
    }

    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  // Export violations to Excel / CSV
  const handleExportCSV = () => {
    const weekLabel = filterWeek === 'all' ? 'TatCaCacTuan' : `Tuan_${filterWeek}`;
    const filename = `DanhSach_LoiViPham_Lop_${className}_${weekLabel}.csv`;

    let csvContent = `STT,Mã Học Sinh,Họ và Tên,Tổ,Tên Lỗi Vi Phạm,Số Lượt Vi Phạm,Điểm Trừ Mỗi Lượt,Tổng Điểm Trừ,Ghi Chú Chi Tiết\n`;

    studentViolationSummaries.forEach(item => {
      if (item.violationsList.length === 0) {
        if (!onlyViolations) {
          csvContent += `"${item.student.studentNumber}","${item.student.studentCode || ''}","${item.student.fullName}","${item.student.teamName}","Không vi phạm",0,0,0,""\n`;
        }
      } else {
        item.violationsList.forEach(v => {
          const notesText = v.notes.join('; ').replace(/"/g, '""');
          csvContent += `"${item.student.studentNumber}","${item.student.studentCode || ''}","${item.student.fullName}","${item.student.teamName}","${v.criterionName}",${v.count},${v.penaltyPerTime},${v.totalPenalty},"${notesText}"\n`;
        });
      }
    });

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print all slips
  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header & Quick Controls */}
      <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 p-5 sm:p-6 rounded-3xl border-2 border-rose-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-wider uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                  Xuất thông báo vi phạm
                </span>
                <span className="text-xs text-slate-500 font-bold">
                  Lớp {className} • {schoolName}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                BÁO CÁO CÁC LỖI VI PHẠM CỦA TỪNG HỌC SINH
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Thống kê chi tiết lỗi nào, bao nhiêu lượt vi phạm, tổng điểm trừ & xuất mẫu thông báo gửi Phụ huynh
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyAllNotifications}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Sao chép toàn bộ danh sách vi phạm gửi Zalo"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copiedAll ? 'Đã chép danh sách' : 'Chép toàn bộ'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Xuất file CSV danh sách lỗi vi phạm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel/CSV</span>
            </button>

            <button
              onClick={handlePrintAll}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="In tất cả phiếu thông báo vi phạm"
            >
              <Printer className="w-4 h-4" />
              <span>In danh sách</span>
            </button>
          </div>
        </div>

        {/* 2. Stat overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Học sinh có vi phạm</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-rose-600">{studentsWithViolationsCount}</span>
              <span className="text-xs text-slate-500 font-bold">/ {students.length} HS</span>
            </div>
            <span className="text-[10px] text-rose-700 font-semibold">
              Chiếm {students.length > 0 ? Math.round((studentsWithViolationsCount / students.length) * 100) : 0}% sĩ số
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tổng lượt vi phạm</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-amber-600">{totalViolationsOverall}</span>
              <span className="text-xs text-slate-500 font-bold">lượt</span>
            </div>
            <span className="text-[10px] text-amber-700 font-semibold">
              Được ghi nhận thi đua
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-red-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tổng điểm trừ</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-red-600">{totalPenaltyOverall}</span>
              <span className="text-xs text-slate-500 font-bold">điểm</span>
            </div>
            <span className="text-[10px] text-red-700 font-semibold">
              Ảnh hưởng xếp hạng
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Lỗi mắc nhiều nhất</span>
            <div className="mt-1">
              {topCommonViolations[0] ? (
                <>
                  <p className="text-xs font-black text-indigo-900 truncate">
                    {topCommonViolations[0].name}
                  </p>
                  <span className="text-[11px] font-extrabold text-indigo-600">
                    {topCommonViolations[0].count} lượt ({topCommonViolations[0].totalPenalty}đ)
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Không có lỗi</span>
              )}
            </div>
          </div>
        </div>

        {/* Top common violations pills */}
        {topCommonViolations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span>Các lỗi phổ biến nhất:</span>
            </span>
            {topCommonViolations.map((item, idx) => (
              <span 
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-white border border-rose-200/80 text-[11px] text-slate-800 font-bold flex items-center gap-1.5 shadow-2xs"
              >
                <span>{item.name}:</span>
                <span className="text-rose-600 font-black">{item.count} lượt</span>
                <span className="text-slate-400 text-[10px]">({item.totalPenalty}đ)</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Week Filter */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Chọn Tuần:</span>
            <select
              value={filterWeek}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setFilterWeek(val);
                if (typeof val === 'number' && onSelectWeek) {
                  onSelectWeek(val);
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Toàn bộ các tuần</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(w => (
                <option key={w} value={w}>Tuần {w} {w === selectedWeek ? '(Hiện tại)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Chọn Tổ:</span>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Tất cả các tổ</option>
              {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4', 'Tổ 5'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Toggle only violations */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={onlyViolations}
              onChange={(e) => setOnlyViolations(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <span>Chỉ hiện học sinh có vi phạm</span>
          </label>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên học sinh, STT..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Student Violation Cards */}
      {studentViolationSummaries.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900">
            Không có học sinh nào vi phạm!
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Tuyệt vời! Trong phạm vi bộ lọc đã chọn, không ghi nhận trường hợp vi phạm nề nếp thi đua nào. Toàn bộ học sinh thực hiện tốt kỷ luật.
          </p>

          {classId && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSeedSampleViolations}
                disabled={seedingLoading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{seedingLoading ? 'Đang tạo vi phạm mẫu...' : 'Tạo 15 sự kiện vi phạm mẫu để xem trước phiếu báo'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {studentViolationSummaries.map((item, idx) => {
            const { student, violationsList, totalViolationsCount, totalPenaltyPoints } = item;
            const hasViolations = totalViolationsCount > 0;

            return (
              <div
                key={student.studentId}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  hasViolations
                    ? totalViolationsCount >= 3
                      ? 'bg-rose-50/40 border-rose-300 hover:border-rose-400 shadow-2xs'
                      : 'bg-amber-50/30 border-amber-200 hover:border-amber-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Student Identity */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center shrink-0 border ${
                      hasViolations
                        ? totalViolationsCount >= 3
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                          : 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {student.studentNumber}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">
                          {student.fullName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
                          {student.teamName}
                        </span>
                        {student.studentCode && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {student.studentCode}
                          </span>
                        )}
                      </div>

                      {/* Total summary badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {hasViolations ? (
                          <>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black border ${
                              totalViolationsCount >= 3
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{totalViolationsCount} lượt vi phạm</span>
                            </span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black bg-red-100 text-red-800 border border-red-300">
                              <span>Tổng trừ: {totalPenaltyPoints} điểm</span>
                            </span>

                            <span className="text-[11px] text-slate-500 font-medium">
                              ({violationsList.length} lỗi vi phạm khác nhau)
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Không có vi phạm</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {hasViolations && (
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForSlip(item)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Xem và in phiếu báo vi phạm cá nhân"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Phiếu báo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopySingleNotification(item)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        title="Sao chép tin nhắn chuẩn bị sẵn để gửi Zalo / SMS cho Phụ huynh"
                      >
                        {copiedStudentId === student.studentId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Gửi Phụ huynh</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Violation Details Table for this student */}
                {hasViolations && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {violationsList.map((v, vIdx) => (
                        <div 
                          key={vIdx}
                          className="p-2.5 bg-white/90 rounded-xl border border-rose-200/80 shadow-2xs space-y-1"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-xs font-black text-slate-900 leading-snug">
                              {v.criterionName}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-600 text-white shrink-0 shadow-2xs">
                              {v.count} lượt
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">
                              Mức trừ: {v.penaltyPerTime}đ / lượt
                            </span>
                            <span className="font-extrabold text-red-600">
                              Tổng: {v.totalPenalty}đ
                            </span>
                          </div>

                          {v.notes.length > 0 && (
                            <p className="text-[10px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-200/60 leading-tight">
                              Ghi chú: {v.notes.join('; ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal: Printable Individual Student Violation Notice Slip */}
      {selectedStudentForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  PHIẾU THÔNG BÁO TÌNH HÌNH VI PHẠM THI ĐUA NỀ NẾP
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudentForSlip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Slip Paper Preview */}
            <div id="printable-individual-slip" className="p-6 bg-slate-50/70 border-2 border-slate-300 rounded-2xl space-y-5 text-slate-800">
              {/* Header */}
              <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                <p className="text-xs uppercase font-bold text-slate-600 tracking-wider">
                  {schoolName}
                </p>
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                  PHIẾU THÔNG BÁO VI PHẠM THI ĐUA NỀ NẾP
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Lớp: <strong>{className}</strong> • {filterWeek === 'all' ? 'Toàn bộ năm học' : `Tuần ${filterWeek}`} • Năm học 2026-2027
                </p>
              </div>

              {/* Student info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  Họ và tên học sinh: <strong className="text-sm font-black text-slate-900">{selectedStudentForSlip.student.fullName}</strong>
                </div>
                <div>
                  Số thứ tự (STT): <strong>{selectedStudentForSlip.student.studentNumber}</strong> • Thuộc: <strong>{selectedStudentForSlip.student.teamName}</strong>
                </div>
              </div>

              {/* Violations Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-200/80 font-bold text-slate-800">
                      <th className="p-2 border border-slate-300 text-center w-10">STT</th>
                      <th className="p-2 border border-slate-300">Tên lỗi vi phạm</th>
                      <th className="p-2 border border-slate-300 text-center w-24">Số lượt vi phạm</th>
                      <th className="p-2 border border-slate-300 text-right w-24">Mức trừ / lượt</th>
                      <th className="p-2 border border-slate-300 text-right w-28">Tổng điểm trừ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudentForSlip.violationsList.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-100/50">
                        <td className="p-2 border border-slate-300 text-center font-bold">{i + 1}</td>
                        <td className="p-2 border border-slate-300">
                          <span className="font-bold text-slate-900">{v.criterionName}</span>
                          {v.notes.length > 0 && (
                            <span className="block text-[10px] text-slate-500 italic">
                              Ghi chú: {v.notes.join('; ')}
                            </span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-black text-rose-700">
                          {v.count} lượt
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-medium">
                          {v.penaltyPerTime}đ
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-black text-red-600">
                          {v.totalPenalty}đ
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-rose-50 font-black text-xs">
                      <td colSpan={2} className="p-2.5 border border-slate-300 uppercase text-slate-900 text-right">
                        TỔNG CỘNG:
                      </td>
                      <td className="p-2.5 border border-slate-300 text-center text-rose-700 text-sm">
                        {selectedStudentForSlip.totalViolationsCount} lượt
                      </td>
                      <td className="p-2.5 border border-slate-300 text-right text-slate-400">
                        -
                      </td>
                      <td className="p-2.5 border border-slate-300 text-right text-red-600 text-sm">
                        {selectedStudentForSlip.totalPenaltyPoints} điểm
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Message from Teacher */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <span className="font-bold text-slate-900">Ý kiến nhắc nhở của Giáo viên chủ nhiệm:</span>
                <p className="text-[11px] text-slate-600 leading-relaxed italic">
                  Đề nghị em nghiêm túc chấn chỉnh các thiếu sót nêu trên, không tái phạm trong các tuần tiếp theo để cải thiện điểm rèn luyện thi đua của bản thân và tổ.
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 text-center text-xs pt-4 border-t border-slate-200">
                <div className="space-y-12">
                  <div>
                    <p className="font-bold text-slate-800">Ý kiến & Chữ ký của Phụ huynh</p>
                    <p className="text-[10px] text-slate-400">(Ký và ghi rõ họ tên)</p>
                  </div>
                </div>

                <div className="space-y-12">
                  <div>
                    <p className="text-[10px] text-slate-500 italic">Ngày .... tháng .... năm 2026</p>
                    <p className="font-bold text-slate-800">Giáo viên chủ nhiệm</p>
                  </div>
                  <p className="font-black text-slate-900">{teacherName}</p>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudentForSlip(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng lại
              </button>

              <button
                type="button"
                onClick={() => handleCopySingleNotification(selectedStudentForSlip)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedStudentId === selectedStudentForSlip.student.studentId ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Đã chép tin nhắn</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép tin nhắn</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>In phiếu này</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
