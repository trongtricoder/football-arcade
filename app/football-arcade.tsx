"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "home" | "era" | "perfect" | "player" | "about";
type Game = Exclude<Mode, "home" | "about">;
type Pos = "GK" | "DEF" | "MID" | "ATT";
type Player = { id:string; name:string; pos:Pos; era:string; nation:string; club:string; league:string; attrs:number[]; color:string };
type Pick = Player & { slot?:string; attribute?:string; value?:number };
type Result = { title:string; score:number; grade:string; story:string; stats:{label:string;value:string}[]; badges:string[]; detail:string[] };

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

function hash(s:string){let h=2166136261; for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)} return h>>>0}
function rng(seed:string){let x=hash(seed)||1; return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
function sample<T>(items:T[], n:number, seed:string){const pool=[...items],r=rng(seed),out:T[]=[];while(pool.length&&out.length<n)out.push(pool.splice(Math.floor(r()*pool.length),1)[0]);return out}
const PEAK_RATINGS:Record<string,number>={"Lionel Messi":101,"Cristiano Ronaldo":99,"Ronaldo Nazário":99,"Zinedine Zidane":98,"Thierry Henry":98,"Ronaldinho":98,"Paolo Maldini":98,"Xavi":97,"Andrés Iniesta":97,"Manuel Neuer":97};
function overall(p:Player){
  if(PEAK_RATINGS[p.name]) return PEAK_RATINGS[p.name];
  const weights=p.pos==="ATT"?[.18,.25,.18,.24,.01,.14]:p.pos==="MID"?[.12,.12,.25,.21,.15,.15]:p.pos==="DEF"?[.13,.04,.14,.1,.34,.25]:[.06,.01,.2,.08,.4,.25];
  return Math.round(p.attrs.reduce((sum,value,index)=>sum+value*weights[index],0));
}
function dailySeed(){return new Date().toISOString().slice(0,10)}
function grade(score:number){return score>=95?"IMMORTAL":score>=88?"WORLD CLASS":score>=80?"CONTENDER":score>=70?"DANGEROUS":"CULT HEROES"}

function simulate(game:Game,picks:Pick[],seed:string,league:string,position:Pos):Result{
  const r=rng(seed+picks.map(p=>p.id+(p.value||"")).join(""));
  if(game==="era"){
    const avg=picks.reduce((s,p)=>s+overall(p),0)/picks.length;
    const nations=new Set(picks.map(p=>p.nation)).size, clubs=new Set(picks.map(p=>p.club)).size;
    const chemistry=Math.max(60,Math.round(98-nations*2-clubs+avg/7)); const score=Math.min(99,Math.round(avg*.72+chemistry*.28));
    const wins=Math.min(34,Math.round(18+(score-70)*.43+r()*4)), draws=Math.round(3+r()*6), losses=Math.max(0,38-wins-draws);
    const pts=wins*3+draws, gd=Math.round((score-68)*2.5+r()*16); const best=[...picks].sort((a,b)=>overall(b)-overall(a))[0];
    return {title:`${pts} points. A team out of time.`,score,grade:grade(score),story:`${best.name} became the heartbeat of a side that bent eras into one relentless identity.`,stats:[{label:"League",value:`${wins}W ${draws}D ${losses}L`},{label:"Points",value:String(pts)},{label:"Goal diff.",value:`+${gd}`},{label:"Cup",value:score>91?"Winners":score>83?"Final":"Semi-final"}],badges:[score>90?"League champions":"Title race",chemistry>82?"Era harmony":"Beautiful chaos",gd>60?"Goal machine":"Late drama"],detail:[`Chemistry settled at ${chemistry}/100.`,`${best.name} was named player of the season.`,losses===0?"The league campaign ended unbeaten.":`The dream cracked ${losses} time${losses===1?"":"s"}, but never quietly.`]};
  }
  if(game==="perfect"){
    const avg=picks.reduce((s,p)=>s+overall(p),0)/picks.length;const games=league==="Bundesliga"?34:38;const strength=(avg-72)/25;
    let w=0,d=0,l=0;const moments:string[]=[];for(let i=1;i<=games;i++){const roll=r();if(roll<.62+strength*.25)w++;else if(roll<.84+strength*.1){d++;if(moments.length<3)moments.push(`MW ${i} · A stubborn draw stopped the streak.`)}else{l++;if(moments.length<3)moments.push(`MW ${i} · One counterattack, one brutal defeat.`)}}
    const pts=w*3+d,score=Math.min(99,Math.round(68+(w/games)*30+(l===0?3:0)));if(!moments.length)moments.push("Every challenger arrived. Every challenger left beaten.");
    return {title:l===0&&d===0?"PERFECT. Every match won.":l===0?"Invincible — but not perfect.":`${w} wins. The impossible got close.`,score,grade:grade(score),story:`Your five-player spine turned ${league} into a season-long stress test.`,stats:[{label:"Record",value:`${w}-${d}-${l}`},{label:"Points",value:String(pts)},{label:"Win rate",value:`${Math.round(w/games*100)}%`},{label:"Streak",value:`${Math.max(7,Math.round(w/(d+l+1)))} matches`}],badges:[l===0?"Invincible":"Heavyweight",pts>=100?"Centurions":"Top four",w/games>.85?"Best attack":"Big moments"],detail:moments};
  }
  const vals=picks.map(p=>p.value||70), weights=position==="ATT"?[.18,.27,.16,.2,.04,.15]:position==="MID"?[.13,.1,.27,.22,.13,.15]:position==="DEF"?[.14,.04,.16,.12,.31,.23]:[.09,.03,.2,.08,.36,.24];
  const ov=Math.round(vals.reduce((s,v,i)=>s+v*weights[i],0));const apps=Math.round(29+r()*9),goals=position==="ATT"?Math.round((ov-65)*.7+r()*8):position==="MID"?Math.round((ov-68)*.28+r()*5):Math.round(r()*4),assists=Math.round((vals[2]-60)*.25+r()*5),score=Math.min(99,ov+Math.round(r()*5));
  const top=A[vals.indexOf(Math.max(...vals))], low=A[vals.indexOf(Math.min(...vals))];
  return {title:`A ${score}-rated breakout season.`,score,grade:grade(score),story:`Built around elite ${top.toLowerCase()}, your creation played with a clear identity — and opponents noticed.`,stats:[{label:"Appearances",value:String(apps)},{label:"Goals",value:String(goals)},{label:"Assists",value:String(assists)},{label:"Avg. rating",value:(6.4+(score-65)/20).toFixed(2)}],badges:[score>91?"Player of the year":"Breakout star",goals>20?"Golden boot":"Fan favourite",`€${Math.max(18,(score-62)*5)}m value`],detail:[`${top} became the signature weapon.`,`${low} remained the clearest weakness.`,score>88?"The season ended with silverware and individual honours.":"A strong first season left room for a defining second act."]};
}

function Mark(){return <span className="mark" aria-hidden="true"><i></i><i></i><i></i></span>}
function Header({go}: {go:(m:Mode)=>void}){return <header><button className="brand" onClick={()=>go("home")}><Mark/> FOOTBALL <b>ARCADE</b></button><nav><button onClick={()=>go("home")}>GAMES</button><button onClick={()=>go("about")}>THE MODEL</button></nav><span className="live"><i/> DAILY LIVE</span></header>}
function Home({go}:{go:(m:Mode)=>void}){const games:[Game,string,string,string][]=[["era","01","ERA XI","Build an impossible XI across 35 years of football."],["perfect","02","PERFECT SEASON","Five stars. One league. Zero room for dropped points."],["player","03","BUILD A PLAYER","Steal six elite attributes. Simulate the season."]];return <main className="home"><section className="hero"><div className="eyebrow">THREE GAMES · INFINITE IMPOSSIBILITIES</div><h1>FOOTBALL,<br/><em>REWRITTEN.</em></h1><p>Draft icons. Break the simulation. Share the proof.</p><button className="primary" onClick={()=>go("era")}>PLAY TODAY’S ERA XI <span>↗</span></button><div className="scroll">SCROLL TO CHOOSE <b>↓</b></div></section><section className="game-grid">{games.map(([id,num,title,copy])=><button key={id} className={`game-tile ${id}`} onClick={()=>go(id)}><span className="num">{num}</span><span className="mini-mark"><Mark/></span><h2>{title}</h2><p>{copy}</p><span className="play">PLAY NOW <b>↗</b></span></button>)}</section><section className="proof"><span>NO LOGIN</span><span>3–5 MINUTES</span><span>NEW DAILY SEED</span><span>SHAREABLE RESULTS</span></section></main>}
function Card({p,onPick,attribute}:{p:Pick;onPick?:()=>void;attribute?:string}){const val=attribute? p.attrs[A.indexOf(attribute)]:overall(p);return <button className="player-card" onClick={onPick} disabled={!onPick} style={{"--accent":p.color} as React.CSSProperties}><div className="card-top"><span>{attribute||`${p.pos} · PEAK`}</span><b>{val}</b></div><div className="portrait"><span>{p.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</span></div><div className="card-copy"><small>{p.era} · {p.nation}</small><h3>{p.name}</h3><p>{p.club} · {p.league}</p></div>{attribute?<div className="attr-line"><strong>{attribute}</strong><span style={{width:`${Math.min(100,val)}%`}}/></div>:<div className="attribute-grid">{A.map((a,i)=><span key={a}><b>{p.attrs[i]}</b>{a}</span>)}</div>}</button>}
function slotPosition(slot:string):Pos {if(slot==="GK")return "GK";if(/WB|M/.test(slot))return "MID";if(/B$|CB/.test(slot))return "DEF";return "ATT"}
function Pitch({slots,picks,current}:{slots:string[];picks:Pick[];current:number}){return <div className="pitch"><div className="pitch-circle"/><div className="pitch-box top"/><div className="pitch-box bottom"/><div className="pitch-team">{(["ATT","MID","DEF","GK"] as Pos[]).map(line=><div className={`pitch-line line-${line.toLowerCase()}`} key={line}>{slots.map((slot,index)=>({slot,index})).filter(item=>slotPosition(item.slot)===line).map(({slot,index})=>{const picked=picks[index];return <div className={`pitch-slot ${index===current?"active":""} ${picked?"filled":""}`} key={`${slot}-${index}`}><span>{picked?overall(picked):"+"}</span><b>{picked?picked.name:slot}</b>{picked&&<small>{picked.era}</small>}</div>})}</div>)}</div></div>}
function GameView({game,go}:{game:Game;go:(m:Mode)=>void}){
  const [daily,setDaily]=useState(true),[nonce,setNonce]=useState(0),[picks,setPicks]=useState<Pick[]>([]),[result,setResult]=useState<Result|null>(null),[league,setLeague]=useState(leagues[0]),[position,setPosition]=useState<Pos>("ATT"),[formation,setFormation]=useState<typeof FORMATIONS[number]|null>(null);
  const seed=`${daily?dailySeed():"random-run"}-${game}-${nonce}-${league}-${position}`;
  const formationChoices=useMemo(()=>sample(FORMATIONS,3,seed+"formations"),[seed]);
  const slots=game==="era"?(formation?.slots||[]):game==="perfect"?PERFECT_SLOTS:A; const round=picks.length;const done=slots.length>0&&round>=slots.length;
  const needed:Pos|undefined=game==="era"?(slots[round]?slotPosition(slots[round]):undefined):game==="perfect"?(round===0?"GK":round===1?"DEF":round===2?"MID":round===3?"ATT":undefined):undefined;
  const options=useMemo(()=>{const available=PLAYERS.filter(p=>(!needed||p.pos===needed)&&!picks.some(x=>x.id===p.id));return sample(available,3,seed+round).map(p=>game==="player"?{...p,attribute:A[round],value:p.attrs[round]}:p)},[round,seed,needed,game,picks]);
  function resetForChoice(){setPicks([]);setResult(null);setFormation(null);setNonce(n=>n+1)}
  function pick(p:Pick){setPicks(x=>[...x,{...p,slot:slots[round]}])}
  function run(){const res=simulate(game,picks,seed,league,position);setResult(res);try{localStorage.setItem("football-arcade-last",JSON.stringify({game,picks,seed,league,position,res}))}catch{}}
  function restart(){setPicks([]);setResult(null);setFormation(null);setNonce(n=>n+1)}
  async function share(){const url=new URL(location.href);url.searchParams.set("result",btoa(unescape(encodeURIComponent(JSON.stringify({game,result,picks:picks.map(p=>p.name)})))));history.replaceState({},"",url);const data={title:result?.title,text:`I scored ${result?.score} in ${game==="era"?"Era XI":game==="perfect"?"Perfect Season":"Build a Player"}. Beat that.`,url:url.href};if(navigator.share)await navigator.share(data);else await navigator.clipboard.writeText(url.href)}
  const title=game==="era"?"ERA XI":game==="perfect"?"PERFECT SEASON":"BUILD A PLAYER"; const copy=game==="era"?"Eleven picks. Thirty-five years. One immortal team.":game==="perfect"?"Draft the spine. Chase every point.":"Borrow six gifts. Create one superstar.";
  return <main className="game-page"><section className="game-head"><button className="back" onClick={()=>go("home")}>← ALL GAMES</button><div><span>FOOTBALL ARCADE / {game.toUpperCase()}</span><h1>{title}</h1><p>{copy}</p></div><button className={`daily-toggle ${daily?"on":""}`} onClick={()=>{setDaily(v=>!v);resetForChoice()}}><i/> {daily?"DAILY CHALLENGE":"RANDOM RUN"}</button></section>
  {game==="era"&&!formation&&!result&&<section className="formation-select"><span className="section-label">STEP 01 · CHOOSE YOUR SHAPE</span><h2>THREE SYSTEMS.<br/>ONE WAY TO PLAY.</h2><div className="formation-options">{formationChoices.map(f=><button onClick={()=>setFormation(f)} key={f.name}><Pitch slots={f.slots} picks={[]} current={-1}/><strong>{f.name}</strong><small>{f.name==="4-3-3"?"WIDTH & CONTROL":f.name==="3-5-2"?"MIDFIELD OVERLOAD":f.name==="4-4-2"?"CLASSIC BALANCE":"TACTICAL FLEX"}</small></button>)}</div></section>}
  {game==="perfect"&&picks.length===0&&!result&&<div className="setup"><span>CHOOSE YOUR LEAGUE</span>{leagues.map(l=><button className={league===l?"active":""} onClick={()=>{setLeague(l);resetForChoice()}} key={l}>{l}</button>)}</div>}
  {game==="player"&&picks.length===0&&!result&&<div className="setup"><span>YOUR POSITION</span>{(["ATT","MID","DEF","GK"] as Pos[]).map(p=><button className={position===p?"active":""} onClick={()=>{setPosition(p);resetForChoice()}} key={p}>{p}</button>)}</div>}
  {!result&&slots.length>0&&<section className={`draft ${game==="era"?"pitch-draft":""}`}><div className="progress"><span>ROUND {Math.min(round+1,slots.length)} / {slots.length}</span><div>{slots.map((s,i)=><i className={i<round?"filled":i===round?"now":""} key={`${s}-${i}`}/>)}</div><b>{done?"SQUAD COMPLETE":game==="player"?`CHOOSE ${A[round]}`:`CHOOSE YOUR ${slots[round]}`}</b></div>{game==="era"&&!done?<div className="squad-builder"><div className="pitch-wrap"><span className="section-label">{formation?.name} · LIVE XI</span><Pitch slots={slots} picks={picks} current={round}/></div><div className="choice-panel"><span className="section-label">AVAILABLE {needed}S · PICK ONE</span><div className="cards">{options.map(p=><Card key={p.id} p={p} onPick={()=>pick(p)}/>)}</div></div></div>:!done?<div className="cards">{options.map(p=><Card key={p.id} p={p} attribute={game==="player"?A[round]:undefined} onPick={()=>pick(p)}/>)}</div>:<div className="ready">{game==="era"?<div className="final-pitch"><Pitch slots={slots} picks={picks} current={-1}/></div>:<div className="picked-strip">{picks.map(p=><div key={p.slot}><span>{p.slot}</span><b>{game==="player"?p.value:overall(p)}</b><small>{p.name}</small></div>)}</div>}<h2>{game==="perfect"?"CAN THEY WIN THEM ALL?":game==="era"?"YOUR XI IS READY.":"THE PLAYER IS BUILT."}</h2><button className="primary" onClick={run}>SIMULATE THE SEASON <span>↗</span></button></div>}</section>}
  {result&&<section className="result"><div className="result-score"><span>ARCADE SCORE</span><strong>{result.score}</strong><b>{result.grade}</b></div><div className="result-main"><span className="result-kicker">SIMULATION COMPLETE · SEED {seed.slice(0,10)}</span><h2>{result.title}</h2><p>{result.story}</p><div className="stats">{result.stats.map(s=><div key={s.label}><small>{s.label}</small><b>{s.value}</b></div>)}</div><div className="badges">{result.badges.map(b=><span key={b}>◆ {b}</span>)}</div><ol>{result.detail.map((d,index)=><li key={d}><span>{String(index+1).padStart(2,"0")}</span>{d}</li>)}</ol><div className="actions"><button className="primary" onClick={share}>SHARE RESULT <span>↗</span></button><button className="secondary" onClick={restart}>PLAY AGAIN</button></div></div></section>}
  </main>
}
function About({go}:{go:(m:Mode)=>void}){return <main className="about"><button className="back" onClick={()=>go("home")}>← BACK TO ARCADE</button><span className="eyebrow">BEHIND THE NUMBERS</span><h1>THE MODEL IS<br/><em>HONESTLY UNREAL.</em></h1><p className="lead">Football Arcade is entertainment, not a verdict on history. Every result comes from a transparent, seeded simulation — never generative AI.</p><div className="method-grid"><article><b>01</b><h2>ORIGINAL RATINGS</h2><p>Our six attributes are independently balanced from performance, peak, longevity and positional context. They are not copied from a video game.</p></article><article><b>02</b><h2>ERA NORMALISATION</h2><p>Players are compared against the football of their own time before eras meet inside the simulation.</p></article><article><b>03</b><h2>REPEATABLE CHAOS</h2><p>A seeded probability engine makes every outcome reproducible. Same squad, same seed, same story.</p></article></div><aside><strong>THE SMALL PRINT</strong><p>Names and career facts identify players editorially. All marks, kits, badges and card visuals are original. Football Arcade is not affiliated with any player, club, league, federation or game publisher.</p></aside></main>}
export function FootballArcade(){const [mode,setMode]=useState<Mode>("home");useEffect(()=>{window.scrollTo({top:0,behavior:"smooth"})},[mode]);return <><Header go={setMode}/>{mode==="home"?<Home go={setMode}/>:mode==="about"?<About go={setMode}/>:<GameView key={mode} game={mode} go={setMode}/>}<footer><span>© 2026 FOOTBALL ARCADE</span><span>BUILT FOR THE WHAT-IFS.</span><button onClick={()=>setMode("about")}>METHODOLOGY & RIGHTS</button></footer></>}
