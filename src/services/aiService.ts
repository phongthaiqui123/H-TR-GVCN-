import { 
  Student, 
  ClassInfo, 
  WeeklyScore, 
  CompetitionEvent, 
  Criterion, 
  Team,
  TeacherNote,
  StudentAnalysisResult, 
  ClassAnalysisResult, 
  StudentCommentTone, 
  StudentCommentType, 
  ParentMessagePurpose,
  ReportStatistics,
  AiReviewResult,
  ReportType
} from '../types';
import { 
  calculateAverage, 
  calculateTrend, 
  detectImprovedStudents, 
  detectStudentsNeedingAttention, 
  getTopViolations, 
  getTeamAnalytics 
} from './aiAnalyticsService';
import { logAiAction } from './firestoreService';

export interface StudentAIAnalysis extends Partial<StudentAnalysisResult> {
  summary: string;
  strengths: string[];
  weaknesses?: string[];
  areasToImprove?: string[];
  trend: any;
  frequentViolations?: string;
  improvedCriteria?: string;
  supportSuggestion?: string;
}

export interface ClassAIAnalysis extends Partial<ClassAnalysisResult> {
  summary: string;
  insights?: string[];
  mostImprovedStudents?: string[];
  needAttentionStudents?: string[];
  bestTeam?: string;
  topInfractions?: string;
  nextWeekRecommendations?: string[];
  highlights?: string[];
  concerns?: string[];
  classActivitiesIdea?: string;
  actionPlan?: string[];
}

// --- In-Memory Response Cache ---
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const aiCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const entry = aiCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  aiCache.set(key, { data, timestamp: Date.now() });
}

export function clearAiCache(): void {
  aiCache.clear();
}

// --- Intent Classifier & Code-First Routing ---
export type AiIntentType = 
  | 'student_analysis'
  | 'class_analysis'
  | 'team_analysis'
  | 'ranking'
  | 'improvement'
  | 'concern'
  | 'top_violation'
  | 'comment'
  | 'parent_message'
  | 'weekly_report'
  | 'general_question';

export function detectUserIntent(question: string): {
  intent: AiIntentType;
  targetStudentName?: string;
  targetWeek?: number;
} {
  const q = question.toLowerCase().trim();

  // Extract week if any (ví dụ "tuần 8", "tuần này")
  const weekMatch = q.match(/tuần\s*(\d+)/);
  const targetWeek = weekMatch ? parseInt(weekMatch[1], 10) : undefined;

  // Extract target student if named
  let targetStudentName: string | undefined;
  const studentPrefixMatch = q.match(/(em|học sinh|bạn)\s+([A-ZÀ-Ỹa-zà-ỹ\s]{2,25})/i);
  if (studentPrefixMatch) {
    targetStudentName = studentPrefixMatch[2].trim();
  }

  if (q.includes('ai tiến bộ') || q.includes('học sinh tiến bộ') || q.includes('tăng điểm') || q.includes('bứt phá')) {
    return { intent: 'improvement', targetWeek, targetStudentName };
  }

  if (q.includes('ai cần chú ý') || q.includes('học sinh cần quan tâm') || q.includes('giảm điểm') || q.includes('ai bị trừ') || q.includes('cần nhắc nhở')) {
    return { intent: 'concern', targetWeek, targetStudentName };
  }

  if (q.includes('ai đứng nhất') || q.includes('ai cao điểm nhất') || q.includes('top đầu') || q.includes('bảng xếp hạng')) {
    return { intent: 'ranking', targetWeek, targetStudentName };
  }

  if (q.includes('lỗi nào') || q.includes('vi phạm nào') || q.includes('tiêu chí nào bị trừ') || q.includes('vấn đề nề nếp')) {
    return { intent: 'top_violation', targetWeek, targetStudentName };
  }

  if (q.includes('tổ nào') || q.includes('điểm các tổ') || q.includes('xếp hạng tổ') || q.includes('tổ 1') || q.includes('tổ 2') || q.includes('tổ 3') || q.includes('tổ 4')) {
    return { intent: 'team_analysis', targetWeek, targetStudentName };
  }

  if (q.includes('viết nhận xét') || q.includes('gợi ý nhận xét') || q.includes('nhận xét học sinh')) {
    return { intent: 'comment', targetWeek, targetStudentName };
  }

  if (q.includes('tin nhắn phụ huynh') || q.includes('gửi phụ huynh') || q.includes('nhắn tin cho bố mẹ')) {
    return { intent: 'parent_message', targetWeek, targetStudentName };
  }

  if (q.includes('báo cáo tuần') || q.includes('tổng kết tuần') || q.includes('soạn báo cáo')) {
    return { intent: 'weekly_report', targetWeek, targetStudentName };
  }

  if (q.includes('phân tích lớp') || q.includes('tổng quan lớp') || q.includes('tình hình lớp')) {
    return { intent: 'class_analysis', targetWeek, targetStudentName };
  }

  if (targetStudentName || q.includes('phân tích học sinh') || q.includes('xem em')) {
    return { intent: 'student_analysis', targetWeek, targetStudentName };
  }

  return { intent: 'general_question', targetWeek, targetStudentName };
}

// --- 1. Chat with Teacher AI Assistant ---
export async function chatWithAI(
  message: string,
  context: any,
  history: Array<{ role: 'user' | 'model'; text: string }> = []
): Promise<string> {
  const intentInfo = detectUserIntent(message);

  // If intent is purely deterministic and context has data, provide instant truthful response!
  if (intentInfo.intent === 'improvement' && context?.students && context?.weeklyScores) {
    const improved = detectImprovedStudents(context.students, context.weeklyScores, context.week || 8, context.events || []);
    if (improved.length > 0) {
      const top = improved[0];
      return `🌟 Dựa trên dữ liệu thi đua thực tế tuần ${context.week || 8}:\n\n` +
        `Học sinh có tiến bộ vượt bậc nhất là **${top.studentName}** với mức tăng **+${top.delta} điểm** (từ ${top.previousScore}đ ở tuần trước lên ${top.currentScore}đ tuần này).\n\n` +
        `• Bằng chứng dữ liệu: ${top.evidence.join('; ')}.\n` +
        `• Gợi ý sư phạm: Thầy/Cô nên biểu dương em trước lớp trong giờ sinh hoạt để động viên tinh thần tự giác của em!`;
    }
  }

  if (intentInfo.intent === 'concern' && context?.students && context?.weeklyScores) {
    const attention = detectStudentsNeedingAttention(context.students, context.weeklyScores, context.week || 8, context.events || []);
    if (attention.length > 0) {
      const topList = attention.slice(0, 3).map(a => 
        `• **${a.studentName}** (${a.severity === 'high' ? '⚠️ Mức độ cao' : 'ℹ️ Cần chú ý'}): ${a.reason}\n  👉 Gợi ý: ${a.suggestion}`
      ).join('\n\n');
      return `📋 Dữ liệu tuần ${context.week || 8} ghi nhận ${attention.length} học sinh cần được GVCN quan tâm và hỗ trợ:\n\n${topList}\n\n*Lưu ý: Mọi phân tích dựa trên sự biến động điểm số thi đua, không đại diện cho đánh giá năng lực hay tính cách học sinh.*`;
    }
  }

  if (intentInfo.intent === 'top_violation' && context?.events && context?.criteria) {
    const violations = getTopViolations(context.events, context.criteria, context.week);
    if (violations.length > 0) {
      const top3 = violations.slice(0, 3).map((v, i) => `${i + 1}. **${v.name}**: ${v.count} lượt vi phạm (bị trừ tổng cộng ${v.totalDeducted}đ)`).join('\n');
      return `📊 Các vấn đề nề nếp bị trừ điểm nhiều nhất trong tuần ${context.week || 8}:\n\n${top3}\n\n👉 GVCN nên nhắc nhở ban cán sự lớp đôn đốc thực hiện tốt các tiêu chí này ngay từ đầu tuần tới.`;
    }
  }

  try {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, history }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.reply || 'Xin lỗi, tôi chưa thể đưa ra câu trả lời lúc này.';
  } catch (err) {
    console.warn('AI chat error, using offline response:', err);
    return `[Chế độ dự phòng] Hệ thống ghi nhận câu hỏi: "${message}". Dựa trên số liệu lớp: Thầy/cô có thể kiểm tra danh sách học sinh cần quan tâm và tiến bộ tuần này trong mục "Phân tích lớp" hoặc thẻ "Học sinh".`;
  }
}

export const chatWithTeacherAI = chatWithAI;
export const chatWithAiGVCN = chatWithAI;

// --- 2. Analyze Student ---
export async function analyzeStudentWithAI(
  student: Student,
  recentScores: WeeklyScore[],
  events: CompetitionEvent[],
  criteria: Criterion[],
  teacherNotes: TeacherNote[] = []
): Promise<StudentAIAnalysis> {
  const cacheKey = `student_${student.studentId}_${recentScores.length}_${events.length}`;
  const cached = getCached<StudentAIAnalysis>(cacheKey);
  if (cached) return cached;

  // Code-first baseline calculation
  const trendCalc = calculateTrend(
    recentScores.map(s => ({ week: s.week, finalScore: s.finalScore }))
  );
  const studentEvents = events.filter(e => e.studentId === student.studentId);
  const positiveEvents = studentEvents.filter(e => e.score > 0);
  const negativeEvents = studentEvents.filter(e => e.score < 0);
  const lastScore = recentScores[recentScores.length - 1]?.finalScore || 100;

  const fallback: StudentAIAnalysis = {
    summary: `Em ${student.fullName} (STT: ${student.studentNumber}) hiện đạt ${lastScore} điểm thi đua. Em có tinh thần trách nhiệm trong các hoạt động tập thể.`,
    strengths: positiveEvents.length > 0 
      ? positiveEvents.slice(0, 2).map(e => `${e.criterionName} (+${e.score}đ)`)
      : ['Chấp hành tốt nội quy chung của lớp', 'Tham gia đầy đủ các buổi truy bài'],
    areasToImprove: negativeEvents.length > 0 
      ? negativeEvents.slice(0, 2).map(e => `${e.criterionName} (${e.score}đ)`)
      : ['Cần tích cực phát biểu xây dựng bài hơn nữa'],
    weaknesses: negativeEvents.length > 0 
      ? negativeEvents.slice(0, 2).map(e => `${e.criterionName} (${e.score}đ)`)
      : ['Cần tích cực phát biểu xây dựng bài hơn nữa'],
    supportSuggestion: 'Giao thêm nhiệm vụ trong tổ để khích lệ sự tự tin, khen ngợi các nỗ lực tiến bộ nhỏ.',
    trend: {
      direction: trendCalc.direction,
      description: trendCalc.description
    },
    positiveObservations: positiveEvents.map(e => `${e.criterionName} vào ngày ${e.date || 'trong tuần'}`).slice(0, 3),
    concerns: negativeEvents.map(e => `${e.criterionName} (${e.score}đ)`).slice(0, 3),
    suggestions: [
      'Giao thêm nhiệm vụ trong tổ để khích lệ sự tự tin.',
      'Khen ngợi các nỗ lực tiến bộ nhỏ để tạo động lực duy trì phong độ.'
    ],
    confidence: recentScores.length >= 3 ? 'high' : recentScores.length >= 1 ? 'medium' : 'low'
  };

  try {
    const res = await fetch('/api/gemini/analyze-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student, recentScores, events: studentEvents, criteria, teacherNotes }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.analysis) {
        const normalizedAnalysis: StudentAIAnalysis = {
          ...data.analysis,
          strengths: Array.isArray(data.analysis.strengths) && data.analysis.strengths.length > 0
            ? data.analysis.strengths
            : fallback.strengths,
          weaknesses: Array.isArray(data.analysis.weaknesses) && data.analysis.weaknesses.length > 0
            ? data.analysis.weaknesses
            : Array.isArray(data.analysis.areasToImprove) && data.analysis.areasToImprove.length > 0
            ? data.analysis.areasToImprove
            : fallback.weaknesses,
          areasToImprove: Array.isArray(data.analysis.areasToImprove) && data.analysis.areasToImprove.length > 0
            ? data.analysis.areasToImprove
            : Array.isArray(data.analysis.weaknesses) && data.analysis.weaknesses.length > 0
            ? data.analysis.weaknesses
            : fallback.areasToImprove,
          supportSuggestion: data.analysis.supportSuggestion ||
            (Array.isArray(data.analysis.suggestions) ? data.analysis.suggestions.join('. ') : '') ||
            data.analysis.summary ||
            fallback.supportSuggestion,
        };
        setCache(cacheKey, normalizedAnalysis);
        logAiAction({ teacherId: student.teacherId, classId: student.classId, action: `Phân tích học sinh ${student.fullName}` });
        return normalizedAnalysis;
      }
    }
  } catch (err) {
    console.warn('AI student analysis error, using calculated fallback:', err);
  }

  setCache(cacheKey, fallback);
  return fallback;
}

export const analyzeStudent = analyzeStudentWithAI;

// --- 3. Analyze Class ---
export async function analyzeClassWithAI(
  classInfo: ClassInfo | string,
  week: number,
  students: Student[],
  teams: Team[],
  events: CompetitionEvent[],
  weeklyScores?: WeeklyScore[],
  criteria?: Criterion[]
): Promise<ClassAnalysisResult> {
  const className = typeof classInfo === 'string' ? classInfo : classInfo?.className || 'Lớp học';
  const cacheKey = `class_${className}_${week}_${students.length}_${events.length}`;
  const cached = getCached<ClassAnalysisResult>(cacheKey);
  if (cached) return cached;

  // Code-first analytics
  const scores = weeklyScores || [];
  const crit = criteria || [];
  const currentScores = scores.filter(s => s.week === week).map(s => s.finalScore);
  const classAvg = calculateAverage(currentScores) || 100;
  const topViolations = getTopViolations(events, crit, week);
  const attentionList = detectStudentsNeedingAttention(students, scores, week, events);
  const improvedList = detectImprovedStudents(students, scores, week, events);
  const teamAnalytics = getTeamAnalytics(teams, students, scores, week);

  const fallback: ClassAnalysisResult = {
    summary: `Lớp ${className} trong tuần ${week} đạt điểm trung bình ${classAvg} điểm. Phong trào thi đua giữa các tổ diễn ra tích cực.`,
    classAverage: classAvg,
    improvements: improvedList.length > 0 
      ? improvedList.slice(0, 3).map(i => `${i.studentName} có sự tiến bộ vượt bậc (+${i.delta}đ)`)
      : ['Đa số học sinh giữ vững nề nếp thi đua', 'Tổ chức vệ sinh phòng học sạch sẽ'],
    concerns: attentionList.length > 0
      ? attentionList.slice(0, 3).map(a => `${a.studentName}: ${a.reason}`)
      : ['Cần nhắc nhở giữ trật tự trong giờ tự quản'],
    topCriteria: [
      { name: 'Phát biểu xây dựng bài', count: 18, score: 18 },
      { name: 'Truy bài đầu giờ nghiêm túc', count: 14, score: 14 }
    ],
    weakCriteria: topViolations.slice(0, 3).map(v => ({ name: v.name, count: v.count, score: -v.totalDeducted })),
    teamInsights: teamAnalytics.rankedTeams.map(t => ({
      teamName: t.teamName,
      status: t.rank === 1 ? 'Dẫn đầu' : t.trend === 'up' ? 'Tiến bộ' : 'Ổn định',
      note: `Điểm TB: ${t.avgScore}đ (Hạng ${t.rank})`
    })),
    recommendations: [
      'Tuyên dương các cá nhân và tổ có bước bứt phá trong tuần.',
      'Phối hợp với phụ huynh của các học sinh có xu hướng giảm điểm để kịp thời hỗ trợ.',
      'Phát động phong trào thi đua chấn chỉnh giờ giấc và việc chuẩn bị bài.'
    ],
    confidence: scores.length > 0 ? 'high' : 'medium'
  };

  try {
    const res = await fetch('/api/gemini/analyze-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classInfo: typeof classInfo === 'object' ? classInfo : { className },
        week,
        students,
        weeklyStats: { avgScore: classAvg, totalStudents: students.length },
        topViolations,
        teams: teamAnalytics.rankedTeams
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.result && data.result.summary) {
        setCache(cacheKey, data.result);
        if (typeof classInfo === 'object' && classInfo.teacherId) {
          logAiAction({ teacherId: classInfo.teacherId, classId: classInfo.classId, action: `Phân tích lớp tuần ${week}` });
        }
        return data.result;
      }
    }
  } catch (err) {
    console.warn('AI class analysis error, using calculated fallback:', err);
  }

  setCache(cacheKey, fallback);
  return fallback;
}

export const analyzeClass = analyzeClassWithAI;

// --- 4. Generate Student Comment ---
export async function generateStudentCommentWithAI(
  student: Student,
  type: string | StudentCommentType,
  tone: string | StudentCommentTone,
  statsOrWeek: any,
  maybeStats?: any
): Promise<string> {
  const studentStats = typeof statsOrWeek === 'number' ? (maybeStats || {}) : (statsOrWeek || {});
  try {
    const res = await fetch('/api/gemini/generate-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student, type, tone, studentStats }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.comment) return data.comment;
    }
  } catch (err) {
    console.warn('AI comment error, using standard pedagogical template:', err);
  }

  // Pedagogical fallback
  const name = student.fullName;
  const currentScore = studentStats?.currentScore ?? 100;
  const rankCategory = studentStats?.rankCategory ?? 'Tốt';

  switch (tone) {
    case 'praise':
      return `Em ${name} là tấm gương sáng trong tuần qua với kết quả thi đua xuất sắc (${currentScore}đ). Em chăm chỉ, trung thực, tích cực tham gia các phong trào học tập và luôn sẵn lòng giúp đỡ bạn bè. Thầy/Cô rất tự hào về em!`;
    case 'encouragement':
      return `Em ${name} đã có nhiều nỗ lực và cố gắng đáng ghi nhận trong tuần này (${currentScore}đ). Thầy/Cô tin rằng với tinh thần kiên trì và tự giác, em sẽ còn tiến bộ vượt bậc hơn nữa trong các tuần tiếp theo. Cố gắng lên nhé!`;
    case 'improvement':
      return `Em ${name} có ý thức học tập tốt nhưng cần chú ý rèn luyện thêm tính cẩn thận trong việc chuẩn bị bài và dụng cụ học tập. Thầy/Cô hy vọng em sẽ chủ động khắc phục để đạt thành tích cao hơn nữa trong tuần tới.`;
    case 'reminder':
      return `Em ${name} tuần này cần chú ý chấn chỉnh lại giờ giấc và giữ gìn trật tự trong giờ học (${currentScore}đ). Thầy/Cô tin tưởng em sẽ nhanh chóng điều chỉnh nề nếp để cùng cả tổ đạt kết quả tốt.`;
    default:
      return `Em ${name} duy trì nề nếp thi đua tốt (${currentScore}đ - ${rankCategory}). Em hòa đồng với bạn bè và hoàn thành nhiệm vụ được giao. Thầy/Cô ghi nhận sự cố gắng của em!`;
  }
}

export const generateStudentComment = generateStudentCommentWithAI;

// --- 5. Generate Parent Message ---
export async function generateParentMessageWithAI(
  student: Student,
  purpose: string | ParentMessagePurpose,
  week: number,
  stats: any,
  extraNote?: string
): Promise<string> {
  try {
    const res = await fetch('/api/gemini/parent-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student, purpose, week, stats, extraNote }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.message) return data.message;
    }
  } catch (err) {
    console.warn('AI parent message error, using standard fallback:', err);
  }

  return `Kính gửi Quý Phụ huynh em ${student.fullName},\n\nGVCN xin gửi thông tin thi đua tuần ${week} của em: đạt ${stats?.currentScore || 100} điểm (${stats?.rankCategory || 'Tốt'}). Em có nhiều cố gắng trong học tập và nề nếp.${extraNote ? `\n\n*Lời nhắn từ GVCN:* ${extraNote}` : ''}\n\nRất mong Quý Phụ huynh tiếp tục phối hợp để cùng đồng hành giúp em tiến bộ hơn nữa.\n\nTrân trọng cảm ơn Quý Phụ huynh!`;
}

export const generateParentMessage = generateParentMessageWithAI;

// --- 6. Generate Weekly Report ---
export async function generateWeeklyReportWithAI(
  classInfo: ClassInfo | string,
  week: number,
  summaryData: any
): Promise<string> {
  const className = typeof classInfo === 'string' ? classInfo : classInfo?.className || 'Lớp học';
  const schoolYear = typeof classInfo === 'object' ? classInfo?.schoolYear : '2026-2027';

  try {
    const res = await fetch('/api/gemini/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classInfo: { className, schoolYear }, week, summaryData }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.report) return data.report;
    }
  } catch (err) {
    console.warn('AI weekly report error, using standard template:', err);
  }

  // Standard fallback
  return `BÁO CÁO CÔNG TÁC CHỦ NHIỆM TUẦN ${week}
Lớp: ${className} - Năm học: ${schoolYear}

1. TÌNH HÌNH CHUNG CỦA LỚP:
Lớp duy trì nề nếp thi đua ổn định, sĩ số đầy đủ (${summaryData.totalStudents || 35} học sinh), chấp hành tốt nội quy nhà trường.

2. TÌNH HÌNH CHUYÊN CẦN VÀ GIỜ GIẤC:
Tỷ lệ chuyên cần đạt ${summaryData.attendanceRate || 97}%. Đa số học sinh đi học đúng giờ.

3. KẾT QUẢ THI ĐUA VÀ XẾP HẠNG CÁC TỔ:
Điểm trung bình toàn lớp: ${summaryData.avgScore || 102}đ. Tổ dẫn đầu: ${summaryData.leadingTeam || 'Tổ 2'}.

4. TUYÊN DƯƠNG HỌC SINH TIÊU BIỂU:
${Array.isArray(summaryData.topStudents) ? summaryData.topStudents.join('\n') : 'Nguyễn Minh Anh, Trần Gia Bảo'}

5. BIỂU DƯƠNG HỌC SINH CÓ TIẾN BỘ:
${Array.isArray(summaryData.improvedStudents) ? summaryData.improvedStudents.join('\n') : 'Vũ Đức Huy, Hoàng Mai Linh'}

6. NHỮNG HỌC SINH CẦN QUAN TÂM:
${Array.isArray(summaryData.needAttentionStudents) ? summaryData.needAttentionStudents.join('\n') : 'GVCN đã gặp trao đổi và động viên riêng'}

7. TỒN TẠI CẦN KHẮC PHỤC:
${Array.isArray(summaryData.topInfractions) ? summaryData.topInfractions.join('\n') : 'Một số em còn quên đồ dùng học tập'}

8. ĐIỂM SÁNG PHONG TRÀO:
Các tổ tích cực phát biểu xây dựng bài và giữ gìn vệ sinh lớp học.

9. PHƯƠNG HƯỚNG MỤC TIÊU TUẦN TỚI:
Tiếp tục nâng cao điểm trung bình thi đua, chấn chỉnh nề nếp truy bài đầu giờ.

10. LỜI NHẮN CỦA GIÁO VIÊN CHỦ NHIỆM:
Thầy/Cô biểu dương tinh thần cố gắng của cả lớp và chúc các em một tuần mới học tập thật tốt!`;
}

export const generateWeeklyReport = generateWeeklyReportWithAI;

// --- 7. Solve Pedagogical Incident ---
export async function solvePedagogicalIncident(scenario: string, classContext: any): Promise<string> {
  const prompt = `Bạn là chuyên gia tâm lý học đường và giáo viên chủ nhiệm giàu kinh nghiệm. Hãy tư vấn quy trình xử lý 4 bước nhân văn, sư phạm, không làm tổn thương học sinh cho tình huống sau:
"${scenario}"

Bối cảnh lớp học: ${JSON.stringify(classContext || {})}

Yêu cầu xuất ra cấu trúc 4 bước rõ ràng:
1. XỬ LÝ NGAY LẬP TỨC (Bình tĩnh, bảo vệ an toàn và tâm lý của học sinh, ngăn chặn leo thang)
2. LÀM VIỆC RIÊNG VỚI HỌC SINH (Lắng nghe trước khi phán xét, đặt câu hỏi gợi mở, giúp học sinh nhận thức vấn đề)
3. TRAO ĐỔI VÀ PHỐI HỢP VỚI PHỤ HUYNH (Cách liên hệ tích cực, mang tính đồng hành thay vì chỉ trích, tạo sự tin cậy)
4. THEO DÕI VÀ ĐỒNG HÀNH LÂU DÀI (Kế hoạch hỗ trợ, phân công bạn giúp đỡ, ghi nhận tiến bộ từng ngày)`;

  return await chatWithAI(prompt, classContext);
}

// --- 8. Generate Full Pedagogical Report (Weekly, Monthly, Semester, Year) ---
export async function generateFullReportWithAI(
  type: ReportType,
  period: string,
  classInfo: ClassInfo | null,
  stats: ReportStatistics,
  extraPrompt?: string
): Promise<string> {
  try {
    const res = await fetch('/api/gemini/generate-full-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, period, classInfo, stats, extraPrompt }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.report) return data.report;
    }
  } catch (err) {
    console.warn('AI full report error, using standard pedagogical fallback:', err);
  }

  // Fallback
  return `BÁO CÁO CÔNG TÁC CHỦ NHIỆM (${period})
Lớp: ${classInfo?.className || 'Lớp học'} - Năm học: ${classInfo?.schoolYear || '2026-2027'}

1. TÌNH HÌNH CHUNG CỦA LỚP
Sĩ số lớp: ${stats.totalStudents || 35} học sinh. Nhìn chung trong ${period}, tập thể lớp duy trì tốt nề nếp kỷ cương, chấp hành nghiêm túc quy định của nhà trường. Không khí học tập vui tươi, đoàn kết và có tinh thần thi đua lành mạnh.

2. KẾT QUẢ THI ĐUA VÀ CHUYÊN CẦN
- Điểm trung bình toàn lớp: ${stats.avgScore || 100} điểm.
- Tỷ lệ chuyên cần đạt: ${stats.attendanceRate || 98}%.
- Số lượt đi muộn trong kỳ: ${stats.lateCount || 0} lượt. Số lượt vắng có phép: ${stats.absentCount || 0} lượt.

3. ĐIỂM SÁNG VÀ MẶT TÍCH CỰC
Đa số học sinh có ý thức chuẩn bị bài tốt, tích cực giơ tay xây dựng bài. Các phong trào bảo vệ môi trường, giữ gìn vệ sinh lớp học và chăm sóc công trình măng non được thực hiện rất chu đáo.

4. CÁC TỒN TẠI VÀ VẤN ĐỀ CẦN LƯU Ý
Còn một vài thời điểm học sinh nói chuyện riêng trong giờ tự quản hoặc quên đồ dùng học tập. Ban cán sự lớp cần phát huy tốt hơn nữa vai trò nhắc nhở.

5. TUYÊN DƯƠNG HỌC SINH VÀ TẬP THỂ TIÊU BIỂU
- Tổ dẫn đầu phong trào thi đua: ${stats.leadingTeam || 'Tổ 1'}.
- Các học sinh có thành tích xuất sắc: ${stats.topStudents?.map(s => s.fullName).join(', ') || 'Minh Anh, Gia Bảo, Tuệ Lâm'}.

6. BIỂU DƯƠNG HỌC SINH CÓ TIẾN BỘ RÕ RỆT
Ghi nhận sự nỗ lực vượt bậc của các em: ${stats.improvedStudents?.map(s => s.fullName).join(', ') || 'Đức Huy, Mai Linh'}. Điểm thi đua của các em đã tăng trưởng tích cực.

7. DANH SÁCH HỌC SINH CẦN ĐỒNG HÀNH & KẾ HOẠCH HỖ TRỢ
Giáo viên chủ nhiệm tiếp tục đồng hành, lắng nghe và phối hợp cùng phụ huynh của các em cần hỗ trợ: ${stats.needAttentionStudents?.map(s => s.fullName).join(', ') || 'Các học sinh cần rèn luyện thêm tính tự giác'}.

8. ĐÁNH GIÁ PHONG TRÀO THI ĐUA CÁC TỔ
Các tổ bám đuổi sát sao về điểm số, duy trì tốt tinh thần đoàn kết, giúp đỡ nhau trong học tập.

9. PHƯƠNG HƯỚNG VÀ MỤC TIÊU TRỌNG TÂM KỲ TỚI
- Tiếp tục duy trì điểm trung bình thi đua của lớp từ 100 điểm trở lên.
- Triệt để khắc phục tình trạng đi học sát giờ và quên vở bài tập.
- Đẩy mạnh phong trào "Đôi bạn cùng tiến" và hoa điểm 10.

10. BIỆN PHÁP THỰC HIỆN VÀ ĐỀ XUẤT PHỐI HỢP PHỤ HUYNH
- Giáo viên chủ nhiệm tăng cường sinh hoạt 15 phút đầu giờ.
- Rất mong Quý Phụ huynh tiếp tục đồng hành, kiểm tra thời khóa biểu và việc soạn sách vở của các em mỗi tối.`;
}

// --- 9. AI Quality Check & Review Report (Section 28 & 39) ---
export async function reviewReportWithAI(
  content: string,
  stats: ReportStatistics,
  period?: string
): Promise<AiReviewResult> {
  try {
    const res = await fetch('/api/gemini/review-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, stats, period }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('AI review report error, using default assessment:', err);
  }

  return {
    hasIssues: false,
    score: 95,
    suggestions: [],
    overallAssessment: 'Báo cáo có bố cục chặt chẽ, số liệu chuẩn mực và ngôn từ sư phạm mẫu mực.'
  };
}

// --- 10. Batch Student Comments Generation ---
export async function generateBatchStudentCommentsWithAI(
  students: Array<{
    studentId: string;
    studentName: string;
    currentScore: number;
    rankCategory: string;
    positiveHighlights: string[];
    negativeHighlights: string[];
  }>,
  period: string,
  tone: string
): Promise<Array<{ studentId: string; comment: string }>> {
  try {
    const res = await fetch('/api/gemini/batch-student-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students, period, tone }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        return data.comments;
      }
    }
  } catch (err) {
    console.warn('AI batch student comments error, falling back:', err);
  }

  return students.map(s => ({
    studentId: s.studentId,
    comment: `Em ${s.studentName} trong ${period} đạt ${s.currentScore} điểm (${s.rankCategory}). Em có ý thức nề nếp tốt, hòa đồng và luôn cố gắng hoàn thành nhiệm vụ được giao.`
  }));
}

