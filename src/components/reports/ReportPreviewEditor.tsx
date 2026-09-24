import React, { useState } from 'react';
import { 
  SavedReport, 
  ClassInfo, 
  ReportStatistics, 
  AiReviewResult, 
  ReportStatus 
} from '../../types';
import { 
  Save, 
  Copy, 
  Check, 
  Printer, 
  Download, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  Eye, 
  Clock, 
  Award, 
  Users, 
  BarChart3, 
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { exportReportToPDF, exportWeeklyDataToExcel, exportDataToCSV } from '../../utils/exportUtils';
import { validateReport, checkReportConsistency } from '../../utils/reportCalculations';
import { reviewReportWithAI } from '../../services/aiService';

interface ReportPreviewEditorProps {
  report: SavedReport;
  classInfo: ClassInfo | null;
  teacherName?: string;
  onUpdateReport: (updated: SavedReport) => void;
  onSaveReport: (reportToSave: SavedReport) => Promise<void>;
  onExportExcel?: () => void;
}

export const ReportPreviewEditor: React.FC<ReportPreviewEditorProps> = ({
  report,
  classInfo,
  teacherName = 'Giáo viên Chủ nhiệm',
  onUpdateReport,
  onSaveReport,
  onExportExcel
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(report.title);
  const [content, setContent] = useState(report.content);
  const [teacherNotes, setTeacherNotes] = useState(report.teacherNotes || '');
  const [status, setStatus] = useState<ReportStatus>(report.status || 'draft');

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Quality Review State
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<AiReviewResult | null>(null);

  // Structural Code-based Validation
  const validation = validateReport(title, content, report.period, classInfo?.className);
  const consistencyWarnings = checkReportConsistency(content, report.statistics);

  const handleCopy = () => {
    const fullText = `${title}\nLớp: ${classInfo?.className || ''} - Kỳ: ${report.period}\n\n${content}${teacherNotes ? `\n\nÝ KIẾN CỦA GVCN:\n${teacherNotes}` : ''}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated: SavedReport = {
        ...report,
        title,
        content,
        teacherNotes,
        status,
        updatedAt: new Date().toISOString()
      };
      onUpdateReport(updated);
      await onSaveReport(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Save report failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleAiReview = async () => {
    setReviewing(true);
    try {
      const res = await reviewReportWithAI(content, report.statistics, report.period);
      setReviewResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewing(false);
    }
  };

  const handleExportPDF = () => {
    exportReportToPDF(
      {
        ...report,
        title,
        content,
        teacherNotes
      },
      classInfo,
      teacherName
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isEditing 
                ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Chế độ xem văn bản' : '✏️ Chỉnh sửa nội dung'}</span>
          </button>

          {/* Trạng thái duyệt */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Trạng thái:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReportStatus)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="draft">Bản nháp</option>
              <option value="reviewed">Đã xem xét</option>
              <option value="final">Chính thức</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Kiểm tra báo cáo */}
          <button
            onClick={handleAiReview}
            disabled={reviewing}
            className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Kiểm tra mâu thuẫn số liệu và ngôn phong sư phạm"
          >
            <Sparkles className={`w-3.5 h-3.5 text-purple-600 ${reviewing ? 'animate-spin' : ''}`} />
            <span>{reviewing ? 'AI đang thẩm định...' : '🤖 AI kiểm tra báo cáo'}</span>
          </button>

          {/* Xuất PDF */}
          <button
            onClick={handleExportPDF}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="In hoặc lưu PDF mẫu văn bản chuẩn có chữ ký"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Xuất PDF</span>
          </button>

          {/* Xuất Excel */}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Xuất file Excel đầy đủ 6 sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          )}

          {/* Sao chép */}
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
          </button>

          {/* Lưu báo cáo */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Đang lưu...' : saveSuccess ? 'Đã lưu thành công!' : '💾 Lưu báo cáo'}</span>
          </button>
        </div>
      </div>

      {/* Validation / Inconsistency Warnings */}
      {(!validation.valid || validation.warnings.length > 0 || consistencyWarnings.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Lưu ý kiểm định chất lượng:</span>
          </div>
          {validation.errors.map((err, idx) => (
            <p key={`err-${idx}`} className="text-rose-700 font-medium">• Lỗi: {err}</p>
          ))}
          {validation.warnings.map((warn, idx) => (
            <p key={`warn-${idx}`}>• {warn}</p>
          ))}
          {consistencyWarnings.map((warn, idx) => (
            <p key={`cons-${idx}`} className="font-semibold text-amber-950">• {warn}</p>
          ))}
        </div>
      )}

      {/* AI Review Result Drawer / Box */}
      {reviewResult && (
        <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="font-black text-sm text-purple-900">
                KẾT QUẢ THẨM ĐỊNH SƯ PHẠM CỦA AI
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-700 font-medium">Điểm chuẩn mực:</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                reviewResult.score >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {reviewResult.score}/100
              </span>
            </div>
          </div>

          <p className="text-xs text-purple-950 font-medium bg-white/70 p-2.5 rounded-xl border border-purple-100">
            {reviewResult.overallAssessment}
          </p>

          {reviewResult.suggestions && reviewResult.suggestions.length > 0 ? (
            <div className="space-y-2 mt-2">
              <p className="text-xs font-bold text-purple-800">Các điểm khuyến nghị cần tối ưu:</p>
              {reviewResult.suggestions.map((sug, i) => (
                <div key={i} className="bg-white p-3 rounded-xl border border-purple-100 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span>{sug.issue}</span>
                  </div>
                  {sug.originalText && (
                    <p className="text-slate-500 italic pl-3 border-l-2 border-purple-200">
                      "{sug.originalText}"
                    </p>
                  )}
                  <p className="text-indigo-700 font-semibold pl-3">
                    💡 Đề xuất sửa: {sug.recommendation}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Không phát hiện mâu thuẫn số liệu hay câu từ tiêu cực. Báo cáo đạt chuẩn sư phạm!</span>
            </div>
          )}
        </div>
      )}

      {/* Main Document Layout: Vietnamese Official Style */}
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-6 print:border-none print:p-0">
        {/* National Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-200 text-center sm:text-left">
          <div>
            <p className="text-xs uppercase font-extrabold text-slate-700 tracking-wider">
              TRƯỜNG PHỔ THÔNG LIÊN CẤP
            </p>
            <p className="text-sm font-black text-slate-900 mt-0.5">
              LỚP: {classInfo?.className || 'LỚP HỌC'}
            </p>
            <p className="text-xs text-slate-500">
              Năm học: {classInfo?.schoolYear || '2026-2027'}
            </p>
          </div>
          <div className="sm:text-center">
            <p className="text-xs uppercase font-extrabold text-slate-900 tracking-wider">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="w-24 h-0.5 bg-slate-400 mx-auto mt-1"></div>
          </div>
        </div>

        {/* Report Title & Metadata */}
        <div className="text-center space-y-2 py-2">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-center text-lg sm:text-xl font-black text-slate-900 border border-indigo-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
            />
          ) : (
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
              {title}
            </h2>
          )}
          <p className="text-xs text-slate-500 italic">
            Kỳ báo cáo: {report.period} • Lập ngày {new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>

        {/* Quick Statistics Overview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="text-center">
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Sĩ số</p>
            <p className="text-lg font-black text-slate-900">{report.statistics.totalStudents || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Điểm TB</p>
            <p className="text-lg font-black text-indigo-600">{report.statistics.avgScore || 100}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Chuyên cần</p>
            <p className="text-lg font-black text-emerald-600">{report.statistics.attendanceRate || 98}%</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Tổ dẫn đầu</p>
            <p className="text-sm font-black text-amber-600 truncate">{report.statistics.leadingTeam || 'Tổ 1'}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-extrabold text-slate-600 tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            NỘI DUNG ĐÁNH GIÁ VÀ BÁO CÁO CHI TIẾT
          </h3>
          {isEditing ? (
            <textarea
              rows={18}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs sm:text-sm text-slate-800 leading-relaxed font-sans border border-indigo-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Nhập nội dung báo cáo..."
            />
          ) : (
            <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans bg-white p-2 rounded-xl">
              {content}
            </div>
          )}
        </div>

        {/* Teacher Notes / Comments section */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h3 className="text-xs uppercase font-extrabold text-slate-600 tracking-wider">
            Ý KIẾN VÀ LỜI DẶN DÒ CỦA GIÁO VIÊN CHỦ NHIỆM
          </h3>
          {isEditing ? (
            <textarea
              rows={4}
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              className="w-full text-xs sm:text-sm text-slate-800 border border-indigo-200 rounded-2xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Nhập lời dặn dò, lưu ý phụ huynh hoặc cam kết của lớp..."
            />
          ) : (
            <p className="text-xs sm:text-sm text-slate-700 italic bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl">
              {teacherNotes || 'Chưa có ghi chú bổ sung.'}
            </p>
          )}
        </div>

        {/* Official Signature Section */}
        <div className="pt-8 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs uppercase font-bold text-slate-800">BAN GIÁM HIỆU DUYỆT</p>
            <p className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
            <div className="h-16"></div>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 italic">
              Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
            </p>
            <p className="text-xs uppercase font-bold text-slate-900 mt-0.5">GIÁO VIÊN CHỦ NHIỆM</p>
            <p className="text-[11px] text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
            <div className="h-12 flex items-end justify-center">
              <span className="font-extrabold text-slate-800 text-sm border-t border-slate-300 px-6 pt-1">
                {teacherName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
