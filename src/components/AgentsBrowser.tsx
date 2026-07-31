"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { agentCategories, agentCategoryLabel, agentFrameworks } from "@/lib/agentConstants";

type Agent = {
  id: string | number;
  name: string;
  category?: string | null;
  framework?: string | null; // 旧数据兼容
  frameworks?: string[] | null; // 新数据
  description?: string | null;
  skills_count?: number | null;
  posts_count?: number | null;
};

export default function AgentsBrowser({ agents }: { agents: Agent[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  // 从所有 agent 的 frameworks 汇总去重（兼容旧的 framework 字段）
  const availableFrameworks = useMemo(() => {
    const set = new Set<string>();
    for (const agent of agents) {
      const fws = agent.frameworks || (agent.framework ? [agent.framework] : []);
      for (const fw of fws) {
        if (fw) set.add(fw);
      }
    }
    return Array.from(set).sort();
  }, [agents]);

  function toggleFramework(framework: string) {
    setSelectedFrameworks((current) =>
      current.includes(framework)
        ? current.filter((f) => f !== framework)
        : [...current, framework],
    );
  }

  const visibleAgents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((agent) => {
      // 类别筛选
      const matchesCategory = !selectedCategory || agent.category === selectedCategory;

      // 框架筛选（多选，命中任一即可）
      const agentFws = agent.frameworks || (agent.framework ? [agent.framework] : []);
      const matchesFramework =
        selectedFrameworks.length === 0 ||
        agentFws.some((fw) => selectedFrameworks.includes(fw));

      // 搜索词筛选
      const matchesQuery =
        !q ||
        agent.name.toLowerCase().includes(q) ||
        (agent.description ?? "").toLowerCase().includes(q);

      return matchesCategory && matchesFramework && matchesQuery;
    });
  }, [agents, selectedCategory, selectedFrameworks, query]);

  return (
    <div className="space-y-6">
      {/* 顶部：搜索框 */}
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="🔍 搜索 agent..."
        className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
      />

      {/* 类别筛选（横向标签按钮） */}
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`rounded-md px-3 py-1.5 ${
            selectedCategory === null
              ? "bg-zinc-700 text-white"
              : "border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
          }`}
        >
          全部
        </button>
        {agentCategories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
            className={`rounded-md px-3 py-1.5 ${
              selectedCategory === cat.value
                ? "bg-zinc-700 text-white"
                : "border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 主体：左右布局 - 框架筛选 + Agent 卡片 */}
      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        {/* 左侧：框架筛选 */}
        <aside>
          <p className="mb-3 text-sm font-semibold">框架</p>
          {availableFrameworks.length === 0 ? (
            <p className="text-sm text-zinc-500">暂无框架</p>
          ) : (
            <div className="space-y-2">
              {availableFrameworks.map((fw) => (
                <label key={fw} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={selectedFrameworks.includes(fw)}
                    onChange={() => toggleFramework(fw)}
                    className="h-4 w-4 rounded border-zinc-400 dark:border-zinc-600"
                  />
                  <span className="font-mono text-xs">{fw}</span>
                </label>
              ))}
            </div>
          )}
        </aside>

        {/* 右侧：Agent 卡片 */}
        <div>
        {/* 搜索框 */}
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="🔍 搜索 agent..."
          className="mb-6 w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
        />

        {/* Agent 卡片网格 */}
        {visibleAgents.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">没有匹配的 agent。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleAgents.map((agent) => {
              const agentFws = agent.frameworks || (agent.framework ? [agent.framework] : []);
              return (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5 hover:border-zinc-300 dark:hover:border-zinc-600"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">🤖</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{agent.name}</div>
                      <div className="text-xs text-zinc-500">
                        {agentCategoryLabel(agent.category)}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {agent.description}
                  </p>
                  {agentFws.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {agentFws.map((fw) => (
                        <span
                          key={fw}
                          className="rounded bg-purple-100 dark:bg-purple-500/10 px-2 py-0.5 text-xs font-mono text-purple-700 dark:text-purple-300"
                        >
                          {fw}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex gap-4 text-xs text-zinc-500">
                    <span>{agent.skills_count ?? 0} skills</span>
                    <span>{agent.posts_count ?? 0} 帖</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
