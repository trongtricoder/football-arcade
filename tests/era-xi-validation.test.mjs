import assert from "node:assert/strict";
import test from "node:test";
import { ERA_XI_FORMATIONS, validateEraXiRunRequest } from "../simulation/era-xi-rules.ts";

function validRequest(formation = "4-2-1-3") {
  return {
    seed: "release-regression-seed",
    era: "00s",
    formation,
    selections: ERA_XI_FORMATIONS[formation].map((slot, index) => ({ playerId: `player-${index}`, slot })),
    managerName: "Test Manager",
    league: "Premier League",
    seasonYear: 2005,
  };
}

test("every supported Era XI formation contains eleven unique slots and validates", () => {
  for (const [formation, slots] of Object.entries(ERA_XI_FORMATIONS)) {
    assert.equal(slots.length, 11, formation);
    assert.equal(new Set(slots).size, 11, formation);
    assert.doesNotThrow(() => validateEraXiRunRequest(validRequest(formation)));
  }
});

test("the validator accepts the legacy encoded formation separator", () => {
  const request = validRequest("4-3-3 · HOLDING");
  request.formation = "4-3-3 Â· HOLDING";
  assert.doesNotThrow(() => validateEraXiRunRequest(request));
});

test("invalid authoritative requests are rejected before simulation", () => {
  const cases = [
    [null, /Invalid simulation request/],
    [{ ...validRequest(), seed: "" }, /Invalid seed/],
    [{ ...validRequest(), seed: "x".repeat(201) }, /Invalid seed/],
    [{ ...validRequest(), era: "70s" }, /Invalid Era XI era/],
    [{ ...validRequest(), formation: "2-2-6" }, /Unknown formation/],
    [{ ...validRequest(), managerName: " " }, /Invalid manager/],
    [{ ...validRequest(), league: "" }, /Invalid league/],
    [{ ...validRequest(), seasonYear: 2027 }, /Invalid historical season/],
    [{ ...validRequest(), selections: validRequest().selections.slice(0, 10) }, /exactly 11/],
  ];
  for (const [request, expectation] of cases) assert.throws(() => validateEraXiRunRequest(request), expectation);
});

test("duplicates, malformed IDs, and incorrect slots are rejected", () => {
  const duplicatePlayer = validRequest();
  duplicatePlayer.selections[10].playerId = duplicatePlayer.selections[0].playerId;
  assert.throws(() => validateEraXiRunRequest(duplicatePlayer), /Duplicate player/);

  const duplicateSlot = validRequest();
  duplicateSlot.selections[10].slot = duplicateSlot.selections[0].slot;
  assert.throws(() => validateEraXiRunRequest(duplicateSlot), /Duplicate formation slot/);

  const wrongSlot = validRequest();
  wrongSlot.selections[10].slot = "BENCH";
  assert.throws(() => validateEraXiRunRequest(wrongSlot), /chosen formation/);

  const malformed = validRequest();
  malformed.selections[0].playerId = "";
  assert.throws(() => validateEraXiRunRequest(malformed), /Malformed player/);
});
