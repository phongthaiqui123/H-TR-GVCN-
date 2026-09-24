import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Phone, 
  MessageCircle, 
  Edit3, 
  ShieldCheck, 
  HeartHandshake
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { StudentWithScore } from '../../types';

interface DraftParentMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentWithScore | null;
}

const MESSAGE_CATEGORIES = [
  { id: 'positive_record', label: 'Ghi nhận tích cực', desc: 'Khen ngợi nề nếp tốt, phát biểu hăng hái' },
  { id: 'progress_update', label: 'Thông báo tiến bộ', desc: 'Biểu dương sự nỗ lực và tiến bộ tuần này' },
  { id: 'gentle_reminder', label: 'Nhắc nhở nhẹ nhàng', desc: 'Phối hợp giờ giấc hoặc chuẩn bị bài' },
  { id: 'discuss_more', label: 'Cần trao đổi thêm', desc: 'Hẹn phụ huynh gọi điện trao đổi' },
  { id: 'invitation', label: 'Mời gặp trực tiếp', desc: 'Mời phụ huynh đến trường trao đổi' },
];

export const DraftParentMessageModal: React.FC<DraftParentMessageModalProps> = ({
  isOpen,
  onClose,
  student
}) => {
  const { currentClass, teacherName, selectedWeek } = useClassData();
  const [category, setCategory] = useState<string>('progress_update');
  const [customNote, setCustomNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !student) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gemini/draft-parent-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: {
            studentId: student.studentId,
            fullName: student.fullName,
            className: currentClass?.className || 'Lớp học',
          },
          category,
          teacherName,
          customNote,
          stats: {
            currentScore: student.currentWeekScore,
            rankCategory: student.rankCategory,
          }
        })
      });

      if (!response.ok) throw new Error('Không thể tạo tin nhắn');
      const data = await response.json();
      setMessageText(data.draft || '');
    } catch (err) {
      console.error('Failed to draft message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
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
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Dự Thảo Tin Nhắn Phụ Huynh
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gửi phụ huynh em: <span className="font-semibold text-slate-700 dark:text-slate-200">{student.fullName}</span> (Lớp {currentClass?.className || ''})
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
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Mục đích tin nhắn:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MESSAGE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    category === cat.id
                      ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/30 ring-2 ring-teal-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <p className={`text-xs font-bold ${category === cat.id ? 'text-teal-700 dark:text-teal-300' : 'text-slate-800 dark:text-slate-200'}`}>
                    {cat.label}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {cat.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Teacher Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ghi chú thêm từ Thầy/Cô (nếu có):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="VD: Em hay quên vở bài tập thứ ba, Thầy/Cô xin phép gọi vào 19h tối nay..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action Generate */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'AI đang soạn thảo tin nhắn sư phạm...' : 'AI Soạn Tin Nhắn'}</span>
          </button>

          {/* Result Textarea */}
          {messageText && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-teal-500" />
                  <span>Nội dung tin nhắn (GVCN có thể chỉnh sửa trực tiếp):</span>
                </label>
                <span className="text-[11px] text-slate-400">{messageText.length} ký tự</span>
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-teal-500 outline-none resize-none"
              />

              <div className="flex items-center gap-2 p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Quy tắc bảo mật: Tin nhắn chỉ được gửi khi Thầy/Cô trực tiếp copy và gửi qua Zalo/SMS cá nhân. Hệ thống không tự động gửi.</span>
              </div>
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

          <button
            onClick={handleCopy}
            disabled={!messageText.trim()}
            className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Đã sao chép tin nhắn' : 'Sao chép tin nhắn'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
