import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';

interface ConfirmDeleteDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (stats: { deletedClasses: number; deletedStudents: number; deletedScores: number; deletedEvents: number }) => void;
}

export const ConfirmDeleteDemoModal: React.FC<ConfirmDeleteDemoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { deleteDemoDataAction } = useClassData();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const stats = await deleteDemoDataAction();
      if (onSuccess) {
        onSuccess(stats);
      }
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi xóa dữ liệu demo:', err);
      setError(err?.message || 'Có lỗi xảy ra khi xóa dữ liệu mẫu');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Xác nhận xóa Dữ liệu Mẫu (Demo)</h3>
            <p className="text-sm text-slate-600 mt-1">
              Thao tác này sẽ dọn dẹp các lớp mẫu và trả lại không gian làm việc sạch sẽ cho thầy cô.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Cam kết an toàn dữ liệu */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 leading-relaxed">
              <strong className="font-bold text-emerald-900 block mb-1">
                Bảo vệ 100% dữ liệu lớp học thật:
              </strong>
              Hệ thống chỉ xóa các lớp mẫu (<code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">12A1</code>, <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">12A2</code>) và các bản ghi được đánh dấu <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">isDemo: true</code>.
              Toàn bộ dữ liệu học sinh, điểm số và tiêu chí thật do thầy cô tạo sẽ được <strong>bảo toàn tuyệt đối</strong>.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Dữ liệu demo sẽ bị xóa:
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
              <li>2 lớp demo: 12A1 và 12A2 (nếu có)</li>
              <li>90 hồ sơ học sinh demo (12A1-001 → 12A1-045, 12A2-001 → 12A2-045)</li>
              <li>Toàn bộ điểm thi đua và sự kiện cộng/trừ điểm gắn nhãn demo trong 8 tuần</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-rose-100 text-rose-800 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="px-5 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-lg shadow-rose-200 transition-all flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xóa dữ liệu mẫu...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Xác nhận xóa dữ liệu mẫu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
