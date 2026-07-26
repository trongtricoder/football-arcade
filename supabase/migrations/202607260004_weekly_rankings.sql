alter table public.profiles add column if not exists default_team_name text not null default 'Era XI';
alter table public.game_runs add column if not exists team_name text;
create table public.weekly_leaderboard_entries (
 id uuid primary key default gen_random_uuid(), week_start date not null,
 era text not null check (era in ('80s','90s','00s','10s','20s')),
 user_id uuid not null references auth.users(id) on delete cascade,
 run_id uuid not null unique references public.game_runs(id) on delete cascade,
 team_name text not null check (char_length(team_name) between 2 and 32),
 score integer not null, league_points integer not null, goal_difference integer not null,
 trophy_count integer not null default 0, submitted_at timestamptz not null default now(),
 unique (week_start, era, user_id)
);
create index weekly_leaderboard_rank_idx on public.weekly_leaderboard_entries (week_start desc,era,score desc,league_points desc,goal_difference desc,submitted_at asc);
alter table public.weekly_leaderboard_entries enable row level security;
create policy "Weekly rankings are publicly readable" on public.weekly_leaderboard_entries for select to anon,authenticated using (true);
grant select on public.weekly_leaderboard_entries to anon,authenticated;
grant insert,update,delete on public.weekly_leaderboard_entries to service_role;
grant update (display_name,username,default_team_name,is_public,bio,avatar_url) on public.profiles to authenticated;
