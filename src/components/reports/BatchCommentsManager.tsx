import React, { useState, useMemo } from 'react';
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
import { 
  Sparkles, 
  Copy, 
  Check, 
  Edit2, 
  CheckCircle2, 
  Download, 
  Users, 
  User, 
  RefreshCw, 
  Filter, 
  Search,
  FileSpreadsheet,
  Award,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface BatchCommentsManagerProps {
  students: Student[];
  allWeeklyScores: WeeklyScore[];
  events: CompetitionEvent[];
  criteria: Criterion[];
  teams: Team[];
  selectedWeek: number;
}

export const BatchCommentsManager: React.FC<BatchCommentsManagerProps> = ({
  students,
  allWeeklyScores,
  events,
  criteria,
  teams,
  selectedWeek
}) => {
  const [mode, setMode] = useState<'batch' | 'individual'>('batch');

  // --- Batch State ---
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [tone, setTone] = useState<string>('Khen ngợi, chân thành và tích cực');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [batchItems, setBatchItems] = useState<BatchStudentCommentItem[]>([]);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = useState<boolean>(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  // --- Individual State ---
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.studentId || '');
  const [individualPeriod, setIndividualPeriod] = useState<string>(`Tuần ${selectedWeek}`);
  const [individualTone, setIndividualTone] = useState<string>('encouragement');
  const [individualComment, setIndividualComment] = useState<string>('');
  const [isGeneratingIndividual, setIsGeneratingIndividual] = useState<boolean>(false);
  const [copiedIndividual, setCopiedIndividual] = useState<boolean>(false);

  // Filter students for batch
  const filteredStudents = useMemo(() => {
    if (filterTeam === 'all') return students;
    return students.filter(s => s.teamId === filterTeam);
  }, [students, filterTeam]);

  // Handle generating batch comments
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

      const items: BatchStudentCommentItem[] = filteredStudents.map(st => {
        const payload = studentsPayload.find(p => p.studentId === st.studentId);
        const generated = response.find(r => r.studentId === st.studentId)?.comment || '';
        const team = teams.find(t => t.teamId === st.teamId);

        return {
          studentId: st.studentId,
          studentName: st.fullName,
          studentNumber: st.studentNumber,
          teamName: team?.teamName || 'Chưa chia tổ',
          currentScore: payload?.currentScore || 100,
          rankCategory: payload?.rankCategory || 'Tốt',
          positiveHighlights: payload?.positiveHighlights || [],
          negativeHighlights: payload?.negativeHighlights || [],
          suggestedComment: generated,
          editedComment: generated,
          status: 'generated'
        };
      });

      setBatchItems(items);
    } catch (err) {
      console.error(err);
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
    const lines = batchItems.map((item, idx) => 
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

  const handleCopyIndividual = () => {
    navigator.clipboard.writeText(individualComment);
    setCopiedIndividual(true);
    setTimeout(() => setCopiedIndividual(false), 2000);
  };

  return (
    <div className="space-y-6">
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
            <span>Tạo nhận xét hàng loạt ({filteredStudents.length} HS)</span>
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

        <div className="text-xs text-slate-500 font-medium px-3 hidden sm:block">
          Dữ liệu thi đua: Tuần {selectedWeek}
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
                  BẢNG ĐIỀU KHIỂN NHẬN XÉT HÀNG LOẠT
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI tạo nhận xét riêng biệt dựa trên điểm số và sự kiện thực tế của từng em. Không nói chung chung.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateBatch}
                  disabled={isGeneratingBatch}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isGeneratingBatch ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingBatch ? 'Đang tạo nhận xét...' : '✨ Tạo nhận xét hàng loạt'}</span>
                </button>
              </div>
            </div>

            {/* Filter & Tone Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Phạm vi nhận xét:
                </label>
                <select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="all">Tất cả học sinh ({students.length} em)</option>
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
          {batchItems.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Table Top Actions */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800">
                    Đã tạo nhận xét: {batchItems.length} học sinh
                  </span>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                    {batchItems.filter(b => b.status === 'approved').length} đã duyệt
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApproveAll}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Duyệt tất cả</span>
                  </button>

                  <button
                    onClick={handleCopyAllBatch}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBatch ? 'Đã chép tất cả!' : 'Sao chép toàn bộ'}</span>
                  </button>

                  <button
                    onClick={handleExportBatchExcel}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
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
                      <th className="py-2.5 px-3 w-40">Học sinh</th>
                      <th className="py-2.5 px-3 w-28">Điểm & Xếp loại</th>
                      <th className="py-2.5 px-3">Nhận xét của GVCN (Nhấn để chỉnh sửa)</th>
                      <th className="py-2.5 px-3 w-24 text-center">Trạng thái</th>
                      <th className="py-2.5 px-3 w-28 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchItems.map((item, index) => {
                      const isEditing = editingStudentId === item.studentId;
                      return (
                        <tr key={item.studentId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-medium">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{item.studentName}</div>
                            <div className="text-[11px] text-slate-500">{item.teamName}</div>
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
                                  className="w-full bg-white border border-indigo-400 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => setEditingStudentId(null)}
                                    className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Xong
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                onClick={() => setEditingStudentId(item.studentId)}
                                className="cursor-pointer group flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-white hover:shadow-xs transition-all border border-transparent hover:border-slate-200"
                              >
                                <p className="text-slate-800 leading-relaxed">
                                  {item.editedComment}
                                </p>
                                <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'modified'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.status === 'approved' ? 'Đã duyệt' : item.status === 'modified' ? 'Đã sửa' : 'Dự thảo'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleApproveItem(item.studentId)}
                                className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                title="Duyệt nhận xét này"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCopySingle(item.studentId, item.editedComment)}
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                                title="Sao chép nhận xét"
                              >
                                {copiedRowId === item.studentId ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleRegenerateSingle(item)}
                                className="p-1.5 rounded-md hover:bg-indigo-50 text-indigo-600 transition-colors cursor-pointer"
                                title="Tạo lại nhận xét bằng AI"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
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
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-800">
                Chưa có dữ liệu nhận xét hàng loạt
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Nhấn nút <span className="font-bold text-indigo-600">"Tạo nhận xét hàng loạt"</span> ở trên để AI tự động phân tích điểm và vi phạm/thành tích của {filteredStudents.length} học sinh rồi sinh nhận xét.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: INDIVIDUAL COMMENT */}
      {mode === 'individual' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              NHẬN XÉT CHI TIẾT TỪNG HỌC SINH
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tạo nhận xét cá nhân hóa phục vụ sổ liên lạc điện tử, phiếu nhận xét hoặc học bạ.
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

          <div className="flex justify-end">
            <button
              onClick={handleGenerateIndividual}
              disabled={isGeneratingIndividual}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingIndividual ? 'animate-spin' : ''}`} />
              <span>{isGeneratingIndividual ? 'Đang tạo nhận xét...' : '✨ Tạo nhận xét bằng AI'}</span>
            </button>
          </div>

          {individualComment && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Nội dung nhận xét (có thể sửa trực tiếp):</span>
                <button
                  onClick={handleCopyIndividual}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedIndividual ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndividual ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={individualComment}
                onChange={(e) => setIndividualComment(e.target.value)}
                className="w-full bg-slate-50 border border-indigo-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
