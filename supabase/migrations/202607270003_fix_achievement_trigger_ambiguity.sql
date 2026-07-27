-- Avoid PL/pgSQL ambiguity between the loop variable and the
-- user_achievements.achievement_id column during conflict handling.
create or replace function public.award_extended_era_xi_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_achievement_id text;
begin
  if new.verification_status <> 'verified' or new.finalized_at is null then
    return new;
  end if;

  for v_achievement_id in
    select candidate.id
    from (
      select 'catenaccio-crowned'::text as id
      where new.league_position = 1 and new.league_id = 'Serie A'
        and new.result ->> 'managerDefenceGrade' in ('A', 'S')
      union all select 'foreign-invincibles'
      where new.league_position = 1 and new.league_id = 'Premier League'
        and not coalesce(new.result -> 'selectedPlayerLeagues', '[]'::jsonb) ? 'Premier League'
      union all select 'partnership-network'
      where new.league_position = 1 and coalesce((new.result ->> 'partnershipCount')::integer, 0) >= 2
      union all select 'low-block-lords' where new.league_position = 1 and new.clean_sheets >= 22
      union all select 'road-warriors'
      where new.league_position = 1 and coalesce((new.result ->> 'averageEraFit')::integer, 100) < 90
      union all select 'nearly-perfect' where new.wins >= 37
      union all select 'triple-chemistry'
      where jsonb_array_length(coalesce(new.result -> 'chemistryActivations', '[]'::jsonb)) >= 3
      union all select 'iron-century' where new.league_points >= 100 and new.clean_sheets >= 18
      union all select 'first-whistle'
      union all select 'continental-places' where new.league_position <= 4
      union all select 'clean-dozen' where new.clean_sheets >= 12
      union all select 'ninety-club' where new.score >= 90
      union all select 'chemistry-lab'
      where jsonb_array_length(coalesce(new.result -> 'chemistryActivations', '[]'::jsonb)) >= 2
      union all select 'cult-contenders'
      where new.league_position <= 4 and new.result ->> 'maxCardTier' in ('CULT', 'PRO')
      union all select 'giant-killer' where new.league_position = 1 and new.score <= 82
      union all select 'defensive-dynasty'
      where new.league_position = 1 and new.clean_sheets >= 20 and new.result ->> 'managerDefenceGrade' = 'S'
      union all select 'era-adventurer'
      where (select count(distinct era) from public.game_runs where user_id = new.user_id and verification_status = 'verified') >= 5
      union all select 'league-collector'
      where (select count(distinct league_id) from public.game_runs where user_id = new.user_id and verification_status = 'verified' and league_position = 1) >= 3
      union all select 'coach-collector'
      where (select count(distinct manager_id) from public.game_runs where user_id = new.user_id and verification_status = 'verified' and league_position = 1) >= 5
      union all select 'all-time-ruler'
      where (select count(distinct era) from public.game_runs where user_id = new.user_id and verification_status = 'verified' and league_position = 1) >= 5
    ) candidate
  loop
    insert into public.user_achievements (user_id, achievement_id, source_run_id, progress)
    values (new.user_id, v_achievement_id, new.id, 100)
    on conflict on constraint user_achievements_pkey do nothing;
  end loop;

  return new;
end;
$$;

revoke all on function public.award_extended_era_xi_achievements() from public, anon, authenticated;
grant execute on function public.award_extended_era_xi_achievements() to service_role;
