import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
import ForumBrowser from "@/components/ForumBrowser";
import Link from "next/link";

// 每 15 秒重新从数据库读一次（而不是每次访问都读），兼顾新帖可见性和速度
export const revalidate = 15;

export default async function ForumPage() {
  // 去数据库读所有帖子，按时间从新到旧
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  // 统计每个帖子的真实回复数：对每个帖子分别用 count，不用把整张评论表读回来
  const postsWithReplies = await Promise.all(
    (posts ?? []).map(async (post) => {
      const { count } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", post.id);
      return { ...post, replies: count ?? 0 };
    }),
  );

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
