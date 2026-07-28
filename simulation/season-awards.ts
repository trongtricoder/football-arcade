export type SeasonAwardPlayer = {
  name: string;
  goals: number;
  averageRating: string | number;
};

export type EraXiAwardInput = {
  finish: number;
  league: string;
  year: number | string;
  managerName: string;
  seasonMvp: SeasonAwardPlayer;
  topScorer: SeasonAwardPlayer;
  keeperName: string;
  cleanSheets: number;
};

export function buildEraXiSeasonAwards(input: EraXiAwardInput) {
  const awards: string[] = [];
  const rating = Number(input.seasonMvp.averageRating);

  if (input.finish === 1) awards.push(`${input.managerName} · Manager of the Year`);
  else if (input.finish <= 4) awards.push(`${input.managerName} · Tactical Award`);

  if (input.finish <= 3 && rating >= 7.5) awards.push(`${input.seasonMvp.name} · Player of the Year`);
  if (input.topScorer.goals >= 18) awards.push(`${input.topScorer.name} · Top Scorer (${input.topScorer.goals})`);
  if (input.finish <= 6 && input.cleanSheets >= 15) awards.push(`${input.keeperName} · Golden Glove (${input.cleanSheets})`);

  if (!awards.some((award) => award.includes(input.seasonMvp.name))) {
    awards.push(`${input.seasonMvp.name} · Team MVP`);
  }

  if (input.finish === 1) awards.push(`${input.league} Champions · ${input.year}`);
  else if (input.finish <= 6) awards.push(`European Qualification · Finished #${input.finish}`);

  return awards;
}
