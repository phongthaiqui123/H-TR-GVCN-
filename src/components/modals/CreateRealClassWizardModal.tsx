import React, { useState } from 'react';
import { 
  X, 
  School, 
  Calendar, 
  FileSpreadsheet, 
  UserPlus, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Download, 
  Upload, 
  AlertCircle, 
  Users, 
  ShieldCheck,
  Check,
  Trash2
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { generateStudentImportTemplate, parseStudentFile, parseStudentText } from '../../utils/excelImportParser';
import { ImportPreviewStudent, Student, ClassInfo } from '../../types';

interface CreateRealClassWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (targetTab?: string) => void;
}

export const CreateRealClassWizardModal: React.FC<CreateRealClassWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { 
    schoolYears, 
    currentSchoolYear, 
    createNewClassAction, 
    teacherName,
    setCurrentClass,
    setSelectedWeek,
    setFilterMode
  } = useClassData();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: School Year
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(
    currentSchoolYear?.name || '2026–2027'
  );

  // Step 2: Class Info
  const [schoolName, setSchoolName] = useState<string>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('gvcn_custom_school_name') || '' : '';
  });
  const [className, setClassName] = useState<string>('');
  const [grade, setGrade] = useState<string>('12');
  const [teamCount, setTeamCount] = useState<number>(4);

  // Step 3 & 4: Students Import Method
  const [importMethod, setImportMethod] = useState<'excel' | 'manual'>('excel');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedStudents, setParsedStudents] = useState<ImportPreviewStudent[]>([]);
  const [manualText, setManualText] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [createdClassSummary, setCreatedClassSummary] = useState<{
    className: string;
    studentCount: number;
    schoolYear: string;
  } | null>(null);
  const [createdClass, setCreatedClass] = useState<ClassInfo | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    generateStudentImportTemplate(className || 'Lop_Thuc_Te');
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setIsParsing(true);
    setExcelFile(file);
    try {
      const result = await parseStudentFile(file, []);
      setParsedStudents(result.students);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.');
      setParsedStudents([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleParseManualText = () => {
    setErrorMessage(null);
    if (!manualText.trim()) {
      setParsedStudents([]);
      return;
    }

    try {
      const result = parseStudentText(manualText, []);
      setParsedStudents(result.students);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể nhận diện danh sách.');
      setParsedStudents([]);
    }
  };

  const handleNextFromStep3 = () => {
    setErrorMessage(null);
    if (importMethod === 'manual' && manualText.trim()) {
      try {
        const result = parseStudentText(manualText, []);
        setParsedStudents(result.students);
      } catch (err: any) {
        setErrorMessage(err.message || 'Không thể nhận diện danh sách.');
        return;
      }
    }
    setStep(4);
  };

  const handleDeleteStudentInPreview = (index: number) => {
    setParsedStudents(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateStudentTeam = (index: number, newTeam: string) => {
    setParsedStudents(prev => prev.map((s, idx) => idx === index ? { ...s, teamName: newTeam } : s));
  };

  const handleConfirmAndCreate = async () => {
    if (!className.trim()) {
      setErrorMessage('Vui lòng nhập tên lớp');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      // Filter valid students with name length >= 2
      const validStudents = parsedStudents.filter(
        s => s.status !== 'error' && s.fullName && s.fullName.trim().length >= 2
      );

      // Atomically create class + teams + criteria + initial students in Firestore!
      if (schoolName.trim() && typeof localStorage !== 'undefined') {
        localStorage.setItem('gvcn_custom_school_name', schoolName.trim());
      }

      const newClass = await createNewClassAction(
        {
          schoolName: schoolName.trim() || undefined,
          className: className.trim(),
          grade: grade.trim(),
          schoolYear: selectedSchoolYear,
          teamCount
        },
        validStudents
      );

      setCreatedClass(newClass);
      setCreatedClassSummary({
        className: newClass.className,
        studentCount: validStudents.length,
        schoolYear: selectedSchoolYear
      });

      setStep(6);
    } catch (err: any) {
      console.error('Error creating class:', err);
      setErrorMessage(`Lỗi khi tạo lớp học: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setClassName('');
    setExcelFile(null);
    setParsedStudents([]);
    setManualText('');
    setCreatedClassSummary(null);
    setCreatedClass(null);
    setErrorMessage(null);
  };

  const handleFinish = (targetTab: string = 'dashboard') => {
    if (createdClass) {
      setCurrentClass(createdClass);
      setSelectedWeek(createdClass.currentWeek || 8);
      setFilterMode('all');
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gvcn_active_class_id', createdClass.classId);
      }
    }
    resetForm();
    onClose();
    if (onSuccess) onSuccess(targetTab);
  };

  const handleClose = () => {
    if (step === 6 && createdClass) {
      setCurrentClass(createdClass);
      setSelectedWeek(createdClass.currentWeek || 8);
      setFilterMode('all');
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gvcn_active_class_id', createdClass.classId);
      }
    }
    resetForm();
    onClose();
  };

  const validCount = parsedStudents.filter(s => s.status !== 'error' && s.fullName && s.fullName.trim().length >= 2).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight flex items-center gap-2">
                <span>Khởi tạo lớp học thực tế</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Dữ liệu thật (Production)
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập lớp chủ nhiệm mới và nạp danh sách học sinh ban đầu
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            {[
              { num: 1, label: 'Năm học' },
              { num: 2, label: 'Thông tin lớp' },
              { num: 3, label: 'Nhập học sinh' },
              { num: 4, label: 'Kiểm tra dữ liệu' },
              { num: 5, label: 'Xác nhận' },
              { num: 6, label: 'Hoàn tất' },
            ].map(s => (
              <div 
                key={s.num} 
                className={`flex items-center gap-1.5 ${
                  step === s.num 
                    ? 'text-emerald-700 font-black' 
                    : step > s.num 
                    ? 'text-emerald-600' 
                    : 'text-slate-400'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.num
                    ? 'bg-emerald-600 text-white font-bold'
                    : step > s.num
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s.num ? <Check className="w-3 h-3" /> : s.num}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button 
              type="button" 
              onClick={() => setErrorMessage(null)} 
              className="text-rose-500 hover:text-rose-800 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: School Year */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Bước 1: Chọn năm học</h4>
                <p className="text-xs text-slate-500">
                  Dữ liệu lớp học sẽ được quản lý và lưu trữ tách biệt theo từng năm học.
                </p>
              </div>

              <div className="space-y-2">
                {schoolYears.length > 0 ? (
                  schoolYears.map(sy => (
                    <label
                      key={sy.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selectedSchoolYear === sy.name
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="schoolYear"
                          checked={selectedSchoolYear === sy.name}
                          onChange={() => setSelectedSchoolYear(sy.name)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-800">Năm học {sy.name}</div>
                          <div className="text-[11px] text-slate-500">
                            Từ {sy.startDate} đến {sy.endDate} {sy.isCurrent && '• Hiện tại'}
                          </div>
                        </div>
                      </div>
                      {sy.isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          Đang hoạt động
                        </span>
                      )}
                    </label>
                  ))
                ) : (
                  <div className="p-3.5 rounded-2xl border border-emerald-500 bg-emerald-50/50 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="font-bold text-sm text-slate-800">Năm học 2026–2027</div>
                      <div className="text-[11px] text-slate-500">Năm học tiêu chuẩn hiện hành</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Class Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Bước 2: Thông tin lớp học</h4>
                <p className="text-xs text-slate-500">
                  Nhập tên trường, tên lớp, khối học và số lượng tổ thi đua.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên trường học
                </label>
                <input
                  id="input-wizard-school-name"
                  type="text"
                  placeholder="Ví dụ: THPT Chuyên Lê Hồng Phong, THCS Chu Văn An..."
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">Dùng cho tiêu ngữ báo cáo, phiếu tổng kết và giao diện lớp học.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên lớp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 12A1, 10C2, 9A, 5A2..."
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-medium bg-white"
                  >
                    <option value="12">Khối 12</option>
                    <option value="11">Khối 11</option>
                    <option value="10">Khối 10</option>
                    <option value="9">Khối 9</option>
                    <option value="8">Khối 8</option>
                    <option value="7">Khối 7</option>
                    <option value="6">Khối 6</option>
                    <option value="5">Khối 5</option>
                    <option value="4">Khối 4</option>
                    <option value="3">Khối 3</option>
                    <option value="2">Khối 2</option>
                    <option value="1">Khối 1</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số lượng tổ thi đua
                  </label>
                  <select
                    value={teamCount}
                    onChange={(e) => setTeamCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-medium bg-white"
                  >
                    <option value={2}>2 tổ (Tổ 1, Tổ 2)</option>
                    <option value={3}>3 tổ (Tổ 1, 2, 3)</option>
                    <option value={4}>4 tổ (Tổ 1 đến 4 - Chuẩn)</option>
                    <option value={5}>5 tổ (Tổ 1 đến 5)</option>
                    <option value={6}>6 tổ (Tổ 1 đến 6)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giáo viên chủ nhiệm
                  </label>
                  <input
                    type="text"
                    disabled
                    value={teacherName}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Choose Import Method */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Bước 3: Chọn cách nhập học sinh</h4>
                <p className="text-xs text-slate-500">
                  Thầy/cô có thể tải file Excel/CSV hoặc dán danh sách họ tên nhanh. Học sinh sẽ được lưu vào cơ sở dữ liệu thật của lớp.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportMethod('excel')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    importMethod === 'excel'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="w-6 h-6 text-emerald-600 mb-2" />
                  <div className="font-bold text-sm text-slate-900">Import Excel / CSV</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Tải lên file danh sách lớp chính thức</div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMethod('manual')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    importMethod === 'manual'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <UserPlus className="w-6 h-6 text-indigo-600 mb-2" />
                  <div className="font-bold text-sm text-slate-900">Thêm thủ công / Dán chữ</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Dán nhanh danh sách học sinh theo dòng</div>
                </button>
              </div>

              {importMethod === 'excel' ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Tải file mẫu chuẩn:</span>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải mẫu Excel (.xlsx)
                    </button>
                  </div>

                  <div 
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all relative ${
                      isDragging 
                        ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]' 
                        : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FileSpreadsheet className={`w-10 h-10 mx-auto mb-2 transition-colors ${
                      isDragging ? 'text-emerald-600 animate-bounce' : 'text-emerald-600'
                    }`} />
                    <div className="text-xs font-bold text-slate-800">
                      {isParsing ? 'Đang đọc và phân tích file...' : excelFile ? excelFile.name : 'Chọn file Excel (.xlsx) hoặc CSV từ máy tính'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Kéo thả hoặc click để duyệt file (Hỗ trợ file có hoặc không có tiêu đề)
                    </div>
                  </div>

                  {parsedStudents.length > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Đã nhận diện thành công <strong>{validCount}</strong> học sinh hợp lệ!</span>
                      </div>
                      <span className="text-[11px] font-normal text-slate-500">
                        {parsedStudents.length - validCount > 0 ? `(${parsedStudents.length - validCount} mục cần lưu ý)` : ''}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Dán danh sách học sinh (mỗi học sinh một dòng):
                    </label>
                    <button
                      type="button"
                      onClick={handleParseManualText}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Kiểm tra danh sách
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={manualText}
                    onChange={(e) => {
                      setManualText(e.target.value);
                    }}
                    onBlur={handleParseManualText}
                    placeholder={"1. Nguyễn Văn An - Tổ 1\n2. Trần Thị Bình - Nữ - Tổ 2\n3. Lê Hoàng Cường\n4. Phạm Minh Đức\n..."}
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Mẹo: Có thể dán trực tiếp từ cột Excel, Word hoặc Zalo.</span>
                    {parsedStudents.length > 0 && (
                      <span className="font-bold text-emerald-700">
                        ✓ Nhận diện được {validCount} học sinh
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Validate Data */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm leading-tight">
                    Bước 4: Kiểm tra dữ liệu học sinh ({parsedStudents.length} em)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hệ thống đã chuẩn hóa họ tên và tự động phân bổ vào {teamCount} tổ thi đua.
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  validCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {validCount} hợp lệ
                </span>
              </div>

              {parsedStudents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-700 font-bold">Chưa có danh sách học sinh</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Thầy/cô có thể quay lại Bước 3 để nạp file Excel hoặc tiếp tục tạo lớp trống và bổ sung học sinh sau trong mục Quản lý học sinh.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-4 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white cursor-pointer"
                    >
                      ← Quay lại bước 3 nạp học sinh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 w-12 text-center">STT</th>
                        <th className="px-3 py-2">Họ và tên</th>
                        <th className="px-3 py-2 w-20">Giới tính</th>
                        <th className="px-3 py-2 w-28">Tổ thi đua</th>
                        <th className="px-3 py-2">Trạng thái</th>
                        <th className="px-3 py-2 w-10 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedStudents.map((std, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="px-3 py-2 font-mono text-slate-400 text-center">{idx + 1}</td>
                          <td className="px-3 py-2 font-bold text-slate-800">{std.fullName}</td>
                          <td className="px-3 py-2 text-slate-600">{std.gender === 'female' ? 'Nữ' : 'Nam'}</td>
                          <td className="px-3 py-2">
                            <select
                              value={std.teamName || `Tổ ${(idx % teamCount) + 1}`}
                              onChange={(e) => handleUpdateStudentTeam(idx, e.target.value)}
                              className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-indigo-700 bg-white"
                            >
                              {Array.from({ length: teamCount }, (_, i) => `Tổ ${i + 1}`).map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            {std.status !== 'error' && std.fullName.trim().length >= 2 ? (
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                              </span>
                            ) : (
                              <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {std.errorMessage || 'Lỗi tên'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteStudentInPreview(idx)}
                              title="Xóa dòng này"
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Confirm */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Bước 5: Xác nhận khởi tạo lớp</h4>
                <p className="text-xs text-slate-500">
                  Vui lòng kiểm tra lại thông tin trước khi hoàn tất lưu vào cơ sở dữ liệu.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Sẵn sàng đưa vào sử dụng thực tế (Production)</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                  <div>Tên lớp: <strong className="text-slate-900">{className}</strong></div>
                  <div>Năm học: <strong className="text-slate-900">{selectedSchoolYear}</strong></div>
                  <div>Khối: <strong className="text-slate-900">Khối {grade}</strong></div>
                  <div>Số tổ thi đua: <strong className="text-slate-900">{teamCount} tổ</strong></div>
                  <div>
                    Sĩ số ban đầu: <strong className="text-emerald-700 text-sm">{validCount} học sinh</strong>
                  </div>
                  <div>Chế độ dữ liệu: <strong className="text-emerald-700">Dữ liệu thật (Production)</strong></div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Lớp học sẽ được khởi tạo với {teamCount} tổ thi đua, 12 tiêu chí chuẩn Bộ GD&ĐT, điểm xuất phát 100 điểm/học sinh mỗi tuần và lưu trực tiếp {validCount} học sinh vào cơ sở dữ liệu Firestore.
              </p>
            </div>
          )}

          {/* STEP 6: Finished */}
          {step === 6 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-lg">Khởi tạo lớp thành công!</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  Lớp <strong className="text-emerald-700 font-bold">{createdClassSummary?.className || className}</strong> đã được khởi tạo thành công với{' '}
                  <strong className="text-emerald-700 font-bold">{createdClassSummary?.studentCount || 0} học sinh</strong> trong năm học{' '}
                  <strong>{createdClassSummary?.schoolYear || selectedSchoolYear}</strong>.
                </p>
              </div>

              {/* Summary Badges */}
              <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto text-left">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium">Sĩ số lớp</div>
                  <div className="text-base font-black text-slate-800">{createdClassSummary?.studentCount || 0} em</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium">Tổ thi đua</div>
                  <div className="text-base font-black text-slate-800">{teamCount} tổ</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium">Điểm xuất phát</div>
                  <div className="text-base font-black text-emerald-600">100 đ/em</div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleFinish('dashboard')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  Truy cập Dashboard lớp {createdClassSummary?.className || className} ngay
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFinish('students')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  Xem danh sách học sinh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {step < 6 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1 || loading}
              onClick={() => {
                setErrorMessage(null);
                setStep(prev => prev - 1);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold disabled:opacity-30 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep(2);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Tiếp tục (Thông tin lớp)
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={!className.trim()}
                onClick={() => {
                  setErrorMessage(null);
                  setStep(3);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Tiếp tục (Nhập học sinh)
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleNextFromStep3}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Tiếp tục (Kiểm tra dữ liệu)
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 4 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setStep(5);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-xs font-bold cursor-pointer shadow-xs"
                >
                  Xem tóm tắt (Bước 5)
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmAndCreate}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/25 cursor-pointer"
                >
                  {loading ? 'Đang khởi tạo...' : `Khởi tạo lớp với ${validCount} học sinh ngay`}
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 5 && (
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmAndCreate}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/25 cursor-pointer"
              >
                {loading ? 'Đang khởi tạo...' : 'Tạo lớp & Hoàn tất'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
