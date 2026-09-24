import React, { useState, useEffect } from 'react';
import { useClassData } from '../../hooks/useClassData';
import { Modal } from '../ui/Modal';
import { UserCheck, Sparkles, Check, School, HeartHandshake } from 'lucide-react';

interface EditTeacherNameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditTeacherNameModal: React.FC<EditTeacherNameModalProps> = ({ isOpen, onClose }) => {
  const { teacherName, updateTeacherName, currentClass } = useClassData();
  const [nameInput, setNameInput] = useState(teacherName);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNameInput(teacherName);
      setSavedSuccess(false);
    }
  }, [isOpen, teacherName]);

  const handleApplyPrefix = (prefix: 'Cô' | 'Thầy') => {
    let clean = nameInput.trim();
    // Remove existing prefix if any
    clean = clean.replace(/^(Cô|Thầy|Thầy giáo|Cô giáo)\s+/i, '');
    setNameInput(`${prefix} ${clean}`.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = nameInput.trim();
    if (!finalName) return;

    try {
      setIsSaving(true);
      await updateTeacherName(finalName);
      setSavedSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to update teacher name:', err);
      setIsSaving(false);
    }
  };

  const quickSamples = [
    'Cô Nguyễn Mai Lan',
    'Thầy Trần Hoàng Nam',
    'Cô Lê Thu Hà',
    'Thầy Phạm Đức Minh'
  ];

  const firstLetter = (nameInput.trim() || teacherName).charAt(0).toUpperCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ĐỔI TÊN GIÁO VIÊN CHỦ NHIỆM"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Họ và tên Giáo viên (kèm danh xưng)
          </label>
          <div className="relative">
            <input
              id="input-teacher-name-modal"
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="VD: Cô Nguyễn Mai Lan hoặc Thầy Trần Văn An"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
              required
            />
            {nameInput && (
              <span className="absolute right-3 top-3 text-xs text-slate-400">
                {nameInput.length} ký tự
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            Tên này sẽ hiển thị trang trọng trên toàn bộ hệ thống: Banner chào hỏi, thẻ thông tin cá nhân, báo cáo xuất gửi phụ huynh và Ban Giám Hiệu.
          </p>
        </div>

        {/* Quick Honorific selection & suggestions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Chọn nhanh danh xưng:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPrefix('Cô')}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 transition-colors cursor-pointer"
              >
                + Danh xưng &quot;Cô&quot;
              </button>
              <button
                type="button"
                onClick={() => handleApplyPrefix('Thầy')}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
              >
                + Danh xưng &quot;Thầy&quot;
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 mr-1">Mẫu nhanh:</span>
            {quickSamples.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setNameInput(sample)}
                className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Xem trước cách hiển thị:</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* 1. Header avatar preview */}
            <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {firstLetter}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate">
                  {nameInput.trim() || 'Tên giáo viên'}
                </p>
                <p className="text-[10px] text-slate-400">
                  GVCN {currentClass?.className || 'Lớp học'}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Góc Header
              </span>
            </div>

            {/* 2. Dashboard greeting preview */}
            <div className="p-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-2 shadow-xs">
              <div className="truncate">
                <span className="text-[11px] text-indigo-300 block">Lời chào trang chủ:</span>
                <span className="font-bold text-xs text-white">
                  Chào buổi sáng, {nameInput.trim() || 'Thầy/Cô'} 👋
                </span>
              </div>
              <School className="w-4 h-4 text-indigo-400 shrink-0" />
            </div>

            {/* 3. Report print preview */}
            <div className="p-2 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
              <span>Ký duyệt báo cáo nề nếp:</span>
              <strong className="text-slate-900 font-bold">
                GVCN: {nameInput.trim() || 'Chưa đặt tên'}
              </strong>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            id="btn-save-teacher-name"
            type="submit"
            disabled={isSaving || !nameInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Đã cập nhật!</span>
              </>
            ) : isSaving ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Lưu tên Giáo viên</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
