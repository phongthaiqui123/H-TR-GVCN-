import React, { useState, useMemo } from 'react';
import { useClassData } from '../../hooks/useClassData';
import { Modal } from '../ui/Modal';
import { 
  KeyRound, 
  Sparkles, 
  Download, 
  Printer, 
  Search, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  ShieldCheck, 
  UserCheck, 
  AlertCircle,
  FileSpreadsheet,
  Lock,
  Unlock,
  ChevronDown,
  Edit2,
  Users
} from 'lucide-react';
import { StudentAccount } from '../../types';
import { useToast } from '../ui/Toast';

interface StudentAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedStudentIds?: string[];
}

export const StudentAccountsModal: React.FC<StudentAccountsModalProps> = ({
  isOpen,
  onClose,
  initialSelectedStudentIds = [],
}) => {
  const { 
    currentClass, 
    students, 
    teacherName, 
    studentAccounts, 
    batchGenerateStudentAccounts, 
    createOrUpdateStudentAccount,
    updateStudentAccountUsername,
    syncStudentAccountsWithActualRoles,
    toggleStudentAccountStatus,
    resetStudentAccountPassword
  } = useClassData();

  const { showToast } = useToast();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Generator settings
  const [showConfig, setShowConfig] = useState(false);
  const [format, setFormat] = useState<'class_stt' | 'hs_stt' | 'name_stt'>('class_stt');
  const [defaultPassword, setDefaultPassword] = useState('123456');
  const [customPrefix, setCustomPrefix] = useState('');
  const [targetScope, setTargetScope] = useState<'all' | 'missing' | 'selected'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncingRoles, setIsSyncingRoles] = useState(false);

  // Password visibility
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit single account state
  const [editingAccount, setEditingAccount] = useState<StudentAccount | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'to_truong' | 'to_pho' | 'lop_truong' | 'lop_pho' | 'bi_thu' | 'thanh_vien'>('thanh_vien');
  const [editCanGrade, setEditCanGrade] = useState(false);

  // Print mode
  const [isPrintPreview, setIsPrintPreview] = useState(false);

  const classNameStr = currentClass?.className || 'Lớp 11A9';
  const defaultPrefix = classNameStr.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Merge students with their accounts
  const mergedList = useMemo(() => {
    return students.map(std => {
      const account = studentAccounts.find(a => a.studentId === std.studentId);
      const isLeader = std.isTeamLeader || std.teamRole === 'to_truong';
      const isLopTruong = std.cadreRole === 'lop_truong';
      
      return {
        student: std,
        account: account || null,
        hasAccount: !!account,
        isLeader,
        isLopTruong,
      };
    });
  }, [students, studentAccounts]);

  // Filtered list
  const filteredList = useMemo(() => {
    return mergedList.filter(item => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.student.fullName.toLowerCase().includes(q);
      const matchStt = String(item.student.studentNumber).includes(q);
      const matchUsername = item.account?.username.toLowerCase().includes(q);
      const matchTeam = item.student.teamName.toLowerCase().includes(q);
      const matchesSearch = !q || matchName || matchStt || matchUsername || matchTeam;

      // Team filter
      const matchesTeam = selectedTeamFilter === 'all' || item.student.teamName === selectedTeamFilter;

      // Status filter
      let matchesStatus = true;
      if (selectedStatusFilter === 'has_account') matchesStatus = item.hasAccount;
      else if (selectedStatusFilter === 'no_account') matchesStatus = !item.hasAccount;
      else if (selectedStatusFilter === 'leaders') matchesStatus = item.isLeader || item.account?.canGrade === true;
      else if (selectedStatusFilter === 'active') matchesStatus = item.account?.isActive === true;
      else if (selectedStatusFilter === 'inactive') matchesStatus = item.account?.isActive === false;

      return matchesSearch && matchesTeam && matchesStatus;
    });
  }, [mergedList, searchQuery, selectedTeamFilter, selectedStatusFilter]);

  const totalWithAccounts = mergedList.filter(i => i.hasAccount).length;
  const totalStudents = students.length;

  // Handle batch generate
  const handleBatchGenerate = async () => {
    setIsGenerating(true);
    try {
      let targetIds: string[] | undefined = undefined;
      if (targetScope === 'missing') {
        targetIds = mergedList.filter(i => !i.hasAccount).map(i => i.student.studentId);
      } else if (targetScope === 'selected' && initialSelectedStudentIds.length > 0) {
        targetIds = initialSelectedStudentIds;
      }

      const generated = await batchGenerateStudentAccounts({
        format,
        defaultPassword: defaultPassword.trim() || '123456',
        prefix: customPrefix.trim() || undefined,
        studentIds: targetIds,
      });

      showToast(`Đã cấp thành công ${generated.length} tài khoản cho học sinh!`, 'success');
      setShowConfig(false);
    } catch (err: any) {
      console.error('Batch generate error:', err);
      showToast('Có lỗi xảy ra khi cấp tài khoản. Vui lòng thử lại.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(`Đã sao chép: ${text}`, 'info');
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (mergedList.length === 0) return;

    const headers = ['STT', 'Ho_va_ten', 'To', 'Chuc_vu', 'Quyen_cham_diem', 'Ten_dang_nhap', 'Mat_khau', 'Trang_thai'];
    const rows = mergedList.map(item => {
      const std = item.student;
      const acc = item.account;
      const roleStr = acc?.role === 'to_truong' ? 'Tổ trưởng' : (acc?.role === 'lop_truong' ? 'Lớp trưởng' : 'Thành viên');
      const canGradeStr = acc?.canGrade ? 'Có quyền chấm' : 'Chỉ xem';
      const statusStr = acc?.isActive ? 'Hoạt động' : 'Tạm khóa';

      return [
        std.studentNumber,
        `"${std.fullName.replace(/"/g, '""')}"`,
        `"${std.teamName}"`,
        `"${roleStr}"`,
        `"${canGradeStr}"`,
        `"${acc?.username || ''}"`,
        `"${acc?.password || ''}"`,
        `"${statusStr}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Danh_sach_tai_khoan_hoc_sinh_${defaultPrefix.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất danh sách tài khoản CSV thành công!', 'success');
  };

  // Save single account edit
  const handleSaveEdit = async () => {
    if (!editingAccount) return;
    const cleanUser = editUsername.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanUser) {
      showToast('Tên đăng nhập không được để trống!', 'error');
      return;
    }

    try {
      await updateStudentAccountUsername(
        editingAccount.studentId,
        cleanUser,
        editPassword.trim() || editingAccount.password
      );

      const updated: StudentAccount = {
        ...editingAccount,
        username: cleanUser,
        password: editPassword.trim() || editingAccount.password,
        role: editRole,
        canGrade: editCanGrade,
        updatedAt: new Date().toISOString(),
      };
      await createOrUpdateStudentAccount(updated);
      showToast(`Đã cập nhật tên đăng nhập "${cleanUser}" cho ${editingAccount.fullName}!`, 'success');
      setEditingAccount(null);
    } catch (e) {
      showToast('Cập nhật thất bại. Vui lòng thử lại.', 'error');
    }
  };

  const handleSyncWithRoles = async () => {
    setIsSyncingRoles(true);
    try {
      const res = await syncStudentAccountsWithActualRoles(true);
      showToast(`Đã đồng bộ tên đăng nhập cho ${res.updatedCount} học sinh theo đúng phân quyền (Lớp trưởng, Bí thư, Tổ trưởng)!`, 'success');
    } catch (err) {
      showToast('Lỗi khi đồng bộ tên đăng nhập. Vui lòng thử lại.', 'error');
    } finally {
      setIsSyncingRoles(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấp tài khoản & Phân quyền học sinh"
      maxWidth="6xl"
    >
      <div className="space-y-5">
        {/* Header Hero Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-indigo-100 backdrop-blur-xs border border-white/10">
                  <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                  Quản lý quyền truy cập lớp học
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  {totalWithAccounts}/{totalStudents} học sinh đã có tài khoản
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Cấp tài khoản đăng nhập cho {classNameStr}
              </h2>
              <p className="text-sm text-indigo-200 mt-1 max-w-2xl">
                Giáo viên chủ nhiệm <strong className="text-white">{teacherName}</strong> có thể tạo hàng loạt tài khoản, phân quyền chấm thi đua cho Tổ trưởng, Ban cán sự và in phát phiếu cho từng học sinh.
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                id="btn-sync-roles-usernames"
                onClick={handleSyncWithRoles}
                disabled={isSyncingRoles}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Tự động đồng bộ tên đăng nhập theo thực tế chức vụ: loptruong, bithu, totruong1..."
              >
                <ShieldCheck className="w-4 h-4 text-emerald-950" />
                {isSyncingRoles ? 'Đang đồng bộ...' : '🎯 Đồng bộ tên đăng nhập theo phân quyền'}
              </button>

              <button
                id="btn-toggle-generate-config"
                onClick={() => setShowConfig(!showConfig)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm shadow-md transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-900" />
                {totalWithAccounts === 0 ? '⚡ Cấp tài khoản tự động (1 chạm)' : '⚡ Cấp lại / Tạo mới hàng loạt'}
              </button>

              <button
                id="btn-export-accounts-csv"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-xs border border-white/15 transition-colors"
                title="Tải file Excel / CSV về máy"
              >
                <Download className="w-4 h-4 text-emerald-300" />
                Xuất file
              </button>

              <button
                id="btn-print-account-cards"
                onClick={() => setIsPrintPreview(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-xs border border-white/15 transition-colors"
                title="In phiếu tài khoản để phát cho học sinh"
              >
                <Printer className="w-4 h-4 text-blue-200" />
                In phiếu
              </button>
            </div>
          </div>
        </div>

        {/* Batch Generator Drawer */}
        {showConfig && (
          <div className="p-5 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200 shadow-sm animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Cấu hình cấp tài khoản tự động cho học sinh
              </h4>
              <button 
                onClick={() => setShowConfig(false)}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Đóng lại
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* Format selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Định dạng tên đăng nhập:</label>
                <select
                  id="select-account-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  <option value="class_stt">{defaultPrefix}_01, {defaultPrefix}_02 (Khuyên dùng)</option>
                  <option value="hs_stt">hs01, hs02, hs03...</option>
                  <option value="name_stt">tuanh01, mybinh02 (Tên + STT)</option>
                </select>
                <p className="text-xs text-slate-500">Ví dụ STT 1: <code className="text-indigo-600 font-semibold">{format === 'hs_stt' ? 'hs01' : (format === 'name_stt' ? 'tuanh01' : `${defaultPrefix}_01`)}</code></p>
              </div>

              {/* Password default */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Mật khẩu ban đầu:</label>
                <div className="relative">
                  <input
                    id="input-default-password"
                    type="text"
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    placeholder="Mặc định: 123456"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden pr-8"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <p className="text-xs text-slate-500">Học sinh đăng nhập bằng mật khẩu này</p>
              </div>

              {/* Target Scope */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Đối tượng cấp:</label>
                <select
                  id="select-target-scope"
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  <option value="all">Tất cả {totalStudents} học sinh của lớp</option>
                  <option value="missing">Chỉ học sinh chưa có tài khoản ({totalStudents - totalWithAccounts})</option>
                  {initialSelectedStudentIds.length > 0 && (
                    <option value="selected">Chỉ {initialSelectedStudentIds.length} học sinh đang được chọn</option>
                  )}
                </select>
                <p className="text-xs text-slate-500">Tự động đồng bộ quyền Tổ trưởng</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-indigo-100">
              <div className="flex items-center gap-2 text-xs text-indigo-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Học sinh là <strong>Tổ trưởng</strong> sẽ được cấp quyền theo dõi & chấm điểm cho Tổ của mình.</span>
              </div>

              <button
                id="btn-confirm-generate-accounts"
                disabled={isGenerating}
                onClick={handleBatchGenerate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Đang tạo tài khoản...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Tạo & Cấp ngay
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-search-student-accounts"
              type="text"
              placeholder="Tìm tên, STT, mã đăng nhập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Team filter */}
            <select
              id="select-team-account-filter"
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              <option value="all">Tất cả các tổ</option>
              <option value="Tổ 1">Tổ 1</option>
              <option value="Tổ 2">Tổ 2</option>
              <option value="Tổ 3">Tổ 3</option>
              <option value="Tổ 4">Tổ 4</option>
            </select>

            {/* Status filter */}
            <select
              id="select-status-account-filter"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="has_account">Đã có tài khoản</option>
              <option value="no_account">Chưa có tài khoản</option>
              <option value="leaders">Tổ trưởng / Cán sự</option>
              <option value="active">Đang kích hoạt</option>
              <option value="inactive">Tạm khóa</option>
            </select>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider z-10">
                <tr>
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-3">Học sinh</th>
                  <th className="py-3 px-3">Tổ</th>
                  <th className="py-3 px-3">Tên đăng nhập</th>
                  <th className="py-3 px-3">Mật khẩu</th>
                  <th className="py-3 px-3">Quyền hạn</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      Không tìm thấy học sinh nào phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const std = item.student;
                    const acc = item.account;
                    const isCopied = copiedId === std.studentId;
                    const isRevealed = showPasswords[std.studentId];

                    return (
                      <tr 
                        key={std.studentId} 
                        className={`hover:bg-slate-50/80 transition-colors ${!acc ? 'bg-amber-50/20' : ''}`}
                      >
                        {/* STT */}
                        <td className="py-3 px-3 text-center font-medium text-slate-500 text-xs">
                          {std.studentNumber}
                        </td>

                        {/* Student Name */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">
                            {std.fullName}
                          </div>
                          <div className="text-xs text-slate-400">
                            {std.gender === 'female' ? 'Nữ' : 'Nam'}
                          </div>
                        </td>

                        {/* Team */}
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                            {std.teamName}
                          </span>
                        </td>

                        {/* Username */}
                        <td className="py-3 px-3">
                          {acc ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                                {acc.username}
                              </span>
                              <button
                                onClick={() => handleCopy(acc.username, `u_${std.studentId}`)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                title="Sao chép tên đăng nhập"
                              >
                                {copiedId === `u_${std.studentId}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 italic">
                              Chưa cấp
                            </span>
                          )}
                        </td>

                        {/* Password */}
                        <td className="py-3 px-3">
                          {acc ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                                {isRevealed ? acc.password : '••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(std.studentId)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                title={isRevealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleCopy(acc.password, `p_${std.studentId}`)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                title="Sao chép mật khẩu"
                              >
                                {copiedId === `p_${std.studentId}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Permissions & Role */}
                        <td className="py-3 px-3">
                          {acc ? (
                            acc.canGrade ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                {acc.role === 'to_truong' ? `Tổ trưởng (Chấm ${std.teamName})` : 'Cán sự (Chấm điểm)'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                Thành viên (Chỉ xem)
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">
                              {std.isTeamLeader ? 'Tổ trưởng (Chưa có nick)' : 'Thành viên'}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          {acc ? (
                            <button
                              onClick={() => toggleStudentAccountStatus(acc.accountId, !acc.isActive)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                                acc.isActive 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              }`}
                              title="Nhấn để đổi trạng thái khóa / mở"
                            >
                              {acc.isActive ? (
                                <>
                                  <Unlock className="w-3 h-3 text-emerald-600" />
                                  Mở
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 text-rose-600" />
                                  Khóa
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          {acc ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingAccount(acc);
                                  setEditUsername(acc.username);
                                  setEditPassword(acc.password);
                                  setEditRole(acc.role);
                                  setEditCanGrade(acc.canGrade);
                                }}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Chỉnh sửa tên đăng nhập, mật khẩu hoặc quyền hạn"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  await resetStudentAccountPassword(acc.accountId, '123456');
                                  showToast(`Đã đặt lại mật khẩu cho ${std.fullName} về "123456"`, 'info');
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Đặt lại mật khẩu về 123456"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                await batchGenerateStudentAccounts({
                                  studentIds: [std.studentId],
                                  format: 'class_stt',
                                  defaultPassword: '123456',
                                });
                                showToast(`Đã cấp tài khoản cho ${std.fullName}!`, 'success');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors"
                            >
                              Cấp nick
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions Footer */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">📌 Hướng dẫn đăng nhập:</span>
            <span>Học sinh truy cập trang chủ, chọn <strong>"Đăng nhập học sinh"</strong>, nhập mã và mật khẩu do Thầy/Cô cấp.</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400">Đơn vị quản lý: </span>
            <strong className="text-slate-700">{classNameStr} • GVCN {teacherName}</strong>
          </div>
        </div>
      </div>

      {/* Edit Single Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                Chỉnh sửa tài khoản: {editingAccount.fullName}
              </h4>
              <button 
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">Tên đăng nhập (Username):</label>
                  <span className="text-[11px] text-slate-400">Không dấu, viết liền</span>
                </div>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden font-semibold"
                  placeholder="Ví dụ: 11a9_loptruong, 11a9_01..."
                />
                {/* Quick suggestions based on class and team */}
                <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                  <span className="text-[10px] text-slate-400">Gợi ý nhanh:</span>
                  <button
                    type="button"
                    onClick={() => setEditUsername(`${defaultPrefix}_loptruong`)}
                    className="px-1.5 py-0.5 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 transition-colors"
                  >
                    Lớp trưởng
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUsername(`${defaultPrefix}_bithu`)}
                    className="px-1.5 py-0.5 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition-colors"
                  >
                    Bí thư
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tNum = editingAccount.teamName.replace(/[^0-9]/g, '') || '1';
                      setEditUsername(`${defaultPrefix}_totruong${tNum}`);
                    }}
                    className="px-1.5 py-0.5 text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 rounded border border-amber-200 transition-colors"
                  >
                    Tổ trưởng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const padNum = String(editingAccount.studentNumber || 1).padStart(2, '0');
                      setEditUsername(`${defaultPrefix}_${padNum}`);
                    }}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                  >
                    Mã STT ({String(editingAccount.studentNumber).padStart(2, '0')})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mật khẩu mới:</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  placeholder="Nhập mật khẩu mới..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Chức vụ cán sự:</label>
                <select
                  value={editRole}
                  onChange={(e) => {
                    const newR = e.target.value as any;
                    setEditRole(newR);
                    if (newR === 'to_truong' || newR === 'lop_truong') {
                      setEditCanGrade(true);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  <option value="thanh_vien">Thành viên</option>
                  <option value="to_truong">Tổ trưởng ({editingAccount.teamName})</option>
                  <option value="to_pho">Tổ phó ({editingAccount.teamName})</option>
                  <option value="lop_truong">Lớp trưởng</option>
                  <option value="lop_pho">Lớp phó</option>
                  <option value="bi_thu">Bí thư Chi đoàn</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCanGrade}
                    onChange={(e) => setEditCanGrade(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    Cho phép học sinh này chấm điểm thi đua
                  </span>
                </label>
                <p className="text-xs text-slate-500 ml-6 mt-0.5">
                  Nếu bật, học sinh sẽ có quyền ghi nhận điểm cộng/trừ cho các bạn trong {editingAccount.teamName}.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingAccount(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Cards Preview Modal */}
      {isPrintPreview && (
        <div className="fixed inset-0 z-70 flex flex-col bg-slate-100 animate-fade-in p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-xl p-6 mb-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Phiếu thông tin tài khoản học sinh - {classNameStr}
                </h3>
                <p className="text-xs text-slate-500">
                  In các phiếu này rồi cắt phát cho từng học sinh để các em đăng nhập vào ứng dụng thi đua lớp.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md hover:bg-indigo-700"
                >
                  <Printer className="w-4 h-4" />
                  In ngay (Ctrl + P)
                </button>
                <button
                  onClick={() => setIsPrintPreview(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Printable Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-2 print:gap-3">
              {mergedList.filter(i => i.hasAccount).map(item => {
                const std = item.student;
                const acc = item.account!;
                return (
                  <div 
                    key={std.studentId}
                    className="p-3.5 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 print:border-slate-300 print:bg-white flex flex-col justify-between text-xs space-y-2"
                  >
                    <div className="border-b border-indigo-100 pb-1.5 flex items-center justify-between">
                      <span className="font-bold text-indigo-900 tracking-tight text-[11px]">
                        SMARTCLASS • {classNameStr}
                      </span>
                      <span className="font-semibold text-slate-500 text-[10px]">
                        STT: {std.studentNumber}
                      </span>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-800 truncate">
                        {std.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <span>{std.teamName}</span>
                        <span>•</span>
                        <span className="font-medium text-indigo-700">
                          {acc.role === 'to_truong' ? 'Tổ trưởng (Được chấm)' : 'Thành viên'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-indigo-100 space-y-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-sans text-[10px]">Tài khoản:</span>
                        <strong className="text-indigo-700 font-bold">{acc.username}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-sans text-[10px]">Mật khẩu:</span>
                        <strong className="text-slate-800">{acc.password}</strong>
                      </div>
                    </div>

                    <div className="pt-1 text-[9px] text-slate-400 flex items-center justify-between">
                      <span>GVCN: {teacherName}</span>
                      <span>Bảo mật tài khoản cá nhân</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
