import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Student, ClassCadreRole, TeamRole } from '../../types';
import { useClassData } from '../../hooks/useClassData';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { 
  ShieldCheck, 
  Crown, 
  Award, 
  Check, 
  AlertTriangle,
  User,
  Lock,
  RotateCcw
} from 'lucide-react';
import { CADRE_ROLES_META, TEAM_ROLES_META } from '../../utils/constants';

interface StudentRoleModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentRoleModal: React.FC<StudentRoleModalProps> = ({
  student,
  isOpen,
  onClose,
}) => {
  const { roleSession } = useAuth();
  const { assignStudentRole, teamPasscodes } = useClassData();
  const { showToast } = useToast();

  const [cadreRole, setCadreRole] = useState<ClassCadreRole>('none');
  const [teamRole, setTeamRole] = useState<TeamRole>('thanh_vien');
  const [passcode, setPasscode] = useState('1234');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setCadreRole(student.cadreRole || 'none');
      setTeamRole(student.teamRole || (student.isTeamLeader ? 'to_truong' : 'thanh_vien'));
      setPasscode(student.teamLeaderPasscode || (student.teamName ? teamPasscodes[student.teamName] : '1234') || '1234');
    }
  }, [student, teamPasscodes]);

  if (!student || roleSession.category !== 'gvcn') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await assignStudentRole(
        student.studentId, 
        cadreRole, 
        teamRole, 
        teamRole === 'to_truong' ? passcode : undefined
      );
      showToast(
        `Đã cập nhật chức vụ cho ${student.fullName}${teamRole === 'to_truong' ? ' (Pass code: ' + passcode + ')' : ''}`,
        'success'
      );
      onClose();
    } catch (err) {
      console.error('Error assigning role:', err);
      showToast('Có lỗi xảy ra khi phân quyền', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Phân quyền chức vụ: ${student.fullName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Student Info header */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
            #{student.studentNumber}
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{student.fullName}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium">
                {student.teamName}
              </span>
              <span>•</span>
              <span>{student.gender === 'male' ? 'Nam' : 'Nữ'}</span>
            </div>
          </div>
        </div>

        {/* 1. Chức vụ Ban Cán sự Lớp */}
        <div>
          <label className="block font-bold text-slate-800 mb-1.5 text-xs flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-indigo-600" />
            <span>Chức vụ Ban Cán Sự Lớp</span>
          </label>
          <select
            value={cadreRole}
            onChange={(e) => setCadreRole(e.target.value as ClassCadreRole)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="none">-- Học sinh (Không giữ chức vụ lớp) --</option>
            <option value="lop_truong">👑 Lớp trưởng</option>
            <option value="lop_pho_hoc_tap">📚 Lớp phó học tập</option>
            <option value="lop_pho_lao_dong">🧹 Lớp phó lao động</option>
            <option value="lop_pho_trat_tu">🛡️ Lớp phó trật tự</option>
            <option value="bi_thu">⭐ Bí thư Chi đoàn / Chi đội</option>
            <option value="pho_bi_thu">✨ Phó bí thư</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            {CADRE_ROLES_META[cadreRole]?.description}
          </p>
        </div>

        {/* 2. Vai trò trong Tổ & Quyền chấm điểm */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block font-bold text-slate-800 mb-1.5 text-xs flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Vai trò trong {student.teamName} & Quyền chấm thi đua</span>
          </label>
          <select
            value={teamRole}
            onChange={(e) => setTeamRole(e.target.value as TeamRole)}
            className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ${
              teamRole === 'to_truong'
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 focus:ring-emerald-500/20'
                : 'bg-white border-slate-300 text-slate-800 focus:ring-indigo-500/20'
            }`}
          >
            <option value="thanh_vien">👤 Thành viên {student.teamName}</option>
            <option value="to_truong">🎖️ Tổ trưởng (Được quyền chấm điểm {student.teamName})</option>
            <option value="to_pho">🎗️ Tổ phó {student.teamName}</option>
          </select>

          {teamRole === 'to_truong' ? (
            <div className="mt-2.5 space-y-2.5">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-900 font-medium leading-relaxed">
                  <strong>Quyền hạn:</strong> Em <strong>{student.fullName}</strong> sẽ được quyền vào trang Chấm thi đua để ghi nhận điểm cộng/trừ cho tất cả học sinh thuộc <strong>{student.teamName}</strong>.
                </p>
              </div>

              {/* Passcode input */}
              <div className="p-3 bg-emerald-50/70 border-2 border-emerald-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pass code đăng nhập của Tổ trưởng {student.teamName}:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasscode(Math.floor(1000 + Math.random() * 9000).toString())}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-950 font-semibold underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Tạo mã ngẫu nhiên</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="1234"
                    maxLength={10}
                    className="w-32 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-[11px] text-emerald-800 leading-tight">
                    Tổ trưởng phải nhập đúng mã này để đăng nhập vào tài khoản.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1">
              Thành viên bình thường không có quyền chấm điểm thi đua (theo quy định của GVCN).
            </p>
          )}
        </div>

        {/* Submit / Cancel */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu phân quyền'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
