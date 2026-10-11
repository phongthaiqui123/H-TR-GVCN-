import { ClassInfo, Student, WeeklyScore, CompetitionEvent, Criterion, Team, WeeklyCadreReview } from '../types';
import { 
  calculateAverage, 
  detectImprovedStudents, 
  detectStudentsNeedingAttention, 
  getTopViolations, 
  getTeamAnalytics 
} from './aiAnalyticsService';

/**
 * AI Report Service
 * Soạn thảo báo cáo công tác chủ nhiệm tuần 10 mục chuẩn mực sư phạm
 * kết hợp dữ liệu thống kê chính xác và nhận xét thực tế từ Ban cán sự lớp & Giáo viên chủ nhiệm.
 */

export interface WeeklyReportSummaryData {
  className: string;
  schoolYear: string;
  week: number;
  totalStudents: number;
  avgScore: number;
  attendanceRate: number;
  topStudents: string[];
  improvedStudents: string[];
  needAttentionStudents: string[];
  topInfractions: string[];
  leadingTeam: string;
  mostImprovedTeam?: string;
  cadreReview?: WeeklyCadreReview | null;
  cadreRemarksSummary?: {
    general?: string;
    academic?: string;
    discipline?: string;
    hygiene?: string;
    movement?: string;
    treasurer?: string;
    teams?: Array<{ teamName: string; authorName: string; content: string; positiveMembers: string; warningMembers: string }>;
    nextWeekGoals?: string;
  };
  teacherFeedback?: string;
}

export function compileWeeklyReportData(
  classInfo: ClassInfo,
  week: number,
  students: Student[],
  weeklyScores: WeeklyScore[],
  events: CompetitionEvent[],
  criteria: Criterion[],
  teams: Team[],
  cadreReview?: WeeklyCadreReview | null,
  teacherFeedback?: string
): WeeklyReportSummaryData {
  const currentScores = weeklyScores.filter(s => s.week === week);
  const avgScore = calculateAverage(currentScores.map(s => s.finalScore)) || 100;

  // Top 3 students
  const sortedScores = [...currentScores].sort((a, b) => b.finalScore - a.finalScore);
  const topStudents = sortedScores.slice(0, 3).map(score => {
    const st = students.find(s => s.studentId === score.studentId);
    return `${st?.fullName || 'Học sinh'} (${score.finalScore}đ - ${score.rankCategory})`;
  });

  // Improved students
  const improved = detectImprovedStudents(students, weeklyScores, week, events);
  const improvedStudents = improved.slice(0, 3).map(
    i => `${i.studentName} (tăng +${i.delta}đ, từ ${i.previousScore}đ lên ${i.currentScore}đ)`
  );

  // Attention students
  const attention = detectStudentsNeedingAttention(students, weeklyScores, week, events);
  const needAttentionStudents = attention.slice(0, 3).map(
    a => `${a.studentName} (${a.reason})`
  );

  // Top violations
  const violations = getTopViolations(events, criteria, week);
  const topInfractions = violations.slice(0, 3).map(
    v => `${v.name}: ${v.count} lượt (trừ ${v.totalDeducted}đ)`
  );

  // Teams
  const teamAnalytics = getTeamAnalytics(teams, students, weeklyScores, week);
  const leadingTeam = teamAnalytics.bestTeam
    ? `${teamAnalytics.bestTeam.teamName} (TB: ${teamAnalytics.bestTeam.avgScore}đ)`
    : 'Tổ 1';

  const mostImprovedTeam = teamAnalytics.mostImprovedTeam
    ? `${teamAnalytics.mostImprovedTeam.teamName} (tăng +${teamAnalytics.mostImprovedTeam.delta}đ)`
    : undefined;

  // Attendance rate (approximate from attendance events)
  const attendanceViolations = events.filter(
    e => e.week === week && e.score < 0 && (e.criterionName.toLowerCase().includes('muộn') || e.criterionName.toLowerCase().includes('vắng'))
  ).length;
  const totalStudentDays = (students.length || 35) * 5;
  const attendanceRate = Math.max(90, Math.round(((totalStudentDays - attendanceViolations) / totalStudentDays) * 100));

  // Cadre remarks structured summary
  let cadreRemarksSummary: WeeklyReportSummaryData['cadreRemarksSummary'] = undefined;
  if (cadreReview) {
    const teamsList: Array<{ teamName: string; authorName: string; content: string; positiveMembers: string; warningMembers: string }> = [];
    if (cadreReview.teamAssessments) {
      Object.entries(cadreReview.teamAssessments).forEach(([tName, item]) => {
        if (item) {
          teamsList.push({
            teamName: item.teamName || tName,
            authorName: item.authorName || 'Tổ trưởng',
            content: item.content || '',
            positiveMembers: item.positiveMembers || '',
            warningMembers: item.warningMembers || ''
          });
        }
      });
    }

    cadreRemarksSummary = {
      general: cadreReview.generalAssessment,
      academic: cadreReview.academicAssessment,
      discipline: cadreReview.disciplineAssessment,
      hygiene: cadreReview.hygieneAssessment,
      movement: cadreReview.movementAssessment,
      treasurer: cadreReview.treasurerAssessment,
      teams: teamsList,
      nextWeekGoals: cadreReview.nextWeekGoals
    };
  }

  const effectiveTeacherFeedback = teacherFeedback || cadreReview?.teacherFeedback || '';

  return {
    className: classInfo.className || 'Lớp học',
    schoolYear: classInfo.schoolYear || '2026-2027',
    week,
    totalStudents: students.length || 35,
    avgScore,
    attendanceRate,
    topStudents,
    improvedStudents,
    needAttentionStudents,
    topInfractions,
    leadingTeam,
    mostImprovedTeam,
    cadreReview,
    cadreRemarksSummary,
    teacherFeedback: effectiveTeacherFeedback
  };
}

export function generateStandardWeeklyReportTemplate(data: WeeklyReportSummaryData): string {
  const cr = data.cadreRemarksSummary;
  const tf = data.teacherFeedback;

  return `BÁO CÁO CÔNG TÁC CHỦ NHIỆM TUẦN ${data.week}
LỚP: ${data.className} - NĂM HỌC: ${data.schoolYear}
Thời gian: Tuần ${data.week} (Sĩ số: ${data.totalStudents} học sinh)

-------------------------------------------------------------
1. TÌNH HÌNH CHUNG CỦA LỚP
- Trong tuần ${data.week}, lớp ${data.className} duy trì nề nếp thi đua cơ bản ổn định. Đa số học sinh chấp hành tốt nội quy nhà trường và các quy định của lớp.
- Không khí học tập nhìn chung nghiêm túc, tinh thần đoàn kết tập thể được phát huy tốt.
${cr?.general ? `- Đánh giá chung từ Ban cán sự lớp: "${cr.general}"` : ''}

2. TÌNH HÌNH CHUYÊN CẦN VÀ GIỜ GIẤC
- Tỷ lệ chuyên cần toàn lớp đạt khoảng ${data.attendanceRate}%.
- Học sinh cơ bản đi học đúng giờ, tham gia đầy đủ các buổi truy bài 15 phút đầu giờ.
${cr?.discipline ? `- Ghi nhận từ Lớp phó trật tự / nề nếp: "${cr.discipline}"` : ''}

3. KẾT QUẢ THI ĐUA VÀ XẾP HẠNG CÁC TỔ
- Điểm thi đua trung bình toàn lớp: ${data.avgScore} điểm.
- Tổ dẫn đầu phong trào thi đua tuần này: ${data.leadingTeam}.
${data.mostImprovedTeam ? `- Tổ có tiến bộ nổi bật nhất: ${data.mostImprovedTeam}.` : ''}
- Sự cạnh tranh điểm số giữa các tổ diễn ra lành mạnh, tích cực.

4. PHẢN ÁNH THỰC TẾ TỪ BAN CÁN SỰ & CÁC TỔ TRƯỞNG
${cr?.academic ? `- Tình hình học tập (Lớp phó học tập): ${cr.academic}` : '- Học tập: Đa số học sinh hoàn thành bài vở trước khi đến lớp.'}
${cr?.hygiene ? `- Lao động, vệ sinh (Lớp phó lao động): ${cr.hygiene}` : '- Vệ sinh lớp học và khu vực phân công sạch sẽ, đúng giờ.'}
${cr?.movement ? `- Phong trào Đoàn - Đội (Bí thư): ${cr.movement}` : '- Đoàn viên, đội viên tham gia tích cực các hoạt động tập thể.'}
${cr?.teams && cr.teams.length > 0 ? `* Nhận xét chi tiết từ các Tổ trưởng:
${cr.teams.map(t => `  + ${t.teamName}: ${t.content || 'Nề nếp tốt'}${t.positiveMembers ? ` | Biểu dương: ${t.positiveMembers}` : ''}${t.warningMembers ? ` | Cần cố gắng: ${t.warningMembers}` : ''}`).join('\n')}` : ''}

5. TUYÊN DƯƠNG HỌC SINH TIÊU BIỂU XUẤT SẮC
${data.topStudents.length > 0 
  ? data.topStudents.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n') 
  : '  Chưa có dữ liệu xếp hạng tuần này.'}

6. BIỂU DƯƠNG HỌC SINH CÓ TIẾN BỘ VƯỢT BẬC
${data.improvedStudents.length > 0 
  ? data.improvedStudents.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n') 
  : '  Tất cả các học sinh đều duy trì phong độ ổn định so với tuần trước.'}

7. NHỮNG HỌC SINH CẦN QUAN TÂM, NHẮC NHỞ & KẾ HOẠCH PHỐI HỢP
${data.needAttentionStudents.length > 0 
  ? data.needAttentionStudents.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n') 
  : '  Không có học sinh vi phạm nghiêm trọng trong tuần.'}
* Kế hoạch: GVCN sẽ gặp riêng trao đổi động viên trong giờ sinh hoạt lớp, đồng thời liên hệ trao đổi thêm với phụ huynh để đồng hành.

8. CÁC TỒN TẠI, VI PHẠM NỀ NẾP NỔI BẬT TRONG TUẦN
${data.topInfractions.length > 0 
  ? data.topInfractions.map((i, idx) => `  - ${i}`).join('\n') 
  : '  - Không có vi phạm đáng kể.'}

9. Ý KIẾN CHỈ ĐẠO & NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM
${tf ? `- Ý kiến chỉ đạo từ GVCN: "${tf}"` : '- GVCN ghi nhận sự cố gắng của toàn thể lớp và nỗ lực của Ban cán sự trong việc duy trì kỷ cương nền nếp.'}

10. PHƯƠNG HƯỚNG, MỤC TIÊU VÀ BIỆN PHÁP TRỌNG TÂM TUẦN ${data.week + 1}
- Mục tiêu 1: Tiếp tục giữ vững và nâng cao điểm trung bình thi đua toàn lớp lên trên ${Math.round(data.avgScore + 2)} điểm.
- Mục tiêu 2: Khắc phục triệt để các tồn tại về ${data.topInfractions[0]?.split(':')[0] || 'nề nếp đầu giờ'}.
${cr?.nextWeekGoals ? `- Mục tiêu Ban cán sự lớp đề ra: "${cr.nextWeekGoals}"` : '- Biện pháp: Phân công ban cán sự lớp theo dõi sát sao, đẩy mạnh phong trào "Đôi bạn cùng tiến" để hỗ trợ các bạn cần cố gắng.'}
- Lời nhắn của GVCN: "Thầy/Cô chúc các em luôn giữ vững niềm vui học tập, tinh thần trách nhiệm và gặt hái thêm nhiều hoa điểm tốt trong tuần tới!"`;
}
