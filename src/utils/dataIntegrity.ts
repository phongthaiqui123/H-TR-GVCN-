import { CompetitionEvent, Student, WeeklyScore, ScoreThresholds, RankCategory } from '../types';
import { DEFAULT_STARTING_SCORE, DEFAULT_THRESHOLDS, calculateRank } from './constants';

/**
 * Validate an event before committing to Firestore
 */
export function validateEvent(event: Partial<CompetitionEvent>): { valid: boolean; error?: string } {
  if (!event.studentId) {
    return { valid: false, error: 'Thiếu mã học sinh.' };
  }
  if (!event.classId) {
    return { valid: false, error: 'Thiếu mã lớp học.' };
  }
  if (!event.criterionId || !event.criterionName) {
    return { valid: false, error: 'Thiếu thông tin tiêu chí thi đua.' };
  }
  if (typeof event.score !== 'number' || isNaN(event.score) || event.score === 0) {
    return { valid: false, error: 'Điểm số phải là một số khác 0 (+ hoặc -).' };
  }
  if (!event.week || event.week < 1 || event.week > 35) {
    return { valid: false, error: 'Tuần học phải nằm trong khoảng từ 1 đến 35.' };
  }
  if (!event.date || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    return { valid: false, error: 'Ngày ghi nhận không đúng định dạng YYYY-MM-DD.' };
  }

  return { valid: true };
}

/**
 * Recalculate score for a single student in a specific week from raw events
 */
export function recalculateStudentScore(
  studentId: string,
  events: CompetitionEvent[],
  week: number,
  startingScore: number = DEFAULT_STARTING_SCORE
): {
  totalPositive: number;
  totalNegative: number;
  finalScore: number;
  eventCount: number;
} {
  const studentWeekEvents = events.filter(e => e.studentId === studentId && e.week === week);

  let totalPositive = 0;
  let totalNegative = 0;

  studentWeekEvents.forEach(e => {
    if (e.score > 0) {
      totalPositive += e.score;
    } else if (e.score < 0) {
      totalNegative += Math.abs(e.score);
    }
  });

  const finalScore = startingScore + totalPositive - totalNegative;

  return {
    totalPositive,
    totalNegative,
    finalScore,
    eventCount: studentWeekEvents.length
  };
}

/**
 * Recalculate all weekly scores for all students in a class
 */
export function recalculateWeeklyScores(
  students: Student[],
  events: CompetitionEvent[],
  week: number,
  classId: string,
  teacherId: string,
  startingScore: number = DEFAULT_STARTING_SCORE,
  thresholds: ScoreThresholds = DEFAULT_THRESHOLDS
): WeeklyScore[] {
  const scores: WeeklyScore[] = students.map(st => {
    const calc = recalculateStudentScore(st.studentId, events, week, startingScore);
    const rankInfo = calculateRank(calc.finalScore, thresholds);

    return {
      scoreId: `ws_${classId}_${st.studentId}_w${week}`,
      teacherId,
      classId,
      studentId: st.studentId,
      week,
      startingScore,
      totalPositive: calc.totalPositive,
      totalNegative: calc.totalNegative,
      finalScore: calc.finalScore,
      rankCategory: rankInfo.category,
      stars: rankInfo.stars,
      updatedAt: new Date().toISOString()
    };
  });

  // Assign rankings (sort descending)
  scores.sort((a, b) => b.finalScore - a.finalScore);
  scores.forEach((s, idx) => {
    s.rankNumber = idx + 1;
  });

  return scores;
}

/**
 * Validates student data before import or creation
 */
export function validateStudentData(data: {
  fullName?: string;
  studentNumber?: number;
  teamName?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push('Họ và tên học sinh không được để trống và phải có ít nhất 2 ký tự.');
  }

  if (data.teamName && !/^Tổ [1-9]$/i.test(data.teamName.trim())) {
    // Tolerant check, normalize if needed
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
