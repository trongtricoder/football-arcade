import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRosterPlayer } from "@/simulation/player-rating";
import { buildPlayerSeasonStats, getSeasonLeaders, type VerifiedPlayerSeasonStat } from "@/simulation/player-season-stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return Response.json({ error: "Invalid leaderboard entry." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: entry, error: entryError } = await supabase
      .from("weekly_leaderboard_entries")
      .select("id,run_id,team_name,manager_name,league_position,score,raw_team_score,league_points,goal_difference")
      .eq("id", id)
      .single();
    if (entryError || !entry) {
      return Response.json({ error: entryError?.message || "Leaderboard entry not found." }, { status: 404 });
    }

    const { data: run, error: runError } = await supabase
      .from("game_runs")
      .select("formation,era,league_id,season_id,selections,wins,draws,losses,goals_for,clean_sheets,result,verification_status")
      .eq("id", entry.run_id)
      .eq("verification_status", "verified")
      .single();
    if (runError || !run) {
      return Response.json({ error: runError?.message || "Verified roster not found." }, { status: 404 });
    }

    const selections = Array.isArray(run.selections) ? run.selections : [];
    const roster = selections.map((selection: { playerId?: string; slot?: string }) => {
      const slot = selection.slot || "—";
      const player = getRosterPlayer(selection.playerId || "", slot, run.era);
      return {
        slot,
        name: player?.name || "Unknown player",
        club: player?.club || "—",
        role: player?.role || "—",
        baseRating: player?.baseRating ?? null,
        realRating: player?.realRating ?? null,
        eraFit: player?.eraFit ?? null,
        positionFit: player?.positionFit ?? null,
        attributes: player?.attrs ?? [],
      };
    });

    const result = run.result && typeof run.result === "object" ? run.result as Record<string, unknown> : {};
    const storedStats = Array.isArray(result.playerStats) ? result.playerStats as VerifiedPlayerSeasonStat[] : null;
    const playerStats = storedStats || buildPlayerSeasonStats(roster, Number(run.goals_for) || 0, Number(run.clean_sheets) || 0);
    const storedLeaders = result.seasonLeaders && typeof result.seasonLeaders === "object"
      ? result.seasonLeaders as ReturnType<typeof getSeasonLeaders>
      : null;
    const leaders = storedLeaders || getSeasonLeaders(playerStats, entry.manager_name, entry.league_position, Number(run.clean_sheets) || 0);
    return Response.json({
      teamName: entry.team_name,
      manager: entry.manager_name,
      formation: run.formation,
      era: run.era,
      league: run.league_id,
      season: run.season_id,
      score: entry.score,
      teamScore: entry.raw_team_score,
      finish: entry.league_position,
      points: entry.league_points,
      goalDifference: entry.goal_difference,
      record: `${run.wins}-${run.draws}-${run.losses}`,
      cleanSheets: run.clean_sheets,
      chemistry: Array.isArray(result.chemistryActivations) ? result.chemistryActivations : [],
      leaders,
      roster,
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load this roster." }, { status: 400 });
  }
}
