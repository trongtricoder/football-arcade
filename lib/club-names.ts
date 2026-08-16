import clubNames from "@/data/club-names.json";

const normalizeClubKey = (club: string) => club
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]/gu, "");

const canonicalByKey = new Map<string, string>();
for (const club of Object.keys(clubNames.clubs)) canonicalByKey.set(normalizeClubKey(club), club);
for (const [alias, canonical] of Object.entries(clubNames.aliases)) canonicalByKey.set(normalizeClubKey(alias), canonical);

/** Canonical identity for comparisons; player cards keep their stored historical label. */
export function canonicalClub(club: string) {
  return canonicalByKey.get(normalizeClubKey(club)) ?? club;
}
