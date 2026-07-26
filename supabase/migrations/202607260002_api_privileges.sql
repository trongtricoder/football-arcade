-- Explicit Data API privileges.
-- RLS policies still decide which rows each caller may access.

grant usage on schema public to anon, authenticated, service_role;

grant select on table public.profiles to anon, authenticated;
grant select on table public.daily_challenges to anon, authenticated;
grant select on table public.game_runs to anon, authenticated;
grant select on table public.achievement_definitions to anon, authenticated;
grant select on table public.user_achievements to anon, authenticated;
grant select on table public.leaderboard_entries to anon, authenticated;
grant select on table public.user_statistics to anon, authenticated;
grant select on table public.ranking_seasons to anon, authenticated;
grant select on table public.season_entries to anon, authenticated;

grant update (
  username,
  display_name,
  avatar_url,
  bio,
  is_public
) on table public.profiles to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Future tables remain private until a migration grants them intentionally.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

