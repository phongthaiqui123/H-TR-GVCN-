import React, { useState } from 'react';
import { Trash2, AlertTriangle, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { ClassInfo } from '../../types';

interface ConfirmDeleteRealClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClass?: ClassInfo | null;
  onSuccess?: (stats: { deletedStudents: number; deletedTeams: number; deletedCriteria: number; deletedEvents: number; deletedScores: number }) => void;
}

export const ConfirmDeleteRealClassModal: React.FC<ConfirmDeleteRealClassModalProps> = ({
  isOpen,
  onClose,
  targetClass,
  onSuccess,
}) => {
  const { classes, deleteRealClassAction } = useClassData();
  const [selectedClassId, setSelectedClassId] = useState<string>(targetClass?.classId || '');
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter real classes only (not demo)
  const realClasses = classes.filter(c => !c.isDemo && c.status !== 'archived');
  const activeTarget = realClasses.find(c => c.classId === selectedClassId) || targetClass || realClasses[0] || null;

  React.useEffect(() => {
    if (targetClass?.classId) {
      setSelectedClassId(targetClass.classId);
    } else if (realClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(realClasses[0].classId);
    }
  }, [targetClass, realClasses]);

  if (!isOpen) return null;

  const expectedKeyword = activeTarget ? activeTarget.className.trim() : 'XÓA LỚP';
  const isKeywordMatched = confirmKeyword.trim().toLowerCase() === expectedKeyword.toLowerCase() ||
                           confirmKeyword.trim().toUpperCase() === 'XÓA LỚP THẬT' ||
                           confirmKeyword.trim().toUpperCase() === 'XOA LOP THAT';

  const handleDelete = async () => {
    if (!activeTarget) return;
    if (!isKeywordMatched) {
      setError(`Vui lòng nhập chính xác tên lớp "${expectedKeyword}" để xác nhận.`);
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      const stats = await deleteRealClassAction(activeTarget.classId);
      if (onSuccess) {
        onSuccess(stats);
      }
      setConfirmKeyword('');
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi xóa lớp thật:', err);
      setError(err?.message || 'Có lỗi xảy ra khi thực hiện lệnh xóa lớp thật.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-rose-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-rose-50 to-red-50 border-b border-rose-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-200">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-200 text-rose-800 uppercase tracking-wider">
                Lệnh Quản Trị Cấp Cao
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-1">Xác nhận xóa Lớp Học Thật</h3>
            <p className="text-xs text-slate-600 mt-1">
              Thao tác này dùng khi cần kết thúc năm học, đổi lớp hoặc xóa toàn bộ học sinh và điểm số của lớp thật.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Class selection if multiple real classes */}
          {realClasses.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chọn lớp thật cần xóa:
              </label>
              <select
                value={activeTarget?.classId || ''}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setConfirmKeyword('');
                  setError(null);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {realClasses.map(c => (
                  <option key={c.classId} value={c.classId}>
                    {c.className} ({c.grade} - {c.studentCount || 0} học sinh - GVCN: {c.teacherName || 'GVCN'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cảnh báo tác động */}
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-950">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Cảnh báo dữ liệu sẽ bị xóa vĩnh viễn:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
              <li>Lớp học thật: <strong>{activeTarget?.className || 'Lớp thật'}</strong> ({activeTarget?.schoolYear || '2026-2027'})</li>
              <li>Toàn bộ hồ sơ của <strong>{activeTarget?.studentCount || 0} học sinh</strong> trong lớp này</li>
              <li>Toàn bộ danh sách tổ thi đua, điểm cộng/trừ các tuần và các sự kiện ghi nhận</li>
              <li>Toàn bộ danh mục tiêu chí thi đua riêng của lớp này</li>
            </ul>
          </div>

          {/* Cam kết an toàn demo */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              Lớp học trải nghiệm (Demo) và các lớp thật khác (nếu có) <strong>hoàn toàn không bị ảnh hưởng</strong>. Sau khi xóa, hệ thống sẽ tự động chuyển sang lớp demo.
            </span>
          </div>

          {/* Ô nhập xác nhận an toàn */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-slate-700">
              Để xác nhận, vui lòng nhập chính xác tên lớp <code className="font-mono font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded text-xs">{expectedKeyword}</code> hoặc <code className="font-mono font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded text-xs">XÓA LỚP THẬT</code>:
            </label>
            <input
              type="text"
              value={confirmKeyword}
              onChange={(e) => {
                setConfirmKeyword(e.target.value);
                setError(null);
              }}
              placeholder={`Nhập "${expectedKeyword}" để mở khóa`}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-100 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={isDeleting || !isKeywordMatched || !activeTarget}
            onClick={handleDelete}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-rose-200 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xóa toàn bộ dữ liệu lớp thật...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận xóa vĩnh viễn lớp thật</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
