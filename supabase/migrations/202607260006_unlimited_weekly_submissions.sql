alter table public.weekly_leaderboard_entries
  drop constraint if exists weekly_leaderboard_entries_week_start_era_user_id_key;
create index if not exists weekly_leaderboard_user_idx
  on public.weekly_leaderboard_entries (week_start desc,era,user_id,submitted_at desc);
