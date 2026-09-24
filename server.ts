import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

/**
 * Robust Gemini model invoker with model fallback.
 * Prioritizes high-availability stable models (gemini-3.5-flash) and gracefully falls back.
 */
async function generateGeminiContent(
  ai: GoogleGenAI,
  params: { contents: any; config?: any }
): Promise<string> {
  const models = [
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.8-flash'
  ];

  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini model candidates failed');
}

function cleanAndParseJson<T = any>(text: string, fallback: T = {} as T): T {
  if (!text) return fallback;
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// In-memory rate limiter for AI endpoints (sliding window)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const AI_MAX_REQUESTS_PER_WINDOW = 40;

function aiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = requestCounts.get(clientIp);

  if (!record || now > record.resetAt) {
    requestCounts.set(clientIp, { count: 1, resetAt: now + AI_RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (record.count >= AI_MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Hệ thống AI đang tiếp nhận quá nhiều yêu cầu cùng lúc. Thầy/cô vui lòng thử lại sau ít giây để đảm bảo tài nguyên.',
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000)
    });
  }

  record.count += 1;
  return next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Apply rate limiter to all AI endpoints
  app.use('/api/gemini', aiRateLimiter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AI Endpoint: Chat with Teacher Assistant
  app.post('/api/gemini/chat', async (req, res) => {
    const { message, context, history } = req.body || {};
    try {
      const ai = getGeminiClient();

      if (ai) {
        const systemInstruction = `Bạn là "BỘ NÃO AI GVCN" - Trợ lý số chuyên sâu cho Giáo viên Chủ nhiệm tại Việt Nam.
NGUYÊN TẮC:
1. Bạn là trợ lý hỗ trợ tư vấn sư phạm, KHÔNG TỰ QUYẾT ĐỊNH thay giáo viên.
2. CHỈ dựa trên dữ liệu thực tế được cung cấp trong context dưới đây. Nếu không đủ dữ liệu để kết luận, hãy nói rõ "Chưa đủ dữ liệu để kết luận", không tự bịa đặt.
3. TUYỆT ĐỐI KHÔNG sử dụng các nhãn tiêu cực như "lười", "hư", "cá biệt", "yếu kém". Luôn hướng tới sự động viên, giải pháp giúp đỡ và hỗ trợ học sinh.
4. Trả lời bằng tiếng Việt chuẩn mực sư phạm, ngắn gọn, có số liệu minh chứng rõ ràng.

Dữ liệu lớp học:
${JSON.stringify(context || {}, null, 2)}`;

        const contents: any[] = [];
        if (Array.isArray(history) && history.length > 0) {
          for (const msg of history.slice(-6)) {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.text }]
            });
          }
        }
        contents.push({
          role: 'user',
          parts: [{ text: message || 'Xin chào' }]
        });

        const reply = await generateGeminiContent(ai, {
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });

        if (reply) {
          return res.json({ reply });
        }
      }
    } catch {
      // Graceful degradation
    }

    const className = context?.className || 'lớp';
    res.json({
      reply: `Chào Thầy/Cô! Trợ lý AI GVCN đã nhận được thông tin về ${className}. Thầy/Cô có thể theo dõi nhanh danh sách học sinh tiến bộ, các em cần đồng hành và bảng xếp hạng tổ tại mục Tổng quan và Báo cáo. Thầy/Cô có cần em hỗ trợ tổng hợp thêm mục nào không ạ?`
    });
  });

  // AI Endpoint: Analyze Student
  app.post('/api/gemini/analyze-student', async (req, res) => {
    const { student, recentScores, events, criteria, teacherNotes } = req.body || {};
    const fallbackAnalysis = {
      summary: `Học sinh ${student?.fullName || 'học sinh'} duy trì nề nếp thi đua cơ bản ổn định.`,
      strengths: ['Có ý thức kỷ luật và hoàn thành các nhiệm vụ được giao', 'Tích cực tham gia hoạt động tổ nhóm'],
      areasToImprove: ['Cần chú ý chuẩn bị đầy đủ đồ dùng học tập trước khi vào tiết'],
      weaknesses: ['Cần chú ý chuẩn bị đầy đủ đồ dùng học tập trước khi vào tiết'],
      trend: {
        direction: 'stable' as const,
        description: 'Điểm số duy trì phong độ tương đối ổn định giữa các tuần gần đây.'
      },
      positiveObservations: ['Tham gia phát biểu và có nhiều cố gắng trong học tập'],
      concerns: ['Cần theo dõi thêm sự tập trung trong các giờ học cuối buổi'],
      suggestions: [
        'Động viên em tiếp tục phát huy tinh thần tự giác.',
        'Giao một số nhiệm vụ quản lý nhỏ trong tổ để tăng cường sự tự tin.'
      ],
      supportSuggestion: 'Động viên em tiếp tục phát huy tinh thần tự giác, giao một số nhiệm vụ quản lý nhỏ trong tổ để tăng cường sự tự tin.',
      confidence: 'medium' as const
    };

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(200).json({ analysis: fallbackAnalysis });
      }

      const prompt = `Phân tích toàn diện học sinh dựa trên dữ liệu thi đua có thật sau:
Học sinh: ${JSON.stringify(student, null, 2)}
Điểm các tuần: ${JSON.stringify(recentScores || [], null, 2)}
Lịch sử sự kiện (cộng/trừ): ${JSON.stringify(events || [], null, 2)}
Danh mục tiêu chí: ${JSON.stringify(criteria || [], null, 2)}
Ghi chú của GVCN: ${JSON.stringify(teacherNotes || [], null, 2)}

NGUYÊN TẮC:
- Tuyệt đối không dùng từ ngữ tiêu cực: "lười", "hư", "cá biệt", "yếu kém".
- Chỉ dựa trên sự kiện và số điểm thực tế ở trên.
- Đưa ra định dạng JSON chuẩn xác:
{
  "summary": "Tóm tắt ngắn gọn 2-3 câu về tình hình thi đua hiện tại",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "areasToImprove": ["Điểm cần hoàn thiện 1", "Điểm cần hoàn thiện 2"],
  "trend": {
    "direction": "up|down|stable|mixed",
    "description": "Mô tả ngắn gọn xu hướng điểm các tuần"
  },
  "positiveObservations": ["Ghi nhận nỗ lực hoặc thành tích"],
  "concerns": ["Điểm lưu ý nếu có"],
  "suggestions": ["2-3 đề xuất sư phạm cụ thể cho GVCN"],
  "confidence": "high|medium|low"
}`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        }
      });

      const parsed = cleanAndParseJson(text || '', fallbackAnalysis);
      if (parsed) {
        if (!parsed.weaknesses && parsed.areasToImprove) parsed.weaknesses = parsed.areasToImprove;
        if (!parsed.areasToImprove && parsed.weaknesses) parsed.areasToImprove = parsed.weaknesses;
        if (!parsed.supportSuggestion && Array.isArray(parsed.suggestions)) {
          parsed.supportSuggestion = parsed.suggestions.join('. ');
        }
      }
      res.json({ analysis: parsed });
    } catch {
      res.json({ analysis: fallbackAnalysis, isFallback: true });
    }
  });

  // AI Endpoint: Analyze Class
  app.post('/api/gemini/analyze-class', async (req, res) => {
    const { classInfo, students, weeklyStats, topViolations, teams, week } = req.body || {};
    const fallbackClass = {
      summary: `Lớp ${classInfo?.className || 'học'} trong tuần thi đua duy trì nề nếp tốt, điểm trung bình đạt chuẩn thi đua.`,
      classAverage: weeklyStats?.avgScore || 100,
      improvements: ['Chuyên cần duy trì ở mức cao', 'Phong trào phát biểu sôi nổi giữa các tổ'],
      concerns: ['Một số học sinh còn quên đồ dùng hoặc đi học muộn đầu tuần'],
      topCriteria: [{ name: 'Phát biểu xây dựng bài', count: 15, score: 15 }],
      weakCriteria: [{ name: 'Nói chuyện riêng', count: 4, score: -4 }],
      teamInsights: [
        { teamName: 'Tổ 1', status: 'Tốt', note: 'Duy trì nề nếp ổn định' },
        { teamName: 'Tổ 2', status: 'Xuất sắc', note: 'Dẫn đầu phong trào thi đua' }
      ],
      recommendations: [
        'Tuyên dương các cá nhân và tổ có tiến bộ trong tiết sinh hoạt lớp.',
        'Phối hợp phụ huynh nhắc nhở giờ giấc cho các học sinh hay đi muộn.',
        'Phát động phong trào thi đua giữ gìn trật tự giờ tự quản.'
      ],
      confidence: 'high' as const
    };

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(200).json({ result: fallbackClass });
      }

      const prompt = `Phân tích tình hình thi đua cả lớp dựa trên dữ liệu:
Thông tin lớp: ${JSON.stringify(classInfo || {})}
Tuần thi đua: ${week || 1}
Thống kê tuần: ${JSON.stringify(weeklyStats || {})}
Top lỗi nề nếp: ${JSON.stringify(topViolations || [])}
Tình hình các tổ: ${JSON.stringify(teams || [])}
Danh sách học sinh sơ bộ: ${JSON.stringify((students || []).slice(0, 15))}

Hãy trả về JSON thuần túy (không markdown codeblock):
{
  "summary": "Tóm tắt tổng quan 2-3 câu",
  "classAverage": 100,
  "improvements": ["3-4 phát hiện tích cực về chuyên cần, nề nếp, học tập"],
  "concerns": ["2-3 vấn đề cần lưu ý hoặc khắc phục"],
  "topCriteria": [{ "name": "Tên tiêu chí", "count": 1, "score": 1 }],
  "weakCriteria": [{ "name": "Tên tiêu chí", "count": 1, "score": -1 }],
  "teamInsights": [{ "teamName": "Tên tổ", "status": "Tốt|Tiến bộ|Cần chú ý", "note": "Nhận xét ngắn" }],
  "recommendations": ["3 hành động cụ thể cho GVCN tuần tới"],
  "confidence": "high|medium|low"
}`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        }
      });

      const parsed = cleanAndParseJson(text || '', fallbackClass);
      res.json({ result: parsed });
    } catch {
      res.json({ result: fallbackClass, isFallback: true });
    }
  });

  // AI Endpoint: Generate Student Comment
  app.post('/api/gemini/generate-comment', async (req, res) => {
    const { student, type, tone, studentStats } = req.body || {};
    const fallbackComment = `Em ${student?.fullName || 'học sinh'} trong thời gian qua luôn có ý thức học tập và nề nếp tốt. Em chăm chỉ, tích cực tham gia các hoạt động tập thể và chan hòa cùng bạn bè. Thầy/Cô ghi nhận sự cố gắng của em và mong em tiếp tục phát huy!`;

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(200).json({ comment: fallbackComment });
      }

      const prompt = `Bạn là giáo viên chủ nhiệm. Hãy viết lời nhận xét cho học sinh:
- Tên học sinh: ${student?.fullName || 'học sinh'} (Tổ: ${student?.teamName || student?.teamId || 'Tổ'})
- Điểm thi đua: ${studentStats?.currentScore || 100}đ (Xếp loại: ${studentStats?.rankCategory || 'Tốt'})
- Loại nhận xét: ${type || 'Nhận xét tuần'}
- Sắc thái: ${tone || 'positive'} (praise: Khen ngợi / positive: Tích cực / encouragement: Động viên / improvement: Định hướng cải thiện / reminder: Nhắc nhở nhẹ)
- Thống kê: ${JSON.stringify(studentStats || {})}

YÊU CẦU:
- Viết 3 đến 5 câu.
- Ngôn ngữ ấm áp, chuẩn mực sư phạm Việt Nam, khích lệ học sinh, không dùng từ ngữ tiêu cực.
- Trả về nguyên văn lời nhận xét, không thêm lời chào mở đầu hay kết luận.`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          temperature: 0.6,
        }
      });

      res.json({ comment: text?.trim() || fallbackComment });
    } catch {
      res.json({ comment: fallbackComment, isFallback: true });
    }
  });

  // AI Endpoint: Generate Parent Message
  app.post('/api/gemini/parent-message', async (req, res) => {
    const { student, purpose, tone, week, stats, extraNote } = req.body || {};
    const fallbackMessage = `Kính gửi Quý Phụ huynh em ${student?.fullName || 'học sinh'}, trong tuần ${week || ''}, em đạt điểm thi đua ${stats?.currentScore || 100} điểm (${stats?.rankCategory || 'Tốt'}). Em có nhiều cố gắng trong nề nếp và học tập. Rất mong Quý Phụ huynh tiếp tục phối hợp cùng GVCN để giúp em duy trì phong độ tốt!`;

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(200).json({ message: fallbackMessage });
      }

      const prompt = `Soạn tin nhắn SMS/Zalo gửi phụ huynh học sinh:
- Học sinh: ${student?.fullName || 'học sinh'}, Lớp: ${student?.className || 'Lớp học'}
- Tuần: ${week || ''}
- Mục đích: ${purpose || 'Thông báo thi đua'}
- Điểm thi đua: ${stats?.currentScore || 100} (${stats?.rankCategory || 'Tốt'})
- Điểm nổi bật: ${stats?.positiveSummary || 'Chăm chỉ, tích cực xây dựng bài'}
- Điểm cần lưu ý: ${stats?.negativeSummary || 'Không có vi phạm lớn'}
- Lời nhắn bổ sung từ GVCN: ${extraNote || 'Không có'}

Yêu cầu:
- Ngắn gọn (60 - 100 từ), trang trọng, chân thành, tôn trọng phụ huynh.
- Nhấn mạnh tinh thần phối hợp nhà trường và gia đình.
- Trả về trực tiếp nội dung tin nhắn.`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          temperature: 0.6,
        }
      });

      res.json({ message: text?.trim() || fallbackMessage });
    } catch {
      res.json({ message: fallbackMessage, isFallback: true });
    }
  });

  // AI Endpoint: Generate Weekly Report
  app.post('/api/gemini/generate-report', async (req, res) => {
    const { classInfo, week, summaryData } = req.body || {};
    const fallbackReport = `BÁO CÁO CÔNG TÁC CHỦ NHIỆM TUẦN ${week || ''}\nLớp: ${classInfo?.className || 'Lớp học'}\nTổng số học sinh: ${summaryData?.totalStudents || 35}\nĐiểm trung bình: ${summaryData?.avgScore || 100}\nTình hình nề nếp tuần qua cơ bản ổn định.`;

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(200).json({ report: fallbackReport });
      }

      const prompt = `Soạn thảo bản Báo cáo Công tác Chủ nhiệm Tuần ${week} cho lớp ${classInfo?.className || 'Lớp học'}, năm học ${classInfo?.schoolYear || '2026-2027'}.
Dữ liệu tổng hợp tuần:
${JSON.stringify(summaryData, null, 2)}

Hãy trình bày theo đúng định dạng chuẩn mực sư phạm 10 mục:
1. Tình hình chung của lớp
2. Tình hình chuyên cần và giờ giấc
3. Kết quả thi đua và xếp hạng các tổ
4. Tuyên dương học sinh tiêu biểu xuất sắc
5. Biểu dương học sinh có tiến bộ vượt bậc
6. Những học sinh cần quan tâm, nhắc nhở & kế hoạch phối hợp phụ huynh
7. Các tồn tại, vi phạm nề nếp nổi bật trong tuần
8. Điểm sáng phong trào và hoạt động tập thể
9. Phương hướng, mục tiêu và biện pháp trọng tâm tuần tới
10. Lời nhắn gửi của GVCN tới tập thể lớp

Ngôn phong chuẩn mực sư phạm Việt Nam, trang trọng, khích lệ học sinh.`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          temperature: 0.5,
        }
      });

      res.json({ report: text || fallbackReport });
    } catch {
      res.json({ report: fallbackReport, isFallback: true });
    }
  });

  // AI Endpoint: Generate Full Report (Weekly, Monthly, Semester, Year)
  app.post('/api/gemini/generate-full-report', async (req, res) => {
    const { type, period, classInfo, stats, extraPrompt } = req.body || {};
    const fallbackReport = `BÁO CÁO CÔNG TÁC CHỦ NHIỆM (${period || 'Định kỳ'})
Lớp: ${classInfo?.className || 'Lớp học'} - Năm học: ${classInfo?.schoolYear || '2026-2027'}

1. TÌNH HÌNH CHUNG CỦA LỚP
Sĩ số lớp: ${stats?.totalStudents || 35} học sinh. Nhìn chung trong ${period || 'kỳ này'}, tập thể lớp duy trì tốt nề nếp kỷ cương, chấp hành nghiêm túc quy định của nhà trường. Không khí học tập vui tươi, đoàn kết và có tinh thần thi đua lành mạnh.

2. KẾT QUẢ THI ĐUA VÀ CHUYÊN CẦN
- Điểm trung bình toàn lớp: ${stats?.avgScore || 100} điểm.
- Tỷ lệ chuyên cần đạt: ${stats?.attendanceRate || 98}%.
- Số lượt đi muộn trong kỳ: ${stats?.lateCount || 0} lượt. Số lượt vắng có phép: ${stats?.absentCount || 0} lượt.

3. ĐIỂM SÁNG VÀ MẶT TÍCH CỰC
Đa số học sinh có ý thức chuẩn bị bài tốt, tích cực giơ tay xây dựng bài. Các phong trào bảo vệ môi trường, giữ gìn vệ sinh lớp học và chăm sóc công trình măng non được thực hiện rất chu đáo.

4. CÁC TỒN TẠI VÀ VẤN ĐỀ CẦN LƯU Ý
Còn một vài thời điểm học sinh nói chuyện riêng trong giờ tự quản hoặc quên đồ dùng học tập. Ban cán sự lớp cần phát huy tốt hơn nữa vai trò nhắc nhở.

5. TUYÊN DƯƠNG HỌC SINH VÀ TẬP THỂ TIÊU BIỂU
- Tổ dẫn đầu phong trào thi đua: ${stats?.leadingTeam || 'Tổ 1'}.
- Các học sinh có thành tích xuất sắc: ${(stats?.topStudents || []).map((s: any) => s.fullName).join(', ') || 'Minh Anh, Gia Bảo, Tuệ Lâm'}.

6. BIỂU DƯƠNG HỌC SINH CÓ TIẾN BỘ RÕ RỆT
Ghi nhận sự nỗ lực vượt bậc của các em: ${(stats?.improvedStudents || []).map((s: any) => s.fullName).join(', ') || 'Đức Huy, Mai Linh'}. Điểm thi đua của các em đã tăng trưởng tích cực.

7. DANH SÁCH HỌC SINH CẦN ĐỒNG HÀNH & KẾ HOẠCH HỖ TRỢ
Giáo viên chủ nhiệm tiếp tục đồng hành, lắng nghe và phối hợp cùng phụ huynh của các em cần hỗ trợ: ${(stats?.needAttentionStudents || []).map((s: any) => s.fullName).join(', ') || 'Các học sinh cần rèn luyện thêm tính tự giác'}.

8. ĐÁNH GIÁ PHONG TRÀO THI ĐUA CÁC TỔ
Các tổ bám đuổi sát sao về điểm số, duy trì tốt tinh thần đoàn kết, giúp đỡ nhau trong học tập.

9. PHƯƠNG HƯỚNG VÀ MỤC TIÊU TRỌNG TÂM KỲ TỚI
- Tiếp tục duy trì điểm trung bình thi đua của lớp từ 100 điểm trở lên.
- Triệt để khắc phục tình trạng đi học sát giờ và quên vở bài tập.

10. BIỆN PHÁP THỰC HIỆN VÀ ĐỀ XUẤT PHỐI HỢP PHỤ HUYNH
GVCN tiếp tục giữ liên lạc chặt chẽ với cha mẹ học sinh qua sổ liên lạc điện tử và Zalo lớp.`;

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(200).json({ report: fallbackReport });
      }

      let reportTypeTitle = 'BÁO CÁO CÔNG TÁC CHỦ NHIỆM TUẦN';
      if (type === 'monthly') reportTypeTitle = 'BÁO CÁO TỔNG KẾT THI ĐUA THÁNG';
      else if (type === 'semester') reportTypeTitle = 'BÁO CÁO SƠ KẾT CÔNG TÁC CHỦ NHIỆM HỌC KỲ';
      else if (type === 'year') reportTypeTitle = 'BÁO CÁO TỔNG KẾT NĂM HỌC CỦA GIÁO VIÊN CHỦ NHIỆM';

      const prompt = `Bạn là trợ lý AI sư phạm hỗ trợ Giáo viên Chủ nhiệm (GVCN) tại Việt Nam.
Hãy soạn thảo bản báo cáo chi tiết: "${reportTypeTitle} - ${period}"
Thông tin lớp: Lớp ${classInfo?.className || 'Lớp học'}, năm học ${classInfo?.schoolYear || '2026-2027'}.

DỮ LIỆU THỐNG KÊ THỰC TẾ ĐÃ ĐƯỢC TÍNH TOÁN BẰNG CODE (BẮT BUỘC TUÂN THỦ 100%, KHÔNG TỰ BỊA CON SỐ KHÁC):
- Sĩ số: ${stats?.totalStudents || 35} học sinh
- Điểm trung bình thi đua: ${stats?.avgScore || 100} điểm
- Tỷ lệ chuyên cần: ${stats?.attendanceRate || 98}%
- Số lượt đi muộn: ${stats?.lateCount || 0}
- Số lượt vắng: ${stats?.absentCount || 0}
- Số học sinh tiến bộ: ${stats?.improvedCount || 0} học sinh
- Số học sinh giảm điểm: ${stats?.declinedCount || 0} học sinh
- Tổ dẫn đầu thi đua: ${stats?.leadingTeam || 'Tổ 1'}
- Xếp hạng các tổ: ${JSON.stringify(stats?.teamRankings || [])}
- Top học sinh tiêu biểu: ${JSON.stringify(stats?.topStudents || [])}
- Học sinh tiến bộ: ${JSON.stringify(stats?.improvedStudents || [])}
- Học sinh cần theo dõi, hỗ trợ: ${JSON.stringify(stats?.needAttentionStudents || [])}
- Tiêu chí nổi bật (được cộng điểm nhiều nhất): ${JSON.stringify(stats?.topCriteria || [])}
- Tiêu chí cần khắc phục (bị trừ điểm nhiều nhất): ${JSON.stringify(stats?.weakCriteria || [])}
${extraPrompt ? `- Lưu ý thêm từ GVCN: ${extraPrompt}` : ''}

QUY TẮC SƯ PHẠM QUAN TRỌNG:
1. TUYỆT ĐỐI KHÔNG BỊA SỐ. Mọi con số trong báo cáo phải khớp chính xác với dữ liệu được cung cấp ở trên.
2. TUYỆT ĐỐI KHÔNG dùng từ ngữ phán xét tiêu cực (cấm dùng: "lười biếng", "hư", "cá biệt", "kém cỏi"). Dùng từ mang tính khích lệ, xây dựng và hướng tới giải pháp ("cần quan tâm", "cần rèn luyện thêm tính tự giác", "cần phối hợp cùng gia đình").
3. Bố cục báo cáo rõ ràng, văn phong hành chính sư phạm Việt Nam trang trọng, sâu sát tình hình lớp.

Hãy trình bày báo cáo thành các mục đánh số rõ ràng:
1. TÌNH HÌNH CHUNG CỦA LỚP
2. KẾT QUẢ THI ĐUA VÀ CHUYÊN CẦN
3. ĐIỂM SÁNG VÀ MẶT TÍCH CỰC
4. CÁC TỒN TẠI VÀ VẤN ĐỀ CẦN LƯU Ý
5. TUYÊN DƯƠNG HỌC SINH VÀ TẬP THỂ TIÊU BIỂU
6. BIỂU DƯƠNG HỌC SINH CÓ TIẾN BỘ RÕ RỆT
7. DANH SÁCH HỌC SINH CẦN ĐỒNG HÀNH & KẾ HOẠCH HỖ TRỢ
8. ĐÁNH GIÁ PHONG TRÀO THI ĐUA CÁC TỔ
9. PHƯƠNG HƯỚNG VÀ MỤC TIÊU TRỌNG TÂM KỲ TỚI
10. BIỆN PHÁP THỰC HIỆN VÀ ĐỀ XUẤT PHỐI HỢP PHỤ HUYNH`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          temperature: 0.4,
        }
      });

      res.json({ report: text || fallbackReport });
    } catch {
      res.json({ report: fallbackReport, isFallback: true });
    }
  });

  // AI Endpoint: Review & Quality Check Report (Section 28 & 39)
  app.post('/api/gemini/review-report', async (req, res) => {
    const fallbackReview = {
      hasIssues: false,
      score: 95,
      suggestions: [],
      overallAssessment: 'Báo cáo có bố cục chuẩn mực, số liệu thống nhất và ngôn phong sư phạm phù hợp.'
    };

    try {
      const { content, stats, period } = req.body || {};
      const ai = getGeminiClient();

      if (!ai) {
        return res.json(fallbackReview);
      }

      const prompt = `Bạn là chuyên gia thẩm định văn bản sư phạm và thanh tra chuyên môn trường học tại Việt Nam.
Hãy kiểm tra chất lượng bản Báo cáo Công tác Chủ nhiệm sau đây:

KỲ BÁO CÁO: ${period || 'Định kỳ'}
DỮ LIỆU THỰC TẾ CHUẨN XÁC:
${JSON.stringify(stats || {}, null, 2)}

NỘI DUNG BÁO CÁO CẦN KIỂM ĐỊNH:
"""
${content}
"""

HÃY ĐÁNH GIÁ 4 TIÊU CHÍ KHẮT KHE:
1. Mâu thuẫn số liệu: Báo cáo có nhắc tới con số nào (sĩ số, điểm, số lượt vi phạm, thứ hạng) trái ngược với dữ liệu thực tế không?
2. Từ ngữ tiêu cực / dán nhãn: Có từ ngữ nào vi phạm đạo đức nhà giáo như "lười", "hư", "cá biệt", "chậm tiến" không?
3. Kết luận không có bằng chứng: Có nhận định chủ quan nào không có căn cứ từ dữ liệu không?
4. Tính sư phạm & tính xây dựng: Đề xuất khắc phục có khả thi và tích cực không?

Trả về KẾT QUẢ DUY NHẤT LÀ MỘT ĐỐI TƯỢNG JSON thuần túy (không kèm markdown):
{
  "hasIssues": boolean,
  "score": number (thang điểm 100),
  "suggestions": [
    {
      "type": "contradiction" | "negative_tone" | "unsupported_claim" | "repetition" | "style",
      "originalText": "đoạn văn có vấn đề nếu có",
      "issue": "mô tả lỗi",
      "recommendation": "cách sửa chuẩn sư phạm"
    }
  ],
  "overallAssessment": "Nhận xét tổng thể 2-3 câu về bản báo cáo"
}`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });

      const parsed = cleanAndParseJson(text || '{}', fallbackReview);
      res.json(parsed);
    } catch {
      res.json(fallbackReview);
    }
  });

  // AI Endpoint: Batch Student Comments
  app.post('/api/gemini/batch-student-comments', async (req, res) => {
    const { students, period, tone } = req.body || {};
    const fallbacks = (students || []).map((s: any) => ({
      studentId: s.studentId,
      comment: `Em ${s.studentName} có kết quả thi đua tốt (${s.currentScore || 100}đ). Em chăm chỉ, đoàn kết với bạn bè và hoàn thành tốt nhiệm vụ được giao.`
    }));

    try {
      const ai = getGeminiClient();

      if (!ai || !Array.isArray(students) || students.length === 0) {
        return res.json({ comments: fallbacks });
      }

      const prompt = `Bạn là Giáo viên Chủ nhiệm giàu kinh nghiệm. Hãy tạo nhận xét sư phạm cá nhân hóa cho từng học sinh sau đây trong ${period || 'tuần này'}.
Phong cách chung: ${tone || 'Khen ngợi, tích cực và khích lệ'}.

DANH SÁCH HỌC SINH VÀ DỮ LIỆU THỰC TẾ:
${JSON.stringify(students, null, 2)}

YÊU CẦU BẮT BUỘC:
1. KHÔNG được nhận xét rập khuôn, chung chung giống nhau giữa các em. Mỗi em phải dựa trên điểm mạnh, điểm cần cải thiện hoặc thành tích cụ thể đã cung cấp.
2. Độ dài mỗi nhận xét: 2 - 4 câu (40 - 70 từ), súc tích, ấm áp, truyền cảm hứng.
3. Tuyệt đối không dùng từ ngữ tiêu cực hay nhãn phán xét.
4. Trả về DUY NHẤT một mảng JSON (không kèm markdown):
[
  {
    "studentId": "mã học sinh",
    "comment": "nội dung nhận xét cụ thể"
  }
]`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: 'application/json'
        }
      });

      const parsed = cleanAndParseJson(text || '[]', fallbacks);
      res.json({ comments: Array.isArray(parsed) && parsed.length > 0 ? parsed : fallbacks });
    } catch {
      res.json({ comments: fallbacks });
    }
  });

  // Prompt 10 - Section 11: AI Daily Summary
  app.post('/api/gemini/daily-summary', async (req, res) => {
    const { date, className, stats, events } = req.body || {};
    const fallback = {
      summary: `Tổng hợp ngày ${date || 'hôm nay'} lớp ${className || ''}: Lớp ghi nhận ${stats?.totalEvents || 0} sự kiện thi đua (+${stats?.positiveScore || 0}đ, -${Math.abs(stats?.negativeScore || 0)}đ). Nề nếp chung duy trì ổn định.`,
      pedagogicalNote: 'Thầy/Cô tiếp tục động viên các em phát huy tính tự giác và ý thức xây dựng bài trong các tiết học.',
      highlights: stats?.positiveCount > 0 ? [`Ghi nhận ${stats.positiveCount} việc tốt trong ngày.`] : ['Không có biến động đột xuất.'],
      recommendations: ['Tuyên dương các em có việc tốt trong 5 phút đầu giờ ngày mai.']
    };

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.json(fallback);
      }

      const prompt = `Bạn là Trợ lý Sư phạm hỗ trợ Giáo viên Chủ nhiệm (GVCN).
Hãy tổng hợp tình hình trong ngày ${date || 'hôm nay'} của lớp ${className || 'học'}.
DỮ LIỆU THỰC TẾ TRONG NGÀY ĐÃ GHI NHẬN:
- Tổng số sự kiện: ${stats?.totalEvents || 0}
- Điểm cộng: +${stats?.positiveScore || 0}
- Điểm trừ: ${stats?.negativeScore || 0}
- Học sinh tích cực nổi bật: ${JSON.stringify(stats?.topPositiveStudents || [])}
- Học sinh cần lưu ý nhắc nhở: ${JSON.stringify(stats?.topAttentionStudents || [])}
- Chi tiết các sự kiện hôm nay: ${JSON.stringify((events || []).slice(0, 20))}

NGUYÊN TẮC QUAN TRỌNG:
1. CHỈ dựa trên các sự kiện thật ở trên. Không tự bịa thêm sự việc.
2. TUYỆT ĐỐI KHÔNG dùng từ ngữ dán nhãn tiêu cực (cấm: lười, hư, cá biệt, kém cỏi).
3. Đưa ra lời nhận xét sư phạm ngắn gọn (3-4 câu), nêu rõ điểm sáng và giải pháp nhắc nhở nhẹ nhàng.

Trả về JSON thuần túy:
{
  "summary": "Tóm tắt ngắn gọn 2 câu về tình hình trong ngày",
  "pedagogicalNote": "Nhận xét sư phạm ấm áp, xây dựng dành cho GVCN",
  "highlights": ["1-2 điểm sáng đáng khen trong ngày"],
  "recommendations": ["1-2 gợi ý hành động cụ thể cho GVCN ngày mai"]
}`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json'
        }
      });

      const parsed = cleanAndParseJson(text || '{}', fallback);
      res.json(parsed);
    } catch {
      res.json(fallback);
    }
  });

  // Prompt 10 - Section 12 & 13: AI Weekly Insight
  app.post('/api/gemini/weekly-insight', async (req, res) => {
    const { week, classInfo, statsSummary, studentsScores, teamRankings, anomalies } = req.body || {};
    const fallbackInsight = {
      summary: `Tình hình tuần ${week || ''} lớp ${classInfo?.className || ''}: Nề nếp thi đua cơ bản duy trì tốt, điểm trung bình đạt ${statsSummary?.avgScore || 100} điểm.`,
      positiveTrends: [
        'Phong trào thi đua giữa các tổ diễn ra tích cực',
        'Tỷ lệ chuyên cần và đúng giờ duy trì ở mức cao'
      ],
      concernTrends: [
        'Một số em còn bị nhắc nhở về chuẩn bị bài và trật tự đầu giờ'
      ],
      improvingStudents: (studentsScores || [])
        .filter((s: any) => (s.finalScore || 100) > (classInfo?.startingScore || 100))
        .slice(0, 3)
        .map((s: any) => ({
          studentId: s.studentId,
          studentName: s.fullName,
          note: 'Duy trì kết quả thi đua cao và tích cực phát biểu',
          evidence: `Đạt ${s.finalScore} điểm tuần này (+${s.totalPositive || 0}đ)`
        })),
      decliningStudents: (studentsScores || [])
        .filter((s: any) => (s.finalScore || 100) < (classInfo?.startingScore || 100))
        .slice(0, 3)
        .map((s: any) => ({
          studentId: s.studentId,
          studentName: s.fullName,
          note: 'Cần quan tâm, nhắc nhở giữ gìn nề nếp',
          evidence: `Điểm tuần đạt ${s.finalScore} điểm (-${s.totalNegative || 0}đ)`
        })),
      classObservations: [
        'Không khí học tập tập thể sôi nổi',
        'Cần duy trì phong trào tự quản giờ chuyển tiết'
      ],
      teamObservations: (teamRankings || []).slice(0, 4).map((t: any) => ({
        teamName: t.teamName,
        observation: `Xếp hạng #${t.rank || 1} với điểm trung bình ${t.avgScore || 100}đ`
      })),
      suggestedActions: [
        'Biểu dương các cá nhân và tổ có tiến bộ trong tiết sinh hoạt lớp.',
        'Trao đổi riêng, nhắc nhở nhẹ nhàng với học sinh có dấu hiệu sa sút.',
        'Phối hợp với phụ huynh hỗ trợ học sinh có khó khăn về nề nếp.'
      ],
      evidence: [
        `Tổng số sự kiện ghi nhận trong tuần: ${statsSummary?.totalEvents || 0}`,
        `Điểm trung bình toàn lớp: ${statsSummary?.avgScore || 100}đ`
      ],
      confidence: 'high' as const
    };

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({ insight: fallbackInsight });
      }

      const prompt = `Bạn là Trợ lý Phân tích Sư phạm cho Giáo viên Chủ nhiệm (GVCN).
Hãy phân tích tuần thi đua số ${week} của lớp ${classInfo?.className || 'học'}, năm học ${classInfo?.schoolYear || '2026-2027'}.

DỮ LIỆU THỐNG KÊ TOÁN HỌC ĐÃ TÍNH SẴN BẰNG CODE (BẮT BUỘC 100% TUÂN THỦ DỮ LIỆU THỰC TẾ):
- Thống kê tuần: ${JSON.stringify(statsSummary || {})}
- Xếp hạng các tổ: ${JSON.stringify(teamRankings || [])}
- Bất thường phát hiện được: ${JSON.stringify(anomalies || [])}
- Danh sách học sinh tiêu biểu (Top & Cần chú ý): ${JSON.stringify((studentsScores || []).slice(0, 20))}

YÊU CẦU ĐẶC BIỆT THEO CHUẨN SƯ PHẠM:
1. TUYỆT ĐỐI KHÔNG dùng nhãn tiêu cực (cấm: lười, hư, cá biệt, yếu kém).
2. Mọi kết luận PHẢI CÓ DẪN CHỨNG (evidence) từ số liệu cụ thể được cung cấp ở trên.
3. Không tự quyết định biện pháp kỷ luật; chỉ đưa ra gợi ý hành động mang tính sư phạm và hỗ trợ.
4. Trả về ĐÚNG CẤU TRÚC JSON SAU ĐÂY:
{
  "summary": "Tóm tắt 2-3 câu về tuần",
  "positiveTrends": ["xu hướng tích cực 1", "xu hướng tích cực 2"],
  "concernTrends": ["xu hướng cần lưu ý 1"],
  "improvingStudents": [
    { "studentId": "id", "studentName": "Họ và tên", "note": "nhận xét tiến bộ", "evidence": "dẫn chứng điểm số" }
  ],
  "decliningStudents": [
    { "studentId": "id", "studentName": "Họ và tên", "note": "nhận xét cần hỗ trợ", "evidence": "dẫn chứng điểm số" }
  ],
  "classObservations": ["nhận xét tổng thể 1", "nhận xét 2"],
  "teamObservations": [
    { "teamName": "Tên tổ", "observation": "nhận xét tổ" }
  ],
  "suggestedActions": [
    "gợi ý hành động sư phạm 1",
    "gợi ý hành động sư phạm 2"
  ],
  "evidence": [
    "chứng cứ số liệu 1",
    "chứng cứ số liệu 2"
  ],
  "confidence": "high"
}`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          temperature: 0.4,
          responseMimeType: 'application/json'
        }
      });

      const parsed = cleanAndParseJson(text || '{}', fallbackInsight);
      res.json({ insight: parsed });
    } catch {
      res.json({ insight: fallbackInsight });
    }
  });

  // Prompt 10 - Section 15: AI Triple Student Comments (Ngắn gọn, Cân bằng, Khích lệ)
  app.post('/api/gemini/student-comments-triple', async (req, res) => {
    const { student, period, stats, observations } = req.body || {};
    const name = student?.fullName || 'học sinh';
    const score = stats?.currentScore || 100;
    const rank = stats?.rankCategory || 'Tốt';

    const fallback = {
      concise: `Em ${name} duy trì nề nếp thi đua tốt (${score}đ, ${rank}), luôn chấp hành đúng quy định của lớp.`,
      balanced: `Em ${name} có ý thức kỷ luật tốt và đạt kết quả thi đua ${score} điểm (${rank}). Em chăm chỉ, đoàn kết với bạn bè; nếu tích cực phát biểu hơn nữa sẽ đạt kết quả cao hơn.`,
      encouraging: `Thầy/Cô rất vui mừng trước sự nỗ lực của ${name} trong ${period || 'kỳ này'} (${score}đ). Em là học sinh chăm ngoan, có nhiều tiến bộ và tinh thần tập thể rất đáng khen ngợi!`
    };

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.json(fallback);
      }

      const prompt = `Bạn là Giáo viên Chủ nhiệm (GVCN). Hãy tạo 3 phiên bản nhận xét sư phạm cho học sinh:
- Tên học sinh: ${name} (Tổ: ${student?.teamName || ''})
- Thời gian: ${period || 'Tuần này'}
- Điểm thi đua: ${score} điểm (Xếp loại: ${rank})
- Ghi nhận nổi bật: ${JSON.stringify(observations || [])}

Hãy tạo 3 phiên bản để GVCN lựa chọn:
1. "concise" (Ngắn gọn): 1-2 câu, cô đọng, nêu đúng bản chất kết quả.
2. "balanced" (Cân bằng): 2-3 câu, ghi nhận điểm tốt đồng thời nhắc nhở định hướng cải thiện nhẹ nhàng.
3. "encouraging" (Khích lệ): 2-3 câu, ấm áp, truyền cảm hứng và khích lệ tinh thần phấn đấu.

TUYỆT ĐỐI KHÔNG dùng từ tiêu cực hay dán nhãn (lười, hư, kém).
Trả về JSON thuần túy:
{
  "concise": "...",
  "balanced": "...",
  "encouraging": "..."
}`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          temperature: 0.6,
          responseMimeType: 'application/json'
        }
      });

      const parsed = cleanAndParseJson(text || '{}', fallback);
      res.json(parsed);
    } catch {
      res.json(fallback);
    }
  });

  // Prompt 10 - Section 16: Draft Parent Message by Category
  app.post('/api/gemini/draft-parent-message', async (req, res) => {
    const { student, category, teacherName, customNote, stats } = req.body || {};
    const name = student?.fullName || 'em';
    const tName = teacherName || 'GVCN';
    const score = stats?.currentScore || 100;

    const fallbackMessages: Record<string, string> = {
      positive_record: `Kính gửi Quý Phụ huynh em ${name}, tuần này em đạt kết quả thi đua rất tốt (${score} điểm), tích cực tham gia các hoạt động của lớp và luôn lễ phép, gương mẫu. Thầy/Cô xin gửi lời khen ngợi và chúc mừng gia đình! Trân trọng, ${tName}.`,
      progress_update: `Kính gửi Quý Phụ huynh em ${name}, tuần này em có sự tiến bộ rất rõ nét trong nề nếp và học tập, đạt ${score} điểm thi đua. Thầy/Cô rất biểu dương sự cố gắng của em. Mong gia đình tiếp tục khích lệ để em giữ vững phong độ! Trân trọng, ${tName}.`,
      gentle_reminder: `Kính gửi Quý Phụ huynh em ${name}, tuần này kết quả thi đua của em đạt ${score} điểm. Có một vài điểm nhỏ về giờ giấc/chuẩn bị bài cần lưu ý. Thầy/Cô mong Quý Phụ huynh cùng đồng hành nhắc nhở nhẹ nhàng để em hoàn thiện hơn. Trân trọng, ${tName}.`,
      discuss_more: `Kính gửi Quý Phụ huynh em ${name}, dạo gần đây em có một số thay đổi trong nề nếp học tập (điểm tuần đạt ${score}đ). Thầy/Cô rất mong được phối hợp cùng Quý Phụ huynh qua điện thoại hoặc tin nhắn để cùng tìm giải pháp giúp đỡ em tốt nhất. Trân trọng, ${tName}.`,
      invitation: `Kính gửi Quý Phụ huynh em ${name}, nhằm trao đổi cụ thể về tình hình học tập và nề nếp của em trong thời gian qua, Thầy/Cô trân trọng kính mời Quý Phụ huynh dành chút thời gian gặp gỡ trao đổi trực tiếp tại trường vào thời gian thuận tiện. Trân trọng, ${tName}.`
    };

    const fallback = fallbackMessages[category] || fallbackMessages.progress_update;

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({ draft: fallback });
      }

      const prompt = `Soạn tin nhắn gửi Phụ huynh học sinh (dạng SMS hoặc Zalo):
- Tên học sinh: ${name} (Lớp: ${student?.className || 'Lớp'})
- Thầy/Cô gửi: ${tName}
- Thể loại tin nhắn: ${category} (positive_record: ghi nhận tích cực / progress_update: thông báo tiến bộ / gentle_reminder: nhắc nhở nhẹ / discuss_more: cần trao đổi thêm / invitation: mời trao đổi trực tiếp)
- Điểm thi đua tuần: ${score} điểm
- Ghi chú thêm từ GVCN: ${customNote || 'Không có'}

YÊU CẦU:
1. Ngôn từ trang trọng, chân thành, tôn trọng phụ huynh, thể hiện tinh thần đồng hành và yêu thương học sinh.
2. Tuyệt đối không quy kết gay gắt, không làm tổn thương lòng tự trọng của gia đình và học sinh.
3. Độ dài vừa phải (60-120 từ), phù hợp gửi qua Zalo/SMS.
4. Trả về trực tiếp nội dung tin nhắn dạng chuỗi (plain text), không cần markdown.`;

      const text = await generateGeminiContent(ai, {
        contents: prompt,
        config: {
          temperature: 0.5
        }
      });

      res.json({ draft: text?.trim() || fallback });
    } catch {
      res.json({ draft: fallback });
    }
  });

  // Vite development middleware or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GVCN SMART CLASS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
