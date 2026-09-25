import React, { useState, useEffect } from 'react';
import { useClassData } from '../../hooks/useClassData';
import { Modal } from '../ui/Modal';
import { 
  ShieldCheck, 
  Crown, 
  BookOpen, 
  Brush, 
  Shield, 
  Star, 
  Sparkles, 
  Award, 
  Check, 
  Info,
  Users,
  KeyRound,
  Lock,
  Copy,
  RotateCcw
} from 'lucide-react';
import { ClassCadreRole, TeamRole, Student } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';

interface CadreAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CadreAssignmentModal: React.FC<CadreAssignmentModalProps> = ({ isOpen, onClose }) => {
  const { roleSession } = useAuth();
  const { 
    students, 
    teams, 
    currentClass, 
    batchAssignRoles, 
    teamPasscodes,
    gvcnPasscode,
    updateGvcnPasscode,
    cadrePasscodes,
    updateCadrePasscodes
  } = useClassData();
  const { showToast } = useToast();

  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [lopTruong, setLopTruong] = useState('');
  const [lopPhoHocTap, setLopPhoHocTap] = useState('');
  const [lopPhoLaoDong, setLopPhoLaoDong] = useState('');
  const [lopPhoTratTu, setLopPhoTratTu] = useState('');
  const [biThu, setBiThu] = useState('');
  const [phoBiThu, setPhoBiThu] = useState('');

  // Passcodes
  const [gvcnPasscodeState, setGvcnPasscodeState] = useState('1234');
  const [cadrePasscodeState, setCadrePasscodeState] = useState('1234');

  // Team leaders & passcodes
  const [toTruong1, setToTruong1] = useState('');
  const [toTruong2, setToTruong2] = useState('');
  const [toTruong3, setToTruong3] = useState('');
  const [toTruong4, setToTruong4] = useState('');
  const [toTruong5, setToTruong5] = useState('');

  const [passcode1, setPasscode1] = useState('1234');
  const [passcode2, setPasscode2] = useState('1234');
  const [passcode3, setPasscode3] = useState('1234');
  const [passcode4, setPasscode4] = useState('1234');
  const [passcode5, setPasscode5] = useState('1234');

  const hasTeam5 = teams.some(t => t.teamName === 'Tổ 5') || students.some(s => s.teamName === 'Tổ 5');

  // Load current assignments when modal opens
  useEffect(() => {
    if (isOpen) {
      const findCadre = (role: ClassCadreRole) => 
        students.find(s => s.cadreRole === role)?.studentId || '';
      
      const findTeamLeader = (teamName: string) => 
        students.find(s => (s.isTeamLeader || s.teamRole === 'to_truong') && s.teamName === teamName)?.studentId || '';

      setLopTruong(findCadre('lop_truong'));
      setLopPhoHocTap(findCadre('lop_pho_hoc_tap'));
      setLopPhoLaoDong(findCadre('lop_pho_lao_dong'));
      setLopPhoTratTu(findCadre('lop_pho_trat_tu'));
      setBiThu(findCadre('bi_thu'));
      setPhoBiThu(findCadre('pho_bi_thu'));

      setToTruong1(findTeamLeader('Tổ 1'));
      setToTruong2(findTeamLeader('Tổ 2'));
      setToTruong3(findTeamLeader('Tổ 3'));
      setToTruong4(findTeamLeader('Tổ 4'));
      setToTruong5(findTeamLeader('Tổ 5'));

      setGvcnPasscodeState(gvcnPasscode || '1234');
      setCadrePasscodeState(cadrePasscodes?.cadre_general || cadrePasscodes?.lop_truong || '1234');

      setPasscode1(teamPasscodes['Tổ 1'] || '1234');
      setPasscode2(teamPasscodes['Tổ 2'] || '1234');
      setPasscode3(teamPasscodes['Tổ 3'] || '1234');
      setPasscode4(teamPasscodes['Tổ 4'] || '1234');
      setPasscode5(teamPasscodes['Tổ 5'] || '1234');
    }
  }, [isOpen, students, teamPasscodes, gvcnPasscode, cadrePasscodes]);

  // Security guard: Only GVCN can view / edit passcodes & assignments
  if (roleSession.category !== 'gvcn') {
    return null;
  }

  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleCopyPasscodeList = () => {
    const getName = (id: string, def: string) => {
      const s = students.find(x => x.studentId === id);
      return s ? s.fullName : def;
    };

    const text = [
      `🔐 DANH SÁCH MÃ PASSCODE ĐĂNG NHẬP - ${currentClass?.className || 'LỚP HỌC'}:`,
      ``,
      `👨‍🏫 GIÁO VIÊN CHỦ NHIỆM (Bảo mật riêng):`,
      `• Passcode GVCN: ${gvcnPasscodeState}`,
      ``,
      `👑 BAN CÁN SỰ LỚP (Nhập nhận xét tuần):`,
      `• Passcode Ban cán sự: ${cadrePasscodeState}`,
      ``,
      `🎖️ TỔ TRƯỞNG CÁC TỔ (Chấm thi đua):`,
      `• Tổ 1: ${passcode1} (Tổ trưởng: ${getName(toTruong1, 'Chưa chỉ định')})`,
      `• Tổ 2: ${passcode2} (Tổ trưởng: ${getName(toTruong2, 'Chưa chỉ định')})`,
      `• Tổ 3: ${passcode3} (Tổ trưởng: ${getName(toTruong3, 'Chưa chỉ định')})`,
      `• Tổ 4: ${passcode4} (Tổ trưởng: ${getName(toTruong4, 'Chưa chỉ định')})`,
      hasTeam5 ? `• Tổ 5: ${passcode5} (Tổ trưởng: ${getName(toTruong5, 'Chưa chỉ định')})` : '',
      ``,
      `💡 HƯỚNG DẪN ĐĂNG NHẬP:`,
      `- GVCN: Chọn chức vụ "GVCN lớp" và nhập Passcode GVCN`,
      `- Ban cán sự: Chọn "Ban cán sự", chọn chức vụ và nhập Passcode để vào nhập nhận xét`,
      `- Tổ trưởng: Chọn "Tổ trưởng", chọn đúng Tổ và nhập Passcode để chấm điểm`,
      `- Học sinh: Chọn "Học sinh" để xem điểm & bảng xếp hạng (không cần mật khẩu)`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    showToast('Đã sao chép danh sách Passcode (GVCN, Ban cán sự, Tổ trưởng)!', 'success');
  };

  const studentsByTeam = (teamName: string) => 
    students.filter(s => s.teamName === teamName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updates: Array<{ studentId: string; cadreRole: ClassCadreRole; teamRole?: TeamRole }> = [];

      students.forEach(std => {
        // Determine target cadre role
        let targetCadre: ClassCadreRole = 'none';
        if (std.studentId === lopTruong) targetCadre = 'lop_truong';
        else if (std.studentId === lopPhoHocTap) targetCadre = 'lop_pho_hoc_tap';
        else if (std.studentId === lopPhoLaoDong) targetCadre = 'lop_pho_lao_dong';
        else if (std.studentId === lopPhoTratTu) targetCadre = 'lop_pho_trat_tu';
        else if (std.studentId === biThu) targetCadre = 'bi_thu';
        else if (std.studentId === phoBiThu) targetCadre = 'pho_bi_thu';

        // Determine target team role
        let targetTeamRole: TeamRole = std.teamRole === 'to_pho' ? 'to_pho' : 'thanh_vien';
        if (std.teamName === 'Tổ 1' && std.studentId === toTruong1) targetTeamRole = 'to_truong';
        if (std.teamName === 'Tổ 2' && std.studentId === toTruong2) targetTeamRole = 'to_truong';
        if (std.teamName === 'Tổ 3' && std.studentId === toTruong3) targetTeamRole = 'to_truong';
        if (std.teamName === 'Tổ 4' && std.studentId === toTruong4) targetTeamRole = 'to_truong';
        if (std.teamName === 'Tổ 5' && std.studentId === toTruong5) targetTeamRole = 'to_truong';

        if (std.cadreRole !== targetCadre || std.teamRole !== targetTeamRole) {
          updates.push({
            studentId: std.studentId,
            cadreRole: targetCadre,
            teamRole: targetTeamRole,
          });
        }
      });

      const passcodesMap: Record<string, string> = {
        'Tổ 1': passcode1.trim() || '1234',
        'Tổ 2': passcode2.trim() || '1234',
        'Tổ 3': passcode3.trim() || '1234',
        'Tổ 4': passcode4.trim() || '1234',
      };
      if (hasTeam5) {
        passcodesMap['Tổ 5'] = passcode5.trim() || '1234';
      }

      await batchAssignRoles(updates, passcodesMap);

      // Save GVCN Passcode
      await updateGvcnPasscode(gvcnPasscodeState.trim() || '1234');

      // Save Cadre Passcodes
      const cleanCadrePin = cadrePasscodeState.trim() || '1234';
      await updateCadrePasscodes({
        cadre_general: cleanCadrePin,
        lop_truong: cleanCadrePin,
        lop_pho_hoc_tap: cleanCadrePin,
        lop_pho_lao_dong: cleanCadrePin,
        lop_pho_trat_tu: cleanCadrePin,
        bi_thu: cleanCadrePin,
        pho_bi_thu: cleanCadrePin
      });

      showToast('Đã lưu phân quyền & mã Passcode (GVCN, Ban cán sự, Tổ trưởng) thành công!', 'success');
      onClose();
    } catch (err) {
      console.error('Error saving cadre roles:', err);
      showToast('Có lỗi xảy ra khi lưu phân quyền', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phân Quyền Ban Cán Sự Lớp & Tổ Trưởng"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-xs sm:text-sm">
        {/* Intro Guidance */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-indigo-950 text-xs leading-relaxed">
            <p className="font-bold mb-0.5">Quy định phân quyền chấm thi đua của Giáo viên chủ nhiệm:</p>
            <p className="text-indigo-900/80">
              Chỉ những học sinh được GVCN chỉ định làm <strong>Tổ trưởng</strong> mới có quyền chấm thi đua cho các bạn cùng thuộc tổ với mình. Ban cán sự lớp hỗ trợ điều hành nề nếp chung.
            </p>
          </div>
        </div>

        {/* SECTION 1: BAN CÁN SỰ LỚP */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">
              1. Ban Cán Sự Lớp (6 vị trí)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Lớp trưởng */}
            <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/30">
              <label className="flex items-center gap-1.5 font-bold text-slate-800 mb-1.5 text-xs">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Lớp trưởng</span>
              </label>
              <select
                value={lopTruong}
                onChange={(e) => setLopTruong(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">-- Chưa phân công --</option>
                {students.map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.studentNumber} - {s.fullName} ({s.teamName})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Bao quát chung nề nếp và phong trào lớp</p>
            </div>

            {/* Lớp phó học tập */}
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/30">
              <label className="flex items-center gap-1.5 font-bold text-slate-800 mb-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Lớp phó học tập</span>
              </label>
              <select
                value={lopPhoHocTap}
                onChange={(e) => setLopPhoHocTap(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Chưa phân công --</option>
                {students.map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.studentNumber} - {s.fullName} ({s.teamName})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Theo dõi làm bài tập, bài học và truy bài</p>
            </div>

            {/* Lớp phó lao động */}
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30">
              <label className="flex items-center gap-1.5 font-bold text-slate-800 mb-1.5 text-xs">
                <Brush className="w-3.5 h-3.5 text-amber-600" />
                <span>Lớp phó lao động</span>
              </label>
              <select
                value={lopPhoLaoDong}
                onChange={(e) => setLopPhoLaoDong(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">-- Chưa phân công --</option>
                {students.map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.studentNumber} - {s.fullName} ({s.teamName})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Phân công, đôn đốc trực nhật & vệ sinh lớp</p>
            </div>

            {/* Lớp phó trật tự */}
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/30">
              <label className="flex items-center gap-1.5 font-bold text-slate-800 mb-1.5 text-xs">
                <Shield className="w-3.5 h-3.5 text-rose-600" />
                <span>Lớp phó trật tự</span>
              </label>
              <select
                value={lopPhoTratTu}
                onChange={(e) => setLopPhoTratTu(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="">-- Chưa phân công --</option>
                {students.map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.studentNumber} - {s.fullName} ({s.teamName})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Ghi nhận giữ trật tự và xếp hàng ra vào lớp</p>
            </div>

            {/* Bí thư */}
            <div className="p-3 rounded-xl border border-red-200 bg-red-50/30">
              <label className="flex items-center gap-1.5 font-bold text-slate-800 mb-1.5 text-xs">
                <Star className="w-3.5 h-3.5 text-red-600" />
                <span>Bí thư Chi đoàn / Chi đội</span>
              </label>
              <select
                value={biThu}
                onChange={(e) => setBiThu(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="">-- Chưa phân công --</option>
                {students.map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.studentNumber} - {s.fullName} ({s.teamName})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Phụ trách công tác Đội/Đoàn và phong trào</p>
            </div>

            {/* Phó bí thư */}
            <div className="p-3 rounded-xl border border-pink-200 bg-pink-50/30">
              <label className="flex items-center gap-1.5 font-bold text-slate-800 mb-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                <span>Phó bí thư</span>
              </label>
              <select
                value={phoBiThu}
                onChange={(e) => setPhoBiThu(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              >
                <option value="">-- Chưa phân công --</option>
                {students.map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.studentNumber} - {s.fullName} ({s.teamName})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Hỗ trợ các hoạt động văn thể mỹ, phong trào</p>
            </div>

            {/* Passcode Ban cán sự lớp */}
            <div className="sm:col-span-2 p-3 rounded-xl border border-sky-300 bg-sky-50/50 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="flex items-center gap-1.5 font-bold text-sky-950 text-xs">
                  <KeyRound className="w-4 h-4 text-sky-600" />
                  <span>Passcode Ban cán sự lớp (để nhập nhận xét nề nếp tuần):</span>
                </label>
                <p className="text-[11px] text-sky-800/80 mt-0.5">
                  Ban cán sự nhập mã này để vào trang "Nhận xét của Ban cán sự lớp" ghi nhận nề nếp tuần
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={cadrePasscodeState}
                  onChange={(e) => setCadrePasscodeState(e.target.value)}
                  placeholder="1234"
                  maxLength={12}
                  className="w-28 px-2.5 py-1.5 bg-white border border-sky-300 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
                <button
                  type="button"
                  onClick={() => setCadrePasscodeState(generateRandomPin())}
                  className="inline-flex items-center gap-1 text-[11px] text-sky-700 hover:text-sky-950 font-semibold underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Ngẫu nhiên</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: CÁC TỔ TRƯỞNG ĐƯỢC CHẤM THI ĐUA & PASS CODE */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">
                2. Tổ Trưởng & Pass Code Đăng Nhập
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPasscodeList}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                title="Sao chép danh sách pass code gửi cho học sinh"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép Pass code gửi lớp</span>
              </button>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {hasTeam5 ? '5 Vị trí' : '4 Vị trí'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Tổ 1 */}
            <div className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 text-xs flex items-center gap-1.5">
                  🎖️ Tổ trưởng Tổ 1
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  Chấm học sinh Tổ 1
                </span>
              </div>
              <select
                value={toTruong1}
                onChange={(e) => setToTruong1(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Chưa chỉ định Tổ trưởng --</option>
                {studentsByTeam('Tổ 1').map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.studentNumber} - {s.fullName}
                  </option>
                ))}
              </select>

              {/* Passcode input for To 1 */}
              <div className="pt-2 border-t border-emerald-200/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-900">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pass code đăng nhập:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasscode1(generateRandomPin())}
                    className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 hover:text-emerald-950 font-medium underline cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Mã ngẫu nhiên</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={passcode1}
                    onChange={(e) => setPasscode1(e.target.value)}
                    placeholder="1234"
                    maxLength={10}
                    className="w-28 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-[10px] text-emerald-800/80 leading-tight">
                    Tổ trưởng phải nhập đúng mã này để đăng nhập
                  </span>
                </div>
              </div>
            </div>

            {/* Tổ 2 */}
            <div className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 text-xs flex items-center gap-1.5">
                  🎖️ Tổ trưởng Tổ 2
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  Chấm học sinh Tổ 2
                </span>
              </div>
              <select
                value={toTruong2}
                onChange={(e) => setToTruong2(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Chưa chỉ định Tổ trưởng --</option>
                {studentsByTeam('Tổ 2').map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.studentNumber} - {s.fullName}
                  </option>
                ))}
              </select>

              {/* Passcode input for To 2 */}
              <div className="pt-2 border-t border-emerald-200/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-900">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pass code đăng nhập:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasscode2(generateRandomPin())}
                    className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 hover:text-emerald-950 font-medium underline cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Mã ngẫu nhiên</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={passcode2}
                    onChange={(e) => setPasscode2(e.target.value)}
                    placeholder="1234"
                    maxLength={10}
                    className="w-28 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-[10px] text-emerald-800/80 leading-tight">
                    Tổ trưởng phải nhập đúng mã này để đăng nhập
                  </span>
                </div>
              </div>
            </div>

            {/* Tổ 3 */}
            <div className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 text-xs flex items-center gap-1.5">
                  🎖️ Tổ trưởng Tổ 3
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  Chấm học sinh Tổ 3
                </span>
              </div>
              <select
                value={toTruong3}
                onChange={(e) => setToTruong3(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Chưa chỉ định Tổ trưởng --</option>
                {studentsByTeam('Tổ 3').map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.studentNumber} - {s.fullName}
                  </option>
                ))}
              </select>

              {/* Passcode input for To 3 */}
              <div className="pt-2 border-t border-emerald-200/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-900">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pass code đăng nhập:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasscode3(generateRandomPin())}
                    className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 hover:text-emerald-950 font-medium underline cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Mã ngẫu nhiên</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={passcode3}
                    onChange={(e) => setPasscode3(e.target.value)}
                    placeholder="1234"
                    maxLength={10}
                    className="w-28 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-[10px] text-emerald-800/80 leading-tight">
                    Tổ trưởng phải nhập đúng mã này để đăng nhập
                  </span>
                </div>
              </div>
            </div>

            {/* Tổ 4 */}
            <div className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 text-xs flex items-center gap-1.5">
                  🎖️ Tổ trưởng Tổ 4
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  Chấm học sinh Tổ 4
                </span>
              </div>
              <select
                value={toTruong4}
                onChange={(e) => setToTruong4(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Chưa chỉ định Tổ trưởng --</option>
                {studentsByTeam('Tổ 4').map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.studentNumber} - {s.fullName}
                  </option>
                ))}
              </select>

              {/* Passcode input for To 4 */}
              <div className="pt-2 border-t border-emerald-200/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-900">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pass code đăng nhập:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasscode4(generateRandomPin())}
                    className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 hover:text-emerald-950 font-medium underline cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Mã ngẫu nhiên</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={passcode4}
                    onChange={(e) => setPasscode4(e.target.value)}
                    placeholder="1234"
                    maxLength={10}
                    className="w-28 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-[10px] text-emerald-800/80 leading-tight">
                    Tổ trưởng phải nhập đúng mã này để đăng nhập
                  </span>
                </div>
              </div>
            </div>

            {/* Tổ 5 (nếu có) */}
            {hasTeam5 && (
              <div className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-900 text-xs flex items-center gap-1.5">
                    🎖️ Tổ trưởng Tổ 5
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    Chấm học sinh Tổ 5
                  </span>
                </div>
                <select
                  value={toTruong5}
                  onChange={(e) => setToTruong5(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- Chưa chỉ định Tổ trưởng --</option>
                  {studentsByTeam('Tổ 5').map(s => (
                    <option key={s.studentId} value={s.studentId}>
                      #{s.studentNumber} - {s.fullName}
                    </option>
                  ))}
                </select>

                {/* Passcode input for To 5 */}
                <div className="pt-2 border-t border-emerald-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-900">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pass code đăng nhập:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPasscode5(generateRandomPin())}
                      className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 hover:text-emerald-950 font-medium underline cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Mã ngẫu nhiên</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={passcode5}
                      onChange={(e) => setPasscode5(e.target.value)}
                      placeholder="1234"
                      maxLength={10}
                      className="w-28 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                    <span className="text-[10px] text-emerald-800/80 leading-tight">
                      Tổ trưởng phải nhập đúng mã này để đăng nhập
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: PASSCODE BẢO VỆ GIÁO VIÊN CHỦ NHIỆM */}
        <div className="p-3.5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              <h3 className="font-black text-indigo-950 uppercase tracking-wider text-xs">
                3. Passcode Bảo Mật Tài Khoản GVCN
              </h3>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
              Bảo mật riêng Thầy/Cô
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-indigo-900/80 leading-relaxed">
              Mật mã bắt buộc khi Thầy/Cô đăng nhập vào vai trò Giáo viên chủ nhiệm để bảo vệ quyền quản trị lớp học, tránh học sinh tự ý truy cập.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={gvcnPasscodeState}
                onChange={(e) => setGvcnPasscodeState(e.target.value)}
                placeholder="1234"
                maxLength={15}
                className="w-32 px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-bold tracking-wider text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => setGvcnPasscodeState(generateRandomPin())}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-700 hover:text-indigo-950 font-semibold underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ngẫu nhiên</span>
              </button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu phân quyền Ban cán sự & Tổ trưởng'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
