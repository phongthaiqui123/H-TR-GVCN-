import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Users,
  ClipboardList,
  Calendar,
  Phone
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { parseStudentFile, parseStudentText, generateStudentImportTemplate } from '../../utils/excelImportParser';
import { ImportPreviewStudent } from '../../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (addedCount: number, updatedCount: number) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentClass, students, importStudentsFromPreview } = useClassData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{
    students: ImportPreviewStudent[];
    totalRows: number;
    validCount: number;
    warningCount: number;
    errorCount: number;
    duplicateCount: number;
  } | null>(null);

  const [globalDuplicateAction, setGlobalDuplicateAction] = useState<'skip' | 'update'>('skip');
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'duplicate' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [importResult, setImportResult] = useState<{ addedCount: number; updatedCount: number } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setParsing(true);
    setParseError(null);
    setImportResult(null);
    try {
      const res = await parseStudentFile(selectedFile, students);
      if (res.students.length === 0) {
        setParseError('Không tìm thấy danh sách học sinh nào trong file. Vui lòng kiểm tra lại cột Họ tên hoặc chuyển sang tab "Dán danh sách".');
        setParsedData(null);
      } else {
        setParsedData(res);
      }
    } catch (err: any) {
      setParseError(err.message || 'Lỗi khi đọc file Excel/CSV. Vui lòng kiểm tra định dạng hoặc thử tab "Dán danh sách".');
      setFile(null);
      setParsedData(null);
    } finally {
      setParsing(false);
    }
  };

  const handleParsePasteText = () => {
    if (!pasteText.trim()) {
      setParseError('Vui lòng dán danh sách học sinh vào ô văn bản trước khi tiếp tục.');
      return;
    }
    setParsing(true);
    setParseError(null);
    try {
      const res = parseStudentText(pasteText, students);
      if (res.students.length === 0) {
        setParseError('Không trích xuất được học sinh nào. Mỗi học sinh nên ở trên 1 dòng.');
        setParsedData(null);
      } else {
        setParsedData(res);
      }
    } catch (err: any) {
      setParseError(err.message || 'Không thể nhận diện danh sách được dán. Vui lòng kiểm tra định dạng.');
      setParsedData(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDownloadTemplate = () => {
    generateStudentImportTemplate(currentClass?.className || 'Lớp_học');
  };

  const handleApplyGlobalDuplicateAction = (action: 'skip' | 'update') => {
    setGlobalDuplicateAction(action);
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      students: parsedData.students.map(s => {
        if (s.status === 'duplicate') {
          return { ...s, duplicateAction: action };
        }
        return s;
      })
    });
  };

  const handleToggleRowDuplicateAction = (index: number) => {
    if (!parsedData) return;
    const updated = [...parsedData.students];
    const item = updated[index];
    if (item && item.status === 'duplicate') {
      item.duplicateAction = item.duplicateAction === 'update' ? 'skip' : 'update';
      setParsedData({ ...parsedData, students: updated });
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;
    setImporting(true);
    setParseError(null);
    try {
      const result = await importStudentsFromPreview(parsedData.students);
      setImportResult(result);
      if (onSuccess) {
        onSuccess(result.addedCount, result.updatedCount);
      }
    } catch (err: any) {
      setParseError(`Lỗi khi lưu học sinh vào hệ thống: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPasteText('');
    setParsedData(null);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter preview items
  const filteredStudents = (parsedData?.students || []).filter(item => {
    if (filterTab === 'valid' && item.status !== 'valid') return false;
    if (filterTab === 'duplicate' && item.status !== 'duplicate') return false;
    if (filterTab === 'error' && item.status !== 'error') return false;
    if (searchTerm) {
      const normTerm = searchTerm.toLowerCase();
      return item.fullName.toLowerCase().includes(normTerm) || item.teamName.toLowerCase().includes(normTerm);
    }
    return true;
  });

  const validToImportCount = (parsedData?.students || []).filter(s => {
    if (s.status === 'valid') return true;
    if (s.status === 'duplicate' && s.duplicateAction === 'update') return true;
    return false;
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Nhập danh sách học sinh
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  {currentClass?.className || 'Lớp hiện tại'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Tự động nhận diện cột Họ & Tên, Giới tính, Tổ thi đua, SĐT và ngày sinh
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Error Banner */}
          {parseError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900">Không thể xử lý dữ liệu</p>
                <p className="mt-0.5">{parseError}</p>
              </div>
              <button 
                onClick={() => setParseError(null)} 
                className="text-rose-500 hover:text-rose-700 font-bold ml-auto"
              >
                ✕
              </button>
            </div>
          )}

          {importResult ? (
            /* Success View */
            <div className="py-12 px-6 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Nhập học sinh thành công!</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Đã thêm mới <strong className="text-emerald-600 font-bold">{importResult.addedCount} học sinh</strong>
                {importResult.updatedCount > 0 && (
                  <> và cập nhật thông tin cho <strong className="text-indigo-600 font-bold">{importResult.updatedCount} học sinh</strong></>
                )} vào danh sách lớp {currentClass?.className}.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Nhập thêm danh sách khác
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  Hoàn tất & Xem danh sách
                </button>
              </div>
            </div>
          ) : !parsedData ? (
            /* Selection / Upload View */
            <div className="space-y-4">
              {/* Tabs: Upload File vs Paste Text */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setInputMode('file')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    inputMode === 'file'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>1. Tải file Excel / CSV (.xlsx, .xls, .csv)</span>
                </button>
                <button
                  onClick={() => setInputMode('paste')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    inputMode === 'paste'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>2. Dán danh sách (Copy & Paste từ Excel / Sheets / Zalo)</span>
                </button>
              </div>

              {inputMode === 'file' ? (
                /* Drag and Drop Zone */
                <div 
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/20 group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])} 
                    accept=".xlsx, .xls, .csv" 
                    className="hidden" 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 group-hover:bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    {parsing ? <RefreshCw className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
                    {parsing ? 'Đang đọc và phân tích file...' : 'Kéo thả file Excel hoặc nhấn để chọn từ máy tính'}
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Hỗ trợ file Microsoft Excel: <strong>.xlsx, .xls</strong> hoặc <strong>.csv</strong>
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs group-hover:bg-emerald-700 transition-colors">
                    <FileSpreadsheet className="w-4 h-4" />
                    Chọn file từ thiết bị
                  </span>
                </div>
              ) : (
                /* Direct Paste Zone */
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                    💡 <strong>Mẹo nhanh:</strong> Bạn có thể mở file Excel hoặc Google Sheets, bôi đen danh sách học sinh (bao gồm Họ tên, Giới tính, Tổ) nhấn <strong>Ctrl+C</strong> và dán <strong>Ctrl+V</strong> trực tiếp vào khung dưới đây!
                  </div>
                  <textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    rows={8}
                    placeholder={"Ví dụ dán nội dung từ Excel:\n1\tNguyễn Minh Anh\tNam\tTổ 1\n2\tTrần Gia Bảo\tNam\tTổ 1\n3\tLê Thùy Chi\tNữ\tTổ 2"}
                    className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={parsing || !pasteText.trim()}
                      onClick={handleParsePasteText}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {parsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                      <span>Phân tích danh sách đã dán</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Template Download & Instructions */}
              <div className="grid sm:grid-cols-2 gap-3.5 pt-2">
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-indigo-900 mb-1">Chưa có file mẫu?</h5>
                    <p className="text-[11px] text-indigo-700/80 leading-relaxed mb-3">
                      Tải mẫu file Excel chuẩn với các cột STT, Họ tên, Giới tính, Tổ thi đua, Ghi chú.
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải file Excel mẫu (.xlsx)
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h5 className="text-xs font-bold text-slate-800 mb-1.5">Khả năng tương thích cao</h5>
                  <ul className="text-[11px] text-slate-600 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Tự động gộp 2 cột riêng <strong>"Họ và chữ đệm"</strong> và <strong>"Tên"</strong> từ vnEdu/SMAS.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Tự động bỏ qua các dòng tiêu đề trường/sở ở đầu bảng tính.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Tự động phân bổ đều vào 4 tổ nếu file không có cột Tổ.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* Data Preview & Confirmation View */
            <div className="space-y-4">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Tổng số dòng</div>
                  <div className="text-lg font-black text-slate-900">{parsedData.totalRows}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hợp lệ
                  </div>
                  <div className="text-lg font-black text-emerald-700">{parsedData.validCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Trùng lặp
                  </div>
                  <div className="text-lg font-black text-amber-700">{parsedData.duplicateCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Bị lỗi
                  </div>
                  <div className="text-lg font-black text-rose-700">{parsedData.errorCount}</div>
                </div>
              </div>

              {/* Duplicate Handling Control */}
              {parsedData.duplicateCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs text-amber-900 font-medium">
                      Phát hiện <strong>{parsedData.duplicateCount} học sinh</strong> trùng tên với danh sách lớp hiện tại:
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => handleApplyGlobalDuplicateAction('skip')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        globalDuplicateAction === 'skip'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      Bỏ qua trùng lặp
                    </button>
                    <button
                      onClick={() => handleApplyGlobalDuplicateAction('update')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        globalDuplicateAction === 'update'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      Cập nhật thông tin
                    </button>
                  </div>
                </div>
              )}

              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({parsedData.students.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('valid')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filterTab === 'valid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    Hợp lệ ({parsedData.validCount})
                  </button>
                  {parsedData.duplicateCount > 0 && (
                    <button
                      onClick={() => setFilterTab('duplicate')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        filterTab === 'duplicate' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-amber-700'
                      }`}
                    >
                      Trùng ({parsedData.duplicateCount})
                    </button>
                  )}
                  {parsedData.errorCount > 0 && (
                    <button
                      onClick={() => setFilterTab('error')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        filterTab === 'error' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-700'
                      }`}
                    >
                      Lỗi ({parsedData.errorCount})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên học sinh..."
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleReset}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold whitespace-nowrap cursor-pointer"
                    title="Chọn lại file khác"
                  >
                    Nhập lại
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 sticky top-0 z-10 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 w-12 text-center">STT</th>
                      <th className="px-3 py-2">Họ và tên</th>
                      <th className="px-3 py-2 w-20">Giới tính</th>
                      <th className="px-3 py-2 w-24">Tổ</th>
                      <th className="px-3 py-2">Ngày sinh / SĐT</th>
                      <th className="px-3 py-2">Ghi chú</th>
                      <th className="px-3 py-2 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Không tìm thấy dữ liệu học sinh phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((item, idx) => (
                        <tr 
                          key={idx} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            item.status === 'duplicate' ? 'bg-amber-50/30' : item.status === 'error' ? 'bg-rose-50/40' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-center font-semibold text-slate-500">
                            {item.stt}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {item.fullName || <span className="text-rose-500 italic">Thiếu họ tên</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-600 capitalize">
                            {item.gender === 'female' ? 'Nữ' : item.gender === 'other' ? 'Khác' : 'Nam'}
                          </td>
                          <td className="px-3 py-2 font-medium text-indigo-700">
                            {item.teamName}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            <div className="flex flex-col gap-0.5 text-[11px]">
                              {item.birthDate && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {item.birthDate}
                                </span>
                              )}
                              {item.parentPhone && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {item.parentPhone}
                                </span>
                              )}
                              {!item.birthDate && !item.parentPhone && <span className="text-slate-400">-</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-500 truncate max-w-[150px]">
                            {item.notes || '-'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.status === 'valid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                              </span>
                            )}
                            {item.status === 'warning' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-[11px]" title={item.errorMessage}>
                                <AlertTriangle className="w-3 h-3" /> Tạm gán
                              </span>
                            )}
                            {item.status === 'duplicate' && (
                              <button
                                onClick={() => handleToggleRowDuplicateAction(idx)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                  item.duplicateAction === 'update'
                                    ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                }`}
                                title="Nhấn để đổi giữa Cập nhật và Bỏ qua"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {item.duplicateAction === 'update' ? 'Cập nhật' : 'Bỏ qua'}
                              </button>
                            )}
                            {item.status === 'error' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold text-[11px]">
                                <XCircle className="w-3 h-3" /> {item.errorMessage || 'Lỗi'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            Đóng
          </button>

          {parsedData && !importResult && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Sẽ nhập <strong className="text-slate-900 font-bold">{validToImportCount} học sinh</strong> vào lớp {currentClass?.className}
              </span>
              <button
                onClick={handleConfirmImport}
                disabled={importing || validToImportCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang lưu vào hệ thống...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Xác nhận nhập học sinh
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
