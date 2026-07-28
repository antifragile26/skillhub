import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
import SkillsBrowser from "@/components/SkillsBrowser";
import Link from "next/link";

// 每次访问都实时从数据库读取，避免缓存导致新内容不显示
export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const { data: skills } = await supabase.from("skills").select("*").order("created_at", { ascending: false });

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
      <section className="max-w-6xl mx-auto px-8 py-10">
        {/* 标题行（与 Agent 页一致：左标题 + 右侧发布按钮） */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Skill 目录</h1>
          <Link href="/publish" className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">发布我的 Skill</Link>
        </div>

        <SkillsBrowser skills={skills ?? []} />
      </section>
    </div>
  );
}
