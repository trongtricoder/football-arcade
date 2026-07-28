export type LeaderboardScoreInput = {
  score: number;
  leaguePoints: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  trophyCount: number;
};

export function calculateLeaderboardScore(run: LeaderboardScoreInput) {
  const goalDifference = run.goalsFor - run.goalsAgainst;
  const breakdown = {
    team: run.score * 8,
    points: run.leaguePoints * 5,
    wins: run.wins * 4,
    goalDifference: goalDifference * 3,
    cleanSheets: run.cleanSheets * 3,
    trophies: run.trophyCount * 200,
    invincible: run.losses === 0 ? 100 : 0,
    perfect: run.losses === 0 && run.draws === 0 ? 250 : 0,
  };
  return { breakdown, goalDifference, rankingScore: Object.values(breakdown).reduce((sum, value) => sum + value, 0) };
}

export function utcWeekStart(input: Date | string | number = new Date()) {
  const week = new Date(input);
  if (Number.isNaN(week.getTime())) throw new Error("Invalid leaderboard date.");
  const weekday = (week.getUTCDay() + 6) % 7;
  week.setUTCDate(week.getUTCDate() - weekday);
  return week.toISOString().slice(0, 10);
}

export function cleanLeaderboardTeamName(input: unknown) {
  if (typeof input !== "string") throw new Error("Team name must contain 2-32 characters.");
  const clean = input.trim().replace(/\s+/g, " ");
  if (clean.length < 2 || clean.length > 32) throw new Error("Team name must contain 2-32 characters.");
  return clean;
}

export function leaderboardRank(entries: Array<{ run_id: string }>, runId: string) {
  const index = entries.findIndex((entry) => entry.run_id === runId);
  return index >= 0 ? index + 1 : Math.max(1, entries.length);
}
