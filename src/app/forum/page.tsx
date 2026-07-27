import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";

export default async function ForumPage() {
  // 去数据库读所有帖子，按时间从新到旧
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e14] text-zinc-900 dark:text-zinc-100">
      <header className="flex items-center gap-6 px-8 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <a href="/" className="text-2xl font-bold text-blue-500 dark:text-blue-400">SkillHub</a>
        <nav className="ml-auto flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-300">
          <a href="/skills" className="hover:text-zinc-900 dark:hover:text-white">Skills</a>
          <a href="/agents" className="hover:text-zinc-900 dark:hover:text-white">Agents</a>
          <a href="/forum" className="hover:text-zinc-900 dark:hover:text-white">论坛</a>
          <CreateMenu />
          <ThemeToggle />
          <a href="/login" className="hover:text-zinc-900 dark:hover:text-white">登录</a>
          <a href="/register" className="rounded-md bg-green-600 px-4 py-1.5 font-medium text-white hover:bg-green-500">注册</a>
        </nav>
      </header>

      <section className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">论坛</h1>
          <a href="/forum/new" className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">发帖</a>
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2 mb-6 text-sm">
          {["question", "bug_report", "showcase", "general", "skill_exchange", "review"].map((c) => (
            <span key={c} className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-zinc-600 dark:text-zinc-400">{c}</span>
          ))}
        </div>

        {/* 帖子列表 */}
        <div className="space-y-3">
          {(posts ?? []).map((post) => (
            <a key={post.id} href={`/forum/${post.id}`} className="flex items-center gap-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4 hover:border-zinc-300 dark:hover:border-zinc-600">
              {/* 左边点赞点踩 */}
              <div className="flex flex-col items-center text-xs text-zinc-500">
                <span>▲ {post.upvotes ?? 0}</span>
                <span>▼ {post.downvotes ?? 0}</span>
              </div>
              {/* 中间标题和信息 */}
              <div>
                <div className="font-medium hover:text-blue-600 dark:hover:text-blue-400">{post.title}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {post.author} · {post.replies ?? 0} replies · {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
