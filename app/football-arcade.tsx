"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "home" | "era" | "perfect" | "player" | "about";
type Game = Exclude<Mode, "home" | "about">;
type Pos = "GK" | "DEF" | "MID" | "ATT";
type Player = { id:string; name:string; pos:Pos; era:string; nation:string; club:string; league:string; attrs:number[]; color:string };
type Pick = Player & { slot?:string; attribute?:string; value?:number };
type MatchResult = { result:"W"|"D"|"L"; score:string; opponent:string };
type Result = { title:string; score:number; grade:string; story:string; stats:{label:string;value:string}[]; badges:string[]; detail:string[]; matches?:MatchResult[]; table?:{club:string;played:number;points:number;highlight?:boolean}[]; awards?:string[] };

const A = ["PAC","FIN","PAS","DRI","DEF","PHY"];
const COLORS = ["#e6ff52","#ff6b35","#63e6ff","#d9a8ff","#ffcf4a"];
const raw: Array<[string,Pos,string,string,string,string,number[]]> = [
  ["Gianluigi Buffon","GK","2000–04","Italy","Turin","Serie A",[55,28,72,58,97,91]],
  ["Manuel Neuer","GK","2010–14","Germany","Munich","Bundesliga",[78,32,88,72,96,88]],
  ["Peter Schmeichel","GK","1995–99","Denmark","Manchester","Premier League",[58,25,65,48,95,94]],
  ["Iker Casillas","GK","2005–09","Spain","Madrid","La Liga",[68,22,70,61,96,84]],
  ["Edwin van der Sar","GK","2005–09","Netherlands","Manchester","Premier League",[52,24,79,59,94,87]],
  ["Paolo Maldini","DEF","1990–94","Italy","Milan","Serie A",[86,60,84,82,98,91]],
  ["Franz Beckenbauer","DEF","Legacy","Germany","Munich","Bundesliga",[80,72,93,88,97,84]],
  ["Virgil van Dijk","DEF","2015–19","Netherlands","Liverpool","Premier League",[82,58,82,74,96,96]],
  ["Sergio Ramos","DEF","2010–14","Spain","Madrid","La Liga",[82,76,84,79,94,92]],
  ["Cafu","DEF","2000–04","Brazil","Rome","Serie A",[94,68,86,88,89,87]],
  ["Roberto Carlos","DEF","1995–99","Brazil","Madrid","La Liga",[97,86,82,87,86,91]],
  ["Philipp Lahm","DEF","2010–14","Germany","Munich","Bundesliga",[85,63,92,90,95,78]],
  ["Rio Ferdinand","DEF","2005–09","England","Manchester","Premier League",[83,50,82,74,94,90]],
  ["Carles Puyol","DEF","2005–09","Spain","Barcelona","La Liga",[74,58,76,67,96,95]],
  ["Zinedine Zidane","MID","2000–04","France","Madrid","La Liga",[80,90,98,97,61,86]],
  ["Xavi","MID","2005–09","Spain","Barcelona","La Liga",[70,82,99,94,74,72]],
  ["Andrés Iniesta","MID","2010–14","Spain","Barcelona","La Liga",[78,84,97,98,66,70]],
  ["Luka Modrić","MID","2015–19","Croatia","Madrid","La Liga",[78,82,97,95,79,79]],
  ["Patrick Vieira","MID","2000–04","France","London","Premier League",[84,78,88,84,94,97]],
  ["Andrea Pirlo","MID","2005–09","Italy","Milan","Serie A",[65,81,99,91,68,72]],
  ["Kevin De Bruyne","MID","2020–24","Belgium","Manchester","Premier League",[77,90,98,91,67,86]],
  ["Kaká","MID","2005–09","Brazil","Milan","Serie A",[93,91,92,95,62,84]],
  ["Claude Makélélé","MID","2000–04","France","London","Premier League",[76,59,86,82,97,89]],
  ["Jude Bellingham","MID","2020–24","England","Madrid","La Liga",[88,88,91,92,83,93]],
  ["Lionel Messi","ATT","2010–14","Argentina","Barcelona","La Liga",[94,99,98,99,42,78]],
  ["Cristiano Ronaldo","ATT","2010–14","Portugal","Madrid","La Liga",[97,99,88,96,45,97]],
  ["Thierry Henry","ATT","2000–04","France","London","Premier League",[98,97,89,96,48,86]],
  ["Ronaldo Nazário","ATT","1995–99","Brazil","Milan","Serie A",[99,98,84,99,42,92]],
  ["Ronaldinho","ATT","2005–09","Brazil","Barcelona","La Liga",[91,93,96,99,44,80]],
  ["Robert Lewandowski","ATT","2015–19","Poland","Munich","Bundesliga",[84,98,87,91,48,93]],
  ["Kylian Mbappé","ATT","2020–24","France","Paris","Ligue 1",[99,96,86,97,43,88]],
  ["Mohamed Salah","ATT","2015–19","Egypt","Liverpool","Premier League",[96,95,88,94,49,84]],
  ["Dennis Bergkamp","ATT","1995–99","Netherlands","London","Premier League",[81,94,96,97,46,82]],
  ["Karim Benzema","ATT","2020–24","France","Madrid","La Liga",[82,97,93,94,48,89]],
  ["Nick Pope","GK","2020–24","England","Newcastle","Premier League",[49,20,67,45,84,86]],
  ["David Raya","GK","2020–24","Spain","London","Premier League",[62,18,82,61,86,78]],
  ["Steve Mandanda","GK","2010–14","France","Marseille","Ligue 1",[58,22,70,55,82,83]],
  ["Dan Burn","DEF","2020–24","England","Newcastle","Premier League",[54,49,70,61,84,92]],
  ["Trent Alexander-Arnold","DEF","2015–24","England","Liverpool","Premier League",[82,73,96,86,78,76]],
  ["James Tarkowski","DEF","2020–24","England","Liverpool","Premier League",[58,52,68,57,86,91]],
  ["Nacho Monreal","DEF","2015–19","Spain","London","Premier League",[72,61,77,73,82,78]],
  ["Wes Morgan","DEF","2015–19","Jamaica","Leicester","Premier League",[55,52,61,49,84,94]],
  ["Cristian Zaccardo","DEF","2005–09","Italy","Palermo","Serie A",[69,55,70,64,81,83]],
  ["Pascal Groß","MID","2020–24","Germany","Brighton","Premier League",[59,76,88,81,72,76]],
  ["James Milner","MID","2015–19","England","Liverpool","Premier League",[72,73,82,77,80,91]],
  ["Mousa Dembélé","MID","2015–19","Belgium","London","Premier League",[78,70,84,92,81,90]],
  ["Mark Noble","MID","2010–14","England","London","Premier League",[62,73,82,75,78,82]],
  ["Gennaro Gattuso","MID","2005–09","Italy","Milan","Serie A",[70,62,76,72,91,96]],
  ["Tim Cahill","MID","2005–09","Australia","Liverpool","Premier League",[72,83,76,74,75,94]],
  ["Olivier Giroud","ATT","2015–19","France","London","Premier League",[66,88,81,79,50,93]],
  ["Peter Crouch","ATT","2005–09","England","Liverpool","Premier League",[58,82,74,70,46,88]],
  ["Michu","ATT","2010–14","Spain","Swansea","Premier League",[72,86,75,79,48,83]],
  ["Jamie Vardy","ATT","2015–19","England","Leicester","Premier League",[94,88,73,82,49,86]],
  ["Aritz Aduriz","ATT","2015–19","Spain","Bilbao","La Liga",[61,87,72,74,48,92]],
  ["Demba Ba","ATT","2010–14","Senegal","Newcastle","Premier League",[79,84,71,77,47,90]],
];
const PLAYERS:Player[] = raw.map(([name,pos,era,nation,club,league,attrs],i)=>({id:`p${i}`,name,pos,era,nation,club,league,attrs,color:COLORS[i%COLORS.length]}));
const FORMATIONS = [
  {name:"4-3-3",slots:["GK","RB","RCB","LCB","LB","DM","RCM","LCM","RW","ST","LW"]},
  {name:"4-2-3-1",slots:["GK","RB","RCB","LCB","LB","RDM","LDM","RAM","CAM","LAM","ST"]},
  {name:"3-4-3",slots:["GK","RCB","CB","LCB","RM","RCM","LCM","LM","RW","ST","LW"]},
  {name:"4-4-2",slots:["GK","RB","RCB","LCB","LB","RM","RCM","LCM","LM","RST","LST"]},
  {name:"3-5-2",slots:["GK","RCB","CB","LCB","RWB","RDM","CAM","LDM","LWB","RST","LST"]},
];
const PERFECT_SLOTS = ["Goalkeeper","Defender","Midfielder","Attacker","Wildcard"];
const leagues = ["Premier League","La Liga","Serie A","Bundesliga","Ligue 1"];
const LEAGUE_CLUBS:Record<string,string[]>={"Premier League":["Manchester City","Arsenal","Liverpool","Chelsea","Newcastle"],"La Liga":["Real Madrid","Barcelona","Atlético","Villarreal","Sevilla"],"Serie A":["Inter","Milan","Napoli","Juventus","Atalanta"],"Bundesliga":["Bayern","Leverkusen","Dortmund","Leipzig","Frankfurt"],"Ligue 1":["Paris","Marseille","Monaco","Lyon","Lille"]};
const ERAS = [
  {id:"80s",label:"THE 80s",years:"1980–89",title:"Steel & freedom",copy:"Physical duels, direct attacks and fearless individual expression.",traits:["PHYSICAL","DIRECT","INDIVIDUAL"]},
  {id:"90s",label:"THE 90s",years:"1990–99",title:"Artists & enforcers",copy:"Technical number 10s, ruthless defenders and contrasting identities.",traits:["TECHNIQUE","DUELS","CREATIVITY"]},
  {id:"00s",label:"THE 00s",years:"2000–09",title:"Systems collide",copy:"Long-ball power met the first great waves of positional possession.",traits:["TRANSITIONS","TIKI-TAKA","POWER"]},
  {id:"10s",label:"THE 10s",years:"2010–19",title:"Press & possess",copy:"High pressing, dominant possession and the age of superteams.",traits:["PRESSING","POSSESSION","WIDTH"]},
  {id:"20s",label:"THE 20s",years:"2020–NOW",title:"The laboratory",copy:"Data-led recruitment, strict structures and positionless football.",traits:["STRUCTURE","ATHLETICISM","HYBRIDS"]},
];

function hash(s:string){let h=2166136261; for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)} return h>>>0}
function rng(seed:string){let x=hash(seed)||1; return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
function sample<T>(items:T[], n:number, seed:string){const pool=[...items],r=rng(seed),out:T[]=[];while(pool.length&&out.length<n)out.push(pool.splice(Math.floor(r()*pool.length),1)[0]);return out}
function balancedPlayers(items:Player[],seed:string){const ranked=[...items].sort((a,b)=>overall(b)-overall(a)),r=rng(seed);const third=Math.max(1,Math.floor(ranked.length/3));const bands=[ranked.slice(0,third),ranked.slice(third,third*2),ranked.slice(third*2)];return bands.map(b=>b[Math.floor(r()*b.length)]).filter(Boolean).sort(()=>r()-.5)}
const PEAK_RATINGS:Record<string,number>={"Lionel Messi":101,"Cristiano Ronaldo":99,"Ronaldo Nazário":99,"Zinedine Zidane":98,"Thierry Henry":98,"Ronaldinho":98,"Paolo Maldini":98,"Xavi":97,"Andrés Iniesta":97,"Manuel Neuer":97};
function overall(p:Player){
  if(PEAK_RATINGS[p.name]) return PEAK_RATINGS[p.name];
  const weights=p.pos==="ATT"?[.18,.25,.18,.24,.01,.14]:p.pos==="MID"?[.12,.12,.25,.21,.15,.15]:p.pos==="DEF"?[.13,.04,.14,.1,.34,.25]:[.06,.01,.2,.08,.4,.25];
  return Math.round(p.attrs.reduce((sum,value,index)=>sum+value*weights[index],0));
}
function playerDecade(p:Player){
  if(p.name==="Franz Beckenbauer") return 70;
  const year=Number(p.era.match(/\d{4}/)?.[0]||2000);
  return Math.floor(year/10)*10%100;
}
function eraFit(p:Player,eraId:string){
  const target=Number(eraId.slice(0,2));
  const distance=Math.abs(playerDecade(p)-target)/10;
  const base=distance===0?100:distance===1?91:distance===2?83:distance===3?77:72;
  const styleBonus=eraId==="80s"?p.attrs[5]>90?2:0:eraId==="90s"?p.attrs[3]>90?2:0:eraId==="00s"?p.attrs[2]>90?2:0:eraId==="10s"?p.attrs[0]>90?2:0:p.attrs[2]>90?2:0;
  return Math.min(100,base+styleBonus);
}
function dailySeed(){return new Date().toISOString().slice(0,10)}
function grade(score:number){return score>=95?"IMMORTAL":score>=88?"WORLD CLASS":score>=80?"CONTENDER":score>=70?"DANGEROUS":"CULT HEROES"}

function simulate(game:Game,picks:Pick[],seed:string,league:string,position:Pos,eraId=""):Result{
  const r=rng(seed+picks.map(p=>p.id+(p.value||"")).join(""));
  if(game==="era"){
    const avg=picks.reduce((s,p)=>s+overall(p),0)/picks.length;
    const nations=new Set(picks.map(p=>p.nation)).size, clubs=new Set(picks.map(p=>p.club)).size,fit=eraId?Math.round(picks.reduce((s,p)=>s+eraFit(p,eraId),0)/picks.length):90;
    const chemistry=Math.max(60,Math.round(98-nations*2-clubs+avg/7)); const score=Math.min(101,Math.round(avg*.62+chemistry*.2+fit*.18));
    const wins=Math.min(34,Math.round(18+(score-70)*.43+r()*4)), draws=Math.round(3+r()*6), losses=Math.max(0,38-wins-draws);
    const pts=wins*3+draws, gd=Math.round((score-68)*2.5+r()*16); const best=[...picks].sort((a,b)=>overall(b)-overall(a))[0];
    return {title:`${pts} points. A team out of time.`,score,grade:grade(score),story:`${best.name} became the heartbeat of a side that bent eras into one relentless identity.`,stats:[{label:"League",value:`${wins}W ${draws}D ${losses}L`},{label:"Era fit",value:`${fit}%`},{label:"Goal diff.",value:`+${gd}`},{label:"Cup",value:score>91?"Winners":score>83?"Final":"Semi-final"}],badges:[score>90?"League champions":"Title race",fit>91?"Perfect time travellers":"Era rebels",gd>60?"Goal machine":"Late drama"],detail:[`The XI averaged ${fit}% fit for the chosen era.`,`${best.name} was named player of the season.`,losses===0?"The league campaign ended unbeaten.":`The dream cracked ${losses} time${losses===1?"":"s"}, but never quietly.`]};
  }
  if(game==="perfect"){
    const avg=picks.reduce((s,p)=>s+overall(p),0)/picks.length;const games=league==="Bundesliga"?34:38;const strength=(avg-72)/25;
    let w=0,d=0,l=0;const moments:string[]=[],matches:MatchResult[]=[];const rivals=LEAGUE_CLUBS[league];for(let i=1;i<=games;i++){const roll=r(),opponent=rivals[i%rivals.length];if(roll<.62+strength*.25){w++;matches.push({result:"W",score:`${1+Math.floor(r()*4)}-${Math.floor(r()*2)}`,opponent})}else if(roll<.84+strength*.1){d++;matches.push({result:"D",score:r()>.5?"1-1":"0-0",opponent});if(moments.length<3)moments.push(`MW ${i} · A stubborn draw stopped the streak.`)}else{l++;matches.push({result:"L",score:`${Math.floor(r()*2)}-${1+Math.floor(r()*3)}`,opponent});if(moments.length<3)moments.push(`MW ${i} · One counterattack, one brutal defeat.`)}}
    const pts=w*3+d,score=Math.min(99,Math.round(68+(w/games)*30+(l===0?3:0)));if(!moments.length)moments.push("Every challenger arrived. Every challenger left beaten.");
    const yourClub="Football Arcade XI";const competitorPoints=[pts,...rivals.map((_,i)=>Math.max(55,Math.min(games*3,Math.round(92-i*6+r()*8))))];const table=[yourClub,...rivals].map((club,i)=>({club,played:games,points:competitorPoints[i],highlight:i===0})).sort((a,b)=>b.points-a.points);
    const star=[...picks].sort((a,b)=>overall(b)-overall(a))[0];const awards=[w/games>.72?"Manager of the Year":"Tactical Innovator",`${star.name} · Player of the Year`,`${star.name} · ${Math.round(18+r()*17)} league goals`,l===0?"Golden Invincibles Trophy":"Supporters’ Shield"];
    return {title:l===0&&d===0?"PERFECT. Every match won.":l===0?"Invincible — but not perfect.":`${w} wins. The impossible got close.`,score,grade:grade(score),story:`Your five-player spine turned ${league} into a season-long stress test.`,stats:[{label:"Record",value:`${w}-${d}-${l}`},{label:"Points",value:String(pts)},{label:"Position",value:`#${table.findIndex(t=>t.highlight)+1}`},{label:"Gap",value:table[0].highlight?`+${table[0].points-(table[1]?.points||0)}`:`-${table[0].points-pts}`}],badges:[l===0?"Invincible":"Heavyweight",pts>=100?"Centurions":"European places",w/games>.85?"Best attack":"Big moments"],detail:moments,matches,table,awards};
  }
  const vals=picks.map(p=>p.value||70), weights=position==="ATT"?[.18,.27,.16,.2,.04,.15]:position==="MID"?[.13,.1,.27,.22,.13,.15]:position==="DEF"?[.14,.04,.16,.12,.31,.23]:[.09,.03,.2,.08,.36,.24];
  const ov=Math.round(vals.reduce((s,v,i)=>s+v*weights[i],0));const apps=Math.round(29+r()*9),goals=position==="ATT"?Math.round((ov-65)*.7+r()*8):position==="MID"?Math.round((ov-68)*.28+r()*5):Math.round(r()*4),assists=Math.round((vals[2]-60)*.25+r()*5),score=Math.min(99,ov+Math.round(r()*5));
  const top=A[vals.indexOf(Math.max(...vals))], low=A[vals.indexOf(Math.min(...vals))];
  return {title:`A ${score}-rated breakout season.`,score,grade:grade(score),story:`Built around elite ${top.toLowerCase()}, your creation played with a clear identity — and opponents noticed.`,stats:[{label:"Appearances",value:String(apps)},{label:"Goals",value:String(goals)},{label:"Assists",value:String(assists)},{label:"Avg. rating",value:(6.4+(score-65)/20).toFixed(2)}],badges:[score>91?"Player of the year":"Breakout star",goals>20?"Golden boot":"Fan favourite",`€${Math.max(18,(score-62)*5)}m value`],detail:[`${top} became the signature weapon.`,`${low} remained the clearest weakness.`,score>88?"The season ended with silverware and individual honours.":"A strong first season left room for a defining second act."]};
}

function Mark(){return <span className="mark" aria-hidden="true"><i></i><i></i><i></i></span>}
function Header({go}: {go:(m:Mode)=>void}){return <header><button className="brand" onClick={()=>go("home")}><Mark/> FOOTBALL <b>ARCADE</b></button><nav><button onClick={()=>go("home")}>GAMES</button><button onClick={()=>go("about")}>THE MODEL</button></nav><span className="live"><i/> DAILY LIVE</span></header>}
function Home({go}:{go:(m:Mode)=>void}){const games:[Game,string,string,string][]=[["era","01","ERA XI","Build an impossible XI across 35 years of football."],["perfect","02","PERFECT SEASON","Five stars. One league. Zero room for dropped points."],["player","03","BUILD A PLAYER","Steal six elite attributes. Simulate the season."]];return <main className="home"><section className="hero"><div className="eyebrow">THREE GAMES · INFINITE IMPOSSIBILITIES</div><h1>FOOTBALL,<br/><em>REWRITTEN.</em></h1><p>Draft icons. Break the simulation. Share the proof.</p><button className="primary" onClick={()=>go("era")}>PLAY TODAY’S ERA XI <span>↗</span></button><div className="scroll">SCROLL TO CHOOSE <b>↓</b></div></section><section className="game-grid">{games.map(([id,num,title,copy])=><button key={id} className={`game-tile ${id}`} onClick={()=>go(id)}><span className="num">{num}</span><span className="mini-mark"><Mark/></span><h2>{title}</h2><p>{copy}</p><span className="play">PLAY NOW <b>↗</b></span></button>)}</section><section className="proof"><span>NO LOGIN</span><span>3–5 MINUTES</span><span>NEW DAILY SEED</span><span>SHAREABLE RESULTS</span></section></main>}
function Card({p,onPick,attribute,eraId,spinning}:{p:Pick;onPick?:()=>void;attribute?:string;eraId?:string;spinning?:boolean}){const val=attribute? p.attrs[A.indexOf(attribute)]:overall(p);return <button className={`player-card ${spinning?"spinning":""}`} onClick={onPick} disabled={!onPick||spinning} style={{"--accent":p.color} as React.CSSProperties}><div className="card-top"><span>{attribute||`${p.pos} · PEAK`}</span><b>{val}</b></div><div className="portrait"><span>{spinning?"?":p.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</span></div><div className="card-copy"><small>{p.era} · {p.nation}</small><h3>{spinning?"SEARCHING…":p.name}</h3><p>{p.club} · {p.league}</p>{eraId&&<div className="era-fit"><span>ERA FIT</span><b>{eraFit(p,eraId)}%</b></div>}</div>{attribute?<div className="attr-line"><strong>{attribute}</strong><span style={{width:`${Math.min(100,val)}%`}}/></div>:<div className="attribute-grid">{A.map((a,i)=><span key={a}><b>{p.attrs[i]}</b>{a}</span>)}</div>}</button>}
function slotPosition(slot:string):Pos {if(slot==="GK")return "GK";if(/WB|M/.test(slot))return "MID";if(/B$|CB/.test(slot))return "DEF";return "ATT"}
function Pitch({slots,picks,current,onSwap}:{slots:string[];picks:Pick[];current:number;onSwap?:(from:number,to:number)=>void}){return <div className="pitch"><div className="pitch-circle"/><div className="pitch-box top"/><div className="pitch-box bottom"/><div className="pitch-team">{(["ATT","MID","DEF","GK"] as Pos[]).map(line=><div className={`pitch-line line-${line.toLowerCase()}`} key={line}>{slots.map((slot,index)=>({slot,index})).filter(item=>slotPosition(item.slot)===line).map(({slot,index})=>{const picked=picks[index];return <div draggable={Boolean(picked&&onSwap)} onDragStart={e=>e.dataTransfer.setData("text/plain",String(index))} onDragOver={e=>onSwap&&e.preventDefault()} onDrop={e=>{e.preventDefault();onSwap?.(Number(e.dataTransfer.getData("text/plain")),index)}} className={`pitch-slot ${index===current?"active":""} ${picked?"filled":""}`} key={`${slot}-${index}`}><span>{picked?overall(picked):"+"}</span><b>{picked?picked.name:slot}</b>{picked&&<small>{picked.era} · DRAG TO MOVE</small>}</div>})}</div>)}</div></div>}
function GameView({game,go}:{game:Game;go:(m:Mode)=>void}){
  const [daily,setDaily]=useState(true),[nonce,setNonce]=useState(0),[picks,setPicks]=useState<Pick[]>([]),[result,setResult]=useState<Result|null>(null),[league,setLeague]=useState(leagues[0]),[position,setPosition]=useState<Pos>("ATT"),[formation,setFormation]=useState<typeof FORMATIONS[number]|null>(null),[selectedEra,setSelectedEra]=useState(""),[rerollUsed,setRerollUsed]=useState(false),[rerollNonce,setRerollNonce]=useState(0),[spinning,setSpinning]=useState(false);
  const seed=`${daily?dailySeed():"random-run"}-${game}-${nonce}-${league}-${position}-${selectedEra}`;
  const formationChoices=useMemo(()=>sample(FORMATIONS,3,seed+"formations"),[seed]);
  const slots=game==="era"?(formation?.slots||[]):game==="perfect"?PERFECT_SLOTS:A; const round=picks.length;const done=slots.length>0&&round>=slots.length;
  const needed:Pos|undefined=game==="era"?(slots[round]?slotPosition(slots[round]):undefined):game==="perfect"?(round===0?"GK":round===1?"DEF":round===2?"MID":round===3?"ATT":undefined):undefined;
  const options=useMemo(()=>{const available=PLAYERS.filter(p=>(!needed||p.pos===needed)&&!picks.some(x=>x.id===p.id));const chosen=game==="player"?sample(available,3,seed+round+rerollNonce):balancedPlayers(available,seed+round+rerollNonce);return chosen.map(p=>game==="player"?{...p,attribute:A[round],value:p.attrs[round]}:p)},[round,seed,needed,game,picks,rerollNonce]);
  function resetForChoice(){setPicks([]);setResult(null);setFormation(null);setSelectedEra("");setRerollUsed(false);setRerollNonce(0);setNonce(n=>n+1)}
  function pick(p:Pick){setPicks(x=>[...x,{...p,slot:slots[round]}])}
  function run(){const res=simulate(game,picks,seed,league,position,selectedEra);setResult(res);try{localStorage.setItem("football-arcade-last",JSON.stringify({game,picks,seed,league,position,res}))}catch{}}
  function restart(){setPicks([]);setResult(null);setFormation(null);setSelectedEra("");setRerollUsed(false);setRerollNonce(0);setNonce(n=>n+1)}
  function reroll(){if(rerollUsed)return;setSpinning(true);setRerollUsed(true);setTimeout(()=>{setRerollNonce(n=>n+1);setSpinning(false)},700)}
  function swapPlayers(from:number,to:number){if(from===to||!picks[from]||!picks[to])return;setPicks(current=>{const next=[...current];[next[from],next[to]]=[next[to],next[from]];return next})}
  async function share(){const url=new URL(location.href);url.searchParams.set("result",btoa(unescape(encodeURIComponent(JSON.stringify({game,result,picks:picks.map(p=>p.name)})))));history.replaceState({},"",url);const data={title:result?.title,text:`I scored ${result?.score} in ${game==="era"?"Era XI":game==="perfect"?"Perfect Season":"Build a Player"}. Beat that.`,url:url.href};if(navigator.share)await navigator.share(data);else await navigator.clipboard.writeText(url.href)}
  const title=game==="era"?"ERA XI":game==="perfect"?"PERFECT SEASON":"BUILD A PLAYER"; const copy=game==="era"?"Eleven picks. Thirty-five years. One immortal team.":game==="perfect"?"Draft the spine. Chase every point.":"Borrow six gifts. Create one superstar.";
  return <main className="game-page"><section className="game-head"><button className="back" onClick={()=>go("home")}>← ALL GAMES</button><div><span>FOOTBALL ARCADE / {game.toUpperCase()}</span><h1>{title}</h1><p>{copy}</p></div><button className={`daily-toggle ${daily?"on":""}`} onClick={()=>{setDaily(v=>!v);resetForChoice()}}><i/> {daily?"DAILY CHALLENGE":"RANDOM RUN"}</button></section>
  {game==="era"&&!selectedEra&&!result&&<section className="era-select"><span className="section-label">STEP 01 · CHOOSE THE WORLD</span><h2>WHAT KIND OF<br/>FOOTBALL WINS?</h2><div className="era-options">{ERAS.map(era=><button key={era.id} onClick={()=>setSelectedEra(era.id)}><span>{era.years}</span><strong>{era.label}</strong><h3>{era.title}</h3><p>{era.copy}</p><div>{era.traits.map(t=><i key={t}>{t}</i>)}</div></button>)}</div></section>}
  {game==="era"&&selectedEra&&!formation&&!result&&<section className="formation-select"><span className="section-label">STEP 02 · CHOOSE YOUR SHAPE · {ERAS.find(e=>e.id===selectedEra)?.label}</span><h2>THREE SYSTEMS.<br/>ONE WAY TO PLAY.</h2><div className="formation-options">{formationChoices.map(f=><button onClick={()=>setFormation(f)} key={f.name}><Pitch slots={f.slots} picks={[]} current={-1}/><strong>{f.name}</strong><small>{f.name==="4-3-3"?"WIDTH & CONTROL":f.name==="3-5-2"?"MIDFIELD OVERLOAD":f.name==="4-4-2"?"CLASSIC BALANCE":"TACTICAL FLEX"}</small></button>)}</div></section>}
  {game==="perfect"&&picks.length===0&&!result&&<div className="setup"><span>CHOOSE YOUR LEAGUE</span>{leagues.map(l=><button className={league===l?"active":""} onClick={()=>{setLeague(l);resetForChoice()}} key={l}>{l}</button>)}</div>}
  {game==="player"&&picks.length===0&&!result&&<div className="setup"><span>YOUR POSITION</span>{(["ATT","MID","DEF","GK"] as Pos[]).map(p=><button className={position===p?"active":""} onClick={()=>{setPosition(p);resetForChoice()}} key={p}>{p}</button>)}</div>}
  {!result&&slots.length>0&&<section className={`draft ${game==="era"?"pitch-draft":""}`}><div className="progress"><span>ROUND {Math.min(round+1,slots.length)} / {slots.length}</span><div>{slots.map((s,i)=><i className={i<round?"filled":i===round?"now":""} key={`${s}-${i}`}/>)}</div><b>{done?"SQUAD COMPLETE":game==="player"?`CHOOSE ${A[round]}`:`CHOOSE YOUR ${slots[round]}`}</b></div>{game==="era"&&!done?<div className="squad-builder"><div className="pitch-wrap"><span className="section-label">{formation?.name} · {ERAS.find(e=>e.id===selectedEra)?.label} · LIVE XI</span><Pitch slots={slots} picks={picks} current={round} onSwap={swapPlayers}/></div><div className="choice-panel"><div className="choice-heading"><span className="section-label">AVAILABLE {needed}S · PICK ONE</span><button className="reroll" disabled={rerollUsed||spinning} onClick={reroll}>{rerollUsed?"REROLL USED":"↻ ONE REROLL"}</button></div><div className="cards">{options.map(p=><Card key={p.id} p={p} eraId={selectedEra} spinning={spinning} onPick={()=>pick(p)}/>)}</div><p className="draft-note">Elite, cult hero or honest pro? Every roll has a ceiling—and every era changes the fit.</p></div></div>:!done?<div className="cards">{options.map(p=><Card key={p.id} p={p} attribute={game==="player"?A[round]:undefined} onPick={()=>pick(p)}/>)}</div>:<div className="ready">{game==="era"?<div className="final-pitch"><Pitch slots={slots} picks={picks} current={-1} onSwap={swapPlayers}/></div>:<div className="picked-strip">{picks.map(p=><div key={p.slot}><span>{p.slot}</span><b>{game==="player"?p.value:overall(p)}</b><small>{p.name}</small></div>)}</div>}<h2>{game==="perfect"?"CAN THEY WIN THEM ALL?":game==="era"?"YOUR XI IS READY.":"THE PLAYER IS BUILT."}</h2>{game==="era"&&<p className="swap-hint">Drag players on the pitch to swap roles before simulating.</p>}<button className="primary" onClick={run}>SIMULATE THE SEASON <span>↗</span></button></div>}</section>}
  {result&&<section className="result"><div className="result-score"><span>ARCADE SCORE</span><strong>{result.score}</strong><b>{result.grade}</b></div><div className="result-main"><span className="result-kicker">SIMULATION COMPLETE · SEED {seed.slice(0,10)}</span><h2>{result.title}</h2><p>{result.story}</p><div className="stats">{result.stats.map(s=><div key={s.label}><small>{s.label}</small><b>{s.value}</b></div>)}</div>{result.matches&&<section className="season-run"><div className="result-section-title"><span>THE RUN-IN</span><small>Hover a result for the score</small></div><div className="match-dots">{result.matches.map((m,i)=><span style={{animationDelay:`${i*35}ms`}} className={m.result.toLowerCase()} title={`MW ${i+1} · ${m.opponent} · ${m.score}`} key={i}>{m.result}</span>)}</div></section>}{result.table&&<section className="season-grid"><div><div className="result-section-title"><span>FINAL TABLE</span></div><table><thead><tr><th>#</th><th>CLUB</th><th>PL</th><th>PTS</th></tr></thead><tbody>{result.table.map((row,i)=><tr className={row.highlight?"you":""} key={row.club}><td>{i+1}</td><td>{row.club}</td><td>{row.played}</td><td><b>{row.points}</b></td></tr>)}</tbody></table></div><div><div className="result-section-title"><span>TROPHY CABINET</span></div><div className="awards">{result.awards?.map((award,i)=><div key={award}><span>{i===3?"🏆":"◆"}</span><b>{award}</b></div>)}</div></div></section>}<div className="badges">{result.badges.map(b=><span key={b}>◆ {b}</span>)}</div><ol>{result.detail.map((d,index)=><li key={d}><span>{String(index+1).padStart(2,"0")}</span>{d}</li>)}</ol><div className="actions"><button className="primary" onClick={share}>SHARE RESULT <span>↗</span></button><button className="secondary" onClick={restart}>PLAY AGAIN</button></div></div></section>}
  </main>
}
function About({go}:{go:(m:Mode)=>void}){return <main className="about"><button className="back" onClick={()=>go("home")}>← BACK TO ARCADE</button><span className="eyebrow">BEHIND THE NUMBERS</span><h1>THE MODEL IS<br/><em>HONESTLY UNREAL.</em></h1><p className="lead">Football Arcade is entertainment, not a verdict on history. Every result comes from a transparent, seeded simulation — never generative AI.</p><div className="method-grid"><article><b>01</b><h2>ORIGINAL RATINGS</h2><p>Our six attributes are independently balanced from performance, peak, longevity and positional context. They are not copied from a video game.</p></article><article><b>02</b><h2>ERA NORMALISATION</h2><p>Players are compared against the football of their own time before eras meet inside the simulation.</p></article><article><b>03</b><h2>REPEATABLE CHAOS</h2><p>A seeded probability engine makes every outcome reproducible. Same squad, same seed, same story.</p></article></div><aside><strong>THE SMALL PRINT</strong><p>Names and career facts identify players editorially. All marks, kits, badges and card visuals are original. Football Arcade is not affiliated with any player, club, league, federation or game publisher.</p></aside></main>}
export function FootballArcade(){const [mode,setMode]=useState<Mode>("home");useEffect(()=>{window.scrollTo({top:0,behavior:"smooth"})},[mode]);return <><Header go={setMode}/>{mode==="home"?<Home go={setMode}/>:mode==="about"?<About go={setMode}/>:<GameView key={mode} game={mode} go={setMode}/>}<footer><span>© 2026 FOOTBALL ARCADE</span><span>BUILT FOR THE WHAT-IFS.</span><button onClick={()=>setMode("about")}>METHODOLOGY & RIGHTS</button></footer></>}
