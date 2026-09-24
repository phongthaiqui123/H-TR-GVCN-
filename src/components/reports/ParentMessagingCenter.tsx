import React, { useState, useEffect } from 'react';
import { 
  Student, 
  WeeklyScore, 
  CompetitionEvent, 
  Criterion, 
  Team,
  MessageTemplate 
} from '../../types';
import { 
  getMessageTemplates, 
  saveMessageTemplate, 
  deleteMessageTemplate 
} from '../../services/firestoreService';
import { generateParentMessageWithAI } from '../../services/aiService';
import { 
  MessageSquare, 
  Sparkles, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Plus, 
  Send, 
  Bookmark, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen,
  Info
} from 'lucide-react';

interface ParentMessagingCenterProps {
  students: Student[];
  allWeeklyScores: WeeklyScore[];
  events: CompetitionEvent[];
  criteria: Criterion[];
  teams: Team[];
  selectedWeek: number;
  teacherId: string;
}

export const ParentMessagingCenter: React.FC<ParentMessagingCenterProps> = ({
  students,
  allWeeklyScores,
  events,
  criteria,
  teams,
  selectedWeek,
  teacherId
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'templates'>('compose');

  // Templates
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Composition State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.studentId || '');
  const [purpose, setPurpose] = useState<string>('Khen ngợi');
  const [extraNote, setExtraNote] = useState<string>('');
  const [composedMessage, setComposedMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState<boolean>(false);

  // New template modal/form
  const [showAddTemplate, setShowAddTemplate] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<any>('khen');
  const [newContent, setNewContent] = useState<string>('');
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);

  // Load templates on mount
  useEffect(() => {
    async function load() {
      setLoadingTemplates(true);
      try {
        const list = await getMessageTemplates(teacherId);
        setTemplates(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTemplates(false);
      }
    }
    load();
  }, [teacherId]);

  // Current student object
  const currentStudent = students.find(s => s.studentId === selectedStudentId) || students[0];

  // Handle compose with AI
  const handleGenerateMessage = async () => {
    if (!currentStudent) return;
    setIsGenerating(true);
    setConfirmed(false);

    try {
      const scoreEntry = allWeeklyScores.find(s => s.studentId === currentStudent.studentId && s.week === selectedWeek);
      const score = scoreEntry ? scoreEntry.finalScore : 100;
      const stEvents = events.filter(e => e.studentId === currentStudent.studentId && e.week === selectedWeek);
      const posHighlights = stEvents.filter(e => e.score > 0).map(e => e.criterionName);
      const negHighlights = stEvents.filter(e => e.score < 0).map(e => e.criterionName);

      const templateObj = templates.find(t => t.templateId === selectedTemplateId);

      const res = await generateParentMessageWithAI(
        currentStudent,
        purpose,
        selectedWeek,
        {
          currentScore: score,
          rankCategory: score >= 110 ? 'Xuất sắc' : score >= 100 ? 'Tốt' : 'Cần cố gắng',
          positiveSummary: posHighlights.join(', ') || 'Chăm ngoan, chấp hành nội quy',
          negativeSummary: negHighlights.join(', ') || 'Không có vi phạm'
        },
        extraNote ? (templateObj ? `[Mẫu tham khảo: ${templateObj.title}] ${extraNote}` : extraNote) : (templateObj ? `[Theo phong cách mẫu: ${templateObj.title}]` : undefined)
      );

      setComposedMessage(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy message to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(composedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Confirm content
  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 3000);
  };

  // Save new template
  const handleSaveNewTemplate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSavingTemplate(true);
    try {
      const saved = await saveMessageTemplate({
        teacherId,
        title: newTitle,
        category: newCategory,
        content: newContent
      });
      setTemplates(prev => [saved, ...prev]);
      setShowAddTemplate(false);
      setNewTitle('');
      setNewContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Thầy/Cô có chắc chắn muốn xóa mẫu câu này?')) return;
    try {
      await deleteMessageTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.templateId !== templateId));
    } catch (err) {
      console.error(err);
    }
  };

  // Apply template directly into message box
  const handleApplyTemplate = (tpl: MessageTemplate) => {
    if (!currentStudent) return;
    const scoreEntry = allWeeklyScores.find(s => s.studentId === currentStudent.studentId && s.week === selectedWeek);
    const score = scoreEntry ? scoreEntry.finalScore : 100;
    const rankCategory = score >= 110 ? 'Xuất sắc' : score >= 100 ? 'Tốt' : 'Cần cố gắng';

    let filled = tpl.content
      .replace(/{studentName}/g, currentStudent.fullName)
      .replace(/{currentScore}/g, score.toString())
      .replace(/{rankCategory}/g, rankCategory)
      .replace(/{week}/g, selectedWeek.toString());

    setComposedMessage(filled);
    setActiveTab('compose');
  };

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'compose'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Soạn tin nhắn phụ huynh</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Thư viện câu mẫu GVCN ({templates.length})</span>
          </button>
        </div>

        {activeTab === 'templates' && (
          <button
            onClick={() => setShowAddTemplate(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm mẫu mới</span>
          </button>
        )}
      </div>

      {/* TAB 1: COMPOSE MESSAGE */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              THIẾT LẬP THÔNG TIN TIN NHẮN
            </h3>

            {/* Select Student */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                1. Chọn học sinh nhận tin:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                {students.map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.studentNumber}. {s.fullName} ({teams.find(t => t.teamId === s.teamId)?.teamName || 'Tổ'})
                  </option>
                ))}
              </select>
            </div>

            {/* 5 Purposes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                2. Mục đích gửi tin:
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'Khen ngợi', label: '🏆 Khen ngợi thành tích xuất sắc' },
                  { id: 'Thông báo tiến bộ', label: '📈 Thông báo tiến bộ sau rèn luyện' },
                  { id: 'Nhắc nhở', label: '⚠️ Nhắc nhở nề nếp / giờ giấc nhẹ nhàng' },
                  { id: 'Đề nghị phối hợp', label: '🤝 Đề nghị phụ huynh cùng đồng hành' },
                  { id: 'Cập nhật tuần', label: '📅 Cập nhật tổng kết tuần định kỳ' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPurpose(p.id)}
                    className={`px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer border ${
                      purpose === p.id
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Select from template library */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                3. Phong cách mẫu tham khảo (tùy chọn):
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              >
                <option value="">-- Để AI tự do soạn thảo chuẩn mực --</option>
                {templates.map(t => (
                  <option key={t.templateId} value={t.templateId}>
                    [{t.category.toUpperCase()}] {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Extra notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                4. Lời dặn bổ sung từ GVCN (tùy chọn):
              </label>
              <textarea
                rows={2}
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder="Ví dụ: Nhắc em nhớ đem màu vẽ thứ Hai; biểu dương em xung phong lau bảng..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleGenerateMessage}
              disabled={isGenerating}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Đang tạo tin nhắn...' : '✨ Soạn tin nhắn bằng AI'}</span>
            </button>
          </div>

          {/* Message Preview Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    BẢN XEM TRƯỚC TIN NHẮN (SMS / ZALO)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Học sinh: {currentStudent?.fullName} • Tuần {selectedWeek}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    disabled={!composedMessage}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã sao chép!' : 'Sao chép tin nhắn'}</span>
                  </button>

                  <button
                    onClick={handleConfirm}
                    disabled={!composedMessage}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{confirmed ? 'Đã xác nhận!' : 'Xác nhận nội dung'}</span>
                  </button>
                </div>
              </div>

              {/* Message bubble */}
              {composedMessage ? (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 relative">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>Tin nhắn gửi Phụ huynh em {currentStudent?.fullName}:</span>
                    </div>
                    <textarea
                      rows={8}
                      value={composedMessage}
                      onChange={(e) => setComposedMessage(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>Độ dài: {composedMessage.split(/\s+/).length} từ</span>
                      <span className="italic">Thầy/Cô có thể chỉnh sửa trực tiếp trước khi gửi</span>
                    </div>
                  </div>

                  {/* Safety & Pedagogical notice */}
                  <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">LƯU Ý QUAN TRỌNG VỀ PHỐI HỢP PHỤ HUYNH:</p>
                      <p className="mt-0.5 text-slate-600">
                        Ứng dụng <b>tuyệt đối không tự động gửi tin nhắn</b>. Giáo viên toàn quyền rà soát nội dung, sau đó nhấn <b>"Sao chép tin nhắn"</b> để dán vào Zalo hoặc tin nhắn SMS của phụ huynh nhằm bảo đảm tính riêng tư và đúng thẩm quyền sư phạm.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Chưa có tin nhắn được soạn</p>
                  <p className="text-xs text-slate-500">
                    Chọn học sinh và nhấn <span className="text-indigo-600 font-bold">"Soạn tin nhắn bằng AI"</span> để bắt đầu.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATE LIBRARY */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  THƯ VIỆN CÂU MẪU GVCN (MESSAGE TEMPLATES)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu trữ các cấu trúc câu mẫu mực, khích lệ và đồng hành phụ huynh.
                </p>
              </div>
            </div>

            {/* Template List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {templates.map(tpl => (
                <div 
                  key={tpl.templateId}
                  className="bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-200 hover:shadow-xs transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                      tpl.category === 'khen' ? 'bg-emerald-100 text-emerald-800' :
                      tpl.category === 'dong_vien' ? 'bg-blue-100 text-blue-800' :
                      tpl.category === 'nhac_nho' ? 'bg-amber-100 text-amber-800' :
                      tpl.category === 'phoi_hop' ? 'bg-purple-100 text-purple-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {tpl.category === 'khen' ? 'Khen ngợi' :
                       tpl.category === 'dong_vien' ? 'Động viên' :
                       tpl.category === 'nhac_nho' ? 'Nhắc nhở' :
                       tpl.category === 'phoi_hop' ? 'Phối hợp' : 'Thông báo'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleApplyTemplate(tpl)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer transition-colors"
                        title="Áp dụng mẫu này cho học sinh hiện tại"
                      >
                        Áp dụng
                      </button>
                      {!tpl.templateId.startsWith('preset_') && (
                        <button
                          onClick={() => handleDeleteTemplate(tpl.templateId)}
                          className="p-1 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors cursor-pointer"
                          title="Xóa mẫu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900">{tpl.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {tpl.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Template */}
      {showAddTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <h3 className="text-sm font-black text-slate-900">
              THÊM MẪU CÂU GVCN MỚI
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tiêu đề mẫu câu:</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ví dụ: Nhắc nhở chuyên cần đầu tuần..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Phân loại:</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="khen">Khen ngợi</option>
                <option value="dong_vien">Động viên tiến bộ</option>
                <option value="nhac_nho">Nhắc nhở nhẹ nhàng</option>
                <option value="phoi_hop">Đề nghị phối hợp</option>
                <option value="thong_bao">Thông báo định kỳ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Nội dung mẫu câu:
              </label>
              <p className="text-[11px] text-slate-400 mb-1">
                Có thể dùng biến: {"{studentName}"}, {"{currentScore}"}, {"{rankCategory}"}, {"{week}"}
              </p>
              <textarea
                rows={4}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Kính gửi Quý Phụ huynh em {studentName}..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddTemplate(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveNewTemplate}
                disabled={savingTemplate || !newTitle.trim() || !newContent.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingTemplate ? 'Đang lưu...' : 'Lưu mẫu câu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
