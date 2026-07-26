import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  simulateAuthoritativeEraXi,
  type EraXiRunRequest,
} from "@/simulation/era-xi-authority";

export const dynamic = "force-dynamic";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length);
}

export async function POST(request: Request) {
  try {
    const token = bearerToken(request);
    if (!token) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 32_000) {
      return Response.json({ error: "Request is too large." }, { status: 413 });
    }

    const supabase = createSupabaseAdminClient();
    const {
      data: { user },
      error: authenticationError,
    } = await supabase.auth.getUser(token);

    if (authenticationError || !user) {
      return Response.json({ error: "Invalid account session." }, { status: 401 });
    }

    const body = await request.json() as EraXiRunRequest;
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentRuns } = await supabase
      .from("game_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneMinuteAgo);
    if ((recentRuns || 0) >= 6) {
      await supabase.from("security_events").insert({ user_id: user.id, event_type: "era_xi_rate_limit", severity: "warning", details: { recentRuns } });
      return Response.json({ error: "Too many simulations. Wait one minute and try again." }, { status: 429 });
    }
    const authoritative = simulateAuthoritativeEraXi(body);
    const now = new Date().toISOString();
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_team_name")
      .eq("id", user.id)
      .single();
    const teamName = profile?.default_team_name || "Era XI";
    const { data: savedRun, error: saveError } = await supabase
      .from("game_runs")
      .insert({
        user_id: user.id,
        game_type: "era-xi",
        mode: "random",
        seed: body.seed,
        formation: body.formation,
        era: body.era,
        league_id: body.league,
        season_id: String(body.seasonYear),
        manager_id: body.managerName,
        team_name: teamName,
        selections: body.selections,
        score: authoritative.score,
        league_position: authoritative.leaguePosition,
        league_points: authoritative.leaguePoints,
        wins: authoritative.wins,
        draws: authoritative.draws,
        losses: authoritative.losses,
        goals_for: authoritative.goalsFor,
        goals_against: authoritative.goalsAgainst,
        clean_sheets: authoritative.cleanSheets,
        trophy_count: authoritative.trophyCount,
        result: authoritative,
        engine_version: "era-xi-1",
        data_version: "football-data-2026-07",
        rules_version: "accounts-foundation-1",
        verification_status: "verified",
        verified_at: now,
      })
      .select("id, score, league_position, league_points, verification_status")
      .single();

    if (saveError) throw saveError;

    const { error: finalizeError } = await supabase.rpc(
      "finalize_verified_run",
      { target_run_id: savedRun.id },
    );
    if (finalizeError) throw finalizeError;

    const { data: unlockedAchievements, error: achievementError } = await supabase
      .from("user_achievements")
      .select("achievement_id,achievement_definitions(name,description,tier)")
      .eq("source_run_id", savedRun.id);
    if (achievementError) throw achievementError;

    return Response.json({
      run: savedRun,
      unlockedAchievements,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Unable to verify this Era XI run.";

    return Response.json({ error: message }, { status: 400 });
  }
}
