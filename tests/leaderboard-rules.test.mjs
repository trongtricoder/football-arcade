import assert from "node:assert/strict";
import test from "node:test";
import { calculateLeaderboardScore, cleanLeaderboardTeamName, leaderboardRank, utcWeekStart } from "../lib/leaderboard-rules.ts";

const ordinary = { score: 85, leaguePoints: 82, wins: 25, draws: 7, losses: 6, goalsFor: 74, goalsAgainst: 38, cleanSheets: 14, trophyCount: 1 };

test("weekly score uses every documented server-side component", () => {
  const result = calculateLeaderboardScore(ordinary);
  assert.equal(result.goalDifference, 36);
  assert.deepEqual(result.breakdown, { team: 680, points: 410, wins: 100, goalDifference: 108, cleanSheets: 42, trophies: 200, invincible: 0, perfect: 0 });
  assert.equal(result.rankingScore, 1540);
});

test("invincible and perfect bonuses remain distinct", () => {
  const invincible = calculateLeaderboardScore({ ...ordinary, draws: 8, losses: 0 });
  const perfect = calculateLeaderboardScore({ ...ordinary, draws: 0, losses: 0 });
  assert.equal(invincible.breakdown.invincible, 100);
  assert.equal(invincible.breakdown.perfect, 0);
  assert.equal(perfect.breakdown.invincible, 100);
  assert.equal(perfect.breakdown.perfect, 250);
});

test("weekly boards always begin on Monday UTC", () => {
  assert.equal(utcWeekStart("2026-07-27T00:00:00Z"), "2026-07-27");
  assert.equal(utcWeekStart("2026-08-02T23:59:59Z"), "2026-07-27");
  assert.equal(utcWeekStart("2027-01-01T12:00:00Z"), "2026-12-28");
  assert.throws(() => utcWeekStart("not-a-date"), /Invalid leaderboard date/);
});

test("team names are normalized and bounded", () => {
  assert.equal(cleanLeaderboardTeamName("  The   Invincibles  "), "The Invincibles");
  assert.throws(() => cleanLeaderboardTeamName("X"), /2-32/);
  assert.throws(() => cleanLeaderboardTeamName("X".repeat(33)), /2-32/);
  assert.throws(() => cleanLeaderboardTeamName(null), /2-32/);
});

test("leaderboard ranks are one-based and never return rank zero", () => {
  const entries = [{ run_id: "first" }, { run_id: "second" }];
  assert.equal(leaderboardRank(entries, "first"), 1);
  assert.equal(leaderboardRank(entries, "second"), 2);
  assert.equal(leaderboardRank(entries, "missing"), 2);
  assert.equal(leaderboardRank([], "missing"), 1);
});
