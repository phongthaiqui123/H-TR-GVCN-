import React, { useState, useMemo } from 'react';
import { useClassData } from '../hooks/useClassData';
import { useAuth } from '../hooks/useAuth';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Filter, 
  Search, 
  Clock, 
  Award, 
  AlertTriangle, 
  Trash2,
  Users,
  ShieldCheck
} from 'lucide-react';
import { formatDateVN } from '../utils/constants';

interface HistoryAnalyticsPageProps {
  onSelectStudent: (studentId: string) => void;
}

export const HistoryAnalyticsPage: React.FC<HistoryAnalyticsPageProps> = ({ onSelectStudent }) => {
  const { 
    currentClass, 
    selectedWeek, 
    events, 
    criteria, 
    students, 
    allWeeklyScores,
    teamSummaries,
    studentsWithScores,
    removeEvent
  } = useClassData();
  const { roleSession } = useAuth();
  const isTeacher = roleSession.category === 'gvcn';
  const isTeamLeader = roleSession.category === 'to_truong';
  const myTeamName = roleSession.teamName || 'Tổ 1';

  // Scope data for team leader
  const scopedStudents = useMemo(() => {
    if (!isTeamLeader) return students;
    return students.filter(s => s.teamName === myTeamName);
  }, [students, isTeamLeader, myTeamName]);

  const scopedStudentIds = useMemo(() => {
    return new Set(scopedStudents.map(s => s.studentId));
  }, [scopedStudents]);

  const scopedStudentsWithScores = useMemo(() => {
    if (!isTeamLeader) return studentsWithScores;
    return studentsWithScores.filter(s => s.teamName === myTeamName);
  }, [studentsWithScores, isTeamLeader, myTeamName]);

  const scopedEvents = useMemo(() => {
    if (!isTeamLeader) return events;
    return events.filter(e => scopedStudentIds.has(e.studentId) || e.evaluatorId === roleSession.role);
  }, [events, isTeamLeader, scopedStudentIds, roleSession.role]);

  // Filters for History
  const [historyWeekFilter, setHistoryWeekFilter] = useState<number | 'all'>(selectedWeek);
  const [historyStudentFilter, setHistoryStudentFilter] = useState<string>('all');
  const [historyCriterionFilter, setHistoryCriterionFilter] = useState<string>('all');

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return scopedEvents.filter(e => {
      const matchWeek = historyWeekFilter === 'all' || e.week === historyWeekFilter;
      const matchStudent = historyStudentFilter === 'all' || e.studentId === historyStudentFilter;
      const matchCrit = historyCriterionFilter === 'all' || e.criterionId === historyCriterionFilter;
      return matchWeek && matchStudent && matchCrit;
    });
  }, [scopedEvents, historyWeekFilter, historyStudentFilter, historyCriterionFilter]);

  // Analytics: Criteria most rewarded & most penalized
  const criteriaAnalytics = useMemo(() => {
    return criteria.map(crit => {
      const critEvents = scopedEvents.filter(e => e.criterionId === crit.criterionId);
      const positiveEvents = critEvents.filter(e => e.score > 0);
      const negativeEvents = critEvents.filter(e => e.score < 0);
      const totalScore = critEvents.reduce((sum, e) => sum + e.score, 0);

      return {
        crit,
        positiveCount: positiveEvents.length,
        negativeCount: negativeEvents.length,
        totalEvents: critEvents.length,
        totalScore,
      };
    });
  }, [criteria, scopedEvents]);

  const topViolatedCriteria = [...criteriaAnalytics]
    .filter(c => c.negativeCount > 0)
    .sort((a, b) => b.negativeCount - a.negativeCount)
    .slice(0, 4);

  const topRewardedCriteria = [...criteriaAnalytics]
    .filter(c => c.positiveCount > 0)
    .sort((a, b) => b.positiveCount - a.positiveCount)
    .slice(0, 4);

  // Rank category distribution
  const rankDistribution = useMemo(() => {
    const counts = {
      'XUẤT SẮC': 0,
      'TỐT': 0,
      'HOÀN THÀNH TỐT': 0,
      'CẦN CỐ GẮNG': 0,
      'CẦN HỖ TRỢ': 0,
    };
    scopedStudentsWithScores.forEach(s => {
      if (counts[s.rankCategory] !== undefined) {
        counts[s.rankCategory]++;
      }
    });
    return counts;
  }, [scopedStudentsWithScores]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          {isTeamLeader ? `LỊCH SỬ CHẤM & TỔNG HỢP HOẠT ĐỘNG • ${myTeamName}` : 'PHÂN TÍCH & LỊCH SỬ THI ĐUA TOÀN DIỆN'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {isTeamLeader 
            ? `Theo dõi nhật ký chấm thi đua và tổng hợp hoạt động của các thành viên trong ${myTeamName}.`
            : `Thống kê các tiêu chí, phân bổ xếp loại và tra cứu toàn bộ nhật ký thi đua lớp ${currentClass?.className}.`}
        </p>
      </div>

      {/* 4 Analytics Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Tiêu chí vi phạm nhiều nhất */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Tiêu chí vi phạm nhiều nhất</h3>
              <span className="text-[11px] text-slate-400">Các lỗi học sinh thường mắc phải</span>
            </div>
          </div>

          <div className="space-y-3">
            {topViolatedCriteria.map((item, idx) => (
              <div key={item.crit.criterionId} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{idx + 1}. {item.crit.name}</span>
                  <span className="text-rose-600 font-bold">{item.negativeCount} lượt</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${Math.min(100, item.negativeCount * 12)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Tiêu chí được cộng điểm nhiều nhất */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Tiêu chí phát huy tốt nhất</h3>
              <span className="text-[11px] text-slate-400">Những điểm sáng nề nếp của lớp</span>
            </div>
          </div>

          <div className="space-y-3">
            {topRewardedCriteria.map((item, idx) => (
              <div key={item.crit.criterionId} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{idx + 1}. {item.crit.name}</span>
                  <span className="text-emerald-600 font-bold">{item.positiveCount} lượt</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, item.positiveCount * 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Card 3: Phân bố Xếp loại học sinh */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-sm sm:text-base text-slate-800 pb-3 border-b border-slate-100 mb-4">
          📊 Phân bố xếp loại học sinh tuần {selectedWeek}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Xuất sắc</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{rankDistribution['XUẤT SẮC']}</div>
            <span className="text-[11px] text-emerald-600">⭐⭐⭐⭐⭐</span>
          </div>

          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
            <span className="text-[10px] font-bold text-blue-700 uppercase">Tốt</span>
            <div className="text-2xl font-black text-blue-700 mt-1">{rankDistribution['TỐT']}</div>
            <span className="text-[11px] text-blue-600">⭐⭐⭐⭐</span>
          </div>

          <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
            <span className="text-[10px] font-bold text-indigo-700 uppercase">Hoàn thành tốt</span>
            <div className="text-2xl font-black text-indigo-700 mt-1">{rankDistribution['HOÀN THÀNH TỐT']}</div>
            <span className="text-[11px] text-indigo-600">⭐⭐⭐</span>
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
            <span className="text-[10px] font-bold text-amber-700 uppercase">Cần cố gắng</span>
            <div className="text-2xl font-black text-amber-700 mt-1">{rankDistribution['CẦN CỐ GẮNG']}</div>
            <span className="text-[11px] text-amber-600">⭐⭐</span>
          </div>

          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
            <span className="text-[10px] font-bold text-rose-700 uppercase">Cần hỗ trợ</span>
            <div className="text-2xl font-black text-rose-700 mt-1">{rankDistribution['CẦN HỖ TRỢ']}</div>
            <span className="text-[11px] text-rose-600">⚠️</span>
          </div>
        </div>
      </div>

      {/* SECTION: TRA CỨU LỊCH SỬ THI ĐUA */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-800">
              Nhật ký sự kiện thi đua chi tiết
            </h3>
            <span className="text-xs text-slate-400">({filteredEvents.length} sự kiện)</span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Lọc theo tuần</label>
            <select
              value={historyWeekFilter}
              onChange={(e) => setHistoryWeekFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="all">Tất cả các tuần</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Tuần {w}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Lọc theo học sinh</label>
            <select
              value={historyStudentFilter}
              onChange={(e) => setHistoryStudentFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="all">{isTeamLeader ? `Tất cả học sinh ${myTeamName}` : 'Tất cả học sinh'}</option>
              {scopedStudents.map(s => (
                <option key={s.studentId} value={s.studentId}>#{s.studentNumber}. {s.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Lọc theo tiêu chí</label>
            <select
              value={historyCriterionFilter}
              onChange={(e) => setHistoryCriterionFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="all">Tất cả tiêu chí</option>
              {criteria.map(c => (
                <option key={c.criterionId} value={c.criterionId}>{c.order}. {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* History Log List */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((ev) => (
              <div
                key={ev.eventId}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-xl font-black ${
                    ev.score > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {ev.score > 0 ? `+${ev.score}` : ev.score}
                  </span>
                  <div>
                    <div className="font-bold text-slate-800">
                      {ev.studentName || 'Học sinh'} • <span className="font-semibold text-slate-600">{ev.criterionName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>{formatDateVN(ev.date)} • Tuần {ev.week}</span>
                      {ev.evaluatorName && (
                        <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                          Chấm bởi: {ev.evaluatorName}
                        </span>
                      )}
                      {ev.note && <span>• {ev.note}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectStudent(ev.studentId)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50"
                  >
                    Xem hồ sơ
                  </button>
                  {isTeacher && (
                    <button
                      onClick={() => removeEvent(ev)}
                      title="Xóa sự kiện này (Chỉ GVCN)"
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              Không có sự kiện nào phù hợp với bộ lọc hiện tại.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
