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
  { name: 'Bùi Thùy Dương', gender: 'female', note: 'Thủ quỹ, quản lý quỹ lớp và thu chi minh bạch', role: 'pho_bi_thu', teamRole: 'to_pho' },
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
  { name: 'Hoàng Khánh Ly', gender: 'female', note: 'Thủ quỹ, quản lý quỹ lớp và thu chi minh bạch', role: 'pho_bi_thu', teamRole: 'to_pho' },
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

// Preset 14 criteria copied directly from the real class (11A9)
export interface RealCriterionDef {
  code: string;
  name: string;
  description: string;
  positiveScore: number;
  negativeScore: number;
  category: 'study' | 'attendance' | 'behavior' | 'hygiene' | 'responsibility';
}

export const REAL_CLASS_CRITERIA_PRESET: RealCriterionDef[] = [
  { code: 'CUSTOM_1790089119591', name: 'Đi trễ giờ truy bài', description: 'Đi học muộn giờ truy bài 15 phút đầu giờ', positiveScore: 0, negativeScore: -10, category: 'attendance' },
  { code: 'CUSTOM_1790089242261', name: 'Vào lớp sau Giáo viên', description: 'Vào lớp muộn sau khi giáo viên đã bắt đầu tiết dạy', positiveScore: 0, negativeScore: -20, category: 'attendance' },
  { code: 'CUSTOM_1790089316129', name: 'Nghỉ học có phép', description: 'Nghỉ học có đơn xin phép hoặc phụ huynh liên hệ GVCN', positiveScore: 0, negativeScore: -5, category: 'attendance' },
  { code: 'CUSTOM_1790089395230', name: 'Nghỉ học không phép', description: 'Nghỉ học không có lý do hoặc không có phép của phụ huynh', positiveScore: 0, negativeScore: -20, category: 'attendance' },
  { code: 'CUSTOM_1790089692282', name: 'Đồng phục, tác phong', description: 'Chấp hành nghiêm túc quy định về trang phục, phù hiệu và tác phong', positiveScore: 0, negativeScore: -5, category: 'behavior' },
  { code: 'CUSTOM_1790089822414', name: 'Chuẩn bị bài đầy đủ', description: 'Soạn bài, làm bài tập về nhà và chuẩn bị tài liệu đầy đủ', positiveScore: 5, negativeScore: -5, category: 'study' },
  { code: 'CUSTOM_1790089870022', name: 'Phát biểu xây dựng bài', description: 'Hăng hái xung phong phát biểu xây dựng bài trong tiết học', positiveScore: 5, negativeScore: 0, category: 'study' },
  { code: 'CUSTOM_1790089959234', name: 'Hoàn thành nhiệm vụ học tập', description: 'Hoàn thành xuất sắc nhiệm vụ học tập do giáo viên bộ môn giao', positiveScore: 5, negativeScore: -5, category: 'study' },
  { code: 'CUSTOM_1790090007550', name: 'Làm việc nhóm tích cực', description: 'Nhiệt tình trao đổi, cộng tác hiệu quả trong hoạt động nhóm', positiveScore: 5, negativeScore: -5, category: 'study' },
  { code: 'CUSTOM_1790090067948', name: 'Giữ trật tự trong giờ học', description: 'Giữ trật tự, tập trung nghe giảng, không nói chuyện riêng', positiveScore: 0, negativeScore: -5, category: 'behavior' },
  { code: 'CUSTOM_1790090124956', name: 'Đoàn kết, giúp đỡ bạn bè', description: 'Chủ động hướng dẫn, giúp đỡ bạn tiến bộ trong học tập', positiveScore: 10, negativeScore: -5, category: 'responsibility' },
  { code: 'CUSTOM_1790090184134', name: 'Giao tiếp văn minh', description: 'Lễ phép với thầy cô, giao tiếp hòa nhã, lịch sự với bạn bè', positiveScore: 0, negativeScore: -5, category: 'behavior' },
  { code: 'CUSTOM_1790090254585', name: 'Tham gia lao động đầy đủ', description: 'Trực nhật sạch sẽ, tham gia đầy đủ buổi lao động tập thể', positiveScore: 10, negativeScore: -10, category: 'responsibility' },
  { code: 'CUSTOM_1790090301385', name: 'Vắng các buổi lao động', description: 'Vắng mặt không lý do trong buổi lao động vệ sinh chung của lớp', positiveScore: 0, negativeScore: -30, category: 'responsibility' },
];

/**
 * Generate 1 class demo data with exactly 45 students, 4 teams, 14 criteria copied from real class.
 */
export function generateClassDemoData(
  teacherId: string,
  classNameInput: '12A1' | '12A2' | string = '12A1',
  teacherNameInput?: string,
  customCriteriaList?: Criterion[]
): GeneratedDemoPackage {
  const className = '12A1';
  const classCodePrefix = '12A1';
  const rawStudentList = DEMO_STUDENTS_12A1;
  const teacherName = teacherNameInput || 'Thầy Phong Qui';
  const classId = `demo_class_${className.toLowerCase()}_${teacherId.slice(0, 8)}`;
  const now = new Date().toISOString();

  const classInfo: ClassInfo = {
    classId,
    teacherId,
    teacherName,
    className: '12A1',
    grade: 'Khối 12',
    schoolYear: '2026-2027',
    currentWeek: 8,
    totalWeeks: 35,
    startingScore: DEFAULT_STARTING_SCORE,
    studentCount: 45,
    createdAt: now,
    isDemo: true,
  };

  // Exactly 4 Teams per class: Tổ 1, Tổ 2, Tổ 3, Tổ 4
  const teamColors = ['indigo', 'emerald', 'amber', 'rose'];
  const teamLeaders = [
    'Đặng Minh Khang', // Tổ 1
    'Trần Bảo Châu',   // Tổ 2
    'Vũ Gia Bảo',       // Tổ 3
    'Lê Quỳnh Nga',     // Tổ 4
  ];

  const teams: Team[] = [1, 2, 3, 4].map((num, idx) => {
    return {
      teamId: `demo_team_${num}_${classId}`,
      classId,
      teacherId,
      teamName: `Tổ ${num}`,
      teamNumber: num,
      leaderName: teamLeaders[idx],
      color: teamColors[idx],
      createdAt: now,
      isDemo: true,
    };
  });

  // 14 Criteria replicated from Real Class (11A9)
  const criteria: Criterion[] = (customCriteriaList && customCriteriaList.length > 0)
    ? customCriteriaList.map((c, idx) => ({
        ...c,
        criterionId: `demo_crit_${idx + 1}_${classId}`,
        classId,
        teacherId,
        order: idx + 1,
        active: true,
        isDemo: true,
        createdAt: now,
      }))
    : REAL_CLASS_CRITERIA_PRESET.map((crit, idx) => ({
        criterionId: `demo_crit_${idx + 1}_${classId}`,
        teacherId,
        classId,
        code: crit.code,
        name: crit.name,
        description: crit.description,
        positiveScore: crit.positiveScore,
        negativeScore: crit.negativeScore,
        defaultScore: crit.positiveScore > 0 ? crit.positiveScore : crit.negativeScore,
        category: crit.category,
        order: idx + 1,
        active: true,
        isDemo: true,
        createdAt: now,
      }));

  // 45 Students distributed across 4 Teams:
  // Tổ 1: 11 hs (0-10)
  // Tổ 2: 11 hs (11-21)
  // Tổ 3: 11 hs (22-32)
  // Tổ 4: 12 hs (33-44)
  const getTeamIndex = (sIndex: number): number => {
    if (sIndex < 11) return 0;
    if (sIndex < 22) return 1;
    if (sIndex < 33) return 2;
    return 3;
  };

  const students: Student[] = rawStudentList.map((item, idx) => {
    const studentNumber = idx + 1;
    const formattedNum = String(studentNumber).padStart(3, '0');
    const studentCode = `${classCodePrefix}-${formattedNum}`;
    const studentId = `demo_std_${classCodePrefix.toLowerCase()}_${formattedNum}_${teacherId.slice(0, 8)}`;

    const teamIndex = getTeamIndex(idx);
    const team = teams[teamIndex];
    
    // Assign team leaders for the 4 teams
    const isLeader = (teamIndex === 0 && idx === 0) ||
                     (teamIndex === 1 && idx === 11) ||
                     (teamIndex === 2 && idx === 22) ||
                     (teamIndex === 3 && idx === 33);

    const isViceLeader = (teamIndex === 0 && idx === 1) ||
                         (teamIndex === 1 && idx === 12) ||
                         (teamIndex === 2 && idx === 23) ||
                         (teamIndex === 3 && idx === 34);

    const calculatedTeamRole: TeamRole = isLeader ? 'to_truong' : (isViceLeader ? 'to_pho' : 'thanh_vien');

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
      teamRole: calculatedTeamRole,
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

  // Map 14 real criteria helpers
  const findCriterion = (nameSub: string, fallbackIdx = 0): Criterion => {
    return criteria.find(c => c.name.toLowerCase().includes(nameSub.toLowerCase())) || criteria[fallbackIdx] || criteria[0];
  };

  const cPhatBieu = findCriterion('Phát biểu', 6);
  const cChuanBi = findCriterion('Chuẩn bị bài', 5);
  const cNhiemVu = findCriterion('Hoàn thành nhiệm vụ', 7);
  const cLamNhom = findCriterion('nhóm tích cực', 8);
  const cDoanKet = findCriterion('Đoàn kết', 10);
  const cLaoDong = findCriterion('Tham gia lao động', 12);
  const cDiTre = findCriterion('Đi trễ', 0);
  const cVaoLopSau = findCriterion('Vào lớp sau', 1);
  const cNghiCoPhep = findCriterion('có phép', 2);
  const cNghiKhongPhep = findCriterion('không phép', 3);
  const cDongPhuc = findCriterion('Đồng phục', 4);
  const cTratTu = findCriterion('trật tự', 9);
  const cVanMinh = findCriterion('văn minh', 11);
  const cVangLaoDong = findCriterion('Vắng các buổi lao động', 13);

  // Helper to safely add an event based on real criteria
  const addEvent = (
    student: Student,
    week: number,
    targetCriterion: Criterion,
    isPositive: boolean,
    dateString: string,
    customNote?: string,
    eventIndex: number = 1
  ) => {
    const scoreVal = isPositive ? (targetCriterion.positiveScore || 5) : (targetCriterion.negativeScore || -5);
    const eventType: 'positive' | 'negative' = isPositive ? 'positive' : 'negative';

    const event: CompetitionEvent = {
      eventId: `demo_ev_${student.studentId}_w${week}_${eventIndex}_${(targetCriterion.code || targetCriterion.criterionId).slice(-6)}`,
      teacherId,
      classId,
      studentId: student.studentId,
      studentName: student.fullName,
      teamId: student.teamId,
      criterionId: targetCriterion.criterionId,
      criterionName: targetCriterion.name,
      week,
      weekNumber: week,
      date: dateString,
      score: scoreVal,
      points: scoreVal,
      type: eventType,
      title: customNote || (isPositive ? `Điểm cộng: ${targetCriterion.name}` : `Điểm trừ: ${targetCriterion.name}`),
      description: customNote || targetCriterion.description,
      note: customNote || targetCriterion.description,
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
        // NHÓM A — TIẾN BỘ RÕ RỆT
        if (w <= 2) {
          evCount++;
          addEvent(student, w, cChuanBi, true, dates.mon, 'Chuẩn bị bài đầy đủ', evCount);
          if (w === 1) {
            evCount++;
            addEvent(student, w, cDiTre, false, dates.wed, 'Đi trễ giờ truy bài', evCount);
          }
        } else if (w <= 4) {
          evCount++;
          addEvent(student, w, cPhatBieu, true, dates.mon, 'Hăng hái phát biểu xây dựng bài', evCount);
          evCount++;
          addEvent(student, w, cLamNhom, true, dates.wed, 'Làm việc nhóm tích cực', evCount);
        } else if (w <= 6) {
          evCount++;
          addEvent(student, w, cPhatBieu, true, dates.mon, 'Phát biểu xây dựng bài đóng góp ý kiến hay', evCount);
          evCount++;
          addEvent(student, w, cNhiemVu, true, dates.wed, 'Hoàn thành nhiệm vụ học tập xuất sắc', evCount);
          evCount++;
          addEvent(student, w, cDoanKet, true, dates.fri, 'Đoàn kết, nhiệt tình giúp đỡ bạn bè', evCount);
        } else {
          evCount++;
          addEvent(student, w, cPhatBieu, true, dates.mon, 'Tích cực phát biểu xây dựng bài', evCount);
          evCount++;
          addEvent(student, w, cLaoDong, true, dates.wed, 'Tham gia lao động đầy đủ, trực nhật tốt', evCount);
          evCount++;
          addEvent(student, w, cDoanKet, true, dates.fri, 'Gương mẫu giúp đỡ bạn cùng tiến trong tổ', evCount);
        }
      } else if (decliningIndices.has(sIdx)) {
        // NHÓM B — GIẢM DẦN
        if (w <= 2) {
          evCount++;
          addEvent(student, w, cChuanBi, true, dates.mon, 'Chuẩn bị bài đầy đủ', evCount);
          evCount++;
          addEvent(student, w, cNhiemVu, true, dates.wed, 'Hoàn thành nhiệm vụ tổ', evCount);
        } else if (w <= 4) {
          evCount++;
          addEvent(student, w, cDiTre, false, dates.mon, 'Đi trễ giờ truy bài', evCount);
          evCount++;
          addEvent(student, w, cChuanBi, false, dates.wed, 'Chưa chuẩn bị bài tập đầy đủ', evCount);
        } else if (w <= 6) {
          evCount++;
          addEvent(student, w, cDiTre, false, dates.mon, 'Đi trễ giờ truy bài lần 2', evCount);
          evCount++;
          addEvent(student, w, cTratTu, false, dates.wed, 'Mất trật tự trong giờ học', evCount);
          evCount++;
          addEvent(student, w, cDongPhuc, false, dates.fri, 'Vi phạm quy định tác phong đồng phục', evCount);
        } else {
          evCount++;
          addEvent(student, w, cVaoLopSau, false, dates.mon, 'Vào lớp sau Giáo viên', evCount);
          evCount++;
          addEvent(student, w, cNhiemVu, false, dates.wed, 'Chưa hoàn thành nhiệm vụ được giao', evCount);
          evCount++;
          addEvent(student, w, cTratTu, false, dates.fri, 'Nói chuyện riêng gây mất trật tự tiết học', evCount);
        }
      } else if (highStableIndices.has(sIdx)) {
        // NHÓM C — ỔN ĐỊNH XUẤT SẮC
        evCount++;
        addEvent(student, w, cChuanBi, true, dates.mon, 'Chuẩn bị bài vở chu đáo', evCount);
        evCount++;
        addEvent(student, w, cNhiemVu, true, dates.wed, 'Hoàn thành nhiệm vụ học tập tốt', evCount);
        if ((w + sIdx) % 2 === 0) {
          evCount++;
          addEvent(student, w, cPhatBieu, true, dates.fri, 'Tự tin phát biểu xây dựng bài', evCount);
        }
        if (w % 3 === 0) {
          evCount++;
          addEvent(student, w, cLaoDong, true, dates.fri, 'Tham gia lao động trực nhật lớp sạch sẽ', evCount);
        }
      } else if (fluctuatingIndices.has(sIdx)) {
        // NHÓM D — BIẾN ĐỘNG
        const isUpWeek = (w % 2 === 1);
        if (isUpWeek) {
          evCount++;
          addEvent(student, w, cChuanBi, true, dates.mon, 'Chuẩn bị bài tốt', evCount);
          evCount++;
          addEvent(student, w, cPhatBieu, true, dates.wed, 'Phát biểu xây dựng bài sôi nổi', evCount);
          evCount++;
          addEvent(student, w, cLamNhom, true, dates.fri, 'Làm việc nhóm tích cực', evCount);
        } else {
          evCount++;
          addEvent(student, w, cDiTre, false, dates.mon, 'Đi trễ giờ truy bài', evCount);
          evCount++;
          addEvent(student, w, cChuanBi, false, dates.wed, 'Quên chưa chuẩn bị bài', evCount);
          evCount++;
          addEvent(student, w, cTratTu, false, dates.fri, 'Chưa giữ trật tự trong giờ học', evCount);
        }
      } else if (concernIndices.has(sIdx)) {
        // NHÓM E — CẦN QUAN TÂM
        evCount++;
        addEvent(student, w, cDiTre, false, dates.mon, 'Đi trễ giờ truy bài', evCount);
        evCount++;
        addEvent(student, w, cDongPhuc, false, dates.wed, 'Vi phạm đồng phục tác phong', evCount);
        evCount++;
        addEvent(student, w, cChuanBi, false, dates.fri, 'Chưa chuẩn bị bài đầy đủ', evCount);
        if (w % 2 === 0) {
          evCount++;
          addEvent(student, w, cTratTu, false, dates.fri, 'Mất trật tự trong giờ học', evCount);
        }
        if (w >= 6 && sIdx % 2 === 0) {
          evCount++;
          addEvent(student, w, cNhiemVu, true, dates.mon, 'Có nỗ lực hoàn thành nhiệm vụ tổ', evCount);
        }
      } else {
        // Học sinh ổn định tự nhiên
        evCount++;
        addEvent(student, w, cChuanBi, true, dates.mon, 'Chuẩn bị bài đầy đủ', evCount);
        if ((w + sIdx) % 3 === 0) {
          evCount++;
          addEvent(student, w, cPhatBieu, true, dates.wed, 'Phát biểu xây dựng bài', evCount);
        }
        if ((w + sIdx) % 5 === 0) {
          evCount++;
          addEvent(student, w, cDongPhuc, false, dates.fri, 'Nhắc nhở tác phong đồng phục', evCount);
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
 * Generates single 12A1 demo package (45 students, 4 teams, 14 criteria replicated from real class).
 */
export function generateSingleDemoClassPackage(
  teacherId: string,
  teacherNameInput?: string,
  customCriteriaList?: Criterion[]
): GeneratedDemoPackage {
  const teacherName = teacherNameInput || 'Thầy Phong Qui';
  return generateClassDemoData(teacherId, '12A1', teacherName, customCriteriaList);
}

/**
 * Generates demo package for teacher (1 demo class only).
 */
export function generateTwoClassesDemoData(
  teacherId: string,
  teacherNameInput?: string,
  customCriteriaList?: Criterion[]
): [GeneratedDemoPackage, GeneratedDemoPackage] {
  const pkg = generateSingleDemoClassPackage(teacherId, teacherNameInput, customCriteriaList);
  return [pkg, pkg];
}

/**
 * Backward-compatible helper for single class seeding.
 */
export function generateDemoData(
  teacherId: string,
  customTeacherName?: string,
  customClassName?: string
) {
  return generateSingleDemoClassPackage(teacherId, customTeacherName);
}

/**
 * Automated Data Integrity Check for 1 Demo Class (45 students, 4 teams, 14 criteria)
 */
export function verifyDemoDataIntegrity(
  pkg1: GeneratedDemoPackage,
  pkg2?: GeneratedDemoPackage
): { isHealthy: boolean; errors: string[]; summary: string } {
  const errors: string[] = [];

  // Check 1: exactly 45 students in 12A1
  if (pkg1.students.length !== 45) {
    errors.push(`Lớp demo 12A1 có ${pkg1.students.length} học sinh (yêu cầu đúng 45 học sinh).`);
  }

  // Check 2: Exactly 4 teams
  if (pkg1.teams.length !== 4) {
    errors.push(`Lớp demo có ${pkg1.teams.length} tổ (yêu cầu đúng 4 tổ: Tổ 1 đến Tổ 4).`);
  }

  // Check 3: Check student distribution across 4 teams (11, 11, 11, 12)
  pkg1.teams.forEach(t => {
    const memberCount = pkg1.students.filter(s => s.teamId === t.teamId).length;
    if (memberCount < 11 || memberCount > 12) {
      errors.push(`Tổ ${t.teamName} có ${memberCount} học sinh (yêu cầu phân bổ đều 11-12 học sinh).`);
    }
  });

  // Check 4: Exactly 14 criteria
  if (pkg1.criteria.length !== 14) {
    errors.push(`Lớp demo có ${pkg1.criteria.length} tiêu chí (yêu cầu 14 tiêu chí sao chép từ lớp thật).`);
  }

  // Check 5: No duplicate studentCode
  const codeSet = new Set<string>();
  pkg1.students.forEach(s => {
    if (!s.studentCode) {
      errors.push(`Học sinh ${s.fullName} thiếu studentCode.`);
    } else if (codeSet.has(s.studentCode)) {
      errors.push(`Trùng lặp mã học sinh: ${s.studentCode}.`);
    } else {
      codeSet.add(s.studentCode);
    }
  });

  // Check 6: No duplicate names
  const nameSet = new Set<string>();
  pkg1.students.forEach(s => {
    if (nameSet.has(s.fullName)) {
      errors.push(`Trùng lặp họ tên học sinh: ${s.fullName}.`);
    } else {
      nameSet.add(s.fullName);
    }
  });

  // Check 7: No events pointing to non-existent students
  const studentIdSet = new Set(pkg1.students.map(s => s.studentId));
  pkg1.events.forEach(e => {
    if (!studentIdSet.has(e.studentId)) {
      errors.push(`Sự kiện ${e.eventId} trỏ tới studentId không tồn tại: ${e.studentId}.`);
    }
  });

  // Check 8: No NaN or Infinity scores
  pkg1.weeklyScores.forEach(ws => {
    if (isNaN(ws.finalScore) || !isFinite(ws.finalScore)) {
      errors.push(`Điểm bất thường cho ${ws.scoreId}: finalScore=${ws.finalScore}.`);
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

  checkDemoFlag([pkg1.classInfo], 'classes');
  checkDemoFlag(pkg1.students, 'students');
  checkDemoFlag(pkg1.teams, 'teams');
  checkDemoFlag(pkg1.criteria, 'criteria');
  checkDemoFlag(pkg1.weeklyScores, 'weeklyScores');
  checkDemoFlag(pkg1.events, 'events');
  checkDemoFlag(pkg1.snapshots, 'snapshots');

  return {
    isHealthy: errors.length === 0,
    errors,
    summary: errors.length === 0 
      ? `Toàn vẹn 100%: 1 lớp mẫu (12A1), 45 học sinh, 4 tổ thi đua, 14 tiêu chí sao chép từ lớp thật, 8 tuần dữ liệu, ${pkg1.weeklyScores.length} bản ghi điểm, ${pkg1.events.length} sự kiện và 8 snapshot!`
      : `Phát hiện ${errors.length} vấn đề toàn vẹn dữ liệu: ${errors[0]}`,
  };
}
