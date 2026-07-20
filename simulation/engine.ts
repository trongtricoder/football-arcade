export type CampaignProfile = {
  attack: number;
  defence: number;
  control: number;
  eraFit: number;
  positionFit: number;
  chemistry: number;
  managerAttack: number;
  managerDefence: number;
  cleanSheetBoost: number;
};

export type CampaignMatch = {
  result: "W" | "D" | "L";
  goalsFor: number;
  goalsAgainst: number;
  opponent: string;
  opponentStrength: number;
};

export type CampaignResult = {
  matches: CampaignMatch[];
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  points: number;
};

export type CampaignOptions = {
  seed: string;
  opponents: string[];
  format?: "league" | "five";
};

function hash(value: string) {
  let h = 2166136261;
  for (const character of value) {
    h ^= character.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed: string) {
  let state = hash(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

const clamp = (minimum: number, maximum: number, value: number) => Math.max(minimum, Math.min(maximum, value));

function poisson(mean: number, random: () => number) {
  const limit = Math.exp(-mean);
  let product = 1;
  let count = 0;
  do {
    count++;
    product *= random();
  } while (product > limit && count < 12);
  return count - 1;
}

export function performanceIndex(profile: CampaignProfile) {
  const core = profile.attack * .34 + profile.defence * .31 + profile.control * .2 + profile.eraFit * .09 + profile.positionFit * .06;
  return core + profile.chemistry * .42 + (profile.managerAttack + profile.managerDefence) * 18;
}

export function simulateCampaign(profile: CampaignProfile, options: CampaignOptions): CampaignResult {
  const random = seededRandom(options.seed);
  const format = options.format ?? "league";
  const fixtures = format === "league" ? [...options.opponents, ...options.opponents] : options.opponents;
  const matches: CampaignMatch[] = [];
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0, cleanSheets = 0;

  fixtures.forEach((opponent, index) => {
    const rank = index % Math.max(1, options.opponents.length);
    const opponentStrength = format === "five"
      ? 80 + (1 - rank / Math.max(1, options.opponents.length - 1)) * 9
      : 72 + (1 - rank / Math.max(1, options.opponents.length - 1)) * 19;
    const chemistryLift = profile.chemistry * .03;
    const eraDrag = Math.max(0, 94 - profile.eraFit) * .012;
    const positionDrag = Math.max(0, 96 - profile.positionFit) * .018;
    const scale = format === "five" ? 1.8 : 1;
    const expectedFor = clamp(.45, format === "five" ? 6.2 : 2.75,
      (1.5 + (profile.attack - opponentStrength) / 22 + (profile.control - opponentStrength) / 55 + chemistryLift + profile.managerAttack * 3.2 - eraDrag - positionDrag) * scale);
    const expectedAgainst = clamp(format === "five" ? .45 : .5, format === "five" ? 5.2 : 2.8,
      (1.2 - (profile.defence - opponentStrength) / 22 - profile.managerDefence * 3.1 - chemistryLift * .55 + positionDrag * .8 + eraDrag * .45) * scale);
    const matchSwing = (random() - .5) * (format === "five" ? .6 : .42);
    let gf = poisson(clamp(.3, 6.5, expectedFor + matchSwing), random);
    let ga = poisson(clamp(.25, 5.5, expectedAgainst - matchSwing), random);
    if (ga > 0 && random() < profile.cleanSheetBoost * .32) ga = Math.max(0, ga - 1);
    if (gf === ga && random() < clamp(0, .24, (profile.control - opponentStrength) / 65 + profile.chemistry * .006)) gf++;
    const result = gf > ga ? "W" : gf === ga ? "D" : "L";
    if (result === "W") wins++;
    else if (result === "D") draws++;
    else losses++;
    if (ga === 0) cleanSheets++;
    goalsFor += gf;
    goalsAgainst += ga;
    matches.push({ result, goalsFor: gf, goalsAgainst: ga, opponent, opponentStrength: Math.round(opponentStrength) });
  });
  return { matches, wins, draws, losses, goalsFor, goalsAgainst, cleanSheets, points: wins * 3 + draws };
}
