-- Anonymous Supabase sessions are authenticated users. They may customize
-- only their own arcade identity before linking Google or email.
drop policy if exists "Permanent users can update their profile" on public.profiles;

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

