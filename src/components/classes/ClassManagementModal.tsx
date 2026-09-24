import React, { useState, useEffect } from 'react';
import { 
  X, 
  School, 
  Plus, 
  Check, 
  ArrowRight, 
  Users, 
  UserCheck, 
  Sparkles, 
  ArrowLeftRight, 
  Clock, 
  CheckCircle2, 
  ShieldAlert,
  GraduationCap,
  Trash2,
  FileSpreadsheet,
  Download,
  AlertCircle
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { getStudentTransfers } from '../../services/firestoreService';
import { StudentTransferRecord, ImportPreviewStudent } from '../../types';
import { ConfirmDeleteDemoModal } from '../modals/ConfirmDeleteDemoModal';
import { parseStudentFile, downloadStudentTemplateExcel } from '../../utils/excelImportParser';

interface ClassManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClassManagementModal: React.FC<ClassManagementModalProps> = ({ isOpen, onClose }) => {
  const { 
    classes, 
    currentClass, 
    setCurrentClass, 
    setSelectedWeek, 
    createNewClassAction, 
    seedFullDemoClasses,
    students,
    transferStudentToClass
  } = useClassData();

  const [activeTab, setActiveTab] = useState<'classes' | 'create' | 'transfer'>('classes');
  
  // Create Class Form state
  const [newClassName, setNewClassName] = useState('');
  const [newGrade, setNewGrade] = useState('5');
  const [newSchoolYear, setNewSchoolYear] = useState('2026–2027');
  const [newTeamCount, setNewTeamCount] = useState<number>(4);
  const [createExcelFile, setCreateExcelFile] = useState<File | null>(null);
  const [createParsedStudents, setCreateParsedStudents] = useState<ImportPreviewStudent[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [isDeleteDemoModalOpen, setIsDeleteDemoModalOpen] = useState(false);

  // Transfer Student state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferHistory, setTransferHistory] = useState<StudentTransferRecord[]>([]);

  useEffect(() => {
    if (isOpen && currentClass) {
      getStudentTransfers(currentClass.classId)
        .then(setTransferHistory)
        .catch(console.warn);
    }
  }, [isOpen, currentClass]);

  if (!isOpen) return null;

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreateExcelFile(file);
    setIsParsingExcel(true);
    setCreateError(null);
    try {
      const result = await parseStudentFile(file, []);
      setCreateParsedStudents(result.students);
    } catch (err: any) {
      setCreateError(err.message || 'Lỗi khi đọc file Excel');
      setCreateParsedStudents([]);
    } finally {
      setIsParsingExcel(false);
      e.target.value = '';
    }
  };

  const handleDeleteParsedStudent = (index: number) => {
    setCreateParsedStudents(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateParsedStudentTeam = (index: number, newTeam: string) => {
    setCreateParsedStudents(prev => prev.map((s, idx) => idx === index ? { ...s, teamName: newTeam } : s));
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      alert('Vui lòng nhập tên lớp (ví dụ: 5A2, 10A1...)');
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const validStudents = createParsedStudents.filter(
        s => s.status !== 'error' && s.fullName && s.fullName.trim().length >= 2
      );

      await createNewClassAction({
        className: newClassName.trim(),
        grade: newGrade,
        schoolYear: newSchoolYear,
        teamCount: newTeamCount
      }, validStudents);

      setNewClassName('');
      setCreateExcelFile(null);
      setCreateParsedStudents([]);
      setActiveTab('classes');
      alert(`Đã tạo thành công lớp ${newClassName}${validStudents.length > 0 ? ` với ${validStudents.length} học sinh` : ''}!`);
    } catch (err: any) {
      setCreateError(`Lỗi khi tạo lớp: ${err.message || err}`);
      alert(`Lỗi khi tạo lớp: ${err.message || err}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSeedFullDemo = async () => {
    setIsSeedingDemo(true);
    try {
      await seedFullDemoClasses();
      setActiveTab('classes');
      alert('Đã tạo thành công 2 lớp mẫu (12A1 & 12A2) với 90 học sinh (45 HS/lớp), 5 tổ và 8 tuần lịch sử thi đua!');
    } catch (err: any) {
      alert(`Lỗi khi nạp dữ liệu mẫu: ${err.message}`);
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !targetClassId) {
      alert('Vui lòng chọn học sinh và lớp đích cần chuyển.');
      return;
    }
    if (targetClassId === currentClass?.classId) {
      alert('Lớp đích phải khác lớp học hiện tại.');
      return;
    }
    const student = students.find(s => s.studentId === selectedStudentId);
    const targetClass = classes.find(c => c.classId === targetClassId);
    if (!student || !targetClass) return;

    if (!confirm(`Xác nhận chuyển học sinh "${student.fullName}" từ lớp ${currentClass?.className} sang lớp ${targetClass.className}?`)) {
      return;
    }

    setIsTransferring(true);
    try {
      await transferStudentToClass(selectedStudentId, targetClassId, transferReason || 'Chuyển lớp theo đề xuất GVCN');
      setSelectedStudentId('');
      setTransferReason('');
      if (currentClass) {
        const history = await getStudentTransfers(currentClass.classId);
        setTransferHistory(history);
      }
      alert(`Đã ghi nhận chuyển lớp cho học sinh ${student.fullName}!`);
    } catch (err: any) {
      alert(`Lỗi chuyển lớp: ${err.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Quản lý nhiều lớp & Điều chuyển học sinh
              </h2>
              <p className="text-xs text-slate-500">
                Lớp hiện tại: <strong className="text-indigo-600 font-bold">{currentClass?.className}</strong> • Sĩ số: {students.length} học sinh
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-2 bg-white">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Danh sách lớp ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + Tạo lớp học mới
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'transfer'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Chuyển lớp học sinh
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'classes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs text-slate-500 font-medium">
                  Chọn lớp để chuyển đổi không gian làm việc của GVCN:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSeedFullDemo}
                    disabled={isSeedingDemo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${isSeedingDemo ? 'animate-spin' : ''}`} />
                    {isSeedingDemo ? 'Đang nạp 90 HS...' : 'Tạo dữ liệu mẫu (12A1 & 12A2)'}
                  </button>

                  <button
                    onClick={() => setIsDeleteDemoModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Xóa demo</span>
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {classes.map((cls) => {
                  const isActive = currentClass?.classId === cls.classId;
                  return (
                    <div
                      key={cls.classId}
                      onClick={() => {
                        setCurrentClass(cls);
                        setSelectedWeek(cls.currentWeek || 8);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm ${
                          isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {cls.className.replace(/[^0-9a-zA-Z]/g, '').slice(0, 3) || 'Lớp'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{cls.className}</h4>
                            {cls.isDemo && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                Demo 45 HS
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cls.schoolYear} • Sĩ số: {cls.studentCount || 45} HS
                          </p>
                        </div>
                      </div>

                      {isActive ? (
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-600">
                          Chọn lớp
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateClass} className="space-y-4 max-w-lg mx-auto py-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 mb-1">Khởi tạo lớp chủ nhiệm mới</h4>
                <p className="text-xs text-slate-500">
                  Sau khi tạo, hệ thống sẽ tự động cấu hình tiêu chí thi đua chuẩn và 4 tổ thi đua cho lớp mới.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên lớp học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder="Ví dụ: 5A2, 10A1, 11A9..."
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khối lớp
                  </label>
                  <select
                    value={newGrade}
                    onChange={e => setNewGrade(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="1">Khối 1</option>
                    <option value="2">Khối 2</option>
                    <option value="3">Khối 3</option>
                    <option value="4">Khối 4</option>
                    <option value="5">Khối 5</option>
                    <option value="6">Khối 6</option>
                    <option value="7">Khối 7</option>
                    <option value="8">Khối 8</option>
                    <option value="9">Khối 9</option>
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Năm học
                  </label>
                  <input
                    type="text"
                    value={newSchoolYear}
                    onChange={e => setNewSchoolYear(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số lượng Tổ thi đua ban đầu
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNewTeamCount(num)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newTeamCount === num
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {num} Tổ
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Excel Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Nạp danh sách học sinh từ Excel (Tùy chọn)
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadStudentTemplateExcel(newClassName || 'Lop_Moi')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Tải mẫu Excel
                  </button>
                </div>

                <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 text-center bg-white cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <p className="text-xs font-medium text-slate-700">
                    {isParsingExcel
                      ? 'Đang đọc dữ liệu...'
                      : createExcelFile
                      ? createExcelFile.name
                      : 'Chọn file Excel (.xlsx) danh sách học sinh'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Hỗ trợ file có STT, Họ và tên, Giới tính, Tổ...
                  </p>
                </div>

                {createError && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {createError}
                  </p>
                )}

                {createParsedStudents.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-between bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Đã nhận diện {createParsedStudents.filter(s => s.status !== 'error').length}/{createParsedStudents.length} học sinh sẵn sàng nạp
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateExcelFile(null);
                          setCreateParsedStudents([]);
                        }}
                        className="text-rose-600 hover:text-rose-800 text-[10px] cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px]">
                          <tr>
                            <th className="px-2.5 py-1.5 w-10 text-center">STT</th>
                            <th className="px-2.5 py-1.5">Họ và tên</th>
                            <th className="px-2.5 py-1.5 w-16">Giới tính</th>
                            <th className="px-2.5 py-1.5 w-24">Tổ thi đua</th>
                            <th className="px-2.5 py-1.5 w-20">Trạng thái</th>
                            <th className="px-2 py-1.5 w-8 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {createParsedStudents.map((std, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="px-2.5 py-1.5 font-mono text-slate-400 text-center">{idx + 1}</td>
                              <td className="px-2.5 py-1.5 font-semibold text-slate-800">
                                <div>{std.fullName}</div>
                                {std.studentCode && (
                                  <span className="text-[10px] text-indigo-600 font-mono">Mã: {std.studentCode}</span>
                                )}
                              </td>
                              <td className="px-2.5 py-1.5 text-slate-600">{std.gender === 'female' ? 'Nữ' : 'Nam'}</td>
                              <td className="px-2.5 py-1.5">
                                <select
                                  value={std.teamName || `Tổ ${(idx % newTeamCount) + 1}`}
                                  onChange={(e) => handleUpdateParsedStudentTeam(idx, e.target.value)}
                                  className="px-1.5 py-0.5 rounded border border-slate-200 text-[11px] font-semibold text-indigo-700 bg-white"
                                >
                                  {Array.from({ length: newTeamCount }, (_, i) => `Tổ ${i + 1}`).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2.5 py-1.5">
                                {std.status !== 'error' && std.fullName.trim().length >= 2 ? (
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                                    <AlertCircle className="w-3 h-3" /> Lỗi tên
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteParsedStudent(idx)}
                                  title="Xóa em này"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('classes')}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {isCreating ? 'Đang tạo lớp...' : 'Tạo lớp học'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'transfer' && (
            <div className="space-y-6">
              <form onSubmit={handleTransfer} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                  Điều chuyển học sinh sang lớp khác
                </h4>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Học sinh chuyển đi (từ lớp {currentClass?.className})
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={e => setSelectedStudentId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                    >
                      <option value="">-- Chọn học sinh trong lớp --</option>
                      {students.map(s => (
                        <option key={s.studentId} value={s.studentId}>
                          {s.studentNumber}. {s.fullName} ({s.teamName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Chuyển đến lớp
                    </label>
                    <select
                      value={targetClassId}
                      onChange={e => setTargetClassId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                    >
                      <option value="">-- Chọn lớp tiếp nhận --</option>
                      {classes
                        .filter(c => c.classId !== currentClass?.classId)
                        .map(c => (
                          <option key={c.classId} value={c.classId}>
                            {c.className} ({c.schoolYear})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Lý do chuyển lớp
                  </label>
                  <input
                    type="text"
                    value={transferReason}
                    onChange={e => setTransferReason(e.target.value)}
                    placeholder="Ví dụ: Theo nguyện vọng phụ huynh, điều chuyển sĩ số..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="text-right pt-1">
                  <button
                    type="submit"
                    disabled={isTransferring || !selectedStudentId || !targetClassId}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {isTransferring ? 'Đang điều chuyển...' : 'Xác nhận chuyển lớp'}
                  </button>
                </div>
              </form>

              {/* Transfer history list */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Nhật ký điều chuyển học sinh gần đây
                </h5>
                {transferHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    Chưa có học sinh nào được điều chuyển giữa các lớp.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Ngày</th>
                          <th className="px-3 py-2">Học sinh</th>
                          <th className="px-3 py-2">Từ lớp → Đến lớp</th>
                          <th className="px-3 py-2">Lý do</th>
                          <th className="px-3 py-2">Người duyệt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transferHistory.map((rec) => (
                          <tr key={rec.transferId} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{rec.date}</td>
                            <td className="px-3 py-2 font-bold text-slate-900">{rec.studentName}</td>
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              {rec.fromClassName} → {rec.toClassName}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{rec.reason}</td>
                            <td className="px-3 py-2 text-slate-500">{rec.transferredBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Hệ thống hỗ trợ GVCN phụ trách nhiều lớp trong cùng một tài khoản.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      <ConfirmDeleteDemoModal
        isOpen={isDeleteDemoModalOpen}
        onClose={() => setIsDeleteDemoModalOpen(false)}
      />
    </div>
  );
};
