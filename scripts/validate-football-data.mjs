import { readFile } from "node:fs/promises";

const load = async (name) => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), "utf8"));
const [basePlayers, expansionPlayers, managers, seasons, overrides, balance, roles, clubNames] = await Promise.all([
  load("players.json"), load("player-expansion.json"), load("managers.json"), load("league-seasons.json"),
  load("player-overrides.json"), load("balance-config.json"), load("player-roles.json"), load("club-names.json"),
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
const eraBounds = (era) => {
  const years = String(era).match(/\d{4}|\d{2}/g);
  if (!years || years.length < 2 || years[0].length !== 4) return null;
  const start = Number(years[0]);
  const end = years[1].length === 4 ? Number(years[1]) : Math.floor(start / 100) * 100 + Number(years[1]);
  return [start, end];
};
const genericClubNames = new Set(["bilbao", "blackburn", "bremen", "brighton", "dortmund", "gladbach", "leicester", "london", "madrid", "manchester", "milan", "munich", "naples", "newcastle", "paris", "rome", "swansea", "turin"]);
const canonicalClubs = new Set(Object.keys(clubNames.clubs));
const clubAliases = new Set(Object.keys(clubNames.aliases));
for (const [alias, canonical] of Object.entries(clubNames.aliases)) {
  assert(canonicalClubs.has(canonical), `Club alias ${alias} points to unknown club ${canonical}`);
  assert(alias !== canonical, `Club alias redundantly maps ${alias} to itself`);
}

const versionKeys = new Set();
for (const [index, player] of players.entries()) {
  const label = `players[${index}] ${player.name ?? "UNKNOWN"}`;
  assert(typeof player.name === "string" && player.name.length > 1, `${label}: missing name`);
  assert(validPositions.has(player.pos), `${label}: invalid position ${player.pos}`);
  assert(leagues.includes(player.league), `${label}: invalid league ${player.league}`);
  assert(Array.isArray(player.attrs) && player.attrs.length === 6, `${label}: requires six attributes`);
  player.attrs?.forEach((value, attr) => assert(Number.isFinite(value) && value >= 10 && value <= 101, `${label}: attribute ${attr} is ${value}`));
  assert(Array.isArray(player.activeYears) && player.activeYears.length === 2 && player.activeYears[0] <= player.activeYears[1], `${label}: invalid activeYears`);
  const bounds = eraBounds(player.era);
  if (bounds && Array.isArray(player.activeYears) && player.activeYears.length === 2) {
    assert(player.activeYears[1] >= bounds[0] && player.activeYears[0] <= bounds[1], `${label}: activeYears ${player.activeYears.join("-")} do not overlap era ${player.era}`);
  }
  const key = `${normalizeIdentity(player.name)}|${normalizeEra(player.era)}|${player.league}|${player.club}`;
  assert(!versionKeys.has(key), `${label}: duplicate player version ${key}`);
  versionKeys.add(key);
  assert(!genericClubNames.has(player.club.toLowerCase()), `${label}: generic city/geographic club placeholder ${player.club}`);
  assert(canonicalClubs.has(player.club), `${label}: unknown canonical club ${player.club}`);
  assert(!clubAliases.has(player.club), `${label}: club alias must be stored canonically: ${player.club}`);
  assert(clubNames.clubs[player.club] === player.league, `${label}: ${player.club} belongs to ${clubNames.clubs[player.club] ?? "an unknown league"}, not ${player.league}`);
}

const playerNames = new Set(players.map(player => player.name));
const versionExists = (key) => {
  const separator = key.lastIndexOf("|");
  if (separator < 0) return playerNames.has(key);
  const name = key.slice(0, separator), era = key.slice(separator + 1);
  return players.some(player => player.name === name && player.era === era);
};
for (const key of overrides.timeless) assert(versionExists(key), `Era Proof player/version is missing: ${key}`);
for (const [key, rating] of Object.entries(overrides.ratings)) {
  const separator = key.lastIndexOf("|");
  const name = key.slice(0, separator), era = key.slice(separator + 1);
  assert(players.some(player => player.name === name && player.era === era), `Rating override has no player version: ${key}`);
  assert(rating >= balance.ratingRange.minimum && rating <= balance.ratingRange.maximum, `Rating override outside range: ${key}=${rating}`);
}
for (const [key, tags] of Object.entries(overrides.tags)) {
  assert(versionExists(key), `Tagged player/version is missing: ${key}`);
  assert(Array.isArray(tags) && tags.length > 0 && tags.every(tag => typeof tag === "string" && tag.length > 0), `Invalid tag profile: ${key}`);
}
for (const section of [roles.roles, roles.feet]) for (const key of Object.keys(section)) {
  assert(versionExists(key), `Player-role profile references an unknown player/version: ${key}`);
}
const validRoles = new Set(["GK","LB","RB","CB","DM","CM","AM","LM","RM","CF","ST","RW","LW","RF","LF"]);
for (const [key, positions] of Object.entries(roles.roles)) {
  assert(Array.isArray(positions) && positions.length > 0 && positions.length <= 3, `${key}: requires one to three playable positions`);
  assert(positions?.every(position => validRoles.has(position)), `${key}: contains an invalid playable position`);
}

const rating = player => overrides.ratings[`${player.name}|${player.era}`] ?? Math.round(player.attrs.reduce((total, value, index) => total + value * balance.overallWeights[player.pos][index], 0));
for (const [name, versions] of Map.groupBy(players, player => normalizeIdentity(player.name))) {
  if (versions.length < 2) continue;
  const chronological = [...versions].sort((a, b) => (eraBounds(a.era)?.[0] ?? 0) - (eraBounds(b.era)?.[0] ?? 0));
  for (let index = 0; index < chronological.length; index++) for (let other = index + 1; other < chronological.length; other++) {
    const a = chronological[index], b = chronological[other];
    const overlaps = a.activeYears[0] <= b.activeYears[1] && b.activeYears[0] <= a.activeYears[1];
    const identical = a.pos === b.pos && a.club === b.club && a.league === b.league && a.attrs.join(",") === b.attrs.join(",") && rating(a) === rating(b);
    assert(!(overlaps && identical), `${name}: overlapping functionally identical versions ${a.era} and ${b.era}`);
  }
  for (let index = 1; index < chronological.length; index++) {
    const previous = chronological[index - 1], current = chronological[index];
    warn(!(rating(previous) === rating(current) && previous.attrs.join(",") === current.attrs.join(",")), `${name}: consecutive versions have no rating or attribute progression`);
    warn(Math.abs(rating(current) - rating(previous)) <= 20, `${name}: rating progression ${rating(previous)} to ${rating(current)} needs manual chronology review`);
  }
}

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
