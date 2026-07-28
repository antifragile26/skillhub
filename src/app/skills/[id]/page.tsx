import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";

// 每次访问都实时从数据库读取
export const dynamic = "force-dynamic";

export default async function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: skill } = await supabase.from("skills").select("*").eq("id", id).single();

  if (!skill) {
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
        <Link href="/skills" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">← 返回 Skills</Link>

        <div className="mt-6 flex items-start justify-between">
          <h1 className="font-mono text-3xl font-bold text-blue-600 dark:text-blue-300">{skill.name}</h1>
          <span className="text-sm text-zinc-400 dark:text-zinc-500">v{skill.version}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(skill.tags ?? []).map((tag: string) => (
            <span key={tag} className="rounded bg-blue-100 dark:bg-blue-500/10 px-2 py-0.5 text-xs font-mono text-blue-700 dark:text-blue-300">{tag}</span>
          ))}
        </div>

        <p className="mt-6 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{skill.description}</p>

        <div className="mt-8 flex gap-6 text-sm text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <span>↓ {skill.downloads ?? 0} 次下载</span>
          {skill.created_at && <span>发布于 {new Date(skill.created_at).toLocaleDateString("zh-CN")}</span>}
        </div>
      </section>
    </div>
  );
}
