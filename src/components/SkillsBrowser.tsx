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
};

export default function SkillsBrowser({ skills }: { skills: Skill[] }) {
  const [selected, setSelected] = useState("全部");

  // 从所有 skill 的标签里汇总出去重后的分类，"全部" 排在最前
  const filters = useMemo(() => {
    const tagSet = new Set<string>();
    for (const skill of skills) {
      for (const tag of skill.tags ?? []) {
        if (tag) tagSet.add(tag);
      }
    }
    return ["全部", ...Array.from(tagSet)];
  }, [skills]);

  const visibleSkills =
    selected === "全部"
      ? skills
      : skills.filter((skill) => (skill.tags ?? []).includes(selected));

  return (
    <>
      {/* 筛选标签 */}
      <div className="flex flex-wrap gap-2 mb-8 text-sm">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setSelected(filter)}
            className={`rounded-md px-3 py-1.5 ${
              selected === filter
                ? "bg-zinc-700 text-white"
                : "border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Skill 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {visibleSkills.map((skill) => (
          <Link
            key={skill.id}
            href={`/skills/${skill.id}`}
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5 hover:border-zinc-300 dark:hover:border-zinc-600"
          >
            <div className="flex items-start justify-between">
              <span className="font-mono text-blue-600 dark:text-blue-300">{skill.name}</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{skill.version}</span>
            </div>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{skill.description}</p>
            <p className="mt-4 text-sm text-zinc-500">↓ {skill.downloads ?? 0}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(skill.tags ?? []).map((tag) => (
                <span key={tag} className="rounded bg-blue-100 dark:bg-blue-500/10 px-2 py-0.5 text-xs font-mono text-blue-700 dark:text-blue-300">{tag}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
