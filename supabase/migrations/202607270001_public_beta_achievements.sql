-- Expand Era XI progression for the public beta. Achievements remain rarity
-- collectibles; no points currency is awarded.

insert into public.achievement_definitions
  (id, name, description, category, tier, points, criteria)
values
  ('first-whistle', 'First Whistle', 'Complete your first verified Era XI campaign.', 'journey', 'bronze', 0, '{"verified_runs_min":1}'),
  ('continental-places', 'Continental Places', 'Finish inside the league top four.', 'season', 'bronze', 0, '{"league_position_max":4}'),
  ('clean-dozen', 'Clean Dozen', 'Keep at least 12 clean sheets in one campaign.', 'season', 'bronze', 0, '{"clean_sheets_min":12}'),
  ('ninety-club', 'The Ninety Club', 'Build an Era XI with a verified team score of at least 90.', 'squad', 'silver', 0, '{"score_min":90}'),
  ('chemistry-lab', 'Chemistry Lab', 'Activate at least two chemistry bonuses in one squad.', 'chemistry', 'silver', 0, '{"chemistry_activations_min":2}'),
  ('cult-contenders', 'Cult Contenders', 'Finish in the top four without drafting a Superstar or Legend card.', 'draft', 'silver', 0, '{"league_position_max":4,"max_card_tier":["CULT","PRO"]}'),
  ('giant-killer', 'Giant Killer', 'Win the league with a team score of 82 or lower.', 'draft', 'gold', 0, '{"league_position":1,"score_max":82}'),
  ('defensive-dynasty', 'Defensive Dynasty', 'Win the league with an S-rated defensive manager and at least 20 clean sheets.', 'manager', 'gold', 0, '{"league_position":1,"manager_defence":"S","clean_sheets_min":20}'),
  ('era-adventurer', 'Era Adventurer', 'Complete a verified campaign in all five eras.', 'journey', 'gold', 0, '{"distinct_eras_min":5}'),
  ('league-collector', 'League Collector', 'Win championships in three different leagues.', 'journey', 'gold', 0, '{"title_leagues_min":3}'),
  ('coach-collector', 'Tactical Traveller', 'Win league titles with five different managers.', 'manager', 'gold', 0, '{"title_managers_min":5}'),
  ('all-time-ruler', 'All-Time Ruler', 'Win a championship in every era.', 'journey', 'diamond', 0, '{"title_eras_min":5}')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  tier = excluded.tier,
  points = 0,
  criteria = excluded.criteria,
  is_active = true;

create or replace function public.award_extended_era_xi_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  achievement_id text;
begin
  if new.verification_status <> 'verified' or new.finalized_at is null then
    return new;
  end if;

  for achievement_id in
    select candidate.id
    from (
      select 'catenaccio-crowned'::text as id
      where new.league_position = 1 and new.league_id = 'Serie A'
        and new.result ->> 'managerDefenceGrade' in ('A', 'S')

      union all select 'foreign-invincibles'
      where new.league_position = 1 and new.league_id = 'Premier League'
        and not coalesce(new.result -> 'selectedPlayerLeagues', '[]'::jsonb) ? 'Premier League'

      union all select 'partnership-network'
      where new.league_position = 1
        and coalesce((new.result ->> 'partnershipCount')::integer, 0) >= 2

      union all select 'low-block-lords'
      where new.league_position = 1 and new.clean_sheets >= 22

      union all select 'road-warriors'
      where new.league_position = 1
        and coalesce((new.result ->> 'averageEraFit')::integer, 100) < 90

      union all select 'nearly-perfect' where new.wins >= 37
      union all select 'triple-chemistry'
      where jsonb_array_length(coalesce(new.result -> 'chemistryActivations', '[]'::jsonb)) >= 3
      union all select 'iron-century'
      where new.league_points >= 100 and new.clean_sheets >= 18

      union all select 'first-whistle'
      union all select 'continental-places' where new.league_position <= 4
      union all select 'clean-dozen' where new.clean_sheets >= 12
      union all select 'ninety-club' where new.score >= 90
      union all select 'chemistry-lab'
      where jsonb_array_length(coalesce(new.result -> 'chemistryActivations', '[]'::jsonb)) >= 2
      union all select 'cult-contenders'
      where new.league_position <= 4 and new.result ->> 'maxCardTier' in ('CULT', 'PRO')
      union all select 'giant-killer'
      where new.league_position = 1 and new.score <= 82
      union all select 'defensive-dynasty'
      where new.league_position = 1 and new.clean_sheets >= 20
        and new.result ->> 'managerDefenceGrade' = 'S'
      union all select 'era-adventurer'
      where (select count(distinct era) from public.game_runs
             where user_id = new.user_id and verification_status = 'verified') >= 5
      union all select 'league-collector'
      where (select count(distinct league_id) from public.game_runs
             where user_id = new.user_id and verification_status = 'verified' and league_position = 1) >= 3
      union all select 'coach-collector'
      where (select count(distinct manager_id) from public.game_runs
             where user_id = new.user_id and verification_status = 'verified' and league_position = 1) >= 5
      union all select 'all-time-ruler'
      where (select count(distinct era) from public.game_runs
             where user_id = new.user_id and verification_status = 'verified' and league_position = 1) >= 5
    ) candidate
  loop
    insert into public.user_achievements (user_id, achievement_id, source_run_id, progress)
    values (new.user_id, achievement_id, new.id, 100)
    on conflict (user_id, achievement_id) do nothing;
  end loop;

  return new;
end;
$$;

revoke all on function public.award_extended_era_xi_achievements() from public, anon, authenticated;
grant execute on function public.award_extended_era_xi_achievements() to service_role;

-- Credit existing verified campaigns so established players do not have to
-- repeat achievements after this migration is installed.
with candidates as (
  select distinct on (run.user_id, earned.id)
    run.user_id, earned.id as achievement_id, run.id as source_run_id
  from public.game_runs run
  cross join lateral (
    select 'first-whistle'::text as id
    union all select 'continental-places' where run.league_position <= 4
    union all select 'clean-dozen' where run.clean_sheets >= 12
    union all select 'ninety-club' where run.score >= 90
    union all select 'chemistry-lab'
      where jsonb_array_length(coalesce(run.result -> 'chemistryActivations', '[]'::jsonb)) >= 2
    union all select 'cult-contenders'
      where run.league_position <= 4 and run.result ->> 'maxCardTier' in ('CULT', 'PRO')
    union all select 'giant-killer' where run.league_position = 1 and run.score <= 82
    union all select 'defensive-dynasty'
      where run.league_position = 1 and run.clean_sheets >= 20
        and run.result ->> 'managerDefenceGrade' = 'S'
  ) earned
  where run.verification_status = 'verified'
  order by run.user_id, earned.id, run.created_at
), aggregate_candidates as (
  select user_id, 'era-adventurer'::text as achievement_id,
    (array_agg(id order by created_at desc))[1] as source_run_id
  from public.game_runs where verification_status = 'verified'
  group by user_id having count(distinct era) >= 5
  union all
  select user_id, 'league-collector', (array_agg(id order by created_at desc))[1]
  from public.game_runs where verification_status = 'verified' and league_position = 1
  group by user_id having count(distinct league_id) >= 3
  union all
  select user_id, 'coach-collector', (array_agg(id order by created_at desc))[1]
  from public.game_runs where verification_status = 'verified' and league_position = 1
  group by user_id having count(distinct manager_id) >= 5
  union all
  select user_id, 'all-time-ruler', (array_agg(id order by created_at desc))[1]
  from public.game_runs where verification_status = 'verified' and league_position = 1
  group by user_id having count(distinct era) >= 5
)
insert into public.user_achievements (user_id, achievement_id, source_run_id, progress)
select user_id, achievement_id, source_run_id, 100 from candidates
union all
select user_id, achievement_id, source_run_id, 100 from aggregate_candidates
on conflict (user_id, achievement_id) do nothing;
