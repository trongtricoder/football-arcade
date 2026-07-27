"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import playerData from "@/data/players.json";
import playerExpansion from "@/data/player-expansion.json";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Selection = { playerId?: string };
type Run = { era:string; league_id:string; manager_id:string; score:number; wins:number; draws:number; losses:number; league_position:number; selections:Selection[] };
type Profile = { username:string; display_name:string };
type Stats = { verified_runs:number; league_titles:number; best_score:number; total_wins:number; invincible_seasons:number };
type AccountState = "loading" | "signed-out" | "ready" | "error";

const eras=["80s","90s","00s","10s","20s"];
const playerNames=[...playerData,...playerExpansion].map(player=>player.name);

function favorite(values:string[]){
  const counts=new Map<string,number>();
  values.filter(Boolean).forEach(value=>counts.set(value,(counts.get(value)||0)+1));
  return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]||["—",0];
}

export function AccountCard({onClose}:{onClose:()=>void}) {
  const [user,setUser]=useState<User|null>(null);
  const [accountState,setAccountState]=useState<AccountState>("loading");
  const [profile,setProfile]=useState<Profile|null>(null);
  const [stats,setStats]=useState<Stats|null>(null);
  const [runs,setRuns]=useState<Run[]>([]);
  const [achievementCount,setAchievementCount]=useState(0);
  const [leaderboardCount,setLeaderboardCount]=useState(0);
  const [status,setStatus]=useState("LOADING PLAYER RECORD...");
  const [email,setEmail]=useState("");
  const [authBusy,setAuthBusy]=useState(false);
  const [securityStatus,setSecurityStatus]=useState("");
  const [editing,setEditing]=useState(false);
  const [nameDraft,setNameDraft]=useState("");
  const [nameStatus,setNameStatus]=useState("");
  const [shareStatus,setShareStatus]=useState("");
  const [deleteArmed,setDeleteArmed]=useState(false);
  const [dataStatus,setDataStatus]=useState("");

  const loadRecord=useCallback(async(userId:string)=>{
    const supabase=createSupabaseBrowserClient();
    const request=Promise.all([
      supabase.from("profiles").select("username,display_name").eq("id",userId).maybeSingle(),
      supabase.from("user_statistics").select("verified_runs,league_titles,best_score,total_wins,invincible_seasons").eq("user_id",userId).maybeSingle(),
      supabase.from("game_runs").select("era,league_id,manager_id,score,wins,draws,losses,league_position,selections").eq("user_id",userId).eq("verification_status","verified"),
      supabase.from("user_achievements").select("achievement_id",{count:"exact",head:true}).eq("user_id",userId),
      supabase.from("weekly_leaderboard_entries").select("id",{count:"exact",head:true}).eq("user_id",userId),
    ]);
    const timeout=new Promise<never>((_,reject)=>window.setTimeout(()=>reject(new Error("Account data timed out. Please try again.")),12000));
    const [p,s,r,a,l]=await Promise.race([request,timeout]);
    const firstError=p.error||s.error||r.error||a.error||l.error;
    if(firstError)throw firstError;
    setProfile(p.data);
    setNameDraft(p.data?.display_name||"");
    setStats(s.data as Stats|null);
    setRuns((r.data||[]) as Run[]);
    setAchievementCount(a.count||0);
    setLeaderboardCount(l.count||0);
    setStatus("");
    setAccountState("ready");
  },[]);

  useEffect(()=>{
    let active=true;
    (async()=>{try{
      const supabase=createSupabaseBrowserClient(),{data,error}=await supabase.auth.getSession();
      if(error)throw error;
      if(!active)return;
      if(!data.session?.user){setStatus("");setAccountState("signed-out");return;}
      setUser(data.session.user);
      setAccountState("ready");
      await loadRecord(data.session.user.id);
    }catch(error){
      if(!active)return;
      setStatus(error instanceof Error?error.message:"ACCOUNT DATA IS TEMPORARILY UNAVAILABLE.");
      setAccountState("error");
    }})();
    return()=>{active=false;};
  },[loadRecord]);

  async function continueAsGuest(){
    setAuthBusy(true);setStatus("CREATING YOUR PLAYER RECORD...");
    try{
      const supabase=createSupabaseBrowserClient(),{data,error}=await supabase.auth.signInAnonymously();
      if(error)throw error;
      if(!data.user)throw new Error("Could not create the guest player.");
      const username=`player_${data.user.id.slice(0,8).replaceAll("-","")}`;
      setUser(data.user);
      setProfile({display_name:"Anonymous Player",username});
      setNameDraft("Anonymous Player");
      setStatus("");setAccountState("ready");
      await loadRecord(data.user.id);
    }catch(error){
      setStatus(error instanceof Error?error.message:"GUEST ACCESS FAILED.");setAccountState("error");
    }finally{setAuthBusy(false);}
  }

  async function googleAccess(){
    setAuthBusy(true);setSecurityStatus("OPENING GOOGLE...");
    try{
      const supabase=createSupabaseBrowserClient(),redirectTo=`${window.location.origin}/auth/callback?next=/&flow=google`;
      const {error}=user?.is_anonymous
        ?await supabase.auth.linkIdentity({provider:"google",options:{redirectTo}})
        :await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo}});
      if(error)throw error;
    }catch(error){setSecurityStatus(error instanceof Error?error.message:"GOOGLE SIGN-IN FAILED.");setAuthBusy(false);}
  }

  async function emailAccess(event:FormEvent){
    event.preventDefault();if(!email.trim())return;
    setAuthBusy(true);setSecurityStatus("SENDING YOUR SECURE LINK...");
    try{
      const supabase=createSupabaseBrowserClient(),redirectTo=`${window.location.origin}/auth/callback?next=/&flow=email`;
      const {error}=user?.is_anonymous
        ?await supabase.auth.updateUser({email:email.trim()},{emailRedirectTo:redirectTo})
        :await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:redirectTo}});
      if(error)throw error;
      setSecurityStatus("CHECK YOUR EMAIL TO SECURE THIS PLAYER.");
    }catch(error){setSecurityStatus(error instanceof Error?error.message:"EMAIL SIGN-IN FAILED.");}
    finally{setAuthBusy(false);}
  }

  async function saveDisplayName(){
    const displayName=nameDraft.trim();
    if(displayName.length<1||displayName.length>40){setNameStatus("NAME MUST USE 1–40 CHARACTERS");return;}
    const supabase=createSupabaseBrowserClient(),{data:{user:currentUser}}=await supabase.auth.getUser();
    if(!currentUser)return;
    const {error}=await supabase.from("profiles").update({display_name:displayName}).eq("id",currentUser.id);
    if(error){setNameStatus(error.message);return;}
    setProfile(current=>current?{...current,display_name:displayName}:current);setEditing(false);setNameStatus("DISPLAY NAME UPDATED");
  }

  async function signOut(){
    setAuthBusy(true);setSecurityStatus("SIGNING OUT...");
    try{
      const {error}=await createSupabaseBrowserClient().auth.signOut();
      if(error)throw error;
      setUser(null);setProfile(null);setStats(null);setRuns([]);setAchievementCount(0);setLeaderboardCount(0);
      setEditing(false);setNameDraft("");setNameStatus("");setEmail("");setSecurityStatus("");setStatus("SIGNED OUT SAFELY.");setAccountState("signed-out");
    }catch(error){setSecurityStatus(error instanceof Error?error.message:"SIGN OUT FAILED.");}
    finally{setAuthBusy(false);}
  }

  async function shareAccountStats(){
    const displayName=profile?.display_name||"Football Arcade Player";
    const text=[
      `${displayName} · @${profile?.username||"player"}`,
      `Football Arcade lifetime record: ${totals.wins}-${totals.draws}-${totals.losses} (${winRate}% wins)`,
      `${stats?.verified_runs||runs.length} drafts · ${stats?.league_titles||0} championships · best score ${bestRun?.score||stats?.best_score||0}`,
      `${achievementCount} achievements · favorite era ${favoriteEra.toUpperCase()}`,
    ].join("\n");
    try{
      if(navigator.share){await navigator.share({title:`${displayName} · Football Arcade`,text,url:window.location.origin});setShareStatus("SHARED");}
      else{await navigator.clipboard.writeText(`${text}\n${window.location.origin}`);setShareStatus("STATS COPIED");}
    }catch(error){if(error instanceof DOMException&&error.name==="AbortError")return;setShareStatus("SHARE UNAVAILABLE");}
    window.setTimeout(()=>setShareStatus(""),3000);
  }

  async function exportAccountData(){
    setDataStatus("PREPARING EXPORT...");
    try{
      const supabase=createSupabaseBrowserClient(),{data:{user:currentUser}}=await supabase.auth.getUser();
      if(!currentUser)throw new Error("Sign in before exporting data.");
      const [profileData,statisticsData,runsData,achievementsData,leaderboardData]=await Promise.all([
        supabase.from("profiles").select("*").eq("id",currentUser.id).maybeSingle(),
        supabase.from("user_statistics").select("*").eq("user_id",currentUser.id).maybeSingle(),
        supabase.from("game_runs").select("*").eq("user_id",currentUser.id),
        supabase.from("user_achievements").select("*").eq("user_id",currentUser.id),
        supabase.from("weekly_leaderboard_entries").select("*").eq("user_id",currentUser.id),
      ]);
      const failure=[profileData,statisticsData,runsData,achievementsData,leaderboardData].find(result=>result.error)?.error;
      if(failure)throw failure;
      const payload={exportedAt:new Date().toISOString(),accountId:currentUser.id,email:currentUser.email||null,profile:profileData.data,statistics:statisticsData.data,runs:runsData.data,achievements:achievementsData.data,leaderboardEntries:leaderboardData.data};
      const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
      const link=document.createElement("a");link.href=url;link.download=`football-arcade-${profile?.username||"player"}.json`;link.click();URL.revokeObjectURL(url);setDataStatus("EXPORT DOWNLOADED");
    }catch(error){setDataStatus(error instanceof Error?error.message:"EXPORT FAILED");}
  }

  async function deleteAccount(){
    if(!deleteArmed){setDeleteArmed(true);setDataStatus("CLICK CONFIRM DELETE TO REMOVE THIS ACCOUNT AND ALL SAVED DATA.");return;}
    setAuthBusy(true);setDataStatus("DELETING ACCOUNT...");
    try{
      const supabase=createSupabaseBrowserClient(),{data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token)throw new Error("Your session expired. Sign in again before deleting the account.");
      const response=await fetch("/api/account",{method:"DELETE",headers:{Authorization:`Bearer ${session.access_token}`}}),payload=await response.json();
      if(!response.ok)throw new Error(payload.error||"Account deletion failed.");
      await supabase.auth.signOut();setUser(null);setProfile(null);setStats(null);setRuns([]);setAchievementCount(0);setLeaderboardCount(0);setAccountState("signed-out");setStatus("ACCOUNT AND SAVED DATA DELETED.");setDataStatus("");setDeleteArmed(false);
    }catch(error){setDataStatus(error instanceof Error?error.message:"ACCOUNT DELETION FAILED.");}
    finally{setAuthBusy(false);}
  }

  const totals=runs.reduce((sum,run)=>({wins:sum.wins+(run.wins||0),draws:sum.draws+(run.draws||0),losses:sum.losses+(run.losses||0)}),{wins:0,draws:0,losses:0});
  const matches=totals.wins+totals.draws+totals.losses,winRate=matches?Math.round(totals.wins/matches*100):0,bestRun=[...runs].sort((a,b)=>b.score-a.score)[0];
  const [favoriteEra,favoriteEraCount]=favorite(runs.map(run=>run.era)),[favoriteLeague,favoriteLeagueCount]=favorite(runs.map(run=>run.league_id)),[favoriteCoach,favoriteCoachCount]=favorite(runs.map(run=>run.manager_id)),[favoritePlayerId,favoritePlayerCount]=favorite(runs.flatMap(run=>(run.selections||[]).map(selection=>selection.playerId||""))),favoritePlayer=favoritePlayerId.startsWith("p")?playerNames[Number(favoritePlayerId.slice(1))]||favoritePlayerId:favoritePlayerId;
  const eraRows=eras.map(era=>{const eraRuns=runs.filter(run=>run.era===era),record=eraRuns.reduce((sum,run)=>({w:sum.w+run.wins,d:sum.d+run.draws,l:sum.l+run.losses,titles:sum.titles+(run.league_position===1?1:0)}),{w:0,d:0,l:0,titles:0}),eraMatches=record.w+record.d+record.l;return {era,...record,played:eraRuns.length,winRate:eraMatches?Math.round(record.w/eraMatches*100):0};});
  const showAccess=accountState==="signed-out"||accountState==="error";

  return <div className="arcade-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section className="account-record-card modal-panel">
      <button className="modal-close" onClick={onClose}>CLOSE ×</button>
      <header>
        <span>LIFETIME STATS</span><div className="account-avatar">{(profile?.display_name||"P").slice(0,1).toUpperCase()}</div>
        {editing?<div className="account-name-editor">
          <label>DISPLAY NAME<input maxLength={40} value={nameDraft} onChange={event=>setNameDraft(event.target.value)} autoFocus/></label>
          <div className="locked-username"><small>PLAYER ID</small><strong>@{profile?.username||"anonymous"}</strong></div>
          <button onClick={saveDisplayName}>SAVE NAME</button><button onClick={()=>setEditing(false)}>CANCEL</button>
        </div>:<><h1>{profile?.display_name||"FOOTBALL ARCADE PLAYER"}</h1>{accountState==="ready"&&<div className="account-identity-actions"><button className="account-share" onClick={shareAccountStats}>SHARE STATS</button><button className="edit-player-name" onClick={()=>setEditing(true)}>EDIT DISPLAY NAME</button><button className="account-sign-out" disabled={authBusy} onClick={signOut}>LOG OUT</button></div>}</>}
        <p>@{profile?.username||"anonymous"}{nameStatus&&` · ${nameStatus}`}{shareStatus&&` · ${shareStatus}`}</p>
      </header>

      {accountState==="loading"?<div className="account-loading">{status}</div>:showAccess?<section className="account-access">
        <span>FOOTBALL ARCADE ID</span><h2>{accountState==="error"?"CONNECTION INTERRUPTED.":"SAVE YOUR LEGACY."}</h2>
        <p>{status||"Sign in to carry your runs, achievements and leaderboard entries across devices."}</p>
        <div className="account-access-actions"><button disabled={authBusy} onClick={continueAsGuest}>PLAY AS GUEST</button><button disabled={authBusy} onClick={googleAccess}>CONTINUE WITH GOOGLE ↗</button></div>
        <form onSubmit={emailAccess}><label htmlFor="modal-account-email">EMAIL MAGIC LINK</label><div><input id="modal-account-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" required/><button disabled={authBusy} type="submit">SEND LINK ↗</button></div></form>
      </section>:<>
        {user?.is_anonymous&&<section className="account-secure"><div><span>GUEST PLAYER</span><h2>KEEP THIS LEGACY.</h2><p>Link Google or email to use this identity on every device.</p>{securityStatus&&<strong>{securityStatus}</strong>}</div><div className="account-secure-actions"><button disabled={authBusy} onClick={googleAccess}>LINK GOOGLE ↗</button><form onSubmit={emailAccess}><input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" required/><button disabled={authBusy} type="submit">LINK EMAIL ↗</button></form></div></section>}
        <div className="account-stat-grid">
          <article><small>DRAFTS COMPLETED</small><b>{stats?.verified_runs||runs.length}</b></article><article><small>ALL-TIME RECORD</small><b>{totals.wins}-{totals.draws}-{totals.losses}</b><em>{winRate}% win rate</em></article><article><small>CHAMPIONSHIPS</small><b>{stats?.league_titles||0}</b></article><article><small>BEST SCORE</small><b>{bestRun?.score||stats?.best_score||0}</b></article><article><small>FAVORITE ERA</small><b>{favoriteEra.toUpperCase()}</b><em>{favoriteEraCount} played</em></article><article><small>ACHIEVEMENTS</small><b>{achievementCount}</b></article><article><small>TOP 100 ENTRIES</small><b>{leaderboardCount}</b></article><article><small>INVINCIBLE SEASONS</small><b>{stats?.invincible_seasons||0}</b></article>
        </div>
        <section className="account-favorites"><article><small>MOST DRAFTED PLAYER</small><b>{favoritePlayer}</b><em>{favoritePlayerCount}× selected</em></article><article><small>MOST SELECTED COACH</small><b>{favoriteCoach}</b><em>{favoriteCoachCount}× appointed</em></article><article><small>MOST PLAYED LEAGUE</small><b>{favoriteLeague}</b><em>{favoriteLeagueCount}× entered</em></article><article><small>MOST PLAYED ERA</small><b>{favoriteEra.toUpperCase()}</b><em>{favoriteEraCount}× entered</em></article></section>
        <section className="era-records"><span>RECORD BY ERA</span>{eraRows.map(row=><article key={row.era}><b>{row.era.toUpperCase()}</b><div><strong>{row.w}-{row.d}-{row.l} <i>({row.winRate}%)</i></strong><small>{row.played} verified draft{row.played===1?"":"s"}</small></div><em>CHAMPIONSHIPS {row.titles}×</em></article>)}</section>
        <section className="account-data-controls"><div><span>YOUR DATA</span><p>Download your Football Arcade record or permanently remove this identity and every saved run.</p>{dataStatus&&<strong>{dataStatus}</strong>}</div><div><button disabled={authBusy} onClick={exportAccountData}>EXPORT DATA</button><button className={deleteArmed?"confirm-delete":""} disabled={authBusy} onClick={deleteAccount}>{deleteArmed?"CONFIRM DELETE":"DELETE ACCOUNT"}</button>{deleteArmed&&<button disabled={authBusy} onClick={()=>{setDeleteArmed(false);setDataStatus("");}}>CANCEL</button>}</div></section>
      </>}
    </section>
  </div>;
}
