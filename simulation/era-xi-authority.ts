import playerData from "@/data/players.json";
import playerExpansion from "@/data/player-expansion.json";
import managerData from "@/data/managers.json";
import seasonData from "@/data/league-seasons.json";
import playerOverrides from "@/data/player-overrides.json";
import balanceConfig from "@/data/balance-config.json";
import playerRoles from "@/data/player-roles.json";
import { simulateCampaign } from "./engine";
import { createLeagueSchedule, simulateFullLeague } from "./league";
import { buildPlayerSeasonStats, getSeasonLeaders, type VerifiedPlayerSeasonStat } from "./player-season-stats";
import { validateEraXiRunRequest } from "./era-xi-rules";
import { canonicalClub } from "@/lib/club-names";

type PositionGroup = "GK" | "DEF" | "MID" | "ATT";
type Role =
  | "GK" | "LB" | "RB" | "CB" | "DM" | "CM" | "AM"
  | "LM" | "RM" | "CF" | "ST" | "RW" | "LW" | "RF" | "LF";
type ManagerGrade = "F" | "D" | "C" | "B" | "A" | "S";
type RawPlayer = {
  name: string;
  pos: PositionGroup;
  era: string;
  nation: string;
  club: string;
  league: string;
  attrs: number[];
  activeYears: number[];
};
type Player = RawPlayer & {
  id: string;
  tags: string[];
  timeless: boolean;
  roles: Role[];
};
type Coach = {
  name: string;
  attack: ManagerGrade;
  defence: ManagerGrade;
  pressing: ManagerGrade;
  tag: string;
};
type LeagueSeason = {
  era: string;
  league: string;
  year: number;
  replaceClub: string;
  teams: string[];
  story: string;
};
type Pick = Player & { slot: string };

const verifiedFormations: Record<string, string[]> = {
  "4-3-3 · HOLDING": ["GK", "LB", "CB1", "CB2", "RB", "CM1", "DM", "CM2", "LW", "ST", "RW"],
  "4-3-3 · FLAT": ["GK", "LB", "CB1", "CB2", "RB", "CM1", "CM2", "CM3", "LW", "ST", "RW"],
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

export type AuthoritativeEraXiResult = {
  score: number;
  grade: string;
  leaguePosition: number;
  leaguePoints: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  trophyCount: number;
  table: ReturnType<typeof simulateFullLeague>["table"];
  chemistryActivations: string[];
  averageEraFit: number;
  hasGoldClubCore: boolean;
  hasTrioPartnership: boolean;
  partnershipCount: number;
  managerDefenceGrade: ManagerGrade;
  managerTag: string;
  selectedPlayerLeagues: string[];
  maxCardTier: "CULT" | "PRO" | "STAR" | "SUPERSTAR" | "LEGEND";
  playerStats: VerifiedPlayerSeasonStat[];
  seasonLeaders: ReturnType<typeof getSeasonLeaders>;
};

const rawPlayers = [...playerData, ...playerExpansion] as RawPlayer[];
const timeless = new Set<string>(playerOverrides.timeless);
const specialTags = playerOverrides.tags as Record<string, string[]>;
const peakRatings = playerOverrides.ratings as Record<string, number>;
const roleOverrides = playerRoles.roles as Record<string, Role[]>;
const managerGradeModifier: Record<ManagerGrade, number> = {
  F: -.05,
  D: -.03,
  C: 0,
  B: .03,
  A: .05,
  S: .06,
};
const tagAttributes: Record<string, number[]> = {
  "PACE ABUSER": [0],
  "CHANNEL RUNNER": [0],
  "OVERLAPPING FULLBACK": [0],
  POACHER: [1],
  "GOAL THREAT": [1],
  "BOX MASTER": [1],
  "CLUTCH FINISHER": [1],
  "LONG SHOT SPECIALIST": [1],
  "CREATIVE PASSER": [2],
  "SET PIECE MASTER": [2],
  "SWEEPER KEEPER": [2],
  "WIDE CREATOR": [2],
  "TEMPO CONTROLLER": [2],
  "FALSE NINE": [2],
  MAESTRO: [2],
  "CROSSING SPECIALIST": [2],
  "DEEP-LYING PLAYMAKER": [2],
  "PRESS RESISTANT": [3],
  "CUT INSIDE": [3],
  SHOWMAN: [3],
  "ONE-ON-ONE KING": [3],
  "SHOT STOPPER": [4],
  "DEFENSIVE WALL": [4],
  LIBERO: [4],
  "BALL WINNER": [4],
  "COMMANDING KEEPER": [4],
  "PHYSICAL FORCE": [5],
  "AERIAL DOMINANCE": [5],
  "MIDFIELD ENGINE": [5],
  "TARGET FORWARD": [5],
  "PRESSING FORWARD": [5],
  "TOTAL FOOTBALLER": [0, 2, 3, 4, 5],
};
const utilityTags = new Set(["ERA PROOF", "MULTI POSITION"]);
const partnerships = [
  { name: "MSN", players: ["Lionel Messi", "Neymar", "Luis Suárez"], bonus: 5, attack: 4, control: 3, defence: 0 },
  { name: "UNITED WALL", players: ["Rio Ferdinand", "Nemanja Vidić"], bonus: 4, attack: 0, control: 1, defence: 5 },
  { name: "LA MASIA AXIS", players: ["Xavi", "Andrés Iniesta"], bonus: 3, attack: 1, control: 5, defence: 0 },
  { name: "ROBBERY", players: ["Franck Ribery", "Arjen Robben"], bonus: 4, attack: 4, control: 2, defence: 0 },
  { name: "FLYING DUTCHMEN", players: ["Ruud Gullit", "Frank Rijkaard", "Marco van Basten"], bonus: 5, attack: 3, control: 4, defence: 3 },
  { name: "BBC", players: ["Gareth Bale", "Cristiano Ronaldo", "Karim Benzema"], bonus: 5, attack: 5, control: 2, defence: 0 },
  { name: "ARGENTINA NUMBER 10s", players: ["Lionel Messi", "Diego Maradona"], bonus: 4, attack: 3, control: 4, defence: 0 },
  { name: "THE 3Rs", players: ["Ronaldinho", "Ronaldo Nazário", "Rivaldo"], bonus: 5, attack: 5, control: 3, defence: 0 },
  { name: "SONS OF SPEED", players: ["Thierry Henry", "Kylian Mbappé"], bonus: 3, attack: 4, control: 1, defence: 0 },
  { name: "ROSSONERI WALL", players: ["Paolo Maldini", "Franco Baresi"], bonus: 4, attack: 0, control: 2, defence: 5 },
  { name: "BRAZILIAN WINGS", players: ["Cafu", "Roberto Carlos"], bonus: 3, attack: 2, control: 2, defence: 3 },
  { name: "BARCELONA TRIANGLE", players: ["Lionel Messi", "Xavi", "Andrés Iniesta"], bonus: 5, attack: 3, control: 5, defence: 0 },
  { name: "FRENCH CONNECTION", players: ["Zinedine Zidane", "Thierry Henry"], bonus: 3, attack: 3, control: 3, defence: 0 },
  { name: "JUVENTUS BARRIER", players: ["Gianluigi Buffon", "Giorgio Chiellini"], bonus: 3, attack: 0, control: 1, defence: 5 },
] as const;

function lookup<T>(source: Record<string, T>, name: string, era: string) {
  return source[`${name}|${era}`] || source[name];
}

function isTimeless(name: string, era: string) {
  return timeless.has(`${name}|${era}`) || timeless.has(name);
}

function inferRoles(name: string, position: PositionGroup, era: string): Role[] {
  const explicit = lookup(roleOverrides, name, era);
  if (explicit) return explicit.slice(0, 3);
  if (position === "GK") return ["GK"];
  if (position === "DEF") return ["CB", "LB", "RB"];
  if (position === "MID") return ["CM", "DM", "AM"];
  return ["ST", "LW", "RW"];
}

function inferTags(player: RawPlayer) {
  const tags: string[] = [];
  if (player.attrs[0] >= 90) tags.push("PACE ABUSER");
  if (player.attrs[1] >= 90) tags.push(player.pos === "ATT" ? "POACHER" : "GOAL THREAT");
  if (player.attrs[2] >= 90) tags.push("CREATIVE PASSER");
  if (player.attrs[3] >= 94) tags.push("PRESS RESISTANT");
  if (player.attrs[4] >= 90) tags.push(player.pos === "GK" ? "SHOT STOPPER" : "DEFENSIVE WALL");
  if (player.attrs[5] >= 92) tags.push("PHYSICAL FORCE");
  if (isTimeless(player.name, player.era)) tags.unshift("ERA PROOF");
  return [...(lookup(specialTags, player.name, player.era) || []), ...tags].filter(
    (tag, index, all) => all.indexOf(tag) === index,
  );
}

const players: Player[] = rawPlayers.map((player, index) => ({
  ...player,
  id: `p${index}`,
  tags: inferTags(player),
  timeless: isTimeless(player.name, player.era),
  roles: inferRoles(player.name, player.pos, player.era),
}));

function overall(player: Player) {
  const override = peakRatings[`${player.name}|${player.era}`] ?? peakRatings[player.name];
  if (override) return override;
  const weights = balanceConfig.overallWeights[player.pos];
  return Math.round(
    player.attrs.reduce((sum, value, index) => sum + value * weights[index], 0),
  );
}

function eraFit(player: Player, era: string) {
  if (player.timeless) return 100;
  const starts: Record<string, number> = { "80s": 1980, "90s": 1990, "00s": 2000, "10s": 2010, "20s": 2020 };
  const targetStart = starts[era];
  if (!targetStart) throw new Error("Invalid Era XI era.");
  const targetEnd = targetStart + 9;
  const [careerStart, careerEnd] = player.activeYears;
  const gap = careerEnd < targetStart
    ? targetStart - careerEnd
    : careerStart > targetEnd
      ? careerStart - targetEnd
      : 0;
  const base = gap === 0 ? 100 : gap <= 5 ? 94 : gap <= 10 ? 89 : gap <= 20 ? 82 : 75;
  const styleBonus =
    era === "80s" ? (player.attrs[5] > 90 ? 2 : 0)
    : era === "90s" ? (player.attrs[3] > 90 ? 2 : 0)
    : era === "00s" ? (player.attrs[2] > 90 ? 2 : 0)
    : era === "10s" ? (player.attrs[0] > 90 ? 2 : 0)
    : player.attrs[2] > 90 ? 2 : 0;
  return Math.min(100, base + styleBonus);
}

function naturalRoles(position: PositionGroup): Role[] {
  if (position === "GK") return ["GK"];
  if (position === "DEF") return ["LB", "CB", "RB", "DM"];
  if (position === "MID") return ["LM", "CM", "RM", "AM", "DM"];
  return ["LW", "ST", "RW", "AM"];
}

function slotCode(slot: string): Role {
  return slot.replace(/\d+$/, "") as Role;
}

function positionFit(player: Player, slot: string) {
  const target = slotCode(slot);
  if (target === "GK") return player.pos === "GK" ? 100 : 50;
  if (player.pos === "GK") return 45;
  const playable = new Set([...naturalRoles(player.pos), ...player.roles]);
  if (playable.has(target)) return 100;
  if (player.pos === "ATT") return ["LM", "CM", "RM"].includes(target) ? 72 : 55;
  if (player.pos === "MID") return ["LW", "ST", "RW", "CF", "LF", "RF"].includes(target) ? 82 : 76;
  return ["LM", "CM", "RM", "AM"].includes(target) ? 70 : 55;
}

function effectiveRating(player: Player, slot: string, era: string) {
  return Math.min(
    101,
    Math.round(overall(player) * eraFit(player, era) / 100 * positionFit(player, slot) / 100),
  );
}

function tagTier(player: Player, tag: string) {
  if (utilityTags.has(tag) || tag === "TOTAL FOOTBALLER") return 1;
  const index = (tagAttributes[tag] || [5])[0];
  return player.attrs[index] >= 97 ? 1 : player.attrs[index] >= 92 ? 2 : 3;
}

function tagPoints(player: Player, tag: string) {
  if (utilityTags.has(tag)) return 0;
  return tagTier(player, tag) === 1 ? 3 : tagTier(player, tag) === 2 ? 2 : 1;
}

function tagLineBoost(player: Player, line: "attack" | "control" | "defence") {
  const boosts = player.attrs.map(() => 0);
  for (const tag of player.tags) {
    for (const index of tagAttributes[tag] || []) {
      boosts[index] = Math.max(boosts[index], tagPoints(player, tag));
    }
  }
  const weights = line === "attack"
    ? [.2, .4, .1, .2, 0, .1]
    : line === "control"
      ? [.05, .05, .35, .25, .15, .15]
      : [.1, 0, .1, .05, .45, .3];
  return boosts.reduce((sum, value, index) => sum + value * weights[index], 0);
}

function chemistry(picks: Pick[], coach: Coach) {
  const names = new Set(picks.map((pick) => pick.name));
  const clubCounts = new Map<string, number>();
  picks.forEach((pick) => {
    const club = canonicalClub(pick.club);
    clubCounts.set(club, (clubCounts.get(club) || 0) + 1);
  });

  let bonus = 0;
  let attack = 0;
  let control = 0;
  let defence = 0;
  const activated: string[] = [];

  for (const [club, count] of clubCounts) {
    const value = count >= 7 ? 3 : count >= 6 ? 2 : count >= 4 ? 1 : 0;
    if (value) {
      bonus += value;
      control += value;
      activated.push(`${club} ${value === 3 ? "Gold" : value === 2 ? "Silver" : "Bronze"} Core`);
    }
  }

  for (const partnership of partnerships) {
    if (partnership.players.every((name) => names.has(name))) {
      bonus += partnership.bonus;
      attack += partnership.attack;
      control += partnership.control;
      defence += partnership.defence;
      activated.push(partnership.name);
    }
  }

  const creators = picks.filter((pick) => pick.tags.includes("CREATIVE PASSER"));
  if (coach.attack === "S" && creators.length >= 2) {
    const value = Math.min(
      3,
      Math.round(
        creators.reduce((sum, player) => sum + tagPoints(player, "CREATIVE PASSER"), 0) / 2,
      ),
    );
    bonus += value;
    attack += value;
    control += value;
    activated.push("Creator's System");
  }

  const pressProof = picks.filter(
    (pick) => pick.tags.includes("PRESS RESISTANT") || pick.tags.includes("PHYSICAL FORCE"),
  );
  if (coach.pressing === "S" && pressProof.length >= 3) {
    bonus += 3;
    control += 3;
    defence += 1;
    activated.push("Press-Proof XI");
  }

  const walls = picks.filter(
    (pick) => pick.tags.includes("DEFENSIVE WALL") || pick.tags.includes("SHOT STOPPER"),
  );
  if (coach.defence === "S" && walls.length >= 2) {
    bonus += 3;
    defence += 4;
    activated.push("Fortress Unit");
  }

  return {
    bonus: Math.min(15, bonus),
    attack: Math.min(10, attack),
    control: Math.min(10, control),
    defence: Math.min(10, defence),
    activated,
  };
}

function grade(score: number) {
  if (score >= 95) return "IMMORTAL";
  if (score >= 88) return "WORLD CLASS";
  if (score >= 80) return "CONTENDER";
  if (score >= 70) return "DANGEROUS";
  return "CULT HEROES";
}

export function simulateAuthoritativeEraXi(
  request: EraXiRunRequest,
): AuthoritativeEraXiResult {
  validateEraXiRunRequest(request);
  if (!request || typeof request !== "object") throw new Error("Invalid simulation request.");
  if (typeof request.seed !== "string" || !request.seed.trim() || request.seed.length > 200) throw new Error("Invalid seed.");
  if (!Object.prototype.hasOwnProperty.call(verifiedFormations, request.formation)) throw new Error("Unknown formation.");
  if (!Array.isArray(request.selections)) throw new Error("Invalid player selections.");
  if (request.selections.length !== 11) throw new Error("Era XI requires exactly 11 players.");
  if (request.selections.some((selection) => !selection || typeof selection.playerId !== "string" || typeof selection.slot !== "string")) {
    throw new Error("Malformed player selection.");
  }
  if (new Set(request.selections.map((selection) => selection.playerId)).size !== 11) {
    throw new Error("Duplicate player selection.");
  }
  if (new Set(request.selections.map((selection) => selection.slot)).size !== 11) {
    throw new Error("Duplicate formation slot.");
  }
  const submittedSlots = [...request.selections.map((selection) => selection.slot)].sort();
  const requiredSlots = [...verifiedFormations[request.formation]].sort();
  if (submittedSlots.some((slot, index) => slot !== requiredSlots[index])) {
    throw new Error("Selections do not match the chosen formation.");
  }

  const coach = (managerData as Coach[]).find((item) => item.name === request.managerName);
  const season = (seasonData as LeagueSeason[]).find(
    (item) =>
      item.league === request.league
      && item.year === request.seasonYear
      && item.era === request.era,
  );
  if (!coach) throw new Error("Unknown manager.");
  if (!season) throw new Error("Unknown historical league season.");

  const picks = request.selections.map(({ playerId, slot }) => {
    const player = players.find((candidate) => candidate.id === playerId);
    if (!player) throw new Error("Unknown player selection.");
    return { ...player, slot };
  });

  const rated = picks.map((player) => ({
    player,
    rating: effectiveRating(player, player.slot, request.era),
    role: slotCode(player.slot),
  }));
  const average = rated.reduce((sum, player) => sum + player.rating, 0) / rated.length;
  const averageEraFit = Math.round(
    picks.reduce((sum, player) => sum + eraFit(player, request.era), 0) / picks.length,
  );
  const averagePositionFit = Math.round(
    picks.reduce((sum, player) => sum + positionFit(player, player.slot), 0) / picks.length,
  );
  const chemistryResult = chemistry(picks, coach);

  const lineAverage = (
    roles: Role[],
    dimension: "attack" | "control" | "defence",
  ) => {
    const line = rated.filter((player) => roles.includes(player.role));
    return line.length
      ? line.reduce(
          (sum, player) => sum + player.rating + tagLineBoost(player.player, dimension),
          0,
        ) / line.length
      : average;
  };

  const attackRating =
    lineAverage(["ST", "CF", "LW", "RW", "LF", "RF", "AM"], "attack")
    + chemistryResult.attack;
  const defenceRating =
    lineAverage(["GK", "LB", "RB", "CB", "DM"], "defence")
    + chemistryResult.defence;
  const controlRating =
    lineAverage(["CM", "DM", "AM", "LM", "RM"], "control")
    + chemistryResult.control
    + managerGradeModifier[coach.pressing] * 20;
  const chemistryScore = Math.min(100, 76 + chemistryResult.bonus * 2);
  const score = Math.min(
    101,
    Math.round(
      average * .57
      + chemistryScore * .12
      + averageEraFit * .13
      + averagePositionFit * .08
      + (attackRating + defenceRating) * .05
      + chemistryResult.bonus * .5,
    ),
  );

  const rivals = season.teams.filter((club) => club !== season.replaceClub);
  const leagueSpread: Record<string, number> = {
    "Premier League": 13,
    "La Liga": 17,
    "Serie A": 15,
    Bundesliga: 16,
    "Ligue 1": 18,
  };
  const strengths = Object.fromEntries(
    rivals.map((club) => {
      const rank = season.teams.indexOf(club);
      const spread = Math.max(1, season.teams.length - 1);
      const curve = Math.pow(rank / spread, .78);
      const elite = rank === 0 ? 2.5 : rank < 4 ? 1.2 : rank >= season.teams.length - 3 ? -1.2 : 0;
      return [club, 89 - curve * (leagueSpread[season.league] ?? 15) + elite];
    }),
  );
  const schedule = createLeagueSchedule(["Era XI", ...rivals]);
  const firstLegOpponents = schedule.slice(0, rivals.length).map((round) => {
    const fixture = round.find((match) => match.home === "Era XI" || match.away === "Era XI");
    if (!fixture) throw new Error("Historical schedule is incomplete.");
    return fixture.home === "Era XI" ? fixture.away : fixture.home;
  });
  const campaign = simulateCampaign(
    {
      attack: attackRating,
      defence: defenceRating,
      control: controlRating,
      eraFit: averageEraFit,
      positionFit: averagePositionFit,
      chemistry: chemistryResult.bonus,
      managerAttack: managerGradeModifier[coach.attack],
      managerDefence: managerGradeModifier[coach.defence],
      cleanSheetBoost: Math.max(0, managerGradeModifier[coach.defence] * 1.5),
    },
    {
      seed: request.seed + picks.map((pick) => pick.id + pick.slot).join(""),
      opponents: firstLegOpponents,
      opponentStrengths: strengths,
    },
  );
  const fullLeague = simulateFullLeague({
    schedule,
    userTeam: "Era XI",
    userScores: campaign.matches.map((match) => ({
      goalsFor: match.goalsFor,
      goalsAgainst: match.goalsAgainst,
    })),
    strengths,
    seed: `${request.seed}-full-league`,
  });
  const leaguePosition = fullLeague.table.findIndex((row) => row.highlight) + 1;
  const maximumOverall = Math.max(...picks.map(overall));
  const thresholds = balanceConfig.tierThresholds;
  const maxCardTier = maximumOverall >= thresholds.legend
    ? "LEGEND"
    : maximumOverall >= thresholds.superstar
      ? "SUPERSTAR"
      : maximumOverall >= thresholds.star
        ? "STAR"
        : maximumOverall >= thresholds.pro
          ? "PRO"
          : "CULT";
  const activePartnerships = partnerships.filter((partnership) =>
    partnership.players.every((name) => picks.some((pick) => pick.name === name)),
  );
  const playerStats = buildPlayerSeasonStats(
    rated.map(({ player, rating }) => ({ name: player.name, slot: player.slot, role: player.pos, realRating: rating, attributes: player.attrs })),
    campaign.goalsFor,
    campaign.cleanSheets,
  );
  const seasonLeaders = getSeasonLeaders(playerStats, coach.name, leaguePosition, campaign.cleanSheets);

  return {
    score,
    grade: grade(score),
    leaguePosition,
    leaguePoints: campaign.points,
    wins: campaign.wins,
    draws: campaign.draws,
    losses: campaign.losses,
    goalsFor: campaign.goalsFor,
    goalsAgainst: campaign.goalsAgainst,
    cleanSheets: campaign.cleanSheets,
    trophyCount: leaguePosition === 1 ? 1 : 0,
    table: fullLeague.table,
    chemistryActivations: chemistryResult.activated,
    averageEraFit,
    hasGoldClubCore: chemistryResult.activated.some((name) => name.endsWith("Gold Core")),
    hasTrioPartnership: activePartnerships.some((partnership) => partnership.players.length === 3),
    partnershipCount: activePartnerships.length,
    managerDefenceGrade: coach.defence,
    managerTag: coach.tag,
    selectedPlayerLeagues: picks.map((pick) => pick.league),
    maxCardTier,
    playerStats,
    seasonLeaders,
  };
}
