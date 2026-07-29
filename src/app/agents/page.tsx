import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
import AgentsBrowser from "@/components/AgentsBrowser";
import Link from "next/link";

// 每 15 秒重新从数据库读一次（而不是每次访问都读），兼顾新内容可见性和速度
export const revalidate = 15;

export default async function AgentsPage() {
  // 去数据库读所有 agent
  const { data: agents } = await supabase.from("agents").select("*").limit(60);

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

        <AgentsBrowser agents={agents ?? []} />
      </section>
    </div>
  );
}
