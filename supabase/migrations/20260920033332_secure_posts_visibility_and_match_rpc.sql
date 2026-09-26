-- Remove legacy unconditional public-read policies that override the intended visibility rule.
drop policy if exists "Anyone can read posts" on public.posts;
drop policy if exists "任何人可看 posts" on public.posts;

-- Defense in depth: keep the visibility boundary even if another permissive policy is added later.
drop policy if exists "Posts visibility boundary" on public.posts;
create policy "Posts visibility boundary"
  on public.posts as restrictive for select to public
  using (
    deleted_at is null
    and (
      status = 'published'
      or user_id = (select auth.uid())
      or (select public.current_user_is_operator())
    )
  );

-- Recommendations remain callable publicly, but they run as the caller and only ever return
-- published, non-deleted posts. RLS independently applies to both sides of the join.
create or replace function public.match_posts(
  query_post_id bigint,
  match_count int default 5
)
returns table (
  id bigint,
  title text,
  category text,
  author text,
  created_at timestamptz,
  similarity float
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select
    p.id,
    p.title,
    p.category,
    p.author,
    p.created_at,
    1 - (p.embedding <=> q.embedding) as similarity
  from public.posts p
  join public.posts q on q.id = query_post_id
  where q.embedding is not null
    and q.status = 'published'
    and q.deleted_at is null
    and p.id <> query_post_id
    and p.embedding is not null
    and p.status = 'published'
    and p.deleted_at is null
  order by p.embedding <=> q.embedding
  limit least(greatest(coalesce(match_count, 5), 1), 50);
$$;
