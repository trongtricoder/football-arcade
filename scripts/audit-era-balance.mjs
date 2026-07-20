import { readFile } from "node:fs/promises";

const load = async (name) => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), "utf8"));
const [players, overrides, config] = await Promise.all([load("players.json"), load("player-overrides.json"), load("balance-config.json")]);
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
console.log("ERA XI BALANCE AUDIT");
console.log(`Dataset version: ${overrides.version} / balance ${config.version}`);
console.log(`Player versions: ${players.length}`);
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
if (failures.length) {
  failures.forEach(message => console.error(`FAIL: ${message}`));
  process.exitCode = 1;
} else {
  console.log("\nBalance guardrails passed.");
}
