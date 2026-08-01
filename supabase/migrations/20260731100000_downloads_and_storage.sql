-- 下载功能基建：结构化仓库地址 + 上传文件路径 + 下载计数 + Storage bucket
-- 执行方式：Supabase Management API / SQL Editor（幂等，可重复执行）

-- ============ 1. skills / agents 结构化字段 ============
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS repo_url TEXT;
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS file_path TEXT;

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS repo_url TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS downloads INTEGER NOT NULL DEFAULT 0;

-- ============ 2. 下载计数函数（SECURITY DEFINER，绕过 RLS 只做 +1） ============
CREATE OR REPLACE FUNCTION public.increment_skill_downloads(skill_id BIGINT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.skills SET downloads = COALESCE(downloads, 0) + 1 WHERE id = skill_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_agent_downloads(agent_id BIGINT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.agents SET downloads = COALESCE(downloads, 0) + 1 WHERE id = agent_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_skill_downloads(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_agent_downloads(BIGINT) TO anon, authenticated;

-- ============ 3. Storage bucket：packages（公开读，登录用户可上传） ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('packages', 'packages', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 公开读
DROP POLICY IF EXISTS "packages public read" ON storage.objects;
CREATE POLICY "packages public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'packages');

-- 登录用户可上传
DROP POLICY IF EXISTS "packages authenticated upload" ON storage.objects;
CREATE POLICY "packages authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'packages');

-- 上传者可删除自己的文件
DROP POLICY IF EXISTS "packages owner delete" ON storage.objects;
CREATE POLICY "packages owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'packages' AND owner = auth.uid());
