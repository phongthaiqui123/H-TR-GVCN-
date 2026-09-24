import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { auth } from '../firebase/config';
import { useAuth } from './useAuth';
import { 
  ClassInfo, 
  Student, 
  Team, 
  Criterion, 
  CompetitionEvent, 
  WeeklyScore, 
  StudentWithScore, 
  TeamScoreSummary,
  ScoreThresholds,
  ClassCadreRole,
  TeamRole,
  StudentAccount,
  AcademicWeek,
  WeeklySnapshot,
  ImportPreviewStudent,
  ClassBackupData,
  StudentTransferRecord,
  StudentObservation,
  WeeklyCadreReview
} from '../types';
import { 
  getTeacherClasses, 
  getPrimaryClass,
  saveClass, 
  getClassStudents, 
  getClassTeams, 
  getClassCriteria, 
  getClassEvents, 
  getWeeklyScores, 
  addCompetitionEvent, 
  batchAddCompetitionEvents,
  deleteCompetitionEvent, 
  batchDeleteCompetitionEvents,
  saveStudentObservation,
  getClassObservations,
  deleteStudentObservation,
  seedDemoDataForTeacher,
  seedTwoClassesDemoData,
  deleteDemoData,
  saveStudent,
  deleteStudent as removeStudentFromDb,
  batchDeleteStudents as batchRemoveStudentsFromDb,
  batchSaveStudents,
  saveCriteria,
  saveCriterion,
  deleteCriterion as removeCriterionFromDb,
  saveTeams,
  saveTeamPasscode,
  updateClassTeamPasscodes,
  getClassStudentAccounts,
  saveStudentAccount,
  batchSaveStudentAccounts,
  getAcademicWeeks,
  lockWeekInFirestore,
  unlockWeekInFirestore,
  getWeeklySnapshot,
  createNewClass as createNewClassInFirestore,
  recordStudentTransfer,
  getAllClassDataForBackup,
  restoreClassDataFromBackup,
  getSchoolYears,
  createSchoolYear,
  archiveClass,
  getWeeklyCadreReview,
  saveWeeklyCadreReview
} from '../services/firestoreService';
import {
  normalizeCriteriaOrders,
  reorderCriterionToPosition,
  moveCriterionUp,
  moveCriterionDown
} from '../utils/criteriaUtils';
import { DEFAULT_THRESHOLDS, DEFAULT_STARTING_SCORE, calculateRank } from '../utils/constants';
import { buildStandardAcademicWeeks, getCurrentSchoolWeek } from '../utils/academicTime';
import { SchoolYear } from '../types';

interface ClassDataContextType {
  classes: ClassInfo[];
  filteredClasses: ClassInfo[];
  filterMode: 'all' | 'real' | 'demo';
  setFilterMode: (mode: 'all' | 'real' | 'demo') => void;
  isDemoMode: boolean;
  schoolYears: SchoolYear[];
  currentSchoolYear: SchoolYear | null;
  createSchoolYearAction: (name: string, startDate: string, endDate: string, currentWeek?: number) => Promise<SchoolYear>;
  archiveClassAction: (classId: string) => Promise<void>;
  currentClass: ClassInfo | null;
  setCurrentClass: (cls: ClassInfo) => void;
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  students: Student[];
  teams: Team[];
  criteria: Criterion[];
  events: CompetitionEvent[];
  weeklyScores: WeeklyScore[];
  allWeeklyScores: WeeklyScore[];
  studentsWithScores: StudentWithScore[];
  teamSummaries: TeamScoreSummary[];
  loading: boolean;
  teacherName: string;
  updateTeacherName: (name: string) => Promise<void>;
  refreshData: () => Promise<void>;
  createOrUpdateClass: (data: Partial<ClassInfo>) => Promise<void>;
  updateClassConfig: (classId: string, data: Partial<ClassInfo>) => Promise<void>;
  quickAddEvent: (
    studentId: string, 
    criterionId: string, 
    customScore?: number, 
    note?: string,
    evaluator?: { name?: string; roleLabel?: string; studentId?: string; evaluatorId?: string; evaluatorName?: string; evaluatorRole?: string }
  ) => Promise<void>;
  batchAddEvents: (
    studentIds: string[], 
    criterionId: string, 
    customScore?: number, 
    note?: string,
    evaluator?: { name?: string; roleLabel?: string; studentId?: string; evaluatorId?: string; evaluatorName?: string; evaluatorRole?: string }
  ) => Promise<number>;
  removeEvent: (event: CompetitionEvent) => Promise<void>;
  createStudent: (student: Omit<Student, 'studentId' | 'classId' | 'teacherId' | 'createdAt'>) => Promise<void>;
  editStudent: (student: Student) => Promise<void>;
  deleteStudentById: (studentId: string) => Promise<void>;
  batchDeleteStudents: (studentIds: string[]) => Promise<number>;
  batchUpdateStudentsTeam: (studentIds: string[], targetTeamName: string) => Promise<number>;
  deduplicateStudents: () => Promise<{ removedCount: number; keptCount: number }>;
  assignStudentRole: (studentId: string, cadreRole: ClassCadreRole, teamRole: TeamRole, passcode?: string) => Promise<void>;
  batchAssignRoles: (updates: Array<{ studentId: string; cadreRole?: ClassCadreRole; teamRole?: TeamRole }>, passcodes?: Record<string, string>) => Promise<void>;
  teamPasscodes: Record<string, string>;
  updateTeamPasscode: (teamName: string, passcode: string) => Promise<void>;
  batchUpdateTeamPasscodes: (passcodes: Record<string, string>) => Promise<void>;
  updateCriteriaList: (list: Criterion[]) => Promise<void>;
  updateCriterion: (crit: Criterion) => Promise<void>;
  reorderCriterion: (criterionId: string, targetOrder: number) => Promise<void>;
  shiftCriterionStep: (criterionId: string, direction: 'up' | 'down') => Promise<void>;
  normalizeAllCriteria: () => Promise<void>;
  addCriterion: (crit: Omit<Criterion, 'criterionId' | 'classId' | 'teacherId'>) => Promise<void>;
  deleteCriterion: (criterionId: string) => Promise<void>;
  seedDemoData: () => Promise<void>;
  importStudents: (studentsList: Array<{ name: string; teamName: string; notes?: string }>) => Promise<number>;
  studentAccounts: StudentAccount[];
  loadStudentAccounts: () => Promise<void>;
  createOrUpdateStudentAccount: (account: StudentAccount) => Promise<void>;
  batchGenerateStudentAccounts: (options?: { 
    prefix?: string; 
    defaultPassword?: string; 
    format?: 'class_stt' | 'hs_stt' | 'name_stt';
    studentIds?: string[];
  }) => Promise<StudentAccount[]>;
  updateStudentAccountUsername: (studentId: string, newUsername: string, newPassword?: string) => Promise<void>;
  syncStudentAccountsWithActualRoles: (forceRoleUsernames?: boolean) => Promise<{ updatedCount: number }>;
  weeklyCadreReview: WeeklyCadreReview | null;
  cadreReviewLoading: boolean;
  saveCadreReview: (review: WeeklyCadreReview) => Promise<void>;
  toggleStudentAccountStatus: (accountId: string, isActive: boolean) => Promise<void>;
  resetStudentAccountPassword: (accountId: string, newPassword?: string) => Promise<void>;
  academicWeeks: AcademicWeek[];
  isCurrentWeekLocked: boolean;
  lockWeek: (weekNumber: number) => Promise<void>;
  unlockWeek: (weekNumber: number) => Promise<void>;
  getWeekSnapshotData: (weekNumber: number) => Promise<WeeklySnapshot | null>;
  recentActions: Array<{ eventId: string; studentName: string; criterionName: string; score: number; date: string; timestamp: number }>;
  undoEvent: (eventId: string) => Promise<boolean>;
  undoBatchEvents: (eventIds: string[]) => Promise<boolean>;
  lastBatchResult: { eventIds: string[]; count: number; criterionName: string; score: number } | null;
  clearLastBatchResult: () => void;
  observations: StudentObservation[];
  addObservation: (obs: Omit<StudentObservation, 'observationId' | 'classId' | 'teacherId' | 'createdAt'>) => Promise<void>;
  removeObservation: (observationId: string) => Promise<void>;
  createNewClassAction: (
    classData: { schoolName?: string; className: string; grade: string; schoolYear: string; teamCount?: number },
    initialStudents?: ImportPreviewStudent[]
  ) => Promise<ClassInfo>;
  seedSecondClassDemo: () => Promise<void>;
  seedFullDemoClasses: (onProgress?: (status: string, percent: number) => void) => Promise<{ class1: ClassInfo; class2: ClassInfo; integritySummary?: string }>;
  reloadDemoDataAction: (onProgress?: (status: string, percent: number) => void) => Promise<{ class1: ClassInfo; class2: ClassInfo; integritySummary?: string }>;
  deleteDemoDataAction: () => Promise<{ deletedClasses: number; deletedStudents: number; deletedScores: number; deletedEvents: number }>;
  importStudentsFromPreview: (
    previewItems: ImportPreviewStudent[],
    targetClassId?: string,
    targetTeams?: Team[]
  ) => Promise<{ addedCount: number; updatedCount: number }>;
  transferStudentToClass: (studentId: string, toClassId: string, reason: string) => Promise<void>;
  exportBackupJson: () => Promise<void>;
  restoreFromBackup: (backup: ClassBackupData) => Promise<void>;
}

const ClassDataContext = createContext<ClassDataContextType | undefined>(undefined);

export const ClassDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, updateTeacherDisplayName } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [currentClass, setCurrentClass] = useState<ClassInfo | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(8);
  const [students, setStudents] = useState<Student[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [allWeeklyScores, setAllWeeklyScores] = useState<WeeklyScore[]>([]);
  const [studentAccounts, setStudentAccounts] = useState<StudentAccount[]>([]);
  const [observations, setObservations] = useState<StudentObservation[]>([]);
  const [weeklyCadreReview, setWeeklyCadreReview] = useState<WeeklyCadreReview | null>(null);
  const [cadreReviewLoading, setCadreReviewLoading] = useState<boolean>(false);
  const [lastBatchResult, setLastBatchResult] = useState<{ eventIds: string[]; count: number; criterionName: string; score: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'real' | 'demo'>('all');
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [academicWeeks, setAcademicWeeks] = useState<AcademicWeek[]>(() =>
    buildStandardAcademicWeeks(8, [])
  );
  const [recentActions, setRecentActions] = useState<Array<{
    eventId: string;
    studentName: string;
    criterionName: string;
    score: number;
    date: string;
    timestamp: number;
  }>>([]);

  const isDemoMode = Boolean(currentClass?.isDemo);

  const filteredClasses = useMemo(() => {
    if (filterMode === 'real') {
      return classes.filter(c => !c.isDemo && c.status !== 'archived');
    }
    if (filterMode === 'demo') {
      return classes.filter(c => c.isDemo && c.status !== 'archived');
    }
    return classes.filter(c => c.status !== 'archived');
  }, [classes, filterMode]);

  const currentSchoolYear = useMemo(() => {
    return schoolYears.find(sy => sy.isCurrent) || schoolYears[0] || null;
  }, [schoolYears]);

  // Load School Years
  useEffect(() => {
    if (user) {
      getSchoolYears(user.uid).then(setSchoolYears).catch(console.warn);
    }
  }, [user]);

  // 1. Fetch Teacher Classes
  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      let list = await getTeacherClasses(user?.uid || '');
      if (list.length === 0) {
        // Check if there is already an existing primary class in the database
        const primary = await getPrimaryClass();
        if (primary) {
          list = [primary];
        }
      }
      setClasses(list);

      const savedClassId = typeof localStorage !== 'undefined' ? localStorage.getItem('gvcn_active_class_id') : null;
      const activeCls = (savedClassId ? list.find(c => c.classId === savedClassId) : null)
        || list.find(c => !c.isDemo && c.status !== 'archived')
        || list.find(c => c.status !== 'archived')
        || list[0]
        || null;

      if (activeCls) {
        // Automatically normalize teacher name away from old demo template placeholder
        if (!activeCls.teacherName || activeCls.teacherName.includes('Nguyễn Mai Lan')) {
          activeCls.teacherName = (typeof localStorage !== 'undefined' ? localStorage.getItem('gvcn_custom_teacher_name') : null) || 'Thầy Phong Qui';
          saveClass(activeCls).catch(console.warn);
        }
        setSelectedWeek(activeCls.currentWeek || 8);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('gvcn_active_class_id', activeCls.classId);
        }
      }
      setCurrentClass(activeCls);
    } catch (err) {
      console.warn('Could not load classes, recovering state:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // 2. Fetch data for Current Class & Selected Week
  const loadClassDetails = useCallback(async () => {
    if (!currentClass) return;
    try {
      const [stds, tms, crits, evts, scores, accounts, rawWeeks, obss] = await Promise.all([
        getClassStudents(currentClass.classId),
        getClassTeams(currentClass.classId),
        getClassCriteria(currentClass.classId),
        getClassEvents(currentClass.classId),
        getWeeklyScores(currentClass.classId),
        getClassStudentAccounts(currentClass.classId),
        getAcademicWeeks(currentClass.classId),
        getClassObservations(currentClass.classId),
      ]);

      setStudents(stds);
      setTeams(tms);
      setCriteria(normalizeCriteriaOrders(crits));
      setEvents(evts);
      setAllWeeklyScores(scores);
      setStudentAccounts(accounts);
      setObservations(obss);

      const lockedWeekNums = rawWeeks.filter(w => w.status === 'locked').map(w => w.weekNumber);
      const standardWeeks = buildStandardAcademicWeeks(
        currentClass.currentWeek || 8,
        lockedWeekNums
      );
      setAcademicWeeks(standardWeeks);
    } catch (err) {
      console.error('Failed to load class details:', err);
    }
  }, [currentClass]);

  useEffect(() => {
    if (currentClass) {
      loadClassDetails();
    }
  }, [currentClass, loadClassDetails]);

  // Load weekly cadre review for current class and selected week
  useEffect(() => {
    if (currentClass?.classId && selectedWeek) {
      setCadreReviewLoading(true);
      getWeeklyCadreReview(currentClass.classId, selectedWeek)
        .then(review => {
          setWeeklyCadreReview(review);
        })
        .catch(err => {
          console.warn('Error loading weekly cadre review:', err);
          setWeeklyCadreReview(null);
        })
        .finally(() => {
          setCadreReviewLoading(false);
        });
    } else {
      setWeeklyCadreReview(null);
    }
  }, [currentClass?.classId, selectedWeek]);

  // Filter scores for selected week
  const weeklyScores = useMemo(() => {
    return allWeeklyScores.filter(s => s.week === selectedWeek);
  }, [allWeeklyScores, selectedWeek]);

  // Check if current week is locked
  const isCurrentWeekLocked = useMemo(() => {
    const found = academicWeeks.find(w => w.weekNumber === selectedWeek);
    return found?.status === 'locked';
  }, [academicWeeks, selectedWeek]);

  // Compute rich student items with scores, ranking and trend
  const studentsWithScores = useMemo<StudentWithScore[]>(() => {
    const startingScore = currentClass?.startingScore || DEFAULT_STARTING_SCORE;

    const items: StudentWithScore[] = students.map((std) => {
      // Find score for selected week
      const currentScoreObj = allWeeklyScores.find(
        (s) => s.studentId === std.studentId && s.week === selectedWeek
      );

      // Find score for previous week (for trend)
      const prevScoreObj = allWeeklyScores.find(
        (s) => s.studentId === std.studentId && s.week === selectedWeek - 1
      );

      // Current week events
      const studentWeekEvents = events.filter(
        (e) => e.studentId === std.studentId && e.week === selectedWeek
      );

      let totalPos = currentScoreObj?.totalPositive ?? 0;
      let totalNeg = currentScoreObj?.totalNegative ?? 0;
      let finalScore = currentScoreObj?.finalScore ?? (startingScore + totalPos - totalNeg);

      // If no score record yet, compute directly from events
      if (!currentScoreObj && studentWeekEvents.length > 0) {
        totalPos = studentWeekEvents.filter(e => e.score > 0).reduce((sum, e) => sum + e.score, 0);
        totalNeg = studentWeekEvents.filter(e => e.score < 0).reduce((sum, e) => sum + Math.abs(e.score), 0);
        finalScore = startingScore + totalPos - totalNeg;
      }

      // Monthly score (average of last 4 weeks up to selectedWeek)
      const recent4Weeks = allWeeklyScores.filter(
        (s) => s.studentId === std.studentId && s.week <= selectedWeek && s.week >= selectedWeek - 3
      );
      const monthlyScore = recent4Weeks.length > 0
        ? Math.round((recent4Weeks.reduce((acc, curr) => acc + curr.finalScore, 0) / recent4Weeks.length) * 10) / 10
        : finalScore;

      // Trend calculation
      const prevScore = prevScoreObj?.finalScore ?? finalScore;
      const trendDiff = finalScore - prevScore;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (trendDiff > 1) trend = 'up';
      else if (trendDiff < -1) trend = 'down';

      const rankInfo = calculateRank(finalScore, DEFAULT_THRESHOLDS);

      return {
        ...std,
        currentWeekScore: finalScore,
        totalPositive: totalPos,
        totalNegative: totalNeg,
        rankCategory: rankInfo.category,
        stars: rankInfo.stars,
        monthlyScore,
        trend,
        trendValue: trendDiff,
        eventCount: studentWeekEvents.length,
      };
    });

    // Sort by current week score descending to determine ranks
    items.sort((a, b) => b.currentWeekScore - a.currentWeekScore);
    items.forEach((item, idx) => {
      item.rankNumber = idx + 1;
    });

    return items;
  }, [students, allWeeklyScores, events, selectedWeek, currentClass]);

  // Compute Team Summaries
  const teamSummaries = useMemo<TeamScoreSummary[]>(() => {
    const list: TeamScoreSummary[] = teams.map((team) => {
      const teamStudents = studentsWithScores.filter(s => s.teamId === team.teamId || s.teamName === team.teamName);
      const studentCount = teamStudents.length;
      const totalScore = teamStudents.reduce((sum, s) => sum + s.currentWeekScore, 0);
      const avgScore = studentCount > 0 ? Math.round((totalScore / studentCount) * 10) / 10 : 0;
      const totalPositive = teamStudents.reduce((sum, s) => sum + s.totalPositive, 0);
      const totalNegative = teamStudents.reduce((sum, s) => sum + s.totalNegative, 0);

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        studentCount,
        totalScore,
        avgScore,
        totalPositive,
        totalNegative,
        rank: 0,
        color: team.color,
      };
    });

    // Sort by avgScore descending
    list.sort((a, b) => b.avgScore - a.avgScore);
    list.forEach((t, i) => {
      t.rank = i + 1;
    });

    return list;
  }, [teams, studentsWithScores]);

  // 3. Quick Action: Add Event (Chấm thi đua 1 chạm)
  const quickAddEvent = async (
    studentId: string, 
    criterionId: string, 
    customScore?: number, 
    note?: string,
    evaluator?: { name?: string; roleLabel?: string; studentId?: string; evaluatorId?: string; evaluatorName?: string; evaluatorRole?: string }
  ) => {
    if (!currentClass || !user) return;

    if (isCurrentWeekLocked) {
      alert(`Tuần ${selectedWeek} đã được khóa sổ thi đua. Không thể chấm thêm hoặc chỉnh sửa điểm.`);
      return;
    }

    const student = students.find(s => s.studentId === studentId);
    const criterion = criteria.find(c => c.criterionId === criterionId);
    if (!student || !criterion) return;

    const score = typeof customScore === 'number' 
      ? customScore 
      : (criterion.positiveScore > 0 ? criterion.positiveScore : criterion.negativeScore);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const eventId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const evId = evaluator?.evaluatorId || evaluator?.studentId || (user.uid === 'teacher' ? 'teacher' : user.uid);
    const evName = evaluator?.evaluatorName || evaluator?.name || teacherName || 'Giáo viên chủ nhiệm';
    const evRole = evaluator?.evaluatorRole || evaluator?.roleLabel || 'Giáo viên chủ nhiệm';

    const newEvent: CompetitionEvent = {
      eventId,
      teacherId: user.uid,
      classId: currentClass.classId,
      studentId,
      studentName: student.fullName || '',
      criterionId,
      criterionName: criterion.name || '',
      week: selectedWeek,
      date: dateStr,
      score,
      note: note || '',
      createdAt: now.toISOString(),
      evaluatorId: evId,
      evaluatorName: evName,
      evaluatorRole: evRole,
      source: 'manual'
    };

    // Optimistic state update
    setEvents(prev => [newEvent, ...prev]);

    // Record to recent actions for quick undo
    setRecentActions(prev => [{
      eventId,
      studentName: student.fullName || 'Học sinh',
      criterionName: criterion.name || '',
      score,
      date: dateStr,
      timestamp: Date.now()
    }, ...prev].slice(0, 25));

    // Recalculate and update weeklyScore in memory
    const updatedWeeklyScore = (allWeeklyScores.find(s => s.studentId === studentId && s.week === selectedWeek)?.finalScore || currentClass.startingScore) + score;
    const rankInfo = calculateRank(updatedWeeklyScore, DEFAULT_THRESHOLDS);

    setAllWeeklyScores(prev => {
      const exists = prev.find(s => s.studentId === studentId && s.week === selectedWeek);
      if (exists) {
        return prev.map(s => s.studentId === studentId && s.week === selectedWeek ? {
          ...s,
          finalScore: updatedWeeklyScore,
          totalPositive: score > 0 ? s.totalPositive + score : s.totalPositive,
          totalNegative: score < 0 ? s.totalNegative + Math.abs(score) : s.totalNegative,
          rankCategory: rankInfo.category,
          stars: rankInfo.stars,
        } : s);
      } else {
        return [...prev, {
          scoreId: `ws_${studentId}_w${selectedWeek}`,
          teacherId: user.uid,
          classId: currentClass.classId,
          studentId,
          week: selectedWeek,
          startingScore: currentClass.startingScore,
          totalPositive: score > 0 ? score : 0,
          totalNegative: score < 0 ? Math.abs(score) : 0,
          finalScore: updatedWeeklyScore,
          rankCategory: rankInfo.category,
          stars: rankInfo.stars,
          updatedAt: now.toISOString(),
        }];
      }
    });

    // Save to Firestore
    await addCompetitionEvent(newEvent, currentClass.startingScore, DEFAULT_THRESHOLDS);
  };

  const batchAddEvents = async (
    studentIds: string[], 
    criterionId: string, 
    customScore?: number, 
    note?: string,
    evaluator?: { name?: string; roleLabel?: string; studentId?: string; evaluatorId?: string; evaluatorName?: string; evaluatorRole?: string }
  ): Promise<number> => {
    if (!currentClass || !user || studentIds.length === 0) return 0;

    if (isCurrentWeekLocked) {
      alert(`Tuần ${selectedWeek} đã được khóa sổ thi đua. Không thể chấm thêm hoặc chỉnh sửa điểm.`);
      return 0;
    }

    const criterion = criteria.find(c => c.criterionId === criterionId);
    if (!criterion) return 0;

    const score = typeof customScore === 'number'
      ? customScore
      : (criterion.positiveScore > 0 ? criterion.positiveScore : criterion.negativeScore);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const newEvents: CompetitionEvent[] = [];

    const evId = evaluator?.evaluatorId || evaluator?.studentId || (user.uid === 'teacher' ? 'teacher' : user.uid);
    const evName = evaluator?.evaluatorName || evaluator?.name || teacherName || 'Giáo viên chủ nhiệm';
    const evRole = evaluator?.evaluatorRole || evaluator?.roleLabel || 'Giáo viên chủ nhiệm';

    for (const studentId of studentIds) {
      const student = students.find(s => s.studentId === studentId);
      if (!student) continue;

      const eventId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newEvent: CompetitionEvent = {
        eventId,
        teacherId: user.uid,
        classId: currentClass.classId,
        studentId,
        studentName: student.fullName || '',
        criterionId,
        criterionName: criterion.name || '',
        week: selectedWeek,
        date: dateStr,
        score,
        note: note || '',
        createdAt: now.toISOString(),
        evaluatorId: evId,
        evaluatorName: evName,
        evaluatorRole: evRole,
        source: 'manual'
      };
      newEvents.push(newEvent);
    }

    if (newEvents.length === 0) return 0;

    // Optimistic UI updates
    setEvents(prev => [...newEvents, ...prev]);

    // Record to recent actions for undo
    const newActions = newEvents.map(e => ({
      eventId: e.eventId,
      studentName: e.studentName || 'Học sinh',
      criterionName: e.criterionName || '',
      score: e.score,
      date: e.date,
      timestamp: Date.now()
    }));
    setRecentActions(prev => [...newActions, ...prev].slice(0, 30));

    setAllWeeklyScores(prev => {
      let updated = [...prev];
      for (const ev of newEvents) {
        const studentId = ev.studentId;
        const exists = updated.find(s => s.studentId === studentId && s.week === selectedWeek);
        const currentScore = exists ? exists.finalScore : currentClass.startingScore;
        const newScore = currentScore + score;
        const rankInfo = calculateRank(newScore, DEFAULT_THRESHOLDS);

        if (exists) {
          updated = updated.map(s => (s.studentId === studentId && s.week === selectedWeek) ? {
            ...s,
            finalScore: newScore,
            totalPositive: score > 0 ? s.totalPositive + score : s.totalPositive,
            totalNegative: score < 0 ? s.totalNegative + Math.abs(score) : s.totalNegative,
            rankCategory: rankInfo.category,
            stars: rankInfo.stars,
            updatedAt: now.toISOString(),
          } : s);
        } else {
          updated.push({
            scoreId: `ws_${studentId}_w${selectedWeek}`,
            teacherId: user.uid,
            classId: currentClass.classId,
            studentId,
            week: selectedWeek,
            startingScore: currentClass.startingScore,
            totalPositive: score > 0 ? score : 0,
            totalNegative: score < 0 ? Math.abs(score) : 0,
            finalScore: newScore,
            rankCategory: rankInfo.category,
            stars: rankInfo.stars,
            updatedAt: now.toISOString(),
          });
        }
      }
      return updated;
    });

    // Save each to Firestore in atomic batch
    await batchAddCompetitionEvents(newEvents, currentClass.classId, selectedWeek, currentClass.startingScore, DEFAULT_THRESHOLDS);

    // Save last batch result for instant undo / notification banner
    setLastBatchResult({
      eventIds: newEvents.map(e => e.eventId),
      count: newEvents.length,
      criterionName: criterion.name || 'Ghi nhận',
      score
    });

    return newEvents.length;
  };

  // Remove Event
  const removeEvent = async (event: CompetitionEvent) => {
    if (!currentClass) return;
    setEvents(prev => prev.filter(e => e.eventId !== event.eventId));
    await deleteCompetitionEvent(
      event.eventId, 
      event.classId, 
      event.studentId, 
      event.week, 
      currentClass.startingScore, 
      DEFAULT_THRESHOLDS
    );
    await loadClassDetails();
  };

  // Student CRUD
  const createStudent = async (data: Omit<Student, 'studentId' | 'classId' | 'teacherId' | 'createdAt'>) => {
    if (!currentClass || !user) return;
    const studentId = `std_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newStudent: Student = {
      ...data,
      studentId,
      classId: currentClass.classId,
      teacherId: user.uid,
      createdAt: new Date().toISOString(),
    };
    await saveStudent(newStudent);
    setStudents(prev => [...prev, newStudent].sort((a, b) => a.studentNumber - b.studentNumber));
  };

  const editStudent = async (student: Student) => {
    await saveStudent(student);
    setStudents(prev => prev.map(s => s.studentId === student.studentId ? student : s));
  };

  const deleteStudentById = async (studentId: string) => {
    await removeStudentFromDb(studentId);
    setStudents(prev => prev.filter(s => s.studentId !== studentId));
  };

  const batchDeleteStudents = async (studentIds: string[]) => {
    if (!studentIds || studentIds.length === 0) return 0;
    await batchRemoveStudentsFromDb(studentIds);
    setStudents(prev => prev.filter(s => !studentIds.includes(s.studentId)));
    return studentIds.length;
  };

  const batchUpdateStudentsTeam = async (studentIds: string[], targetTeamName: string) => {
    if (!studentIds || studentIds.length === 0 || !currentClass) return 0;
    const matchedTeam = teams.find(t => t.teamName.toLowerCase() === targetTeamName.toLowerCase()) || teams[0];
    const updatedList: Student[] = [];
    const newStudents = students.map(s => {
      if (studentIds.includes(s.studentId)) {
        const updated: Student = {
          ...s,
          teamId: matchedTeam ? matchedTeam.teamId : s.teamId,
          teamName: targetTeamName,
        };
        updatedList.push(updated);
        return updated;
      }
      return s;
    });
    setStudents(newStudents);
    await batchSaveStudents(updatedList);
    return updatedList.length;
  };

  const deduplicateStudents = async (): Promise<{ removedCount: number; keptCount: number }> => {
    if (!currentClass || students.length === 0) return { removedCount: 0, keptCount: 0 };
    
    // Group students by normalized name
    const groups = new Map<string, Student[]>();
    students.forEach(std => {
      const key = std.fullName.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(std);
    });

    const idsToRemove: string[] = [];
    let keptCount = 0;

    groups.forEach((groupStudents) => {
      if (groupStudents.length > 1) {
        // Find best student to keep:
        // 1. One with a cadre role or team leader role
        // 2. One with phone or notes
        // 3. Or the first created / lowest studentNumber
        let best = groupStudents[0];
        for (let i = 1; i < groupStudents.length; i++) {
          const candidate = groupStudents[i];
          const bestScore = (best.cadreRole && best.cadreRole !== 'none' ? 10 : 0) + 
                            (best.isTeamLeader ? 5 : 0) + 
                            (best.parentPhone ? 2 : 0) + 
                            (best.notes ? 1 : 0);
          const candScore = (candidate.cadreRole && candidate.cadreRole !== 'none' ? 10 : 0) + 
                            (candidate.isTeamLeader ? 5 : 0) + 
                            (candidate.parentPhone ? 2 : 0) + 
                            (candidate.notes ? 1 : 0);
          if (candScore > bestScore) {
            best = candidate;
          }
        }

        groupStudents.forEach(s => {
          if (s.studentId !== best.studentId) {
            idsToRemove.push(s.studentId);
          } else {
            keptCount++;
          }
        });
      } else {
        keptCount++;
      }
    });

    if (idsToRemove.length > 0) {
      await batchRemoveStudentsFromDb(idsToRemove);
      setStudents(prev => prev.filter(s => !idsToRemove.includes(s.studentId)));
    }

    return { removedCount: idsToRemove.length, keptCount };
  };

  const teamPasscodes = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {
      'Tổ 1': '1234',
      'Tổ 2': '1234',
      'Tổ 3': '1234',
      'Tổ 4': '1234',
      'Tổ 5': '1234',
    };

    if (currentClass?.teamLeaderPasscodes) {
      Object.entries(currentClass.teamLeaderPasscodes).forEach(([k, v]) => {
        if (v) result[k] = v;
      });
    }

    teams.forEach(t => {
      if (t.teamName && t.passcode) {
        result[t.teamName] = t.passcode;
      }
    });

    students.forEach(s => {
      if ((s.isTeamLeader || s.teamRole === 'to_truong') && s.teamName && s.teamLeaderPasscode) {
        result[s.teamName] = s.teamLeaderPasscode;
      }
    });

    if (typeof localStorage !== 'undefined' && currentClass?.classId) {
      try {
        const cached = JSON.parse(localStorage.getItem(`gvcn_passcodes_${currentClass.classId}`) || '{}');
        Object.entries(cached).forEach(([k, v]) => {
          if (v && typeof v === 'string') result[k] = v;
        });
      } catch {}
    }

    return result;
  }, [currentClass, teams, students]);

  const updateTeamPasscode = async (teamName: string, passcode: string) => {
    if (!currentClass) return;
    const cleanPasscode = passcode.trim() || '1234';
    await saveTeamPasscode(currentClass.classId, teamName, cleanPasscode);
    setTeams(prev => prev.map(t => t.teamName === teamName ? { ...t, passcode: cleanPasscode } : t));
    setCurrentClass(prev => prev ? {
      ...prev,
      teamLeaderPasscodes: {
        ...(prev.teamLeaderPasscodes || {}),
        [teamName]: cleanPasscode
      }
    } : null);
  };

  const batchUpdateTeamPasscodes = async (passcodes: Record<string, string>) => {
    if (!currentClass) return;
    await updateClassTeamPasscodes(currentClass.classId, passcodes);
    setTeams(prev => prev.map(t => passcodes[t.teamName] ? { ...t, passcode: passcodes[t.teamName] } : t));
    setCurrentClass(prev => prev ? {
      ...prev,
      teamLeaderPasscodes: {
        ...(prev.teamLeaderPasscodes || {}),
        ...passcodes
      }
    } : null);
  };

  const assignStudentRole = async (
    studentId: string, 
    cadreRole: ClassCadreRole, 
    teamRole: TeamRole,
    passcode?: string
  ) => {
    const student = students.find(s => s.studentId === studentId);
    if (!student) return;

    const isTeamLeader = teamRole === 'to_truong';
    const effectivePasscode = isTeamLeader ? (passcode?.trim() || student.teamLeaderPasscode || '1234') : undefined;

    const updatedStudent: Student = {
      ...student,
      cadreRole,
      teamRole,
      isTeamLeader,
      teamLeaderPasscode: effectivePasscode,
    };

    await saveStudent(updatedStudent);
    setStudents(prev => prev.map(s => s.studentId === studentId ? updatedStudent : s));

    if (isTeamLeader && currentClass && effectivePasscode && student.teamName) {
      await updateTeamPasscode(student.teamName, effectivePasscode);
    }
  };

  const batchAssignRoles = async (
    updates: Array<{ studentId: string; cadreRole?: ClassCadreRole; teamRole?: TeamRole }>,
    passcodes?: Record<string, string>
  ) => {
    const updatedStudents = students.map(s => {
      const found = updates.find(u => u.studentId === s.studentId);
      if (!found) return s;
      const newCadre = found.cadreRole !== undefined ? found.cadreRole : (s.cadreRole || 'none');
      const newTeamRole = found.teamRole !== undefined ? found.teamRole : (s.teamRole || 'thanh_vien');
      const isLeader = newTeamRole === 'to_truong';
      const teamCode = isLeader && passcodes && s.teamName ? passcodes[s.teamName] : s.teamLeaderPasscode;
      return {
        ...s,
        cadreRole: newCadre,
        teamRole: newTeamRole,
        isTeamLeader: isLeader,
        teamLeaderPasscode: isLeader ? (teamCode || '1234') : undefined,
      };
    });

    setStudents(updatedStudents);
    await Promise.all(
      updates.map(u => {
        const full = updatedStudents.find(s => s.studentId === u.studentId);
        return full ? saveStudent(full) : Promise.resolve();
      })
    );

    if (passcodes && currentClass) {
      await batchUpdateTeamPasscodes(passcodes);
    }
  };

  const createOrUpdateClass = async (data: Partial<ClassInfo>) => {
    if (!user) return;
    const classId = data.classId || `class_${Date.now()}`;
    const classObj: ClassInfo = {
      classId,
      teacherId: user.uid,
      className: data.className || 'Lớp mới',
      grade: data.grade || 'Khối 5',
      schoolYear: data.schoolYear || '2026-2027',
      currentWeek: data.currentWeek || 8,
      totalWeeks: data.totalWeeks || 35,
      startingScore: data.startingScore ?? DEFAULT_STARTING_SCORE,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    await saveClass(classObj);
    await loadClasses();
    setCurrentClass(classObj);
  };

  const updateClassConfig = async (classId: string, data: Partial<ClassInfo>) => {
    if (!currentClass) return;
    const updated: ClassInfo = {
      ...currentClass,
      ...data,
      classId,
    };
    await saveClass(updated);
    setCurrentClass(updated);
    setClasses(prev => prev.map(c => c.classId === classId ? updated : c));

    if (data.teacherName) {
      try {
        await updateTeacherDisplayName(data.teacherName);
      } catch (e) {
        console.warn('Sync teacherName to profile failed:', e);
      }
    }
  };

  const [customTeacherName, setCustomTeacherName] = useState<string>(() => {
    const saved = localStorage.getItem('gvcn_custom_teacher_name');
    if (saved && saved !== 'Cô Nguyễn Mai Lan') return saved;
    return '';
  });

  const teacherName = customTeacherName 
    || (currentClass?.teacherName && !currentClass.teacherName.includes('Nguyễn Mai Lan') ? currentClass.teacherName : '')
    || (profile?.displayName && !profile.displayName.includes('Nguyễn Mai Lan') ? profile.displayName : '')
    || 'Thầy Phong Qui';

  const updateTeacherName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // 0. Update optimistic state & localStorage immediately
    setCustomTeacherName(trimmed);
    localStorage.setItem('gvcn_custom_teacher_name', trimmed);

    // 1. Sync with Auth Profile
    try {
      await updateTeacherDisplayName(trimmed);
    } catch (e) {
      console.warn('Sync teacher name to auth failed:', e);
    }

    // 2. Update ClassInfo in state and firestore
    if (currentClass) {
      const updatedClass: ClassInfo = {
        ...currentClass,
        teacherName: trimmed,
      };
      setCurrentClass(updatedClass);
      setClasses(prev => prev.map(c => c.classId === currentClass.classId ? updatedClass : c));
      try {
        await saveClass(updatedClass);
      } catch (e) {
        console.warn('Save updated teacher name to class failed:', e);
      }
    }
  };

  // --- Student Accounts & Credential Methods ---
  const loadStudentAccounts = useCallback(async () => {
    if (!currentClass) return;
    try {
      const list = await getClassStudentAccounts(currentClass.classId);
      setStudentAccounts(list);
    } catch (err) {
      console.error('Error loading student accounts:', err);
    }
  }, [currentClass]);

  const createOrUpdateStudentAccount = async (account: StudentAccount) => {
    await saveStudentAccount(account);
    setStudentAccounts(prev => {
      const idx = prev.findIndex(a => a.accountId === account.accountId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = account;
        return next;
      }
      return [...prev, account];
    });
    setStudents(prev => prev.map(s => s.studentId === account.studentId ? {
      ...s,
      accountUsername: account.username,
      accountPassword: account.password,
      isAccountActive: account.isActive,
    } : s));
  };

  const batchGenerateStudentAccounts = async (options?: { 
    prefix?: string; 
    defaultPassword?: string; 
    format?: 'class_stt' | 'hs_stt' | 'name_stt';
    studentIds?: string[];
  }): Promise<StudentAccount[]> => {
    if (!currentClass || students.length === 0) return [];
    const format = options?.format || 'class_stt';
    const defPass = options?.defaultPassword || '123456';
    const targetStudents = options?.studentIds && options.studentIds.length > 0
      ? students.filter(s => options.studentIds!.includes(s.studentId))
      : students;

    const classPrefix = (currentClass.className || '11a9')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    const removeTones = (str: string) => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
    };

    const generatedAccounts: StudentAccount[] = [];

    targetStudents.forEach((std) => {
      const padStt = String(std.studentNumber || 1).padStart(2, '0');
      let username = '';
      if (format === 'hs_stt') {
        username = `hs${padStt}`;
      } else if (format === 'name_stt') {
        const nameParts = std.fullName.trim().split(/\s+/);
        const lastPart = nameParts[nameParts.length - 1] || 'hs';
        const cleanLast = removeTones(lastPart).toLowerCase().replace(/[^a-z0-9]/g, '');
        username = `${cleanLast}${padStt}`;
      } else {
        username = `${classPrefix}_${padStt}`;
      }

      if (options?.prefix) {
        username = `${options.prefix.toLowerCase().replace(/[^a-z0-9_]/g, '')}_${padStt}`;
      }

      const isLeader = std.isTeamLeader || std.teamRole === 'to_truong';
      const isViceLeader = std.teamRole === 'to_pho';
      const isLopTruong = std.cadreRole === 'lop_truong';
      const isLopPho = std.cadreRole?.startsWith('lop_pho');

      let role: 'to_truong' | 'to_pho' | 'lop_truong' | 'lop_pho' | 'thanh_vien' = 'thanh_vien';
      if (isLopTruong) role = 'lop_truong';
      else if (isLeader) role = 'to_truong';
      else if (isViceLeader) role = 'to_pho';
      else if (isLopPho) role = 'lop_pho';

      const canGrade = isLeader || isLopTruong;

      const existing = studentAccounts.find(a => a.studentId === std.studentId);

      const account: StudentAccount = {
        accountId: existing?.accountId || `acc_${std.studentId}`,
        studentId: std.studentId,
        classId: currentClass.classId,
        studentNumber: std.studentNumber,
        fullName: std.fullName,
        teamName: std.teamName,
        username: existing?.username || username,
        password: existing?.password || defPass,
        role,
        canGrade,
        isActive: existing?.isActive !== undefined ? existing.isActive : true,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      generatedAccounts.push(account);
    });

    await batchSaveStudentAccounts(generatedAccounts);

    setStudentAccounts(prev => {
      const map = new Map<string, StudentAccount>();
      prev.forEach(a => map.set(a.accountId, a));
      generatedAccounts.forEach(a => map.set(a.accountId, a));
      return Array.from(map.values()).sort((a, b) => a.studentNumber - b.studentNumber);
    });

    setStudents(prev => prev.map(s => {
      const acc = generatedAccounts.find(a => a.studentId === s.studentId);
      if (acc) {
        return {
          ...s,
          accountUsername: acc.username,
          accountPassword: acc.password,
          isAccountActive: acc.isActive,
        };
      }
      return s;
    }));

    return generatedAccounts;
  };

  const updateStudentAccountUsername = async (studentId: string, newUsername: string, newPassword?: string) => {
    const cleanUser = newUsername.trim().toLowerCase();
    const targetStudent = students.find(s => s.studentId === studentId);
    if (!targetStudent || !currentClass) return;

    const existingAccount = studentAccounts.find(a => a.studentId === studentId);
    const updatedAccount: StudentAccount = {
      accountId: existingAccount?.accountId || `acc_${studentId}`,
      studentId,
      classId: currentClass.classId,
      studentNumber: targetStudent.studentNumber,
      fullName: targetStudent.fullName,
      teamName: targetStudent.teamName,
      username: cleanUser,
      password: newPassword ? newPassword.trim() : (existingAccount?.password || '123456'),
      role: (targetStudent.cadreRole === 'lop_truong' ? 'lop_truong'
        : targetStudent.isTeamLeader || targetStudent.teamRole === 'to_truong' ? 'to_truong'
        : targetStudent.cadreRole?.startsWith('lop_pho') ? 'lop_pho'
        : targetStudent.cadreRole === 'bi_thu' ? 'bi_thu'
        : existingAccount?.role || 'thanh_vien'),
      cadreRole: targetStudent.cadreRole || 'none',
      canGrade: Boolean(targetStudent.isTeamLeader || targetStudent.teamRole === 'to_truong' || targetStudent.cadreRole === 'lop_truong'),
      isActive: existingAccount?.isActive !== undefined ? existingAccount.isActive : true,
      createdAt: existingAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveStudentAccount(updatedAccount);

    setStudentAccounts(prev => {
      const idx = prev.findIndex(a => a.studentId === studentId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedAccount;
        return next;
      }
      return [...prev, updatedAccount];
    });

    setStudents(prev => prev.map(s => s.studentId === studentId ? {
      ...s,
      accountUsername: cleanUser,
      ...(newPassword ? { accountPassword: newPassword.trim() } : {})
    } : s));
  };

  const syncStudentAccountsWithActualRoles = async (forceRoleUsernames = false): Promise<{ updatedCount: number }> => {
    if (!currentClass || students.length === 0) return { updatedCount: 0 };
    const accountsToSave: StudentAccount[] = [];

    students.forEach(std => {
      const existing = studentAccounts.find(a => a.studentId === std.studentId);
      const isLeader = Boolean(std.isTeamLeader || std.teamRole === 'to_truong');
      const isLopTruong = std.cadreRole === 'lop_truong';
      const isLopPho = Boolean(std.cadreRole?.startsWith('lop_pho'));
      const isBiThu = std.cadreRole === 'bi_thu';

      let role: StudentAccount['role'] = 'thanh_vien';
      if (isLopTruong) role = 'lop_truong';
      else if (isLeader) role = 'to_truong';
      else if (isLopPho) role = 'lop_pho';
      else if (isBiThu) role = 'bi_thu';
      else if (std.teamRole === 'to_pho') role = 'to_pho';

      const canGrade = isLeader || isLopTruong;
      
      const padStt = String(std.studentNumber || 1).padStart(2, '0');
      const classPrefix = (currentClass.className || 'lop').toLowerCase().replace(/[^a-z0-9]/g, '');
      const teamNum = std.teamName.replace(/[^0-9]/g, '') || '1';
      
      let defaultUsername = existing?.username;
      if (!defaultUsername || forceRoleUsernames) {
        if (isLopTruong) defaultUsername = `${classPrefix}_loptruong`;
        else if (isBiThu) defaultUsername = `${classPrefix}_bithu`;
        else if (std.cadreRole === 'pho_bi_thu') defaultUsername = `${classPrefix}_phobithu`;
        else if (std.cadreRole === 'lop_pho_hoc_tap') defaultUsername = `${classPrefix}_lphoctap`;
        else if (std.cadreRole === 'lop_pho_lao_dong') defaultUsername = `${classPrefix}_lplaodong`;
        else if (std.cadreRole === 'lop_pho_trat_tu') defaultUsername = `${classPrefix}_lptrattu`;
        else if (isLeader) defaultUsername = `${classPrefix}_totruong${teamNum}`;
        else if (std.teamRole === 'to_pho') defaultUsername = `${classPrefix}_topho${teamNum}`;
        else if (!existing?.username) defaultUsername = `${classPrefix}_${padStt}`;
        else defaultUsername = existing.username;
      }

      const acc: StudentAccount = {
        accountId: existing?.accountId || `acc_${std.studentId}`,
        studentId: std.studentId,
        classId: currentClass.classId,
        studentNumber: std.studentNumber,
        fullName: std.fullName,
        teamName: std.teamName,
        username: defaultUsername,
        password: existing?.password || '123456',
        role,
        cadreRole: std.cadreRole || 'none',
        canGrade,
        isActive: existing?.isActive !== undefined ? existing.isActive : true,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      accountsToSave.push(acc);
    });

    await batchSaveStudentAccounts(accountsToSave);
    setStudentAccounts(accountsToSave);
    setStudents(prev => prev.map(s => {
      const acc = accountsToSave.find(a => a.studentId === s.studentId);
      return acc ? {
        ...s,
        accountUsername: acc.username,
        accountPassword: acc.password,
        isAccountActive: acc.isActive
      } : s;
    }));

    return { updatedCount: accountsToSave.length };
  };

  const saveCadreReview = async (review: WeeklyCadreReview) => {
    await saveWeeklyCadreReview(review);
    setWeeklyCadreReview(review);
  };

  const toggleStudentAccountStatus = async (accountId: string, isActive: boolean) => {
    const target = studentAccounts.find(a => a.accountId === accountId);
    if (!target) return;
    const updated = { ...target, isActive };
    await saveStudentAccount(updated);
    setStudentAccounts(prev => prev.map(a => a.accountId === accountId ? updated : a));
    setStudents(prev => prev.map(s => s.studentId === target.studentId ? { ...s, isAccountActive: isActive } : s));
  };

  const resetStudentAccountPassword = async (accountId: string, newPassword?: string) => {
    const target = studentAccounts.find(a => a.accountId === accountId);
    if (!target) return;
    const pass = newPassword || '123456';
    const updated = { ...target, password: pass };
    await saveStudentAccount(updated);
    setStudentAccounts(prev => prev.map(a => a.accountId === accountId ? updated : a));
    setStudents(prev => prev.map(s => s.studentId === target.studentId ? { ...s, accountPassword: pass } : s));
  };

  const updateCriteriaList = async (list: Criterion[]) => {
    const normalized = normalizeCriteriaOrders(list);
    await saveCriteria(normalized);
    setCriteria(normalized);
  };

  const updateCriterion = async (crit: Criterion) => {
    const existing = criteria.find(c => c.criterionId === crit.criterionId);
    let updatedList: Criterion[];
    if (existing && existing.order !== crit.order) {
      updatedList = reorderCriterionToPosition(criteria, crit.criterionId, crit.order);
      updatedList = updatedList.map(c => c.criterionId === crit.criterionId ? { ...crit, order: c.order } : c);
    } else {
      updatedList = criteria.map(c => c.criterionId === crit.criterionId ? crit : c);
    }
    const normalized = normalizeCriteriaOrders(updatedList);
    await saveCriteria(normalized);
    setCriteria(normalized);
  };

  const reorderCriterion = async (criterionId: string, targetOrder: number) => {
    const normalized = reorderCriterionToPosition(criteria, criterionId, targetOrder);
    await saveCriteria(normalized);
    setCriteria(normalized);
  };

  const shiftCriterionStep = async (criterionId: string, direction: 'up' | 'down') => {
    const normalized = direction === 'up'
      ? moveCriterionUp(criteria, criterionId)
      : moveCriterionDown(criteria, criterionId);
    await saveCriteria(normalized);
    setCriteria(normalized);
  };

  const normalizeAllCriteria = async () => {
    const normalized = normalizeCriteriaOrders(criteria);
    await saveCriteria(normalized);
    setCriteria(normalized);
  };

  const addCriterion = async (critData: Omit<Criterion, 'criterionId' | 'classId' | 'teacherId'>) => {
    if (!currentClass || !user) return;
    const criterionId = `crit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newCrit: Criterion = {
      ...critData,
      criterionId,
      classId: currentClass.classId,
      teacherId: user.uid,
      order: critData.order || (criteria.length + 1),
    };
    const normalized = normalizeCriteriaOrders([...criteria, newCrit]);
    await saveCriteria(normalized);
    setCriteria(normalized);
  };

  const deleteCriterion = async (criterionId: string) => {
    await removeCriterionFromDb(criterionId);
    const remaining = criteria.filter(c => c.criterionId !== criterionId);
    const normalized = normalizeCriteriaOrders(remaining);
    await saveCriteria(normalized);
    setCriteria(normalized);
  };

  const seedFullDemoClasses = async (onProgress?: (status: string, percent: number) => void): Promise<{ class1: ClassInfo; class2: ClassInfo; integritySummary?: string }> => {
    if (!user) throw new Error('User not logged in');
    setLoading(true);
    try {
      const customTeacher = (typeof localStorage !== 'undefined' ? localStorage.getItem('gvcn_custom_teacher_name') : null) || profile?.displayName || user.displayName || 'Thầy Phong Qui';
      const result = await seedTwoClassesDemoData(user.uid, customTeacher, onProgress);
      const updatedClasses = await getTeacherClasses(user.uid);
      setClasses(updatedClasses);
      setCurrentClass(result.class1);
      setSelectedWeek(result.class1.currentWeek || 8);
      return result;
    } catch (e) {
      console.error('Demo full seed error:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const reloadDemoDataAction = async (onProgress?: (status: string, percent: number) => void): Promise<{ class1: ClassInfo; class2: ClassInfo; integritySummary?: string }> => {
    if (!user) throw new Error('User not logged in');
    setLoading(true);
    try {
      if (onProgress) onProgress('Đang dọn dẹp dữ liệu demo cũ để làm mới hoàn toàn...', 10);
      await deleteDemoData(user.uid);
      return await seedFullDemoClasses(onProgress);
    } finally {
      setLoading(false);
    }
  };

  const deleteDemoDataAction = async (): Promise<{
    deletedClasses: number;
    deletedStudents: number;
    deletedScores: number;
    deletedEvents: number;
  }> => {
    if (!user) return { deletedClasses: 0, deletedStudents: 0, deletedScores: 0, deletedEvents: 0 };
    setLoading(true);
    try {
      const result = await deleteDemoData(user.uid);
      const remainingClasses = await getTeacherClasses(user.uid);
      setClasses(remainingClasses);

      if (remainingClasses.length > 0) {
        // Set to first real class remaining
        setCurrentClass(remainingClasses[0]);
        setSelectedWeek(remainingClasses[0].currentWeek || 8);
      } else {
        setCurrentClass(null);
        setStudents([]);
        setTeams([]);
        setCriteria([]);
        setEvents([]);
        setAllWeeklyScores([]);
      }
      return result;
    } catch (e) {
      console.error('Delete demo data error:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const seedDemoData = async () => {
    await seedFullDemoClasses();
  };

  const importStudents = async (studentsList: Array<{ name: string; teamName: string; notes?: string }>) => {
    if (!currentClass || !user) return 0;
    const now = new Date().toISOString();
    let count = 0;
    const existingCount = students.length;

    for (let i = 0; i < studentsList.length; i++) {
      const item = studentsList[i];
      const matchedTeam = teams.find(t => t.teamName.toLowerCase() === item.teamName.toLowerCase()) || teams[0];
      const newStd: Student = {
        studentId: `std_${Date.now()}_${i}`,
        classId: currentClass.classId,
        teacherId: user.uid,
        studentNumber: existingCount + i + 1,
        fullName: item.name.trim(),
        teamId: matchedTeam ? matchedTeam.teamId : 'team_1',
        teamName: matchedTeam ? matchedTeam.teamName : item.teamName,
        notes: item.notes || '',
        createdAt: now,
      };
      await saveStudent(newStd);
      count++;
    }
    await loadClassDetails();
    return count;
  };

  const undoEvent = async (eventId: string): Promise<boolean> => {
    const ev = events.find(e => e.eventId === eventId);
    if (!ev) return false;
    await removeEvent(ev);
    setRecentActions(prev => prev.filter(a => a.eventId !== eventId));
    return true;
  };

  const undoBatchEvents = async (eventIds: string[]): Promise<boolean> => {
    if (!currentClass || eventIds.length === 0) return false;
    const targetEvents = events.filter(e => eventIds.includes(e.eventId));
    if (targetEvents.length === 0) return false;

    const affectedStudentIds = targetEvents.map(e => e.studentId);
    setEvents(prev => prev.filter(e => !eventIds.includes(e.eventId)));
    setRecentActions(prev => prev.filter(a => !eventIds.includes(a.eventId)));
    setLastBatchResult(null);

    await batchDeleteCompetitionEvents(
      eventIds,
      currentClass.classId,
      affectedStudentIds,
      selectedWeek,
      currentClass.startingScore,
      DEFAULT_THRESHOLDS
    );

    await loadClassDetails();
    return true;
  };

  const clearLastBatchResult = () => {
    setLastBatchResult(null);
  };

  const addObservation = async (data: Omit<StudentObservation, 'observationId' | 'classId' | 'teacherId' | 'createdAt'>) => {
    if (!currentClass || !user) return;
    const observationId = `obs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newObs: StudentObservation = {
      ...data,
      observationId,
      classId: currentClass.classId,
      teacherId: user.uid,
      createdAt: new Date().toISOString(),
      isDemo: currentClass.isDemo || false
    };
    await saveStudentObservation(newObs);
    setObservations(prev => [newObs, ...prev]);
  };

  const removeObservation = async (observationId: string) => {
    await deleteStudentObservation(observationId);
    setObservations(prev => prev.filter(o => o.observationId !== observationId));
  };

  const lockWeek = async (weekNumber: number) => {
    if (!currentClass || !user) return;
    const weekStudents = studentsWithScores;
    const snapshot: WeeklySnapshot = {
      snapshotId: `snap_${currentClass.classId}_w${weekNumber}`,
      classId: currentClass.classId,
      weekNumber,
      lockedAt: new Date().toISOString(),
      lockedBy: teacherName,
      studentsScores: weekStudents.map(s => ({
        studentId: s.studentId,
        fullName: s.fullName,
        teamName: s.teamName,
        startingScore: currentClass.startingScore || DEFAULT_STARTING_SCORE,
        totalPositive: s.totalPositive,
        totalNegative: s.totalNegative,
        finalScore: s.currentWeekScore,
        rankCategory: s.rankCategory,
        rankNumber: s.rankNumber
      })),
      teamRankings: teamSummaries.map(t => ({
        teamId: t.teamId,
        teamName: t.teamName,
        avgScore: t.avgScore,
        rank: t.rank
      })),
      statsSummary: {
        avgScore: teamSummaries.length > 0
          ? Math.round((teamSummaries.reduce((a, b) => a + b.avgScore, 0) / teamSummaries.length) * 10) / 10
          : 100,
        totalEvents: events.filter(e => e.week === weekNumber).length,
        excellentCount: weekStudents.filter(s => s.rankCategory === 'XUẤT SẮC').length,
        needSupportCount: weekStudents.filter(s => s.rankCategory === 'CẦN HỖ TRỢ').length
      }
    };

    await lockWeekInFirestore(currentClass.classId, weekNumber, user.uid, snapshot);
    setAcademicWeeks(prev => prev.map(w => w.weekNumber === weekNumber ? { 
      ...w, 
      status: 'locked', 
      lockedAt: snapshot.lockedAt, 
      lockedBy: snapshot.lockedBy 
    } : w));
  };

  const unlockWeek = async (weekNumber: number) => {
    if (!currentClass || !user) return;
    await unlockWeekInFirestore(currentClass.classId, weekNumber, user.uid, teacherName);
    setAcademicWeeks(prev => prev.map(w => w.weekNumber === weekNumber ? { 
      ...w, 
      status: 'active', 
      lockedAt: undefined, 
      lockedBy: undefined 
    } : w));
  };

  const getWeekSnapshotData = async (weekNumber: number) => {
    if (!currentClass) return null;
    return await getWeeklySnapshot(currentClass.classId, weekNumber);
  };

  const createNewClassAction = async (
    classData: { schoolName?: string; className: string; grade: string; schoolYear: string; teamCount?: number },
    initialStudents?: ImportPreviewStudent[]
  ): Promise<ClassInfo> => {
    const authUid = auth.currentUser?.uid;
    const effectiveTeacherId = authUid || user?.uid || currentClass?.teacherId || (typeof localStorage !== 'undefined' ? localStorage.getItem('gvcn_session_user_uid') : null) || 'teacher_gvcn';
    setLoading(true);
    try {
      const newCls = await createNewClassInFirestore(
        effectiveTeacherId,
        {
          ...classData,
          teacherName
        },
        initialStudents
      );

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gvcn_active_class_id', newCls.classId);
      }

      const updatedList = await getTeacherClasses(effectiveTeacherId);
      const mergedList = [
        newCls,
        ...classes.filter(c => c.classId !== newCls.classId),
        ...updatedList.filter(c => c.classId !== newCls.classId && !classes.some(x => x.classId === c.classId))
      ];
      setClasses(mergedList);
      setCurrentClass(newCls);
      setFilterMode('all');
      setSelectedWeek(newCls.currentWeek || 8);

      // Immediately fetch and set the newly created class details (teams & students)
      const [newStds, newTms, newCrits] = await Promise.all([
        getClassStudents(newCls.classId),
        getClassTeams(newCls.classId),
        getClassCriteria(newCls.classId)
      ]);
      setStudents(newStds);
      setTeams(newTms);
      setCriteria(normalizeCriteriaOrders(newCrits));
      setEvents([]);
      setAllWeeklyScores([]);

      return newCls;
    } finally {
      setLoading(false);
    }
  };

  const seedSecondClassDemo = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cls5A2 = await seedDemoDataForTeacher(user.uid, teacherName, '5A2');
      const updatedList = await getTeacherClasses(user.uid);
      setClasses(updatedList);
      setCurrentClass(cls5A2);
      setSelectedWeek(cls5A2.currentWeek || 8);
    } finally {
      setLoading(false);
    }
  };

  const importStudentsFromPreview = async (
    previewItems: ImportPreviewStudent[],
    targetClassId?: string,
    targetTeams?: Team[]
  ) => {
    const activeClassId = targetClassId || currentClass?.classId;
    if (!activeClassId) return { addedCount: 0, updatedCount: 0 };
    const effectiveTeacherId = user?.uid || currentClass?.teacherId || 'teacher_gvcn';
    let addedCount = 0;
    let updatedCount = 0;
    const now = new Date().toISOString();

    let targetTeamsList = teams;
    let targetStudentsList = students;

    if (targetClassId && targetClassId !== currentClass?.classId) {
      targetTeamsList = targetTeams && targetTeams.length > 0 ? targetTeams : await getClassTeams(targetClassId);
      targetStudentsList = await getClassStudents(targetClassId);
    }

    let currentMaxNumber = targetStudentsList.reduce((max, s) => Math.max(max, s.studentNumber || 0), 0);
    const studentsToSave: Student[] = [];

    for (const item of previewItems) {
      if (item.status === 'error') continue;

      if (item.status === 'duplicate' && item.duplicateAction === 'skip') {
        continue;
      }

      if (item.status === 'duplicate' && item.duplicateAction === 'update' && item.existingStudentId) {
        const existing = targetStudentsList.find(s => s.studentId === item.existingStudentId);
        if (existing) {
          const matchedTeam = targetTeamsList.find(t => t.teamName.toLowerCase() === item.teamName.toLowerCase()) || targetTeamsList[0];
          const updated: Student = {
            ...existing,
            studentCode: item.studentCode?.trim() || existing.studentCode,
            fullName: item.fullName.trim(),
            gender: item.gender || existing.gender,
            birthDate: item.birthDate || existing.birthDate,
            parentPhone: item.parentPhone || existing.parentPhone,
            parentName: item.parentName || existing.parentName,
            teamId: matchedTeam ? matchedTeam.teamId : existing.teamId,
            teamName: matchedTeam ? matchedTeam.teamName : item.teamName,
            notes: item.notes || existing.notes,
            updatedAt: now,
          };
          studentsToSave.push(updated);
          updatedCount++;
        }
        continue;
      }

      currentMaxNumber++;
      const matchedTeam = targetTeamsList.find(t => t.teamName.toLowerCase() === item.teamName.toLowerCase()) || targetTeamsList[0];
      const newStd: Student = {
        studentId: `std_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${addedCount}`,
        studentCode: item.studentCode?.trim() || undefined,
        classId: activeClassId,
        teacherId: effectiveTeacherId,
        studentNumber: item.stt || currentMaxNumber,
        fullName: item.fullName.trim(),
        teamId: matchedTeam ? matchedTeam.teamId : 'team_1',
        teamName: matchedTeam ? matchedTeam.teamName : item.teamName,
        gender: item.gender || 'male',
        birthDate: item.birthDate || '',
        parentPhone: item.parentPhone || '',
        parentName: item.parentName || '',
        notes: item.notes || '',
        createdAt: now,
        status: 'active'
      };
      studentsToSave.push(newStd);
      addedCount++;
    }

    if (studentsToSave.length > 0) {
      await batchSaveStudents(studentsToSave);

      if (!targetClassId || targetClassId === currentClass?.classId) {
        setStudents(prev => {
          const map = new Map<string, Student>();
          prev.forEach(s => map.set(s.studentId, s));
          studentsToSave.forEach(s => map.set(s.studentId, s));
          return Array.from(map.values()).sort((a, b) => (a.studentNumber || 0) - (b.studentNumber || 0));
        });
      }
    }

    const totalCount = targetStudentsList.length + addedCount;
    await updateClassConfig(activeClassId, { studentCount: totalCount });
    if (!targetClassId || targetClassId === currentClass?.classId) {
      loadClassDetails().catch(console.warn);
    }
    return { addedCount, updatedCount };
  };

  const transferStudentToClass = async (studentId: string, toClassId: string, reason: string) => {
    if (!currentClass || !user) return;
    const std = students.find(s => s.studentId === studentId);
    const targetCls = classes.find(c => c.classId === toClassId);
    if (!std || !targetCls) return;

    await recordStudentTransfer({
      studentId,
      studentName: std.fullName,
      fromClassId: currentClass.classId,
      fromClassName: currentClass.className,
      toClassId,
      toClassName: targetCls.className,
      date: new Date().toISOString().split('T')[0],
      reason,
      transferredBy: teacherName
    });

    await loadClassDetails();
  };

  const exportBackupJson = async () => {
    if (!currentClass || !user) return;
    const backup = await getAllClassDataForBackup(currentClass.classId, user.uid);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sao_Luu_${currentClass.className.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreFromBackup = async (backup: ClassBackupData) => {
    setLoading(true);
    try {
      await restoreClassDataFromBackup(backup);
      await loadClasses();
      if (backup.classInfo?.classId) {
        setCurrentClass(backup.classInfo);
      }
    } finally {
      setLoading(false);
    }
  };

  const archiveClassAction = async (classId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await archiveClass(classId, user.uid);
      const updatedList = await getTeacherClasses(user.uid);
      setClasses(updatedList);
      if (currentClass?.classId === classId) {
        const next = updatedList.find(c => c.status !== 'archived') || updatedList[0] || null;
        setCurrentClass(next);
      }
    } finally {
      setLoading(false);
    }
  };

  const createSchoolYearAction = async (name: string, startDate: string, endDate: string, currentWeek: number = 1) => {
    if (!user) throw new Error('Chưa đăng nhập');
    const newSy = await createSchoolYear(user.uid, name, startDate, endDate, currentWeek);
    const updated = await getSchoolYears(user.uid);
    setSchoolYears(updated);
    return newSy;
  };

  return (
    <ClassDataContext.Provider value={{
      classes,
      filteredClasses,
      filterMode,
      setFilterMode,
      isDemoMode,
      schoolYears,
      currentSchoolYear,
      createSchoolYearAction,
      archiveClassAction,
      currentClass,
      setCurrentClass,
      selectedWeek,
      setSelectedWeek,
      students,
      teams,
      criteria,
      events,
      weeklyScores,
      allWeeklyScores,
      studentsWithScores,
      teamSummaries,
      loading,
      teacherName,
      updateTeacherName,
      refreshData: loadClassDetails,
      createOrUpdateClass,
      quickAddEvent,
      batchAddEvents,
      removeEvent,
      createStudent,
      editStudent,
      deleteStudentById,
      batchDeleteStudents,
      batchUpdateStudentsTeam,
      deduplicateStudents,
      assignStudentRole,
      batchAssignRoles,
      teamPasscodes,
      updateTeamPasscode,
      batchUpdateTeamPasscodes,
      updateCriteriaList,
      updateClassConfig,
      updateCriterion,
      reorderCriterion,
      shiftCriterionStep,
      normalizeAllCriteria,
      addCriterion,
      deleteCriterion,
      seedDemoData,
      importStudents,
      studentAccounts,
      loadStudentAccounts,
      createOrUpdateStudentAccount,
      batchGenerateStudentAccounts,
      updateStudentAccountUsername,
      syncStudentAccountsWithActualRoles,
      weeklyCadreReview,
      cadreReviewLoading,
      saveCadreReview,
      toggleStudentAccountStatus,
      resetStudentAccountPassword,
      academicWeeks,
      isCurrentWeekLocked,
      lockWeek,
      unlockWeek,
      getWeekSnapshotData,
      recentActions,
      undoEvent,
      undoBatchEvents,
      lastBatchResult,
      clearLastBatchResult,
      observations,
      addObservation,
      removeObservation,
      createNewClassAction,
      seedSecondClassDemo,
      seedFullDemoClasses,
      reloadDemoDataAction,
      deleteDemoDataAction,
      importStudentsFromPreview,
      transferStudentToClass,
      exportBackupJson,
      restoreFromBackup,
    }}>
      {children}
    </ClassDataContext.Provider>
  );
};

export function useClassData() {
  const context = useContext(ClassDataContext);
  if (!context) {
    throw new Error('useClassData must be used within a ClassDataProvider');
  }
  return context;
}
