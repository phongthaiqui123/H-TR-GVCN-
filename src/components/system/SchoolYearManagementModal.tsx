import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Plus, 
  Check, 
  Archive, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  School
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { SchoolYear } from '../../types';

interface SchoolYearManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchoolYearManagementModal: React.FC<SchoolYearManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    schoolYears, 
    currentSchoolYear, 
    createSchoolYearAction, 
    classes 
  } = useClassData();

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newYearName, setNewYearName] = useState<string>('2027–2028');
  const [startDate, setStartDate] = useState<string>('2027-09-05');
  const [endDate, setEndDate] = useState<string>('2028-05-31');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName.trim()) return;
    setLoading(true);
    setSuccessMsg(null);
    try {
      await createSchoolYearAction(newYearName.trim(), startDate, endDate, currentWeek);
      setSuccessMsg(`Đã tạo thành công năm học ${newYearName}`);
      setIsCreating(false);
    } catch (err: any) {
      alert(`Lỗi: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">
                Quản lý niên khóa & Năm học
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chuyển đổi năm học, lưu trữ niên khóa cũ và bảo toàn dữ liệu độc lập
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current School Year Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                Năm học đang áp dụng
              </div>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                Năm học {currentSchoolYear?.name || '2026–2027'}
              </div>
              <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                <span>Khởi đầu: {currentSchoolYear?.startDate || '05/09/2026'}</span>
                <span>•</span>
                <span>Kết thúc: {currentSchoolYear?.endDate || '31/05/2027'}</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
              Hiện hành
            </span>
          </div>

          {/* Action button to open create form */}
          {!isCreating && (
            <div className="flex items-center justify-between pt-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách các năm học
              </h4>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm năm học mới
              </button>
            </div>
          )}

          {/* Create Form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs text-indigo-900 uppercase">Khởi tạo năm học mới</h5>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Hủy
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên năm học (Ví dụ: 2027–2028)
                </label>
                <input
                  type="text"
                  required
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {loading ? 'Đang lưu...' : 'Lưu năm học'}
                </button>
              </div>
            </form>
          )}

          {/* List of School Years */}
          <div className="space-y-2.5">
            {schoolYears.map(sy => {
              const classCount = classes.filter(c => c.schoolYear === sy.name).length;
              return (
                <div
                  key={sy.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    sy.isCurrent
                      ? 'border-indigo-400 bg-white shadow-xs ring-2 ring-indigo-500/10'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                        sy.isCurrent ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                          <span>Năm học {sy.name}</span>
                          {sy.isCurrent ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              Hiện hành
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">
                              Lưu trữ
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Thời gian: {sy.startDate} đến {sy.endDate} • {classCount} lớp học liên kết
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Lưu ý bảo toàn dữ liệu:</strong> Khi chuyển đổi hoặc lưu trữ năm học, toàn bộ hồ sơ điểm, nhật ký thi đua và nhận xét của từng năm được lưu trữ độc lập, không ghi đè lẫn nhau.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
