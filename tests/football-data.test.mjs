import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const load = async name => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), "utf8"));

test("football data remains versioned and covers every league-era combination", async () => {
  const [players, managers, seasons, overrides, balance] = await Promise.all([
    load("players.json"), load("managers.json"), load("league-seasons.json"),
    load("player-overrides.json"), load("balance-config.json"),
  ]);
  assert.ok(players.length >= 125);
  assert.ok(managers.length >= 30);
  assert.ok(overrides.version);
  assert.ok(balance.version);
  assert.equal(Object.keys(balance.overallWeights).length, 4);
  for (const era of ["80s", "90s", "00s", "10s", "20s"]) {
    for (const league of ["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"]) {
      const present = seasons.some(season => season.era === era && season.league === league) || (era === "80s" && league === "Premier League" && seasons.some(season => season.era === era && season.league === "English First Division"));
      assert.ok(present, `${era} ${league} is missing`);
    }
  }
});

test("rating overrides reference real versions and tier thresholds are ordered", async () => {
  const [players, overrides, balance] = await Promise.all([load("players.json"), load("player-overrides.json"), load("balance-config.json")]);
  for (const key of Object.keys(overrides.ratings)) {
    const separator = key.lastIndexOf("|");
    const name = key.slice(0, separator), era = key.slice(separator + 1);
    assert.ok(players.some(player => player.name === name && player.era === era), key);
  }
  const threshold = balance.tierThresholds;
  assert.ok(threshold.legend > threshold.superstar && threshold.superstar > threshold.star && threshold.star > threshold.pro);
});
