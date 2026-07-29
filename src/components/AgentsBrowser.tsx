"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Agent = {
  id: string | number;
  name: string;
  framework?: string | null;
  description?: string | null;
  skills_count?: number | null;
  posts_count?: number | null;
};

export default function AgentsBrowser({ agents }: { agents: Agent[] }) {
  const [selected, setSelected] = useState("全部");
  const [query, setQuery] = useState("");

  // 从所有 agent 的 framework 汇总去重，"全部" 排最前
  const filters = useMemo(() => {
    const set = new Set<string>();
    for (const agent of agents) {
      if (agent.framework) set.add(agent.framework);
    }
    return ["全部", ...Array.from(set)];
  }, [agents]);

  const visibleAgents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((agent) => {
      const matchesFilter = selected === "全部" || agent.framework === selected;
      const matchesQuery =
        !q ||
        agent.name.toLowerCase().includes(q) ||
        (agent.description ?? "").toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [agents, selected, query]);

  return (
    <>
      {/* 搜索框 */}
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="🔍 搜索 agent..."
        className="mb-6 w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
      />

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

      {/* Agent 卡片网格 */}
      {visibleAgents.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">没有匹配的 agent。</p>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {visibleAgents.map((agent) => (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}`}
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5 hover:border-zinc-300 dark:hover:border-zinc-600"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">🤖</div>
              <div>
                <div className="font-semibold">{agent.name}</div>
                <div className="text-xs font-mono text-zinc-500">{agent.framework}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{agent.description}</p>
            <div className="mt-4 flex gap-4 text-xs text-zinc-500">
              <span>{agent.skills_count ?? 0} skills</span>
              <span>{agent.posts_count ?? 0} 帖</span>
            </div>
          </Link>
        ))}
      </div>
      )}
    </>
  );
}
