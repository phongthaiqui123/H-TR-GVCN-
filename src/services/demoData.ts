import { 
  ClassInfo, 
  Team, 
  Student, 
  Criterion, 
  WeeklyScore, 
  CompetitionEvent, 
  WeeklySnapshot,
  ClassCadreRole, 
  TeamRole 
} from '../types';
import { DEFAULT_THRESHOLDS, DEFAULT_STARTING_SCORE, calculateRank } from '../utils/constants';

// --- 45 Realistic Synthetic Student Names for 12A1 ---
export const DEMO_STUDENTS_12A1 = [
  { name: 'Đặng Minh Khang', gender: 'male', note: 'Lớp trưởng, gương mẫu, quản lý lớp tốt', role: 'lop_truong', teamRole: 'to_truong' },
  { name: 'Bùi Thùy Dương', gender: 'female', note: 'Phó bí thư, năng nổ hoạt động Đoàn', role: 'pho_bi_thu', teamRole: 'to_pho' },
  { name: 'Nguyễn Hoàng Long', gender: 'male', note: 'Học tốt môn Toán và Tin học', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Lê Ngọc Diệp', gender: 'female', note: 'Vở sạch chữ đẹp, chăm ngoan', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Trần Gia Huy', gender: 'male', note: 'Tiến bộ vượt bậc về ý thức học tập', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Phạm Mai Phương', gender: 'female', note: 'Hăng hái phát biểu xây dựng bài', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Vũ Quốc Cường', gender: 'male', note: 'Hay đi học muộn cần nhắc nhở', role: 'none', teamRole: 'thanh_vien' }, // Giảm điểm (Group B)
  { name: 'Đỗ Thục Anh', gender: 'female', note: 'Chấp hành nghiêm túc nội quy', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Hoàng Tuấn Anh', gender: 'male', note: 'Còn quên bài tập, cần quan tâm', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)

  { name: 'Trần Bảo Châu', gender: 'female', note: 'Lớp phó học tập, phụ trách đôn đốc bài vở', role: 'lop_pho_hoc_tap', teamRole: 'to_truong' },
  { name: 'Ngô Đức Trí', gender: 'male', note: 'Nhiệt tình hỗ trợ bạn học yếu', role: 'none', teamRole: 'to_pho' },
  { name: 'Dương Thanh Thảo', gender: 'female', note: 'Cẩn thận, lễ phép với thầy cô', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Lý Văn Hưng', gender: 'male', note: 'Mất trật tự trong giờ học, cần uốn nắn', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)
  { name: 'Võ Ánh Tuyết', gender: 'female', note: 'Học lực khá, nề nếp ổn định', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Hồ Phúc Thịnh', gender: 'male', note: 'Tích cực làm việc nhóm, có tiến bộ', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Mai Thùy Trang', gender: 'female', note: 'Giao tiếp văn minh, hòa nhã', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Trịnh Khải Hoàn', gender: 'male', note: 'Xao nhãng học tập gần đây', role: 'none', teamRole: 'thanh_vien' }, // Giảm điểm (Group B)
  { name: 'Lưu Kim Ngân', gender: 'female', note: 'Thường xuyên thiếu dụng cụ học tập', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)

  { name: 'Vũ Gia Bảo', gender: 'male', note: 'Lớp phó lao động, chu đáo trực nhật', role: 'lop_pho_lao_dong', teamRole: 'to_truong' },
  { name: 'Tạ Bích Ngọc', gender: 'female', note: 'Nhắc nhở nề nếp tổ chu đáo', role: 'none', teamRole: 'to_pho' },
  { name: 'Cao Minh Trí', gender: 'male', note: 'Ý thức tự giác cao, học tốt', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Đoàn Như Ý', gender: 'female', note: 'Chưa tập trung trong giờ học, hay nói chuyện', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)
  { name: 'Thái Nhật Tân', gender: 'male', note: 'Phong độ biến động theo tuần', role: 'none', teamRole: 'thanh_vien' }, // Biến động (Group D)
  { name: 'Phùng Phương Uyên', gender: 'female', note: 'Nỗ lực cải thiện điểm số rõ rệt', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Lâm Thành Đạt', gender: 'male', note: 'Nhiều lần đi trễ giờ truy bài', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)
  { name: 'Tô Thảo Linh', gender: 'female', note: 'Chăm ngoan, hoàn thành tốt nhiệm vụ', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Châu Tấn Phát', gender: 'male', note: 'Dùng điện thoại trong giờ học', role: 'none', teamRole: 'thanh_vien' }, // Giảm điểm (Group B)

  { name: 'Lê Quỳnh Nga', gender: 'female', note: 'Lớp phó trật tự, theo dõi sổ nề nếp', role: 'lop_pho_trat_tu', teamRole: 'to_truong' },
  { name: 'Diệp Văn Bình', gender: 'male', note: 'Tác phong nhanh nhẹn, gương mẫu', role: 'none', teamRole: 'to_pho' },
  { name: 'Quách Tuyết Mai', gender: 'female', note: 'Học lực giỏi, bạn bè quý mến', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Hà Thế Kiên', gender: 'male', note: 'Có tuần tốt, có tuần bị trừ điểm', role: 'none', teamRole: 'thanh_vien' }, // Biến động (Group D)
  { name: 'Bạch Hoài Thương', gender: 'female', note: 'Tiến bộ vượt bậc về tinh thần xung phong', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Ân Đình Quang', gender: 'male', note: 'Năng nổ phong trào thể dục thể thao', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Nghiêm Hồng Nhung', gender: 'female', note: 'Hay mệt mỏi, cần phối hợp phụ huynh', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)
  { name: 'Lương Trọng Tín', gender: 'male', note: 'Kỷ luật tốt, lễ phép', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Triệu Mỹ Hạnh', gender: 'female', note: 'Điểm số giảm do không học bài cũ', role: 'none', teamRole: 'thanh_vien' }, // Giảm điểm (Group B)

  { name: 'Phạm Tuấn Kiệt', gender: 'male', note: 'Bí thư chi đoàn, trách nhiệm và nhiệt huyết', role: 'bi_thu', teamRole: 'to_truong' },
  { name: 'Tôn Nữ Cẩm Tú', gender: 'female', note: 'Điều hành sinh hoạt tổ tốt', role: 'none', teamRole: 'to_pho' },
  { name: 'Đào Hải Quân', gender: 'male', note: 'Thành viên gương mẫu của Tổ 5', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Chu Bảo Yến', gender: 'female', note: 'Vi phạm đồng phục và nội quy lớp', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)
  { name: 'Nông Minh Nhật', gender: 'male', note: 'Ý thức tự giác vươn lên rõ rệt', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Mạc Quỳnh Trâm', gender: 'female', note: 'Điểm số dao động giữa các tuần', role: 'none', teamRole: 'thanh_vien' }, // Biến động (Group D)
  { name: 'Thạch Văn Quý', gender: 'male', note: 'Sa sút phong độ từ giữa kỳ', role: 'none', teamRole: 'thanh_vien' }, // Giảm điểm (Group B)
  { name: 'Lâm Khánh Huyền', gender: 'female', note: 'Chăm ngoan, nề nếp vững chắc', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Hứa Vĩnh Lộc', gender: 'male', note: 'Tổ 5, hoàn thành bài tập đầy đủ', role: 'none', teamRole: 'thanh_vien' },
];

// --- 45 Realistic Synthetic Student Names for 12A2 ---
export const DEMO_STUDENTS_12A2 = [
  { name: 'Nguyễn Tiến Dũng', gender: 'male', note: 'Lớp trưởng 12A2, điềm đạm, gương mẫu', role: 'lop_truong', teamRole: 'to_truong' },
  { name: 'Hoàng Khánh Ly', gender: 'female', note: 'Phó bí thư, tổ chức hoạt động văn nghệ', role: 'pho_bi_thu', teamRole: 'to_pho' },
  { name: 'Trần Hữu Nghĩa', gender: 'male', note: 'Chăm chỉ, hoàn thành mọi nhiệm vụ', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Lê Ngọc Cầm', gender: 'female', note: 'Ghi chép bài đầy đủ, cẩn thận', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Phạm Công Danh', gender: 'male', note: 'Có bước nhảy vọt về điểm thi đua', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Vũ Hà My', gender: 'female', note: 'Tích cực xung phong lên bảng', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Đặng Quang Huy', gender: 'male', note: 'Đi muộn 3 lần trong tháng', role: 'none', teamRole: 'thanh_vien' }, // Giảm điểm (Group B)
  { name: 'Bùi Lan Anh', gender: 'female', note: 'Đúng giờ, trang phục nghiêm túc', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Đỗ Anh Tuấn', gender: 'male', note: 'Chưa thuộc bài cũ nhiều buổi', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)

  { name: 'Phan Diễm Quỳnh', gender: 'female', note: 'Lớp phó học tập 12A2, chăm chỉ', role: 'lop_pho_hoc_tap', teamRole: 'to_truong' },
  { name: 'Ngô Đình Sang', gender: 'male', note: 'Hỗ trợ quản lý học tập tổ 2', role: 'none', teamRole: 'to_pho' },
  { name: 'Dương Thục Trinh', gender: 'female', note: 'Trực nhật sạch sẽ, lễ phép', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Lý Quốc Bảo', gender: 'male', note: 'Nói chuyện riêng trong tiết Vật lý', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)
  { name: 'Võ Thảo Hiền', gender: 'female', note: 'Nề nếp tốt, điểm số ổn định', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Hồ Đăng Khoa', gender: 'male', note: 'Có tinh thần cầu tiến vượt bậc', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Mai Bích Thủy', gender: 'female', note: 'Thân thiện, giúp đỡ bạn bè', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Trịnh Thế Phong', gender: 'male', note: 'Chểnh mảng ôn tập các tuần gần đây', role: 'none', teamRole: 'thanh_vien' }, // Giảm điểm (Group B)
  { name: 'Lưu Kim Chi', gender: 'female', note: 'Thường xuyên quên sách bài tập', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)

  { name: 'Cao Hữu Thiện', gender: 'male', note: 'Lớp phó lao động, nhiệt tình trực ban', role: 'lop_pho_lao_dong', teamRole: 'to_truong' },
  { name: 'Đoàn Băng Di', gender: 'female', note: 'Tổ phó tổ 3, theo dõi chuyên cần', role: 'none', teamRole: 'to_pho' },
  { name: 'Thái Bá Tùng', gender: 'male', note: 'Học lực khá, tham gia phong trào tốt', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Phùng Thu Cúc', gender: 'female', note: 'Vắng học không phép 1 buổi, cần nhắc', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)
  { name: 'Lâm Hải Triều', gender: 'male', note: 'Điểm số dao động mạnh qua các tuần', role: 'none', teamRole: 'thanh_vien' }, // Biến động (Group D)
  { name: 'Tô Cẩm Tiên', gender: 'female', note: 'Đạt điểm 10 miệng, tiến bộ rõ', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Châu Minh Quang', gender: 'male', note: 'Vi phạm nề nếp trật tự giờ Sinh', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)
  { name: 'Tạ Hồng Phấn', gender: 'female', note: 'Luôn gương mẫu, đạt danh hiệu Tốt', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Lê Văn An', gender: 'male', note: 'Sa sút phong độ thi đua', role: 'none', teamRole: 'thanh_vien' }, // Giảm điểm (Group B)

  { name: 'Vũ Thùy Chi', gender: 'female', note: 'Lớp phó trật tự, theo dõi kỷ luật nghiêm', role: 'lop_pho_trat_tu', teamRole: 'to_truong' },
  { name: 'Diệp Khắc Huy', gender: 'male', note: 'Nhắc nhở các bạn trong tổ ngồi ngay ngắn', role: 'none', teamRole: 'to_pho' },
  { name: 'Quách Thúy Vy', gender: 'female', note: 'Học sinh gương mẫu, điểm cao liên tục', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Hà Xuân Nam', gender: 'male', note: 'Điểm lên xuống không đều', role: 'none', teamRole: 'thanh_vien' }, // Biến động (Group D)
  { name: 'Bạch Ái Linh', gender: 'female', note: 'Quyết tâm học tập tốt, tiến bộ lớn', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Ân Gia Thịnh', gender: 'male', note: 'Có tiến bộ trong tuần 7 và 8', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Nghiêm Tuyết Vân', gender: 'female', note: 'Vi phạm đồng phục và giờ giấc', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)
  { name: 'Lương Quốc Toàn', gender: 'male', note: 'Đoàn kết, chấp hành nội quy tốt', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Triệu Thanh Trúc', gender: 'female', note: 'Giảm điểm vì không chuẩn bị bài', role: 'none', teamRole: 'thanh_vien' }, // Giảm điểm (Group B)

  { name: 'Tạ Duy Bách', gender: 'male', note: 'Bí thư chi đoàn 12A2, phong trào tốt', role: 'bi_thu', teamRole: 'to_truong' },
  { name: 'Tôn Nữ Như Mai', gender: 'female', note: 'Tổ phó tổ 5, chăm chỉ học tập', role: 'none', teamRole: 'to_pho' },
  { name: 'Đào Gia Thuận', gender: 'male', note: 'Giữ vững nề nếp thi đua tổ 5', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Chu Phương Dung', gender: 'female', note: 'Cần nỗ lực hơn trong giờ ôn tập', role: 'none', teamRole: 'thanh_vien' }, // Cần quan tâm (Group E)
  { name: 'Nông Văn Khôi', gender: 'male', note: 'Tích cực phát biểu, tiến bộ', role: 'none', teamRole: 'thanh_vien' }, // Tiến bộ (Group A)
  { name: 'Mạc Kim Oanh', gender: 'female', note: 'Điểm dao động quanh mức trung bình', role: 'none', teamRole: 'thanh_vien' }, // Biến động (Group D)
  { name: 'Thạch Bảo Long', gender: 'male', note: 'Giảm điểm liên tục 3 tuần gần đây', role: 'none', teamRole: 'thanh_vien' }, // Giảm điểm (Group B)
  { name: 'Lâm Tố Uyên', gender: 'female', note: 'Hoàn thành xuất sắc nhiệm vụ tuần', role: 'none', teamRole: 'thanh_vien' },
  { name: 'Hứa Minh Quân', gender: 'male', note: 'Ý thức tự quản và làm việc nhóm tốt', role: 'none', teamRole: 'thanh_vien' },
];

export interface GeneratedDemoPackage {
  classInfo: ClassInfo;
  teams: Team[];
  criteria: Criterion[];
  students: Student[];
  weeklyScores: WeeklyScore[];
  events: CompetitionEvent[];
  snapshots: WeeklySnapshot[];
}

// Preset events definitions matching prompt 7
export interface PresetEventDef {
  code: string;
  title: string;
  score: number;
  type: 'positive' | 'negative';
  category: 'study' | 'attendance' | 'behavior' | 'hygiene' | 'responsibility';
  description: string;
}

export const PRESET_EVENTS: PresetEventDef[] = [
  // Positive events
  { code: 'POS_ON_TIME', title: 'Đi học đúng giờ', score: 1, type: 'positive', category: 'attendance', description: 'Có mặt đúng giờ, tham gia truy bài đầy đủ' },
  { code: 'POS_EQUIPMENT', title: 'Mang đầy đủ dụng cụ học tập', score: 1, type: 'positive', category: 'study', description: 'Chuẩn bị đầy đủ SGK, vở ghi và dụng cụ học tập' },
  { code: 'POS_SPEAK_UP', title: 'Phát biểu xây dựng bài', score: 2, type: 'positive', category: 'study', description: 'Hăng hái phát biểu xây dựng bài trong tiết học' },
  { code: 'POS_TASK_DONE', title: 'Hoàn thành nhiệm vụ tốt', score: 2, type: 'positive', category: 'responsibility', description: 'Hoàn thành tốt nhiệm vụ được giao' },
  { code: 'POS_CLEAN_DUTY', title: 'Trực nhật tốt', score: 2, type: 'positive', category: 'hygiene', description: 'Vệ sinh lớp học sạch sẽ, đúng giờ' },
  { code: 'POS_ACTIVITIES', title: 'Tham gia hoạt động tích cực', score: 3, type: 'positive', category: 'responsibility', description: 'Năng nổ tham gia phong trào tập thể và hoạt động Đoàn' },
  { code: 'POS_HELP_FRIEND', title: 'Giúp đỡ bạn', score: 3, type: 'positive', category: 'responsibility', description: 'Chủ động hướng dẫn và hỗ trợ bạn trong học tập' },
  { code: 'POS_OUTSTANDING', title: 'Thành tích nổi bật', score: 5, type: 'positive', category: 'study', description: 'Đạt điểm 10 kiểm tra hoặc đạt giải phong trào thi đua' },

  // Negative events
  { code: 'NEG_LATE', title: 'Đi trễ', score: -1, type: 'negative', category: 'attendance', description: 'Đi học muộn giờ truy bài' },
  { code: 'NEG_NO_EQUIP', title: 'Quên dụng cụ học tập', score: -1, type: 'negative', category: 'study', description: 'Thiếu sách vở hoặc đồ dùng học tập cần thiết' },
  { code: 'NEG_NO_TASK', title: 'Không hoàn thành nhiệm vụ', score: -2, type: 'negative', category: 'responsibility', description: 'Chưa làm bài tập về nhà hoặc nhiệm vụ được phân công' },
  { code: 'NEG_DISCIPLINE', title: 'Vi phạm nề nếp', score: -2, type: 'negative', category: 'behavior', description: 'Nói chuyện riêng hoặc vi phạm tác phong đồng phục' },
  { code: 'NEG_MISS_ACTIVITY', title: 'Không tham gia hoạt động đã đăng ký', score: -3, type: 'negative', category: 'responsibility', description: 'Vắng mặt không lý do trong hoạt động tập thể đã đăng ký' },
  { code: 'NEG_SERIOUS', title: 'Vi phạm nghiêm trọng', score: -5, type: 'negative', category: 'behavior', description: 'Mất trật tự nghiêm trọng hoặc dùng điện thoại trong giờ học' },
];

/**
 * Generate 1 class demo data with exactly 45 students, 5 teams, 8 weeks of data.
 */
export function generateClassDemoData(
  teacherId: string,
  classNameInput: '12A1' | '12A2' | string = '12A1',
  teacherNameInput?: string
): GeneratedDemoPackage {
  const isClass12A1 = !classNameInput.includes('12A2');
  const className = isClass12A1 ? '12A1' : '12A2';
  const classCodePrefix = isClass12A1 ? '12A1' : '12A2';
  const rawStudentList = isClass12A1 ? DEMO_STUDENTS_12A1 : DEMO_STUDENTS_12A2;
  const teacherName = teacherNameInput || 'Thầy Phong Qui';
  const classId = `demo_class_${className.toLowerCase()}_${teacherId.slice(0, 6)}`;
  const now = new Date().toISOString();

  const classInfo: ClassInfo = {
    classId,
    teacherId,
    teacherName,
    className,
    grade: 'Khối 12',
    schoolYear: '2026-2027',
    currentWeek: 8,
    totalWeeks: 35,
    startingScore: DEFAULT_STARTING_SCORE,
    studentCount: 45,
    createdAt: now,
    isDemo: true,
  };

  // 5 Teams per class (each has exactly 9 students)
  const teamColors = ['indigo', 'emerald', 'amber', 'rose', 'sky'];
  const teams: Team[] = [1, 2, 3, 4, 5].map((num, idx) => {
    const leaderStudent = rawStudentList[(num - 1) * 9];
    return {
      teamId: `demo_team_${num}_${classId}`,
      classId,
      teacherId,
      teamName: `Tổ ${num}`,
      teamNumber: num,
      leaderName: leaderStudent.name,
      color: teamColors[idx],
      createdAt: now,
      isDemo: true,
    };
  });

  // 5 Core Criteria matching prompt 6
  const criteriaData = [
    { code: 'STUDY', name: 'Học tập', description: 'Chuẩn bị bài, làm bài tập đầy đủ, phát biểu xây dựng bài', pos: 2, neg: -1, cat: 'study' as const },
    { code: 'ATTENDANCE', name: 'Chuyên cần', description: 'Đi học đúng giờ, tham gia đầy đủ các buổi học và truy bài', pos: 1, neg: -1, cat: 'attendance' as const },
    { code: 'DISCIPLINE', name: 'Nề nếp', description: 'Chấp hành nghiêm chỉnh nội quy, đồng phục, trật tự trong giờ học', pos: 1, neg: -2, cat: 'behavior' as const },
    { code: 'RESPONSIBILITY', name: 'Ý thức', description: 'Tinh thần tự giác, trực nhật vệ sinh, hoàn thành nhiệm vụ và giúp đỡ bạn', pos: 2, neg: -2, cat: 'responsibility' as const },
    { code: 'ACTIVITIES', name: 'Tham gia hoạt động', description: 'Tích cực tham gia phong trào Đoàn, hoạt động văn thể mỹ và tập thể lớp', pos: 3, neg: -3, cat: 'responsibility' as const },
  ];

  const criteria: Criterion[] = criteriaData.map((crit, idx) => ({
    criterionId: `demo_crit_${idx + 1}_${classId}`,
    teacherId,
    classId,
    code: crit.code,
    name: crit.name,
    description: crit.description,
    positiveScore: crit.pos,
    negativeScore: crit.neg,
    defaultScore: crit.pos,
    category: crit.cat,
    order: idx + 1,
    active: true,
    isDemo: true,
    createdAt: now,
  }));

  // 45 Students: 12A1-001 -> 12A1-045 or 12A2-001 -> 12A2-045
  const students: Student[] = rawStudentList.map((item, idx) => {
    const studentNumber = idx + 1;
    const formattedNum = String(studentNumber).padStart(3, '0');
    const studentCode = `${classCodePrefix}-${formattedNum}`;
    const studentId = `demo_std_${classCodePrefix.toLowerCase()}_${formattedNum}_${teacherId.slice(0, 6)}`;

    // Team calculation: exactly 9 students per team (Tổ 1: 0-8, Tổ 2: 9-17, Tổ 3: 18-26, Tổ 4: 27-35, Tổ 5: 36-44)
    const teamIndex = Math.floor(idx / 9);
    const team = teams[teamIndex] || teams[0];
    const isLeader = item.teamRole === 'to_truong';

    return {
      studentId,
      studentCode,
      classId,
      teacherId,
      studentNumber,
      fullName: item.name,
      teamId: team.teamId,
      teamName: team.teamName,
      gender: item.gender as 'male' | 'female',
      parentPhone: `09${Math.floor(10000000 + (idx + 1) * 194821) % 90000000 + 10000000}`,
      parentName: `Phụ huynh em ${item.name.split(' ').slice(-1)[0]}`,
      notes: item.note,
      cadreRole: (item.role || 'none') as ClassCadreRole,
      teamRole: (item.teamRole || 'thanh_vien') as TeamRole,
      isTeamLeader: isLeader,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      isDemo: true,
    };
  });

  // Archetypes distribution across 45 students:
  // - Nhóm A: Tiến bộ rõ rệt (10-15% ~ 6 học sinh): indices [4, 5, 14, 23, 31, 40]
  // - Nhóm B: Giảm dần (10-15% ~ 6 học sinh): indices [6, 8, 16, 26, 35, 42]
  // - Nhóm C: Ổn định cao (30-40% ~ 14 học sinh): indices [0, 1, 2, 3, 9, 10, 18, 19, 27, 28, 36, 37, 43, 44]
  // - Nhóm D: Biến động mạnh (15-20% ~ 8 học sinh): indices [22, 30, 41, 11, 20, 29, 38, 7]
  // - Nhóm E: Cần quan tâm (10% ~ 5 học sinh): indices [12, 17, 21, 24, 33]
  // - Còn lại 6 học sinh dao động tự nhiên tích cực: indices [13, 15, 25, 32, 34, 39]
  const progressiveIndices = new Set([4, 5, 14, 23, 31, 40]);
  const decliningIndices = new Set([6, 8, 16, 26, 35, 42]);
  const highStableIndices = new Set([0, 1, 2, 3, 9, 10, 18, 19, 27, 28, 36, 37, 43, 44]);
  const fluctuatingIndices = new Set([22, 30, 41, 11, 20, 29, 38, 7]);
  const concernIndices = new Set([12, 17, 21, 24, 33]);

  // Calendar dates for the 8 weeks in School Year 2026-2027
  const weekDates: Record<number, { mon: string; wed: string; fri: string }> = {
    1: { mon: '2026-07-20', wed: '2026-07-22', fri: '2026-07-24' },
    2: { mon: '2026-07-27', wed: '2026-07-29', fri: '2026-07-31' },
    3: { mon: '2026-08-03', wed: '2026-08-05', fri: '2026-08-07' },
    4: { mon: '2026-08-10', wed: '2026-08-12', fri: '2026-08-14' },
    5: { mon: '2026-08-17', wed: '2026-08-19', fri: '2026-08-21' },
    6: { mon: '2026-08-24', wed: '2026-08-26', fri: '2026-08-28' },
    7: { mon: '2026-08-31', wed: '2026-09-02', fri: '2026-09-04' },
    8: { mon: '2026-09-07', wed: '2026-09-09', fri: '2026-09-11' },
  };

  const weeklyScores: WeeklyScore[] = [];
  const events: CompetitionEvent[] = [];

  // Map each criterion by code
  const critMap = new Map(criteria.map(c => [c.code, c]));

  // Helper to safely add an event
  const addEvent = (
    student: Student,
    week: number,
    preset: PresetEventDef,
    dateString: string,
    customNote?: string,
    eventIndex: number = 1
  ) => {
    const matchedCrit = critMap.get(
      preset.category === 'study' ? 'STUDY' :
      preset.category === 'attendance' ? 'ATTENDANCE' :
      preset.category === 'behavior' ? 'DISCIPLINE' :
      preset.category === 'hygiene' ? 'RESPONSIBILITY' : 'ACTIVITIES'
    ) || criteria[0];

    const event: CompetitionEvent = {
      eventId: `demo_ev_${student.studentId}_w${week}_${eventIndex}_${preset.code.toLowerCase()}`,
      teacherId,
      classId,
      studentId: student.studentId,
      studentName: student.fullName,
      teamId: student.teamId,
      criterionId: matchedCrit.criterionId,
      criterionName: matchedCrit.name,
      week,
      weekNumber: week,
      date: dateString,
      score: preset.score,
      points: preset.score,
      type: preset.type,
      title: preset.title,
      description: customNote || preset.description,
      note: customNote || preset.description,
      schoolYearId: '2026-2027',
      createdAt: `${dateString}T08:30:00.000Z`,
      isDemo: true,
    };

    events.push(event);
    return event;
  };

  // Generate events for all 45 students across 8 weeks
  students.forEach((student, sIdx) => {
    for (let w = 1; w <= 8; w++) {
      const dates = weekDates[w] || weekDates[8];
      let evCount = 0;

      if (progressiveIndices.has(sIdx)) {
        // NHÓM A — TIẾN BỘ RÕ RỆT (Tăng dần từ ~94 lên ~115)
        // Những tuần đầu: ít điểm cộng, có thể có 1 điểm trừ nhỏ
        if (w <= 2) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[0], dates.mon, 'Đi học đúng giờ', evCount); // +1
          if (w === 1) {
            evCount++;
            addEvent(student, w, PRESET_EVENTS[9], dates.wed, 'Quên vở bài tập', evCount); // -1
          }
        } else if (w <= 4) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[0], dates.mon, 'Đi học đúng giờ', evCount); // +1
          evCount++;
          addEvent(student, w, PRESET_EVENTS[2], dates.wed, 'Tích cực phát biểu xây dựng bài', evCount); // +2
        } else if (w <= 6) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[2], dates.mon, 'Phát biểu đóng góp ý kiến hay', evCount); // +2
          evCount++;
          addEvent(student, w, PRESET_EVENTS[3], dates.wed, 'Hoàn thành tốt nhiệm vụ được giao', evCount); // +2
          evCount++;
          addEvent(student, w, PRESET_EVENTS[6], dates.fri, 'Hỗ trợ bạn cùng tiến trong tổ', evCount); // +3
        } else {
          // Tuần 7 và 8: Tỏa sáng rực rỡ
          evCount++;
          addEvent(student, w, PRESET_EVENTS[2], dates.mon, 'Hăng hái phát biểu xây dựng bài cả tuần', evCount); // +2
          evCount++;
          addEvent(student, w, PRESET_EVENTS[5], dates.wed, 'Tham gia hoạt động phong trào sôi nổi', evCount); // +3
          evCount++;
          addEvent(student, w, PRESET_EVENTS[7], dates.fri, 'Đạt điểm 10 kiểm tra, thành tích nổi bật', evCount); // +5
          if (w === 8) {
            evCount++;
            addEvent(student, w, PRESET_EVENTS[3], '2026-09-10', 'Nhóm trưởng năng nổ, tổ đạt kết quả cao', evCount); // +2
          }
        }
      } else if (decliningIndices.has(sIdx)) {
        // NHÓM B — GIẢM DẦN (Từ ~108 xuống ~86-88)
        // Những tuần đầu: còn tốt
        if (w <= 2) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[0], dates.mon, 'Đi học đúng giờ', evCount); // +1
          evCount++;
          addEvent(student, w, PRESET_EVENTS[3], dates.wed, 'Hoàn thành nhiệm vụ tổ', evCount); // +2
        } else if (w <= 4) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[8], dates.mon, 'Đi học trễ giờ truy bài', evCount); // -1
          evCount++;
          addEvent(student, w, PRESET_EVENTS[9], dates.wed, 'Quên mang sách bài tập', evCount); // -1
        } else if (w <= 6) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[8], dates.mon, 'Đi học trễ lần 2', evCount); // -1
          evCount++;
          addEvent(student, w, PRESET_EVENTS[10], dates.wed, 'Chưa chuẩn bị bài tập môn Lý', evCount); // -2
          evCount++;
          addEvent(student, w, PRESET_EVENTS[11], dates.fri, 'Nói chuyện riêng trong giờ học', evCount); // -2
        } else {
          // Tuần 7 và 8: Sa sút liên tiếp
          evCount++;
          addEvent(student, w, PRESET_EVENTS[8], dates.mon, 'Đi học muộn 15 phút đầu giờ', evCount); // -1
          evCount++;
          addEvent(student, w, PRESET_EVENTS[10], dates.wed, 'Không hoàn thành nhiệm vụ trực ban', evCount); // -2
          evCount++;
          addEvent(student, w, PRESET_EVENTS[11], dates.fri, 'Mất trật tự làm ảnh hưởng tiết học', evCount); // -2
          if (w === 8) {
            evCount++;
            addEvent(student, w, PRESET_EVENTS[12], '2026-09-10', 'Không tham gia buổi tổng vệ sinh đã đăng ký', evCount); // -3
          }
        }
      } else if (highStableIndices.has(sIdx)) {
        // NHÓM C — ỔN ĐỊNH XUẤT SẮC (Duy trì 108 - 116)
        evCount++;
        addEvent(student, w, PRESET_EVENTS[0], dates.mon, 'Đi học đúng giờ và gương mẫu', evCount); // +1
        evCount++;
        addEvent(student, w, PRESET_EVENTS[3], dates.wed, 'Hoàn thành chu đáo nhiệm vụ tổ', evCount); // +2
        if ((w + sIdx) % 2 === 0) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[2], dates.fri, 'Phát biểu xây dựng bài tự tin', evCount); // +2
        }
        if (w % 3 === 0) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[4], dates.fri, 'Trực nhật xuất sắc, bàn ghế ngay ngắn', evCount); // +2
        }
        if (w === 8 && sIdx % 3 === 0) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[5], '2026-09-11', 'Tích cực dẫn dắt phong trào học tập', evCount); // +3
        }
      } else if (fluctuatingIndices.has(sIdx)) {
        // NHÓM D — BIẾN ĐỘNG (Tuần tăng mạnh, tuần giảm mạnh)
        const isUpWeek = (w % 2 === 1); // Tuần lẻ tăng, tuần chẵn giảm
        if (isUpWeek) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[0], dates.mon, 'Đi học đúng giờ', evCount); // +1
          evCount++;
          addEvent(student, w, PRESET_EVENTS[2], dates.wed, 'Hăng hái phát biểu xây dựng bài', evCount); // +2
          evCount++;
          addEvent(student, w, PRESET_EVENTS[5], dates.fri, 'Tham gia văn nghệ/thể thao tích cực', evCount); // +3
          if (w === 7) {
            evCount++;
            addEvent(student, w, PRESET_EVENTS[7], dates.fri, 'Đạt điểm 10 miệng, phong độ xuất sắc', evCount); // +5
          }
        } else {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[8], dates.mon, 'Đi trễ đầu tuần', evCount); // -1
          evCount++;
          addEvent(student, w, PRESET_EVENTS[10], dates.wed, 'Chưa hoàn thành bài tập về nhà', evCount); // -2
          evCount++;
          addEvent(student, w, PRESET_EVENTS[11], dates.fri, 'Nói chuyện riêng trong lớp', evCount); // -2
          if (w === 8) {
            evCount++;
            addEvent(student, w, PRESET_EVENTS[9], '2026-09-09', 'Quên mang dụng cụ thực hành', evCount); // -1
          }
        }
      } else if (concernIndices.has(sIdx)) {
        // NHÓM E — CẦN QUAN TÂM (Quanh 84 - 91, cần hỗ trợ nề nếp & chuyên cần)
        evCount++;
        addEvent(student, w, PRESET_EVENTS[8], dates.mon, 'Đi trễ giờ truy bài', evCount); // -1
        evCount++;
        addEvent(student, w, PRESET_EVENTS[9], dates.wed, 'Quên mang sách vở bài tập', evCount); // -1
        evCount++;
        addEvent(student, w, PRESET_EVENTS[10], dates.fri, 'Chưa soạn bài mới', evCount); // -2
        if (w % 2 === 0) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[11], dates.fri, 'Gục mặt xuống bàn trong giờ học', evCount); // -2
        }
        if (w >= 6 && sIdx % 2 === 0) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[0], dates.mon, 'Có cố gắng đi đúng giờ đầu tuần', evCount); // +1 động viên
        }
      } else {
        // Học sinh ổn định tự nhiên (quanh 100 - 105)
        evCount++;
        addEvent(student, w, PRESET_EVENTS[0], dates.mon, 'Đi học đúng giờ', evCount); // +1
        if ((w + sIdx) % 3 === 0) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[2], dates.wed, 'Phát biểu xây dựng bài', evCount); // +2
        }
        if ((w + sIdx) % 5 === 0) {
          evCount++;
          addEvent(student, w, PRESET_EVENTS[9], dates.fri, 'Quên mang thước kẻ', evCount); // -1
        }
      }
    }
  });

  // CODE-FIRST SCORE PIPELINE:
  // Mathematical guarantee: WeeklyScore is strictly computed from startingScore + positive - negative events
  for (let w = 1; w <= 8; w++) {
    students.forEach((student) => {
      const studentWeekEvents = events.filter(e => e.studentId === student.studentId && e.week === w);
      let totalPositive = 0;
      let totalNegative = 0;

      studentWeekEvents.forEach(e => {
        if (e.score > 0) {
          totalPositive += e.score;
        } else {
          totalNegative += Math.abs(e.score);
        }
      });

      const finalScore = DEFAULT_STARTING_SCORE + totalPositive - totalNegative;
      const rankInfo = calculateRank(finalScore, DEFAULT_THRESHOLDS);

      weeklyScores.push({
        scoreId: `demo_ws_${student.studentId}_w${w}`,
        teacherId,
        classId,
        studentId: student.studentId,
        week: w,
        weekNumber: w,
        schoolYearId: '2026-2027',
        startingScore: DEFAULT_STARTING_SCORE,
        totalPositive,
        totalNegative,
        finalScore,
        rankCategory: rankInfo.category,
        stars: rankInfo.stars,
        updatedAt: now,
        isDemo: true,
      });
    });
  }

  // Generate Weekly Snapshots for weeks 1 through 8
  const snapshots: WeeklySnapshot[] = [];

  for (let w = 1; w <= 8; w++) {
    const weekScores = weeklyScores.filter(ws => ws.week === w);

    // Sort students by score descending to get student ranking
    const sortedStudentScores = [...weekScores].sort((a, b) => b.finalScore - a.finalScore);
    const studentsScores = sortedStudentScores.map((scoreObj, rankIdx) => {
      const student = students.find(s => s.studentId === scoreObj.studentId)!;
      return {
        studentId: student.studentId,
        fullName: student.fullName,
        teamName: student.teamName,
        startingScore: scoreObj.startingScore,
        totalPositive: scoreObj.totalPositive,
        totalNegative: scoreObj.totalNegative,
        finalScore: scoreObj.finalScore,
        rankCategory: scoreObj.rankCategory,
        rankNumber: rankIdx + 1,
      };
    });

    // Compute Team Rankings dynamically from real student scores
    const teamAverages = teams.map(team => {
      const teamStudents = students.filter(s => s.teamId === team.teamId);
      const teamScores = weekScores.filter(ws => teamStudents.some(ts => ts.studentId === ws.studentId));
      const totalScore = teamScores.reduce((sum, curr) => sum + curr.finalScore, 0);
      const avgScore = teamScores.length > 0 
        ? Math.round((totalScore / teamScores.length) * 10) / 10 
        : DEFAULT_STARTING_SCORE;

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        avgScore,
        rank: 0
      };
    });

    // Sort teams by average score descending
    teamAverages.sort((a, b) => b.avgScore - a.avgScore);
    const teamRankings = teamAverages.map((t, idx) => ({
      ...t,
      rank: idx + 1
    }));

    // Stats summary
    const allFinalScores = weekScores.map(ws => ws.finalScore);
    const avgScore = Math.round((allFinalScores.reduce((a, b) => a + b, 0) / allFinalScores.length) * 10) / 10;
    const highestScore = Math.max(...allFinalScores);
    const lowestScore = Math.min(...allFinalScores);
    const excellentCount = weekScores.filter(ws => ws.stars >= 5).length;
    const needSupportCount = weekScores.filter(ws => ws.finalScore < 90).length;
    const weekEvents = events.filter(e => e.week === w);

    const snapshot: WeeklySnapshot = {
      snapshotId: `snap_${classId}_w${w}`,
      classId,
      weekNumber: w,
      schoolYearId: '2026-2027',
      lockedAt: w < 8 ? `2026-09-0${w}T17:00:00.000Z` : '',
      lockedBy: w < 8 ? teacherName : '',
      totalStudents: 45,
      averageScore: avgScore,
      highestScore,
      lowestScore,
      ranking: teamRankings,
      studentsScores,
      teamRankings,
      statsSummary: {
        avgScore,
        totalEvents: weekEvents.length,
        excellentCount,
        needSupportCount,
      },
      createdAt: now,
      isDemo: true,
    };

    snapshots.push(snapshot);
  }

  return {
    classInfo,
    teams,
    criteria,
    students,
    weeklyScores,
    events,
    snapshots,
  };
}

/**
 * Generates both 12A1 and 12A2 demo packages (90 students total).
 */
export function generateTwoClassesDemoData(
  teacherId: string,
  teacherNameInput?: string
): [GeneratedDemoPackage, GeneratedDemoPackage] {
  const teacherName = teacherNameInput || 'Thầy Phong Qui';
  const class12A1 = generateClassDemoData(teacherId, '12A1', teacherName);
  const class12A2 = generateClassDemoData(teacherId, '12A2', teacherName);
  return [class12A1, class12A2];
}

/**
 * Backward-compatible helper for single class seeding.
 */
export function generateDemoData(
  teacherId: string,
  customTeacherName?: string,
  customClassName?: string
) {
  const targetClass = customClassName?.includes('12A2') ? '12A2' : '12A1';
  return generateClassDemoData(teacherId, targetClass, customTeacherName);
}

/**
 * Automated Data Integrity Check (Prompt 8, Requirement 19)
 */
export function verifyDemoDataIntegrity(
  pkg1: GeneratedDemoPackage,
  pkg2: GeneratedDemoPackage
): { isHealthy: boolean; errors: string[]; summary: string } {
  const errors: string[] = [];

  // Check 1: 45 students in 12A1, 45 students in 12A2
  if (pkg1.students.length !== 45) {
    errors.push(`Lớp 12A1 có ${pkg1.students.length} học sinh (yêu cầu đúng 45 học sinh).`);
  }
  if (pkg2.students.length !== 45) {
    errors.push(`Lớp 12A2 có ${pkg2.students.length} học sinh (yêu cầu đúng 45 học sinh).`);
  }

  // Check 2: No duplicate studentCode
  const allStudents = [...pkg1.students, ...pkg2.students];
  const codeSet = new Set<string>();
  allStudents.forEach(s => {
    if (!s.studentCode) {
      errors.push(`Học sinh ${s.fullName} thiếu studentCode.`);
    } else if (codeSet.has(s.studentCode)) {
      errors.push(`Trùng lặp mã học sinh: ${s.studentCode}.`);
    } else {
      codeSet.add(s.studentCode);
    }
  });

  // Check 3: Unique student names across all 90 students
  const nameSet = new Set<string>();
  allStudents.forEach(s => {
    if (nameSet.has(s.fullName)) {
      errors.push(`Trùng lặp họ tên học sinh: ${s.fullName}.`);
    } else {
      nameSet.add(s.fullName);
    }
  });

  // Check 4: Each student belongs to exactly 1 class and 1 team
  allStudents.forEach(s => {
    if (!s.classId) errors.push(`Học sinh ${s.fullName} không có classId.`);
    if (!s.teamId) errors.push(`Học sinh ${s.fullName} không có teamId.`);
  });

  // Check 5: Exactly 5 teams per class, 9 students per team
  [pkg1, pkg2].forEach(pkg => {
    if (pkg.teams.length !== 5) {
      errors.push(`Lớp ${pkg.classInfo.className} có ${pkg.teams.length} tổ (yêu cầu đúng 5 tổ).`);
    }
    pkg.teams.forEach(t => {
      const memberCount = pkg.students.filter(s => s.teamId === t.teamId).length;
      if (memberCount !== 9) {
        errors.push(`Tổ ${t.teamName} (${pkg.classInfo.className}) có ${memberCount} học sinh (yêu cầu 9).`);
      }
    });
  });

  // Check 6: No events pointing to non-existent students
  const studentIdSet = new Set(allStudents.map(s => s.studentId));
  const allEvents = [...pkg1.events, ...pkg2.events];
  allEvents.forEach(e => {
    if (!studentIdSet.has(e.studentId)) {
      errors.push(`Sự kiện ${e.eventId} trỏ tới studentId không tồn tại: ${e.studentId}.`);
    }
  });

  // Check 7: No NaN or Infinity scores
  const allScores = [...pkg1.weeklyScores, ...pkg2.weeklyScores];
  allScores.forEach(ws => {
    if (isNaN(ws.finalScore) || !isFinite(ws.finalScore)) {
      errors.push(`Điểm bất thường cho ${ws.scoreId}: finalScore=${ws.finalScore}.`);
    }
    if (isNaN(ws.startingScore) || isNaN(ws.totalPositive) || isNaN(ws.totalNegative)) {
      errors.push(`Điểm bất thường cho ${ws.scoreId}: pos=${ws.totalPositive}, neg=${ws.totalNegative}.`);
    }
  });

  // Check 8: No invalid weekNumbers outside 1–8
  allScores.forEach(ws => {
    if (ws.week < 1 || ws.week > 8) {
      errors.push(`Điểm tuần nằm ngoài khoảng 1-8: week=${ws.week}.`);
    }
  });
  allEvents.forEach(e => {
    if (e.week < 1 || e.week > 8) {
      errors.push(`Sự kiện nằm ngoài tuần 1-8: week=${e.week}.`);
    }
  });

  // Check 9: All demo entities must have isDemo: true
  const checkDemoFlag = (items: Array<{ isDemo?: boolean }>, typeName: string) => {
    items.forEach((item, i) => {
      if (item.isDemo !== true) {
        errors.push(`Phần tử ${typeName}[${i}] thiếu cờ isDemo = true.`);
      }
    });
  };

  checkDemoFlag([pkg1.classInfo, pkg2.classInfo], 'classes');
  checkDemoFlag(allStudents, 'students');
  checkDemoFlag([...pkg1.teams, ...pkg2.teams], 'teams');
  checkDemoFlag([...pkg1.criteria, ...pkg2.criteria], 'criteria');
  checkDemoFlag(allScores, 'weeklyScores');
  checkDemoFlag(allEvents, 'events');
  checkDemoFlag([...pkg1.snapshots, ...pkg2.snapshots], 'snapshots');

  return {
    isHealthy: errors.length === 0,
    errors,
    summary: errors.length === 0 
      ? `Toàn vẹn 100%: 2 lớp (12A1 & 12A2), 90 học sinh, 10 tổ, 8 tuần dữ liệu, ${allScores.length} bản ghi điểm, ${allEvents.length} sự kiện và 16 snapshot!`
      : `Phát hiện ${errors.length} vấn đề toàn vẹn dữ liệu.`,
  };
}
