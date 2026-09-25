import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useClassData } from '../hooks/useClassData';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  Search, 
  Plus, 
  Upload, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  ArrowUpRight, 
  ArrowDownRight, 
  Check, 
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Award,
  Crown,
  BookOpen,
  Brush,
  Shield,
  Star,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  CheckSquare,
  Square,
  MinusSquare,
  Layers,
  ArrowRight,
  X,
  FileText,
  Copy,
  RefreshCw,
  Lock,
  KeyRound
} from 'lucide-react';
import { Student, StudentWithScore, ClassCadreRole, TeamRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CadreAssignmentModal } from '../components/modals/CadreAssignmentModal';
import { StudentRoleModal } from '../components/modals/StudentRoleModal';
import { ExcelImportModal } from '../components/students/ExcelImportModal';
import { StudentAccountsModal } from '../components/modals/StudentAccountsModal';
import { CADRE_ROLES_META, TEAM_ROLES_META } from '../utils/constants';

interface StudentsPageProps {
  onSelectStudent?: (studentId: string) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({ onSelectStudent }) => {
  const { 
    currentClass, 
    selectedWeek, 
    students,
    studentsWithScores, 
    teams, 
    criteria,
    teamPasscodes,
    createStudent, 
    editStudent, 
    deleteStudentById, 
    batchDeleteStudents,
    batchUpdateStudentsTeam,
    deduplicateStudents,
    batchAddEvents,
    importStudents,
    teacherName
  } = useClassData();
  const { roleSession } = useAuth();
  const isTeacher = roleSession.category === 'gvcn';
  const isTeamLeader = roleSession.category === 'to_truong';
  const isStudent = roleSession.category === 'thanh_vien';
  const canManageClass = roleSession.canManageClass ?? isTeacher;
  const myTeamName = roleSession.teamName || 'Tổ 1';

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [rankFilter, setRankFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [onlyDuplicatesFilter, setOnlyDuplicatesFilter] = useState(false);

  // Selection & Batch actions states
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBatchGradingOpen, setIsBatchGradingOpen] = useState(false);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);
  const [isDedupModalOpen, setIsDedupModalOpen] = useState(false);

  // Batch grading form state
  const [batchCriterionId, setBatchCriterionId] = useState<string>('');
  const [batchCustomScore, setBatchCustomScore] = useState<string>('');
  const [batchNote, setBatchNote] = useState<string>('');
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);

  // Deduplication state
  const [dedupLoading, setDedupLoading] = useState(false);
  const [dedupResult, setDedupResult] = useState<{ removedCount: number; keptCount: number } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCadreModalOpen, setIsCadreModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [roleModalStudent, setRoleModalStudent] = useState<Student | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formTeamName, setFormTeamName] = useState('Tổ 1');
  const [formGender, setFormGender] = useState<'male' | 'female' | 'other'>('male');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCadreRole, setFormCadreRole] = useState<ClassCadreRole>('none');
  const [formTeamRole, setFormTeamRole] = useState<TeamRole>('thanh_vien');

  // Import states (không lưu hay hiển thị tên file nguồn)
  const [importText, setImportText] = useState('');
  const [previewList, setPreviewList] = useState<Array<{ name: string; teamName: string; notes?: string }>>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [skipDuplicatesInImport, setSkipDuplicatesInImport] = useState(true);

  // Quick lookup of current cadre & team leaders
  const currentLopTruong = students.find(s => s.cadreRole === 'lop_truong');
  const currentLpHocTap = students.find(s => s.cadreRole === 'lop_pho_hoc_tap');
  const currentLpLaoDong = students.find(s => s.cadreRole === 'lop_pho_lao_dong');
  const currentLpTratTu = students.find(s => s.cadreRole === 'lop_pho_trat_tu');
  const currentBiThu = students.find(s => s.cadreRole === 'bi_thu');
  const currentPhoBiThu = students.find(s => s.cadreRole === 'pho_bi_thu');

  const leaderTo1 = students.find(s => (s.isTeamLeader || s.teamRole === 'to_truong') && s.teamName === 'Tổ 1');
  const leaderTo2 = students.find(s => (s.isTeamLeader || s.teamRole === 'to_truong') && s.teamName === 'Tổ 2');
  const leaderTo3 = students.find(s => (s.isTeamLeader || s.teamRole === 'to_truong') && s.teamName === 'Tổ 3');
  const leaderTo4 = students.find(s => (s.isTeamLeader || s.teamRole === 'to_truong') && s.teamName === 'Tổ 4');

  // Duplicate students detection
  const duplicateGroups = useMemo(() => {
    const map = new Map<string, StudentWithScore[]>();
    studentsWithScores.forEach((s) => {
      const key = s.fullName.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(s);
    });

    const dups = new Map<string, StudentWithScore[]>();
    map.forEach((list, key) => {
      if (list.length > 1) {
        dups.set(key, list);
      }
    });
    return dups;
  }, [studentsWithScores]);

  const duplicateStudentIds = useMemo(() => {
    const set = new Set<string>();
    duplicateGroups.forEach((list) => {
      list.forEach(s => set.add(s.studentId));
    });
    return set;
  }, [duplicateGroups]);

  const totalDuplicateCount = duplicateStudentIds.size;

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return studentsWithScores.filter((s) => {
      if (isTeamLeader && s.teamName !== myTeamName) return false;
      const matchSearch = !searchQuery || s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || `${s.studentNumber}`.includes(searchQuery);
      const matchTeam = isTeamLeader ? true : (teamFilter === 'all' || s.teamName === teamFilter);
      const matchRank = rankFilter === 'all' || s.rankCategory === rankFilter;
      
      let matchRole = true;
      if (roleFilter === 'cadre') {
        matchRole = !!s.cadreRole && s.cadreRole !== 'none';
      } else if (roleFilter === 'leaders') {
        matchRole = s.isTeamLeader || s.teamRole === 'to_truong';
      } else if (roleFilter === 'members') {
        matchRole = (!s.cadreRole || s.cadreRole === 'none') && (!s.isTeamLeader && s.teamRole !== 'to_truong');
      }

      const matchDuplicate = !onlyDuplicatesFilter || duplicateStudentIds.has(s.studentId);

      return matchSearch && matchTeam && matchRank && matchRole && matchDuplicate;
    });
  }, [studentsWithScores, searchQuery, teamFilter, rankFilter, roleFilter, onlyDuplicatesFilter, duplicateStudentIds, isTeamLeader, myTeamName]);

  // Master Checkbox Logic (Chọn tất cả / Bỏ chọn)
  const masterCheckboxRef = useRef<HTMLInputElement>(null);
  const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.studentId));
  const isSomeSelected = filteredStudents.some(s => selectedStudentIds.includes(s.studentId)) && !isAllSelected;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleToggleSelectAll = () => {
    if (isStudent) return;
    if (isAllSelected) {
      const filteredIdSet = new Set(filteredStudents.map(s => s.studentId));
      setSelectedStudentIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const newSet = new Set(selectedStudentIds);
      filteredStudents.forEach(s => newSet.add(s.studentId));
      setSelectedStudentIds(Array.from(newSet));
    }
  };

  const handleToggleStudent = (studentId: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (isStudent) return;
    if (e) e.stopPropagation();
    setSelectedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleBatchMoveTeam = async (targetTeamName: string) => {
    if (isStudent || isTeamLeader || !canManageClass || selectedStudentIds.length === 0) return;
    await batchUpdateStudentsTeam(selectedStudentIds, targetTeamName);
  };

  const handleConfirmBatchDelete = async () => {
    if (isStudent || isTeamLeader || !canManageClass || selectedStudentIds.length === 0) return;
    await batchDeleteStudents(selectedStudentIds);
    setSelectedStudentIds([]);
    setIsBatchDeleteConfirmOpen(false);
  };

  const handleConfirmBatchGrading = async () => {
    if (isStudent || !roleSession.canGrade || selectedStudentIds.length === 0 || !batchCriterionId) return;
    const evId = roleSession ? roleSession.role : 'teacher';
    const evName = roleSession?.displayName || teacherName || 'Giáo viên chủ nhiệm';
    const evRole = roleSession?.roleLabel || 'Giáo viên chủ nhiệm';

    const customNum = batchCustomScore ? parseFloat(batchCustomScore) : undefined;
    await batchAddEvents(
      selectedStudentIds,
      batchCriterionId,
      customNum,
      batchNote.trim() || undefined,
      {
        evaluatorId: evId,
        evaluatorName: evName,
        evaluatorRole: evRole,
      }
    );

    setBatchSuccessMsg(`Đã chấm điểm thi đua thành công cho ${selectedStudentIds.length} học sinh!`);
    setTimeout(() => {
      setIsBatchGradingOpen(false);
      setBatchSuccessMsg(null);
      setBatchCriterionId('');
      setBatchCustomScore('');
      setBatchNote('');
    }, 1200);
  };

  const handleRunDeduplication = async () => {
    if (isStudent || !canManageClass) return;
    setDedupLoading(true);
    try {
      const res = await deduplicateStudents();
      setDedupResult(res);
      if (res.removedCount > 0) {
        setOnlyDuplicatesFilter(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDedupLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    if (isStudent || !canManageClass) return;
    setFormName('');
    setFormTeamName(teams[0]?.teamName || 'Tổ 1');
    setFormGender('male');
    setFormPhone('');
    setFormNotes('');
    setFormCadreRole('none');
    setFormTeamRole('thanh_vien');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    if (isStudent || !canManageClass) return;
    setEditingStudent(student);
    setFormName(student.fullName);
    setFormTeamName(student.teamName || 'Tổ 1');
    setFormGender(student.gender || 'male');
    setFormPhone(student.parentPhone || '');
    setFormNotes(student.notes || '');
    setFormCadreRole(student.cadreRole || 'none');
    setFormTeamRole(student.teamRole || (student.isTeamLeader ? 'to_truong' : 'thanh_vien'));
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStudent || !canManageClass || !formName.trim()) return;

    const matchedTeam = teams.find(t => t.teamName === formTeamName) || teams[0];
    const isTeamLeader = formTeamRole === 'to_truong';

    if (editingStudent) {
      await editStudent({
        ...editingStudent,
        fullName: formName.trim(),
        teamId: matchedTeam?.teamId || 'team_1',
        teamName: formTeamName,
        gender: formGender,
        parentPhone: formPhone.trim(),
        notes: formNotes.trim(),
        cadreRole: formCadreRole,
        teamRole: formTeamRole,
        isTeamLeader,
      });
      setEditingStudent(null);
    } else {
      await createStudent({
        studentNumber: studentsWithScores.length + 1,
        fullName: formName.trim(),
        teamId: matchedTeam?.teamId || 'team_1',
        teamName: formTeamName,
        gender: formGender,
        parentPhone: formPhone.trim(),
        notes: formNotes.trim(),
        cadreRole: formCadreRole,
        teamRole: formTeamRole,
        isTeamLeader,
      });
      setIsAddModalOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (isStudent || !canManageClass) return;
    if (deletingStudentId) {
      await deleteStudentById(deletingStudentId);
      setDeletingStudentId(null);
    }
  };

  // Parser for Import (không ghi hay yêu cầu tên file nguồn)
  const parseRawImport = (rawText: string) => {
    setImportError(null);
    if (!rawText.trim()) {
      setImportError('Vui lòng dán danh sách hoặc chọn tệp dữ liệu.');
      return;
    }

    const lines = rawText.trim().split('\n');
    const parsed: Array<{ name: string; teamName: string; notes?: string }> = [];

    lines.forEach((line) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 2) {
        let name = '';
        let team = 'Tổ 1';
        let note = '';

        if (parts.length >= 3 && !isNaN(Number(parts[0].trim()))) {
          name = parts[1].trim();
          team = parts[2].trim();
          note = parts[3] ? parts[3].trim() : '';
        } else {
          name = parts[0].trim();
          team = parts[1].trim();
          note = parts[2] ? parts[2].trim() : '';
        }

        if (name && !name.toLowerCase().includes('họ và tên')) {
          parsed.push({ name, teamName: team || 'Tổ 1', notes: note });
        }
      }
    });

    if (parsed.length === 0) {
      setImportError('Không tìm thấy dòng hợp lệ. Định dạng mẫu: STT, Họ và tên, Tổ, Ghi chú');
    } else {
      setPreviewList(parsed);
    }
  };

  const handleParseImport = () => {
    parseRawImport(importText);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        parseRawImport(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (previewList.length === 0) return;
    
    let toImport = previewList;
    if (skipDuplicatesInImport) {
      const existingNames = new Set(students.map(s => s.fullName.trim().toLowerCase()));
      toImport = previewList.filter(item => !existingNames.has(item.name.trim().toLowerCase()));
    }

    if (toImport.length === 0) {
      setImportError('Tất cả học sinh trong danh sách đã có trong lớp (trùng lặp). Hãy bỏ chọn lọc trùng nếu vẫn muốn thêm.');
      return;
    }

    await importStudents(toImport);
    setPreviewList([]);
    setImportText('');
    setIsImportModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            QUẢN LÝ HỌC SINH • {currentClass?.className}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Sĩ số {studentsWithScores.length} học sinh. Quản lý phân quyền Ban cán sự và các Tổ trưởng chấm thi đua.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isTeamLeader ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shadow-xs">
              <span>🎖️ CHẾ ĐỘ TỔ TRƯỞNG: {myTeamName}</span>
            </div>
          ) : isStudent ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs">
              <Eye className="w-4 h-4 text-slate-500" />
              <span>CHẾ ĐỘ HỌC SINH (CHỈ XEM DANH SÁCH & HỒ SƠ)</span>
            </div>
          ) : (
            <>
              {/* Nút Cấp tài khoản & Quản lý Tên đăng nhập */}
              <button
                id="btn-open-student-accounts"
                onClick={() => setIsAccountsModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300/80 text-amber-900 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="Cấp tài khoản đăng nhập, sửa username theo chức vụ thực tế, phân quyền"
              >
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Cấp tài khoản & Tên đăng nhập</span>
              </button>

              {/* Nút Phân quyền Ban Cán sự */}
              <button
                id="btn-open-cadre-modal"
                onClick={() => setIsCadreModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Phân quyền Ban cán sự & Tổ trưởng</span>
              </button>

              <button
                id="btn-open-import"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Excel/CSV</span>
              </button>

              <button
                id="btn-open-add-student"
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm học sinh</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* BAN CÁN SỰ & TỔ TRƯỞNG OVERVIEW BANNER */}
      {isTeamLeader ? (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs text-lg">
              🎖️
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-amber-950 uppercase tracking-tight">
                Danh sách thành viên {myTeamName} ({filteredStudents.length} học sinh)
              </h2>
              <p className="text-xs text-amber-900/90 mt-0.5">
                Bạn có quyền chấm thi đua và ghi nhận sự việc đối với thành viên thuộc {myTeamName}. Chức năng sửa/xóa thành viên do GVCN quản lý.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                Ban Cán Sự Lớp & Tổ Trưởng Phụ Trách Chấm Thi Đua
              </h2>
              <p className="text-[11px] text-slate-500">
                Chỉ học sinh được phân quyền Tổ trưởng mới được chấm thi đua cho học sinh cùng thuộc tổ của mình.
              </p>
            </div>
          </div>

          {isTeacher && (
            <button
              onClick={() => setIsCadreModalOpen(true)}
              className="self-start sm:self-auto text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa phân quyền</span>
            </button>
          )}
        </div>

        {/* 2 Blocks: Ban cán sự lớp & Tổ trưởng */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Block 1: Ban cán sự lớp (6 vị trí) */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Ban Cán Sự Lớp (6 vị trí)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-indigo-700 block">👑 Lớp trưởng:</span>
                <span className="text-xs font-bold text-slate-900 truncate block">
                  {currentLopTruong ? currentLopTruong.fullName : <em className="text-slate-400 font-normal">Chưa phân công</em>}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-blue-700 block">📚 LP Học tập:</span>
                <span className="text-xs font-bold text-slate-900 truncate block">
                  {currentLpHocTap ? currentLpHocTap.fullName : <em className="text-slate-400 font-normal">Chưa phân công</em>}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-amber-700 block">🧹 LP Lao động:</span>
                <span className="text-xs font-bold text-slate-900 truncate block">
                  {currentLpLaoDong ? currentLpLaoDong.fullName : <em className="text-slate-400 font-normal">Chưa phân công</em>}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-rose-700 block">🛡️ LP Trật tự:</span>
                <span className="text-xs font-bold text-slate-900 truncate block">
                  {currentLpTratTu ? currentLpTratTu.fullName : <em className="text-slate-400 font-normal">Chưa phân công</em>}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-red-700 block">⭐ Bí thư:</span>
                <span className="text-xs font-bold text-slate-900 truncate block">
                  {currentBiThu ? currentBiThu.fullName : <em className="text-slate-400 font-normal">Chưa phân công</em>}
                </span>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-pink-700 block">✨ Phó bí thư:</span>
                <span className="text-xs font-bold text-slate-900 truncate block">
                  {currentPhoBiThu ? currentPhoBiThu.fullName : <em className="text-slate-400 font-normal">Chưa phân công</em>}
                </span>
              </div>
            </div>
          </div>

          {/* Block 2: 4 Tổ trưởng (có quyền chấm thi đua) */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tổ Trưởng Các Tổ (Được chấm thi đua)</span>
              </h3>
              <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                Chỉ chấm cùng tổ
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Tổ 1 */}
              <div className="p-2 bg-white rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-700">🎖️ Tổ trưởng Tổ 1:</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded">Quyền chấm Tổ 1</span>
                </div>
                <span className="text-xs font-black text-slate-900 truncate block">
                  {leaderTo1 ? leaderTo1.fullName : <em className="text-rose-400 font-normal">Chưa chỉ định</em>}
                </span>
                {isTeacher ? (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-500 font-medium flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Pass code:</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      {teamPasscodes['Tổ 1'] || '1234'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Chấm nề nếp Tổ 1</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Tổ 2 */}
              <div className="p-2 bg-white rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-700">🎖️ Tổ trưởng Tổ 2:</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded">Quyền chấm Tổ 2</span>
                </div>
                <span className="text-xs font-black text-slate-900 truncate block">
                  {leaderTo2 ? leaderTo2.fullName : <em className="text-rose-400 font-normal">Chưa chỉ định</em>}
                </span>
                {isTeacher ? (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-500 font-medium flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Pass code:</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      {teamPasscodes['Tổ 2'] || '1234'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Chấm nề nếp Tổ 2</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Tổ 3 */}
              <div className="p-2 bg-white rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-700">🎖️ Tổ trưởng Tổ 3:</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded">Quyền chấm Tổ 3</span>
                </div>
                <span className="text-xs font-black text-slate-900 truncate block">
                  {leaderTo3 ? leaderTo3.fullName : <em className="text-rose-400 font-normal">Chưa chỉ định</em>}
                </span>
                {isTeacher ? (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-500 font-medium flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Pass code:</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      {teamPasscodes['Tổ 3'] || '1234'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Chấm nề nếp Tổ 3</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Tổ 4 */}
              <div className="p-2 bg-white rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-rose-700">🎖️ Tổ trưởng Tổ 4:</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded">Quyền chấm Tổ 4</span>
                </div>
                <span className="text-xs font-black text-slate-900 truncate block">
                  {leaderTo4 ? leaderTo4.fullName : <em className="text-rose-400 font-normal">Chưa chỉ định</em>}
                </span>
                {isTeacher ? (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-500 font-medium flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Pass code:</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      {teamPasscodes['Tổ 4'] || '1234'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Chấm nề nếp Tổ 4</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh, STT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút lọc học sinh trùng lặp nếu có (chỉ GVCN) */}
          {isTeacher && totalDuplicateCount > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setOnlyDuplicatesFilter(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  onlyDuplicatesFilter 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
                }`}
                title="Lọc chỉ hiển thị các học sinh bị trùng lặp trong danh sách"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{onlyDuplicatesFilter ? 'Đang lọc trùng lặp' : 'Lọc trùng lặp'} ({totalDuplicateCount})</span>
              </button>

              <button
                onClick={() => setIsDedupModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-colors cursor-pointer"
                title="Xem danh sách trùng lặp và tự động gỡ bỏ bản ghi thừa"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                <span>Xử lý trùng lặp</span>
              </button>
            </div>
          )}

          {/* Filter Chức vụ / Phân quyền (chỉ GVCN) */}
          {!isTeamLeader && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Chức vụ:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Tất cả chức vụ</option>
                <option value="cadre">👑 Ban cán sự lớp</option>
                <option value="leaders">🎖️ Các Tổ trưởng (Được chấm điểm)</option>
                <option value="members">👤 Thành viên thường</option>
              </select>
            </div>
          )}

          {/* Filter Tổ */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Tổ:</span>
            {isTeamLeader ? (
              <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 rounded-xl px-2.5 py-1.5 font-bold">
                {myTeamName} (Cố định)
              </span>
            ) : (
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium focus:outline-none"
              >
                <option value="all">Tất cả các tổ</option>
                <option value="Tổ 1">Tổ 1</option>
                <option value="Tổ 2">Tổ 2</option>
                <option value="Tổ 3">Tổ 3</option>
                <option value="Tổ 4">Tổ 4</option>
                <option value="Tổ 5">Tổ 5</option>
              </select>
            )}
          </div>

          {/* Filter Xếp loại */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Xếp loại:</span>
            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium focus:outline-none"
            >
              <option value="all">Tất cả xếp loại</option>
              <option value="XUẤT SẮC">⭐⭐⭐⭐⭐ Xuất sắc</option>
              <option value="TỐT">⭐⭐⭐⭐ Tốt</option>
              <option value="HOÀN THÀNH TỐT">⭐⭐⭐ Hoàn thành tốt</option>
              <option value="CẦN CỐ GẮNG">⭐⭐ Cần cố gắng</option>
              <option value="CẦN HỖ TRỢ">⚠️ Cần hỗ trợ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Thông báo chế độ lọc trùng lặp đang bật */}
      {onlyDuplicatesFilter && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Đang hiển thị <strong>{filteredStudents.length} học sinh bị trùng lặp tên</strong> trong danh sách. Bạn có thể bấm <strong>"Xử lý trùng lặp"</strong> để tự động gỡ các bản ghi thừa.
            </span>
          </div>
          <button
            onClick={() => setOnlyDuplicatesFilter(false)}
            className="font-bold underline text-amber-800 hover:text-amber-950 cursor-pointer shrink-0"
          >
            Bỏ lọc trùng lặp
          </button>
        </div>
      )}

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
              {/* Ô chọn 1 lần hết tất cả học sinh - chỉ GVCN / cán sự */}
              {!isStudent && (
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    ref={masterCheckboxRef}
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    title={isAllSelected ? "Bỏ chọn tất cả học sinh" : "Chọn 1 lần hết tất cả học sinh"}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="py-3 px-3 w-12 text-center">STT</th>
              <th className="py-3 px-4">Họ và tên</th>
              <th className="py-3 px-4">Tổ</th>
              <th className="py-3 px-4">Chức vụ & Quyền hạn</th>
              <th className="py-3 px-4 text-center">Điểm tuần {selectedWeek}</th>
              <th className="py-3 px-4 text-center">Điểm tháng</th>
              <th className="py-3 px-4">Xếp loại</th>
              <th className="py-3 px-4 text-center">Xu hướng</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((std) => {
                const isLeader = std.isTeamLeader || std.teamRole === 'to_truong';
                const cadreMeta = std.cadreRole && std.cadreRole !== 'none' ? CADRE_ROLES_META[std.cadreRole] : null;
                const isSelected = selectedStudentIds.includes(std.studentId);
                const isDuplicate = duplicateStudentIds.has(std.studentId);

                return (
                  <tr
                    key={std.studentId}
                    className={`transition-colors group cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50/70 hover:bg-indigo-100/60' 
                        : isDuplicate 
                        ? 'bg-amber-50/40 hover:bg-amber-50/80' 
                        : 'hover:bg-slate-50/80'
                    }`}
                    onClick={() => onSelectStudent(std.studentId)}
                  >
                    {/* Ô chọn lần lượt từng học sinh - chỉ GVCN / cán sự */}
                    {!isStudent && (
                      <td 
                        className="py-3 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStudent(std.studentId)}
                          title={`Chọn em ${std.fullName}`}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    )}

                    <td className="py-3 px-3 text-center font-bold text-slate-400">
                      {std.studentNumber}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{std.fullName}</span>
                        {isDuplicate && (
                          <span 
                            title="Học sinh này bị trùng lặp tên trong danh sách" 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Trùng lặp
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                        {std.teamName}
                      </span>
                    </td>

                    {/* Chức vụ & Quyền hạn */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cadreMeta && (
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${cadreMeta.badgeClass}`}>
                            {cadreMeta.icon} {cadreMeta.label}
                          </span>
                        )}

                        {isLeader ? (
                          <span 
                            title={`Được GVCN giao quyền chấm thi đua cho học sinh thuộc ${std.teamName}`}
                            className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1"
                          >
                            🎖️ Tổ trưởng (Chấm {std.teamName})
                          </span>
                        ) : std.teamRole === 'to_pho' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
                            Tổ phó
                          </span>
                        ) : !cadreMeta ? (
                          <span className="text-slate-400 text-xs">Thành viên</span>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-black text-indigo-700">
                      {std.currentWeekScore}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {std.monthlyScore}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        std.stars >= 4 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : std.stars === 3 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                          : std.stars === 2 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {std.rankCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {std.trend === 'up' ? (
                        <span className="inline-flex items-center text-emerald-600 font-bold text-xs">
                          <ArrowUpRight className="w-3.5 h-3.5" /> +{std.trendValue}
                        </span>
                      ) : std.trend === 'down' ? (
                        <span className="inline-flex items-center text-rose-600 font-bold text-xs">
                          <ArrowDownRight className="w-3.5 h-3.5" /> {std.trendValue}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold text-xs">—</span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td 
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {/* Nút Phân quyền nhanh - chỉ GVCN */}
                        {isTeacher && (
                          <button
                            onClick={() => setRoleModalStudent(std)}
                            title="Phân quyền chức vụ / Tổ trưởng"
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onSelectStudent(std.studentId)}
                          title="Xem hồ sơ chi tiết"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {isTeacher && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(std)}
                              title="Chỉnh sửa thông tin"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingStudentId(std.studentId)}
                              title="Xóa học sinh"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400">
                  Không tìm thấy học sinh nào phù hợp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {filteredStudents.map((std) => {
          const isLeader = std.isTeamLeader || std.teamRole === 'to_truong';
          const cadreMeta = std.cadreRole && std.cadreRole !== 'none' ? CADRE_ROLES_META[std.cadreRole] : null;
          const isSelected = selectedStudentIds.includes(std.studentId);
          const isDuplicate = duplicateStudentIds.has(std.studentId);

          return (
            <div
              key={std.studentId}
              onClick={() => onSelectStudent(std.studentId)}
              className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-colors cursor-pointer ${
                isSelected 
                  ? 'bg-indigo-50/80 border-indigo-300' 
                  : isDuplicate 
                  ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300' 
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Checkbox mobile - chỉ khi không phải học sinh */}
                    {!isStudent && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStudent(std.studentId)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                    )}
                    <span className="w-6 text-center text-xs font-bold text-slate-400">
                      #{std.studentNumber}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{std.fullName}</h3>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                    {std.teamName}
                  </span>
                </div>

                {/* Duplicate Badge */}
                {isDuplicate && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Trùng lặp tên
                    </span>
                  </div>
                )}

                {/* Role Badges */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {cadreMeta && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cadreMeta.badgeClass}`}>
                      {cadreMeta.icon} {cadreMeta.label}
                    </span>
                  )}
                  {isLeader && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      🎖️ Tổ trưởng (Được chấm thi đua)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs my-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Điểm tuần {selectedWeek}:</span>
                    <span className="font-black text-indigo-700 text-base">{std.currentWeekScore} điểm</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Điểm TB tháng:</span>
                    <span className="font-bold text-slate-700 text-base">{std.monthlyScore} điểm</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  std.stars >= 4 ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  {std.rankCategory}
                </span>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onSelectStudent(std.studentId)}
                    title="Xem hồ sơ"
                    className="p-1 text-slate-400 hover:text-indigo-600"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {isTeacher && (
                    <>
                      <button
                        onClick={() => setRoleModalStudent(std)}
                        title="Phân quyền chức vụ"
                        className="p-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(std)}
                        title="Chỉnh sửa"
                        className="p-1 text-slate-400 hover:text-indigo-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingStudentId(std.studentId)}
                        title="Xóa"
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* THANH THAO TÁC HÀNG LOẠT (Sticky Batch Action Bar) */}
      {!isStudent && selectedStudentIds.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-40 bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-700 animate-slide-up max-w-2xl">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-indigo-500/30 text-indigo-300 font-black flex items-center justify-center text-xs border border-indigo-400/40">
                {selectedStudentIds.length}
              </span>
              <span className="text-xs sm:text-sm font-bold">
                Đã chọn <span className="text-indigo-400">{selectedStudentIds.length}</span> / {filteredStudents.length} học sinh
              </span>
            </div>

            <button
              onClick={() => setSelectedStudentIds([])}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer ml-2"
            >
              Bỏ chọn
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* Chấm điểm thi đua hàng loạt */}
            <button
              onClick={() => setIsBatchGradingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Star className="w-3.5 h-3.5 text-amber-300" />
              <span>Chấm điểm ({selectedStudentIds.length})</span>
            </button>

            {/* Chuyển tổ hàng loạt - chỉ GVCN */}
            {isTeacher && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchMoveTeam(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="" disabled>Chuyển tổ...</option>
                <option value="Tổ 1">Sang Tổ 1</option>
                <option value="Tổ 2">Sang Tổ 2</option>
                <option value="Tổ 3">Sang Tổ 3</option>
                <option value="Tổ 4">Sang Tổ 4</option>
                <option value="Tổ 5">Sang Tổ 5</option>
              </select>
            )}

            {/* Xóa học sinh đã chọn - chỉ GVCN */}
            {isTeacher && (
              <button
                onClick={() => setIsBatchDeleteConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa ({selectedStudentIds.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MASTER CADRE MODAL: Phân quyền Ban cán sự & Tổ trưởng */}
      <CadreAssignmentModal
        isOpen={isCadreModalOpen}
        onClose={() => setIsCadreModalOpen(false)}
      />

      {/* STUDENT ROLE MODAL: Phân quyền từng học sinh */}
      <StudentRoleModal
        student={roleModalStudent}
        isOpen={!!roleModalStudent}
        onClose={() => setRoleModalStudent(null)}
      />

      {/* MODAL: Thêm / Sửa học sinh */}
      <Modal
        isOpen={isAddModalOpen || !!editingStudent}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingStudent(null);
        }}
        title={editingStudent ? 'Chỉnh sửa thông tin học sinh' : 'Thêm học sinh mới'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Họ và tên học sinh <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Minh Anh"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Thuộc tổ</label>
              <select
                value={formTeamName}
                onChange={(e) => setFormTeamName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
              >
                <option value="Tổ 1">Tổ 1</option>
                <option value="Tổ 2">Tổ 2</option>
                <option value="Tổ 3">Tổ 3</option>
                <option value="Tổ 4">Tổ 4</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Giới tính</label>
              <select
                value={formGender}
                onChange={(e) => setFormGender(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </div>
          </div>

          {/* CHỨC VỤ BAN CÁN SỰ & VAI TRÒ TỔ */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Phân quyền chức vụ & Trách nhiệm</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chức vụ ban cán sự lớp</label>
                <select
                  value={formCadreRole}
                  onChange={(e) => setFormCadreRole(e.target.value as ClassCadreRole)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none"
                >
                  <option value="none">Không giữ chức vụ</option>
                  <option value="lop_truong">👑 Lớp trưởng</option>
                  <option value="lop_pho_hoc_tap">📚 Lớp phó học tập</option>
                  <option value="lop_pho_lao_dong">🧹 Lớp phó lao động</option>
                  <option value="lop_pho_trat_tu">🛡️ Lớp phó trật tự</option>
                  <option value="bi_thu">⭐ Bí thư</option>
                  <option value="pho_bi_thu">✨ Phó bí thư</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vai trò trong {formTeamName}</label>
                <select
                  value={formTeamRole}
                  onChange={(e) => setFormTeamRole(e.target.value as TeamRole)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none"
                >
                  <option value="thanh_vien">👤 Thành viên tổ</option>
                  <option value="to_truong">🎖️ Tổ trưởng (Được chấm thi đua tổ)</option>
                  <option value="to_pho">🎗️ Tổ phó</option>
                </select>
              </div>
            </div>

            {formTeamRole === 'to_truong' && (
              <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                ✓ Em sẽ được GVCN giao quyền chấm thi đua cho các học sinh thuộc <strong>{formTeamName}</strong>.
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Số điện thoại phụ huynh</label>
            <input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="0912345678"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi chú nề nếp / đặc điểm</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Ví dụ: Chăm ngoan, tích cực phát biểu..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingStudent(null);
              }}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
            >
              {editingStudent ? 'Cập nhật' : 'Lưu học sinh'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DIALOG: Xóa học sinh */}
      <ConfirmDialog
        isOpen={!!deletingStudentId}
        onClose={() => setDeletingStudentId(null)}
        onConfirm={handleConfirmDelete}
        title="Xóa học sinh khỏi lớp"
        message="Bạn có chắc chắn muốn xóa học sinh này không? Toàn bộ điểm thi đua và lịch sử liên quan sẽ bị xóa."
        confirmText="Xóa học sinh"
      />

      {/* CONFIRM DIALOG: Xóa hàng loạt */}
      <ConfirmDialog
        isOpen={isBatchDeleteConfirmOpen}
        onClose={() => setIsBatchDeleteConfirmOpen(false)}
        onConfirm={handleConfirmBatchDelete}
        title={`Xóa ${selectedStudentIds.length} học sinh đã chọn`}
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedStudentIds.length} học sinh đang được chọn không? Toàn bộ dữ liệu điểm số, chức vụ và lịch sử của các em này sẽ bị xóa khỏi hệ thống.`}
        confirmText={`Xóa ${selectedStudentIds.length} học sinh`}
      />

      {/* MODAL: Chấm điểm thi đua hàng loạt */}
      <Modal
        isOpen={isBatchGradingOpen}
        onClose={() => setIsBatchGradingOpen(false)}
        title={`Chấm điểm thi đua cho ${selectedStudentIds.length} học sinh`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-indigo-900">
            <span className="font-bold block mb-1">Học sinh được áp dụng ({selectedStudentIds.length}):</span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {students.filter(s => selectedStudentIds.includes(s.studentId)).map(s => (
                <span key={s.studentId} className="px-2 py-0.5 bg-white border border-indigo-200 rounded text-[11px] font-bold text-slate-800">
                  {s.fullName} ({s.teamName})
                </span>
              ))}
            </div>
          </div>

          {batchSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-xs">{batchSuccessMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Chọn tiêu chí thi đua <span className="text-rose-500">*</span>
            </label>
            <select
              value={batchCriterionId}
              onChange={(e) => {
                setBatchCriterionId(e.target.value);
                const selected = criteria.find(c => c.criterionId === e.target.value);
                if (selected) {
                  const pts = selected.positiveScore > 0 ? selected.positiveScore : selected.negativeScore;
                  setBatchCustomScore(pts.toString());
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none bg-white font-medium text-xs sm:text-sm"
            >
              <option value="">-- Chọn tiêu chí thi đua --</option>
              {criteria.map((c) => {
                const scoreVal = c.positiveScore > 0 ? c.positiveScore : c.negativeScore;
                return (
                  <option key={c.criterionId} value={c.criterionId}>
                    {c.positiveScore > 0 ? '➕' : '➖'} [{c.category}] {c.name} ({scoreVal > 0 ? `+${scoreVal}` : scoreVal}đ)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số điểm áp dụng</label>
              <input
                type="number"
                value={batchCustomScore}
                onChange={(e) => setBatchCustomScore(e.target.value)}
                placeholder="Theo tiêu chí"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Có thể ghi đè số điểm mặc định</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ghi chú thêm (tùy chọn)</label>
              <input
                type="text"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                placeholder="Ví dụ: Tuần này làm tốt..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBatchGradingOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={!batchCriterionId}
              onClick={handleConfirmBatchGrading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Star className="w-4 h-4 text-amber-300" />
              <span>Xác nhận chấm cho {selectedStudentIds.length} học sinh</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Xử lý và lọc dữ liệu trùng lặp */}
      <Modal
        isOpen={isDedupModalOpen}
        onClose={() => setIsDedupModalOpen(false)}
        title="Lọc và làm sạch danh sách học sinh trùng lặp"
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Phát hiện {duplicateGroups.size} tên học sinh bị trùng lặp (tổng cộng {totalDuplicateCount} bản ghi).
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Hệ thống sẽ giữ lại bản ghi đầy đủ nhất (ưu tiên học sinh có chức vụ, có số điện thoại hoặc ghi chú) và tự động xóa bỏ các bản ghi trùng lặp còn lại.
              </p>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
            {Array.from(duplicateGroups.entries()).map(([key, group], idx) => (
              <div key={key} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-xs">
                    {idx + 1}. {group[0].fullName} ({group.length} bản ghi)
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    Giữ lại 1 bản ghi
                  </span>
                </div>
                <div className="space-y-1">
                  {group.map((std, sIdx) => (
                    <div key={std.studentId} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">#{std.studentNumber}</span>
                        <span className="font-medium text-slate-800">{std.fullName}</span>
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px]">{std.teamName}</span>
                        {std.cadreRole && std.cadreRole !== 'none' && (
                          <span className="text-[10px] text-indigo-700 font-bold">({std.cadreRole})</span>
                        )}
                        {std.parentPhone && (
                          <span className="text-[10px] text-slate-500">SĐT: {std.parentPhone}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold ${sIdx === 0 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200' : 'text-rose-600'}`}>
                        {sIdx === 0 ? '✓ Sẽ giữ lại' : '✗ Sẽ loại bỏ'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDedupModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={dedupLoading || duplicateGroups.size === 0}
              onClick={handleRunDeduplication}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{dedupLoading ? 'Đang lọc bỏ...' : 'Tự động gỡ các bản ghi trùng lặp'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Import học sinh chuẩn Excel/CSV */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* MODAL: Quản lý tài khoản & Phân quyền đăng nhập */}
      <StudentAccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
      />
    </div>
  );
};
