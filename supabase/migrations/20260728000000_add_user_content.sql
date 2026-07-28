alter table public.agents add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.skills add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.posts add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists agents_user_id_created_at_idx on public.agents (user_id, created_at desc);
create index if not exists skills_user_id_created_at_idx on public.skills (user_id, created_at desc);
create index if not exists posts_user_id_created_at_idx on public.posts (user_id, created_at desc);

drop policy if exists "Authenticated users can add their agents" on public.agents;
create policy "Authenticated users can add their agents"
  on public.agents for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can add their skills" on public.skills;
create policy "Authenticated users can add their skills"
  on public.skills for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can add their posts" on public.posts;
create policy "Authenticated users can add their posts"
  on public.posts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_created_at_idx on public.comments (post_id, created_at asc);
create index if not exists comments_user_id_created_at_idx on public.comments (user_id, created_at desc);

alter table public.comments enable row level security;

grant select on public.comments to anon, authenticated;
grant insert, update, delete on public.comments to authenticated;

drop policy if exists "Anyone can read comments" on public.comments;
create policy "Anyone can read comments"
  on public.comments for select
  using (true);

drop policy if exists "Authenticated users can add their comments" on public.comments;
create policy "Authenticated users can add their comments"
  on public.comments for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own comments" on public.comments;
create policy "Users can update their own comments"
  on public.comments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
  on public.comments for delete to authenticated
  using ((select auth.uid()) = user_id);
