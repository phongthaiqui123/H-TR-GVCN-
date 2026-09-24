import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  UserCheck, 
  AlertCircle, 
  Bookmark, 
  Trash2, 
  Plus, 
  Search, 
  Filter,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { StudentObservation, ObservationCategory, ObservationSeverity } from '../../types';

interface QuickObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedStudentId?: string;
}

const CATEGORIES: Array<{ key: ObservationCategory; label: string; color: string; bg: string }> = [
  { key: 'Tích cực', label: 'Tích cực', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  { key: 'Tiến bộ', label: 'Tiến bộ', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
  { key: 'Cần theo dõi', label: 'Cần theo dõi', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  { key: 'Cần hỗ trợ', label: 'Cần hỗ trợ', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
  { key: 'Sự việc', label: 'Sự việc', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
];

const SEVERITIES: ObservationSeverity[] = ['Bình thường', 'Cần chú ý', 'Quan trọng'];

const QUICK_TAGS = [
  'Hăng hái phát biểu xây dựng bài',
  'Chủ động giúp đỡ bạn trong giờ',
  'Trực nhật sạch sẽ, đúng giờ',
  'Có tiến bộ vượt bậc so với tuần trước',
  'Quên mang đồ dùng / sách vở',
  'Nói chuyện riêng trong tiết học',
  'Đi học muộn đầu buổi',
  'Chưa hoàn thành nhiệm vụ được giao'
];

export const QuickObservationModal: React.FC<QuickObservationModalProps> = ({
  isOpen,
  onClose,
  preSelectedStudentId
}) => {
  const { students, observations, addObservation, removeObservation } = useClassData();

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(preSelectedStudentId || (students[0]?.studentId || ''));
  const [category, setCategory] = useState<ObservationCategory>('Tích cực');
  const [severity, setSeverity] = useState<ObservationSeverity>('Bình thường');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);

  const filteredObservations = useMemo(() => {
    return observations.filter(obs => {
      const matchSearch = obs.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obs.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === 'all' || obs.category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [observations, searchTerm, filterCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !selectedStudentId) return;

    const student = students.find(s => s.studentId === selectedStudentId);
    if (!student) return;

    setIsSubmitting(true);
    try {
      await addObservation({
        studentId: student.studentId,
        studentName: student.fullName,
        teamName: student.teamName || '',
        category,
        content: content.trim(),
        severity,
        date,
      });

      setContent('');
      setNotification(`Đã lưu ghi nhận cho em ${student.fullName}`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to add observation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyTag = (tag: string) => {
    if (content.includes(tag)) return;
    setContent(prev => prev ? `${prev}. ${tag}` : tag);
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Sổ Ghi Nhận Nhanh Học Sinh
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhật ký sư phạm theo dõi hành vi, sự tiến bộ & phối hợp phụ huynh
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

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Thêm ghi nhận mới</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Danh sách đã ghi nhận ({observations.length})</span>
          </button>
        </div>

        {/* Notification Toast */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-6 py-2.5 text-xs font-semibold flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'create' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Student & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Học sinh
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {students.map(s => (
                      <option key={s.studentId} value={s.studentId}>
                        #{s.studentNumber} {s.fullName} ({s.teamName || 'Chưa chia tổ'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Ngày ghi nhận
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Row 2: Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Phân loại tính chất
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                        category === cat.key
                          ? `${cat.bg} ${cat.color} ring-2 ring-indigo-500 font-bold shadow-sm`
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Severity */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Mức độ lưu ý
                </label>
                <div className="flex gap-2">
                  {SEVERITIES.map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        severity === sev
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent font-semibold shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Gợi ý nội dung nhanh
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleApplyTag(tag)}
                      className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Nội dung chi tiết sự việc / quan sát
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập chi tiết quan sát, thời điểm, thái độ hoặc giải pháp sư phạm đã trao đổi..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu ghi nhận'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên học sinh hoặc nội dung..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none"
                  >
                    <option value="all">Tất cả phân loại</option>
                    {CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {filteredObservations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Chưa có ghi nhận nào phù hợp bộ lọc.</p>
                  </div>
                ) : (
                  filteredObservations.map(obs => {
                    const catObj = CATEGORIES.find(c => c.key === obs.category);
                    return (
                      <div
                        key={obs.observationId}
                        className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {obs.studentName}
                            </span>
                            {obs.teamName && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {obs.teamName}
                              </span>
                            )}
                            <span className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${catObj?.bg} ${catObj?.color}`}>
                              {obs.category}
                            </span>
                            {obs.severity !== 'Bình thường' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800">
                                {obs.severity}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 ml-auto">
                              {obs.date}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {obs.content}
                          </p>
                        </div>
                        <button
                          onClick={() => removeObservation(obs.observationId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
                          title="Xóa ghi nhận"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
