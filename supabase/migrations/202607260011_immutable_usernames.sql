-- The generated player_XXXXXXXX username is the stable public identifier.
-- Users may customize their display name, but not change that identifier.
revoke update (username) on table public.profiles from authenticated;

