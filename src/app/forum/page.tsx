import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
import ForumBrowser from "@/components/ForumBrowser";
import Link from "next/link";

// 每次访问都实时从数据库读取，避免缓存导致新帖不显示
export const dynamic = "force-dynamic";

export default async function ForumPage() {
  // 去数据库读所有帖子，按时间从新到旧
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  // 读所有评论的 post_id，用来统计每个帖子的真实回复数
  const { data: comments } = await supabase.from("comments").select("post_id");
  const replyCounts = new Map<string, number>();
  for (const { post_id } of comments ?? []) {
    const key = String(post_id);
    replyCounts.set(key, (replyCounts.get(key) ?? 0) + 1);
  }

  // 用真实评论数覆盖 replies 字段
  const postsWithReplies = (posts ?? []).map((post) => ({
    ...post,
    replies: replyCounts.get(String(post.id)) ?? 0,
  }));

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

      <section className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">论坛</h1>
          <Link href="/forum/new" className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">发帖</Link>
        </div>

        <ForumBrowser posts={postsWithReplies} />
      </section>
    </div>
  );
}
