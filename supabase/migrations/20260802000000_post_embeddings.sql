-- 帖子向量推荐：pgvector 扩展 + embedding 列 + 相似度检索函数。
-- 维度 1536 对应 OpenAI text-embedding-3-small。若换其它模型需改维度并重建列。
-- 幂等，可在 Supabase SQL Editor 反复执行。

-- 1. 启用 pgvector 扩展
create extension if not exists vector;

-- 2. 给 posts 加向量列
alter table public.posts add column if not exists embedding vector(1536);

-- 3. 相似度索引（ivfflat + 余弦距离）。数据量小时可选，量大时显著加速。
create index if not exists posts_embedding_idx
  on public.posts using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. 相似帖检索函数：传入当前帖 id，返回语义最相近的 N 篇（排除自己、排除无向量的）。
--    security definer 让匿名访客也能读推荐；返回列不含 embedding 本身。
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
security definer
set search_path = public
as $$
  select
    p.id,
    p.title,
    p.category,
    p.author,
    p.created_at,
    1 - (p.embedding <=> q.embedding) as similarity
  from public.posts p, public.posts q
  where q.id = query_post_id
    and q.embedding is not null
    and p.id <> query_post_id
    and p.embedding is not null
  order by p.embedding <=> q.embedding
  limit match_count;
$$;

grant execute on function public.match_posts(bigint, int) to anon, authenticated;
