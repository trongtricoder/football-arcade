import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("result storage remains authenticated, bounded, throttled, and authoritative", () => {
  const source = read("app/api/games/era-xi/results/route.ts");
  assert.match(source, /authorization/i);
  assert.match(source, /32_000/);
  assert.match(source, /recentRuns\s*\|\|\s*0\)\s*>=\s*6/);
  assert.match(source, /dailyRuns\s*\|\|\s*0\)\s*>=\s*100/);
  assert.match(source, /simulateAuthoritativeEraXi\(body\)/);
  assert.match(source, /finalize_verified_run/);
  assert.match(source, /verification_status:\s*"verified"/);
  assert.match(source, /achievement_definitions\(name,description,tier\)/);
});

test("weekly submissions verify ownership and replay the saved campaign", () => {
  const source = read("app/api/rankings/weekly/route.ts");
  assert.match(source, /eq\("user_id",user\.id\)/);
  assert.match(source, /verification_status!=="verified"/);
  assert.match(source, /!run\.finalized_at/);
  assert.match(source, /simulateAuthoritativeEraXi/);
  assert.match(source, /leaderboard_replay_mismatch/);
  assert.match(source, /calculateLeaderboardScore/);
  assert.match(source, /utcWeekStart/);
  assert.match(source, /leaderboardRank/);
  assert.match(source, /recentEntries\|\|0\)>=10/);
});

test("account identity keeps the generated username immutable", () => {
  const account = read("app/account/account-card.tsx");
  const migration = read("supabase/migrations/202607260011_immutable_usernames.sql");
  assert.match(account, /update\(\{display_name:displayName\}\)/);
  assert.doesNotMatch(account, /update\(\{username:/);
  assert.match(migration, /revoke update \(username\)/i);
});

test("achievement writes are idempotent and use the ambiguity fix", () => {
  const fix = read("supabase/migrations/202607270003_fix_achievement_trigger_ambiguity.sql");
  const milestones = read("supabase/migrations/202607270002_draft_milestones.sql");
  assert.match(fix, /v_achievement_id/);
  assert.match(fix, /on conflict on constraint user_achievements_pkey do nothing/i);
  assert.match(milestones, /on conflict \(user_id, achievement_id\) do nothing/i);
});

test("unfinished game modes remain visibly locked for Early Access", () => {
  const source = read("app/football-arcade.tsx");
  assert.match(source, /const locked=id!=="era"/);
  assert.match(source, /disabled=\{locked\}/);
  assert.match(source, /IN DEVELOPMENT/);
});
