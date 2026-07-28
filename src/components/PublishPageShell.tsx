import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
import Link from "next/link";

type PublishPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export const inputClassName =
  "w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-[#0f141c] dark:text-zinc-100 dark:placeholder-zinc-500";

export const labelClassName =
  "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function PublishPageShell({
  title,
  description,
  children,
}: PublishPageShellProps) {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100">
      <header className="flex items-center gap-6 border-b border-zinc-200 px-8 py-4 dark:border-zinc-800">
        <Link href="/" className="text-2xl font-bold text-blue-500 dark:text-blue-400">
          SkillHub
        </Link>
        <input
          type="text"
          placeholder="搜索 Skills、Agents、论坛..."
          className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-[#0f141c] dark:text-zinc-200"
        />
        <nav className="flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-300">
          <Link href="/skills" className="hover:text-zinc-900 dark:hover:text-white">
            Skills
          </Link>
          <Link href="/agents" className="hover:text-zinc-900 dark:hover:text-white">
            Agents
          </Link>
          <Link href="/forum" className="hover:text-zinc-900 dark:hover:text-white">
            论坛
          </Link>
          <CreateMenu />
          <ThemeToggle />
          <AuthControls />
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            {title}
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>

        {children}
      </main>
    </div>
  );
}
