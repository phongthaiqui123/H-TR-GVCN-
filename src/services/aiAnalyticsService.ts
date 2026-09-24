import { 
  Student, 
  WeeklyScore, 
  CompetitionEvent, 
  Criterion, 
  Team, 
  ClassInfo,
  AttentionStudentFinding, 
  ImprovedStudentFinding, 
  AiInsightItem 
} from '../types';

/**
 * AI Analytics Service (Code-First Calculation Engine)
 * Đảm bảo 100% độ chính xác toán học về số liệu, xếp hạng, vi phạm và xu hướng
 * trước khi đưa vào mô hình ngôn ngữ hoặc hiển thị trực tiếp trên giao diện.
 */

export function calculateAverage(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, curr) => acc + curr, 0);
  return Math.round((sum / numbers.length) * 10) / 10;
}

export function calculateTrend(scores: Array<{ week: number; finalScore: number }>): {
  direction: 'up' | 'down' | 'stable' | 'mixed';
  description: string;
  delta: number;
} {
  if (!scores || scores.length <= 1) {
    return {
      direction: 'stable',
      description: 'Chưa đủ dữ liệu các tuần để kết luận xu hướng dài hạn.',
      delta: 0
    };
  }

  const sorted = [...scores].sort((a, b) => a.week - b.week);
  const first = sorted[0].finalScore;
  const last = sorted[sorted.length - 1].finalScore;
  const delta = last - first;

  // Check monotonicity
  let isStrictlyIncreasing = true;
  let isStrictlyDecreasing = true;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].finalScore < sorted[i - 1].finalScore) isStrictlyIncreasing = false;
    if (sorted[i].finalScore > sorted[i - 1].finalScore) isStrictlyDecreasing = false;
  }

  if (isStrictlyIncreasing && delta > 0) {
    return {
      direction: 'up',
      description: `📈 Tiến bộ liên tục qua ${sorted.length} tuần gần nhất (tăng +${delta} điểm so với ban đầu).`,
      delta
    };
  }

  if (isStrictlyDecreasing && delta < 0) {
    return {
      direction: 'down',
      description: `📉 Giảm liên tục qua ${sorted.length} tuần gần nhất (giảm ${Math.abs(delta)} điểm). Cần GVCN hỗ trợ kịp thời.`,
      delta
    };
  }

  if (Math.abs(delta) <= 3) {
    return {
      direction: 'stable',
      description: `➡️ Duy trì phong độ ổn định quanh mức ${last} điểm.`,
      delta
    };
  }

  return {
    direction: 'mixed',
    description: `🔄 Phong độ dao động giữa các tuần (biến thiên từ ${Math.min(...sorted.map(s => s.finalScore))} đến ${Math.max(...sorted.map(s => s.finalScore))} điểm).`,
    delta
  };
}

/**
 * Phát hiện học sinh có tiến bộ vượt bậc so với chính mình trong quá khứ
 * Không chỉ nhìn vào top điểm cao nhất, mà chú trọng delta tăng điểm.
 */
export function detectImprovedStudents(
  students: Student[],
  allWeeklyScores: WeeklyScore[],
  currentWeek: number,
  events: CompetitionEvent[] = []
): ImprovedStudentFinding[] {
  const results: ImprovedStudentFinding[] = [];

  students.forEach(student => {
    const studentScores = allWeeklyScores
      .filter(s => s.studentId === student.studentId)
      .sort((a, b) => a.week - b.week);

    const currentScoreObj = studentScores.find(s => s.week === currentWeek);
    const previousScoreObj = studentScores.find(s => s.week === currentWeek - 1);

    if (currentScoreObj && previousScoreObj) {
      const delta = currentScoreObj.finalScore - previousScoreObj.finalScore;

      if (delta >= 6) { // Tăng từ 6 điểm trở lên là có tiến bộ đáng kể
        const studentEvents = events.filter(
          e => e.studentId === student.studentId && e.week === currentWeek && e.score > 0
        );

        const evidence = [
          `Điểm tuần ${currentWeek - 1}: ${previousScoreObj.finalScore}đ ➔ Tuần ${currentWeek}: ${currentScoreObj.finalScore}đ (Tăng +${delta} điểm)`,
          studentEvents.length > 0
            ? `Có ${studentEvents.length} lượt ghi nhận điểm cộng tích cực trong tuần`
            : `Hạn chế tối đa các vi phạm nề nếp so với tuần trước`
        ];

        const positiveObservations = studentEvents.map(e => `${e.criterionName} (+${e.score}đ)`);

        results.push({
          studentId: student.studentId,
          studentName: student.fullName,
          previousScore: previousScoreObj.finalScore,
          currentScore: currentScoreObj.finalScore,
          delta,
          evidence,
          positiveObservations: positiveObservations.slice(0, 3)
        });
      }
    }
  });

  return results.sort((a, b) => b.delta - a.delta);
}

/**
 * Phát hiện học sinh cần được quan tâm và hỗ trợ
 * Khách quan, trung thực với dữ liệu, không gán nhãn tiêu cực hay phán xét nhân phẩm.
 */
export function detectStudentsNeedingAttention(
  students: Student[],
  allWeeklyScores: WeeklyScore[],
  currentWeek: number,
  events: CompetitionEvent[] = []
): AttentionStudentFinding[] {
  const findings: AttentionStudentFinding[] = [];

  students.forEach(student => {
    const studentScores = allWeeklyScores
      .filter(s => s.studentId === student.studentId)
      .sort((a, b) => a.week - b.week);

    const currentScoreObj = studentScores.find(s => s.week === currentWeek);
    const prevScoreObj = studentScores.find(s => s.week === currentWeek - 1);
    const prev2ScoreObj = studentScores.find(s => s.week === currentWeek - 2);

    const currentScore = currentScoreObj?.finalScore ?? 100;
    const currentWeekEvents = events.filter(e => e.studentId === student.studentId && e.week === currentWeek);
    const violations = currentWeekEvents.filter(e => e.score < 0);

    const evidence: string[] = [];
    let severity: 'high' | 'medium' | 'low' = 'low';
    let reason = '';
    let suggestion = '';

    // Trường hợp 1: Giảm mạnh đột ngột (>= 12 điểm)
    if (prevScoreObj && prevScoreObj.finalScore - currentScore >= 12) {
      severity = 'high';
      reason = `Điểm thi đua giảm đột ngột ${prevScoreObj.finalScore - currentScore} điểm so với tuần trước`;
      evidence.push(`Điểm tuần ${currentWeek - 1} là ${prevScoreObj.finalScore}đ, sang tuần ${currentWeek} còn ${currentScore}đ.`);
      if (violations.length > 0) {
        evidence.push(`Ghi nhận ${violations.length} sự kiện trừ điểm: ${violations.map(v => v.criterionName).join(', ')}.`);
      }
      suggestion = 'GVCN nên gặp riêng học sinh trong giờ nghỉ để hỏi thăm tình hình học tập và tâm lý, liên hệ phụ huynh nếu cần phối hợp.';
    }
    // Trường hợp 2: Giảm liên tiếp 2 tuần
    else if (
      prevScoreObj && prev2ScoreObj && 
      currentScore < prevScoreObj.finalScore && 
      prevScoreObj.finalScore < prev2ScoreObj.finalScore
    ) {
      severity = 'high';
      reason = `Điểm thi đua giảm liên tiếp qua 2 tuần (${prev2ScoreObj.finalScore}đ ➔ ${prevScoreObj.finalScore}đ ➔ ${currentScore}đ)`;
      evidence.push(`Xu hướng giảm điểm liên tục từ tuần ${currentWeek - 2} đến tuần ${currentWeek}.`);
      if (violations.length > 0) {
        evidence.push(`Tuần này có ${violations.length} lượt vi phạm nề nếp.`);
      }
      suggestion = 'Cần trao đổi với ban cán sự tổ để hỗ trợ em trong các tiết học và đôn đốc giờ giấc.';
    }
    // Trường hợp 3: Điểm thấp dưới ngưỡng cần hỗ trợ (< 90đ)
    else if (currentScore < 90) {
      severity = 'medium';
      reason = `Điểm tuần ${currentWeek} đạt ${currentScore} điểm, thuộc diện cần hỗ trợ thi đua`;
      evidence.push(`Điểm hiện tại dưới mức chuẩn 90 điểm.`);
      if (violations.length > 0) {
        evidence.push(`Các tiêu chí bị trừ điểm: ${violations.map(v => v.criterionName).slice(0, 3).join(', ')}.`);
      }
      suggestion = 'Phân công đôi bạn cùng tiến đồng hành, giao cho em một nhiệm vụ nhỏ trong tổ để tăng cường tinh thần trách nhiệm.';
    }
    // Trường hợp 4: Có nhiều vi phạm trong tuần (>= 3 vi phạm)
    else if (violations.length >= 3) {
      severity = 'medium';
      reason = `Ghi nhận ${violations.length} lượt vi phạm nề nếp trong tuần ${currentWeek}`;
      evidence.push(`Các vi phạm: ${violations.map(v => v.criterionName).join(', ')}.`);
      suggestion = 'Nhắc nhở nhẹ nhàng đầu giờ và kiểm tra lại việc chuẩn bị bài vở, đồ dùng học tập trước khi vào lớp.';
    }

    if (reason) {
      findings.push({
        severity,
        studentId: student.studentId,
        studentName: student.fullName,
        reason,
        evidence,
        suggestion
      });
    }
  });

  // Sort: High severity first
  const order = { high: 0, medium: 1, low: 2 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * Thống kê top tiêu chí vi phạm nhiều nhất dựa trên dữ liệu thật
 */
export function getTopViolations(
  events: CompetitionEvent[],
  criteria: Criterion[],
  week?: number
): Array<{ criterionId: string; name: string; count: number; totalDeducted: number }> {
  const filteredEvents = week ? events.filter(e => e.week === week && e.score < 0) : events.filter(e => e.score < 0);
  const map = new Map<string, { name: string; count: number; totalDeducted: number }>();

  filteredEvents.forEach(e => {
    const existing = map.get(e.criterionId);
    if (existing) {
      existing.count += 1;
      existing.totalDeducted += Math.abs(e.score);
    } else {
      const crit = criteria.find(c => c.criterionId === e.criterionId);
      map.set(e.criterionId, {
        name: crit?.name || e.criterionName || 'Vi phạm nề nếp',
        count: 1,
        totalDeducted: Math.abs(e.score)
      });
    }
  });

  return Array.from(map.entries())
    .map(([criterionId, data]) => ({ criterionId, ...data }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Thống kê top tiêu chí được cộng điểm nhiều nhất
 */
export function getTopMerits(
  events: CompetitionEvent[],
  criteria: Criterion[],
  week?: number
): Array<{ criterionId: string; name: string; count: number; totalAwarded: number }> {
  const filteredEvents = week ? events.filter(e => e.week === week && e.score > 0) : events.filter(e => e.score > 0);
  const map = new Map<string, { name: string; count: number; totalAwarded: number }>();

  filteredEvents.forEach(e => {
    const existing = map.get(e.criterionId);
    if (existing) {
      existing.count += 1;
      existing.totalAwarded += e.score;
    } else {
      const crit = criteria.find(c => c.criterionId === e.criterionId);
      map.set(e.criterionId, {
        name: crit?.name || e.criterionName || 'Điểm cộng tích cực',
        count: 1,
        totalAwarded: e.score
      });
    }
  });

  return Array.from(map.entries())
    .map(([criterionId, data]) => ({ criterionId, ...data }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Phân tích hiệu suất thi đua của từng tổ
 */
export function getTeamAnalytics(
  teams: Team[],
  students: Student[],
  weeklyScores: WeeklyScore[],
  currentWeek: number
): {
  rankedTeams: Array<{
    teamId: string;
    teamName: string;
    avgScore: number;
    studentCount: number;
    rank: number;
    trend: 'up' | 'down' | 'stable';
    delta: number;
  }>;
  bestTeam?: { teamName: string; avgScore: number };
  mostImprovedTeam?: { teamName: string; delta: number };
} {
  const list = teams.map(team => {
    const teamStudents = students.filter(s => s.teamId === team.teamId || s.teamName === team.teamName);
    const studentIds = new Set(teamStudents.map(s => s.studentId));

    const currentScores = weeklyScores
      .filter(s => s.week === currentWeek && studentIds.has(s.studentId))
      .map(s => s.finalScore);

    const prevScores = weeklyScores
      .filter(s => s.week === currentWeek - 1 && studentIds.has(s.studentId))
      .map(s => s.finalScore);

    const currentAvg = calculateAverage(currentScores) || 100;
    const prevAvg = calculateAverage(prevScores) || currentAvg;
    const delta = Math.round((currentAvg - prevAvg) * 10) / 10;

    return {
      teamId: team.teamId,
      teamName: team.teamName,
      avgScore: currentAvg,
      studentCount: teamStudents.length,
      rank: 1,
      trend: delta > 0.5 ? ('up' as const) : delta < -0.5 ? ('down' as const) : ('stable' as const),
      delta
    };
  });

  // Sort by avgScore descending
  list.sort((a, b) => b.avgScore - a.avgScore);
  list.forEach((item, index) => {
    item.rank = index + 1;
  });

  const bestTeam = list[0] ? { teamName: list[0].teamName, avgScore: list[0].avgScore } : undefined;

  const mostImproved = [...list].sort((a, b) => b.delta - a.delta)[0];
  const mostImprovedTeam = mostImproved && mostImproved.delta > 0 
    ? { teamName: mostImproved.teamName, delta: mostImproved.delta } 
    : undefined;

  return {
    rankedTeams: list,
    bestTeam,
    mostImprovedTeam
  };
}

/**
 * Sinh Top 5 Insight cốt lõi từ dữ liệu thi đua cho Dashboard và AI Overview
 */
export function generateRuleBasedInsights(
  classInfo: ClassInfo,
  students: Student[],
  weeklyScores: WeeklyScore[],
  events: CompetitionEvent[],
  criteria: Criterion[],
  teams: Team[],
  currentWeek: number
): AiInsightItem[] {
  const insights: AiInsightItem[] = [];

  const attentionFindings = detectStudentsNeedingAttention(students, weeklyScores, currentWeek, events);
  const improvedFindings = detectImprovedStudents(students, weeklyScores, currentWeek, events);
  const topViolations = getTopViolations(events, criteria, currentWeek);
  const topMerits = getTopMerits(events, criteria, currentWeek);
  const teamData = getTeamAnalytics(teams, students, weeklyScores, currentWeek);

  // 1. Cảnh báo học sinh cần chú ý
  if (attentionFindings.length > 0) {
    const topNeed = attentionFindings[0];
    insights.push({
      id: `ins_attention_${topNeed.studentId}`,
      type: 'individual',
      severity: topNeed.severity === 'high' ? 'warning' : 'info',
      title: `Lưu ý học sinh: ${topNeed.studentName}`,
      description: topNeed.reason,
      studentId: topNeed.studentId,
      evidence: topNeed.evidence,
      action: topNeed.suggestion,
      suggestedGoal: 'Ổn định tâm lý và nề nếp học tập trong tuần tới'
    });
  }

  // 2. Khen ngợi học sinh tiến bộ vượt bậc
  if (improvedFindings.length > 0) {
    const topStar = improvedFindings[0];
    insights.push({
      id: `ins_improved_${topStar.studentId}`,
      type: 'individual',
      severity: 'positive',
      title: `Tiến bộ nổi bật: ${topStar.studentName} (+${topStar.delta}đ)`,
      description: `Em có sự bứt phá mạnh mẽ từ ${topStar.previousScore}đ lên ${topStar.currentScore}đ trong tuần ${currentWeek}.`,
      studentId: topStar.studentId,
      evidence: topStar.evidence,
      action: 'Tuyên dương em trước lớp trong tiết sinh hoạt đầu tuần để khích lệ tinh thần thi đua.',
      suggestedGoal: 'Duy trì kết quả tốt trong tuần tiếp theo'
    });
  }

  // 3. Vấn đề nề nếp nổi cộm nhất (Top violation)
  if (topViolations.length > 0) {
    const topV = topViolations[0];
    insights.push({
      id: `ins_violation_${topV.criterionId}`,
      type: 'behavior',
      severity: topV.count >= 5 ? 'warning' : 'info',
      title: `Vấn đề nề nếp cần chấn chỉnh: ${topV.name}`,
      description: `Ghi nhận ${topV.count} lượt vi phạm trong tuần ${currentWeek}, làm trừ tổng cộng ${topV.totalDeducted} điểm thi đua.`,
      evidence: [
        `Có ${topV.count} sự kiện vi phạm được ghi nhận bởi ban cán sự và GVCN.`,
        `Tổng điểm bị trừ: -${topV.totalDeducted} điểm toàn lớp.`
      ],
      action: `Thảo luận với lớp về tiêu chí "${topV.name}" và nhắc nhở thực hiện nghiêm túc từ đầu tuần.`,
      suggestedGoal: `Giảm tối thiểu 50% số lượt vi phạm tiêu chí "${topV.name}" trong tuần tới`
    });
  }

  // 4. Phong trào tích cực nổi bật (Top merit)
  if (topMerits.length > 0) {
    const topM = topMerits[0];
    insights.push({
      id: `ins_merit_${topM.criterionId}`,
      type: 'study',
      severity: 'positive',
      title: `Điểm sáng thi đua: ${topM.name}`,
      description: `Toàn lớp đạt ${topM.count} lượt ghi nhận tích cực với tổng điểm cộng +${topM.totalAwarded}đ.`,
      evidence: [
        `Ghi nhận ${topM.count} lượt khen thưởng/cộng điểm trong tuần.`,
        `Tổng điểm cộng thi đua: +${topM.totalAwarded} điểm.`
      ],
      action: 'Duy trì không khí học tập sôi nổi và khuyến khích các học sinh còn rụt rè cùng tham gia.',
      suggestedGoal: '100% học sinh trong lớp có ít nhất 1 lần phát biểu xây dựng bài'
    });
  }

  // 5. Tổ thi đua dẫn đầu
  if (teamData.bestTeam) {
    insights.push({
      id: 'ins_best_team',
      type: 'team',
      severity: 'positive',
      title: `${teamData.bestTeam.teamName} dẫn đầu thi đua tuần ${currentWeek}`,
      description: `Đạt điểm trung bình ${teamData.bestTeam.avgScore}đ, thể hiện sự đồng đều và tinh thần đồng đội cao.`,
      evidence: [
        `Điểm trung bình các thành viên: ${teamData.bestTeam.avgScore}đ.`,
        teamData.mostImprovedTeam
          ? `${teamData.mostImprovedTeam.teamName} cũng có tiến bộ nhanh (+${teamData.mostImprovedTeam.delta}đ).`
          : 'Các thành viên trong tổ duy trì nề nếp tốt.'
      ],
      action: 'Biểu dương ban cán sự tổ và chia sẻ bí quyết học tập tích cực cho các tổ khác.',
      suggestedGoal: 'Các tổ tiếp tục cạnh tranh lành mạnh'
    });
  }

  return insights;
}
