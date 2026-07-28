import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
import Link from "next/link";

// 每次访问都实时从数据库读取，避免缓存导致新内容不显示
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  // 去数据库读所有 agent
  const { data: agents } = await supabase.from("agents").select("*");

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100">
      {/* 简单的顶部（返回首页） */}
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

      <section className="max-w-6xl mx-auto px-8 py-10">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Agent 目录</h1>
          <Link href="/agents/new" className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">创建我的 Agent</Link>
        </div>

        {/* 筛选标签（先做成静态的样子） */}
        <div className="flex gap-2 mb-8 text-sm">
          {["全部", "Claude Code", "LangChain", "CrewAI", "AutoGen"].map((f, i) => (
            <span key={f} className={`rounded-md px-3 py-1.5 ${i === 0 ? "bg-zinc-700 text-white" : "border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"}`}>{f}</span>
          ))}
        </div>

        {/* Agent 卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(agents ?? []).map((agent) => (
            <div key={agent.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
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
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
