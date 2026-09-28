"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isSkillCategory, recommendSkillCategory, skillCategoryDefinitions, skillCategoryLabel, type SkillCategoryValue } from "@/lib/skillCategories";

export type SkillListItem = {
  id: string | number;
  name: string;
  category?: string | null;
  version?: string | null;
  description?: string | null;
  downloads?: number | null;
  file_path?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
};

type SortKey = "downloads" | "latest";
const sortLabels: Record<SortKey, string> = {
  downloads: "下载量",
  latest: "最新发布",
};

function categoryForSkill(skill: SkillListItem): SkillCategoryValue {
  if (isSkillCategory(skill.category)) return skill.category;
  return recommendSkillCategory(skill.name, skill.description ?? "", skill.tags ?? []);
}

export default function SkillsBrowser({ skills, initialPage, pageSize, isSearch }: { skills: SkillListItem[]; initialPage: number; pageSize: number; isSearch: boolean }) {
  const [selectedCategories, setSelectedCategories] = useState<SkillCategoryValue[]>([]);
  const [sort, setSort] = useState<SortKey>("downloads");
  const [page, setPage] = useState(initialPage);

  // 固定使用任务导向分类，避免分类名称随当前页的零散标签漂移。
  const categories = useMemo(() => {
    return skillCategoryDefinitions.map((category) => ({
      ...category,
      count: skills.filter((skill) => categoryForSkill(skill) === category.value).length,
    }));
  }, [skills]);

  function toggleCategory(category: SkillCategoryValue) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category],
    );
    setPage(1);
    const url = new URL(window.location.href);
    url.searchParams.delete("page");
    window.history.replaceState(null, "", url);
  }

  const sortedSkills = useMemo(() => {
    let list = skills.filter((skill) => {
      let matchesFilter = true;
      if (selectedCategories.length > 0) {
        // 分类由名称、说明和内部历史标签共同推断，未填标签的 Skill 也可被正确筛选。
        matchesFilter = selectedCategories.includes(categoryForSkill(skill));
      }

      return matchesFilter;
    });

    if (sort === "downloads") {
      const rank = (skill: SkillListItem) => skill.file_path ? skill.downloads ?? 0 : -1;
      list = [...list].sort((a, b) => rank(b) - rank(a) || new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      );
    }
    return list;
  }, [skills, selectedCategories, sort]);
  const pageCount = Math.max(1, Math.ceil(sortedSkills.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleSkills = sortedSkills.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function changePage(nextPage: number) {
    const next = Math.max(1, Math.min(nextPage, pageCount));
    setPage(next);
    const url = new URL(window.location.href);
    if (next === 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(next));
    window.history.replaceState(null, "", url);
    document.getElementById("skill-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      {/* 左侧筛选栏 */}
      <aside className="hub-surface h-fit p-5">
        <p className="mb-4 text-sm font-semibold">按用途筛选</p>
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无分类</p>
        ) : (
          <div className="space-y-2">
            {categories.map(({ value, label, count }) => {
              const isExpanded = selectedCategories.includes(value);
              return (
                <div key={value}>
                  <label className={`flex items-center gap-2 text-sm font-medium ${count > 0 ? "cursor-pointer text-zinc-700 dark:text-zinc-200" : "cursor-not-allowed text-zinc-400 dark:text-zinc-600"}`}>
                    <input
                      type="checkbox"
                      checked={isExpanded}
                      onChange={() => toggleCategory(value)}
                      disabled={count === 0}
                      className="h-4 w-4 rounded border-zinc-400 dark:border-zinc-600"
                    />
                    <span>{label}</span>
                    <span className="ml-auto text-xs font-normal text-zinc-400 dark:text-zinc-500">{count}</span>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      {/* 右侧：搜索 + 排序 + 列表 */}
      <div id="skill-results" className="scroll-mt-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortKey);
              setPage(1);
              const url = new URL(window.location.href);
              url.searchParams.delete("page");
              window.history.replaceState(null, "", url);
            }}
            aria-label="排序方式"
            className="hub-input ml-auto w-auto min-w-36"
          >
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <option key={key} value={key}>{sortLabels[key]}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {visibleSkills.length === 0 ? (
            <p className="hub-surface py-12 text-center text-sm hub-muted">没有匹配的 Skill。试试清除筛选条件。</p>
          ) : (
            visibleSkills.map((skill) => (
              <Link
                key={skill.id}
                href={`/skills/${skill.id}`}
                className="hub-surface group block p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)] sm:p-6"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-lg font-semibold text-[var(--accent-strong)]">{skill.name}</span>
                  <span className="text-xs hub-muted">v{skill.version ?? "0.1.0"}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 hub-muted">{skill.description || "作者暂未填写简介，打开详情了解作品信息。"}</p>
                <p className="mt-4 text-xs hub-muted">{skill.file_path ? `↓ ${skill.downloads ?? 0} 次下载` : "↗ 查看源码与说明"} <span className="ml-2 text-[var(--accent-strong)] opacity-0 transition group-hover:opacity-100">查看详情 →</span></p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="hub-chip hub-chip-active">{skillCategoryLabel(categoryForSkill(skill))}</span>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm hub-muted"><span>{selectedCategories.length ? `筛选后 ${sortedSkills.length} / ${skills.length} 个 Skill` : `${isSearch ? "当前搜索共" : "共"} ${skills.length} 个已发布 Skill`} · 第 {currentPage} / {pageCount} 页</span><div className="flex gap-2">{currentPage > 1 && <button type="button" onClick={() => changePage(currentPage - 1)} className="hub-button-secondary">上一页</button>}{currentPage < pageCount && <button type="button" onClick={() => changePage(currentPage + 1)} className="hub-button-secondary">下一页</button>}</div></div>
      </div>
    </div>
  );
}
