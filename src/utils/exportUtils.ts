import * as XLSX from 'xlsx';
import { 
  StudentWithScore, 
  TeamScoreSummary, 
  CompetitionEvent, 
  Criterion, 
  ClassInfo, 
  ReportStatistics,
  SavedReport
} from '../types';
import { formatDateVN } from './constants';

/**
 * EXPORT MULTI-SHEET EXCEL WORKBOOK - SECTION 23
 * 1. Tổng hợp
 * 2. Học sinh
 * 3. Điểm thi đua
 * 4. Chi tiết sự kiện
 * 5. Xếp hạng cá nhân
 * 6. Xếp hạng tổ
 */
export function exportWeeklyDataToExcel(
  classInfo: ClassInfo | null,
  week: number,
  students: StudentWithScore[],
  teamSummaries: TeamScoreSummary[],
  events: CompetitionEvent[],
  criteria: Criterion[],
  stats: ReportStatistics,
  teacherName: string = 'Giáo viên Chủ nhiệm'
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Tổng hợp
  const summaryRows = [
    ['BÁO CÁO TỔNG HỢP THI ĐUA NỀ NẾP TUẦN ' + week],
    ...(classInfo?.schoolName ? [['Trường:', classInfo.schoolName]] : []),
    ['Lớp:', classInfo?.className || 'Lớp học', 'Năm học:', classInfo?.schoolYear || '2026-2027'],
    ['GVCN:', teacherName, 'Thời gian xuất:', new Date().toLocaleDateString('vi-VN')],
    [],
    ['CHỈ SỐ CHÍNH', 'GIÁ TRỊ'],
    ['Sĩ số học sinh', stats.totalStudents],
    ['Điểm trung bình lớp', stats.avgScore],
    ['Tỷ lệ chuyên cần', `${stats.attendanceRate ?? 98}%`],
    ['Số lượt đi muộn', stats.lateCount ?? 0],
    ['Số lượt vắng', stats.absentCount ?? 0],
    ['Số học sinh tiến bộ', stats.improvedCount ?? 0],
    ['Số học sinh giảm điểm', stats.declinedCount ?? 0],
    ['Tổ dẫn đầu thi đua', stats.leadingTeam || 'Tổ 1'],
    [],
    ['TIÊU CHÍ ĐƯỢC KHEN THƯỞNG NHIỀU NHẤT'],
    ['Tên tiêu chí', 'Số lần', 'Tổng điểm'],
    ...(stats.topCriteria || []).map(c => [c.name, c.count, c.score]),
    [],
    ['TIÊU CHÍ CẦN CHẤN CHỈNH / NHẮC NHỞ'],
    ['Tên tiêu chí', 'Số lần', 'Tổng điểm trừ'],
    ...(stats.weakCriteria || []).map(c => [c.name, c.count, c.score])
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, '1. Tổng hợp');

  // Sheet 2: Học sinh
  const studentRows = [
    ['DANH SÁCH HỌC SINH & XẾP LOẠI TUẦN ' + week],
    ['STT', 'Mã định danh', 'Họ và tên', 'Giới tính', 'Tổ', 'Chức vụ', 'Điểm tuần', 'Xếp loại', 'Số sao'],
    ...students.map((s, idx) => [
      idx + 1,
      s.studentId,
      s.fullName,
      s.gender === 'female' ? 'Nữ' : 'Nam',
      s.teamName || 'Chưa phân tổ',
      s.cadreRole || 'Thành viên',
      s.currentWeekScore,
      s.rankCategory,
      s.stars
    ])
  ];
  const wsStudents = XLSX.utils.aoa_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(wb, wsStudents, '2. Học sinh');

  // Sheet 3: Điểm thi đua
  const scoreRows = [
    ['BẢNG KÊ CHI TIẾT ĐIỂM THI ĐUA TUẦN ' + week],
    ['STT', 'Họ và tên', 'Tổ', 'Điểm khởi đầu', 'Tổng điểm cộng (+)', 'Tổng điểm trừ (-)', 'Điểm cuối tuần', 'Xếp loại'],
    ...students.map((s, idx) => [
      idx + 1,
      s.fullName,
      s.teamName || '',
      100,
      s.totalPositive,
      s.totalNegative,
      s.currentWeekScore,
      s.rankCategory
    ])
  ];
  const wsScores = XLSX.utils.aoa_to_sheet(scoreRows);
  XLSX.utils.book_append_sheet(wb, wsScores, '3. Điểm thi đua');

  // Sheet 4: Chi tiết sự kiện
  const weekEvents = events.filter(e => e.week === week);
  const eventRows = [
    ['LỊCH SỬ GHI NHẬN SỰ KIỆN THI ĐUA TUẦN ' + week],
    ['STT', 'Ngày', 'Học sinh', 'Tiêu chí thi đua', 'Điểm', 'Ghi chú', 'Người chấm / Ghi nhận'],
    ...weekEvents.map((e, idx) => [
      idx + 1,
      e.date,
      e.studentName || students.find(s => s.studentId === e.studentId)?.fullName || e.studentId,
      e.criterionName,
      e.score > 0 ? `+${e.score}` : e.score,
      e.note || '',
      e.evaluatorName || 'GVCN'
    ])
  ];
  const wsEvents = XLSX.utils.aoa_to_sheet(eventRows);
  XLSX.utils.book_append_sheet(wb, wsEvents, '4. Chi tiết sự kiện');

  // Sheet 5: Xếp hạng cá nhân
  const sortedStudents = [...students].sort((a, b) => b.currentWeekScore - a.currentWeekScore);
  const rankRows = [
    ['BẢNG XẾP HẠNG CÁ NHÂN TUẦN ' + week],
    ['Hạng', 'Họ và tên', 'Tổ', 'Điểm thi đua', 'Xếp loại danh hiệu', 'Độ lệch so với tuần trước'],
    ...sortedStudents.map((s, idx) => [
      idx + 1,
      s.fullName,
      s.teamName || '',
      s.currentWeekScore,
      s.rankCategory,
      s.trend === 'up' ? `+${s.trendValue}` : s.trend === 'down' ? `-${s.trendValue}` : '0'
    ])
  ];
  const wsRanks = XLSX.utils.aoa_to_sheet(rankRows);
  XLSX.utils.book_append_sheet(wb, wsRanks, '5. Xếp hạng cá nhân');

  // Sheet 6: Xếp hạng tổ
  const sortedTeams = [...teamSummaries].sort((a, b) => b.avgScore - a.avgScore);
  const teamRows = [
    ['BẢNG XẾP HẠNG THI ĐUA CÁC TỔ TUẦN ' + week],
    ['Hạng', 'Tên tổ', 'Sĩ số', 'Điểm trung bình', 'Tổng điểm cả tổ', 'Tổng điểm cộng', 'Tổng điểm trừ'],
    ...sortedTeams.map((t, idx) => [
      idx + 1,
      t.teamName,
      t.studentCount,
      t.avgScore,
      t.totalScore,
      t.totalPositive,
      t.totalNegative
    ])
  ];
  const wsTeams = XLSX.utils.aoa_to_sheet(teamRows);
  XLSX.utils.book_append_sheet(wb, wsTeams, '6. Xếp hạng tổ');

  // Trigger download
  const filename = `Bao_Cao_Thi_Dua_${classInfo?.className || 'Lop'}_Tuan_${week}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * EXPORT CSV DATA - SECTION 24
 */
export function exportDataToCSV(
  type: 'students' | 'scores' | 'events',
  data: {
    students?: StudentWithScore[];
    events?: CompetitionEvent[];
    week?: number;
    className?: string;
  }
) {
  let headers: string[] = [];
  let rows: (string | number)[][] = [];
  let filename = 'du_lieu.csv';

  if (type === 'students' && data.students) {
    headers = ['STT', 'Ma_dinh_danh', 'Ho_va_ten', 'To', 'Diem_tuan', 'Xep_loai', 'So_sao'];
    rows = data.students.map((s, idx) => [
      idx + 1,
      s.studentId,
      `"${s.fullName}"`,
      `"${s.teamName || ''}"`,
      s.currentWeekScore,
      `"${s.rankCategory}"`,
      s.stars
    ]);
    filename = `Danh_sach_hoc_sinh_${data.className || 'lop'}_Tuan_${data.week || 1}.csv`;
  } else if (type === 'events' && data.events) {
    headers = ['STT', 'Ngay', 'Ma_hoc_sinh', 'Ten_hoc_sinh', 'Tieu_chi', 'Diem', 'Ghi_chu'];
    rows = data.events.map((e, idx) => [
      idx + 1,
      e.date,
      e.studentId,
      `"${e.studentName || ''}"`,
      `"${e.criterionName}"`,
      e.score,
      `"${(e.note || '').replace(/"/g, '""')}"`
    ]);
    filename = `Lich_su_su_kien_${data.className || 'lop'}_Tuan_${data.week || 1}.csv`;
  }

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * EXPORT TO PDF VIA PROFESSIONAL VIETNAMESE ADMINISTRATIVE PRINT DOCUMENT - SECTION 22 & 25
 * Generates an official Vietnamese administrative layout with:
 * - Quốc hiệu: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / Độc lập - Tự do - Hạnh phúc
 * - Tiêu đề Báo cáo, Lớp, Tuần/Kỳ, Năm học
 * - Bảng số liệu chuẩn xác
 * - Nội dung nhận xét, phương hướng
 * - Phần ký tên GVCN: "GIÁO VIÊN CHỦ NHIỆM (Ký và ghi rõ họ tên) [Tên GVCN]"
 */
export function exportReportToPDF(
  report: SavedReport,
  classInfo: ClassInfo | null,
  teacherName: string = 'Giáo viên Chủ nhiệm'
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vui lòng cho phép mở cửa sổ popup để xuất báo cáo PDF.');
    return;
  }

  const currentDateStr = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${report.title} - ${classInfo?.className || 'Lớp học'}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      color: #111827;
      line-height: 1.5;
      font-size: 13pt;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .header-table td {
      vertical-align: top;
    }
    .org-header {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .national-header {
      text-align: center;
    }
    .national-title {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .national-motto {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 2px;
    }
    .motto-line {
      width: 140px;
      height: 1px;
      background: #000;
      margin: 4px auto 0;
    }
    .report-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 25px;
      margin-bottom: 5px;
    }
    .report-subtitle {
      text-align: center;
      font-size: 12pt;
      font-style: italic;
      margin-bottom: 25px;
    }
    .section-heading {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 15px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 15px 0;
      font-size: 12pt;
    }
    .stats-table th, .stats-table td {
      border: 1px solid #333;
      padding: 6px 8px;
      text-align: left;
    }
    .stats-table th {
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: center;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .content-body {
      white-space: pre-wrap;
      text-align: justify;
      margin-bottom: 20px;
      font-size: 12.5pt;
    }
    .signature-container {
      width: 100%;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .signature-table {
      width: 100%;
      border-collapse: collapse;
    }
    .signature-box {
      width: 50%;
      text-align: center;
      vertical-align: top;
    }
    .signature-date {
      font-style: italic;
      margin-bottom: 4px;
    }
    .signature-role {
      font-weight: bold;
      text-transform: uppercase;
    }
    .signature-note {
      font-size: 10pt;
      font-style: italic;
      color: #4b5563;
      margin-top: 2px;
      margin-bottom: 60px;
    }
    .signature-name {
      font-weight: bold;
      font-size: 13pt;
    }
    @media print {
      body {
        margin: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <!-- Header: Quốc hiệu tiêu ngữ -->
  <table class="header-table">
    <tr>
      <td style="width: 45%;" class="org-header">
        ${classInfo?.schoolName ? classInfo.schoolName.toUpperCase() : 'TRƯỜNG PHỔ THÔNG'}<br>
        LỚP: ${classInfo?.className || 'LỚP HỌC'}<br>
        <span style="font-weight: normal; font-size: 11pt;">Năm học: ${classInfo?.schoolYear || '2026-2027'}</span>
      </td>
      <td style="width: 55%;" class="national-header">
        <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="national-motto">Độc lập - Tự do - Hạnh phúc</div>
        <div class="motto-line"></div>
      </td>
    </tr>
  </table>

  <!-- Title -->
  <div class="report-title">${report.title}</div>
  <div class="report-subtitle">
    Kỳ báo cáo: ${report.period} | Thời gian lập: ngày ${currentDateStr}
  </div>

  <!-- Bảng số liệu thống kê nhanh -->
  ${report.statistics ? `
  <div class="section-heading">I. SỐ LIỆU TỔNG HỢP NỀ NẾP & THI ĐUA</div>
  <table class="stats-table">
    <tr>
      <th style="width: 10%;">STT</th>
      <th style="width: 60%;">Chỉ số thi đua</th>
      <th style="width: 30%;">Số liệu thực tế</th>
    </tr>
    <tr>
      <td class="text-center">1</td>
      <td>Sĩ số học sinh</td>
      <td class="text-center"><b>${report.statistics.totalStudents || 0}</b> học sinh</td>
    </tr>
    <tr>
      <td class="text-center">2</td>
      <td>Điểm trung bình thi đua</td>
      <td class="text-center"><b>${report.statistics.avgScore || 100}</b> điểm</td>
    </tr>
    <tr>
      <td class="text-center">3</td>
      <td>Tỷ lệ chuyên cần</td>
      <td class="text-center"><b>${report.statistics.attendanceRate || 98}%</b></td>
    </tr>
    <tr>
      <td class="text-center">4</td>
      <td>Số học sinh tiến bộ so với kỳ trước</td>
      <td class="text-center"><b>${report.statistics.improvedCount || 0}</b> học sinh</td>
    </tr>
    <tr>
      <td class="text-center">5</td>
      <td>Tổ dẫn đầu phong trào thi đua</td>
      <td class="text-center"><b>${report.statistics.leadingTeam || 'Tổ 1'}</b></td>
    </tr>
  </table>
  ` : ''}

  <!-- Nội dung báo cáo chi tiết -->
  <div class="section-heading">II. NỘI DUNG ĐÁNH GIÁ CHI TIẾT</div>
  <div class="content-body">${report.content}</div>

  <!-- Nhận xét của GVCN nếu có -->
  ${report.teacherNotes ? `
  <div class="section-heading">III. Ý KIẾN VÀ LỜI DẶN DÒ CỦA GIÁO VIÊN CHỦ NHIỆM</div>
  <div class="content-body" style="font-style: italic;">${report.teacherNotes}</div>
  ` : ''}

  <!-- Chữ ký GVCN -->
  <div class="signature-container">
    <table class="signature-table">
      <tr>
        <td class="signature-box">
          <div class="signature-role">BAN GIÁM HIỆU DUYỆT</div>
          <div class="signature-note">(Ký và đóng dấu)</div>
        </td>
        <td class="signature-box">
          <div class="signature-date">Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</div>
          <div class="signature-role">GIÁO VIÊN CHỦ NHIỆM</div>
          <div class="signature-note">(Ký và ghi rõ họ tên)</div>
          <div class="signature-name">${teacherName}</div>
        </td>
      </tr>
    </table>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
