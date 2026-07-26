"use client";

import { useEffect, useMemo, useState } from "react";
import playerData from "@/data/players.json";
import playerExpansion from "@/data/player-expansion.json";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Selection = { playerId?: string };
type Run = { era:string; league_id:string; manager_id:string; score:number; wins:number; draws:number; losses:number; league_position:number; selections:Selection[] };
type Profile = { username:string; display_name:string };
type Stats = { verified_runs:number; league_titles:number; best_score:number; total_wins:number; invincible_seasons:number };
const eras=["80s","90s","00s","10s","20s"];
const playerNames=[...playerData,...playerExpansion].map(player=>player.name);

function favorite(values:string[]){const counts=new Map<string,number>();values.filter(Boolean).forEach(value=>counts.set(value,(counts.get(value)||0)+1));return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]||["—",0]}

export function AccountCard({onClose}:{onClose:()=>void}) {
  const [profile,setProfile]=useState<Profile|null>(null);
  const [stats,setStats]=useState<Stats|null>(null);
  const [runs,setRuns]=useState<Run[]>([]);
  const [achievementCount,setAchievementCount]=useState(0);
  const [leaderboardCount,setLeaderboardCount]=useState(0);
  const [status,setStatus]=useState("LOADING PLAYER RECORD...");
  const [editing,setEditing]=useState(false);
  const [nameDraft,setNameDraft]=useState("");
  const [nameStatus,setNameStatus]=useState("");

  useEffect(()=>{(async()=>{
    const supabase=createSupabaseBrowserClient(),{data:{user}}=await supabase.auth.getUser();
    if(!user){setStatus("PLAY AN ERA XI TO CREATE YOUR ARCADE RECORD.");return}
    const [p,s,r,a,l]=await Promise.all([
      supabase.from("profiles").select("username,display_name").eq("id",user.id).single(),
      supabase.from("user_statistics").select("verified_runs,league_titles,best_score,total_wins,invincible_seasons").eq("user_id",user.id).single(),
      supabase.from("game_runs").select("era,league_id,manager_id,score,wins,draws,losses,league_position,selections").eq("user_id",user.id).eq("verification_status","verified"),
      supabase.from("user_achievements").select("achievement_id",{count:"exact",head:true}).eq("user_id",user.id),
      supabase.from("weekly_leaderboard_entries").select("id",{count:"exact",head:true}).eq("user_id",user.id),
    ]);
    setProfile(p.data);setNameDraft(p.data?.display_name||"");setStats(s.data as Stats|null);setRuns((r.data||[]) as Run[]);setAchievementCount(a.count||0);setLeaderboardCount(l.count||0);setStatus("");
  })()},[]);

  async function saveName(){const clean=nameDraft.trim();if(clean.length<2||clean.length>24){setNameStatus("USE 2–24 CHARACTERS");return}const supabase=createSupabaseBrowserClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from("profiles").update({display_name:clean}).eq("id",user.id);if(error){setNameStatus(error.message);return}setProfile(current=>current?{...current,display_name:clean}:current);setEditing(false);setNameStatus("NAME UPDATED")}

  const totals=useMemo(()=>runs.reduce((sum,run)=>({wins:sum.wins+(run.wins||0),draws:sum.draws+(run.draws||0),losses:sum.losses+(run.losses||0)}),{wins:0,draws:0,losses:0}),[runs]);
  const matches=totals.wins+totals.draws+totals.losses,winRate=matches?Math.round(totals.wins/matches*100):0,bestRun=[...runs].sort((a,b)=>b.score-a.score)[0];
  const [favoriteEra,favoriteEraCount]=favorite(runs.map(run=>run.era)),[favoriteLeague,favoriteLeagueCount]=favorite(runs.map(run=>run.league_id)),[favoriteCoach,favoriteCoachCount]=favorite(runs.map(run=>run.manager_id)),[favoritePlayerId,favoritePlayerCount]=favorite(runs.flatMap(run=>(run.selections||[]).map(selection=>selection.playerId||""))),favoritePlayer=favoritePlayerId.startsWith("p")?playerNames[Number(favoritePlayerId.slice(1))]||favoritePlayerId:favoritePlayerId;
  const eraRows=eras.map(era=>{const eraRuns=runs.filter(run=>run.era===era),record=eraRuns.reduce((sum,run)=>({w:sum.w+run.wins,d:sum.d+run.draws,l:sum.l+run.losses,titles:sum.titles+(run.league_position===1?1:0)}),{w:0,d:0,l:0,titles:0}),eraMatches=record.w+record.d+record.l;return {era,...record,played:eraRuns.length,winRate:eraMatches?Math.round(record.w/eraMatches*100):0}});

  return <div className="arcade-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="account-record-card modal-panel"><button className="modal-close" onClick={onClose}>CLOSE ×</button><header><span>LIFETIME STATS</span><div className="account-avatar">{(profile?.display_name||"P").slice(0,1).toUpperCase()}</div>{editing?<div className="account-name-editor"><input maxLength={24} value={nameDraft} onChange={event=>setNameDraft(event.target.value)} autoFocus/><button onClick={saveName}>SAVE NAME</button><button onClick={()=>setEditing(false)}>CANCEL</button></div>:<><h1>{profile?.display_name||"FOOTBALL ARCADE PLAYER"}</h1><button className="edit-player-name" onClick={()=>setEditing(true)}>EDIT PLAYER NAME</button></>}<p>@{profile?.username||"anonymous"}{nameStatus&&` · ${nameStatus}`}</p></header>{status?<div className="account-loading">{status}</div>:<><div className="account-stat-grid"><article><small>DRAFTS COMPLETED</small><b>{stats?.verified_runs||runs.length}</b></article><article><small>ALL-TIME RECORD</small><b>{totals.wins}-{totals.draws}-{totals.losses}</b><em>{winRate}% win rate</em></article><article><small>CHAMPIONSHIPS</small><b>{stats?.league_titles||0}</b></article><article><small>BEST SCORE</small><b>{bestRun?.score||stats?.best_score||0}</b></article><article><small>FAVORITE ERA</small><b>{favoriteEra.toUpperCase()}</b><em>{favoriteEraCount} played</em></article><article><small>ACHIEVEMENTS</small><b>{achievementCount}</b></article><article><small>TOP 100 ENTRIES</small><b>{leaderboardCount}</b></article><article><small>INVINCIBLE SEASONS</small><b>{stats?.invincible_seasons||0}</b></article></div><section className="account-favorites"><article><small>MOST DRAFTED PLAYER</small><b>{favoritePlayer}</b><em>{favoritePlayerCount}× selected</em></article><article><small>MOST SELECTED COACH</small><b>{favoriteCoach}</b><em>{favoriteCoachCount}× appointed</em></article><article><small>MOST PLAYED LEAGUE</small><b>{favoriteLeague}</b><em>{favoriteLeagueCount}× entered</em></article><article><small>MOST PLAYED ERA</small><b>{favoriteEra.toUpperCase()}</b><em>{favoriteEraCount}× entered</em></article></section><section className="era-records"><span>RECORD BY ERA</span>{eraRows.map(row=><article key={row.era}><b>{row.era.toUpperCase()}</b><div><strong>{row.w}-{row.d}-{row.l} <i>({row.winRate}%)</i></strong><small>{row.played} verified draft{row.played===1?"":"s"}</small></div><em>CHAMPIONSHIPS {row.titles}×</em></article>)}</section></>}</section></div>
}
