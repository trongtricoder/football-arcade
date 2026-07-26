-- Football Arcade accounts, verified runs, achievements and rankings.
-- Apply this migration to development before using it in production.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.run_verification_status as enum (
  'pending',
  'verified',
  'rejected'
);

create type public.challenge_status as enum (
  'scheduled',
  'active',
  'closed'
);

create type public.ranking_status as enum (
  'draft',
  'active',
  'finished'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username::text ~ '^[A-Za-z0-9_]{3,24}$'),
  constraint profiles_display_name_length
    check (char_length(display_name) between 1 and 40),
  constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 240)
);

create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null,
  game_type text not null default 'era-xi',
  seed text not null,
  configuration jsonb not null default '{}'::jsonb,
  engine_version text not null,
  data_version text not null,
  rules_version text not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status public.challenge_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  constraint daily_challenges_unique_day unique (challenge_date, game_type),
  constraint daily_challenges_valid_window check (closes_at > opens_at),
  constraint daily_challenges_configuration_object
    check (jsonb_typeof(configuration) = 'object')
);

create table public.game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid references public.daily_challenges(id) on delete set null,
  game_type text not null default 'era-xi',
  mode text not null default 'random',
  seed text not null,
  formation text not null,
  era text not null,
  league_id text,
  season_id text,
  manager_id text,
  selections jsonb not null,
  score integer not null,
  league_position integer,
  league_points integer,
  wins integer,
  draws integer,
  losses integer,
  goals_for integer,
  goals_against integer,
  clean_sheets integer,
  trophy_count integer not null default 0,
  result jsonb not null,
  engine_version text not null,
  data_version text not null,
  rules_version text not null,
  verification_status public.run_verification_status not null default 'pending',
  verification_reason text,
  verified_at timestamptz,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  constraint game_runs_score_range check (score between 0 and 1000000),
  constraint game_runs_position_range
    check (league_position is null or league_position between 1 and 30),
  constraint game_runs_nonnegative_totals check (
    coalesce(league_points, 0) >= 0
    and coalesce(wins, 0) >= 0
    and coalesce(draws, 0) >= 0
    and coalesce(losses, 0) >= 0
    and coalesce(goals_for, 0) >= 0
    and coalesce(goals_against, 0) >= 0
    and coalesce(clean_sheets, 0) >= 0
    and trophy_count >= 0
  ),
  constraint game_runs_selections_array
    check (jsonb_typeof(selections) = 'array'),
  constraint game_runs_result_object
    check (jsonb_typeof(result) = 'object'),
  constraint game_runs_verified_timestamp check (
    (verification_status = 'verified' and verified_at is not null)
    or verification_status <> 'verified'
  )
);

create table public.achievement_definitions (
  id text primary key,
  name text not null,
  description text not null,
  category text not null,
  tier text not null default 'bronze',
  points integer not null default 0,
  icon text,
  criteria jsonb not null default '{}'::jsonb,
  is_secret boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint achievement_points_range check (points between 0 and 10000),
  constraint achievement_criteria_object check (jsonb_typeof(criteria) = 'object')
);

create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null
    references public.achievement_definitions(id) on delete cascade,
  source_run_id uuid references public.game_runs(id) on delete set null,
  progress integer not null default 100,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id),
  constraint achievement_progress_range check (progress between 0 and 100)
);

create table public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null
    references public.daily_challenges(id) on delete cascade,
  run_id uuid not null unique references public.game_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  league_points integer not null default 0,
  goal_difference integer not null default 0,
  trophy_count integer not null default 0,
  clean_sheets integer not null default 0,
  completion_time_ms integer,
  submitted_at timestamptz not null default now(),
  constraint leaderboard_one_ranked_attempt unique (challenge_id, user_id),
  constraint leaderboard_score_nonnegative check (score >= 0),
  constraint leaderboard_time_positive
    check (completion_time_ms is null or completion_time_ms > 0)
);

create table public.user_statistics (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_runs integer not null default 0,
  verified_runs integer not null default 0,
  best_score integer not null default 0,
  average_score numeric(10, 2) not null default 0,
  league_titles integer not null default 0,
  invincible_seasons integer not null default 0,
  perfect_seasons integer not null default 0,
  total_wins integer not null default 0,
  daily_entries integer not null default 0,
  daily_wins integer not null default 0,
  current_daily_streak integer not null default 0,
  longest_daily_streak integer not null default 0,
  achievement_points integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.ranking_seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.ranking_status not null default 'draft',
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ranking_seasons_valid_window check (ends_at > starts_at),
  constraint ranking_seasons_rules_object check (jsonb_typeof(rules) = 'object')
);

create table public.season_entries (
  season_id uuid not null
    references public.ranking_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ranking_points integer not null default 0,
  counted_daily_scores integer not null default 0,
  best_daily_finish integer,
  rank integer,
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id),
  constraint season_entries_nonnegative
    check (ranking_points >= 0 and counted_daily_scores >= 0),
  constraint season_entries_rank_positive check (rank is null or rank > 0)
);

create table public.security_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  run_id uuid references public.game_runs(id) on delete set null,
  event_type text not null,
  severity text not null default 'info',
  details jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now(),
  constraint security_events_severity
    check (severity in ('info', 'warning', 'critical')),
  constraint security_events_details_object check (jsonb_typeof(details) = 'object')
);

create index game_runs_user_created_idx
  on public.game_runs (user_id, created_at desc);
create index game_runs_verified_score_idx
  on public.game_runs (verification_status, score desc)
  where verification_status = 'verified';
create index game_runs_challenge_idx
  on public.game_runs (challenge_id, created_at);
create index daily_challenges_status_date_idx
  on public.daily_challenges (status, challenge_date desc);
create index leaderboard_rank_idx
  on public.leaderboard_entries (
    challenge_id,
    score desc,
    league_points desc,
    goal_difference desc,
    trophy_count desc,
    clean_sheets desc,
    submitted_at asc
  );
create index user_achievements_unlocked_idx
  on public.user_achievements (user_id, unlocked_at desc);
create index security_events_created_idx
  on public.security_events (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_statistics_set_updated_at
before update on public.user_statistics
for each row execute function public.set_updated_at();

create trigger season_entries_set_updated_at
before update on public.season_entries
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_username text;
  generated_name text;
begin
  generated_username := 'player_' || replace(substr(new.id::text, 1, 8), '-', '');
  generated_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    'Anonymous Player'
  );

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    generated_username,
    generated_name,
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  insert into public.user_statistics (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.game_runs enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.user_statistics enable row level security;
alter table public.ranking_seasons enable row level security;
alter table public.season_entries enable row level security;
alter table public.security_events enable row level security;

create policy "Public profiles are readable"
on public.profiles for select
to anon, authenticated
using (is_public or id = (select auth.uid()));

create policy "Permanent users can update their profile"
on public.profiles for update
to authenticated
using (
  id = (select auth.uid())
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
)
with check (
  id = (select auth.uid())
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

create policy "Challenges are publicly readable"
on public.daily_challenges for select
to anon, authenticated
using (status in ('active', 'closed'));

create policy "Users can read their own or public verified runs"
on public.game_runs for select
to authenticated
using (
  user_id = (select auth.uid())
  or (is_public and verification_status = 'verified')
);

create policy "Public verified runs are readable without an account"
on public.game_runs for select
to anon
using (is_public and verification_status = 'verified');

create policy "Active achievements are publicly readable"
on public.achievement_definitions for select
to anon, authenticated
using (is_active and not is_secret);

create policy "Secret achievements are visible after unlock"
on public.achievement_definitions for select
to authenticated
using (
  is_active
  and exists (
    select 1
    from public.user_achievements ua
    where ua.achievement_id = achievement_definitions.id
      and ua.user_id = (select auth.uid())
  )
);

create policy "Users can read their own achievement unlocks"
on public.user_achievements for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Public profile achievements are readable"
on public.user_achievements for select
to anon, authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = user_achievements.user_id
      and p.is_public
  )
);

create policy "Leaderboard entries are publicly readable"
on public.leaderboard_entries for select
to anon, authenticated
using (true);

create policy "Users can read their own or public statistics"
on public.user_statistics for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = user_statistics.user_id and p.is_public
  )
);

create policy "Public statistics are readable without an account"
on public.user_statistics for select
to anon
using (
  exists (
    select 1 from public.profiles p
    where p.id = user_statistics.user_id and p.is_public
  )
);

create policy "Ranking seasons are publicly readable"
on public.ranking_seasons for select
to anon, authenticated
using (status in ('active', 'finished'));

create policy "Season standings are publicly readable"
on public.season_entries for select
to anon, authenticated
using (
  exists (
    select 1 from public.ranking_seasons rs
    where rs.id = season_entries.season_id
      and rs.status in ('active', 'finished')
  )
);

insert into public.achievement_definitions
  (id, name, description, category, tier, points, criteria)
values
  (
    'history-rewritten',
    'History Rewritten',
    'Win the league with your Era XI.',
    'season',
    'bronze',
    100,
    '{"league_position": 1}'::jsonb
  ),
  (
    'invincibles',
    'The Invincibles',
    'Complete the league season without losing.',
    'season',
    'silver',
    250,
    '{"losses": 0}'::jsonb
  ),
  (
    'perfect-campaign',
    'Perfect Campaign',
    'Win every league match.',
    'season',
    'gold',
    1000,
    '{"draws": 0, "losses": 0}'::jsonb
  ),
  (
    'era-purist',
    'Era Purist',
    'Finish with an average era fit of 100 percent.',
    'squad',
    'silver',
    200,
    '{"average_era_fit": 100}'::jsonb
  ),
  (
    'club-royalty',
    'Club Royalty',
    'Activate a Gold Club Core chemistry bonus.',
    'chemistry',
    'gold',
    300,
    '{"chemistry": "club-core-gold"}'::jsonb
  ),
  (
    'dynamic-trio',
    'Dynamic Trio',
    'Activate a named three-player partnership.',
    'chemistry',
    'silver',
    200,
    '{"partnership_size": 3}'::jsonb
  ),
  (
    'against-the-odds',
    'Against the Odds',
    'Win the league without drafting a Superstar or Legend.',
    'draft',
    'gold',
    500,
    '{"league_position": 1, "max_card_tier": "star"}'::jsonb
  ),
  (
    'clean-sheet-king',
    'Clean Sheet King',
    'Keep at least 20 league clean sheets.',
    'season',
    'silver',
    200,
    '{"clean_sheets_min": 20}'::jsonb
  ),
  (
    'centurions',
    'Centurions',
    'Reach 100 league points.',
    'season',
    'gold',
    350,
    '{"league_points_min": 100}'::jsonb
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  tier = excluded.tier,
  points = excluded.points,
  criteria = excluded.criteria,
  is_active = true;

