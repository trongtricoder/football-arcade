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

test("the browser bundle never reads the Supabase secret key", () => {
  const browserSources = [
    read("app/football-arcade.tsx"),
    read("app/account/account-card.tsx"),
    read("lib/supabase/client.ts"),
  ].join("\n");
  const publicConfig = read("lib/supabase/public-config.ts");
  const serverConfig = read("lib/supabase/server-config.ts");
  assert.doesNotMatch(browserSources, /SUPABASE_SECRET_KEY/);
  assert.match(publicConfig, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(publicConfig, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(serverConfig, /SUPABASE_SECRET_KEY/);
  assert.match(serverConfig, /server-only/);
});

test("Early Access disclosures and feedback are visible in-product", () => {
  const source = read("app/football-arcade.tsx");
  const styles = read("app/globals.css");
  const readme = read("README.md");
  assert.match(source, /EARLY ACCESS · BEHIND THE NUMBERS/);
  assert.match(source, />PRIVACY</);
  assert.match(source, />KNOWN LIMITATIONS</);
  assert.match(source, /SEND FEEDBACK/);
  assert.match(styles, /EARLY ACCESS/);
  assert.match(readme, /## Early Access/);
});

test("guest feedback is private, bounded, throttled, and failure-safe", () => {
  const source = read("app/api/feedback/route.ts");
  const interfaceSource = read("app/football-arcade.tsx");
  const migration = read("supabase/migrations/202607300001_guest_feedback.sql");
  assert.match(source, /12_000/);
  assert.match(source, /TextEncoder/);
  assert.match(source, /categories\.has\(category\)/);
  assert.match(source, /message\.length < 10/);
  assert.match(source, /if \(!token\)/);
  assert.match(source, /authError \|\| !user/);
  assert.match(source, /status: 401/);
  assert.match(source, /\(count \|\| 0\) >= 5/);
  assert.match(source, /status: 429/);
  assert.match(source, /status: 503/);
  assert.doesNotMatch(source, /error instanceof Error \? error\.message/);
  assert.match(interfaceSource, /await ensureFootballArcadeSession\(\)/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.feedback_submissions from anon, authenticated/i);
});

test("authentication completion is clear and does not expose provider errors", () => {
  const page = read("app/auth/complete/page.tsx");
  const callback = read("app/auth/callback/route.ts");
  assert.match(page, /✓/);
  assert.match(page, /RETURN TO FOOTBALL ARCADE ↗/);
  assert.doesNotMatch(page, /âœ|â†/);
  assert.match(callback, /Authentication callback failed/);
  assert.match(callback, /The sign-in link could not be completed/);
  assert.doesNotMatch(callback, /error instanceof Error\?error\.message/);
});

test("tablet layout has an isolated readable draft and compact navigation", () => {
  const styles = read("app/globals.css");
  assert.match(styles, /@media \(min-width:701px\) and \(max-width:1024px\)/);
  assert.match(styles, /header>nav,header>\.live\{display:none\}/);
  assert.match(styles, /\.squad-builder\{grid-template-columns:1fr;gap:30px\}/);
  assert.match(styles, /\.choice-panel \.cards\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:14px\}/);
  assert.match(styles, /\.choice-panel \.player-card\{height:auto;min-width:0;display:grid;grid-template-columns:1fr;/);
});
