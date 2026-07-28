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

const frameworks = ["claude-code", "langchain", "crewai", "autogen"];

type SortKey = "downloads" | "latest";
const sortLabels: Record<SortKey, string> = {
  downloads: "下载量",
  latest: "最新发布",
};

export default function SkillsBrowser({ skills }: { skills: Skill[] }) {
  const [query, setQuery] = useState("");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("downloads");

  function toggleFramework(fw: string) {
    setSelectedFrameworks((current) =>
      current.includes(fw) ? current.filter((f) => f !== fw) : [...current, fw],
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
      // 框架：勾选的取并集，tags 命中任一即可
      const matchesFramework =
        selectedFrameworks.length === 0 ||
        (skill.tags ?? []).some((tag) => selectedFrameworks.includes(tag));
      return matchesQuery && matchesFramework;
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
  }, [skills, query, selectedFrameworks, sort]);

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      {/* 左侧筛选栏 */}
      <aside>
        <p className="mb-4 text-sm font-semibold">框架</p>
        <div className="space-y-3">
          {frameworks.map((fw) => (
            <label key={fw} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={selectedFrameworks.includes(fw)}
                onChange={() => toggleFramework(fw)}
                className="h-4 w-4 rounded border-zinc-400 dark:border-zinc-600"
              />
              <span className="font-mono">{fw}</span>
            </label>
          ))}
        </div>
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
