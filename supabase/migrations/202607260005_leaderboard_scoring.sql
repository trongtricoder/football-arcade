alter table public.weekly_leaderboard_entries add column if not exists raw_team_score integer;
alter table public.weekly_leaderboard_entries add column if not exists score_breakdown jsonb not null default '{}'::jsonb;
update public.weekly_leaderboard_entries
set raw_team_score=coalesce(raw_team_score,score),
    score=coalesce(raw_team_score,score)*8+league_points*5+goal_difference*3+trophy_count*200
where raw_team_score is null;
