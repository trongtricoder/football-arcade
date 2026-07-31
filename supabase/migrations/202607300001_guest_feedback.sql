create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('bug', 'data', 'idea', 'accessibility', 'other')),
  message text not null check (char_length(message) between 10 and 2000),
  contact_email text check (contact_email is null or char_length(contact_email) <= 254),
  page_path text check (page_path is null or char_length(page_path) <= 300),
  status text not null default 'new' check (status in ('new', 'reviewing', 'planned', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_submissions_created_at_idx
  on public.feedback_submissions (created_at desc);

create index if not exists feedback_submissions_user_created_at_idx
  on public.feedback_submissions (user_id, created_at desc)
  where user_id is not null;

alter table public.feedback_submissions enable row level security;

revoke all on table public.feedback_submissions from anon, authenticated;

comment on table public.feedback_submissions is
  'Early Access feedback accepted by the validated server endpoint. Not publicly readable.';
