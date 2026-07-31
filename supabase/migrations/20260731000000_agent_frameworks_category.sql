-- Agent 功能增强：添加 category 和 frameworks 字段
-- 执行说明：在 Supabase SQL Editor 中手动执行此脚本

-- 1. 添加 category 字段（类别，单选）
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. 添加 frameworks 字段（支持的框架，多选数组）
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS frameworks TEXT[];

-- 3. 数据迁移：将旧的 framework 字段迁移到 frameworks 数组
-- 只迁移尚未设置 frameworks 的记录
UPDATE public.agents
SET frameworks = ARRAY[framework]
WHERE framework IS NOT NULL
  AND framework != ''
  AND (frameworks IS NULL OR array_length(frameworks, 1) IS NULL);

-- 4. 可选：如果确认所有数据已迁移，可以删除旧的 framework 字段
-- 建议先保留一段时间观察，确保没有问题后再删除
-- ALTER TABLE public.agents DROP COLUMN IF EXISTS framework;

-- 5. 创建索引以加速筛选查询
CREATE INDEX IF NOT EXISTS agents_category_idx ON public.agents (category);
CREATE INDEX IF NOT EXISTS agents_frameworks_idx ON public.agents USING GIN (frameworks);

-- 完成！现在可以：
-- - 在创建 agent 时选择多个框架
-- - 在 agent 社区页面按类别和框架筛选
