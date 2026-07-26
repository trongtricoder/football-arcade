export type SeasonStatInput = {
  name: string;
  slot: string;
  role: string;
  realRating: number | null;
  attributes: number[];
};

export type VerifiedPlayerSeasonStat = {
  name: string;
  slot: string;
  goals: number;
  assists: number;
  averageRating: number;
};

function role(slot: string) { return slot.replace(/\d+$/, ""); }

function distribute(weights: number[], total: number) {
  const safe = weights.map((value) => Math.max(0.001, value));
  const sum = safe.reduce((a, b) => a + b, 0);
  const exact = safe.map((value) => value / sum * total);
  const result = exact.map(Math.floor);
  let remaining = total - result.reduce((a, b) => a + b, 0);
  exact.map((value, index) => ({ index, fraction: value - result[index] }))
    .sort((a, b) => b.fraction - a.fraction)
    .slice(0, remaining)
    .forEach(({ index }) => { result[index] += 1; remaining -= 1; });
  return result;
}

export function buildPlayerSeasonStats(players: SeasonStatInput[], goalsFor: number, cleanSheets: number) {
  const goalWeights = players.map((player) => {
    const position = role(player.slot);
    const multiplier = ["ST", "CF", "LW", "RW", "LF", "RF"].includes(position) ? .38
      : position === "AM" ? .23
        : ["CM", "LM", "RM"].includes(position) ? .11
          : ["LB", "RB", "DM"].includes(position) ? .035
            : position === "GK" ? .001 : .018;
    return multiplier * ((player.realRating || 60) * .62 + (player.attributes[1] || 40) * .38);
  });
  const assistWeights = players.map((player) => {
    const position = role(player.slot);
    const multiplier = ["AM", "LW", "RW", "LM", "RM"].includes(position) ? .27
      : ["CM", "DM"].includes(position) ? .2
        : ["LB", "RB"].includes(position) ? .11
          : ["ST", "CF", "LF", "RF"].includes(position) ? .09
            : position === "GK" ? .008 : .025;
    return multiplier * ((player.attributes[2] || 40) * .72 + (player.realRating || 60) * .28);
  });
  const goals = distribute(goalWeights, Math.max(0, goalsFor));
  const assists = distribute(assistWeights, Math.max(0, Math.round(goalsFor * .72)));
  return players.map((player, index) => {
    const position = role(player.slot);
    const defensiveCredit = ["GK", "LB", "RB", "CB", "DM"].includes(position) ? cleanSheets * .018 : 0;
    const averageRating = Math.min(10, 5.75 + ((player.realRating || 60) - 60) / 24 + goals[index] * .014 + assists[index] * .012 + defensiveCredit);
    return { name: player.name, slot: player.slot, goals: goals[index], assists: assists[index], averageRating: Number(averageRating.toFixed(2)) };
  });
}

export function getSeasonLeaders(stats: VerifiedPlayerSeasonStat[], manager: string, finish: number, cleanSheets: number) {
  const topScorer = [...stats].sort((a, b) => b.goals - a.goals || b.averageRating - a.averageRating)[0];
  const topAssister = [...stats].sort((a, b) => b.assists - a.assists || b.averageRating - a.averageRating)[0];
  const bestPlayer = [...stats].sort((a, b) => b.averageRating - a.averageRating || b.goals + b.assists - a.goals - a.assists)[0];
  const keeper = stats.find((player) => role(player.slot) === "GK");
  return {
    topScorer: topScorer ? `${topScorer.name} · ${topScorer.goals} goals` : "—",
    topAssister: topAssister ? `${topAssister.name} · ${topAssister.assists} assists` : "—",
    bestPlayer: bestPlayer ? `${bestPlayer.name} · ${bestPlayer.averageRating.toFixed(2)} rating` : "—",
    goldenGlove: keeper && cleanSheets >= 12 ? `${keeper.name} · ${cleanSheets} clean sheets` : "Not awarded",
    managerAward: finish === 1 ? `${manager} · Manager of the Season` : `${manager} · finished #${finish}`,
  };
}
