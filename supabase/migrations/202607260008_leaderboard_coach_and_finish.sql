alter table public.weekly_leaderboard_entries
  add column if not exists manager_name text not null default 'Unknown Coach',
  add column if not exists league_position integer not null default 1;

update public.weekly_leaderboard_entries entry
set
  manager_name = coalesce(run.manager_id, 'Unknown Coach'),
  league_position = coalesce(run.league_position, 1)
from public.game_runs run
where run.id = entry.run_id;

alter table public.weekly_leaderboard_entries
  drop constraint if exists weekly_leaderboard_league_position_range;

alter table public.weekly_leaderboard_entries
  add constraint weekly_leaderboard_league_position_range
  check (league_position between 1 and 24);

grant select on public.weekly_leaderboard_entries to anon, authenticated;
