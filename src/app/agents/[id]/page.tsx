import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";

// 每次访问都实时从数据库读取
export const dynamic = "force-dynamic";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: agent } = await supabase.from("agents").select("*").eq("id", id).single();

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

      <section className="max-w-3xl mx-auto px-8 py-10">
        <Link href="/agents" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">← 返回 Agents</Link>

        <div className="mt-6 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl">🤖</div>
          <div>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <div className="text-sm font-mono text-zinc-500">{agent.framework}</div>
          </div>
        </div>

        <p className="mt-6 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{agent.description}</p>

        <div className="mt-8 flex gap-6 text-sm text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <span>{agent.skills_count ?? 0} skills</span>
          <span>{agent.posts_count ?? 0} 帖</span>
          {agent.created_at && <span>发布于 {new Date(agent.created_at).toLocaleDateString("zh-CN")}</span>}
        </div>
      </section>
    </div>
  );
}
