import { AcademicWeek, WeekStatus } from '../types';

/**
 * Vietnam Standard School Calendar Settings:
 * Default school year starts on the first Monday of September (e.g., 2026-09-07 or 2026-09-01).
 * Total 35 official academic weeks (Semester 1: Weeks 1-18, Semester 2: Weeks 19-35).
 */

export const DEFAULT_SCHOOL_START_DATE = '2026-09-07'; // Monday

/**
 * Calculate the current school week automatically based on a start date
 * Returns a week number between 1 and 35
 */
export function getCurrentSchoolWeek(schoolStartDateStr: string = DEFAULT_SCHOOL_START_DATE): number {
  try {
    const startDate = new Date(schoolStartDateStr);
    const today = new Date();

    // If today is before school starts, return week 1
    if (today < startDate) {
      return 1;
    }

    const diffMs = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const calculatedWeek = Math.floor(diffDays / 7) + 1;

    // Constrain to 1 - 35
    if (calculatedWeek < 1) return 1;
    if (calculatedWeek > 35) return 35;
    return calculatedWeek;
  } catch (err) {
    console.warn('Error calculating current school week:', err);
    return 8; // standard mid-semester default
  }
}

/**
 * Get date range for a specific academic week
 */
export function getWeekDateRange(
  weekNumber: number,
  schoolStartDateStr: string = DEFAULT_SCHOOL_START_DATE
): { start: string; end: string; startFormatted: string; endFormatted: string } {
  try {
    const startObj = new Date(schoolStartDateStr);
    // Add (weekNumber - 1) * 7 days
    startObj.setDate(startObj.getDate() + (weekNumber - 1) * 7);

    const endObj = new Date(startObj);
    endObj.setDate(endObj.getDate() + 4); // Friday of school week

    const toYMD = (d: Date) => d.toISOString().split('T')[0];
    const toDMY = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    return {
      start: toYMD(startObj),
      end: toYMD(endObj),
      startFormatted: toDMY(startObj),
      endFormatted: toDMY(endObj)
    };
  } catch (err) {
    return {
      start: '2026-10-26',
      end: '2026-10-30',
      startFormatted: '26/10',
      endFormatted: '30/10'
    };
  }
}

/**
 * Format date range string (e.g., '26/10 - 30/10' or '26/10/2026 - 30/10/2026')
 */
export function formatDateRangeVN(startDateStr: string, endDateStr: string): string {
  try {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${fmt(s)} - ${fmt(e)}`;
  } catch {
    return `${startDateStr} - ${endDateStr}`;
  }
}

/**
 * Return school days (Monday - Friday) for a week
 */
export function getWeekDays(
  weekNumber: number,
  schoolStartDateStr: string = DEFAULT_SCHOOL_START_DATE
): Array<{ dateStr: string; dayLabel: string; shortLabel: string; isToday: boolean }> {
  const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'];
  const shortNames = ['T2', 'T3', 'T4', 'T5', 'T6'];
  const todayStr = new Date().toISOString().split('T')[0];

  const startObj = new Date(schoolStartDateStr);
  startObj.setDate(startObj.getDate() + (weekNumber - 1) * 7);

  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(startObj);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    days.push({
      dateStr,
      dayLabel: `${dayNames[i]} (${formatted})`,
      shortLabel: `${shortNames[i]} ${formatted}`,
      isToday: dateStr === todayStr
    });
  }

  return days;
}

/**
 * Returns month number for a week (9 = September, 10 = October, ..., 5 = May)
 */
export function getMonthForWeek(weekNumber: number): number {
  if (weekNumber <= 4) return 9;
  if (weekNumber <= 8) return 10;
  if (weekNumber <= 13) return 11;
  if (weekNumber <= 17) return 12;
  if (weekNumber <= 21) return 1;
  if (weekNumber <= 25) return 2;
  if (weekNumber <= 29) return 3;
  if (weekNumber <= 33) return 4;
  return 5;
}

/**
 * Build 35 standard academic weeks with initial status
 */
export function buildStandardAcademicWeeks(
  currentWeek: number,
  lockedWeeks: number[] = [],
  startDate: string = DEFAULT_SCHOOL_START_DATE
): AcademicWeek[] {
  const weeks: AcademicWeek[] = [];

  for (let w = 1; w <= 35; w++) {
    const range = getWeekDateRange(w, startDate);
    const month = getMonthForWeek(w);
    const semester: 1 | 2 = w <= 18 ? 1 : 2;

    let status: WeekStatus = 'draft';
    if (lockedWeeks.includes(w)) {
      status = 'locked';
    } else if (w <= currentWeek) {
      status = 'active';
    }

    weeks.push({
      weekNumber: w,
      semester,
      month,
      startDate: range.start,
      endDate: range.end,
      status
    });
  }

  return weeks;
}

/**
 * Prompt 10: Unified Academic Time Utility
 * Returns all standardized academic time dimensions from real dates:
 * - today, current week, month, semester, school year, date range
 */
export interface UnifiedAcademicTimeInfo {
  dateStr: string; // YYYY-MM-DD
  todayFormatted: string; // e.g. "Thứ Bảy, 12/09/2026"
  shortDateFormatted: string; // e.g. "12/09/2026"
  currentWeek: number; // 1-35
  currentMonth: number; // 1-12
  currentSemester: 1 | 2;
  schoolYear: string; // "2026–2027"
  weekDateRange: string; // "07/09 - 11/09"
  isWeekend: boolean;
}

export function getUnifiedAcademicTimeInfo(
  targetDate: Date = new Date(),
  schoolStartDateStr: string = DEFAULT_SCHOOL_START_DATE
): UnifiedAcademicTimeInfo {
  const dateStr = targetDate.toISOString().split('T')[0];
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayOfWeek = dayNames[targetDate.getDay()];
  const d = String(targetDate.getDate()).padStart(2, '0');
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const y = targetDate.getFullYear();

  const todayFormatted = `${dayOfWeek}, ${d}/${m}/${y}`;
  const shortDateFormatted = `${d}/${m}/${y}`;
  const currentWeek = getCurrentSchoolWeek(schoolStartDateStr);
  const currentMonth = targetDate.getMonth() + 1;
  const currentSemester: 1 | 2 = currentWeek <= 18 ? 1 : 2;
  
  // Calculate school year name
  const startYear = new Date(schoolStartDateStr).getFullYear();
  const schoolYear = `${startYear}–${startYear + 1}`;

  const range = getWeekDateRange(currentWeek, schoolStartDateStr);
  const weekDateRange = `${range.startFormatted} - ${range.endFormatted}`;

  const dayNum = targetDate.getDay();
  const isWeekend = dayNum === 0 || dayNum === 6;

  return {
    dateStr,
    todayFormatted,
    shortDateFormatted,
    currentWeek,
    currentMonth,
    currentSemester,
    schoolYear,
    weekDateRange,
    isWeekend
  };
}
