"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
  const [usernameDraft,setUsernameDraft]=useState("");
  const [nameStatus,setNameStatus]=useState("");

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
    setUsernameDraft(p.data?.username||"");
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
      setNameDraft("Anonymous Player");setUsernameDraft(username);
      setStatus("");setAccountState("ready");
      await loadRecord(data.user.id);
    }catch(error){
      setStatus(error instanceof Error?error.message:"GUEST ACCESS FAILED.");setAccountState("error");
    }finally{setAuthBusy(false);}
  }

  async function googleAccess(){
    setAuthBusy(true);setSecurityStatus("OPENING GOOGLE...");
    try{
      const supabase=createSupabaseBrowserClient(),redirectTo=`${window.location.origin}/auth/callback?next=/`;
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
      const supabase=createSupabaseBrowserClient(),redirectTo=`${window.location.origin}/auth/callback?next=/`;
      const {error}=user?.is_anonymous
        ?await supabase.auth.updateUser({email:email.trim()},{emailRedirectTo:redirectTo})
        :await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:redirectTo}});
      if(error)throw error;
      setSecurityStatus("CHECK YOUR EMAIL TO SECURE THIS PLAYER.");
    }catch(error){setSecurityStatus(error instanceof Error?error.message:"EMAIL SIGN-IN FAILED.");}
    finally{setAuthBusy(false);}
  }

  async function saveIdentity(){
    const displayName=nameDraft.trim(),username=usernameDraft.trim();
    if(displayName.length<1||displayName.length>40){setNameStatus("NAME MUST USE 1–40 CHARACTERS");return;}
    if(!/^[A-Za-z0-9_]{3,24}$/.test(username)){setNameStatus("USERNAME: 3–24 LETTERS, NUMBERS OR _");return;}
    const supabase=createSupabaseBrowserClient(),{data:{user:currentUser}}=await supabase.auth.getUser();
    if(!currentUser)return;
    const {error}=await supabase.from("profiles").update({display_name:displayName,username}).eq("id",currentUser.id);
    if(error){setNameStatus(error.code==="23505"?"THAT USERNAME IS ALREADY TAKEN":error.message);return;}
    setProfile({display_name:displayName,username});setEditing(false);setNameStatus("IDENTITY UPDATED");
  }

  const totals=useMemo(()=>runs.reduce((sum,run)=>({wins:sum.wins+(run.wins||0),draws:sum.draws+(run.draws||0),losses:sum.losses+(run.losses||0)}),{wins:0,draws:0,losses:0}),[runs]);
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
          <label>USERNAME<input maxLength={24} value={usernameDraft} onChange={event=>setUsernameDraft(event.target.value.replace(/[^A-Za-z0-9_]/g,""))}/></label>
          <button onClick={saveIdentity}>SAVE IDENTITY</button><button onClick={()=>setEditing(false)}>CANCEL</button>
        </div>:<><h1>{profile?.display_name||"FOOTBALL ARCADE PLAYER"}</h1>{accountState==="ready"&&<button className="edit-player-name" onClick={()=>setEditing(true)}>EDIT NAME & USERNAME</button>}</>}
        <p>@{profile?.username||"anonymous"}{nameStatus&&` · ${nameStatus}`}</p>
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
      </>}
    </section>
  </div>;
}
