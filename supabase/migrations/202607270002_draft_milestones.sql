-- Long-term Era XI collection milestones.
insert into public.achievement_definitions
  (id, name, description, category, tier, points, criteria)
values
  ('five-hundred-drafts', 'The 500 Club', 'Complete 500 verified Era XI drafts.', 'journey', 'gold', 0, '{"verified_runs_min":500}'),
  ('one-thousand-drafts', 'Arcade Immortal', 'Complete 1,000 verified Era XI drafts.', 'journey', 'diamond', 0, '{"verified_runs_min":1000}')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  tier = excluded.tier,
  points = 0,
  criteria = excluded.criteria,
  is_active = true;

create or replace function public.award_draft_milestone_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  verified_drafts integer;
begin
  if new.verification_status <> 'verified' or new.finalized_at is null then
    return new;
  end if;

  select count(*) into verified_drafts
  from public.game_runs
  where user_id = new.user_id
    and game_type = 'era-xi'
    and verification_status = 'verified'
    and finalized_at is not null;

  if verified_drafts >= 500 then
    insert into public.user_achievements (user_id, achievement_id, source_run_id, progress)
    values (new.user_id, 'five-hundred-drafts', new.id, 100)
    on conflict (user_id, achievement_id) do nothing;
  end if;

  if verified_drafts >= 1000 then
    insert into public.user_achievements (user_id, achievement_id, source_run_id, progress)
    values (new.user_id, 'one-thousand-drafts', new.id, 100)
    on conflict (user_id, achievement_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.award_draft_milestone_achievements() from public, anon, authenticated;
grant execute on function public.award_draft_milestone_achievements() to service_role;

drop trigger if exists award_draft_milestone_achievements_trigger on public.game_runs;
create trigger award_draft_milestone_achievements_trigger
after insert or update of verification_status, finalized_at on public.game_runs
for each row execute function public.award_draft_milestone_achievements();

-- Backfill established accounts.
insert into public.user_achievements (user_id, achievement_id, source_run_id, progress)
select user_id, 'five-hundred-drafts', (array_agg(id order by finalized_at desc))[1], 100
from public.game_runs
where game_type = 'era-xi' and verification_status = 'verified' and finalized_at is not null
group by user_id having count(*) >= 500
on conflict (user_id, achievement_id) do nothing;

insert into public.user_achievements (user_id, achievement_id, source_run_id, progress)
select user_id, 'one-thousand-drafts', (array_agg(id order by finalized_at desc))[1], 100
from public.game_runs
where game_type = 'era-xi' and verification_status = 'verified' and finalized_at is not null
group by user_id having count(*) >= 1000
on conflict (user_id, achievement_id) do nothing;
