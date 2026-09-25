export type AppLoginRole = 
  | 'gvcn' 
  | 'lop_truong'
  | 'lop_pho_hoc_tap'
  | 'lop_pho_lao_dong'
  | 'lop_pho_trat_tu'
  | 'bi_thu'
  | 'pho_bi_thu'
  | 'to_truong_to_1' 
  | 'to_truong_to_2' 
  | 'to_truong_to_3' 
  | 'to_truong_to_4' 
  | 'to_truong_to_5' 
  | 'thanh_vien';

export interface RoleSessionInfo {
  role: AppLoginRole;
  userRole: 'teacher' | 'team_leader' | 'student' | 'cadre';
  title: string;
  badge: string;
  category: 'gvcn' | 'to_truong' | 'cadre' | 'thanh_vien';
  teamName?: string;
  teamId?: string;
  studentId?: string;
  studentName?: string;
  displayName?: string;
  roleLabel?: string;
  cadreRole?: ClassCadreRole;
  canGrade: boolean;
  canManageClass: boolean;
}

export interface WeeklyCadreReviewTeamItem {
  teamName: string;
  authorName: string;
  authorStudentId?: string;
  content: string; // Đánh giá chung của tổ
  positiveMembers: string; // Thành viên tích cực, tuyên dương
  warningMembers: string; // Thành viên cần nhắc nhở, khắc phục
  rating?: 'tot' | 'kha' | 'trung_binh';
  updatedAt?: string;
}

export interface WeeklyCadreReview {
  reviewId: string; // e.g. "wcr_classId_w8"
  classId: string;
  weekNumber: number;
  schoolYearId?: string;
  
  // 1. Đánh giá chung của Lớp trưởng / Ban cán sự
  generalAssessment: string;
  generalAuthorName?: string;
  
  // 2. Học tập (Lớp phó học tập)
  academicAssessment: string;
  academicAuthorName?: string;
  homeworkStatus?: string;
  
  // 3. Kỷ luật & Trật tự (Lớp phó trật tự / nề nếp)
  disciplineAssessment: string;
  disciplineAuthorName?: string;
  attendanceDisciplineStatus?: string;
  
  // 4. Lao động & Vệ sinh (Lớp phó lao động)
  hygieneAssessment: string;
  hygieneAuthorName?: string;
  sanitationStatus?: string;
  
  // 5. Phong trào Đoàn Đội (Bí thư)
  movementAssessment: string;
  movementAuthorName?: string;
  
  // 6. Nhận xét của từng Tổ trưởng
  teamAssessments: Record<string, WeeklyCadreReviewTeamItem>;
  
  // 7. Phương hướng rèn luyện tuần tới
  nextWeekGoals: string;
  
  // 8. Ý kiến chỉ đạo / duyệt của Giáo viên chủ nhiệm
  teacherFeedback?: string;
  teacherFeedbackAuthor?: string;
  
  status: 'draft' | 'submitted' | 'approved';
  updatedBy: string;
  updatedByRole: string;
  updatedAt: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string;
  role: 'teacher' | 'team_leader' | 'student' | 'leader';
  appRole?: AppLoginRole;
  activeTeam?: string;
  teamId?: string;
  teamName?: string;
  classId?: string;
  teacherId?: string;
  schoolYearId?: string;
  activeStudentId?: string;
  createdAt: string;
}

export interface SchoolYear {
  id: string; // e.g., "sy_2026_2027"
  teacherId: string;
  name: string; // "2026–2027"
  startDate: string; // "2026-09-05"
  endDate: string; // "2027-05-31"
  currentWeek: number; // e.g. 8
  isCurrent: boolean;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface ClassInfo {
  classId: string;
  id?: string;
  teacherId: string;
  teacherName?: string;
  schoolName?: string;
  className: string;
  grade: string;
  schoolYear: string;
  schoolYearId?: string;
  currentWeek: number;
  totalWeeks?: number;
  startingScore: number;
  studentCount?: number;
  createdAt: string;
  status?: 'active' | 'archived';
  isDemo?: boolean;
  gvcnPasscode?: string; // Pass code bảo mật riêng của GVCN (mặc định: 1234)
  cadrePasscodes?: Record<string, string>; // Pass code phân quyền Ban cán sự lớp
  teamLeaderPasscodes?: Record<string, string>; // e.g. { 'Tổ 1': '1234', 'Tổ 2': '1234' }
}

export interface Team {
  teamId: string;
  classId: string;
  teacherId: string;
  teamName: string; // "Tổ 1", "Tổ 2", etc.
  teamNumber?: number;
  leaderName?: string;
  leaderStudentId?: string;
  passcode?: string; // Pass code do GVCN tạo khi phân quyền tổ trưởng (VD: 1234)
  color?: string;
  createdAt?: string;
  isDemo?: boolean;
}

export type ClassCadreRole = 
  | 'none' 
  | 'lop_truong' 
  | 'lop_pho_hoc_tap' 
  | 'lop_pho_lao_dong' 
  | 'lop_pho_trat_tu' 
  | 'bi_thu' 
  | 'pho_bi_thu';

export type TeamRole = 
  | 'thanh_vien' 
  | 'to_truong' 
  | 'to_pho';

export interface StudentAccount {
  accountId: string;
  studentId: string;
  classId: string;
  studentNumber: number;
  fullName: string;
  teamName: string;
  username: string; // Tên đăng nhập ví dụ: 11a9_01, hs01, lt_nam, tt1_phat
  password: string; // Mật khẩu đăng nhập ví dụ: 123456
  role: 'thanh_vien' | 'to_truong' | 'to_pho' | 'lop_truong' | 'lop_pho' | 'bi_thu';
  cadreRole?: ClassCadreRole;
  canGrade: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export type StudentStatus = 'active' | 'inactive' | 'transferred' | 'graduated';

export interface Student {
  studentId: string;
  studentCode?: string; // e.g. "12A1-001"
  classId: string;
  teacherId: string;
  studentNumber: number; // STT
  fullName: string;
  teamId: string; // Team reference
  teamName: string;
  gender?: 'male' | 'female' | 'other';
  birthDate?: string;
  parentPhone?: string;
  parentName?: string;
  notes?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
  cadreRole?: ClassCadreRole;
  teamRole?: TeamRole;
  isTeamLeader?: boolean;
  teamLeaderPasscode?: string; // Pass code riêng của tổ trưởng
  accountUsername?: string;
  accountPassword?: string;
  isAccountActive?: boolean;
  status?: StudentStatus;
  isDemo?: boolean;
}

export interface Criterion {
  criterionId: string;
  teacherId: string;
  classId: string;
  code: string;
  name: string;
  description: string;
  positiveScore: number; // e.g. +1, +2
  negativeScore: number; // e.g. -1, -2, -3
  category: 'attendance' | 'study' | 'behavior' | 'hygiene' | 'responsibility' | 'activity';
  active: boolean;
  order: number;
  createdAt?: string;
  type?: 'positive' | 'negative';
  defaultPoints?: number;
  defaultScore?: number;
  isDemo?: boolean;
}

export interface CompetitionEvent {
  eventId: string;
  teacherId: string;
  classId: string;
  studentId: string;
  studentName?: string;
  teamId?: string;
  teamName?: string;
  studentTeamName?: string;
  criterionId: string;
  criterionName: string;
  week: number;
  weekNumber?: number;
  date: string; // YYYY-MM-DD
  score: number; // positive or negative, e.g. +1 or -2
  points?: number;
  type?: 'positive' | 'negative';
  title?: string;
  description?: string;
  note?: string;
  schoolYearId?: string;
  createdAt: string;
  evaluatorId?: string;
  evaluatorName?: string;
  evaluatorRole?: string;
  source?: 'manual' | 'ai_suggested' | 'imported';
  approvedByTeacher?: string;
  approvedAt?: string;
  isDemo?: boolean;
}

export interface WeeklyScore {
  scoreId: string;
  teacherId: string;
  classId: string;
  studentId: string;
  week: number;
  weekNumber?: number;
  schoolYearId?: string;
  startingScore: number;
  totalPositive: number;
  totalNegative: number;
  finalScore: number;
  rankCategory: RankCategory;
  stars: number;
  rankNumber?: number;
  updatedAt: string;
  isDemo?: boolean;
}

export type RankCategory = 'XUẤT SẮC' | 'TỐT' | 'HOÀN THÀNH TỐT' | 'CẦN CỐ GẮNG' | 'CẦN HỖ TRỢ';

export interface ScoreThresholds {
  excellent: number;   // >= 120 (5 sao)
  good: number;        // 110 - 119 (4 sao)
  wellDone: number;    // 100 - 109 (3 sao)
  needEffort: number;  // 90 - 99 (2 sao)
  // < 90 is needSupport (1 sao / cảnh báo)
}

export interface StudentWithScore extends Student {
  currentWeekScore: number;
  totalPositive: number;
  totalNegative: number;
  rankCategory: RankCategory;
  stars: number;
  rankNumber?: number;
  monthlyScore: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  eventCount: number;
}

export interface TeamScoreSummary {
  teamId: string;
  teamName: string;
  studentCount: number;
  totalScore: number;
  avgScore: number;
  totalPositive: number;
  totalNegative: number;
  rank: number;
  color?: string;
  topStudent?: { fullName: string; score: number };
}

export type ReportType = 'weekly' | 'monthly' | 'semester' | 'year';
export type ReportStatus = 'draft' | 'reviewed' | 'final';

export interface ReportStatistics {
  totalStudents: number;
  avgScore: number;
  attendanceRate?: number;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
  improvedCount?: number;
  declinedCount?: number;
  topStudents?: Array<{ studentId: string; fullName: string; score: number; rankCategory?: string }>;
  improvedStudents?: Array<{ studentId: string; fullName: string; previousScore: number; currentScore: number; delta: number }>;
  needAttentionStudents?: Array<{ studentId: string; fullName: string; currentScore: number; reason: string }>;
  leadingTeam?: string;
  teamRankings?: Array<{ teamId: string; teamName: string; avgScore: number; totalScore: number; rank: number }>;
  topCriteria?: Array<{ name: string; count: number; score: number }>;
  weakCriteria?: Array<{ name: string; count: number; score: number }>;
  totalPositiveEvents?: number;
  totalNegativeEvents?: number;
  periodLabel?: string;
  [key: string]: any;
}

export interface SavedReport {
  reportId: string;
  teacherId: string;
  classId: string;
  type: ReportType;
  period: string; // e.g. "Tuần 12", "Tháng 10", "Học kỳ 1", "Năm học 2026-2027"
  title: string;
  content: string;
  teacherNotes?: string;
  statistics: ReportStatistics;
  createdAt: string;
  updatedAt: string;
  createdByAI: boolean;
  status: ReportStatus;
}

export interface MessageTemplate {
  templateId: string;
  teacherId: string;
  title: string;
  category: 'khen' | 'dong_vien' | 'nhac_nho' | 'phoi_hop' | 'thong_bao';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchStudentCommentItem {
  studentId: string;
  studentName: string;
  studentNumber: number;
  teamName: string;
  currentScore: number;
  rankCategory: string;
  positiveHighlights: string[];
  negativeHighlights: string[];
  suggestedComment: string;
  editedComment: string;
  status: 'pending' | 'generated' | 'approved' | 'modified';
}

export interface ReportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AiReviewSuggestion {
  type: 'contradiction' | 'negative_tone' | 'unsupported_claim' | 'repetition' | 'style';
  originalText?: string;
  issue: string;
  recommendation: string;
}

export interface AiReviewResult {
  hasIssues: boolean;
  score: number;
  suggestions: AiReviewSuggestion[];
  overallAssessment: string;
}

export interface ClassReport {
  reportId: string;
  classId: string;
  teacherId: string;
  week: number;
  title: string;
  content: string;
  summaryData: {
    totalStudents: number;
    avgScore: number;
    attendanceRate: number;
    topStudents: string[];
    improvedStudents: string[];
    needAttentionStudents: string[];
  };
  createdAt: string;
}

export interface SavedComment {
  commentId: string;
  studentId: string;
  classId: string;
  teacherId: string;
  type: string;
  week: number;
  content: string;
  createdAt: string;
}

export interface TeacherNote {
  noteId: string;
  studentId: string;
  teacherId: string;
  date: string;
  note: string;
  createdAt: string;
  studentName?: string;
  week?: number;
}

export interface AiLog {
  logId?: string;
  teacherId: string;
  classId: string;
  action: string;
  createdAt: string;
}

export interface StudentAnalysisResult {
  summary: string;
  strengths: string[];
  areasToImprove: string[];
  trend: {
    direction: 'up' | 'down' | 'stable' | 'mixed';
    description: string;
  };
  positiveObservations: string[];
  concerns: string[];
  suggestions: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface AttentionStudentFinding {
  severity: 'high' | 'medium' | 'low';
  studentId: string;
  studentName: string;
  reason: string;
  evidence: string[];
  suggestion: string;
  currentScore?: number;
}

export interface ImprovedStudentFinding {
  studentId: string;
  studentName: string;
  previousScore: number;
  currentScore: number;
  delta: number;
  evidence: string[];
  positiveObservations: string[];
}

export interface ClassAnalysisResult {
  summary: string;
  classAverage: number;
  improvements: string[];
  concerns: string[];
  topCriteria: Array<{ name: string; count: number; score: number }>;
  weakCriteria: Array<{ name: string; count: number; score: number }>;
  teamInsights: Array<{ teamName: string; status: string; note: string }>;
  recommendations: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface AiInsightItem {
  id: string;
  type: 'attendance' | 'study' | 'behavior' | 'team' | 'individual' | 'general';
  severity: 'info' | 'positive' | 'warning' | 'critical';
  title: string;
  description: string;
  studentId?: string | null;
  teamId?: string | null;
  evidence: string[];
  action: string;
  suggestedAction?: string;
  suggestedGoal?: string;
  goal?: string;
}

export type StudentCommentTone = 'praise' | 'positive' | 'encouragement' | 'improvement' | 'reminder';
export type StudentCommentType = 'weekly' | 'monthly' | 'semester' | 'yearly' | 'praise' | 'encouragement' | 'reminder' | 'Nhận xét tuần' | string;
export type ParentMessagePurpose = 'praise' | 'progress' | 'reminder' | 'concern' | 'weeklyUpdate';

// --- Prompt 5: Academic Time & Week Locking ---
export type WeekStatus = 'active' | 'locked' | 'draft';

export interface AcademicWeek {
  weekNumber: number;
  semester: 1 | 2;
  month: number;
  startDate: string;
  endDate: string;
  status: WeekStatus;
  lockedAt?: string;
  lockedBy?: string;
  snapshotCreated?: boolean;
}

export interface WeeklySnapshot {
  snapshotId: string;
  classId: string;
  weekNumber: number;
  schoolYearId?: string;
  lockedAt: string;
  lockedBy: string;
  totalStudents?: number;
  averageScore?: number;
  highestScore?: number;
  lowestScore?: number;
  ranking?: any;
  createdAt?: string;
  isDemo?: boolean;
  studentsScores: Array<{
    studentId: string;
    fullName: string;
    teamName: string;
    startingScore: number;
    totalPositive: number;
    totalNegative: number;
    finalScore: number;
    rankCategory: RankCategory;
    rankNumber?: number;
  }>;
  teamRankings: Array<{
    teamId: string;
    teamName: string;
    avgScore: number;
    rank: number;
  }>;
  statsSummary: {
    avgScore: number;
    totalEvents: number;
    excellentCount?: number;
    needSupportCount?: number;
  };
}

// --- Prompt 5: Student Transfer & Status ---
export interface StudentTransferRecord {
  transferId: string;
  studentId: string;
  studentName: string;
  fromClassId: string;
  fromClassName: string;
  toClassId: string;
  toClassName: string;
  date: string;
  reason: string;
  transferredBy: string;
  createdAt: string;
}

// --- Prompt 5 & Prompt 9: Audit Logs ---
export type AuditLogAction = 
  | 'student_created'
  | 'student_updated'
  | 'student_deleted'
  | 'student_transferred'
  | 'event_created'
  | 'event_deleted'
  | 'week_locked'
  | 'week_unlocked'
  | 'report_created'
  | 'class_created'
  | 'class_updated'
  | 'backup_created'
  | 'data_restored'
  | 'IMPORT'
  | 'CREATE'
  | 'UPDATE'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'SCORE'
  | 'BULK_SCORE'
  | 'UNDO'
  | 'LOCK_WEEK'
  | 'UNLOCK_WEEK'
  | 'GENERATE_REPORT'
  | 'EXPORT'
  | 'AI_ACTION_CONFIRM'
  | 'assign_team_leader'
  | 'revoke_team_leader'
  | 'change_team_leader'
  | 'whole_team_score'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT';

export interface AuditLog {
  logId: string;
  action: AuditLogAction;
  actorId: string;
  actorName: string;
  teacherId?: string;
  entityType?: string;
  entityId?: string;
  performedByName?: string;
  classId: string;
  targetId?: string;
  targetName?: string;
  timestamp: string;
  details?: string;
}

// --- Prompt 5: Excel / CSV Import Preview Item ---
export interface ImportPreviewStudent {
  stt?: number;
  studentCode?: string;
  fullName: string;
  gender?: 'male' | 'female' | 'other';
  birthDate?: string;
  parentPhone?: string;
  parentName?: string;
  teamName: string;
  notes?: string;
  status: 'valid' | 'warning' | 'error' | 'duplicate';
  errorMessage?: string;
  duplicateAction?: 'skip' | 'update' | 'create_new';
  existingStudentId?: string;
}

// --- Prompt 5 & Prompt 9: Backup & Restore Package ---
export interface ClassBackupData {
  version: string;
  backupVersion?: string;
  createdAt?: string;
  exportedAt: string;
  exportedBy: string;
  teacherId?: string;
  schoolYearId?: string;
  classInfo: ClassInfo;
  students: Student[];
  teams: Team[];
  criteria: Criterion[];
  events: CompetitionEvent[];
  weeklyScores: WeeklyScore[];
  reports?: any[];
  snapshots?: WeeklySnapshot[];
  schoolYears?: SchoolYear[];
  settings?: any;
}

// --- Prompt 10: GVCN Thực Chiến Types ---
export type ObservationCategory = 'Tích cực' | 'Cần theo dõi' | 'Sự việc' | 'Tiến bộ' | 'Cần hỗ trợ';
export type ObservationSeverity = 'Bình thường' | 'Cần chú ý' | 'Quan trọng';

export interface StudentObservation {
  observationId: string;
  classId: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  teamName?: string;
  category: ObservationCategory;
  content: string;
  severity: ObservationSeverity;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface QuickScorePreset {
  id: string;
  title: string;
  score: number;
  type: 'positive' | 'negative';
  category: 'attendance' | 'study' | 'behavior' | 'hygiene' | 'responsibility';
  criterionName: string;
  description?: string;
}

export interface AiWeeklyInsight {
  summary: string;
  positiveTrends: string[];
  concernTrends: string[];
  improvingStudents: Array<{ studentId?: string; studentName: string; note: string; evidence?: string }>;
  decliningStudents: Array<{ studentId?: string; studentName: string; note: string; evidence?: string }>;
  classObservations: string[];
  teamObservations: Array<{ teamName: string; observation: string }>;
  suggestedActions: string[];
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'alert';
  read: boolean;
  timestamp: string;
  actionTab?: string;
  link?: string;
}

