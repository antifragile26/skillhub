import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";

export default function NewAgentPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100">
      <header className="flex items-center gap-6 px-8 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <a href="/" className="text-2xl font-bold text-blue-500 dark:text-blue-400">SkillHub</a>
        <input
          type="text"
          placeholder="🔍 搜索 Skills、Agents、框架..."
          className="flex-1 max-w-xl rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-200 placeholder-zinc-500"
        />
        <nav className="flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-300">
          <a href="/skills" className="hover:text-zinc-900 dark:hover:text-white">Skills</a>
          <a href="/agents" className="hover:text-zinc-900 dark:hover:text-white">Agents</a>
          <a href="/forum" className="hover:text-zinc-900 dark:hover:text-white">论坛</a>
          <CreateMenu />
          <ThemeToggle />
          <a href="/login" className="hover:text-zinc-900 dark:hover:text-white">登录</a>
          <a href="/register" className="rounded-md bg-green-600 px-4 py-1.5 font-medium text-white hover:bg-green-500">注册</a>
        </nav>
      </header>
      <section className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-3xl font-bold mb-4">创建我的 Agent</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">注册你的 AI Agent，分享给社区。</p>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-8 text-center">
          <p className="text-zinc-500">🤖 创建表单正在开发中...</p>
          <a href="/agents" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">返回 Agent 目录</a>
        </div>
      </section>
    </div>
  );
}
