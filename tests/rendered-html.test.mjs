import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships all three playable game modes", async () => {
  const source = await readFile(new URL("app/football-arcade.tsx", root), "utf8");
  assert.match(source, /ERA XI/);
  assert.match(source, /FIVE-A-SIDE/);
  assert.match(source, /BUILD A PLAYER/);
  assert.match(source, /function simulate/);
  assert.match(source, /simulateCampaign/);
  assert.match(source, /POSITION FIT/);
  assert.match(source, /SQUAD POWER/);
  assert.match(source, /dailySeed/);
  assert.match(source, /navigator\.share/);
  assert.match(source, /const FORMATIONS/);
  assert.match(source, /4-2-1-3/);
  assert.match(source, /playerOverrides/);
  assert.match(source, /function Pitch/);
  assert.match(source, /const ERAS/);
  assert.match(source, /function eraFit/);
  assert.match(source, /ONE REROLL/);
  assert.match(source, /function swapPlayers/);
  assert.match(source, /matches,table,awards/);
  assert.match(source, /const COACHES/);
  assert.match(source, /const SEASONS/);
  assert.match(source, /function SeasonReplay/);
  assert.match(source, /function TeamReview/);
  assert.match(source, /Golden Glove/);
  assert.match(source, /function positionFit/);
  assert.match(source, /goalkeeperPenalty/);
  assert.match(source, /setPhaseSpin\("league"\)/);
  assert.match(source, /setPhaseSpin\("year"\)/);
  assert.match(source, /leagueRolling/);
  assert.match(source, /yearRolling/);
  assert.match(source, /result\.table&&revealFinal/);
  assert.match(source, /function squadTagBonus/);
  assert.match(source, /const PARTNERSHIPS/);
  assert.match(source, /DYNAMIC DUO/);
  assert.match(source, /DYNAMIC TRIO/);
  assert.match(source, /function clubChemistry/);
  assert.match(source, /REROLL LEAGUE/);
  assert.match(source, /REROLL ERA/);
  assert.match(source, /REROLL EVERYTHING/);
  assert.match(source, /if\(p\.timeless\)return 100/);
  assert.match(source, /rating>=95\?w\.elite95/);
  assert.match(source, /SEASON RESULTS/);
  assert.match(source, /CHOOSE A POSITION ON THE PITCH/);
  assert.match(source, /5-PLAYER ROSTER/);
  assert.match(source, /type Tier/);
  assert.match(source, /function tagTier/);
  assert.match(source, /TACTICAL LINK ACTIVATED/);
  assert.match(source, /natural\|\|open\[0\]/);
  assert.match(source, /setDrawPhase\("players"\)/);
  assert.match(source, /function slotSuitability/);
  assert.match(source, /function HelpModal/);
  assert.match(source, /ROLLING LEAGUE/);
});

test("removes starter preview metadata and presents the finished brand", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);
  assert.doesNotMatch(page + layout, /codex-preview|Starter Project|SkeletonPreview/);
  assert.match(layout, /Football Arcade/);
});
