"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const eras = ["80s", "90s", "00s", "10s", "20s"];
type Person = { id: string; username: string; display_name: string };
type Entry = {
  id: string;
  user_id: string;
  team_name: string;
  manager_name: string;
  league_position: number;
  score: number;
  raw_team_score: number | null;
  league_points: number;
  goal_difference: number;
  profile: Person | null;
};
type RosterDetail = {
  teamName: string; manager: string; formation: string; era: string; league: string; season: string;
  score: number; teamScore: number; finish: number; points: number; goalDifference: number;
  record: string; cleanSheets: number; chemistry: string[];
  leaders: { topScorer: string; topAssister: string; bestPlayer: string; goldenGlove: string; managerAward: string };
  roster: Array<{ slot: string; name: string; club: string; role: string; baseRating: number | null; realRating: number | null; eraFit: number | null; positionFit: number | null }>;
};

function slotRole(slot: string) { return slot.replace(/\d+$/, ""); }

function pitchLine(slot: string) {
  const role = slotRole(slot);
  if (role === "GK") return "goalkeeper";
  if (["LB", "CB", "RB"].includes(role)) return "defence";
  if (["DM", "CM", "LM", "RM"].includes(role)) return "midfield";
  if (role === "AM") return "attacking-midfield";
  return "attack";
}

function preferredX(slot: string) {
  const role = slotRole(slot);
  const base: Record<string, number> = { LW: 10, LM: 12, LB: 12, LF: 28, AM: 50, CM: 50, DM: 50, CB: 50, CF: 50, ST: 50, RF: 72, RB: 88, RM: 88, RW: 90, GK: 50 };
  const number = Number(slot.match(/\d+$/)?.[0] || 0);
  if (number && ["CB", "CM", "DM", "AM", "ST"].includes(role)) return number === 1 ? 32 : number === 2 ? 68 : 50;
  return base[role] ?? 50;
}

function rowPositions(count: number) {
  if (count <= 1) return [50];
  if (count === 2) return [35, 65];
  if (count === 3) return [20, 50, 80];
  if (count === 4) return [12, 37, 63, 88];
  return [12, 31, 50, 69, 88];
}

function formationPoint(roster: RosterDetail["roster"], playerIndex: number): [number, number] {
  const line = pitchLine(roster[playerIndex].slot);
  const row = roster.map((player, index) => ({ player, index }))
    .filter(({ player }) => pitchLine(player.slot) === line)
    .sort((a, b) => preferredX(a.player.slot) - preferredX(b.player.slot) || a.index - b.index);
  const indexInRow = row.findIndex((item) => item.index === playerIndex);
  const y = line === "attack" ? 11 : line === "attacking-midfield" ? 31 : line === "midfield" ? 51 : line === "defence" ? 72 : 90;
  return [rowPositions(row.length)[indexInRow] ?? 50, y];
}

export function WeeklyLeaderboard({ onClose, initialEra = "20s" }: { onClose?: () => void; initialEra?: string } = {}) {
  const [era, setEra] = useState(initialEra);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<RosterDetail | null>(null);
  const [detailMessage, setDetailMessage] = useState("");
  const detailCache = useRef(new Map<string, RosterDetail>());
  const monday = useMemo(() => {
    const date = new Date();
    const weekday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - weekday);
    return date.toISOString().slice(0, 10);
  }, []);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("weekly_leaderboard_entries")
      .select("id,user_id,team_name,manager_name,league_position,score,raw_team_score,league_points,goal_difference")
      .eq("week_start", monday)
      .eq("era", era)
      .order("score", { ascending: false })
      .order("league_points", { ascending: false })
      .limit(250);
    if (error) {
      setMessage(error.message);
      setEntries([]);
      return;
    }
    const rows = (data || []) as Array<Omit<Entry, "profile">>;
    const ids = [...new Set(rows.map((row) => row.user_id))];
    const { data: people } = ids.length
      ? await supabase.from("profiles").select("id,username,display_name").in("id", ids)
      : { data: [] as Person[] };
    const peopleRows = (people || []) as Person[];
    const names = new Map(peopleRows.map((person) => [person.id, person]));
    setEntries(rows.map((row) => ({ ...row, profile: names.get(row.user_id) || null })) as Entry[]);
  }, [era, monday]);

  useEffect(() => { const frame = window.requestAnimationFrame(() => { void load(); }); return () => window.cancelAnimationFrame(frame); }, [load]);

  const openRoster = async (entry: Entry) => {
    const cached = detailCache.current.get(entry.id);
    if (cached) {
      setDetail(cached);
      setDetailMessage("");
      return;
    }
    setDetailMessage("LOADING VERIFIED ROSTER…");
    setDetail(null);
    const response = await fetch(`/api/rankings/weekly/entry?id=${encodeURIComponent(entry.id)}`);
    const payload = await response.json();
    if (!response.ok) { setDetailMessage(payload.error || "Unable to load this roster."); return; }
    detailCache.current.set(entry.id, payload as RosterDetail);
    setDetail(payload as RosterDetail);
    setDetailMessage("");
  };

  const content = (
    <main className={`leaderboard-page ${onClose ? "modal-panel" : ""}`}>
      {onClose && <button className="modal-close" onClick={onClose}>CLOSE ×</button>}
      <header>
        <div><span>ERA XI COMPETITION</span><h1>WEEKLY<br />LEADERBOARD</h1></div>
        <p>Every verified campaign you submit earns its own place. Enter as many different XIs as you want before the board resets Monday.</p>
      </header>
      <div className="score-key"><b>SCORING MODEL</b><span>TEAM ×8</span><span>LEAGUE PTS ×5</span><span>WINS ×4</span><span>GD ×3</span><span>CLEAN SHEETS ×3</span><span>TROPHIES +200</span><span>UNBEATEN +100</span><span>PERFECT +250</span></div>
      <div className="era-tabs">{eras.map((value) => <button type="button" className={era === value ? "active" : ""} onClick={() => setEra(value)} key={value}>{value}</button>)}</div>
      <section className="weekly-board">
        <header><span>RANK</span><span>TEAM / COACH</span><span>SCORE</span><span>OVR</span><span>PTS</span><span>GD</span><span>FINISH</span></header>
        {message && <p>{message}</p>}
        {entries.length ? entries.map((entry, index) => (
          <article key={entry.id} role="button" tabIndex={0} aria-label={`View ${entry.team_name} roster`} onClick={() => openRoster(entry)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openRoster(entry); } }}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <div><strong>{entry.team_name}</strong><small>{entry.manager_name} · {entry.profile?.display_name || "Anonymous Player"}</small></div>
            <em>{entry.score.toLocaleString()}</em>
            <span>{entry.raw_team_score || "—"}</span>
            <span>{entry.league_points}</span>
            <span>{entry.goal_difference > 0 ? "+" : ""}{entry.goal_difference}</span>
            <span>#{entry.league_position}</span>
          </article>
        )) : !message && <p>NO VERIFIED {era.toUpperCase()} SUBMISSIONS THIS WEEK YET.</p>}
      </section>
      {(detail || detailMessage) && <section className="roster-inspector" aria-live="polite">
        <button type="button" className="roster-close" aria-label="Close squad details" onClick={() => { setDetail(null); setDetailMessage(""); }}>×</button>
        {detailMessage ? <p>{detailMessage}</p> : detail && <>
          <header><h2>{detail.teamName}</h2></header>
          <div className="roster-summary"><span><b>{detail.score.toLocaleString()}</b> RANK SCORE</span><span><b>{detail.record}</b> RECORD</span><span><b>{detail.points}</b> POINTS</span><span><b>{detail.goalDifference > 0 ? "+" : ""}{detail.goalDifference}</b> GD</span></div>
          <div className="roster-layout">
            <div className="roster-pitch" aria-label={`${detail.formation} formation`}>{detail.roster.map((player, index) => { const [x,y]=formationPoint(detail.roster,index); return <article style={{left:`${x}%`,top:`${y}%`}} key={`${player.slot}-${index}`}><b>{player.realRating ?? "—"}</b><strong>{player.name}</strong><small>{player.slot} · {player.club}</small><em>{player.eraFit}% ERA · {player.positionFit}% POS</em></article> })}</div>
            <aside>
              <section className="campaign-card"><h3>CAMPAIGN</h3><div className="campaign-line"><b>{detail.league}</b><strong>#{detail.finish}</strong></div><p>{detail.season} · {detail.manager}<br />{detail.formation} · {detail.era.toUpperCase()}</p></section>
              <section className="chemistry-card"><h3>CHEMISTRY</h3>{detail.chemistry.length ? detail.chemistry.map((link) => <span key={link}>{link}</span>) : <p>No named chemistry links activated.</p>}</section>
              <section className="season-notes"><h3>SEASON REPORT</h3><div className="note-totals"><span><small>TEAM OVR</small><b>{detail.teamScore}</b></span><span><small>CLEAN SHEETS</small><b>{detail.cleanSheets}</b></span></div><dl><div><dt>TOP GOALSCORER</dt><dd>{detail.leaders.topScorer}</dd></div><div><dt>TOP ASSISTER</dt><dd>{detail.leaders.topAssister}</dd></div><div><dt>BEST PLAYER</dt><dd>{detail.leaders.bestPlayer}</dd></div><div><dt>GOLDEN GLOVE</dt><dd>{detail.leaders.goldenGlove}</dd></div><div><dt>MANAGER</dt><dd>{detail.leaders.managerAward}</dd></div></dl></section>
            </aside>
          </div>
        </>}
      </section>}
    </main>
  );

  return onClose
    ? <div className="arcade-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>{content}</div>
    : content;
}
