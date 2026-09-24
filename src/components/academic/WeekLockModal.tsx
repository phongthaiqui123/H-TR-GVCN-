import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Trophy,
  Users,
  ChevronRight,
  Clock
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';
import { AcademicWeek, WeeklySnapshot } from '../../types';
import { formatDateRangeVN } from '../../utils/academicTime';

interface WeekLockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeekLockModal: React.FC<WeekLockModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentClass, 
    selectedWeek, 
    setSelectedWeek, 
    academicWeeks, 
    lockWeek, 
    unlockWeek, 
    getWeekSnapshotData,
    teacherName 
  } = useClassData();

  const [activeTab, setActiveTab] = useState<'all' | 'sem1' | 'sem2'>('all');
  const [loadingWeek, setLoadingWeek] = useState<number | null>(null);
  const [snapshotData, setSnapshotData] = useState<WeeklySnapshot | null>(null);
  const [viewingSnapshotWeek, setViewingSnapshotWeek] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleLockWeek = async (weekNumber: number) => {
    if (!confirm(`Bạn có chắc chắn muốn KHÓA SỔ THI ĐUA Tuần ${weekNumber} không?\n\nSau khi khóa sổ, hệ thống sẽ lưu bản chụp dữ liệu (Snapshot), bảo vệ điểm thi đua khỏi bị chỉnh sửa hoặc sửa đổi.`)) {
      return;
    }
    setLoadingWeek(weekNumber);
    try {
      await lockWeek(weekNumber);
    } catch (err: any) {
      alert(`Lỗi khi khóa sổ tuần ${weekNumber}: ${err.message}`);
    } finally {
      setLoadingWeek(null);
    }
  };

  const handleUnlockWeek = async (weekNumber: number) => {
    if (!confirm(`Bạn có muốn MỞ KHÓA SỔ Tuần ${weekNumber} không?\n\nViệc mở khóa cho phép tiếp tục ghi nhận hoặc chỉnh sửa điểm thi đua trong tuần này.`)) {
      return;
    }
    setLoadingWeek(weekNumber);
    try {
      await unlockWeek(weekNumber);
    } catch (err: any) {
      alert(`Lỗi khi mở khóa sổ: ${err.message}`);
    } finally {
      setLoadingWeek(null);
    }
  };

  const handleViewSnapshot = async (weekNumber: number) => {
    setLoadingWeek(weekNumber);
    try {
      const snap = await getWeekSnapshotData(weekNumber);
      if (snap) {
        setSnapshotData(snap);
        setViewingSnapshotWeek(weekNumber);
      } else {
        alert(`Chưa tìm thấy bản chụp dữ liệu chi tiết cho Tuần ${weekNumber}.`);
      }
    } catch (err: any) {
      alert(`Lỗi khi tải bản chụp: ${err.message}`);
    } finally {
      setLoadingWeek(null);
    }
  };

  const filteredWeeks = academicWeeks.filter(w => {
    if (activeTab === 'sem1') return w.semester === 1;
    if (activeTab === 'sem2') return w.semester === 2;
    return true;
  });

  const lockedCount = academicWeeks.filter(w => w.status === 'locked').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Quản lý 35 tuần học & Khóa sổ thi đua
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                  {currentClass?.className}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Năm học {currentClass?.schoolYear || '2026–2027'} • Đã khóa sổ: <strong className="text-indigo-600">{lockedCount}/35 tuần</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snapshot Modal overlay if active */}
        {snapshotData && viewingSnapshotWeek && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-5 max-h-[85vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Bản chụp dữ liệu thi đua Tuần {snapshotData.weekNumber}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Khóa lúc: {new Date(snapshotData.lockedAt).toLocaleString('vi-VN')} • Người khóa: {snapshotData.lockedBy}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSnapshotData(null); setViewingSnapshotWeek(null); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-500">Điểm TB tuần</div>
                    <div className="text-base font-bold text-slate-900">{snapshotData.statsSummary?.avgScore || 100}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-[10px] text-emerald-700">Học sinh Xuất sắc</div>
                    <div className="text-base font-bold text-emerald-700">{snapshotData.statsSummary?.excellentCount || 0}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-[10px] text-amber-700">Cần hỗ trợ</div>
                    <div className="text-base font-bold text-amber-700">{snapshotData.statsSummary?.needSupportCount || 0}</div>
                  </div>
                </div>

                {/* Team rankings at lock */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Bảng xếp hạng Tổ tại thời điểm khóa</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {snapshotData.teamRankings?.map((t, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                        <div className="text-[11px] font-bold text-slate-800">{t.teamName}</div>
                        <div className="text-xs font-semibold text-indigo-600">{t.avgScore} đ</div>
                        <div className="text-[10px] text-slate-500">Hạng {t.rank}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Student frozen scores list */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">
                    Điểm thi đua từng học sinh ({snapshotData.studentsScores?.length || 0} học sinh)
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 sticky top-0">
                        <tr>
                          <th className="px-3 py-1.5 w-12 text-center">Hạng</th>
                          <th className="px-3 py-1.5">Họ và tên</th>
                          <th className="px-3 py-1.5">Tổ</th>
                          <th className="px-3 py-1.5 text-center">Cộng / Trừ</th>
                          <th className="px-3 py-1.5 text-right">Điểm cuối</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {snapshotData.studentsScores?.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-center font-bold text-slate-500">{s.rankNumber || idx + 1}</td>
                            <td className="px-3 py-1.5 font-semibold text-slate-900">{s.fullName}</td>
                            <td className="px-3 py-1.5 text-slate-500">{s.teamName}</td>
                            <td className="px-3 py-1.5 text-center text-[11px]">
                              <span className="text-emerald-600">+{s.totalPositive}</span> / <span className="text-rose-600">-{s.totalNegative}</span>
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold text-indigo-600">{s.finalScore}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-right">
                <button
                  onClick={() => { setSnapshotData(null); setViewingSnapshotWeek(null); }}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Đóng bản chụp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cả năm (35 tuần)
            </button>
            <button
              onClick={() => setActiveTab('sem1')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'sem1' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-indigo-700'
              }`}
            >
              Học kỳ 1 (Tuần 1 - 18)
            </button>
            <button
              onClick={() => setActiveTab('sem2')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'sem2' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-indigo-700'
              }`}
            >
              Học kỳ 2 (Tuần 19 - 35)
            </button>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            Tuần đang chấm: <strong className="text-indigo-600 font-bold">Tuần {selectedWeek}</strong>
          </div>
        </div>

        {/* Week Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredWeeks.map((week) => {
              const isSelected = selectedWeek === week.weekNumber;
              const isLocked = week.status === 'locked';
              const isCurrent = week.weekNumber === (currentClass?.currentWeek || 8);
              const isLoading = loadingWeek === week.weekNumber;

              return (
                <div
                  key={week.weekNumber}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-500/20' 
                      : isLocked 
                        ? 'border-slate-200 bg-slate-50/70' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">
                          Tuần {week.weekNumber}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                            Tuần thực tế
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold">
                            Đang xem
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatDateRangeVN(week.startDate, week.endDate)}
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isLocked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-[11px] shrink-0">
                        <Lock className="w-3 h-3" /> Đã khóa sổ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[11px] shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Đang hoạt động
                      </span>
                    )}
                  </div>

                  {/* Lock metadata if present */}
                  {isLocked && week.lockedAt && (
                    <div className="text-[10px] text-slate-500 bg-white/80 p-1.5 rounded-lg border border-slate-100">
                      Khóa lúc: {new Date(week.lockedAt).toLocaleDateString('vi-VN')} bởi {week.lockedBy || teacherName}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedWeek(week.weekNumber);
                      }}
                      disabled={isSelected}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        isSelected 
                          ? 'text-indigo-600 bg-indigo-100/50 cursor-default' 
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? 'Đang chọn' : 'Xem tuần này'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      {isLocked ? (
                        <>
                          <button
                            onClick={() => handleViewSnapshot(week.weekNumber)}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                            title="Xem bản chụp dữ liệu (Snapshot)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUnlockWeek(week.weekNumber)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold transition-colors cursor-pointer"
                            title="Mở khóa sổ"
                          >
                            <Unlock className="w-3 h-3" />
                            Mở khóa
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleLockWeek(week.weekNumber)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Lock className="w-3 h-3" />
                          Khóa sổ
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Khóa sổ giúp bảo toàn dữ liệu báo cáo tuần và ngăn chặn thay đổi ngoài ý muốn.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
