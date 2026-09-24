import { Student, WeeklyScore, CompetitionEvent, Criterion, TeacherNote } from '../types';

/**
 * AI Prompt Service
 * Đóng gói prompt chuẩn mực sư phạm, bảo vệ dữ liệu riêng tư,
 * chống bịa đặt (anti-hallucination) và chuẩn hóa định dạng JSON.
 */

export const AI_SYSTEM_INSTRUCTION = `Bạn là "BỘ NÃO AI GVCN" - chuyên gia tư vấn sư phạm và phân tích thi đua học đường, đồng hành cùng Giáo viên Chủ nhiệm tại Việt Nam.

NGUYÊN TẮC BẮT BUỘC:
1. Bạn là trợ lý tham mưu cho giáo viên, KHÔNG PHẢI người ra quyết định thay giáo viên.
2. CHỈ sử dụng dữ liệu được cung cấp trong context. Nếu không đủ dữ liệu để kết luận, HÃY NÓI RÕ "Chưa đủ dữ liệu để kết luận", TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ ĐOÁN HOẶC SUY DIỄN CHỦ QUAN.
3. TUYỆT ĐỐI KHÔNG sử dụng các nhãn tiêu cực hoặc xúc phạm học sinh như: "lười", "hư", "cá biệt", "yếu kém", "bất hảo". Luôn dùng ngôn từ sư phạm tích cực, tôn trọng, hướng tới sự tiến bộ và hỗ trợ (ví dụ: "cần hỗ trợ", "cần chú ý nề nếp", "chưa tập trung").
4. Phân biệt rõ ràng giữa DỮ LIỆU THỰC TẾ (số điểm, số lần vi phạm) và SUY ĐOÁN NGUYÊN NHÂN. Không tự ý kết luận nguyên nhân do "lười biếng" hay "gia đình bỏ bê" nếu dữ liệu không có thông tin đó.
5. Luôn kèm theo bằng chứng cụ thể (ví dụ: "tuần 8 đạt 92 điểm, giảm 8 điểm so với tuần 7; có 2 lần quên mang sách bài tập").
6. Trả lời bằng tiếng Việt chuẩn mực, mạch lạc, khúc chiết, chuẩn mực sư phạm.`;

export function buildStudentAnalysisPrompt(
  student: Student,
  recentScores: WeeklyScore[],
  events: CompetitionEvent[],
  criteria: Criterion[],
  teacherNotes: TeacherNote[] = []
): string {
  const simplifiedScores = recentScores.map(s => ({
    week: s.week,
    finalScore: s.finalScore,
    totalPositive: s.totalPositive,
    totalNegative: s.totalNegative,
    rankCategory: s.rankCategory
  }));

  const simplifiedEvents = events.map(e => ({
    week: e.week,
    date: e.date,
    criterionName: e.criterionName,
    score: e.score,
    note: e.note || ''
  }));

  const safeNotes = teacherNotes.map(n => ({
    date: n.date,
    note: n.note
  }));

  return `Phân tích hồ sơ thi đua của học sinh:
- Tên học sinh: ${student.fullName} (STT: ${student.studentNumber}, Tổ: ${student.teamName})
- Chức vụ: ${student.cadreRole && student.cadreRole !== 'none' ? student.cadreRole : 'Học sinh'}
- Lịch sử điểm các tuần: ${JSON.stringify(simplifiedScores)}
- Sự kiện thi đua (cộng/trừ điểm): ${JSON.stringify(simplifiedEvents)}
- Ghi chú quan sát từ GVCN: ${JSON.stringify(safeNotes)}

Yêu cầu xuất ra định dạng JSON CHUẨN XÁC, không bọc trong markdown codeblock nếu có thể, tuân thủ đúng schema:
{
  "summary": "Tóm tắt ngắn gọn 2-3 câu về tình hình thi đua hiện tại của học sinh dựa trên số liệu thực tế",
  "strengths": ["Các điểm mạnh, nề nếp hoặc tiêu chí học sinh làm tốt"],
  "areasToImprove": ["Các điểm hoặc tiêu chí học sinh cần lưu ý hoàn thiện"],
  "trend": {
    "direction": "up|down|stable|mixed",
    "description": "Mô tả ngắn gọn xu hướng điểm qua các tuần và lý do số liệu"
  },
  "positiveObservations": ["Những nỗ lực hoặc thành tích cụ thể được ghi nhận"],
  "concerns": ["Những điểm bất thường hoặc cần quan sát thêm nếu có"],
  "suggestions": ["2-3 đề xuất sư phạm mang tính xây dựng, cụ thể cho GVCN để giúp đỡ học sinh"],
  "confidence": "high|medium|low"
}`;
}

export function buildClassAnalysisPrompt(
  className: string,
  week: number,
  classSummaryData: any
): string {
  return `Phân tích toàn diện tình hình thi đua lớp ${className} - Tuần ${week}:
Dữ liệu lớp học:
${JSON.stringify(classSummaryData, null, 2)}

Yêu cầu xuất ra JSON chuẩn (không markdown codeblock):
{
  "summary": "Tóm tắt toàn cảnh tuần thi đua của lớp trong 2-3 câu",
  "classAverage": ${classSummaryData.avgScore || 100},
  "improvements": ["Các tiến bộ rõ nét của lớp về chuyên cần, học tập, phong trào"],
  "concerns": ["Những vấn đề nề nếp cần chấn chỉnh hoặc học sinh cần quan tâm"],
  "topCriteria": [
    { "name": "Tên tiêu chí thực hiện tốt nhất", "count": 1, "score": 1 }
  ],
  "weakCriteria": [
    { "name": "Tên tiêu chí bị trừ điểm nhiều nhất", "count": 1, "score": -1 }
  ],
  "teamInsights": [
    { "teamName": "Tên tổ", "status": "Tốt|Tiến bộ|Cần nỗ lực", "note": "Nhận xét ngắn về tổ" }
  ],
  "recommendations": ["3 hành động trọng tâm cho GVCN trong tuần tiếp theo"],
  "confidence": "high"
}`;
}

export function buildStudentCommentPrompt(
  studentName: string,
  teamName: string,
  type: string,
  tone: string,
  stats: any
): string {
  const toneMap: Record<string, string> = {
    praise: 'Khen ngợi và biểu dương nồng nhiệt (dành cho học sinh xuất sắc/tiêu biểu)',
    positive: 'Tích cực, ghi nhận sự tiến bộ và duy trì nề nếp tốt',
    encouragement: 'Động viên, khích lệ tinh thần cố gắng vượt khó',
    improvement: 'Định hướng hoàn thiện, chỉ rõ điểm cần phấn đấu với thái độ xây dựng',
    reminder: 'Nhắc nhở nhẹ nhàng, chân thành nhưng nghiêm túc về nề nếp'
  };

  return `Viết lời nhận xét học bạ/sổ liên lạc cho học sinh:
- Tên học sinh: ${studentName} (${teamName})
- Loại nhận xét: ${type}
- Phong cách / Sắc thái sư phạm: ${toneMap[tone] || 'Tích cực, động viên'}
- Số liệu thi đua thực tế:
  + Điểm thi đua: ${stats.currentScore}đ (Xếp loại: ${stats.rankCategory})
  + Xu hướng: ${stats.trendDescription || 'Ổn định'}
  + Điểm cộng nổi bật: ${stats.topPositive || 'Chăm chỉ, thực hiện tốt nội quy'}
  + Điểm cần lưu ý: ${stats.topNegative || 'Không có vi phạm lớn'}

YÊU CẦU:
- Viết 3 đến 5 câu.
- Chuẩn mực sư phạm Việt Nam, chân thành, ấm áp, có căn cứ số liệu nhưng diễn đạt tự nhiên.
- Tuyệt đối không dùng từ ngữ xúc phạm hoặc tiêu cực.
- Chỉ trả về nội dung nhận xét, không kèm lời mở đầu của AI.`;
}

export function buildParentMessagePrompt(
  studentName: string,
  className: string,
  week: number,
  purpose: string,
  stats: any,
  teacherNote?: string
): string {
  const purposeMap: Record<string, string> = {
    praise: 'Tuyên dương thành tích xuất sắc và sự cố gắng nổi bật',
    progress: 'Thông báo sự tiến bộ vượt bậc của học sinh so với tuần trước',
    reminder: 'Nhắc nhở nề nếp/giờ giấc/bài tập và mong phụ huynh đôn đốc thêm',
    concern: 'Trao đổi về sự sụt giảm điểm thi đua để gia đình phối hợp hỗ trợ',
    weeklyUpdate: 'Thông báo kết quả thi đua tuần định kỳ'
  };

  return `Soạn tin nhắn SMS/Zalo gửi Quý Phụ huynh học sinh:
- Học sinh: ${studentName}, Lớp: ${className}
- Tuần: ${week}
- Mục đích trao đổi: ${purposeMap[purpose] || 'Thông báo thi đua tuần'}
- Dữ liệu tuần:
  + Điểm thi đua: ${stats.currentScore}đ (${stats.rankCategory})
  + Điểm cộng: ${stats.topPositive || 'Có ý thức học tập tốt'}
  + Điểm lưu ý: ${stats.topNegative || 'Cần chú ý chuẩn bị bài đầy đủ'}
- Lời nhắn bổ sung từ GVCN: ${teacherNote || 'Không có'}

YÊU CẦU:
- Lịch sự, tôn trọng phụ huynh, chân thành, khuyến khích sự hợp tác giữa gia đình và nhà trường.
- Rõ ràng, súc tích (khoảng 60 - 120 từ, phù hợp tin nhắn Zalo/SMS).
- Chỉ trả về nội dung tin nhắn, không kèm giải thích thêm.`;
}
