import React, { useState } from 'react';
import { SavedReport, ClassInfo } from '../../types';
import { 
  FileText, 
  Calendar, 
  Trash2, 
  Edit3, 
  Printer, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Clock, 
  Users, 
  BarChart3,
  Award
} from 'lucide-react';
import { exportReportToPDF } from '../../utils/exportUtils';

interface ReportHistoryListProps {
  reports: SavedReport[];
  classInfo: ClassInfo | null;
  teacherName?: string;
  onSelectReport: (report: SavedReport) => void;
  onDeleteReport: (reportId: string) => Promise<void>;
}

export const ReportHistoryList: React.FC<ReportHistoryListProps> = ({
  reports,
  classInfo,
  teacherName = 'Giáo viên Chủ nhiệm',
  onSelectReport,
  onDeleteReport
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtered reports
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.period.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || r.type === filterType;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCopy = (r: SavedReport) => {
    navigator.clipboard.writeText(`${r.title}\n\n${r.content}`);
    setCopiedId(r.reportId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (r: SavedReport) => {
    if (!window.confirm(`Thầy/Cô có chắc chắn muốn xóa bản báo cáo "${r.title}"?`)) return;
    setDeletingId(r.reportId);
    try {
      await onDeleteReport(r.reportId);
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm báo cáo theo tiêu đề, tuần, kỳ..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">Tất cả loại báo cáo</option>
            <option value="weekly">Báo cáo tuần</option>
            <option value="monthly">Báo cáo tháng</option>
            <option value="semester">Báo cáo học kỳ</option>
            <option value="year">Báo cáo cuối năm</option>
          </select>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="reviewed">Đã xem xét</option>
            <option value="final">Chính thức</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map(r => (
            <div
              key={r.reportId}
              className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                      r.type === 'weekly' ? 'bg-indigo-100 text-indigo-800' :
                      r.type === 'monthly' ? 'bg-blue-100 text-blue-800' :
                      r.type === 'semester' ? 'bg-purple-100 text-purple-800' :
                      'bg-amber-100 text-amber-900'
                    }`}>
                      {r.type === 'weekly' ? 'Tuần' :
                       r.type === 'monthly' ? 'Tháng' :
                       r.type === 'semester' ? 'Học kỳ' : 'Cuối năm'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {r.period}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.status === 'final' ? 'bg-emerald-100 text-emerald-800' :
                    r.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {r.status === 'final' ? 'Chính thức' : r.status === 'reviewed' ? 'Đã duyệt' : 'Bản nháp'}
                  </span>
                </div>

                <h4 className="text-sm font-black text-slate-900 line-clamp-2 leading-snug">
                  {r.title}
                </h4>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {r.content.replace(/[#*]/g, '')}
                </p>

                {/* Micro Stats */}
                {r.statistics && (
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 font-medium">
                    <span>Sĩ số: <b>{r.statistics.totalStudents || 0}</b></span>
                    <span>Điểm TB: <b className="text-indigo-600">{r.statistics.avgScore || 100}</b></span>
                    <span>Chuyên cần: <b className="text-emerald-600">{r.statistics.attendanceRate || 98}%</b></span>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(r)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    title="Sao chép nội dung"
                  >
                    {copiedId === r.reportId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => exportReportToPDF(r, classInfo, teacherName)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    title="Xuất PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSelectReport(r)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Mở xem / Sửa</span>
                  </button>

                  <button
                    onClick={() => handleDelete(r)}
                    disabled={deletingId === r.reportId}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors cursor-pointer"
                    title="Xóa báo cáo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">Không tìm thấy báo cáo nào phù hợp</p>
          <p className="text-xs text-slate-500">
            Thầy/Cô có thể tạo báo cáo mới từ các nút phía trên.
          </p>
        </div>
      )}
    </div>
  );
};
