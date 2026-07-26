-- Achievements are collectible rarities, not a points currency.
update public.achievement_definitions set points = 0;

update public.achievement_definitions set tier = 'bronze' where id = 'history-rewritten';
update public.achievement_definitions set tier = 'silver' where id in ('dynamic-trio', 'clean-sheet-king', 'era-purist');
update public.achievement_definitions set tier = 'gold' where id in ('invincibles', 'club-royalty', 'centurions');
update public.achievement_definitions set tier = 'diamond' where id in ('perfect-campaign', 'against-the-odds');

insert into public.achievement_definitions
  (id, name, description, category, tier, points, criteria)
values
  ('catenaccio-crowned', 'Catenaccio Crowned', 'Win Serie A with a manager rated A or S in defence.', 'manager', 'gold', 0, '{"league":"Serie A","manager_defence_min":"A","league_position":1}'),
  ('foreign-invincibles', 'Foreign Invincibles', 'Win the Premier League without selecting a Premier League player.', 'draft', 'diamond', 0, '{"league":"Premier League","excluded_player_league":"Premier League","league_position":1}'),
  ('partnership-network', 'Partnership Network', 'Win the league with at least two named partnerships active.', 'chemistry', 'gold', 0, '{"partnership_count_min":2,"league_position":1}'),
  ('low-block-lords', 'Low Block Lords', 'Win a league while keeping at least 22 clean sheets.', 'season', 'gold', 0, '{"clean_sheets_min":22,"league_position":1}'),
  ('road-warriors', 'Road Warriors', 'Win a league with an average era fit below 90 percent.', 'squad', 'diamond', 0, '{"average_era_fit_max":89,"league_position":1}'),
  ('nearly-perfect', 'Thirty-Seven and One', 'Win 37 league matches in a single campaign.', 'season', 'diamond', 0, '{"wins_min":37}'),
  ('triple-chemistry', 'Three Ways to Win', 'Activate at least three chemistry bonuses in one Era XI.', 'chemistry', 'silver', 0, '{"chemistry_activations_min":3}'),
  ('iron-century', 'Iron Century', 'Reach 100 points while keeping at least 18 clean sheets.', 'season', 'diamond', 0, '{"league_points_min":100,"clean_sheets_min":18}')
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
      where new.league_position = 1
        and new.league_id = 'Serie A'
        and new.result ->> 'managerDefenceGrade' in ('A', 'S')

      union all select 'foreign-invincibles'
      where new.league_position = 1
        and new.league_id = 'Premier League'
        and not coalesce(new.result -> 'selectedPlayerLeagues', '[]'::jsonb) ? 'Premier League'

      union all select 'partnership-network'
      where new.league_position = 1
        and coalesce((new.result ->> 'partnershipCount')::integer, 0) >= 2

      union all select 'low-block-lords'
      where new.league_position = 1 and new.clean_sheets >= 22

      union all select 'road-warriors'
      where new.league_position = 1
        and coalesce((new.result ->> 'averageEraFit')::integer, 100) < 90

      union all select 'nearly-perfect'
      where new.wins >= 37

      union all select 'triple-chemistry'
      where jsonb_array_length(coalesce(new.result -> 'chemistryActivations', '[]'::jsonb)) >= 3

      union all select 'iron-century'
      where new.league_points >= 100 and new.clean_sheets >= 18
    ) candidate
  loop
    insert into public.user_achievements (user_id, achievement_id, source_run_id, progress)
    values (new.user_id, achievement_id, new.id, 100)
    on conflict (user_id, achievement_id) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists award_extended_era_xi_achievements_trigger on public.game_runs;
create trigger award_extended_era_xi_achievements_trigger
after update of finalized_at on public.game_runs
for each row
when (old.finalized_at is null and new.finalized_at is not null)
execute function public.award_extended_era_xi_achievements();

-- Keep the legacy aggregate harmless while older profile code still expects the column.
update public.user_statistics set achievement_points = 0;
