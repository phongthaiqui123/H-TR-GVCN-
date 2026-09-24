import React, { useState } from 'react';
import { useClassData } from '../hooks/useClassData';
import { useAuth } from '../hooks/useAuth';
import { 
  Trophy, 
  Users, 
  Award, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Star, 
  Sparkles,
  Medal,
  ChevronRight
} from 'lucide-react';
import { AiWeeklyInsightCard } from '../components/analytics/AiWeeklyInsightCard';

interface RankingsPageProps {
  onSelectStudent: (studentId: string) => void;
}

export const RankingsPage: React.FC<RankingsPageProps> = ({ onSelectStudent }) => {
  const { 
    currentClass, 
    selectedWeek, 
    studentsWithScores, 
    teamSummaries 
  } = useClassData();
  const { roleSession } = useAuth();
  const isTeamLeader = roleSession.category === 'to_truong';
  const myTeamName = roleSession.teamName || 'Tổ 1';

  const [activeTab, setActiveTab] = useState<'individual' | 'team' | 'insight'>('individual');

  // Top 3 Podium
  const top1 = studentsWithScores[0];
  const top2 = studentsWithScores[1];
  const top3 = studentsWithScores[2];
  const remainingStudents = studentsWithScores.slice(3);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500 fill-amber-500" />
            BẢNG XẾP HẠNG THI ĐUA • TUẦN {selectedWeek}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Tuyên dương cá nhân và tập thể tổ dẫn đầu phong trào thi đua lớp {currentClass?.className}.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'individual'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Xếp hạng cá nhân</span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Xếp hạng theo tổ</span>
          </button>
          <button
            onClick={() => setActiveTab('insight')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'insight'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-violet-600" />
            <span>Phân tích AI tuần</span>
          </button>
        </div>
      </div>

      {studentsWithScores.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Trophy className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-slate-800 text-base">Chưa có dữ liệu xếp hạng thi đua</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Khi danh sách lớp có học sinh và ghi nhận điểm thi đua trong tuần, bảng xếp hạng cá nhân và thứ hạng tổ sẽ tự động hiển thị tại đây.
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: XẾP HẠNG CÁ NHÂN */}
          {activeTab === 'individual' && (
            <div className="space-y-6">
          {/* PODIUM TOP 3 (Visual Celebration) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end pt-4 pb-2">
            
            {/* Hạng 2 (Silver) */}
            {top2 && (
              <div 
                onClick={() => onSelectStudent(top2.studentId)}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-slate-300 transition-all transform hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg mb-2 shadow-xs">
                  🥈
                </div>
                <div className="text-xs font-bold text-slate-500">Hạng 2</div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-0.5 truncate w-full">
                  {top2.fullName}
                </h3>
                <span className="text-[10px] text-slate-400">{top2.teamName}</span>
                <div className="mt-2 text-sm sm:text-base font-black text-slate-700">
                  {top2.currentWeekScore} <span className="text-[10px] font-normal text-slate-400">điểm</span>
                </div>
              </div>
            )}

            {/* Hạng 1 (Gold - Taller & Highlighted) */}
            {top1 && (
              <div 
                onClick={() => onSelectStudent(top1.studentId)}
                className="bg-gradient-to-b from-amber-50 to-white p-5 rounded-3xl border-2 border-amber-300 shadow-md flex flex-col items-center text-center cursor-pointer hover:border-amber-400 transition-all transform hover:-translate-y-1.5 relative -mt-4"
              >
                <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                  Quán Quân
                </div>
                <div className="w-14 h-14 rounded-full bg-amber-400 text-white flex items-center justify-center font-black text-2xl mb-2 shadow-md shadow-amber-200">
                  🥇
                </div>
                <div className="text-xs font-bold text-amber-700">Hạng 1</div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 mt-0.5 truncate w-full">
                  {top1.fullName}
                </h3>
                <span className="text-xs text-amber-800 font-medium">{top1.teamName}</span>
                <div className="mt-2 text-base sm:text-lg font-black text-amber-700">
                  {top1.currentWeekScore} <span className="text-xs font-normal text-slate-500">điểm</span>
                </div>
              </div>
            )}

            {/* Hạng 3 (Bronze) */}
            {top3 && (
              <div 
                onClick={() => onSelectStudent(top3.studentId)}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-slate-300 transition-all transform hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg mb-2 shadow-xs">
                  🥉
                </div>
                <div className="text-xs font-bold text-amber-800">Hạng 3</div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-0.5 truncate w-full">
                  {top3.fullName}
                </h3>
                <span className="text-[10px] text-slate-400">{top3.teamName}</span>
                <div className="mt-2 text-sm sm:text-base font-black text-amber-900">
                  {top3.currentWeekScore} <span className="text-[10px] font-normal text-slate-400">điểm</span>
                </div>
              </div>
            )}

          </div>

          {/* Detailed Full Ranking Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                Toàn bộ thứ tự xếp hạng ({studentsWithScores.length} học sinh)
              </h3>
              <span className="text-xs text-slate-500">Điểm cơ bản tuần: 100đ</span>
            </div>

            <div className="divide-y divide-slate-100">
              {studentsWithScores.map((std, index) => {
                const rankNum = index + 1;
                return (
                  <div
                    key={std.studentId}
                    onClick={() => onSelectStudent(std.studentId)}
                    className="flex items-center justify-between p-3.5 sm:px-5 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-8 text-center font-black text-sm ${
                        rankNum === 1 ? 'text-amber-600 text-lg' : rankNum === 2 ? 'text-slate-500 text-lg' : rankNum === 3 ? 'text-amber-700 text-lg' : 'text-slate-400'
                      }`}>
                        {rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : `#${rankNum}`}
                      </div>

                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 border border-slate-200">
                        {std.fullName.split(' ').slice(-1)[0].charAt(0)}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                          <span>{std.fullName}</span>
                          <span className="text-[11px] font-medium text-slate-500">
                            ({std.teamName})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          STT: #{std.studentNumber} • {'⭐'.repeat(std.stars)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 text-right">
                      {/* Trend */}
                      <div className="hidden sm:block text-xs">
                        {std.trend === 'up' ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5" /> +{std.trendValue}
                          </span>
                        ) : std.trend === 'down' ? (
                          <span className="text-rose-600 font-bold flex items-center gap-0.5">
                            <ArrowDownRight className="w-3.5 h-3.5" /> {std.trendValue}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>

                      {/* Rank Category Badge */}
                      <span className="hidden md:inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {std.rankCategory}
                      </span>

                      {/* Score */}
                      <div className="w-16 text-right">
                        <div className="text-base font-black text-indigo-700">
                          {std.currentWeekScore}
                        </div>
                        <span className="text-[10px] text-slate-400">điểm</span>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: XẾP HẠNG THEO TỔ */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {teamSummaries.map((team) => (
            <div
              key={team.teamId}
              className={`p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all ${
                team.rank === 1
                  ? 'bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border-amber-300 shadow-md shadow-amber-100'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base shadow-xs ${
                      team.rank === 1 ? 'bg-amber-500 text-white' : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {team.rank === 1 ? '🥇' : `#${team.rank}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-base text-slate-900">{team.teamName}</h3>
                        {isTeamLeader && team.teamName === myTeamName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Tổ của bạn
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{team.studentCount} thành viên</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-indigo-700 leading-none">
                      {team.avgScore} <span className="text-xs font-normal text-slate-500">đ/học sinh</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Điểm trung bình tổ</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-emerald-700 font-semibold block text-[11px]">Tổng điểm cộng:</span>
                    <span className="text-base font-black text-emerald-800">+{team.totalPositive} điểm</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                    <span className="text-rose-700 font-semibold block text-[11px]">Tổng điểm trừ:</span>
                    <span className="text-base font-black text-rose-800">-{team.totalNegative} điểm</span>
                  </div>
                </div>

                {/* Thành viên nổi bật nhất */}
                {team.topStudent && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Thành viên thi đua nổi bật nhất tổ:
                      </span>
                      <strong className="text-slate-800">{team.topStudent.fullName}</strong>
                    </div>
                    <span className="font-black text-indigo-700">
                      {team.topStudent.score} điểm
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )}

  {activeTab === 'insight' && (
    <AiWeeklyInsightCard onSelectStudent={onSelectStudent} />
  )}
</div>
  );
};
