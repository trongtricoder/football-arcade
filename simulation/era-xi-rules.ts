export const ERA_XI_ERAS = ["80s", "90s", "00s", "10s", "20s"] as const;

export const ERA_XI_FORMATIONS: Record<string, string[]> = {
  "4-3-3 \u00b7 HOLDING": ["GK", "LB", "CB1", "CB2", "RB", "CM1", "DM", "CM2", "LW", "ST", "RW"],
  "4-3-3 \u00b7 FLAT": ["GK", "LB", "CB1", "CB2", "RB", "CM1", "CM2", "CM3", "LW", "ST", "RW"],
  "4-2-1-3": ["GK", "LB", "CB1", "CB2", "RB", "DM1", "DM2", "AM", "LW", "ST", "RW"],
  "3-4-3": ["GK", "CB1", "CB2", "CB3", "LM", "CM1", "CM2", "RM", "LW", "ST", "RW"],
  "4-4-2": ["GK", "LB", "CB1", "CB2", "RB", "LM", "CM1", "CM2", "RM", "ST1", "ST2"],
  "3-5-2": ["GK", "CB1", "CB2", "CB3", "LM", "CM1", "DM", "CM2", "RM", "ST1", "ST2"],
  "4-1-4-1": ["GK", "LB", "CB1", "CB2", "RB", "LM", "CM1", "DM", "CM2", "RM", "ST"],
  "3-4-2-1": ["GK", "CB1", "CB2", "CB3", "LM", "CM1", "CM2", "RM", "AM1", "AM2", "ST"],
  "5-3-2": ["GK", "LB", "CB1", "CB2", "CB3", "RB", "CM1", "CM2", "CM3", "ST1", "ST2"],
  "4-3-2-1": ["GK", "LB", "CB1", "CB2", "RB", "CM1", "CM2", "CM3", "AM1", "AM2", "ST"],
  "4-2-2-2": ["GK", "LB", "CB1", "CB2", "RB", "DM1", "DM2", "AM1", "AM2", "ST1", "ST2"],
  "3-4-1-2": ["GK", "CB1", "CB2", "CB3", "LM", "CM1", "CM2", "RM", "AM", "ST1", "ST2"],
  "5-2-3": ["GK", "LB", "CB1", "CB2", "CB3", "RB", "CM1", "CM2", "LW", "ST", "RW"],
};

export type EraXiRunRequest = {
  seed: string;
  era: string;
  formation: string;
  selections: Array<{ playerId: string; slot: string }>;
  managerName: string;
  league: string;
  seasonYear: number;
  clientDurationMs?: number;
};

function canonicalFormation(value: string) {
  return value.replace(/\u00c2\u00b7/g, "\u00b7");
}

export function validateEraXiRunRequest(request: unknown): asserts request is EraXiRunRequest {
  if (!request || typeof request !== "object") throw new Error("Invalid simulation request.");
  const value = request as Partial<EraXiRunRequest>;
  if (typeof value.seed !== "string" || !value.seed.trim() || value.seed.length > 200) throw new Error("Invalid seed.");
  if (!ERA_XI_ERAS.includes(value.era as (typeof ERA_XI_ERAS)[number])) throw new Error("Invalid Era XI era.");
  const formation = typeof value.formation === "string" ? canonicalFormation(value.formation) : "";
  if (!Object.prototype.hasOwnProperty.call(ERA_XI_FORMATIONS, formation)) throw new Error("Unknown formation.");
  if (typeof value.managerName !== "string" || !value.managerName.trim()) throw new Error("Invalid manager.");
  if (typeof value.league !== "string" || !value.league.trim()) throw new Error("Invalid league.");
  if (!Number.isInteger(value.seasonYear) || Number(value.seasonYear) < 1979 || Number(value.seasonYear) > 2026) throw new Error("Invalid historical season.");
  if (!Array.isArray(value.selections)) throw new Error("Invalid player selections.");
  if (value.selections.length !== 11) throw new Error("Era XI requires exactly 11 players.");
  if (value.selections.some((selection) => !selection || typeof selection.playerId !== "string" || !selection.playerId || typeof selection.slot !== "string" || !selection.slot)) throw new Error("Malformed player selection.");
  if (new Set(value.selections.map((selection) => selection.playerId)).size !== 11) throw new Error("Duplicate player selection.");
  if (new Set(value.selections.map((selection) => selection.slot)).size !== 11) throw new Error("Duplicate formation slot.");
  const submittedSlots = [...value.selections.map((selection) => selection.slot)].sort();
  const requiredSlots = [...ERA_XI_FORMATIONS[formation]].sort();
  if (submittedSlots.some((slot, index) => slot !== requiredSlots[index])) throw new Error("Selections do not match the chosen formation.");
}
