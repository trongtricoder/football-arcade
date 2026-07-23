export type LeagueFixture = { home:string; away:string };
export type LeagueRow = { club:string; played:number; wins:number; draws:number; losses:number; gf:number; ga:number; gd:number; points:number; highlight?:boolean };
export type UserMatchScore = { goalsFor:number; goalsAgainst:number };

const clamp = (minimum:number, maximum:number, value:number) => Math.max(minimum, Math.min(maximum, value));
function seededRandom(seed:string){let state=2166136261;for(const character of seed){state^=character.charCodeAt(0);state=Math.imul(state,16777619)}state>>>=0;if(!state)state=1;return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296}}

function poisson(mean:number, random:()=>number) {
  const limit = Math.exp(-mean);
  let product = 1, count = 0;
  do { count++; product *= random(); } while (product > limit && count < 10);
  return count - 1;
}

export function createLeagueSchedule(teams:string[]):LeagueFixture[][] {
  if (teams.length < 2 || teams.length % 2 !== 0) throw new Error("League schedule requires an even number of teams");
  let rotation = [...teams];
  const firstLeg:LeagueFixture[][] = [];
  for (let round = 0; round < teams.length - 1; round++) {
    const fixtures:LeagueFixture[] = [];
    for (let index = 0; index < teams.length / 2; index++) {
      const first = rotation[index], second = rotation[teams.length - 1 - index];
      const reverse = (round + index) % 2 === 1;
      fixtures.push(reverse ? { home:second, away:first } : { home:first, away:second });
    }
    firstLeg.push(fixtures);
    rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)];
  }
  return [...firstLeg, ...firstLeg.map(round => round.map(({home,away}) => ({home:away,away:home})))];
}

function sortedTable(rows:Map<string,LeagueRow>) {
  return [...rows.values()].map(row => ({...row, gd:row.gf-row.ga})).sort((a,b) => b.points-a.points || b.gd-a.gd || b.gf-a.gf || a.club.localeCompare(b.club));
}

export function simulateFullLeague({schedule,userTeam,userScores,strengths,seed}:{schedule:LeagueFixture[][];userTeam:string;userScores:UserMatchScore[];strengths:Record<string,number>;seed:string}) {
  if (schedule.length !== userScores.length) throw new Error("User score count must match the league schedule");
  const random = seededRandom(seed), clubs = [...new Set(schedule.flatMap(round => round.flatMap(match => [match.home,match.away])))];
  const rows = new Map(clubs.map(club => [club,{club,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,gd:0,points:0,highlight:club===userTeam}]));
  const timeline:LeagueRow[][] = [];

  schedule.forEach((round,roundIndex) => {
    round.forEach(({home,away}) => {
      let homeGoals:number, awayGoals:number;
      if (home === userTeam || away === userTeam) {
        const score = userScores[roundIndex];
        homeGoals = home === userTeam ? score.goalsFor : score.goalsAgainst;
        awayGoals = away === userTeam ? score.goalsFor : score.goalsAgainst;
      } else {
        const difference = (strengths[home] ?? 78) - (strengths[away] ?? 78);
        const homeExpected = clamp(.35,2.65,1.32 + difference/19 + .16);
        const awayExpected = clamp(.3,2.45,1.16 - difference/19);
        const swing = (random()-.5)*.3;
        homeGoals = poisson(homeExpected+swing,random);
        awayGoals = poisson(awayExpected-swing,random);
      }
      const homeRow=rows.get(home)!,awayRow=rows.get(away)!;
      homeRow.played++; awayRow.played++;
      homeRow.gf+=homeGoals; homeRow.ga+=awayGoals; awayRow.gf+=awayGoals; awayRow.ga+=homeGoals;
      if(homeGoals>awayGoals){homeRow.wins++;awayRow.losses++;homeRow.points+=3}
      else if(homeGoals<awayGoals){awayRow.wins++;homeRow.losses++;awayRow.points+=3}
      else{homeRow.draws++;awayRow.draws++;homeRow.points++;awayRow.points++}
    });
    timeline.push(sortedTable(rows));
  });
  return { table:sortedTable(rows), timeline };
}
