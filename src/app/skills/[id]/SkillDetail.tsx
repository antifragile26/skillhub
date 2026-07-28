"use client";

import { useState } from "react";

type Skill = {
  id: string | number;
  name: string;
  version?: string | null;
  description?: string | null;
  downloads?: number | null;
  tags?: string[] | null;
  created_at?: string | null;
};

const tabs = ["README", "Versions", "Discussions", "Reviews", "Security"] as const;

export default function SkillDetail({ skill }: { skill: Skill }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("README");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* 左侧：标题 + tabs + 内容 */}
      <div>
        <div className="flex items-start gap-4">
          <div className="mt-1 text-3xl">📄</div>
          <div>
            <h1 className="font-mono text-3xl font-bold">{skill.name}</h1>
            <div className="mt-1 text-sm text-zinc-500">
              <span className="font-mono">{skill.version ?? "0.1.0"}</span>
              <span className="ml-3 font-mono">MIT</span>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="mt-8 flex gap-6 border-b border-zinc-200 dark:border-zinc-800 text-sm">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`-mb-px border-b-2 pb-3 ${
                tab === item
                  ? "border-blue-500 text-zinc-900 dark:text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* tab 内容 */}
        <div className="mt-6">
          {tab === "README" ? (
            <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
              {skill.description || "作者暂未填写说明。"}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">暂无内容。</p>
          )}
        </div>
      </div>

      {/* 右侧信息卡片 */}
      <aside className="space-y-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
          <p className="mb-3 text-sm font-medium">安装</p>
          <pre className="overflow-x-auto rounded bg-white dark:bg-zinc-950 p-3 font-mono text-sm text-green-600 dark:text-green-400">
            <code>{`skillhub install ${skill.name}`}</code>
          </pre>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5 text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500">许可证</span>
            <span className="font-mono">MIT</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500">总安装量</span>
            <span>{skill.downloads ?? 0}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500">评分</span>
            <span>★ 0.0 (0)</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
          <p className="mb-3 text-sm font-medium">兼容框架</p>
          <div className="flex flex-wrap gap-2">
            {(skill.tags ?? []).length > 0 ? (
              (skill.tags ?? []).map((tag) => (
                <span key={tag} className="rounded bg-blue-100 dark:bg-blue-500/10 px-2 py-0.5 text-xs font-mono text-blue-700 dark:text-blue-300">{tag}</span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">未标注</span>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
