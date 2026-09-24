import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  FileJson, 
  History, 
  Clock, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { useAuth } from '../../hooks/useAuth';
import { getAuditLogs } from '../../services/firestoreService';
import { AuditLog, ClassBackupData } from '../../types';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose }) => {
  const { currentClass, exportBackupJson, restoreFromBackup, students, events, allWeeklyScores } = useClassData();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'audit'>('backup');
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<ClassBackupData | null>(null);

  useEffect(() => {
    if (isOpen && currentClass) {
      getAuditLogs(currentClass.classId)
        .then(setAuditLogs)
        .catch(console.warn);
    }
  }, [isOpen, currentClass]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportBackupJson();
    } catch (err: any) {
      alert(`Lỗi khi sao lưu dữ liệu: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.version || !json.classInfo) {
          throw new Error('Cấu trúc file sao lưu không hợp lệ.');
        }
        setParsedBackup(json as ClassBackupData);
      } catch (err: any) {
        alert('File JSON không hợp lệ hoặc bị lỗi cấu trúc: ' + err.message);
        setRestoreFile(null);
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!parsedBackup) return;
    if (!confirm(`CẢNH BÁO NGUY HIỂM:\n\nBạn sắp khôi phục dữ liệu cho lớp "${parsedBackup.classInfo?.className}".\nThao tác này sẽ ghi đè và đồng bộ lại danh sách học sinh, điểm số và dữ liệu thi đua từ file sao lưu.\n\nBạn có chắc chắn muốn tiếp tục?`)) {
      return;
    }

    setIsRestoring(true);
    try {
      await restoreFromBackup(parsedBackup);
      alert('Khôi phục dữ liệu lớp học thành công!');
      onClose();
    } catch (err: any) {
      alert(`Lỗi khi khôi phục dữ liệu: ${err.message}`);
    } finally {
      setIsRestoring(false);
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
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Sao lưu, Khôi phục & Nhật ký an toàn
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                  {currentClass?.className}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Bảo vệ toàn vẹn dữ liệu nề nếp thi đua và lịch sử hoạt động
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
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sao lưu dữ liệu
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'restore'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Khôi phục từ file
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Nhật ký hệ thống ({auditLogs.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'backup' && (
            <div className="space-y-6 max-w-lg mx-auto py-2">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 leading-relaxed">
                  <p className="font-bold mb-1">Đảm bảo an toàn 100% dữ liệu lớp học</p>
                  File sao lưu chứa toàn bộ hồ sơ học sinh, danh sách tổ, tiêu chí chấm thi đua, lịch sử sự kiện chấm điểm, điểm tuần và các báo cáo GVCN đã tạo.
                </div>
              </div>

              {/* Data Summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Học sinh</div>
                  <div className="text-lg font-black text-slate-900">{students.length}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Sự kiện chấm điểm</div>
                  <div className="text-lg font-black text-indigo-600">{events.length}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Bản ghi điểm tuần</div>
                  <div className="text-lg font-black text-emerald-600">{allWeeklyScores.length}</div>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? 'Đang trích xuất dữ liệu...' : 'Tải xuống file sao lưu (.json)'}
                </button>
                <p className="text-[11px] text-slate-400 mt-2">
                  Định dạng JSON chuẩn, có thể mở bằng Notepad hoặc lưu trữ trên Google Drive / USB.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'restore' && (
            <div className="space-y-5 max-w-lg mx-auto py-2">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold mb-1">Lưu ý trước khi khôi phục</p>
                  Chỉ sử dụng file sao lưu được xuất từ ứng dụng GVCN SMART CLASS. Thao tác này sẽ khôi phục lại cấu trúc lớp học từ thời điểm sao lưu.
                </div>
              </div>

              {/* Upload file box */}
              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileJson className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800">
                  {restoreFile ? restoreFile.name : 'Chọn file sao lưu (.json) từ máy tính'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Nhấn vào đây để tải lên
                </div>
              </div>

              {/* Preview Parsed Backup */}
              {parsedBackup && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-800">
                      Thông tin file sao lưu: {parsedBackup.classInfo?.className}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                      Hợp lệ
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>Thời điểm xuất: <strong>{new Date(parsedBackup.exportedAt).toLocaleDateString('vi-VN')}</strong></div>
                    <div>Học sinh: <strong>{parsedBackup.students?.length || 0}</strong></div>
                    <div>Sự kiện chấm điểm: <strong>{parsedBackup.events?.length || 0}</strong></div>
                    <div>Điểm thi đua tuần: <strong>{parsedBackup.weeklyScores?.length || 0}</strong></div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleConfirmRestore}
                      disabled={isRestoring}
                      className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all cursor-pointer"
                    >
                      {isRestoring ? 'Đang khôi phục...' : 'Xác nhận khôi phục dữ liệu'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Ghi nhận minh bạch các thao tác quan trọng của GVCN:
                </span>
                <button
                  onClick={() => currentClass && getAuditLogs(currentClass.classId).then(setAuditLogs)}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Làm mới
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Chưa có nhật ký ghi nhận thao tác nào.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Thời gian</th>
                        <th className="px-3 py-2">Thao tác</th>
                        <th className="px-3 py-2">Người thực hiện</th>
                        <th className="px-3 py-2">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.logId} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-800">
                            {log.action}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {log.performedByName}
                          </td>
                          <td className="px-3 py-2 text-slate-500 truncate max-w-xs">
                            {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '-')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Dữ liệu được lưu trữ an toàn trên Google Firebase Cloud Firestore.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
