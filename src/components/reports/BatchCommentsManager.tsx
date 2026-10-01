import React, { useState, useMemo, useEffect } from 'react';
import { 
  Student, 
  WeeklyScore, 
  CompetitionEvent, 
  Criterion, 
  Team,
  BatchStudentCommentItem
} from '../../types';
import { 
  generateStudentCommentWithAI, 
  generateBatchStudentCommentsWithAI 
} from '../../services/aiService';
import { useClassData } from '../../hooks/useClassData';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Edit2, 
  CheckCircle2, 
  Users, 
  User, 
  RefreshCw, 
  FileSpreadsheet,
  Save,
  CheckCircle,
  Info,
  Calendar,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface BatchCommentsManagerProps {
  students: Student[];
  allWeeklyScores: WeeklyScore[];
  events: CompetitionEvent[];
  criteria: Criterion[];
  teams: Team[];
  selectedWeek: number;
  classId?: string;
  className?: string;
  schoolName?: string;
  teacherName?: string;
}

export const BatchCommentsManager: React.FC<BatchCommentsManagerProps> = ({
  students,
  allWeeklyScores,
  events,
  criteria,
  teams,
  selectedWeek,
  classId,
  className,
  schoolName,
  teacherName: propsTeacherName
}) => {
  const { 
    currentClass, 
    teacherName, 
    studentComments, 
    studentCommentsLoading,
    saveSingleComment, 
    saveBatchComments 
  } = useClassData();

  const [mode, setMode] = useState<'batch' | 'individual'>('batch');

  // --- Batch State ---
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [tone, setTone] = useState<string>('Khen ngợi, chân thành và tích cực');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);
  const [batchItems, setBatchItems] = useState<BatchStudentCommentItem[]>([]);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = useState<boolean>(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // --- Individual State ---
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.studentId || '');
  const [individualPeriod, setIndividualPeriod] = useState<string>(`Tuần ${selectedWeek}`);
  const [individualTone, setIndividualTone] = useState<string>('encouragement');
  const [individualComment, setIndividualComment] = useState<string>('');
  const [isGeneratingIndividual, setIsGeneratingIndividual] = useState<boolean>(false);
  const [isSavingIndividual, setIsSavingIndividual] = useState<boolean>(false);
  const [copiedIndividual, setCopiedIndividual] = useState<boolean>(false);

  // Filter students for batch
  const filteredStudents = useMemo(() => {
    if (filterTeam === 'all') return students;
    return students.filter(s => s.teamId === filterTeam);
  }, [students, filterTeam]);

  // Synchronize batchItems with students and saved comments from Firestore/cache
  useEffect(() => {
    const items: BatchStudentCommentItem[] = filteredStudents.map(st => {
      const scoreEntry = allWeeklyScores.find(s => s.studentId === st.studentId && s.week === selectedWeek);
      const score = scoreEntry ? scoreEntry.finalScore : 100;
      const team = teams.find(t => t.teamId === st.teamId);
      const saved = studentComments?.[st.studentId];
      const comment = saved?.comment || '';

      return {
        studentId: st.studentId,
        studentName: st.fullName,
        studentNumber: st.studentNumber,
        teamName: team?.teamName || 'Chưa chia tổ',
        currentScore: score,
        rankCategory: score >= 110 ? 'Xuất sắc' : score >= 100 ? 'Tốt' : score >= 90 ? 'Khá' : 'Cần cố gắng',
        positiveHighlights: [],
        negativeHighlights: [],
        suggestedComment: comment,
        editedComment: comment,
        status: saved?.status === 'approved' ? 'approved' : comment ? 'modified' : 'generated'
      };
    });

    setBatchItems(items);
  }, [filteredStudents, studentComments, allWeeklyScores, selectedWeek, teams]);

  // Sync individual comment when selected student or week changes
  useEffect(() => {
    if (selectedStudentId) {
      const saved = studentComments?.[selectedStudentId];
      if (saved?.comment) {
        setIndividualComment(saved.comment);
      } else {
        setIndividualComment('');
      }
    }
  }, [selectedStudentId, studentComments, selectedWeek]);

  // Handle generating batch comments using AI
  const handleGenerateBatch = async () => {
    setIsGeneratingBatch(true);
    try {
      // Prepare rich per-student real statistics
      const studentsPayload = filteredStudents.map(st => {
        const scoreEntry = allWeeklyScores.find(s => s.studentId === st.studentId && s.week === selectedWeek);
        const score = scoreEntry ? scoreEntry.finalScore : 100;
        const stEvents = events.filter(e => e.studentId === st.studentId && e.week === selectedWeek);
        const posHighlights = stEvents.filter(e => e.score > 0).map(e => e.criterionName);
        const negHighlights = stEvents.filter(e => e.score < 0).map(e => e.criterionName);

        return {
          studentId: st.studentId,
          studentName: st.fullName,
          currentScore: score,
          rankCategory: score >= 110 ? 'Xuất sắc' : score >= 100 ? 'Tốt' : score >= 90 ? 'Khá' : 'Cần cố gắng',
          positiveHighlights: posHighlights.slice(0, 3),
          negativeHighlights: negHighlights.slice(0, 2)
        };
      });

      const response = await generateBatchStudentCommentsWithAI(
        studentsPayload,
        `Tuần ${selectedWeek}`,
        tone
      );

      setBatchItems(prev => prev.map(item => {
        const generated = response.find(r => r.studentId === item.studentId)?.comment;
        if (generated) {
          return {
            ...item,
            suggestedComment: generated,
            editedComment: generated,
            status: 'generated'
          };
        }
        return item;
      }));
    } catch (err) {
      console.error('Error generating batch comments:', err);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Inline edit comment in batch table
  const handleUpdateBatchComment = (studentId: string, newText: string) => {
    setBatchItems(prev => prev.map(item => {
      if (item.studentId === studentId) {
        return {
          ...item,
          editedComment: newText,
          status: 'modified'
        };
      }
      return item;
    }));
  };

  // Save ALL batch comments into Firestore & local storage & trigger notification
  const handleSaveAllBatch = async () => {
    const validItems = batchItems.filter(b => b.editedComment.trim());
    if (validItems.length === 0) {
      setSaveToast('Vui lòng nhập hoặc tạo nhận xét trước khi lưu!');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    setIsSavingBatch(true);
    try {
      const map: Record<string, { comment: string; status: string; studentName: string; teamName: string }> = {};
      validItems.forEach(item => {
        map[item.studentId] = {
          comment: item.editedComment.trim(),
          status: 'approved',
          studentName: item.studentName,
          teamName: item.teamName
        };
      });

      await saveBatchComments(map, teacherName || 'GVCN');
      setBatchItems(prev => prev.map(i => i.editedComment.trim() ? { ...i, status: 'approved' } : i));
      setSaveToast(`✓ Đã lưu nhận xét cho ${validItems.length} học sinh & gửi thông báo lên hệ thống thành công!`);
      setTimeout(() => setSaveToast(null), 4000);
    } catch (err) {
      console.error('Error saving all batch comments:', err);
      setSaveToast('Lỗi khi lưu nhận xét. Vui lòng thử lại!');
      setTimeout(() => setSaveToast(null), 3000);
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Save single row comment into Firestore & trigger notification
  const handleSaveSingleRow = async (item: BatchStudentCommentItem) => {
    if (!item.editedComment.trim()) return;
    try {
      await saveSingleComment(
        item.studentId,
        item.editedComment.trim(),
        'approved',
        { studentName: item.studentName, teamName: item.teamName }
      );
      setBatchItems(prev => prev.map(i => i.studentId === item.studentId ? { ...i, status: 'approved' } : i));
      setSavedRowId(item.studentId);
      setTimeout(() => setSavedRowId(null), 2500);
      setSaveToast(`✓ Đã lưu nhận xét của em ${item.studentName} & cập nhật thông báo!`);
      setTimeout(() => setSaveToast(null), 3500);
    } catch (err) {
      console.error('Error saving row comment:', err);
    }
  };

  // Approve single item
  const handleApproveItem = (studentId: string) => {
    setBatchItems(prev => prev.map(item => {
      if (item.studentId === studentId) {
        return { ...item, status: 'approved' };
      }
      return item;
    }));
  };

  // Approve all items
  const handleApproveAll = () => {
    setBatchItems(prev => prev.map(item => ({ ...item, status: 'approved' })));
  };

  // Regenerate comment for a single student
  const handleRegenerateSingle = async (item: BatchStudentCommentItem) => {
    const st = students.find(s => s.studentId === item.studentId);
    if (!st) return;

    const res = await generateStudentCommentWithAI(
      st,
      'weekly',
      'encouragement',
      selectedWeek,
      { currentScore: item.currentScore, rankCategory: item.rankCategory }
    );

    setBatchItems(prev => prev.map(i => {
      if (i.studentId === item.studentId) {
        return {
          ...i,
          suggestedComment: res,
          editedComment: res,
          status: 'generated'
        };
      }
      return i;
    }));
  };

  // Copy single comment
  const handleCopySingle = (studentId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRowId(studentId);
    setTimeout(() => setCopiedRowId(null), 2000);
  };

  // Copy entire batch list
  const handleCopyAllBatch = () => {
    const lines = batchItems.filter(i => i.editedComment.trim()).map((item, idx) => 
      `${idx + 1}. ${item.studentName} (${item.teamName}): ${item.editedComment}`
    );
    navigator.clipboard.writeText(lines.join('\n\n'));
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2500);
  };

  // Export batch comments to Excel
  const handleExportBatchExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ['DANH SÁCH NHẬN XÉT HỌC SINH - TUẦN ' + selectedWeek],
      ['STT', 'Mã HS', 'Họ và tên', 'Tổ', 'Điểm tuần', 'Xếp loại', 'Nhận xét của GVCN', 'Trạng thái'],
      ...batchItems.map((item, idx) => [
        idx + 1,
        item.studentId,
        item.studentName,
        item.teamName,
        item.currentScore,
        item.rankCategory,
        item.editedComment,
        item.status === 'approved' ? 'Đã duyệt' : item.status === 'modified' ? 'Đã chỉnh sửa' : 'Dự thảo AI'
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Nhan_xet_hoc_sinh');
    XLSX.writeFile(wb, `Nhan_Xet_Hoc_Sinh_Tuan_${selectedWeek}.xlsx`);
  };

  // Handle generating individual comment
  const handleGenerateIndividual = async () => {
    const st = students.find(s => s.studentId === selectedStudentId);
    if (!st) return;

    setIsGeneratingIndividual(true);
    try {
      const scoreEntry = allWeeklyScores.find(s => s.studentId === st.studentId && s.week === selectedWeek);
      const score = scoreEntry ? scoreEntry.finalScore : 100;
      const res = await generateStudentCommentWithAI(
        st,
        individualPeriod.toLowerCase().includes('tuần') ? 'weekly' : 'monthly',
        individualTone as any,
        selectedWeek,
        { currentScore: score, rankCategory: score >= 110 ? 'Xuất sắc' : score >= 100 ? 'Tốt' : 'Cần cố gắng' }
      );
      setIndividualComment(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingIndividual(false);
    }
  };

  // Save individual comment to Firestore & show notification
  const handleSaveIndividual = async () => {
    const st = students.find(s => s.studentId === selectedStudentId);
    if (!st || !individualComment.trim()) {
      setSaveToast('Vui lòng nhập nội dung nhận xét trước khi lưu!');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    setIsSavingIndividual(true);
    try {
      const team = teams.find(t => t.teamId === st.teamId);
      await saveSingleComment(
        st.studentId,
        individualComment.trim(),
        'approved',
        { 
          studentName: st.fullName, 
          teamName: team?.teamName,
          period: individualPeriod
        }
      );
      setSaveToast(`✓ Đã lưu nhận xét cho em ${st.fullName} & gửi thông báo thành công!`);
      setTimeout(() => setSaveToast(null), 4000);
    } catch (err) {
      console.error('Error saving individual comment:', err);
      setSaveToast('Lỗi khi lưu nhận xét cá nhân!');
      setTimeout(() => setSaveToast(null), 3000);
    } finally {
      setIsSavingIndividual(false);
    }
  };

  const handleCopyIndividual = () => {
    navigator.clipboard.writeText(individualComment);
    setCopiedIndividual(true);
    setTimeout(() => setCopiedIndividual(false), 2000);
  };

  const filledCount = batchItems.filter(b => b.editedComment.trim()).length;
  const approvedCount = batchItems.filter(b => b.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {saveToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-md shadow-emerald-100 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSaveToast(null)} 
            className="text-emerald-700 hover:text-emerald-900 text-sm font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMode('batch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              mode === 'batch'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Nhận xét các thành viên lớp ({filteredStudents.length} HS)</span>
          </button>

          <button
            onClick={() => setMode('individual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              mode === 'individual'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Nhận xét từng học sinh</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium px-3 hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Dữ liệu Tuần {selectedWeek} • Đã lưu {approvedCount}/{students.length} nhận xét</span>
        </div>
      </div>

      {/* MODE 1: BATCH COMMENTS */}
      {mode === 'batch' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  BẢNG ĐIỀU KHIỂN & NHẬP NHẬN XÉT CÁC THÀNH VIÊN LỚP
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhập nhận xét trực tiếp vào bảng hoặc bấm "Tạo nhận xét hàng loạt" bằng AI. Nhận xét sau khi lưu sẽ tự động đồng bộ và hiển thị lên thông báo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateBatch}
                  disabled={isGeneratingBatch}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isGeneratingBatch ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingBatch ? 'AI đang soạn thảo...' : '✨ Tạo nhận xét hàng loạt'}</span>
                </button>

                <button
                  onClick={handleSaveAllBatch}
                  disabled={isSavingBatch || filledCount === 0}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title="Lưu tất cả nhận xét vào cơ sở dữ liệu và gửi thông báo"
                >
                  <Save className={`w-4 h-4 ${isSavingBatch ? 'animate-spin' : ''}`} />
                  <span>{isSavingBatch ? 'Đang lưu...' : `💾 Lưu tất cả nhận xét (${filledCount} HS)`}</span>
                </button>
              </div>
            </div>

            {/* Filter & Tone Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Phạm vi nhận xét theo tổ:
                </label>
                <select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="all">Tất cả thành viên trong lớp ({students.length} em)</option>
                  {teams.map(t => (
                    <option key={t.teamId} value={t.teamId}>
                      {t.teamName} ({students.filter(s => s.teamId === t.teamId).length} em)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Phong cách nhận xét sư phạm:
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="Khen ngợi, chân thành và tích cực">Khen ngợi, chân thành và khích lệ</option>
                  <option value="Động viên tiến bộ và định hướng giải pháp">Động viên tiến bộ & định hướng giải pháp</option>
                  <option value="Chuẩn mực học bạ, ngắn gọn súc tích">Chuẩn mực học bạ, ngắn gọn súc tích</option>
                  <option value="Gần gũi, ấm áp, truyền cảm hứng">Gần gũi, ấm áp, truyền cảm hứng</option>
                </select>
              </div>
            </div>
          </div>

          {/* Batch Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Top Actions */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">
                  Danh sách thành viên: {batchItems.length} học sinh
                </span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                  {approvedCount} đã lưu vào hồ sơ
                </span>
                {studentCommentsLoading && (
                  <span className="text-[11px] text-indigo-600 animate-pulse font-medium">
                    (Đang đồng bộ dữ liệu...)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveAllBatch}
                  disabled={isSavingBatch || filledCount === 0}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingBatch ? 'Đang lưu...' : `Lưu tất cả (${filledCount})`}</span>
                </button>

                <button
                  onClick={handleApproveAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Duyệt tất cả</span>
                </button>

                <button
                  onClick={handleCopyAllBatch}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBatch ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>

                <button
                  onClick={handleExportBatchExcel}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border border-slate-200"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xuất Excel</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/70 text-slate-600 uppercase font-bold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3 w-44">Học sinh</th>
                    <th className="py-2.5 px-3 w-28">Điểm & Xếp loại</th>
                    <th className="py-2.5 px-3">Nhận xét của GVCN / Ban cán sự (Nhấn vào để nhập/sửa)</th>
                    <th className="py-2.5 px-3 w-28 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 w-32 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchItems.map((item, index) => {
                    const isEditing = editingStudentId === item.studentId;
                    const isSaved = item.status === 'approved' && item.editedComment.trim().length > 0;
                    return (
                      <tr key={item.studentId} className={`transition-colors ${isSaved ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-slate-50/60'}`}>
                        <td className="py-3 px-3 text-center text-slate-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{item.studentName}</div>
                          <div className="text-[11px] text-slate-500">#{item.studentNumber} • {item.teamName}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-extrabold text-slate-900">{item.currentScore}đ</span>
                          <div className="text-[11px] font-semibold text-indigo-600">{item.rankCategory}</div>
                        </td>
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <div className="space-y-1.5">
                              <textarea
                                rows={3}
                                value={item.editedComment}
                                onChange={(e) => handleUpdateBatchComment(item.studentId, e.target.value)}
                                placeholder={`Nhập lời nhận xét cho em ${item.studentName}...`}
                                className="w-full bg-white border border-indigo-400 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveSingleRow(item)}
                                  className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Lưu & Đóng</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStudentId(null)}
                                  className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold cursor-pointer"
                                >
                                  Xong
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => setEditingStudentId(item.studentId)}
                              className="cursor-pointer group flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-white hover:shadow-xs transition-all border border-transparent hover:border-slate-300 min-h-[42px]"
                            >
                              {item.editedComment.trim() ? (
                                <p className="text-slate-800 leading-relaxed font-normal">
                                  {item.editedComment}
                                </p>
                              ) : (
                                <p className="text-slate-400 italic">
                                  Chưa có nhận xét. Bấm vào đây để nhập nhận xét cho em {item.studentName}...
                                </p>
                              )}
                              <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            isSaved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.status === 'modified'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isSaved ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Đã lưu</span>
                              </>
                            ) : item.editedComment.trim() ? (
                              <span>Chưa lưu</span>
                            ) : (
                              <span>Chưa nhập</span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Save Single Row */}
                            <button
                              type="button"
                              onClick={() => handleSaveSingleRow(item)}
                              disabled={!item.editedComment.trim()}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-30 ${
                                savedRowId === item.studentId
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800'
                              }`}
                              title="Lưu nhận xét của học sinh này vào hồ sơ và thông báo"
                            >
                              {savedRowId === item.studentId ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </button>

                            {/* Copy single */}
                            <button
                              type="button"
                              onClick={() => handleCopySingle(item.studentId, item.editedComment)}
                              disabled={!item.editedComment.trim()}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer disabled:opacity-30"
                              title="Sao chép nhận xét"
                            >
                              {copiedRowId === item.studentId ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            {/* Regenerate AI */}
                            <button
                              type="button"
                              onClick={() => handleRegenerateSingle(item)}
                              className="p-1.5 rounded-md hover:bg-violet-50 text-violet-600 transition-colors cursor-pointer"
                              title="Tạo lại nhận xét bằng AI"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: INDIVIDUAL COMMENT */}
      {mode === 'individual' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              NHẬN XÉT CHI TIẾT TỪNG THÀNH VIÊN LỚP
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Soạn và lưu lời nhận xét chi tiết phục vụ sổ liên lạc điện tử, phiếu nhận xét hoặc học bạ. Kết quả lưu sẽ hiển thị lên thông báo của hệ thống.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Chọn học sinh:
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

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Thời gian nhận xét:
              </label>
              <select
                value={individualPeriod}
                onChange={(e) => setIndividualPeriod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                <option value={`Tuần ${selectedWeek}`}>Tuần {selectedWeek}</option>
                <option value="Tháng hiện tại">Tháng hiện tại</option>
                <option value="Học kỳ 1">Học kỳ 1</option>
                <option value="Học kỳ 2">Học kỳ 2</option>
                <option value="Cả năm học">Cả năm học</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Phong thái / Định hướng:
              </label>
              <select
                value={individualTone}
                onChange={(e) => setIndividualTone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="praise">🌟 Khen ngợi thành tích</option>
                <option value="encouragement">💪 Động viên tiến bộ</option>
                <option value="improvement">🎯 Định hướng khắc phục</option>
                <option value="reminder">⚠️ Nhắc nhở nề nếp</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleGenerateIndividual}
              disabled={isGeneratingIndividual}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingIndividual ? 'animate-spin' : ''}`} />
              <span>{isGeneratingIndividual ? 'Đang tạo nhận xét...' : '✨ Tạo gợi ý bằng AI'}</span>
            </button>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Nội dung nhận xét cho em {students.find(s => s.studentId === selectedStudentId)?.fullName || 'học sinh'}:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyIndividual}
                  disabled={!individualComment.trim()}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {copiedIndividual ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndividual ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={individualComment}
              onChange={(e) => setIndividualComment(e.target.value)}
              placeholder="Nhập nhận xét chi tiết về tình hình học tập, nề nếp kỷ luật, ưu điểm và điểm cần cố gắng của học sinh..."
              className="w-full bg-slate-50 border border-indigo-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Nhận xét sẽ được lưu vĩnh viễn vào hệ thống Firestore và hiển thị trong danh sách thông báo.</span>
              </div>

              <button
                type="button"
                onClick={handleSaveIndividual}
                disabled={isSavingIndividual || !individualComment.trim()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingIndividual ? 'Đang lưu...' : '💾 Lưu nhận xét vào hồ sơ & hiển thị thông báo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
