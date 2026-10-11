import { Criterion, RankCategory, ScoreThresholds } from '../types';

export const DEFAULT_THRESHOLDS: ScoreThresholds = {
  good: 100,      // Điểm TB từ 100 trở lên: Tốt
  fair: 80,       // Điểm TB từ 80 đến dưới 100: Khá
  pass: 50,       // Điểm TB từ 50 đến dưới 80: Đạt
  // Điểm TB dưới 50: Chưa đạt
  excellent: 100,
  wellDone: 80,
  needEffort: 50,
};

export const DEFAULT_STARTING_SCORE = 100;

export const DEFAULT_CRITERIA_TEMPLATES: Omit<Criterion, 'criterionId' | 'teacherId' | 'classId'>[] = [
  {
    code: 'ON_TIME',
    name: 'Đi học đúng giờ',
    description: 'Đến trường trước giờ truy bài, không đi muộn',
    positiveScore: 1,
    negativeScore: -2,
    category: 'attendance',
    active: true,
    order: 1,
  },
  {
    code: 'ABSENT_PERMITTED',
    name: 'Nghỉ học có phép',
    description: 'Nghỉ học có đơn xin phép hoặc phụ huynh báo trước GVCN',
    positiveScore: 0,
    negativeScore: -2,
    category: 'attendance',
    active: true,
    order: 2,
  },
  {
    code: 'ABSENT_UNPERMITTED',
    name: 'Nghỉ học không phép',
    description: 'Nghỉ học không có lý do hoặc không có phép của phụ huynh/GVCN',
    positiveScore: 0,
    negativeScore: -5,
    category: 'attendance',
    active: true,
    order: 3,
  },
  {
    code: 'PREPARE_LESSON',
    name: 'Chuẩn bị bài đầy đủ',
    description: 'Học bài và làm bài tập về nhà đầy đủ trước khi đến lớp',
    positiveScore: 1,
    negativeScore: -2,
    category: 'study',
    active: true,
    order: 4,
  },
  {
    code: 'KEEP_SUPPLIES',
    name: 'Giữ gìn sách vở, đồ dùng',
    description: 'Mang đầy đủ sách vở, dụng cụ học tập, giữ gìn cẩn thận',
    positiveScore: 1,
    negativeScore: -1,
    category: 'study',
    active: true,
    order: 3,
  },
  {
    code: 'ATTENTIVE',
    name: 'Chú ý nghe giảng',
    description: 'Tập trung theo dõi bài giảng của thầy cô, không làm việc riêng',
    positiveScore: 1,
    negativeScore: -2,
    category: 'study',
    active: true,
    order: 4,
  },
  {
    code: 'SPEAK_UP',
    name: 'Phát biểu xây dựng bài',
    description: 'Hăng hái giơ tay phát biểu, đóng góp ý kiến đúng đắn',
    positiveScore: 1,
    negativeScore: 0,
    category: 'study',
    active: true,
    order: 5,
  },
  {
    code: 'CLEANLINESS',
    name: 'Giữ gìn vệ sinh',
    description: 'Bỏ rác đúng nơi quy định, trực nhật sạch sẽ, ngăn nắp',
    positiveScore: 1,
    negativeScore: -2,
    category: 'hygiene',
    active: true,
    order: 6,
  },
  {
    code: 'UNIFORM',
    name: 'Mặc đúng đồng phục',
    description: 'Đúng quy định khăn quàng, phù hiệu, trang phục chỉnh tề',
    positiveScore: 1,
    negativeScore: -1,
    category: 'behavior',
    active: true,
    order: 7,
  },
  {
    code: 'CIVIL_COMM',
    name: 'Giao tiếp văn minh',
    description: 'Nói lời hay, không nói tục chửi thề, hòa nhã với bạn bè',
    positiveScore: 1,
    negativeScore: -2,
    category: 'behavior',
    active: true,
    order: 8,
  },
  {
    code: 'KEEP_ORDER',
    name: 'Giữ trật tự trong giờ học',
    description: 'Không nói chuyện riêng, không gây ồn ào ảnh hưởng tiết học',
    positiveScore: 1,
    negativeScore: -3,
    category: 'behavior',
    active: true,
    order: 9,
  },
  {
    code: 'POLITE_GREET',
    name: 'Chào hỏi, lễ phép',
    description: 'Biết chào hỏi thầy cô, người lớn tuổi và tôn trọng mọi người',
    positiveScore: 1,
    negativeScore: -2,
    category: 'behavior',
    active: true,
    order: 10,
  },
  {
    code: 'TEAMWORK',
    name: 'Làm việc nhóm tích cực',
    description: 'Tích cực hợp tác, giúp đỡ bạn bè cùng tiến bộ trong tổ',
    positiveScore: 2,
    negativeScore: -1,
    category: 'responsibility',
    active: true,
    order: 11,
  },
  {
    code: 'TASK_COMPLETE',
    name: 'Thực hiện tốt nhiệm vụ được giao',
    description: 'Hoàn thành tốt các nhiệm vụ cán sự, trực ban, lao động',
    positiveScore: 2,
    negativeScore: -2,
    category: 'responsibility',
    active: true,
    order: 12,
  },
];

export interface RankCalculationOptions {
  violationsCount?: number;
  period?: 'week' | 'month';
}

/**
 * Xếp loại rèn luyện học sinh theo 4 mức:
 * - Điểm TB từ 100 trở lên: Tốt (4 sao)
 * - Điểm TB từ 80 đến dưới 100: Khá (3 sao)
 * - Điểm TB từ 50 đến dưới 80: Đạt (2 sao)
 * - Điểm TB dưới 50: Chưa đạt (1 sao)
 *
 * Điều kiện khống chế lỗi vi phạm:
 * - Trong tuần: từ 3 lỗi trở lên KHÔNG xếp loại Tốt (tối đa Khá).
 * - Trong tháng: từ 5 lỗi trở lên KHÔNG xếp loại Tốt (tối đa Khá).
 */
export function calculateRank(
  score: number, 
  thresholds: ScoreThresholds = DEFAULT_THRESHOLDS,
  options?: RankCalculationOptions
): { 
  category: RankCategory; 
  stars: number; 
  color: string; 
  badgeClass: string;
  label: string;
  demotedDueToViolations?: boolean;
} {
  const goodThreshold = thresholds.good ?? 100;
  const fairThreshold = thresholds.fair ?? (thresholds.wellDone !== undefined ? thresholds.wellDone : 80);
  const passThreshold = thresholds.pass ?? (thresholds.needEffort !== undefined ? thresholds.needEffort : 50);

  let category: RankCategory;
  let stars: number;
  let color: string;
  let badgeClass: string;
  let label: string;
  let demotedDueToViolations = false;

  if (score >= goodThreshold) {
    category = 'TỐT';
    stars = 4;
    color = 'emerald';
    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Tốt';
  } else if (score >= fairThreshold) {
    category = 'KHÁ';
    stars = 3;
    color = 'blue';
    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
    label = 'Khá';
  } else if (score >= passThreshold) {
    category = 'ĐẠT';
    stars = 2;
    color = 'amber';
    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Đạt';
  } else {
    category = 'CHƯA ĐẠT';
    stars = 1;
    color = 'rose';
    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    label = 'Chưa đạt';
  }

  // Khống chế vi phạm:
  // - Tuần: từ 3 lỗi trở lên không xếp loại Tốt
  // - Tháng: từ 5 lỗi trở lên không xếp loại Tốt
  if (category === 'TỐT' && options?.violationsCount !== undefined) {
    const period = options.period || 'week';
    const violationCap = period === 'month' ? 5 : 3;

    if (options.violationsCount >= violationCap) {
      category = 'KHÁ';
      stars = 3;
      color = 'blue';
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
      label = 'Khá';
      demotedDueToViolations = true;
    }
  }

  return {
    category,
    stars,
    color,
    badgeClass,
    label,
    demotedDueToViolations
  };
}

export function normalizeRankCategory(cat?: string | null): 'TỐT' | 'KHÁ' | 'ĐẠT' | 'CHƯA ĐẠT' {
  if (!cat) return 'TỐT';
  const upper = cat.trim().toUpperCase();
  if (upper === 'TỐT' || upper === 'XUẤT SẮC') return 'TỐT';
  if (upper === 'KHÁ' || upper === 'HOÀN THÀNH TỐT') return 'KHÁ';
  if (upper === 'ĐẠT' || upper === 'CẦN CỐ GẮNG') return 'ĐẠT';
  if (upper === 'CHƯA ĐẠT' || upper === 'CẦN HỖ TRỢ') return 'CHƯA ĐẠT';
  return 'TỐT';
}

/**
 * Kiểm tra xem sự kiện / tiêu chí có phải là Nghỉ học có phép hay không
 */
export function isExcusedAbsent(criterionName?: string, code?: string): boolean {
  const name = (criterionName || '').toLowerCase();
  const c = (code || '').toUpperCase();
  return (
    (name.includes('nghỉ') || name.includes('vắng')) && 
    (name.includes('có phép') || c.includes('PERMITTED') || c.includes('EXCUSED') || (name.includes('phép') && !name.includes('không phép') && !name.includes('ko phép')))
  );
}

/**
 * Kiểm tra xem sự kiện / tiêu chí có phải là Nghỉ học không phép hay không
 */
export function isUnexcusedAbsent(criterionName?: string, code?: string): boolean {
  const name = (criterionName || '').toLowerCase();
  const c = (code || '').toUpperCase();
  return (
    (name.includes('nghỉ') || name.includes('vắng')) && 
    (name.includes('không phép') || name.includes('ko phép') || c.includes('UNPERMITTED') || c.includes('UNEXCUSED'))
  );
}

/**
 * Kiểm tra xem sự kiện / tiêu chí có phải là lượt chấm điểm nghỉ học (có phép hoặc không phép) hay không
 */
export function isAnyAbsent(criterionName?: string, code?: string, category?: string): boolean {
  if (isExcusedAbsent(criterionName, code) || isUnexcusedAbsent(criterionName, code)) return true;
  const name = (criterionName || '').toLowerCase();
  const c = (code || '').toUpperCase();
  return (
    (category === 'attendance' || c.includes('ABSENT')) &&
    (name.includes('nghỉ') || name.includes('vắng')) &&
    !name.includes('muộn') && !name.includes('trễ')
  );
}

export function formatDateVN(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Chức vụ Ban Cán sự Lớp
export const CADRE_ROLES_META = {
  none: { 
    id: 'none', 
    label: 'Học sinh', 
    shortLabel: 'Học sinh',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200', 
    icon: '👤', 
    description: 'Thành viên lớp' 
  },
  lop_truong: { 
    id: 'lop_truong', 
    label: 'Lớp trưởng', 
    shortLabel: 'Lớp trưởng',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold', 
    icon: '👑', 
    description: 'Quản lý bao quát chung mọi hoạt động nề nếp của lớp' 
  },
  lop_pho_hoc_tap: { 
    id: 'lop_pho_hoc_tap', 
    label: 'Lớp phó học tập', 
    shortLabel: 'LP Học tập',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-bold', 
    icon: '📚', 
    description: 'Theo dõi tình hình chuẩn bị bài, làm bài tập và truy bài' 
  },
  lop_pho_lao_dong: { 
    id: 'lop_pho_lao_dong', 
    label: 'Lớp phó lao động', 
    shortLabel: 'LP Lao động',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold', 
    icon: '🧹', 
    description: 'Đôn đốc công tác trực nhật, vệ sinh phòng học và khuôn viên' 
  },
  lop_pho_trat_tu: { 
    id: 'lop_pho_trat_tu', 
    label: 'Lớp phó trật tự', 
    shortLabel: 'LP Trật tự',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold', 
    icon: '🛡️', 
    description: 'Ghi nhận và nhắc nhở trật tự trong giờ học và xếp hàng' 
  },
  bi_thu: { 
    id: 'bi_thu', 
    label: 'Bí thư Chi đoàn / Chi đội', 
    shortLabel: 'Bí thư',
    badgeClass: 'bg-red-100 text-red-800 border-red-300 font-bold', 
    icon: '⭐', 
    description: 'Phụ trách công tác Đội Thiếu niên / Đoàn Thanh niên, phong trào' 
  },
  pho_bi_thu: { 
    id: 'pho_bi_thu', 
    label: 'Thủ quỹ', 
    shortLabel: 'Thủ quỹ',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold', 
    icon: '💰', 
    description: 'Phụ trách thu chi, báo cáo tài chính và quản lý quỹ lớp hàng tuần' 
  },
  thu_quy: { 
    id: 'thu_quy', 
    label: 'Thủ quỹ', 
    shortLabel: 'Thủ quỹ',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold', 
    icon: '💰', 
    description: 'Phụ trách thu chi, báo cáo tài chính và quản lý quỹ lớp hàng tuần' 
  },
} as const;

// Chức vụ trong Tổ
export const TEAM_ROLES_META = {
  thanh_vien: { 
    id: 'thanh_vien', 
    label: 'Thành viên tổ', 
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200', 
    icon: '👤', 
    description: 'Học sinh sinh hoạt trong tổ' 
  },
  to_truong: { 
    id: 'to_truong', 
    label: 'Tổ trưởng (Được chấm điểm tổ)', 
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black', 
    icon: '🎖️', 
    description: 'Được GVCN phân quyền theo dõi và chấm thi đua thành viên trong tổ' 
  },
  to_pho: { 
    id: 'to_pho', 
    label: 'Tổ phó', 
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-300 font-medium', 
    icon: '🎗️', 
    description: 'Hỗ trợ tổ trưởng điều hành các công việc chung' 
  },
} as const;

/**
 * Kiểm tra quyền chấm điểm:
 * - GVCN: Toàn quyền chấm mọi học sinh trong lớp.
 * - Học sinh được phân quyền Tổ trưởng: CHỈ chấm cho học sinh cùng tổ với mình.
 * - Các học sinh khác (kể cả Lớp phó, Bí thư nếu chưa được phân quyền Tổ trưởng): KHÔNG có quyền chấm.
 */
export function normalizeTeamName(team?: string): string {
  if (!team) return '';
  const trimmed = team.trim();
  const match = trimmed.match(/\d+/);
  if (match) {
    return `Tổ ${parseInt(match[0], 10)}`;
  }
  return trimmed;
}

export function checkGradingPermission(
  evaluator: { isTeacher: boolean; isTeamLeader?: boolean; teamName?: string; name?: string },
  targetStudentTeamName: string
): { allowed: boolean; reason?: string } {
  if (evaluator.isTeacher) {
    return { allowed: true };
  }

  if (!evaluator.isTeamLeader) {
    return {
      allowed: false,
      reason: `Học sinh ${evaluator.name || ''} chưa được phân quyền Tổ trưởng. Chỉ học sinh được Giáo viên chủ nhiệm phân quyền Tổ trưởng mới được chấm thi đua.`
    };
  }

  const normEvaluatorTeam = normalizeTeamName(evaluator.teamName);
  const normTargetTeam = normalizeTeamName(targetStudentTeamName);

  if (normEvaluatorTeam && normTargetTeam && normEvaluatorTeam !== normTargetTeam) {
    return {
      allowed: false,
      reason: `Bạn là Tổ trưởng ${normEvaluatorTeam} - chỉ được quyền chấm thi đua cho học sinh thuộc ${normEvaluatorTeam}. Học sinh này thuộc ${normTargetTeam}.`
    };
  }

  return { allowed: true };
}
