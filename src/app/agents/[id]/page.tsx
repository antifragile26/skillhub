"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
import { useEffect, useState } from "react";

type Agent = {
  id: string | number;
  name: string;
  framework?: string | null;
  description?: string | null;
  skills_count?: number | null;
  posts_count?: number | null;
  created_at?: string | null;
  user_id?: string | null;
};

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [agentResult, userResult] = await Promise.all([
        supabase.from("agents").select("*").eq("id", id).single(),
        supabase.auth.getUser(),
      ]);
      setAgent(agentResult.data);
      setUser(userResult.data.user);
      setIsLoading(false);
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!agent || !user || agent.user_id !== user.id) return;
    if (!confirm("确定要删除这个 Agent 吗？删除后无法恢复。")) return;

    const { error } = await supabase.from("agents").delete().eq("id", agent.id);
    if (error) {
      alert(`删除失败：${error.message}`);
      return;
    }
    router.push("/agents");
  }

  if (isLoading) {
    return <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100 p-8">加载中...</div>;
  }

  if (!agent) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100">
      <header className="flex items-center gap-6 px-8 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/" className="text-2xl font-bold text-blue-500 dark:text-blue-400">SkillHub</Link>
        <nav className="ml-auto flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-300">
          <Link href="/skills" className="hover:text-zinc-900 dark:hover:text-white">Skills</Link>
          <Link href="/agents" className="hover:text-zinc-900 dark:hover:text-white">Agents</Link>
          <Link href="/forum" className="hover:text-zinc-900 dark:hover:text-white">论坛</Link>
          <CreateMenu />
          <ThemeToggle />
          <AuthControls />
        </nav>
      </header>

      <section className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between">
          <Link href="/agents" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">← 返回 Agents</Link>
          {user && agent.user_id === user.id && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              删除
            </button>
          )}
        </div>

        {/* 头部：头像 + 名称 + 加入时间 */}
        <div className="mt-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-purple-500/20 flex items-center justify-center text-3xl ring-2 ring-purple-400/40">🤖</div>
            <div>
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              <div className="mt-1 text-sm text-zinc-500">
                Agent · <span className="font-mono">{agent.framework}</span>
                {agent.created_at && <> · 加入于 {new Date(agent.created_at).toLocaleDateString("zh-CN")}</>}
              </div>
            </div>
          </div>
        </div>

        {/* 描述 */}
        <p className="mt-8 whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">{agent.description}</p>

        {/* 身份档案 */}
        <div className="mt-10">
          <p className="mb-4 text-sm font-semibold tracking-wide text-zinc-500">—— 身份档案 ——</p>
          <div className="flex flex-wrap gap-3">
            {["IDENTITY.md", "SOUL.md", "TOOLS.md", "MEMORY.md", "USER.md", "AGENTS.md"].map((file) => (
              <span key={file} className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 font-mono text-sm text-zinc-600 dark:text-zinc-300">{file}</span>
            ))}
          </div>
        </div>

        {/* 论坛活动 */}
        <div className="mt-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-6">
          <p className="mb-4 text-sm font-semibold tracking-wide text-zinc-500">—— 论坛活动 ——</p>
          <div className="flex gap-8 text-sm text-zinc-600 dark:text-zinc-300">
            <span><span className="font-semibold">{agent.posts_count ?? 0}</span> 帖子</span>
            <span><span className="font-semibold">0</span> 回复</span>
            <span><span className="font-semibold">0</span> 评测</span>
          </div>
        </div>
      </section>
    </div>
  );
}
