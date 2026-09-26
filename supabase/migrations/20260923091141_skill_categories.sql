-- 为 Skill 保存用户确认后的唯一大类。
-- 历史记录允许为空，目录会继续使用名称/简介/旧标签兼容推断；不删除旧标签数据。
alter table public.skills add column if not exists category text;

alter table public.skills drop constraint if exists skills_category_check;
alter table public.skills add constraint skills_category_check check (
  category is null or category in (
    'software-ai',
    'product-design',
    'business-finance',
    'content-media',
    'research-education',
    'office-collaboration',
    'industry-services',
    'life-development',
    'docs-knowledge',
    'general-tools'
  )
);

create index if not exists skills_category_idx on public.skills (category, status, created_at desc);
