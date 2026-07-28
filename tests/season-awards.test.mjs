import assert from "node:assert/strict";
import test from "node:test";
import { buildEraXiSeasonAwards } from "../simulation/season-awards.ts";

function awards(overrides = {}) {
  return buildEraXiSeasonAwards({
    finish: 1,
    league: "Serie A",
    year: 1988,
    managerName: "Test Manager",
    seasonMvp: { name: "Test Star", goals: 22, averageRating: 7.72 },
    topScorer: { name: "Test Star", goals: 22, averageRating: 7.72 },
    keeperName: "Test Keeper",
    cleanSheets: 18,
    ...overrides,
  });
}

test("champions can receive the complete elite award set", () => {
  const result = awards();
  assert.ok(result.some((award) => award.includes("Manager of the Year")));
  assert.ok(result.some((award) => award.includes("Player of the Year")));
  assert.ok(result.some((award) => award.includes("Top Scorer")));
  assert.ok(result.some((award) => award.includes("Golden Glove")));
  assert.ok(result.some((award) => award.includes("Serie A Champions")));
});

test("a ninth-place team receives no global awards or European qualification", () => {
  const result = awards({
    finish: 9,
    seasonMvp: { name: "John Barnes", goals: 12, averageRating: 7.42 },
    topScorer: { name: "John Barnes", goals: 12, averageRating: 7.42 },
    cleanSheets: 12,
  });
  assert.deepEqual(result, ["John Barnes · Team MVP"]);
});

test("European qualification and tactical recognition require a strong finish", () => {
  const sixth = awards({ finish: 6, seasonMvp: { name: "Club Star", goals: 14, averageRating: 7.35 }, topScorer: { name: "Club Star", goals: 14, averageRating: 7.35 } });
  assert.ok(sixth.some((award) => award.includes("European Qualification")));
  assert.ok(!sixth.some((award) => award.includes("Tactical Award")));
  assert.ok(!sixth.some((award) => award.includes("Player of the Year")));

  const fourth = awards({ finish: 4, seasonMvp: { name: "Club Star", goals: 16, averageRating: 7.45 }, topScorer: { name: "Club Star", goals: 16, averageRating: 7.45 } });
  assert.ok(fourth.some((award) => award.includes("Tactical Award")));
  assert.ok(!fourth.some((award) => award.includes("Player of the Year")));
});

test("individual awards require award-level statistics", () => {
  const result = awards({ finish: 2, seasonMvp: { name: "Good Player", goals: 14, averageRating: 7.39 }, topScorer: { name: "Good Player", goals: 17, averageRating: 7.39 }, cleanSheets: 14 });
  assert.ok(!result.some((award) => award.includes("Player of the Year")));
  assert.ok(!result.some((award) => award.includes("Top Scorer")));
  assert.ok(!result.some((award) => award.includes("Golden Glove")));
  assert.ok(result.some((award) => award.includes("Team MVP")));
});
