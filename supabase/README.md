# Football Arcade database

The SQL migrations in this directory are the source of truth for accounts,
verified Era XI runs, achievements, daily challenges, leaderboards, profiles,
statistics, and future seasonal rankings.

Apply migrations to the development Supabase project first. Production must use
a separate Supabase project and receive migrations only after preview testing.

Never place Supabase credentials in this directory or commit `.env.local`.
