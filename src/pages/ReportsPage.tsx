import React, { useState, useEffect, useMemo } from 'react';
import { useClassData } from '../hooks/useClassData';
import { useAuth } from '../hooks/useAuth';
import { 
  SavedReport, 
  ReportType, 
  ReportStatistics 
} from '../types';
import { 
  getReportsByClass, 
  saveReport, 
  deleteReport 
} from '../services/firestoreService';
import { 
  FileText, 
  Sparkles, 
  Calendar, 
  BarChart2, 
  GraduationCap, 
  School, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  Users, 
  MessageSquare, 
  History, 
  Plus, 
  FileSpreadsheet,
  ArrowLeft,
  Award,
  CheckCircle2
} from 'lucide-react';
import { ReportGenerationModal } from '../components/reports/ReportGenerationModal';
import { ReportPreviewEditor } from '../components/reports/ReportPreviewEditor';
import { BatchCommentsManager } from '../components/reports/BatchCommentsManager';
import { ParentMessagingCenter } from '../components/reports/ParentMessagingCenter';
import { ReportHistoryList } from '../components/reports/ReportHistoryList';
import { exportWeeklyDataToExcel, exportDataToCSV } from '../utils/exportUtils';
import { calculateWeeklyReportStatistics } from '../utils/reportCalculations';

export const ReportsPage: React.FC = () => {
  const { 
    currentClass, 
    selectedWeek, 
    students, 
    studentsWithScores, 
    teamSummaries, 
    events, 
    criteria, 
    teams, 
    allWeeklyScores,
    teacherName
  } = useClassData();

  const teacherId = currentClass?.teacherId || '';

  const { roleSession } = useAuth();
  const isTeamLeader = roleSession?.category === 'to_truong';
  const myTeamName = roleSession?.teamName || 'Tổ 1';

  // Scoped data for team leader
  const scopedStudents = useMemo(() => {
    if (!isTeamLeader) return students;
    return students.filter(s => s.teamName === myTeamName);
  }, [students, isTeamLeader, myTeamName]);

  const scopedStudentsWithScores = useMemo(() => {
    if (!isTeamLeader) return studentsWithScores;
    return studentsWithScores.filter(s => s.teamName === myTeamName);
  }, [studentsWithScores, isTeamLeader, myTeamName]);

  const scopedEvents = useMemo(() => {
    if (!isTeamLeader) return events;
    return events.filter(e => e.teamName === myTeamName);
  }, [events, isTeamLeader, myTeamName]);

  const scopedTeams = useMemo(() => {
    if (!isTeamLeader) return teams;
    return teams.filter(t => t.teamName === myTeamName);
  }, [teams, isTeamLeader, myTeamName]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'editor' | 'batch_comments' | 'parent_messages' | 'history'>('editor');

  // Modal generation state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalInitialType, setModalInitialType] = useState<ReportType>('weekly');

  // Saved Reports in Firestore
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState<boolean>(true);

  // Active Working Report
  const [activeReport, setActiveReport] = useState<SavedReport | null>(null);

  // Load saved reports from Firestore on mount / class change
  useEffect(() => {
    async function loadReports() {
      if (!currentClass?.classId) return;
      setLoadingReports(true);
      try {
        const list = await getReportsByClass(currentClass.classId, teacherId);
        setSavedReports(list);

        // If there are reports and no active report is selected, load the newest one
        if (list.length > 0 && !activeReport) {
          setActiveReport(list[0]);
        } else if (!activeReport) {
          // Initialize a fresh weekly report template with 100% code-calculated statistics
          const stats = calculateWeeklyReportStatistics(
            currentClass,
            students,
            allWeeklyScores,
            selectedWeek,
            events,
            criteria,
            teams
          );
          const initialRep: SavedReport = {
            reportId: `rep_init_${Date.now()}`,
            teacherId: teacherId || 'teacher_default',
            classId: currentClass.classId,
            type: 'weekly',
            period: `Tuần ${selectedWeek}`,
            title: `BÁO CÁO CÔNG TÁC CHỦ NHIỆM TUẦN ${selectedWeek} - LỚP ${currentClass.className}`,
            content: `1. TÌNH HÌNH CHUNG CỦA LỚP\nLớp ${currentClass.className} duy trì tốt nề nếp thi đua, sĩ số đầy đủ (${stats.totalStudents} học sinh).\n\n2. KẾT QUẢ THI ĐUA VÀ CHUYÊN CẦN\nĐiểm trung bình toàn lớp đạt ${stats.avgScore} điểm. Tỷ lệ chuyên cần đạt ${stats.attendanceRate}%.\n\n3. ĐIỂM SÁNG VÀ MẶT TÍCH CỰC\nCác tổ tích cực phát biểu xây dựng bài và giữ gìn vệ sinh chung.\n\n4. CÁC TỒN TẠI VÀ VẤN ĐỀ CẦN LƯU Ý\nMột số học sinh còn quên dụng cụ học tập hoặc vào lớp sát giờ.\n\n5. TUYÊN DƯƠNG HỌC SINH TIÊU BIỂU\nBiểu dương các học sinh xuất sắc: ${stats.topStudents?.map(s => s.fullName).join(', ') || 'Cả lớp'}.\n\n6. BIỂU DƯƠNG HỌC SINH CÓ TIẾN BỘ\nGhi nhận tinh thần phấn đấu vượt bậc của các học sinh có điểm thi đua tăng trưởng.\n\n7. DANH SÁCH HỌC SINH CẦN ĐỒNG HÀNH & KẾ HOẠCH HỖ TRỢ\nGVCN trao đổi riêng để động viên và hỗ trợ kịp thời.\n\n8. ĐÁNH GIÁ PHONG TRÀO THI ĐUA CÁC TỔ\nTổ dẫn đầu thi đua tuần: ${stats.leadingTeam}.\n\n9. PHƯƠNG HƯỚNG VÀ MỤC TIÊU TRỌNG TÂM KỲ TỚI\nTiếp tục giữ vững sĩ số và nâng cao chất lượng giờ tự quản.\n\n10. BIỆN PHÁP THỰC HIỆN VÀ ĐỀ XUẤT PHỐI HỢP PHỤ HUYNH\nNhờ phụ huynh kiểm tra thời khóa biểu và sách vở của các em mỗi tối.`,
            teacherNotes: 'Tập thể lớp đã có nhiều nỗ lực tích cực trong tuần qua.',
            statistics: stats,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdByAI: false,
            status: 'draft'
          };
          setActiveReport(initialRep);
        }
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoadingReports(false);
      }
    }
    loadReports();
  }, [currentClass?.classId, teacherId]);

  // Open modal with specific type
  const handleOpenModal = (type: ReportType) => {
    setModalInitialType(type);
    setIsModalOpen(true);
  };

  // Handle report generated from modal
  const handleReportGenerated = (newReport: SavedReport) => {
    setActiveReport(newReport);
    setActiveTab('editor');
  };

  // Save report into Firestore
  const handleSaveReport = async (reportToSave: SavedReport) => {
    try {
      const saved = await saveReport({
        ...reportToSave,
        classId: currentClass?.classId || 'default',
        teacherId: teacherId || 'default'
      });
      setSavedReports(prev => {
        const filtered = prev.filter(r => r.reportId !== saved.reportId);
        return [saved, ...filtered];
      });
      setActiveReport(saved);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    try {
      await deleteReport(reportId);
      setSavedReports(prev => prev.filter(r => r.reportId !== reportId));
      if (activeReport?.reportId === reportId) {
        setActiveReport(savedReports.find(r => r.reportId !== reportId) || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export multi-sheet Excel
  const handleExportMultiSheetExcel = () => {
    if (!currentClass) return;
    const stats = activeReport?.statistics || calculateWeeklyReportStatistics(
      currentClass,
      students,
      allWeeklyScores,
      selectedWeek,
      events,
      criteria,
      teams
    );

    exportWeeklyDataToExcel(
      currentClass,
      selectedWeek,
      studentsWithScores,
      teamSummaries,
      events,
      criteria,
      stats,
      teacherName
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">
            <School className="w-4 h-4" />
            <span>GVCN SMART CLASS • HỆ THỐNG QUẢN LÝ SƯ PHẠM</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            TRUNG TÂM BÁO CÁO & PHỐI HỢP PHỤ HUYNH
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Lớp {currentClass?.className || 'Lớp học'} • Tuần {selectedWeek} • Năm học {currentClass?.schoolYear || '2026-2027'}
          </p>
        </div>

        {/* Global Export actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportMultiSheetExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Xuất file Excel đầy đủ 6 sheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel 6 Sheet</span>
          </button>

          <button
            onClick={() => exportDataToCSV('students', { students: scopedStudentsWithScores, week: selectedWeek, className: currentClass?.className })}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Xuất nhanh danh sách học sinh và điểm tuần"
          >
            <Download className="w-4 h-4" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Team Leader Active Banner */}
      {isTeamLeader && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Chế độ Tổ trưởng: Dữ liệu nhận xét, báo cáo và xuất file được giới hạn trong {myTeamName}</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-800 font-extrabold text-[11px]">
            {scopedStudents.length} học sinh
          </span>
        </div>
      )}

      {/* 4 Cards Tạo Báo Cáo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Card 1: Báo cáo tuần */}
        <div 
          onClick={() => handleOpenModal('weekly')}
          className="bg-white hover:bg-indigo-50/50 p-4 rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-900">
              {isTeamLeader ? `Báo cáo tuần ${myTeamName}` : 'Báo cáo tuần'}
            </h3>
            <p className="text-[11px] text-slate-500 leading-tight">
              {isTeamLeader ? `Tổng kết nề nếp, điểm thi đua và tuyên dương học sinh tiêu biểu của ${myTeamName}.` : 'Tổng kết nề nếp sinh hoạt lớp, xếp hạng tổ, tuyên dương và kế hoạch tuần mới.'}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-indigo-600">
            <span>Tạo báo cáo</span>
            <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>

        {/* Card 2: Báo cáo tháng */}
        <div 
          onClick={() => handleOpenModal('monthly')}
          className="bg-white hover:bg-blue-50/50 p-4 rounded-3xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-900">
              {isTeamLeader ? `Báo cáo tháng ${myTeamName}` : 'Báo cáo tháng'}
            </h3>
            <p className="text-[11px] text-slate-500 leading-tight">
              Phân tích xu hướng chuyển biến, so sánh tuần đầu vs tuần cuối, ghi nhận nỗ lực.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-600">
            <span>Tạo báo cáo</span>
            <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>

        {/* Card 3: Báo cáo học kỳ */}
        <div 
          onClick={() => {
            if (!isTeamLeader) handleOpenModal('semester');
          }}
          className={`bg-white p-4 rounded-3xl border border-slate-200 flex flex-col justify-between ${
            isTeamLeader ? 'opacity-60 cursor-not-allowed' : 'hover:bg-purple-50/50 hover:border-purple-300 hover:shadow-xs cursor-pointer group'
          }`}
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                Báo cáo học kỳ
              </h3>
              {isTeamLeader && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">GVCN</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Sơ kết công tác chủ nhiệm HK1 / HK2 nộp Ban Giám Hiệu và họp phụ huynh.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-purple-600">
            <span>{isTeamLeader ? 'Chỉ dành cho GVCN' : 'Tạo báo cáo'}</span>
            {!isTeamLeader && <span className="text-base group-hover:translate-x-1 transition-transform">→</span>}
          </div>
        </div>

        {/* Card 4: Báo cáo cuối năm */}
        <div 
          onClick={() => {
            if (!isTeamLeader) handleOpenModal('year');
          }}
          className={`bg-white p-4 rounded-3xl border border-slate-200 flex flex-col justify-between ${
            isTeamLeader ? 'opacity-60 cursor-not-allowed' : 'hover:bg-amber-50/50 hover:border-amber-300 hover:shadow-xs cursor-pointer group'
          }`}
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                Báo cáo cuối năm
              </h3>
              {isTeamLeader && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">GVCN</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Tổng kết toàn diện cả năm học: thành tích, tiến bộ vượt bậc, khen thưởng thi đua.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-700">
            <span>{isTeamLeader ? 'Chỉ dành cho GVCN' : 'Tạo báo cáo'}</span>
            {!isTeamLeader && <span className="text-base group-hover:translate-x-1 transition-transform">→</span>}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'editor'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Văn bản báo cáo hiện hành</span>
        </button>

        <button
          onClick={() => setActiveTab('batch_comments')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'batch_comments'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Nhận xét học sinh (Đơn lẻ & Hàng loạt)</span>
        </button>

        <button
          onClick={() => setActiveTab('parent_messages')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'parent_messages'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Tin nhắn phụ huynh & Mẫu câu GVCN</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử đã lưu ({savedReports.length})</span>
        </button>
      </div>

      {/* Tab Content 1: Report Document Preview & Editor */}
      {activeTab === 'editor' && (
        <div className="space-y-4">
          {activeReport ? (
            <ReportPreviewEditor
              report={activeReport}
              classInfo={currentClass}
              teacherName={teacherName}
              onUpdateReport={(updated) => setActiveReport(updated)}
              onSaveReport={handleSaveReport}
              onExportExcel={handleExportMultiSheetExcel}
            />
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-black text-slate-800">
                Chưa có bản báo cáo nào được chọn
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hãy nhấn vào một trong 4 thẻ ở trên để tạo Báo cáo tuần, tháng, học kỳ hoặc cuối năm.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Batch and Individual Comments Manager */}
      {activeTab === 'batch_comments' && (
        <BatchCommentsManager
          students={scopedStudents}
          allWeeklyScores={allWeeklyScores}
          events={scopedEvents}
          criteria={criteria}
          teams={scopedTeams}
          selectedWeek={selectedWeek}
        />
      )}

      {/* Tab Content 3: Parent Messaging Center & Template Library */}
      {activeTab === 'parent_messages' && (
        <ParentMessagingCenter
          students={scopedStudents}
          allWeeklyScores={allWeeklyScores}
          events={scopedEvents}
          criteria={criteria}
          teams={scopedTeams}
          selectedWeek={selectedWeek}
          teacherId={teacherId}
        />
      )}

      {/* Tab Content 4: History of Saved Reports */}
      {activeTab === 'history' && (
        <ReportHistoryList
          reports={isTeamLeader ? savedReports.filter(r => r.title.toLowerCase().includes(myTeamName.toLowerCase()) || r.content.toLowerCase().includes(myTeamName.toLowerCase())) : savedReports}
          classInfo={currentClass}
          teacherName={teacherName}
          onSelectReport={(rep) => {
            setActiveReport(rep);
            setActiveTab('editor');
          }}
          onDeleteReport={handleDeleteReport}
        />
      )}

      {/* Report Generation Modal */}
      <ReportGenerationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType={modalInitialType}
        classInfo={currentClass}
        teacherId={teacherId}
        selectedWeek={selectedWeek}
        students={scopedStudents}
        allWeeklyScores={allWeeklyScores}
        events={scopedEvents}
        criteria={criteria}
        teams={scopedTeams}
        onReportGenerated={handleReportGenerated}
      />
    </div>
  );
};
