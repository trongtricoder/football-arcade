-- Award achievements and update aggregate statistics from one verified run.

alter table public.game_runs
  add column if not exists finalized_at timestamptz;

create or replace function public.finalize_verified_run(target_run_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  verified_run public.game_runs%rowtype;
  earned_ids text[] := array[]::text[];
  earned_points integer := 0;
begin
  select *
  into verified_run
  from public.game_runs
  where id = target_run_id
    and verification_status = 'verified';

  if not found then
    raise exception 'Verified run not found';
  end if;

  if verified_run.finalized_at is not null then
    return;
  end if;

  select coalesce(array_agg(candidate.id), array[]::text[])
  into earned_ids
  from (
    select 'history-rewritten'::text as id
    where verified_run.league_position = 1

    union all
    select 'invincibles'
    where verified_run.losses = 0

    union all
    select 'perfect-campaign'
    where verified_run.losses = 0 and verified_run.draws = 0

    union all
    select 'era-purist'
    where coalesce((verified_run.result ->> 'averageEraFit')::integer, 0) = 100

    union all
    select 'club-royalty'
    where coalesce((verified_run.result ->> 'hasGoldClubCore')::boolean, false)

    union all
    select 'dynamic-trio'
    where coalesce((verified_run.result ->> 'hasTrioPartnership')::boolean, false)

    union all
    select 'against-the-odds'
    where verified_run.league_position = 1
      and verified_run.result ->> 'maxCardTier' in ('CULT', 'PRO', 'STAR')

    union all
    select 'clean-sheet-king'
    where verified_run.clean_sheets >= 20

    union all
    select 'centurions'
    where verified_run.league_points >= 100
  ) candidate
  where not exists (
    select 1
    from public.user_achievements existing
    where existing.user_id = verified_run.user_id
      and existing.achievement_id = candidate.id
  );

  insert into public.user_achievements (
    user_id,
    achievement_id,
    source_run_id,
    progress
  )
  select
    verified_run.user_id,
    achievement_id,
    verified_run.id,
    100
  from unnest(earned_ids) achievement_id
  on conflict (user_id, achievement_id) do nothing;

  select coalesce(sum(points), 0)
  into earned_points
  from public.achievement_definitions
  where id = any(earned_ids);

  insert into public.user_statistics (
    user_id,
    total_runs,
    verified_runs,
    best_score,
    average_score,
    league_titles,
    invincible_seasons,
    perfect_seasons,
    total_wins,
    achievement_points
  )
  values (
    verified_run.user_id,
    1,
    1,
    verified_run.score,
    verified_run.score,
    case when verified_run.league_position = 1 then 1 else 0 end,
    case when verified_run.losses = 0 then 1 else 0 end,
    case when verified_run.losses = 0 and verified_run.draws = 0 then 1 else 0 end,
    coalesce(verified_run.wins, 0),
    earned_points
  )
  on conflict (user_id) do update set
    total_runs = public.user_statistics.total_runs + 1,
    verified_runs = public.user_statistics.verified_runs + 1,
    best_score = greatest(public.user_statistics.best_score, excluded.best_score),
    average_score = round(
      (
        public.user_statistics.average_score * public.user_statistics.verified_runs
        + excluded.average_score
      ) / (public.user_statistics.verified_runs + 1),
      2
    ),
    league_titles = public.user_statistics.league_titles + excluded.league_titles,
    invincible_seasons = public.user_statistics.invincible_seasons + excluded.invincible_seasons,
    perfect_seasons = public.user_statistics.perfect_seasons + excluded.perfect_seasons,
    total_wins = public.user_statistics.total_wins + excluded.total_wins,
    achievement_points = public.user_statistics.achievement_points + excluded.achievement_points,
    updated_at = now();

  update public.game_runs
  set finalized_at = now()
  where id = verified_run.id;
end;
$$;

revoke all on function public.finalize_verified_run(uuid) from public, anon, authenticated;
grant execute on function public.finalize_verified_run(uuid) to service_role;
