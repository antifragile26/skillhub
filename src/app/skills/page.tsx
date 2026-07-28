import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
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
        <h1 className="text-3xl font-bold mb-8">所有 Skills</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(skills ?? []).map((skill) => (
            <Link key={skill.id} href={`/skills/${skill.id}`} className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5 hover:border-zinc-300 dark:hover:border-zinc-600">
              <div className="flex items-start justify-between">
                <span className="font-mono text-blue-600 dark:text-blue-300">{skill.name}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{skill.version}</span>
              </div>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{skill.description}</p>
              <p className="mt-4 text-sm text-zinc-500">↓ {skill.downloads}</p>
              <div className="mt-3 flex gap-2">
                {(skill.tags ?? []).map((tag: string) => (
                  <span key={tag} className="rounded bg-blue-100 dark:bg-blue-500/10 px-2 py-0.5 text-xs font-mono text-blue-700 dark:text-blue-300">{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
