import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  ClassInfo, 
  Student, 
  Team, 
  Criterion, 
  CompetitionEvent, 
  WeeklyScore, 
  ClassReport,
  ScoreThresholds,
  RankCategory,
  StudentAccount,
  TeacherNote,
  AiLog,
  SavedReport,
  MessageTemplate,
  AcademicWeek,
  WeeklySnapshot,
  StudentTransferRecord,
  AuditLog,
  ClassBackupData,
  SchoolYear,
  StudentObservation,
  ImportPreviewStudent,
  WeeklyCadreReview
} from '../types';
import { DEFAULT_THRESHOLDS, DEFAULT_STARTING_SCORE, calculateRank } from '../utils/constants';
import { 
  generateDemoData, 
  generateTwoClassesDemoData, 
  generateClassDemoData, 
  verifyDemoDataIntegrity,
  GeneratedDemoPackage 
} from './demoData';

// Utility to remove any undefined fields before writing to Firestore
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)) as any;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// --- Classes ---
export async function getAllClasses(): Promise<ClassInfo[]> {
  try {
    const snap = await getDocs(collection(db, 'classes'));
    const list: ClassInfo[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as ClassInfo);
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.warn('Error fetching all classes:', err);
    return [];
  }
}

export async function getPrimaryClass(): Promise<ClassInfo | null> {
  try {
    const list = await getAllClasses();
    if (list.length > 0) {
      // Prioritize the actual custom class over fallback 5A1
      const actual = list.find(c => c.className && !c.className.includes('5A1')) 
        || list.find(c => c.teacherName && !c.teacherName.includes('Nguyễn Mai Lan')) 
        || list[0];
      
      if (actual) {
        // Normalize teacher name if it was old demo placeholder
        if (!actual.teacherName || actual.teacherName.includes('Nguyễn Mai Lan')) {
          actual.teacherName = (typeof localStorage !== 'undefined' ? localStorage.getItem('gvcn_custom_teacher_name') : null) || 'Thầy Phong Qui';
        }
        return actual;
      }
      return null;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching primary class:', err);
    return null;
  }
}

export async function getTeacherClasses(teacherId: string): Promise<ClassInfo[]> {
  try {
    const all = await getAllClasses();
    if (all.length > 0) {
      return all;
    }

    const primary = await getPrimaryClass();
    if (primary) {
      return [primary];
    }
    return [];
  } catch (err) {
    console.warn('Notice querying teacher classes, falling back to primary class:', err);
    try {
      const primary = await getPrimaryClass();
      return primary ? [primary] : [];
    } catch {
      return [];
    }
  }
}

export async function saveClass(classInfo: ClassInfo): Promise<void> {
  const cleaned = cleanFirestoreData({
    ...classInfo,
    teacherName: classInfo.teacherName || 'Thầy Phong Qui',
    updatedAt: new Date().toISOString()
  });
  await setDoc(doc(db, 'classes', classInfo.classId), cleaned, { merge: true });
}

export async function deleteClass(classId: string): Promise<void> {
  await deleteDoc(doc(db, 'classes', classId));
}

// --- Students ---
export async function getClassStudents(classId: string): Promise<Student[]> {
  try {
    const q = query(collection(db, 'students'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    const list: Student[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Student);
    });
    return list.sort((a, b) => a.studentNumber - b.studentNumber);
  } catch (err) {
    console.error('Error fetching students:', err);
    return [];
  }
}

export async function saveStudent(student: Student): Promise<void> {
  const cleaned = cleanFirestoreData(student);
  await setDoc(doc(db, 'students', student.studentId), cleaned, { merge: true });
}

export async function deleteStudent(studentId: string): Promise<void> {
  await deleteDoc(doc(db, 'students', studentId));
}

export async function batchDeleteStudents(studentIds: string[]): Promise<void> {
  if (studentIds.length === 0) return;
  const batch = writeBatch(db);
  studentIds.forEach(id => {
    batch.delete(doc(db, 'students', id));
  });
  await batch.commit();
}

export async function batchSaveStudents(students: Student[]): Promise<void> {
  if (students.length === 0) return;
  const chunkSize = 400;
  for (let i = 0; i < students.length; i += chunkSize) {
    const chunk = students.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(std => {
      const cleaned = cleanFirestoreData(std);
      batch.set(doc(db, 'students', std.studentId), cleaned, { merge: true });
    });
    await batch.commit();
  }
}

// --- Teams ---
export async function getClassTeams(classId: string): Promise<Team[]> {
  try {
    const q = query(collection(db, 'teams'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    const list: Team[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Team);
    });
    return list.sort((a, b) => a.teamName.localeCompare(b.teamName));
  } catch (err) {
    console.error('Error fetching teams:', err);
    return [];
  }
}

export async function saveTeams(teams: Team[]): Promise<void> {
  const batch = writeBatch(db);
  teams.forEach(team => {
    const cleaned = cleanFirestoreData(team);
    batch.set(doc(db, 'teams', team.teamId), cleaned, { merge: true });
  });
  await batch.commit();
}

export async function saveTeamPasscode(classId: string, teamName: string, passcode: string): Promise<void> {
  try {
    // 1. Update in teams collection
    const q = query(collection(db, 'teams'), where('classId', '==', classId), where('teamName', '==', teamName));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const teamDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'teams', teamDoc.id), { passcode });
    }

    // 2. Also update in class document for instant lookup during login
    const classRef = doc(db, 'classes', classId);
    await setDoc(classRef, {
      teamLeaderPasscodes: {
        [teamName]: passcode
      }
    }, { merge: true });

    // 3. Cache in localStorage
    if (typeof localStorage !== 'undefined') {
      const cacheKey = `gvcn_passcodes_${classId}`;
      const existing = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      existing[teamName] = passcode;
      localStorage.setItem(cacheKey, JSON.stringify(existing));
    }
  } catch (err) {
    console.warn('Error saving team passcode:', err);
    // Fallback localStorage
    if (typeof localStorage !== 'undefined') {
      const cacheKey = `gvcn_passcodes_${classId}`;
      const existing = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      existing[teamName] = passcode;
      localStorage.setItem(cacheKey, JSON.stringify(existing));
    }
  }
}

export async function updateClassTeamPasscodes(classId: string, passcodes: Record<string, string>): Promise<void> {
  try {
    // 1. Update class doc
    const classRef = doc(db, 'classes', classId);
    await setDoc(classRef, { teamLeaderPasscodes: passcodes }, { merge: true });

    // 2. Update individual teams
    const q = query(collection(db, 'teams'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.forEach(d => {
        const data = d.data() as Team;
        if (data.teamName && passcodes[data.teamName]) {
          batch.update(doc(db, 'teams', d.id), { passcode: passcodes[data.teamName] });
        }
      });
      await batch.commit();
    }

    // 3. Cache locally
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`gvcn_passcodes_${classId}`, JSON.stringify(passcodes));
    }
  } catch (err) {
    console.warn('Error updating team passcodes:', err);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`gvcn_passcodes_${classId}`, JSON.stringify(passcodes));
    }
  }
}

export async function getClassTeamPasscodes(classId: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {
    'Tổ 1': '1234',
    'Tổ 2': '1234',
    'Tổ 3': '1234',
    'Tổ 4': '1234',
  };

  try {
    // 1. Check class doc
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (classDoc.exists()) {
      const data = classDoc.data() as ClassInfo;
      if (data.teamLeaderPasscodes) {
        Object.assign(result, data.teamLeaderPasscodes);
      }
    }

    // 2. Check teams collection
    const teamsQ = query(collection(db, 'teams'), where('classId', '==', classId));
    const teamsSnap = await getDocs(teamsQ);
    teamsSnap.forEach(d => {
      const t = d.data() as Team;
      if (t.teamName && t.passcode) {
        result[t.teamName] = t.passcode;
      }
    });

    // 3. LocalStorage override/fallback
    if (typeof localStorage !== 'undefined') {
      const cached = JSON.parse(localStorage.getItem(`gvcn_passcodes_${classId}`) || '{}');
      Object.assign(result, cached);
    }
  } catch (err) {
    console.warn('Error getting class team passcodes:', err);
    if (typeof localStorage !== 'undefined') {
      const cached = JSON.parse(localStorage.getItem(`gvcn_passcodes_${classId}`) || '{}');
      Object.assign(result, cached);
    }
  }

  return result;
}

export async function getTeamLeaderPasscode(classId: string, teamName: string): Promise<string> {
  const passcodes = await getClassTeamPasscodes(classId);
  return passcodes[teamName] || '1234';
}

// --- GVCN Passcode Management ---
export async function getGvcnPasscode(classId: string): Promise<string> {
  try {
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (classDoc.exists()) {
      const data = classDoc.data() as ClassInfo;
      if (data.gvcnPasscode) {
        return data.gvcnPasscode.trim();
      }
    }
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`gvcn_passcode_${classId}`);
      if (cached) return cached.trim();
    }
  } catch (err) {
    console.warn('Error getting GVCN passcode:', err);
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`gvcn_passcode_${classId}`);
      if (cached) return cached.trim();
    }
  }
  return '1234';
}

export async function saveGvcnPasscode(classId: string, passcode: string): Promise<void> {
  const clean = passcode.trim() || '1234';
  try {
    const classRef = doc(db, 'classes', classId);
    await setDoc(classRef, { gvcnPasscode: clean }, { merge: true });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`gvcn_passcode_${classId}`, clean);
    }
  } catch (err) {
    console.warn('Error saving GVCN passcode:', err);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`gvcn_passcode_${classId}`, clean);
    }
  }
}

// --- Cadre (Ban cán sự lớp) Passcodes Management ---
export async function getCadrePasscodes(classId: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {
    lop_truong: '1234',
    lop_pho_hoc_tap: '1234',
    lop_pho_lao_dong: '1234',
    lop_pho_trat_tu: '1234',
    bi_thu: '1234',
    pho_bi_thu: '1234',
    cadre_general: '1234'
  };

  try {
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (classDoc.exists()) {
      const data = classDoc.data() as ClassInfo;
      if (data.cadrePasscodes) {
        Object.assign(result, data.cadrePasscodes);
      }
    }
    if (typeof localStorage !== 'undefined') {
      const cached = JSON.parse(localStorage.getItem(`gvcn_cadre_passcodes_${classId}`) || '{}');
      Object.assign(result, cached);
    }
  } catch (err) {
    console.warn('Error getting cadre passcodes:', err);
    if (typeof localStorage !== 'undefined') {
      const cached = JSON.parse(localStorage.getItem(`gvcn_cadre_passcodes_${classId}`) || '{}');
      Object.assign(result, cached);
    }
  }

  return result;
}

export async function saveCadrePasscodes(classId: string, passcodes: Record<string, string>): Promise<void> {
  try {
    const classRef = doc(db, 'classes', classId);
    await setDoc(classRef, { cadrePasscodes: passcodes }, { merge: true });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`gvcn_cadre_passcodes_${classId}`, JSON.stringify(passcodes));
    }
  } catch (err) {
    console.warn('Error saving cadre passcodes:', err);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`gvcn_cadre_passcodes_${classId}`, JSON.stringify(passcodes));
    }
  }
}

// --- Criteria ---
export async function getClassCriteria(classId: string): Promise<Criterion[]> {
  try {
    const q = query(collection(db, 'criteria'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    const list: Criterion[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Criterion);
    });
    const sorted = list.sort((a, b) => {
      const orderA = typeof a.order === 'number' && !isNaN(a.order) && a.order > 0 ? a.order : 9999;
      const orderB = typeof b.order === 'number' && !isNaN(b.order) && b.order > 0 ? b.order : 9999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
    return sorted.map((crit, idx) => ({
      ...crit,
      order: idx + 1
    }));
  } catch (err) {
    console.error('Error fetching criteria:', err);
    return [];
  }
}

export async function saveCriteria(criteria: Criterion[]): Promise<void> {
  const batch = writeBatch(db);
  criteria.forEach(crit => {
    const cleaned = cleanFirestoreData(crit);
    batch.set(doc(db, 'criteria', crit.criterionId), cleaned, { merge: true });
  });
  await batch.commit();
}

export async function saveCriterion(criterion: Criterion): Promise<void> {
  const cleaned = cleanFirestoreData(criterion);
  await setDoc(doc(db, 'criteria', criterion.criterionId), cleaned, { merge: true });
}

export async function deleteCriterion(criterionId: string): Promise<void> {
  await deleteDoc(doc(db, 'criteria', criterionId));
}

// --- Events (Chấm điểm) ---
export async function getClassEvents(classId: string, week?: number): Promise<CompetitionEvent[]> {
  try {
    let q = query(collection(db, 'events'), where('classId', '==', classId));
    if (typeof week === 'number') {
      q = query(collection(db, 'events'), where('classId', '==', classId), where('week', '==', week));
    }
    const snapshot = await getDocs(q);
    const list: CompetitionEvent[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as CompetitionEvent);
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.error('Error fetching events:', err);
    return [];
  }
}

export async function addCompetitionEvent(
  event: CompetitionEvent, 
  startingScore = DEFAULT_STARTING_SCORE, 
  thresholds = DEFAULT_THRESHOLDS
): Promise<void> {
  // 1. Sanitize the event so no undefined field exists
  const cleaned = cleanFirestoreData({
    ...event,
    studentName: event.studentName || '',
    note: event.note || '',
    evaluatorId: event.evaluatorId || 'teacher',
    evaluatorName: event.evaluatorName || 'Giáo viên chủ nhiệm',
    evaluatorRole: event.evaluatorRole || 'Giáo viên chủ nhiệm',
  });

  await setDoc(doc(db, 'events', cleaned.eventId), cleaned);

  // 2. Recalculate student weekly score
  await recalculateStudentWeeklyScore(cleaned.classId, cleaned.studentId, cleaned.week, startingScore, thresholds);
}

export async function batchAddCompetitionEvents(
  events: CompetitionEvent[],
  classId: string,
  week: number,
  startingScore = DEFAULT_STARTING_SCORE,
  thresholds = DEFAULT_THRESHOLDS
): Promise<void> {
  if (events.length === 0) return;
  const batch = writeBatch(db);
  const studentIds = new Set<string>();

  events.forEach(ev => {
    const cleaned = cleanFirestoreData({
      ...ev,
      studentName: ev.studentName || '',
      note: ev.note || '',
      evaluatorId: ev.evaluatorId || 'teacher',
      evaluatorName: ev.evaluatorName || 'Giáo viên chủ nhiệm',
      evaluatorRole: ev.evaluatorRole || 'Giáo viên chủ nhiệm',
    });
    batch.set(doc(db, 'events', cleaned.eventId), cleaned);
    studentIds.add(cleaned.studentId);
  });

  await batch.commit();

  for (const sId of studentIds) {
    await recalculateStudentWeeklyScore(classId, sId, week, startingScore, thresholds);
  }
}

export async function deleteCompetitionEvent(
  eventId: string, 
  classId: string, 
  studentId: string, 
  week: number,
  startingScore = DEFAULT_STARTING_SCORE, 
  thresholds = DEFAULT_THRESHOLDS
): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId));
  await recalculateStudentWeeklyScore(classId, studentId, week, startingScore, thresholds);
}

export async function batchDeleteCompetitionEvents(
  eventIds: string[],
  classId: string,
  affectedStudentIds: string[],
  week: number,
  startingScore = DEFAULT_STARTING_SCORE,
  thresholds = DEFAULT_THRESHOLDS
): Promise<void> {
  if (eventIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of eventIds) {
    batch.delete(doc(db, 'events', id));
  }
  await batch.commit();

  const uniqueStudentIds = Array.from(new Set(affectedStudentIds));
  for (const sId of uniqueStudentIds) {
    await recalculateStudentWeeklyScore(classId, sId, week, startingScore, thresholds);
  }
}

// --- Weekly Scores ---
export async function getWeeklyScores(classId: string, week?: number): Promise<WeeklyScore[]> {
  try {
    let q = query(collection(db, 'weeklyScores'), where('classId', '==', classId));
    if (typeof week === 'number') {
      q = query(collection(db, 'weeklyScores'), where('classId', '==', classId), where('week', '==', week));
    }
    const snapshot = await getDocs(q);
    const list: WeeklyScore[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as WeeklyScore);
    });
    return list;
  } catch (err) {
    console.error('Error fetching weekly scores:', err);
    return [];
  }
}

export async function recalculateStudentWeeklyScore(
  classId: string, 
  studentId: string, 
  week: number,
  startingScore = DEFAULT_STARTING_SCORE,
  thresholds = DEFAULT_THRESHOLDS
): Promise<WeeklyScore> {
  // Fetch all events for this student in this week
  const q = query(
    collection(db, 'events'), 
    where('classId', '==', classId), 
    where('studentId', '==', studentId),
    where('week', '==', week)
  );
  const snapshot = await getDocs(q);
  
  let totalPositive = 0;
  let totalNegative = 0;
  let teacherId = '';

  snapshot.forEach(docSnap => {
    const ev = docSnap.data() as CompetitionEvent;
    if (ev.score > 0) totalPositive += ev.score;
    else if (ev.score < 0) totalNegative += Math.abs(ev.score);
    if (ev.teacherId) teacherId = ev.teacherId;
  });

  const finalScore = startingScore + totalPositive - totalNegative;
  const rank = calculateRank(finalScore, thresholds);

  const scoreId = `ws_${studentId}_w${week}`;
  const weeklyScoreObj: WeeklyScore = {
    scoreId,
    teacherId,
    classId,
    studentId,
    week,
    startingScore,
    totalPositive,
    totalNegative,
    finalScore,
    rankCategory: rank.category,
    stars: rank.stars,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'weeklyScores', scoreId), weeklyScoreObj, { merge: true });
  return weeklyScoreObj;
}

// --- Reports ---
export async function getClassReports(classId: string): Promise<ClassReport[]> {
  try {
    const q = query(collection(db, 'reports'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    const list: ClassReport[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as ClassReport);
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.error('Error fetching reports:', err);
    return [];
  }
}

export async function saveLegacyClassReport(report: ClassReport): Promise<void> {
  await setDoc(doc(db, 'reports', report.reportId), report, { merge: true });
}

// --- Student Accounts & Credentials ---
export async function getClassStudentAccounts(classId: string): Promise<StudentAccount[]> {
  try {
    const q = query(collection(db, 'student_accounts'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    const list: StudentAccount[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as StudentAccount);
    });
    return list.sort((a, b) => a.studentNumber - b.studentNumber);
  } catch (err) {
    console.error('Error fetching student accounts:', err);
    return [];
  }
}

export async function saveStudentAccount(account: StudentAccount): Promise<void> {
  const cleaned = cleanFirestoreData({
    ...account,
    updatedAt: new Date().toISOString()
  });
  await setDoc(doc(db, 'student_accounts', account.accountId), cleaned, { merge: true });

  // Also sync credential info to student document
  if (account.studentId) {
    try {
      await updateDoc(doc(db, 'students', account.studentId), {
        accountUsername: account.username,
        accountPassword: account.password,
        isAccountActive: account.isActive,
      });
    } catch (err) {
      console.warn('Sync student account to student doc failed:', err);
    }
  }
}

export async function batchSaveStudentAccounts(accounts: StudentAccount[]): Promise<void> {
  if (accounts.length === 0) return;
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  accounts.forEach(account => {
    const cleaned = cleanFirestoreData({
      ...account,
      updatedAt: now
    });
    batch.set(doc(db, 'student_accounts', account.accountId), cleaned, { merge: true });
    
    // Also sync to student doc
    if (account.studentId) {
      batch.update(doc(db, 'students', account.studentId), {
        accountUsername: account.username,
        accountPassword: account.password,
        isAccountActive: account.isActive,
      });
    }
  });

  await batch.commit();
}

export async function findStudentAccountByUsername(username: string): Promise<StudentAccount | null> {
  try {
    const cleanUser = username.trim().toLowerCase();
    const q = query(collection(db, 'student_accounts'), where('username', '==', cleanUser));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as StudentAccount;
    }
    return null;
  } catch (err) {
    console.error('Error finding student account by username:', err);
    return null;
  }
}

// --- Demo Data Seeder & Cleaner ---

/**
 * Execute batch operations in safe chunks of 300 (under the 500 Firestore limit)
 */
async function commitBatchOperations(
  operations: Array<{ ref: any; data?: any; type: 'set' | 'delete' }>
): Promise<void> {
  const CHUNK_SIZE = 300;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'delete') {
        batch.delete(op.ref);
      } else {
        batch.set(op.ref, cleanFirestoreData(op.data));
      }
    }
    await batch.commit();
  }
}

/**
 * Seeds a full generated demo package (class, teams, criteria, students, scores, events)
 */
export async function seedClassPackage(pkg: GeneratedDemoPackage): Promise<ClassInfo> {
  const operations: Array<{ ref: any; data?: any; type: 'set' | 'delete' }> = [];

  // 1. Class
  operations.push({
    ref: doc(db, 'classes', pkg.classInfo.classId),
    data: pkg.classInfo,
    type: 'set',
  });

  // 2. Teams
  pkg.teams.forEach(team => {
    operations.push({
      ref: doc(db, 'teams', team.teamId),
      data: team,
      type: 'set',
    });
  });

  // 3. Criteria
  pkg.criteria.forEach(crit => {
    operations.push({
      ref: doc(db, 'criteria', crit.criterionId),
      data: crit,
      type: 'set',
    });
  });

  // 4. Students
  pkg.students.forEach(student => {
    operations.push({
      ref: doc(db, 'students', student.studentId),
      data: student,
      type: 'set',
    });
  });

  // 5. Weekly Scores
  pkg.weeklyScores.forEach(score => {
    operations.push({
      ref: doc(db, 'weeklyScores', score.scoreId),
      data: score,
      type: 'set',
    });
  });

  // 6. Events
  pkg.events.forEach(ev => {
    operations.push({
      ref: doc(db, 'events', ev.eventId),
      data: ev,
      type: 'set',
    });
  });

  // 7. Snapshots
  if (pkg.snapshots && pkg.snapshots.length > 0) {
    pkg.snapshots.forEach(snap => {
      operations.push({
        ref: doc(db, 'weeklySnapshots', snap.snapshotId),
        data: snap,
        type: 'set',
      });
    });
  }

  await commitBatchOperations(operations);
  return pkg.classInfo;
}

export async function seedDemoDataForTeacher(
  teacherId: string,
  customTeacherName?: string,
  customClassName?: string
): Promise<ClassInfo> {
  const targetClass = customClassName?.includes('12A2') ? '12A2' : '12A1';
  const data = generateClassDemoData(teacherId, targetClass, customTeacherName);
  return await seedClassPackage(data);
}

/**
 * Creates 2 demo classes: 12A1 and 12A2 (45 students each, 90 students total, 8 weeks of data)
 * Strictly verifies integrity before committing to Firestore.
 */
export async function seedTwoClassesDemoData(
  teacherId: string,
  teacherName?: string,
  onProgress?: (status: string, percent: number) => void
): Promise<{ class1: ClassInfo; class2: ClassInfo; integritySummary: string }> {
  if (onProgress) onProgress('Đang khởi tạo gói dữ liệu 2 lớp mẫu (90 học sinh, 8 tuần)...', 15);
  const [pkg1, pkg2] = generateTwoClassesDemoData(teacherId, teacherName);

  // Integrity Check
  if (onProgress) onProgress('Đang chạy kiểm tra toàn vẹn dữ liệu tự động (Data Integrity Check)...', 30);
  const integrity = verifyDemoDataIntegrity(pkg1, pkg2);
  if (!integrity.isHealthy) {
    console.error('Lỗi toàn vẹn dữ liệu demo:', integrity.errors);
    throw new Error(`Kiểm tra toàn vẹn thất bại: ${integrity.errors[0]}`);
  }

  if (onProgress) onProgress('Đang ghi dữ liệu Lớp 12A1 (45 học sinh, 5 tổ, 8 tuần)...', 50);
  await seedClassPackage(pkg1);

  if (onProgress) onProgress('Đang ghi dữ liệu Lớp 12A2 (45 học sinh, 5 tổ, 8 tuần)...', 80);
  await seedClassPackage(pkg2);

  if (onProgress) onProgress('Hoàn tất nạp dữ liệu demo!', 100);
  return { class1: pkg1.classInfo, class2: pkg2.classInfo, integritySummary: integrity.summary };
}

/**
 * Safely deletes all demo data (isDemo === true or demo class IDs)
 * GUARANTEE: Never touches or deletes any real user data!
 */
export async function deleteDemoData(teacherId?: string): Promise<{
  deletedClasses: number;
  deletedStudents: number;
  deletedScores: number;
  deletedEvents: number;
}> {
  const deleteOps: Array<{ ref: any; type: 'delete' }> = [];
  const demoClassIds = new Set<string>();

  // 1. Scan classes collection for demo classes
  const classesSnap = await getDocs(collection(db, 'classes'));
  classesSnap.forEach(d => {
    const data = d.data();
    const isDemoClass = 
      data.isDemo === true || 
      d.id.startsWith('demo_class_') || 
      (data.className === '12A1' && data.studentCount === 45) ||
      (data.className === '12A2' && data.studentCount === 45);

    if (isDemoClass) {
      if (!teacherId || data.teacherId === teacherId) {
        demoClassIds.add(d.id);
        deleteOps.push({ ref: d.ref, type: 'delete' });
      }
    }
  });

  let deletedStudents = 0;
  let deletedScores = 0;
  let deletedEvents = 0;

  // 2. Scan and delete students with isDemo or in demoClassIds
  const studentsSnap = await getDocs(collection(db, 'students'));
  studentsSnap.forEach(d => {
    const data = d.data();
    const isDemo = data.isDemo === true || demoClassIds.has(data.classId) || d.id.startsWith('demo_std_');
    if (isDemo) {
      deleteOps.push({ ref: d.ref, type: 'delete' });
      deletedStudents++;
    }
  });

  // 3. Scan and delete teams with isDemo or in demoClassIds
  const teamsSnap = await getDocs(collection(db, 'teams'));
  teamsSnap.forEach(d => {
    const data = d.data();
    const isDemo = data.isDemo === true || demoClassIds.has(data.classId) || d.id.startsWith('demo_team_');
    if (isDemo) {
      deleteOps.push({ ref: d.ref, type: 'delete' });
    }
  });

  // 4. Scan and delete criteria with isDemo or in demoClassIds
  const criteriaSnap = await getDocs(collection(db, 'criteria'));
  criteriaSnap.forEach(d => {
    const data = d.data();
    const isDemo = data.isDemo === true || demoClassIds.has(data.classId) || d.id.startsWith('demo_crit_');
    if (isDemo) {
      deleteOps.push({ ref: d.ref, type: 'delete' });
    }
  });

  // 5. Scan and delete events with isDemo or in demoClassIds
  const eventsSnap = await getDocs(collection(db, 'events'));
  eventsSnap.forEach(d => {
    const data = d.data();
    const isDemo = data.isDemo === true || demoClassIds.has(data.classId) || d.id.startsWith('demo_ev_');
    if (isDemo) {
      deleteOps.push({ ref: d.ref, type: 'delete' });
      deletedEvents++;
    }
  });

  // 6. Scan and delete weeklyScores with isDemo or in demoClassIds
  const scoresSnap = await getDocs(collection(db, 'weeklyScores'));
  scoresSnap.forEach(d => {
    const data = d.data();
    const isDemo = data.isDemo === true || demoClassIds.has(data.classId) || d.id.startsWith('demo_ws_');
    if (isDemo) {
      deleteOps.push({ ref: d.ref, type: 'delete' });
      deletedScores++;
    }
  });

  // 7. Scan and delete weeklySnapshots with isDemo or in demoClassIds
  try {
    const snapshotsSnap = await getDocs(collection(db, 'weeklySnapshots'));
    snapshotsSnap.forEach(d => {
      const data = d.data();
      const isDemo = data.isDemo === true || demoClassIds.has(data.classId) || d.id.startsWith('snap_demo_');
      if (isDemo) {
        deleteOps.push({ ref: d.ref, type: 'delete' });
      }
    });
  } catch (err) {
    console.warn('Error deleting demo snapshots:', err);
  }

  // 8. Execute chunked batch deletions
  await commitBatchOperations(deleteOps);

  return {
    deletedClasses: demoClassIds.size,
    deletedStudents,
    deletedScores,
    deletedEvents,
  };
}

// --- Teacher Notes (Ghi chú sư phạm của giáo viên - lưu dữ liệu quan sát hành vi, không lưu nhãn tiêu cực) ---
export async function getTeacherNotes(studentId: string): Promise<TeacherNote[]> {
  try {
    const q = query(collection(db, 'teacherNotes'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    const list: TeacherNote[] = [];
    snapshot.forEach(docSnap => {
      list.push({ ...docSnap.data(), noteId: docSnap.id } as TeacherNote);
    });
    return list.sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
  } catch (err) {
    console.error('Error fetching teacher notes:', err);
    return [];
  }
}

export async function saveTeacherNote(note: Partial<TeacherNote> & { studentId: string; teacherId: string; note: string }): Promise<TeacherNote> {
  const noteId = note.noteId || `tnote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanNote: TeacherNote = {
    noteId,
    studentId: note.studentId,
    teacherId: note.teacherId,
    date: note.date || new Date().toISOString().split('T')[0],
    note: note.note.trim(),
    createdAt: note.createdAt || new Date().toISOString(),
    studentName: note.studentName,
    week: note.week
  };
  await setDoc(doc(db, 'teacherNotes', noteId), cleanFirestoreData(cleanNote));
  return cleanNote;
}

export async function deleteTeacherNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'teacherNotes', noteId));
}

// --- AI Audit Logs ---
export async function logAiAction(log: { teacherId: string; classId: string; action: string }): Promise<void> {
  try {
    const logId = `ailog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLog: AiLog = {
      logId,
      teacherId: log.teacherId || 'unknown',
      classId: log.classId || 'unknown',
      action: log.action,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'aiLogs', logId), cleanFirestoreData(newLog));
  } catch (err) {
    console.warn('Could not save AI audit log:', err);
  }
}

// ==========================================
// --- TRUNG TÂM BÁO CÁO (REPORTS) ---
// ==========================================

export async function saveReport(
  report: Partial<SavedReport> & { classId: string; teacherId: string; title: string; content: string; type: any }
): Promise<SavedReport> {
  const reportId = report.reportId || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const cleanReport: SavedReport = {
    reportId,
    teacherId: report.teacherId,
    classId: report.classId,
    type: report.type || 'weekly',
    period: report.period || 'Tuần hiện tại',
    title: report.title.trim(),
    content: report.content,
    teacherNotes: report.teacherNotes || '',
    statistics: report.statistics || { totalStudents: 0, avgScore: 100 },
    createdAt: report.createdAt || now,
    updatedAt: now,
    createdByAI: report.createdByAI ?? true,
    status: report.status || 'draft'
  };

  await setDoc(doc(db, 'reports', reportId), cleanFirestoreData(cleanReport));
  return cleanReport;
}

export async function getReportsByClass(classId: string, teacherId?: string): Promise<SavedReport[]> {
  try {
    const q = query(
      collection(db, 'reports'),
      where('classId', '==', classId)
    );
    const snapshot = await getDocs(q);
    const list: SavedReport[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as SavedReport;
      // If teacherId is provided, enforce that only the owning teacher can view the reports
      if (!teacherId || data.teacherId === teacherId) {
        list.push({ ...data, reportId: docSnap.id });
      }
    });
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.error('Error fetching reports:', err);
    return [];
  }
}

export async function getReportById(reportId: string): Promise<SavedReport | null> {
  try {
    const docSnap = await getDoc(doc(db, 'reports', reportId));
    if (docSnap.exists()) {
      return { ...(docSnap.data() as SavedReport), reportId: docSnap.id };
    }
    return null;
  } catch (err) {
    console.error('Error fetching report by id:', err);
    return null;
  }
}

export async function updateReport(reportId: string, updates: Partial<SavedReport>): Promise<void> {
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString()
  };
  await updateDoc(doc(db, 'reports', reportId), cleanFirestoreData(payload));
}

export async function deleteReport(reportId: string): Promise<void> {
  await deleteDoc(doc(db, 'reports', reportId));
}

export const getSavedReports = getReportsByClass;

// ==========================================
// --- THƯ VIỆN MẪU TIN NHẮN GVCN (MESSAGE TEMPLATES) ---
// ==========================================

export const DEFAULT_MESSAGE_TEMPLATES: Omit<MessageTemplate, 'templateId' | 'teacherId' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Khen ngợi học sinh tiến bộ toàn diện',
    category: 'khen',
    content: 'Kính gửi Quý Phụ huynh em {studentName},\nTrong tuần này em có nhiều nỗ lực vượt bậc, đặc biệt là sự tự giác trong giờ học và tích cực phát biểu xây dựng bài. Điểm thi đua của em đạt {currentScore} điểm, xếp loại {rankCategory}. Thay mặt tập thể lớp, Thầy/Cô biểu dương tinh thần phấn đấu của em và mong gia đình tiếp tục khích lệ để em giữ vững phong độ!'
  },
  {
    title: 'Thông báo tiến bộ sau thời gian rèn luyện',
    category: 'dong_vien',
    content: 'Kính gửi Quý Phụ huynh em {studentName},\nThầy/Cô rất vui mừng thông báo trong tuần qua em đã có chuyển biến rất tích cực về nề nếp và ý thức chuẩn bị bài. Điểm thi đua tuần này tăng rõ rệt so với tuần trước. Sự tiến bộ này ghi nhận nỗ lực rất lớn của em và sự quan tâm chu đáo từ gia đình. Chúc em tiếp tục phát huy!'
  },
  {
    title: 'Nhắc nhở nhẹ nhàng về giờ giấc và đồ dùng',
    category: 'nhac_nho',
    content: 'Kính gửi Quý Phụ huynh em {studentName},\nTuần này về cơ bản em tham gia học tập tốt, tuy nhiên còn một vài thời điểm em vào lớp hơi sát giờ hoặc thiếu đồ dùng học tập. Thầy/Cô xin gửi thông tin để gia đình cùng nhắc nhở nhẹ nhàng, giúp em hình thành thói quen kỷ luật tốt hơn trong các tuần tới. Trân trọng cảm ơn Quý Phụ huynh!'
  },
  {
    title: 'Đề nghị phụ huynh phối hợp đồng hành',
    category: 'phoi_hop',
    content: 'Kính gửi Quý Phụ huynh em {studentName},\nTrong tuần này, Thầy/Cô nhận thấy em có dấu hiệu giảm sút phong độ và thiếu tập trung trong giờ học. Để giúp em kịp thời điều chỉnh và không bị áp lực, Thầy/Cô rất mong được trao đổi thêm cùng gia đình vào thời gian thuận tiện nhằm thống nhất biện pháp hỗ trợ em tốt nhất.'
  },
  {
    title: 'Cập nhật tổng kết tuần định kỳ',
    category: 'thong_bao',
    content: 'Kính gửi Quý Phụ huynh em {studentName},\nThầy/Cô chủ nhiệm xin thông báo kết quả thi đua nề nếp tuần {week}: Em đạt {currentScore} điểm, xếp loại {rankCategory}. Tinh thần học tập và thái độ với thầy cô, bạn bè rất đáng khen ngợi. Chúc em và gia đình một cuối tuần nhiều niềm vui!'
  }
];

export async function getMessageTemplates(teacherId: string): Promise<MessageTemplate[]> {
  try {
    const q = query(
      collection(db, 'messageTemplates'),
      where('teacherId', '==', teacherId)
    );
    const snapshot = await getDocs(q);
    const list: MessageTemplate[] = [];
    snapshot.forEach(docSnap => {
      list.push({ ...docSnap.data(), templateId: docSnap.id } as MessageTemplate);
    });

    if (list.length === 0) {
      // Return default presets with virtual ids for initial experience
      return DEFAULT_MESSAGE_TEMPLATES.map((tpl, idx) => ({
        ...tpl,
        templateId: `preset_${idx}`,
        teacherId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    }

    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.error('Error fetching message templates:', err);
    return DEFAULT_MESSAGE_TEMPLATES.map((tpl, idx) => ({
      ...tpl,
      templateId: `preset_${idx}`,
      teacherId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }
}

export async function saveMessageTemplate(
  template: Partial<MessageTemplate> & { teacherId: string; title: string; content: string; category: any }
): Promise<MessageTemplate> {
  const templateId = template.templateId && !template.templateId.startsWith('preset_')
    ? template.templateId
    : `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const cleanTpl: MessageTemplate = {
    templateId,
    teacherId: template.teacherId,
    title: template.title.trim(),
    category: template.category,
    content: template.content.trim(),
    createdAt: template.createdAt || now,
    updatedAt: now
  };
  await setDoc(doc(db, 'messageTemplates', templateId), cleanFirestoreData(cleanTpl));
  return cleanTpl;
}

export async function deleteMessageTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, 'messageTemplates', templateId));
}

// --- Prompt 5: Academic Weeks & Locking ---
export async function getAcademicWeeks(classId: string): Promise<AcademicWeek[]> {
  try {
    const q = query(collection(db, 'academicWeeks'), where('classId', '==', classId));
    const snapshot = await getDocs(q);
    const list: AcademicWeek[] = [];
    snapshot.forEach(d => {
      list.push(d.data() as AcademicWeek);
    });
    return list.sort((a, b) => a.weekNumber - b.weekNumber);
  } catch (err) {
    console.error('Error getting academic weeks:', err);
    return [];
  }
}

export async function saveAcademicWeek(classId: string, week: AcademicWeek): Promise<void> {
  const docId = `week_${classId}_${week.weekNumber}`;
  await setDoc(doc(db, 'academicWeeks', docId), cleanFirestoreData({
    ...week,
    classId,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

export async function lockWeekInFirestore(
  classId: string,
  weekNumber: number,
  teacherId: string,
  snapshotData: WeeklySnapshot
): Promise<void> {
  const batch = writeBatch(db);

  // 1. Update academic week status
  const weekDocId = `week_${classId}_${weekNumber}`;
  batch.set(doc(db, 'academicWeeks', weekDocId), cleanFirestoreData({
    weekNumber,
    classId,
    status: 'locked',
    lockedAt: snapshotData.lockedAt,
    lockedBy: snapshotData.lockedBy,
    snapshotCreated: true,
    updatedAt: new Date().toISOString()
  }), { merge: true });

  // 2. Save snapshot
  const snapshotDocId = `snap_${classId}_w${weekNumber}`;
  batch.set(doc(db, 'weeklySnapshots', snapshotDocId), cleanFirestoreData({
    ...snapshotData,
    snapshotId: snapshotDocId,
    classId,
    weekNumber
  }));

  // 3. Log to audit
  const auditDocId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  batch.set(doc(db, 'auditLogs', auditDocId), cleanFirestoreData({
    logId: auditDocId,
    action: 'week_locked',
    actorId: teacherId,
    actorName: snapshotData.lockedBy,
    classId,
    targetId: `Tuần ${weekNumber}`,
    timestamp: snapshotData.lockedAt,
    details: `Đã khóa sổ thi đua Tuần ${weekNumber} và lưu snapshot cho ${snapshotData.studentsScores.length} học sinh`
  }));

  await batch.commit();
}

export async function unlockWeekInFirestore(
  classId: string,
  weekNumber: number,
  teacherId: string,
  teacherName: string
): Promise<void> {
  const weekDocId = `week_${classId}_${weekNumber}`;
  await updateDoc(doc(db, 'academicWeeks', weekDocId), {
    status: 'active',
    unlockedAt: new Date().toISOString(),
    unlockedBy: teacherName
  });

  // Audit log
  await createAuditLog({
    action: 'week_unlocked',
    actorId: teacherId,
    actorName: teacherName,
    classId,
    targetId: `Tuần ${weekNumber}`,
    details: `Đã mở khóa dữ liệu thi đua Tuần ${weekNumber}`
  });
}

export async function getWeeklySnapshot(classId: string, weekNumber: number): Promise<WeeklySnapshot | null> {
  try {
    const snapDoc = await getDoc(doc(db, 'weeklySnapshots', `snap_${classId}_w${weekNumber}`));
    if (snapDoc.exists()) {
      return snapDoc.data() as WeeklySnapshot;
    }
    return null;
  } catch (err) {
    console.error('Error fetching weekly snapshot:', err);
    return null;
  }
}

export async function getWeeklySnapshots(classId: string): Promise<WeeklySnapshot[]> {
  try {
    const q = query(collection(db, 'weeklySnapshots'), where('classId', '==', classId));
    const snap = await getDocs(q);
    const list: WeeklySnapshot[] = [];
    snap.forEach(d => list.push(d.data() as WeeklySnapshot));
    return list;
  } catch (err) {
    console.error('Error fetching weekly snapshots:', err);
    return [];
  }
}

// --- Prompt 5: Audit Trail ---
export async function createAuditLog(
  log: Omit<AuditLog, 'logId' | 'timestamp'>
): Promise<void> {
  try {
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullLog: AuditLog = {
      ...log,
      logId,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'auditLogs', logId), cleanFirestoreData(fullLog));
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}

export async function getAuditLogs(classId: string): Promise<AuditLog[]> {
  try {
    const q = query(
      collection(db, 'auditLogs'), 
      where('classId', '==', classId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    const list: AuditLog[] = [];
    snapshot.forEach(d => list.push(d.data() as AuditLog));
    return list;
  } catch (err) {
    // If composite index is pending, fallback without ordering
    try {
      const qFallback = query(collection(db, 'auditLogs'), where('classId', '==', classId));
      const snapshot = await getDocs(qFallback);
      const list: AuditLog[] = [];
      snapshot.forEach(d => list.push(d.data() as AuditLog));
      return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    } catch {
      return [];
    }
  }
}

// --- Prompt 5: Multiple Classes & Student Transfer ---
export async function createNewClass(
  teacherId: string,
  classData: {
    schoolName?: string;
    className: string;
    grade: string;
    schoolYear: string;
    teacherName: string;
    teamCount?: number;
    startDate?: string;
  },
  initialStudents?: ImportPreviewStudent[]
): Promise<ClassInfo> {
  const classId = `cls_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Initialize Teams (default 4 teams)
  const teamCount = classData.teamCount || 4;
  const teamColors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0284c7'];
  const createdTeams: Team[] = [];
  const batch = writeBatch(db);

  for (let i = 1; i <= teamCount; i++) {
    const teamId = `tm_${classId}_${i}`;
    const team: Team = {
      teamId,
      classId,
      teacherId,
      teamNumber: i,
      teamName: `Tổ ${i}`,
      color: teamColors[(i - 1) % teamColors.length],
      createdAt: now
    };
    createdTeams.push(team);
    batch.set(doc(db, 'teams', teamId), cleanFirestoreData(team));
  }

  // Initialize Standard 12 Criteria
  const { DEFAULT_CRITERIA_TEMPLATES } = await import('../utils/constants');
  DEFAULT_CRITERIA_TEMPLATES.forEach((critTpl, idx) => {
    const critId = `crit_${classId}_${idx + 1}`;
    const criterion: Criterion = {
      ...critTpl,
      criterionId: critId,
      classId,
      teacherId,
      order: idx + 1,
      createdAt: now
    };
    batch.set(doc(db, 'criteria', critId), cleanFirestoreData(criterion));
  });

  // Prepare initial students if provided
  const studentsToCreate: Student[] = [];
  if (initialStudents && initialStudents.length > 0) {
    initialStudents.forEach((item, idx) => {
      const cleanName = (item.fullName || '').trim();
      if (!cleanName || cleanName.length < 2) return;

      // Find matching team or distribute
      let matchedTeam = createdTeams.find(t =>
        t.teamName.toLowerCase() === (item.teamName || '').toLowerCase()
      );
      if (!matchedTeam) {
        const numMatch = (item.teamName || '').match(/\d+/);
        if (numMatch) {
          const num = parseInt(numMatch[0], 10);
          matchedTeam = createdTeams.find(t => t.teamNumber === num);
        }
      }
      if (!matchedTeam) {
        matchedTeam = createdTeams[idx % createdTeams.length];
      }

      const stdId = `std_${classId}_${Date.now()}_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`;
      const student: Student = {
        studentId: stdId,
        studentCode: item.studentCode?.trim() || undefined,
        classId,
        teacherId,
        studentNumber: item.stt || (idx + 1),
        fullName: cleanName,
        gender: item.gender || 'male',
        teamId: matchedTeam ? matchedTeam.teamId : createdTeams[0]?.teamId || 'tm_1',
        teamName: matchedTeam ? matchedTeam.teamName : 'Tổ 1',
        birthDate: item.birthDate || '',
        parentPhone: item.parentPhone || '',
        parentName: item.parentName || '',
        notes: item.notes || '',
        status: 'active',
        createdAt: now
      };
      studentsToCreate.push(student);
    });
  }

  const newClass: ClassInfo = {
    classId,
    teacherId,
    schoolName: classData.schoolName?.trim() || undefined,
    className: classData.className.trim(),
    grade: classData.grade.trim(),
    schoolYear: classData.schoolYear.trim(),
    studentCount: studentsToCreate.length,
    currentWeek: 8,
    startingScore: 100,
    teacherName: classData.teacherName.trim(),
    createdAt: now
  };

  batch.set(doc(db, 'classes', classId), cleanFirestoreData(newClass));

  // Commit the class, teams, criteria and school year documents
  await batch.commit();

  // Save all student documents cleanly in chunked batches
  if (studentsToCreate.length > 0) {
    await batchSaveStudents(studentsToCreate);
  }

  // Audit log
  await createAuditLog({
    action: 'class_created',
    actorId: teacherId,
    actorName: classData.teacherName,
    classId,
    targetId: classData.className,
    details: `Tạo mới lớp ${classData.className} (${classData.schoolYear}) với ${teamCount} tổ và ${studentsToCreate.length} học sinh ban đầu`
  });

  return newClass;
}

export async function recordStudentTransfer(
  transfer: Omit<StudentTransferRecord, 'transferId' | 'createdAt'>
): Promise<void> {
  const transferId = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record: StudentTransferRecord = {
    ...transfer,
    transferId,
    createdAt: now
  };

  const batch = writeBatch(db);

  // 1. Save transfer record
  batch.set(doc(db, 'transfers', transferId), cleanFirestoreData(record));

  // 2. Update student status in source or move to target class
  batch.update(doc(db, 'students', transfer.studentId), {
    classId: transfer.toClassId,
    status: 'active',
    notes: `Chuyển từ lớp ${transfer.fromClassName} vào ngày ${transfer.date}. Lý do: ${transfer.reason}`,
    transferredAt: now,
    transferredBy: transfer.transferredBy
  });

  // 3. Update student count for both classes
  try {
    const fromClsRef = doc(db, 'classes', transfer.fromClassId);
    const toClsRef = doc(db, 'classes', transfer.toClassId);
    const fromSnap = await getDoc(fromClsRef);
    const toSnap = await getDoc(toClsRef);

    if (fromSnap.exists()) {
      const cnt = (fromSnap.data().studentCount || 1) - 1;
      batch.update(fromClsRef, { studentCount: Math.max(0, cnt) });
    }
    if (toSnap.exists()) {
      const cnt = (toSnap.data().studentCount || 0) + 1;
      batch.update(toClsRef, { studentCount: cnt });
    }
  } catch (err) {
    console.warn('Could not update class student counts:', err);
  }

  await batch.commit();

  await createAuditLog({
    action: 'student_transferred',
    actorId: transfer.transferredBy,
    actorName: transfer.transferredBy,
    classId: transfer.fromClassId,
    targetId: transfer.studentId,
    targetName: transfer.studentName,
    details: `Chuyển học sinh ${transfer.studentName} sang lớp ${transfer.toClassName}`
  });
}

export async function getStudentTransfers(classId: string): Promise<StudentTransferRecord[]> {
  try {
    const q1 = query(collection(db, 'transfers'), where('fromClassId', '==', classId));
    const q2 = query(collection(db, 'transfers'), where('toClassId', '==', classId));

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const map = new Map<string, StudentTransferRecord>();

    snap1.forEach(d => map.set(d.id, d.data() as StudentTransferRecord));
    snap2.forEach(d => map.set(d.id, d.data() as StudentTransferRecord));

    return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error('Error fetching transfers:', err);
    return [];
  }
}

// --- Prompt 9: School Year Management ---
export async function getSchoolYears(teacherId: string): Promise<SchoolYear[]> {
  try {
    const q = query(collection(db, 'schoolYears'), where('teacherId', '==', teacherId));
    const snapshot = await getDocs(q);
    const list: SchoolYear[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as SchoolYear);
    });

    if (list.length > 0) {
      return list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    }

    // Default primary school year if none exists
    const defaultSy: SchoolYear = {
      id: 'sy_2026_2027',
      teacherId,
      name: '2026–2027',
      startDate: '2026-09-05',
      endDate: '2027-05-31',
      currentWeek: 8,
      isCurrent: true,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'schoolYears', defaultSy.id), cleanFirestoreData(defaultSy));
    return [defaultSy];
  } catch (err) {
    console.warn('Notice querying school years:', err);
    return [{
      id: 'sy_2026_2027',
      teacherId,
      name: '2026–2027',
      startDate: '2026-09-05',
      endDate: '2027-05-31',
      currentWeek: 8,
      isCurrent: true,
      status: 'active',
      createdAt: new Date().toISOString()
    }];
  }
}

export async function createSchoolYear(
  teacherId: string,
  name: string,
  startDate: string,
  endDate: string,
  currentWeek: number = 1
): Promise<SchoolYear> {
  const id = `sy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Archive any currently active school year without deleting it
  try {
    const existing = await getSchoolYears(teacherId);
    const batch = writeBatch(db);
    existing.forEach(sy => {
      if (sy.isCurrent) {
        batch.update(doc(db, 'schoolYears', sy.id), { isCurrent: false, status: 'archived' });
      }
    });
    await batch.commit();
  } catch (e) {
    console.warn('Notice updating previous school years:', e);
  }

  const newSy: SchoolYear = {
    id,
    teacherId,
    name: name.trim(),
    startDate,
    endDate,
    currentWeek,
    isCurrent: true,
    status: 'active',
    createdAt: now
  };

  await setDoc(doc(db, 'schoolYears', id), cleanFirestoreData(newSy));

  await createAuditLog({
    action: 'CREATE',
    actorId: teacherId,
    actorName: 'Giáo viên',
    teacherId,
    classId: '',
    entityType: 'schoolYear',
    entityId: id,
    details: `Tạo mới năm học ${name} (${startDate} đến ${endDate})`
  });

  return newSy;
}

// --- Prompt 9: Class Management & Archiving ---
export async function archiveClass(classId: string, teacherId: string): Promise<void> {
  const clsRef = doc(db, 'classes', classId);
  const snap = await getDoc(clsRef);
  if (!snap.exists()) {
    throw new Error('Không tìm thấy lớp học.');
  }

  await updateDoc(clsRef, {
    status: 'archived',
    archivedAt: new Date().toISOString()
  });

  await createAuditLog({
    action: 'ARCHIVE',
    actorId: teacherId,
    actorName: 'Giáo viên',
    teacherId,
    classId,
    entityType: 'class',
    entityId: classId,
    details: `Lưu trữ (Archive) lớp ${snap.data()?.className || classId}`
  });
}

// --- Prompt 5 & 9: Backup & Restore Data ---
export async function getAllClassDataForBackup(classId: string, teacherId: string): Promise<ClassBackupData> {
  const clsRef = doc(db, 'classes', classId);
  const clsSnap = await getDoc(clsRef);
  if (!clsSnap.exists()) {
    throw new Error('Không tìm thấy dữ liệu lớp học để sao lưu.');
  }

  const [students, teams, criteria, events, scores, reports, snapshots, schoolYears] = await Promise.all([
    getClassStudents(classId),
    getClassTeams(classId),
    getClassCriteria(classId),
    getClassEvents(classId),
    getWeeklyScores(classId),
    getSavedReports(classId),
    getWeeklySnapshots(classId).catch(() => []),
    getSchoolYears(teacherId).catch(() => [])
  ]);

  const now = new Date().toISOString();
  const classData = clsSnap.data() as ClassInfo;

  await createAuditLog({
    action: 'EXPORT',
    actorId: teacherId,
    actorName: classData.teacherName || 'Giáo viên',
    teacherId,
    classId,
    entityType: 'backup',
    entityId: `backup_${classId}`,
    details: `Xuất bản sao lưu dữ liệu lớp ${classData.className}`
  });

  return {
    version: '3.0.0-production',
    backupVersion: '3.0.0',
    createdAt: now,
    exportedAt: now,
    exportedBy: teacherId,
    teacherId,
    schoolYearId: classData.schoolYearId || 'sy_2026_2027',
    classInfo: classData,
    students,
    teams,
    criteria,
    events,
    weeklyScores: scores,
    reports,
    snapshots,
    schoolYears
  };
}

export async function restoreClassDataFromBackup(backup: ClassBackupData): Promise<void> {
  if (!backup.classInfo || !backup.classInfo.classId) {
    throw new Error('Dữ liệu sao lưu không hợp lệ hoặc thiếu thông tin lớp học.');
  }

  const classId = backup.classInfo.classId;
  const teacherId = backup.teacherId || backup.exportedBy || 'teacher';
  const batch = writeBatch(db);

  // 1. Class
  batch.set(doc(db, 'classes', classId), cleanFirestoreData(backup.classInfo));

  // 2. Teams
  (backup.teams || []).forEach(t => {
    batch.set(doc(db, 'teams', t.teamId), cleanFirestoreData(t));
  });

  // 3. Criteria
  (backup.criteria || []).forEach(c => {
    batch.set(doc(db, 'criteria', c.criterionId), cleanFirestoreData(c));
  });

  // 4. Students
  (backup.students || []).forEach(s => {
    batch.set(doc(db, 'students', s.studentId), cleanFirestoreData(s));
  });

  // 5. Events (up to 400 per batch)
  (backup.events || []).slice(0, 400).forEach(e => {
    batch.set(doc(db, 'events', e.eventId), cleanFirestoreData(e));
  });

  // 6. Weekly Scores (up to 400 per batch)
  (backup.weeklyScores || []).slice(0, 400).forEach(w => {
    batch.set(doc(db, 'weeklyScores', w.scoreId), cleanFirestoreData(w));
  });

  // 7. Snapshots
  (backup.snapshots || []).slice(0, 50).forEach(snap => {
    batch.set(doc(db, 'weeklySnapshots', snap.snapshotId), cleanFirestoreData(snap));
  });

  // 8. Reports
  (backup.reports || []).slice(0, 50).forEach(rep => {
    batch.set(doc(db, 'reports', rep.reportId), cleanFirestoreData(rep));
  });

  await batch.commit();

  await createAuditLog({
    action: 'RESTORE',
    actorId: teacherId,
    actorName: backup.classInfo.teacherName || 'Giáo viên',
    teacherId,
    classId,
    entityType: 'backup',
    entityId: `restore_${classId}`,
    details: `Khôi phục thành công dữ liệu lớp ${backup.classInfo.className} từ bản sao lưu ngày ${backup.exportedAt || backup.createdAt}`
  });
}

// --- Prompt 10: Student Observations (Ghi nhận học sinh) ---
export async function saveStudentObservation(obs: StudentObservation): Promise<void> {
  const cleaned = cleanFirestoreData(obs);
  await setDoc(doc(db, 'student_observations', obs.observationId), cleaned);
}

export async function getClassObservations(classId: string, studentId?: string): Promise<StudentObservation[]> {
  try {
    let q = query(collection(db, 'student_observations'), where('classId', '==', classId));
    if (studentId) {
      q = query(collection(db, 'student_observations'), where('classId', '==', classId), where('studentId', '==', studentId));
    }
    const snapshot = await getDocs(q);
    const list: StudentObservation[] = [];
    snapshot.forEach(d => list.push(d.data() as StudentObservation));
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.error('Error fetching student observations:', err);
    return [];
  }
}

export async function deleteStudentObservation(observationId: string): Promise<void> {
  await deleteDoc(doc(db, 'student_observations', observationId));
}

// --- Prompt: Nhận xét của Ban Cán Sự Lớp về tình hình trong tuần ---
export async function getWeeklyCadreReview(classId: string, weekNumber: number): Promise<WeeklyCadreReview | null> {
  try {
    const docId = `wcr_${classId}_w${weekNumber}`;
    const snap = await getDoc(doc(db, 'weekly_cadre_reviews', docId));
    if (snap.exists()) {
      return snap.data() as WeeklyCadreReview;
    }
    // Fallback to localStorage if offline/restricted
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`cadre_review_${classId}_w${weekNumber}`);
      if (cached) {
        return JSON.parse(cached) as WeeklyCadreReview;
      }
    }
    return null;
  } catch (err) {
    console.warn('Error fetching weekly cadre review:', err);
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`cadre_review_${classId}_w${weekNumber}`);
      if (cached) {
        try { return JSON.parse(cached) as WeeklyCadreReview; } catch (e) {}
      }
    }
    return null;
  }
}

export async function saveWeeklyCadreReview(review: WeeklyCadreReview): Promise<void> {
  const docId = review.reviewId || `wcr_${review.classId}_w${review.weekNumber}`;
  const cleaned = cleanFirestoreData({
    ...review,
    reviewId: docId,
    updatedAt: new Date().toISOString()
  });

  try {
    await setDoc(doc(db, 'weekly_cadre_reviews', docId), cleaned, { merge: true });
  } catch (err) {
    console.warn('Could not save cadre review to Firestore:', err);
  }

  // Always keep a local copy for instant offline access
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`cadre_review_${review.classId}_w${review.weekNumber}`, JSON.stringify(cleaned));
  }
}

export async function getClassWeeklyCadreReviews(classId: string): Promise<WeeklyCadreReview[]> {
  try {
    const q = query(collection(db, 'weekly_cadre_reviews'), where('classId', '==', classId));
    const snap = await getDocs(q);
    const list: WeeklyCadreReview[] = [];
    snap.forEach(d => list.push(d.data() as WeeklyCadreReview));
    return list.sort((a, b) => b.weekNumber - a.weekNumber);
  } catch (err) {
    console.warn('Error fetching class weekly cadre reviews:', err);
    return [];
  }
}



