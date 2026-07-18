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
  assert.match(source, /dailySeed/);
  assert.match(source, /navigator\.share/);
  assert.match(source, /const FORMATIONS/);
  assert.match(source, /4-2-3-1/);
  assert.match(source, /Lionel Messi":101/);
  assert.match(source, /function Pitch/);
  assert.match(source, /const ERAS/);
  assert.match(source, /function eraFit/);
  assert.match(source, /ONE REROLL/);
  assert.match(source, /function swapPlayers/);
  assert.match(source, /matches,table,awards/);
  assert.match(source, /const COACHES/);
  assert.match(source, /const SEASONS/);
  assert.match(source, /function MatchTimeline/);
  assert.match(source, /function TeamReview/);
  assert.match(source, /Golden Glove/);
});

test("removes starter preview metadata and presents the finished brand", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);
  assert.doesNotMatch(page + layout, /codex-preview|Starter Project|SkeletonPreview/);
  assert.match(layout, /Football Arcade/);
});
