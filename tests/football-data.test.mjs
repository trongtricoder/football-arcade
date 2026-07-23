import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const load = async name => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), "utf8"));

test("football data remains versioned and covers every league-era combination", async () => {
  const [basePlayers, expansionPlayers, managers, seasons, overrides, balance, roles] = await Promise.all([
    load("players.json"), load("player-expansion.json"), load("managers.json"), load("league-seasons.json"),
    load("player-overrides.json"), load("balance-config.json"), load("player-roles.json"),
  ]);
  const players = [...basePlayers, ...expansionPlayers];
  assert.ok(players.length >= 200);
  assert.ok(managers.length >= 30);
  assert.equal(seasons.length, 230);
  assert.ok(overrides.version);
  assert.ok(balance.version);
  assert.equal(Object.keys(balance.overallWeights).length, 4);
  assert.ok(roles.version);
  const allowedRoles = new Set(["GK","LB","RB","CB","DM","CM","AM","LM","RM","CF","ST","RW","LW","RF","LF"]);
  assert.ok(Object.values(roles.roles).every(list => list.length > 0 && list.length <= 3 && list.every(role => allowedRoles.has(role))), "preferred positions must contain one to three valid roles");
  assert.ok(Object.values(roles.feet).every(foot => ["LEFT","RIGHT","BOTH"].includes(foot)), "preferred foot value is invalid");
  const playerNames = new Set(players.map(player => player.name));
  assert.ok(Object.keys(roles.roles).every(key => playerNames.has(key.split("|")[0])), "a preferred-position profile references an unknown player");
  assert.ok(Object.keys(roles.feet).every(key => playerNames.has(key.split("|")[0])), "a preferred-foot profile references an unknown player");
  assert.equal(players.filter(player => ["Juninho", "Juninho Pernambucano"].includes(player.name)).length, 1, "Juninho Pernambucano is duplicated under an alias");
  assert.ok(players.every(player => player.club !== "Milan" && player.club !== "Inter"), "Milan clubs must be explicitly named AC Milan or Inter Milan");
  for (const era of ["80s", "90s", "00s", "10s", "20s"]) {
    for (const league of ["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"]) {
      const present = seasons.some(season => season.era === era && season.league === league) || (era === "80s" && league === "Premier League" && seasons.some(season => season.era === era && season.league === "English First Division"));
      assert.ok(present, `${era} ${league} is missing`);
    }
  }
});

test("position utility tags do not inflate attributes", async () => {
  const overrides = await load("player-overrides.json");
  assert.ok(Object.values(overrides.tags).flat().includes("MULTI POSITION"));
  assert.ok(!Object.values(overrides.tags).flat().includes("5 STAR WEAK FOOT"));
});

test("rating overrides reference real versions and tier thresholds are ordered", async () => {
  const [basePlayers, expansionPlayers, overrides, balance] = await Promise.all([load("players.json"), load("player-expansion.json"), load("player-overrides.json"), load("balance-config.json")]);
  const players = [...basePlayers, ...expansionPlayers];
  for (const key of Object.keys(overrides.ratings)) {
    const separator = key.lastIndexOf("|");
    const name = key.slice(0, separator), era = key.slice(separator + 1);
    assert.ok(players.some(player => player.name === name && player.era === era), key);
  }
  const threshold = balance.tierThresholds;
  assert.ok(threshold.legend > threshold.superstar && threshold.superstar > threshold.star && threshold.star > threshold.pro);
});
