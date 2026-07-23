import { readFile } from "node:fs/promises";

const load = async (name) => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), "utf8"));
const [basePlayers, expansionPlayers, managers, seasons, overrides, balance] = await Promise.all([
  load("players.json"), load("player-expansion.json"), load("managers.json"), load("league-seasons.json"),
  load("player-overrides.json"), load("balance-config.json"),
]);
const players = [...basePlayers, ...expansionPlayers];

const errors = [];
const warnings = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };
const leagues = ["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"];
const eras = ["80s", "90s", "00s", "10s", "20s"];
const validPositions = new Set(["GK", "DEF", "MID", "ATT"]);
const identityAliases = new Map([
  ["juninho", "juninho pernambucano"],
]);
const normalizeIdentity = (name) => {
  const normalized = name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  return identityAliases.get(normalized) ?? normalized;
};
const normalizeEra = (era) => String(era).match(/\d+/g)?.join("-") ?? String(era);

const versionKeys = new Set();
for (const [index, player] of players.entries()) {
  const label = `players[${index}] ${player.name ?? "UNKNOWN"}`;
  assert(typeof player.name === "string" && player.name.length > 1, `${label}: missing name`);
  assert(validPositions.has(player.pos), `${label}: invalid position ${player.pos}`);
  assert(leagues.includes(player.league), `${label}: invalid league ${player.league}`);
  assert(Array.isArray(player.attrs) && player.attrs.length === 6, `${label}: requires six attributes`);
  player.attrs?.forEach((value, attr) => assert(Number.isFinite(value) && value >= 10 && value <= 101, `${label}: attribute ${attr} is ${value}`));
  assert(Array.isArray(player.activeYears) && player.activeYears.length === 2 && player.activeYears[0] <= player.activeYears[1], `${label}: invalid activeYears`);
  const key = `${normalizeIdentity(player.name)}|${normalizeEra(player.era)}|${player.league}|${player.club}`;
  assert(!versionKeys.has(key), `${label}: duplicate player version ${key}`);
  versionKeys.add(key);
  assert(player.club !== "Milan" && player.club !== "Inter", `${label}: ambiguous Milan club name ${player.club}`);
}

const playerNames = new Set(players.map(player => player.name));
for (const name of overrides.timeless) assert(playerNames.has(name), `Era Proof player is missing: ${name}`);
for (const [key, rating] of Object.entries(overrides.ratings)) {
  const separator = key.lastIndexOf("|");
  const name = key.slice(0, separator), era = key.slice(separator + 1);
  assert(players.some(player => player.name === name && player.era === era), `Rating override has no player version: ${key}`);
  assert(rating >= balance.ratingRange.minimum && rating <= balance.ratingRange.maximum, `Rating override outside range: ${key}=${rating}`);
}
for (const name of Object.keys(overrides.tags)) assert(playerNames.has(name), `Tagged player is missing: ${name}`);

const managerNames = new Set();
for (const manager of managers) {
  assert(!managerNames.has(manager.name), `Duplicate manager: ${manager.name}`);
  managerNames.add(manager.name);
  assert(["F", "D", "C", "B", "A", "S"].includes(manager.attack), `${manager.name}: invalid attack grade`);
  assert(["F", "D", "C", "B", "A", "S"].includes(manager.defence), `${manager.name}: invalid defence grade`);
  assert(["F", "D", "C", "B", "A", "S"].includes(manager.pressing), `${manager.name}: invalid pressing grade`);
  assert(manager.attackMod >= -0.05 && manager.attackMod <= 0.1, `${manager.name}: attack modifier outside safe range`);
  assert(manager.defenceMod >= -0.05 && manager.defenceMod <= 0.11, `${manager.name}: defence modifier outside safe range`);
}

const seasonKeys = new Set();
for (const season of seasons) {
  const key = `${season.era}|${season.league}|${season.year}`;
  assert(!seasonKeys.has(key), `Duplicate season: ${key}`);
  seasonKeys.add(key);
  assert(eras.includes(season.era), `${key}: invalid era`);
  assert(leagues.includes(season.league) || season.league === "English First Division", `${key}: invalid league`);
  assert(Array.isArray(season.teams) && season.teams.length >= 16 && season.teams.length <= 22, `${key}: invalid team count`);
  assert(new Set(season.teams).size === season.teams.length, `${key}: duplicate teams`);
  assert(season.teams.includes(season.replaceClub), `${key}: replacement club is not in teams`);
}
for (const era of eras) for (const league of leagues) {
  const covered = seasons.some(season => season.era === era && season.league === league) || (era === "80s" && league === "Premier League" && seasons.some(season => season.era === era && season.league === "English First Division"));
  assert(covered, `Missing historical destination: ${era} ${league}`);
  const decade = Number(era.slice(0, 2));
  const eligible = players.filter(player => player.league === league && Math.floor(Number(player.era.slice(0, 4)) / 10) * 10 % 100 === decade).length;
  warn(eligible >= 5, `Thin draft pool: ${era} ${league} has ${eligible}/5 eligible versions`);
}
assert(seasons.length === 230, `Expected 230 league seasons, found ${seasons.length}`);
for (let start = 1980; start <= 2025; start++) for (const league of leagues) {
  assert(seasons.some(season => season.year === start + 1 && season.league === league), `Missing ${start}-${String(start + 1).slice(-2)} ${league}`);
}

console.log(`Validated ${players.length} player versions, ${managers.length} managers and ${seasons.length} seasons.`);
for (const message of warnings) console.warn(`WARNING: ${message}`);
if (errors.length) {
  for (const message of errors) console.error(`ERROR: ${message}`);
  process.exitCode = 1;
} else {
  console.log(`Data validation passed with ${warnings.length} expansion warning(s).`);
}
