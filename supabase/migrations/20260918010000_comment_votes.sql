-- 评论互动：独立于帖子 votes 表，避免改变帖子投票统计。
alter table public.comments add column if not exists upvotes integer not null default 0;
alter table public.comments add column if not exists downvotes integer not null default 0;

create table if not exists public.comment_votes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_type text not null check (vote_type in ('up','down')),
  created_at timestamptz not null default now(),
  unique (user_id, comment_id)
);
create index if not exists comment_votes_comment_idx on public.comment_votes(comment_id);
alter table public.comment_votes enable row level security;
grant select on public.comment_votes to anon, authenticated;
grant insert, update, delete on public.comment_votes to authenticated;

drop policy if exists "Anyone can read comment votes" on public.comment_votes;
create policy "Anyone can read comment votes" on public.comment_votes for select using (true);
drop policy if exists "Users can add their comment votes" on public.comment_votes;
create policy "Users can add their comment votes" on public.comment_votes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their comment votes" on public.comment_votes;
create policy "Users can update their comment votes" on public.comment_votes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their comment votes" on public.comment_votes;
create policy "Users can delete their comment votes" on public.comment_votes for delete to authenticated using ((select auth.uid()) = user_id);

update public.comments c set upvotes = (select count(*) from public.comment_votes v where v.comment_id = c.id and v.vote_type = 'up'), downvotes = (select count(*) from public.comment_votes v where v.comment_id = c.id and v.vote_type = 'down');

create or replace function public.sync_comment_vote_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.comments set upvotes = (select count(*) from public.comment_votes where comment_id = coalesce(new.comment_id, old.comment_id) and vote_type = 'up'), downvotes = (select count(*) from public.comment_votes where comment_id = coalesce(new.comment_id, old.comment_id) and vote_type = 'down') where id = coalesce(new.comment_id, old.comment_id);
  return coalesce(new, old);
end; $$;
drop trigger if exists comment_votes_sync_counts on public.comment_votes;
create trigger comment_votes_sync_counts after insert or update or delete on public.comment_votes for each row execute function public.sync_comment_vote_counts();
