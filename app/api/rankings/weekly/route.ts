import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {simulateAuthoritativeEraXi, type EraXiRunRequest} from "@/simulation/era-xi-authority";
import {calculateLeaderboardScore,leaderboardRank,utcWeekStart} from "@/lib/leaderboard-rules";
export const dynamic="force-dynamic";
function token(request:Request){const value=request.headers.get("authorization");return value?.startsWith("Bearer ")?value.slice(7):null}
export async function POST(request:Request){try{
 const access=token(request);if(!access)return Response.json({error:"Sign in before submitting."},{status:401});
 const supabase=createSupabaseAdminClient(),{data:{user}}=await supabase.auth.getUser(access);if(!user)return Response.json({error:"Invalid account session."},{status:401});
 const oneMinuteAgo=new Date(Date.now()-60_000).toISOString(),{count:recentEntries}=await supabase.from("weekly_leaderboard_entries").select("id",{count:"exact",head:true}).eq("user_id",user.id).gte("submitted_at",oneMinuteAgo);if((recentEntries||0)>=10){await supabase.from("security_events").insert({user_id:user.id,event_type:"leaderboard_rate_limit",severity:"warning",details:{recentEntries}});return Response.json({error:"Too many leaderboard submissions. Wait one minute and try again."},{status:429})}
 const {runId,teamName}=await request.json() as {runId:string;teamName:string};const clean=teamName?.trim();if(!clean||clean.length<2||clean.length>32)return Response.json({error:"Team name must contain 2–32 characters."},{status:400});
 const {data:run,error}=await supabase.from("game_runs").select("id,user_id,seed,formation,era,selections,score,league_position,league_points,wins,draws,losses,goals_for,goals_against,clean_sheets,trophy_count,manager_id,league_id,season_id,verification_status,finalized_at").eq("id",runId).eq("user_id",user.id).single();
 if(error||!run||run.verification_status!=="verified")return Response.json({error:"Verified run not found."},{status:404});
 if(!run.finalized_at)return Response.json({error:"Run verification is incomplete."},{status:409});
 const replay=simulateAuthoritativeEraXi({seed:run.seed,formation:run.formation,era:run.era,selections:run.selections,managerName:run.manager_id,league:run.league_id,seasonYear:Number(run.season_id)} as EraXiRunRequest);
 const checks=[replay.score===run.score,replay.leaguePosition===run.league_position,replay.leaguePoints===run.league_points,replay.wins===run.wins,replay.draws===run.draws,replay.losses===run.losses,replay.goalsFor===run.goals_for,replay.goalsAgainst===run.goals_against,replay.cleanSheets===run.clean_sheets,replay.trophyCount===run.trophy_count];
 if(checks.some(check=>!check)){await supabase.from("security_events").insert({user_id:user.id,event_type:"leaderboard_replay_mismatch",severity:"critical",details:{runId}});return Response.json({error:"This campaign did not pass replay verification."},{status:422})}
 const {goalDifference:gd,breakdown,rankingScore}=calculateLeaderboardScore({score:run.score,leaguePoints:run.league_points||0,wins:run.wins||0,draws:run.draws||0,losses:run.losses||0,goalsFor:run.goals_for||0,goalsAgainst:run.goals_against||0,cleanSheets:run.clean_sheets||0,trophyCount:run.trophy_count||0}),weekStart=utcWeekStart();
 const payload={week_start:weekStart,era:run.era,user_id:user.id,run_id:run.id,team_name:clean,manager_name:run.manager_id||"Unknown Coach",league_position:run.league_position||1,score:rankingScore,raw_team_score:run.score,score_breakdown:breakdown,league_points:run.league_points,goal_difference:gd,trophy_count:run.trophy_count};
 const {error:rankError}=await supabase.from("weekly_leaderboard_entries").insert(payload);if(rankError&&rankError.code!=="23505")throw rankError;
 await supabase.from("game_runs").update({team_name:clean}).eq("id",run.id);
 const {data:ranked,error:rankingError}=await supabase.from("weekly_leaderboard_entries").select("run_id").eq("week_start",weekStart).eq("era",run.era).order("score",{ascending:false}).order("league_points",{ascending:false}).order("goal_difference",{ascending:false}).order("submitted_at",{ascending:true});
 const rank=!rankingError?leaderboardRank(ranked||[],run.id):Math.max(1,(ranked||[]).length);
 return Response.json({submitted:true,weekStart,era:run.era,rank,rankingScore,breakdown});
}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to submit this run."},{status:400})}}
