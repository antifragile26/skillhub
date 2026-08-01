"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Skill = {
  id: string | number;
  name: string;
  version?: string | null;
  description?: string | null;
  downloads?: number | null;
  tags?: string[] | null;
  created_at?: string | null;
};

type SortKey = "downloads" | "latest";
const sortLabels: Record<SortKey, string> = {
  downloads: "下载量",
  latest: "最新发布",
};

// 标签到大分类的映射
const tagCategoryMap: Record<string, string> = {
  // 开发与代码
  git: "开发与代码",
  github: "开发与代码",
  vcs: "开发与代码",
  // 网络与接口
  api: "网络与接口",
  http: "网络与接口",
  fetch: "网络与接口",
  // 数据与数据库
  database: "数据与数据库",
  postgres: "数据与数据库",
  sqlite: "数据与数据库",
  // 浏览器与设备
  browser: "浏览器与设备",
  // 自动化与系统
  automation: "自动化与系统",
  filesystem: "自动化与系统",
  // 知识与记忆
  "knowledge-graph": "知识与记忆",
  memory: "知识与记忆",
  search: "知识与记忆",
  // 平台连接与通信
  mcp: "平台连接与通信",
  messaging: "平台连接与通信",
  slack: "平台连接与通信",
  // AI/模型相关
  claude: "AI/模型相关",
};

// 把原始标签映射到大分类
function mapToCategory(tag: string): string {
  return tagCategoryMap[tag.toLowerCase()] || "其他";
}

export default function SkillsBrowser({ skills }: { skills: Skill[] }) {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("downloads");

  // 从所有 Skill 的 tags 计算出大分类（去重、排序）
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const skill of skills) {
      for (const tag of skill.tags ?? []) {
        set.add(mapToCategory(tag));
      }
    }
    return Array.from(set).sort();
  }, [skills]);

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category],
    );
  }

  const visibleSkills = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = skills.filter((skill) => {
      // 搜索：名称或描述命中
      const matchesQuery =
        !q ||
        skill.name.toLowerCase().includes(q) ||
        (skill.description ?? "").toLowerCase().includes(q);
      // 大分类筛选：勾选的取并集，skill 的任一标签映射到大分类即命中
      const matchesCategory =
        selectedCategories.length === 0 ||
        (skill.tags ?? []).some((tag) =>
          selectedCategories.includes(mapToCategory(tag)),
        );
      return matchesQuery && matchesCategory;
    });

    if (sort === "downloads") {
      list = [...list].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      );
    }
    return list;
  }, [skills, query, selectedCategories, sort]);

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      {/* 左侧筛选栏 */}
      <aside>
        <p className="mb-4 text-sm font-semibold">分类</p>
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无分类</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <label key={category} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="h-4 w-4 rounded border-zinc-400 dark:border-zinc-600"
                />
                <span>{category}</span>
              </label>
            ))}
          </div>
        )}
      </aside>

      {/* 右侧：搜索 + 排序 + 列表 */}
      <div>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="🔍 搜索 skill..."
            className="flex-1 min-w-60 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
          >
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <option key={key} value={key}>{sortLabels[key]}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {visibleSkills.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">没有匹配的 skill。</p>
          ) : (
            visibleSkills.map((skill) => (
              <Link
                key={skill.id}
                href={`/skills/${skill.id}`}
                className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-6 hover:border-zinc-300 dark:hover:border-zinc-600"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-lg text-blue-600 dark:text-blue-300">{skill.name}</span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">{skill.version}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{skill.description}</p>
                <p className="mt-4 text-sm text-zinc-500">↓ {skill.downloads ?? 0}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(skill.tags ?? []).map((tag) => (
                    <span key={tag} className="rounded bg-blue-100 dark:bg-blue-500/10 px-2 py-0.5 text-xs font-mono text-blue-700 dark:text-blue-300">{tag}</span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
