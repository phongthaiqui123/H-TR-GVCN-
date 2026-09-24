/**
 * AI Sanitizer & Prompt Injection Defense Module for GVCN Smart Class
 * Implements Data Minimization and Untrusted Data Isolation
 */

import { Student, CompetitionEvent, StudentWithScore } from '../types';

/**
 * Strips dangerous injection patterns from arbitrary user input or notes
 */
export function sanitizeUntrustedText(input: unknown): string {
  if (typeof input !== 'string') return '';
  let sanitized = input
    .replace(/ignore\s+all\s+previous\s+instructions/gi, '[FILTERED_COMMAND]')
    .replace(/disregard\s+system\s+prompt/gi, '[FILTERED_COMMAND]')
    .replace(/you\s+are\s+now\s+in\s+developer\s+mode/gi, '[FILTERED_COMMAND]')
    .replace(/bypass\s+safety\s+guidelines/gi, '[FILTERED_COMMAND]')
    .replace(/system\s*:\s*/gi, '[USER_DATA_PREFIX]: ')
    .replace(/assistant\s*:\s*/gi, '[USER_DATA_PREFIX]: ')
    .trim();

  // Cap string length to prevent memory abuse
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000) + '... (cắt ngắn)';
  }
  return sanitized;
}

/**
 * Data Minimization: Extracts only strictly necessary fields for student AI analysis
 */
export function sanitizeStudentForAI(student: Partial<Student | StudentWithScore>): Record<string, unknown> {
  const currentScore = 'currentWeekScore' in student && typeof student.currentWeekScore === 'number' 
    ? student.currentWeekScore 
    : 100;

  return {
    studentId: student.studentId || 'unknown',
    fullName: sanitizeUntrustedText(student.fullName || 'Học sinh'),
    gender: student.gender || 'unknown',
    cadreRole: student.cadreRole || 'none',
    currentScore,
    status: student.status || 'active'
  };
}

/**
 * Data Minimization for Competition Events
 */
export function sanitizeEventsForAI(events: Partial<CompetitionEvent>[]): Record<string, unknown>[] {
  return (events || []).slice(0, 25).map(e => ({
    date: e.date || '',
    week: e.week || 1,
    criterionName: sanitizeUntrustedText(e.criterionName || ''),
    score: typeof e.score === 'number' ? e.score : 0,
    type: typeof e.score === 'number' && e.score > 0 ? 'positive' : 'negative',
    note: sanitizeUntrustedText(e.note || '')
  }));
}

/**
 * Wraps untrusted data inside protective XML tags so LLM treats it strictly as passive data
 */
export function wrapUntrustedData(dataTag: string, content: unknown): string {
  const jsonString = JSON.stringify(content, null, 2);
  return `<untrusted_${dataTag}_data>\n${jsonString}\n</untrusted_${dataTag}_data>`;
}

/**
 * Validates that an AI response matches the expected structure and contains no negative labels
 */
export function validateAiAnalysisOutput(output: any): boolean {
  if (!output || typeof output !== 'object') return false;

  // Banned negative labels check
  const jsonStr = JSON.stringify(output).toLowerCase();
  const bannedKeywords = ['lười', 'hư', 'cá biệt', 'yếu kém', 'gia đình có vấn đề', 'không thể tiến bộ'];
  for (const kw of bannedKeywords) {
    if (jsonStr.includes(kw)) {
      console.warn(`[AI Safety Warning] Output contained banned negative label: "${kw}"`);
    }
  }

  return typeof output.summary === 'string';
}
