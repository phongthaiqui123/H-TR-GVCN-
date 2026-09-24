import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  Edit3, 
  MessageSquare, 
  CheckCircle2, 
  User,
  ShieldCheck
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { StudentWithScore } from '../../types';

interface TripleStudentCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentWithScore | null;
}

interface TripleComments {
  concise: string;
  balanced: string;
  encouraging: string;
}

export const TripleStudentCommentsModal: React.FC<TripleStudentCommentsModalProps> = ({
  isOpen,
  onClose,
  student
}) => {
  const { currentClass, selectedWeek, observations } = useClassData();
  const [period, setPeriod] = useState<string>(`Tuần ${selectedWeek}`);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<TripleComments | null>(null);
  const [selectedType, setSelectedType] = useState<'concise' | 'balanced' | 'encouraging'>('balanced');
  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !student) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const studentObs = observations
        .filter(o => o.studentId === student.studentId)
        .map(o => `${o.category}: ${o.content}`);

      const response = await fetch('/api/gemini/student-comments-triple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: {
            studentId: student.studentId,
            fullName: student.fullName,
            teamName: student.teamName,
          },
          period,
          stats: {
            currentScore: student.currentWeekScore,
            rankCategory: student.rankCategory,
            totalPositive: student.totalPositive,
            totalNegative: student.totalNegative,
          },
          observations: studentObs
        })
      });

      if (!response.ok) throw new Error('Không thể tạo nhận xét');
      const data: TripleComments = await response.json();
      setComments(data);
      setEditedText(data[selectedType] || data.balanced);
    } catch (err) {
      console.error('Failed to generate comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectType = (type: 'concise' | 'balanced' | 'encouraging') => {
    setSelectedType(type);
    if (comments) {
      setEditedText(comments[type]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                3 Phiên Bản Nhận Xét Sư Phạm
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Học sinh: <span className="font-semibold text-slate-700 dark:text-slate-200">{student.fullName}</span> (#{student.studentNumber} • {student.teamName || 'Tổ'}) • {student.currentWeekScore}đ ({student.rankCategory})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Thời gian nhận xét:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-none"
              >
                <option value={`Tuần ${selectedWeek}`}>Tuần {selectedWeek}</option>
                <option value="Tháng này">Tháng này</option>
                <option value="Học kỳ 1">Học kỳ 1</option>
                <option value="Đợt thi đua">Đợt thi đua cao điểm</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'AI đang soạn thảo 3 phương án...' : 'Tạo 3 Phương Án Bằng AI'}</span>
            </button>
          </div>

          {/* 3 Options Display */}
          {comments && (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Chọn phiên bản bạn ưng ý nhất:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Ngắn gọn */}
                <div
                  onClick={() => handleSelectType('concise')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedType === 'concise'
                      ? 'border-violet-500 ring-2 ring-violet-500/30 bg-violet-50/50 dark:bg-violet-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-violet-700 dark:text-violet-300">
                      1. Ngắn gọn (1-2 câu)
                    </span>
                    {selectedType === 'concise' && (
                      <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">
                    {comments.concise}
                  </p>
                </div>

                {/* 2. Cân bằng */}
                <div
                  onClick={() => handleSelectType('balanced')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedType === 'balanced'
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      2. Cân bằng (2-3 câu)
                    </span>
                    {selectedType === 'balanced' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">
                    {comments.balanced}
                  </p>
                </div>

                {/* 3. Khích lệ */}
                <div
                  onClick={() => handleSelectType('encouraging')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedType === 'encouraging'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      3. Khích lệ (Ấm áp)
                    </span>
                    {selectedType === 'encouraging' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">
                    {comments.encouraging}
                  </p>
                </div>
              </div>

              {/* Editable Area */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-violet-500" />
                    <span>GVCN tinh chỉnh trước khi sử dụng:</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {editedText.length} ký tự
                  </span>
                </div>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                />
              </div>

              {/* Disclaimer */}
              <div className="flex items-center gap-2 p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Đây là gợi ý của AI. Thầy/Cô có toàn quyền chỉnh sửa và xác nhận trước khi lưu vào hồ sơ hoặc gửi phụ huynh.</span>
              </div>
            </div>
          )}

          {!comments && !loading && (
            <div className="text-center py-10 text-slate-400">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30 text-violet-500" />
              <p className="text-xs">Bấm nút "Tạo 3 Phương Án Bằng AI" để nhận ngay 3 phiên bản nhận xét sư phạm chuẩn mực.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!editedText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
