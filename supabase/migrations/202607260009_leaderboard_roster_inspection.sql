-- The leaderboard roster endpoint resolves a submitted public entry back to
-- its verified game run with the server-only service role.
grant select on public.weekly_leaderboard_entries to service_role;
grant select on public.game_runs to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;
