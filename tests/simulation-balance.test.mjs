import assert from "node:assert/strict";
import test from "node:test";
import { simulateCampaign } from "../simulation/engine.ts";
import { createLeagueSchedule, simulateFullLeague } from "../simulation/league.ts";

const opponents = Array.from({ length: 19 }, (_, index) => `Historical rival ${index + 1}`);
const ordinary = { attack:77, defence:77, control:77, eraFit:88, positionFit:92, chemistry:0, managerAttack:0, managerDefence:0, cleanSheetBoost:0 };
const strong = { attack:86, defence:85, control:86, eraFit:95, positionFit:98, chemistry:4, managerAttack:.05, managerDefence:.05, cleanSheetBoost:.07 };
const elite = { attack:91, defence:90, control:91, eraFit:98, positionFit:99, chemistry:7, managerAttack:.08, managerDefence:.07, cleanSheetBoost:.1 };
const superteam = { attack:97, defence:96, control:97, eraFit:100, positionFit:100, chemistry:10, managerAttack:.1, managerDefence:.1, cleanSheetBoost:.15 };

function cohort(profile, count, prefix, options = {}) {
  const total = { points:0, wins:0, losses:0, gf:0, ga:0, cleanSheets:0, perfect:0, unbeaten:0 };
  for (let index = 0; index < count; index++) {
    const result = simulateCampaign(profile, { seed:`${prefix}-${index}`, opponents, ...options });
    total.points += result.points;
    total.wins += result.wins;
    total.losses += result.losses;
    total.gf += result.goalsFor;
    total.ga += result.goalsAgainst;
    total.cleanSheets += result.cleanSheets;
    if (result.wins === 38) total.perfect++;
    if (result.losses === 0) total.unbeaten++;
  }
  return Object.fromEntries(Object.entries(total).map(([key, value]) => [key, ["perfect", "unbeaten"].includes(key) ? value : value / count]));
}

test("identical seeds and inputs always produce identical campaigns", () => {
  const first = simulateCampaign(strong, { seed:"deterministic-release-seed", opponents });
  const second = simulateCampaign(strong, { seed:"deterministic-release-seed", opponents });
  const different = simulateCampaign(strong, { seed:"another-release-seed", opponents });
  assert.deepEqual(second, first);
  assert.notDeepEqual(different, first);
  assert.deepEqual(
    { wins:first.wins, draws:first.draws, losses:first.losses, goalsFor:first.goalsFor, goalsAgainst:first.goalsAgainst, cleanSheets:first.cleanSheets, points:first.points },
    { wins:24, draws:6, losses:8, goalsFor:66, goalsAgainst:34, cleanSheets:15, points:78 },
  );
});

test("Monte Carlo seasons separate ordinary, strong, elite and 95-99 squads", () => {
  const ordinaryRun = cohort(ordinary, 20_000, "ordinary");
  const strongRun = cohort(strong, 20_000, "strong");
  const eliteRun = cohort(elite, 20_000, "elite");
  const superRun = cohort(superteam, 20_000, "super");

  assert.ok(ordinaryRun.points > 36 && ordinaryRun.points < 48, ordinaryRun);
  assert.ok(strongRun.points > 76 && strongRun.points < 90, strongRun);
  assert.ok(eliteRun.points > 91 && eliteRun.points < 101, eliteRun);
  assert.ok(superRun.points > 98 && superRun.points < 108, superRun);
  assert.ok(ordinaryRun.losses > strongRun.losses + 9, { ordinaryRun, strongRun });
  assert.ok(strongRun.losses > eliteRun.losses + 2, { strongRun, eliteRun });
  assert.ok(eliteRun.losses > superRun.losses + .7, { eliteRun, superRun });
  assert.equal(ordinaryRun.perfect, 0);
  assert.ok(superRun.perfect > 0 && superRun.perfect / 20_000 < .01, superRun);
  assert.ok(superRun.unbeaten / 20_000 > .08 && superRun.unbeaten / 20_000 < .3, superRun);
  assert.ok(ordinaryRun.gf < strongRun.gf && strongRun.gf < eliteRun.gf && eliteRun.gf < superRun.gf);
  assert.ok(ordinaryRun.ga > strongRun.ga && strongRun.ga > eliteRun.ga && eliteRun.ga > superRun.ga);
});

test("chemistry, manager, positional fit and era fit remain material", () => {
  const baseline = cohort(strong, 8_000, "modifier");
  const chemistry = cohort({ ...strong, chemistry:10 }, 8_000, "modifier");
  const wrongEra = cohort({ ...strong, eraFit:75 }, 8_000, "modifier");
  const wrongPositions = cohort({ ...strong, positionFit:80 }, 8_000, "modifier");
  const defensiveCoach = cohort({ ...strong, managerDefence:.1, cleanSheetBoost:.18 }, 8_000, "modifier");

  assert.ok(chemistry.points > baseline.points + 4, { baseline, chemistry });
  assert.ok(wrongEra.points < baseline.points - 3, { baseline, wrongEra });
  assert.ok(wrongPositions.points < baseline.points - 6, { baseline, wrongPositions });
  assert.ok(defensiveCoach.cleanSheets > baseline.cleanSheets + 1, { baseline, defensiveCoach });
  assert.ok(baseline.gf > 65 && baseline.gf < 90, baseline);
  assert.ok(baseline.cleanSheets > 13 && baseline.cleanSheets < 22, baseline);
});

test("opponent strength is deterministic and materially changes results", () => {
  const weak = Object.fromEntries(opponents.map(name => [name, 73]));
  const difficult = Object.fromEntries(opponents.map(name => [name, 89]));
  const weakRun = cohort(elite, 8_000, "strength", { opponentStrengths:weak });
  const difficultRun = cohort(elite, 8_000, "strength", { opponentStrengths:difficult });
  assert.ok(weakRun.points > difficultRun.points + 16, { weakRun, difficultRun });
  assert.ok(weakRun.losses + 3 < difficultRun.losses, { weakRun, difficultRun });
  const input = { seed:"mapped-strength", opponents, opponentStrengths:difficult };
  assert.deepEqual(simulateCampaign(elite, input), simulateCampaign(elite, input));
});

test("full league simulation conserves every fixture, goal and point", () => {
  const teams=["Era XI",...Array.from({length:19},(_,index)=>`Club ${index+1}`)],schedule=createLeagueSchedule(teams);
  const strengths=Object.fromEntries(teams.slice(1).map((club,index)=>[club,88-index*.8]));
  const userScores=schedule.map((_,index)=>({goalsFor:index%4===0?2:1,goalsAgainst:index%5===0?2:index%3===0?1:0}));
  const result=simulateFullLeague({schedule,userTeam:"Era XI",userScores,strengths,seed:"consistent-league"});
  assert.equal(schedule.length,38);
  assert.equal(result.timeline.length,38);
  assert.equal(result.table.length,20);
  assert.ok(result.table.every(row=>row.played===38&&row.wins+row.draws+row.losses===38));
  assert.equal(result.table.reduce((sum,row)=>sum+row.wins,0),result.table.reduce((sum,row)=>sum+row.losses,0));
  assert.equal(result.table.reduce((sum,row)=>sum+row.gf,0),result.table.reduce((sum,row)=>sum+row.ga,0));
  const draws=result.table.reduce((sum,row)=>sum+row.draws,0)/2,decided=380-draws;
  assert.equal(result.table.reduce((sum,row)=>sum+row.points,0),decided*3+draws*2);
  assert.ok(result.table[0].points<100&&result.table.at(-1).points<50,result.table);
});

test("identical full-league inputs produce identical tables and timelines", () => {
  const teams=["Era XI",...Array.from({length:19},(_,index)=>`Deterministic Club ${index+1}`)];
  const schedule=createLeagueSchedule(teams);
  const strengths=Object.fromEntries(teams.slice(1).map((club,index)=>[club,86-index*.6]));
  const userScores=schedule.map((_,index)=>({goalsFor:index%3,goalsAgainst:index%2}));
  const input={schedule,userTeam:"Era XI",userScores,strengths,seed:"deterministic-league"};
  assert.deepEqual(simulateFullLeague(input),simulateFullLeague(input));
});

test("five-a-side tour rewards quality, chemistry and positional discipline", () => {
  const fiveOpponents = Array.from({ length: 20 }, (_, index) => `Five rival ${index + 1}`);
  const run = (profile, prefix) => {
    const total = { points:0, gf:0, ga:0 };
    for (let index = 0; index < 5_000; index++) {
      const result = simulateCampaign(profile, { seed:`${prefix}-${index}`, opponents:fiveOpponents, format:"five" });
      total.points += result.points; total.gf += result.goalsFor; total.ga += result.goalsAgainst;
    }
    return Object.fromEntries(Object.entries(total).map(([key,value])=>[key,value/5_000]));
  };
  const loose = run({ attack:79, defence:76, control:77, eraFit:90, positionFit:82, chemistry:0, managerAttack:0, managerDefence:0, cleanSheetBoost:0 }, "five-loose");
  const balanced = run({ attack:87, defence:85, control:87, eraFit:96, positionFit:100, chemistry:5, managerAttack:0, managerDefence:0, cleanSheetBoost:0 }, "five-balanced");
  assert.ok(balanced.points > loose.points + 12, { loose, balanced });
  assert.ok(balanced.gf > loose.gf + 15, { loose, balanced });
  assert.ok(balanced.ga < loose.ga - 8, { loose, balanced });
});
