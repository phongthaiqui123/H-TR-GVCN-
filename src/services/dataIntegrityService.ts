import { Student, StudentWithScore, ClassInfo, CompetitionEvent, Criterion, WeeklySnapshot } from '../types';

export interface IntegrityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'student' | 'score' | 'class' | 'snapshot' | 'event';
  title: string;
  description: string;
  affectedCount: number;
  items?: string[];
  recommendation: string;
}

export interface IntegrityReport {
  timestamp: string;
  isHealthy: boolean;
  totalChecks: number;
  issueCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  issues: IntegrityIssue[];
}

/**
 * Service to audit data integrity across student records, events, scoring, and academic classes
 */
export function auditClassDataIntegrity(
  currentClass: ClassInfo | null,
  students: (Student | StudentWithScore)[],
  events: CompetitionEvent[],
  criteria: Criterion[],
  snapshots?: WeeklySnapshot[]
): IntegrityReport {
  const issues: IntegrityIssue[] = [];

  // Check 1: Class ownership and configuration
  if (!currentClass) {
    issues.push({
      id: 'no-class-active',
      severity: 'critical',
      category: 'class',
      title: 'Chưa có lớp học được kích hoạt',
      description: 'Hệ thống chưa xác định được lớp học hiện tại của giáo viên.',
      affectedCount: 1,
      recommendation: 'Hãy chọn hoặc tạo một lớp học để bắt đầu quản lý thi đua.'
    });
  } else {
    if (!currentClass.teacherId) {
      issues.push({
        id: 'missing-teacher-id',
        severity: 'critical',
        category: 'class',
        title: 'Lớp học thiếu mã định danh giáo viên',
        description: `Lớp ${currentClass.className} chưa có teacherId xác thực.`,
        affectedCount: 1,
        recommendation: 'Cần cập nhật quyền sở hữu lớp học với tài khoản giáo viên hiện tại.'
      });
    }

    if (!currentClass.schoolYear) {
      issues.push({
        id: 'invalid-school-year',
        severity: 'medium',
        category: 'class',
        title: 'Năm học chưa được thiết lập',
        description: 'Lớp học chưa có thông tin năm học cụ thể (vd: 2026-2027).',
        affectedCount: 1,
        recommendation: 'Vào phần Cài đặt lớp để thiết lập năm học chuẩn.'
      });
    }
  }

  // Check 2: Duplicate student numbers or IDs (Mã học sinh / STT)
  const numberMap = new Map<number, string[]>();
  students.forEach(st => {
    const num = st.studentNumber;
    if (num) {
      if (!numberMap.has(num)) numberMap.set(num, []);
      numberMap.get(num)!.push(st.fullName);
    }
  });

  const duplicateNumbers: string[] = [];
  numberMap.forEach((names, num) => {
    if (names.length > 1) {
      duplicateNumbers.push(`STT [${num}] trùng cho: ${names.join(', ')}`);
    }
  });

  if (duplicateNumbers.length > 0) {
    issues.push({
      id: 'duplicate-student-numbers',
      severity: 'high',
      category: 'student',
      title: 'Phát hiện trùng lặp số thứ tự học sinh',
      description: `Có ${duplicateNumbers.length} STT học sinh bị trùng lặp trong danh sách lớp.`,
      affectedCount: duplicateNumbers.length,
      items: duplicateNumbers,
      recommendation: 'Cần đánh lại số thứ tự học sinh để tránh sai sót khi điểm danh và xuất báo cáo.'
    });
  }

  // Check 3: Students without team (Tổ)
  const studentsWithoutTeam = students.filter(s => !s.teamId || s.teamId.trim() === '' || !s.teamName);
  if (studentsWithoutTeam.length > 0) {
    issues.push({
      id: 'students-without-team',
      severity: 'low',
      category: 'student',
      title: 'Học sinh chưa được phân tổ',
      description: `Có ${studentsWithoutTeam.length} học sinh chưa được gán vào tổ nào trong lớp.`,
      affectedCount: studentsWithoutTeam.length,
      items: studentsWithoutTeam.slice(0, 5).map(s => s.fullName),
      recommendation: 'Phân tổ cho học sinh để hỗ trợ xếp hạng thi đua theo tổ chính xác.'
    });
  }

  // Check 4: Out of bounds scores or NaN scores (for StudentWithScore)
  const studentsWithScoresList = students.filter((s): s is StudentWithScore => 'currentWeekScore' in s);
  const corruptedStudents = studentsWithScoresList.filter(s => 
    isNaN(s.currentWeekScore) || 
    s.currentWeekScore === null || 
    s.currentWeekScore === undefined || 
    s.currentWeekScore < 0 || 
    s.currentWeekScore > 500
  );

  if (corruptedStudents.length > 0) {
    issues.push({
      id: 'corrupted-scores',
      severity: 'critical',
      category: 'score',
      title: 'Phát hiện giá trị điểm bất thường hoặc NaN',
      description: `Có ${corruptedStudents.length} học sinh có điểm thi đua nằm ngoài khoảng an toàn (0 - 500) hoặc bị NaN.`,
      affectedCount: corruptedStudents.length,
      items: corruptedStudents.map(s => `${s.fullName}: ${s.currentWeekScore}`),
      recommendation: 'Kiểm tra lại lịch sử điểm và tính toán lại điểm tổng kết cho học sinh.'
    });
  }

  // Check 5: Orphan events (Events referencing non-existent students)
  const studentIdSet = new Set(students.map(s => s.studentId));
  const orphanEvents = events.filter(e => !studentIdSet.has(e.studentId));
  if (orphanEvents.length > 0) {
    issues.push({
      id: 'orphan-events',
      severity: 'high',
      category: 'event',
      title: 'Sự kiện thi đua trỏ tới học sinh không tồn tại',
      description: `Có ${orphanEvents.length} bản ghi điểm trỏ tới học sinh đã bị xóa hoặc không nằm trong lớp.`,
      affectedCount: orphanEvents.length,
      recommendation: 'Làm sạch các sự kiện mồ côi hoặc khôi phục học sinh tương ứng.'
    });
  }

  // Check 6: Criteria integrity
  const validCriterionIds = new Set(criteria.map(c => c.criterionId));
  const eventsWithInvalidCriteria = events.filter(e => e.criterionId && !validCriterionIds.has(e.criterionId));
  if (eventsWithInvalidCriteria.length > 0) {
    issues.push({
      id: 'invalid-criteria-events',
      severity: 'medium',
      category: 'event',
      title: 'Sự kiện trỏ tới tiêu chí không có trong bộ 12 tiêu chí chuẩn',
      description: `Có ${eventsWithInvalidCriteria.length} sự kiện sử dụng mã tiêu chí đã bị sửa đổi hoặc xóa.`,
      affectedCount: eventsWithInvalidCriteria.length,
      recommendation: 'Cập nhật lại tiêu chí tương ứng.'
    });
  }

  const issueCounts = {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  };

  return {
    timestamp: new Date().toISOString(),
    isHealthy: issueCounts.critical === 0 && issueCounts.high === 0,
    totalChecks: 6,
    issueCounts,
    issues
  };
}
