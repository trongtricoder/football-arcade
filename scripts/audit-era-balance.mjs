import { readFile } from "node:fs/promises";
import { simulateCampaign } from "../simulation/engine.ts";

const load = async (name) => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), "utf8"));
const [basePlayers, expansionPlayers, overrides, config] = await Promise.all([load("players.json"), load("player-expansion.json"), load("player-overrides.json"), load("balance-config.json")]);
const players = [...basePlayers, ...expansionPlayers];
const rating = player => overrides.ratings[`${player.name}|${player.era}`] ?? Math.round(player.attrs.reduce((total, value, index) => total + value * config.overallWeights[player.pos][index], 0));
const tier = value => value >= config.tierThresholds.legend ? "LEGEND" : value >= config.tierThresholds.superstar ? "SUPERSTAR" : value >= config.tierThresholds.star ? "STAR" : value >= config.tierThresholds.pro ? "PRO" : "CULT";
const groups = new Map();
const tiers = { LEGEND: 0, SUPERSTAR: 0, STAR: 0, PRO: 0, CULT: 0 };
const positions = new Map();

for (const player of players) {
  const startYear = Number(player.era.match(/\d{4}/)?.[0]), value = rating(player), decade = Number.isFinite(startYear) ? `${Math.floor(startYear / 10) * 10 % 100}`.padStart(2, "0") + "s" : "LEGACY";
  tiers[tier(value)]++;
  const group = `${decade}|${player.league}`;
  const values = groups.get(group) ?? [];
  values.push(value); groups.set(group, values);
  const pos = positions.get(player.pos) ?? [];
  pos.push(value); positions.set(player.pos, pos);
}

const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const opponents = Array.from({ length: 19 }, (_, index) => `Historical rival ${index + 1}`);
const seasonProfiles = {
  ordinary: { attack:77, defence:77, control:77, eraFit:88, positionFit:92, chemistry:0, managerAttack:0, managerDefence:0, cleanSheetBoost:0 },
  strong: { attack:86, defence:85, control:86, eraFit:95, positionFit:98, chemistry:4, managerAttack:.05, managerDefence:.05, cleanSheetBoost:.07 },
  elite: { attack:91, defence:90, control:91, eraFit:98, positionFit:99, chemistry:7, managerAttack:.08, managerDefence:.07, cleanSheetBoost:.1 },
  "95-99": { attack:97, defence:96, control:97, eraFit:100, positionFit:100, chemistry:10, managerAttack:.1, managerDefence:.1, cleanSheetBoost:.15 },
};
function seasonDistribution(profile, name, count = 10_000) {
  const seasons = [];
  let points = 0, losses = 0, unbeaten = 0, perfect = 0;
  for (let index = 0; index < count; index++) {
    const season = simulateCampaign(profile, { seed:`audit-${name}-${index}`, opponents });
    seasons.push(season.points); points += season.points; losses += season.losses;
    if (season.losses === 0) unbeaten++;
    if (season.wins === 38) perfect++;
  }
  seasons.sort((a, b) => a - b);
  return { points:points/count, losses:losses/count, p10:seasons[Math.floor(count*.1)], p50:seasons[Math.floor(count*.5)], p90:seasons[Math.floor(count*.9)], unbeaten:unbeaten/count, perfect:perfect/count };
}
console.log("ERA XI BALANCE AUDIT");
console.log(`Dataset version: ${overrides.version} / balance ${config.version}`);
console.log(`Player versions: ${players.length}`);
console.log("\nSeason distributions (10,000 seasons per squad)");
const distributions = Object.fromEntries(Object.entries(seasonProfiles).map(([name, profile]) => [name, seasonDistribution(profile, name)]));
for (const [name, result] of Object.entries(distributions)) {
  console.log(`${name.padEnd(9)} ${result.points.toFixed(1)} pts · ${result.losses.toFixed(2)} losses · P10/P50/P90 ${result.p10}/${result.p50}/${result.p90} · unbeaten ${(result.unbeaten*100).toFixed(2)}% · 38-0 ${(result.perfect*100).toFixed(3)}%`);
}
console.log("\nRarity distribution");
for (const [name, count] of Object.entries(tiers)) console.log(`${name.padEnd(10)} ${String(count).padStart(3)}  ${(count / players.length * 100).toFixed(1)}%`);
console.log("\nPosition averages");
for (const [name, values] of positions) console.log(`${name.padEnd(4)} ${average(values).toFixed(1)} OVR across ${values.length} versions`);
console.log("\nLeague-era pools");
for (const [name, values] of [...groups].sort()) console.log(`${name.padEnd(28)} ${String(values.length).padStart(3)} players · avg ${average(values).toFixed(1)} · range ${Math.min(...values)}-${Math.max(...values)}`);

const eliteShare = (tiers.LEGEND + tiers.SUPERSTAR) / players.length;
const failures = [];
if (eliteShare < 0.08 || eliteShare > 0.45) failures.push(`Elite share ${(eliteShare * 100).toFixed(1)}% is outside the 8-45% MVP band.`);
if (config.positionFit.goalkeeperPenalty > 65) failures.push("Goalkeeper out-of-position penalty is too forgiving.");
if (config.positionFit.outfieldPenalty > 85) failures.push("Outfield position penalty is too forgiving.");
if (Math.max(...players.flatMap(player => player.attrs)) > config.ratingRange.maximum) failures.push("An attribute exceeds the configured maximum.");
if (distributions.strong.losses < distributions.elite.losses + 2) failures.push("Elite squads do not lose materially fewer matches than strong squads.");
if (distributions.elite.losses < distributions["95-99"].losses + .7) failures.push("95-99 squads are not distinct from elite squads.");
if (distributions["95-99"].perfect === 0 || distributions["95-99"].perfect >= .01) failures.push("38-0 must remain possible but occur in fewer than 1% of 95-99 seasons.");
if (failures.length) {
  failures.forEach(message => console.error(`FAIL: ${message}`));
  process.exitCode = 1;
} else {
  console.log("\nBalance guardrails passed.");
}
