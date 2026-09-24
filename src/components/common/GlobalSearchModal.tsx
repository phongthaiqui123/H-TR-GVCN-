import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  User, 
  Users, 
  Award, 
  Calendar, 
  Clock, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { useClassData } from '../../hooks/useClassData';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent?: (studentId: string) => void;
  onSelectTeam?: (teamId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStudent,
  onSelectTeam
}) => {
  const { studentsWithScores, teams, criteria, events, selectedWeek } = useClassData();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle logic should be handled by caller or state
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  // Search matches
  const matchedStudents = cleanQuery ? studentsWithScores.filter(s => 
    s.fullName.toLowerCase().includes(cleanQuery) || 
    s.studentNumber.toString() === cleanQuery ||
    s.teamName.toLowerCase().includes(cleanQuery)
  ).slice(0, 6) : [];

  const matchedTeams = cleanQuery ? teams.filter(t => 
    t.teamName.toLowerCase().includes(cleanQuery)
  ).slice(0, 3) : [];

  const matchedCriteria = cleanQuery ? criteria.filter(c => 
    c.name.toLowerCase().includes(cleanQuery) || 
    c.category.toLowerCase().includes(cleanQuery)
  ).slice(0, 4) : [];

  const matchedEvents = cleanQuery ? events.filter(e => 
    e.studentName.toLowerCase().includes(cleanQuery) ||
    e.criterionName.toLowerCase().includes(cleanQuery) ||
    (e.note && e.note.toLowerCase().includes(cleanQuery))
  ).slice(0, 4) : [];

  const hasResults = matchedStudents.length > 0 || matchedTeams.length > 0 || matchedCriteria.length > 0 || matchedEvents.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm kiếm học sinh, tổ, tiêu chí, vi phạm (hoặc gõ số thứ tự)..."
            className="w-full text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 font-mono hidden sm:inline">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!cleanQuery ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-600">Gõ từ khóa để tìm kiếm nhanh</p>
              <p>Hỗ trợ tìm kiếm theo tên học sinh, số thứ tự, tên tổ, tiêu chí thi đua...</p>
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Không tìm thấy kết quả phù hợp với "<strong className="text-slate-700">{query}</strong>"
            </div>
          ) : (
            <>
              {/* Students results */}
              {matchedStudents.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Học sinh ({matchedStudents.length})
                  </div>
                  <div className="space-y-1">
                    {matchedStudents.map(s => (
                      <div
                        key={s.studentId}
                        onClick={() => {
                          if (onSelectStudent) onSelectStudent(s.studentId);
                          onClose();
                        }}
                        className="p-2 rounded-xl hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                            {s.studentNumber}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                              {s.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {s.teamName} • Hạng {s.rankNumber}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-600">
                            {s.currentWeekScore} đ
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams results */}
              {matchedTeams.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Tổ thi đua
                  </div>
                  <div className="space-y-1">
                    {matchedTeams.map(t => (
                      <div
                        key={t.teamId}
                        onClick={() => {
                          if (onSelectTeam) onSelectTeam(t.teamId);
                          onClose();
                        }}
                        className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-800">{t.teamName}</span>
                        <span className="text-xs text-slate-500">Xem chi tiết tổ</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Criteria results */}
              {matchedCriteria.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3 h-3" /> Tiêu chí thi đua
                  </div>
                  <div className="space-y-1">
                    {matchedCriteria.map(c => (
                      <div
                        key={c.criterionId}
                        className="p-2 rounded-xl bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{c.name}</span>
                          <span className="text-[10px] text-slate-400 ml-2">({c.category})</span>
                        </div>
                        <span className={`font-bold ${c.positiveScore > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {c.positiveScore > 0 ? `+${c.positiveScore}` : `${c.negativeScore}`} đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Events results */}
              {matchedEvents.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Sự kiện ghi nhận
                  </div>
                  <div className="space-y-1">
                    {matchedEvents.map(e => (
                      <div
                        key={e.eventId}
                        className="p-2 rounded-xl bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{e.studentName}</span>
                          <span className="text-slate-500 ml-1.5">• {e.criterionName}</span>
                          {e.note && <span className="text-slate-400 italic text-[11px] ml-1">({e.note})</span>}
                        </div>
                        <span className={`font-bold shrink-0 ml-2 ${e.score > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {e.score > 0 ? `+${e.score}` : `${e.score}`} đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Tìm kiếm toàn diện trong lớp {selectedWeek ? `Tuần ${selectedWeek}` : ''}</span>
          <span>Nhấn <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">ESC</kbd> để đóng</span>
        </div>
      </div>
    </div>
  );
};
