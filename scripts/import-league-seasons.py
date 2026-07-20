"""Generate the complete Era XI top-five-league season catalogue.

Historical match results come from engsoccerdata (CC0). The latest completed
season comes from OpenFootball (CC0). The generated JSON is committed so the
game remains deterministic and production performs no third-party requests.
"""

from __future__ import annotations

import json
import csv
import io
import urllib.request
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "work" / "engsoccerdata"
OUTPUT = ROOT / "data" / "league-seasons.json"
RDA_SOURCE = "https://raw.githubusercontent.com/jalapic/engsoccerdata/master/data/{country}.rda"
OPEN_SOURCE = "https://raw.githubusercontent.com/openfootball/football.json/master/{season}/{code}.json"

LEAGUES = {
    "england": ("Premier League", "en.1", 1981),
    "spain": ("La Liga", "es.1", 1995),
    "italy": ("Serie A", "it.1", 1994),
    "germany": ("Bundesliga", "de.1", 1995),
    "france": ("Ligue 1", "fr.1", 1994),
}


def fetch(url: str, target: Path | None = None) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "football-arcade-data-importer"})
    with urllib.request.urlopen(request, timeout=90) as response:
        body = response.read()
    if target:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(body)
    return body


def historical_rows(country: str):
    try:
        import pyreadr
    except ImportError as error:
        raise SystemExit("Install the importer dependency with: python -m pip install pyreadr") from error
    target = CACHE / f"{country}.rda"
    if not target.exists():
        fetch(RDA_SOURCE.format(country=country), target)
    frames = pyreadr.read_r(str(target))
    return next(iter(frames.values()))


def era_for(start_year: int) -> str:
    return f"{(start_year // 10) % 10}0s"


def final_table(matches: list[tuple[str, str, int, int]], points_for_win: int) -> list[str]:
    table = defaultdict(lambda: {"p": 0, "w": 0, "d": 0, "gf": 0, "ga": 0})
    for home, away, hg, ag in matches:
        table[home]["p"] += 1
        table[away]["p"] += 1
        table[home]["gf"] += hg
        table[home]["ga"] += ag
        table[away]["gf"] += ag
        table[away]["ga"] += hg
        if hg == ag:
            table[home]["d"] += 1
            table[away]["d"] += 1
        else:
            table[home if hg > ag else away]["w"] += 1
    def key(item):
        name, row = item
        points = row["w"] * points_for_win + row["d"]
        return (-points, -(row["gf"] - row["ga"]), -row["gf"], name)
    return [name for name, _ in sorted(table.items(), key=key)]


def make_record(league: str, start: int, teams: list[str]) -> dict:
    champion = teams[0]
    challengers = ", ".join(teams[1:3])
    return {
        "era": era_for(start),
        "league": league,
        "year": start + 1,
        "replaceClub": teams[-1],
        "story": f"{champion} set the pace in {start}-{str(start + 1)[-2:]}, with {challengers} leading the chase.",
        "teams": teams,
    }


def build_historical(country: str, league: str, three_point_start: int) -> list[dict]:
    frame = historical_rows(country)
    frame = frame[(frame["tier"] == 1) & (frame["Season"] >= 1980) & (frame["Season"] <= 2024)]
    records = []
    for season, rows in frame.groupby("Season"):
        start = int(season)
        matches = []
        for row in rows.itertuples(index=False):
            try:
                matches.append((str(row.home), str(row.visitor), int(row.hgoal), int(row.vgoal)))
            except (TypeError, ValueError):
                continue
        teams = final_table(matches, 3 if start >= three_point_start else 2)
        if len(teams) >= 16:
            records.append(make_record(league, start, teams))
    return records


def build_openfootball(league: str, code: str, start: int) -> dict:
    label = f"{start}-{str(start + 1)[-2:]}"
    payload = json.loads(fetch(OPEN_SOURCE.format(season=label, code=code)))
    matches = []
    for match in payload["matches"]:
        score_data = match.get("score", {})
        score = score_data.get("ft") if isinstance(score_data, dict) else score_data
        if score and score[0] is not None and score[1] is not None:
            matches.append((match["team1"], match["team2"], int(score[0]), int(score[1])))
    teams = final_table(matches, 3)
    if len(teams) < 16:
        raise RuntimeError(f"{label} {league} source is incomplete")
    return make_record(league, start, teams)


def build_football_data(league: str, code: str, start: int) -> dict:
    season_code = f"{str(start)[-2:]}{str(start + 1)[-2:]}"
    url = f"https://www.football-data.co.uk/mmz4281/{season_code}/{code}.csv"
    text = fetch(url).decode("latin-1")
    matches = []
    for row in csv.DictReader(io.StringIO(text)):
        try:
            matches.append((row["HomeTeam"], row["AwayTeam"], int(row["FTHG"]), int(row["FTAG"])))
        except (KeyError, TypeError, ValueError):
            continue
    teams = final_table(matches, 3 if start >= 1994 else 2)
    if len(teams) < 16:
        raise RuntimeError(f"football-data returned an incomplete {start} {league} season")
    return make_record(league, start, teams)


def main() -> None:
    records = []
    for country, (league, code, three_point_start) in LEAGUES.items():
        country_records = build_historical(country, league, three_point_start)
        present = {record["year"] - 1 for record in country_records}
        if country == "england" and 2022 not in present:
            country_records.append(build_openfootball(league, code, 2022))
        if country == "france" and 1994 not in present:
            country_records.append(build_football_data(league, "F1", 1994))
        records.extend(country_records)
        records.append(build_openfootball(league, code, 2025))
    records.sort(key=lambda item: (item["year"], item["league"]))
    if len(records) != 230:
        raise RuntimeError(f"Expected 230 seasons, generated {len(records)}")
    OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(records)} league seasons at {OUTPUT}")


if __name__ == "__main__":
    main()
