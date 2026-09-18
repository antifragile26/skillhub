import Link from "next/link";
import AuthControls from "@/components/AuthControls";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";

export default function ForumHeader() {
  return <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90">
    <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 sm:px-8">
      <Link href="/" className="mr-auto flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm text-white shadow-sm">S</span><span>SkillHub</span></Link>
      <nav className="flex flex-wrap items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300" aria-label="主导航">
        <Link href="/skills" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white">Skills</Link>
        <Link href="/agents" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white">Agents</Link>
        <Link href="/forum" className="rounded-lg px-3 py-2 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300">论坛</Link>
        <Link href="/knowledge" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white">知识库</Link>
        <Link href="/notifications" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white">通知</Link>
        <CreateMenu />
        <ThemeToggle />
        <AuthControls />
      </nav>
    </div>
  </header>;
}
