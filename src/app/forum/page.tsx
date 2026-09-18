import { supabase } from "@/lib/supabase";
import CreateMenu from "@/components/CreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControls from "@/components/AuthControls";
import ForumBrowser from "@/components/ForumBrowser";
import Link from "next/link";
import { FORUM_PAGE_SIZE } from "@/lib/forumValidation";

export const dynamic = "force-dynamic";
type SearchParams = { q?: string; sort?: string; category?: string; page?: string };
function escapeSearch(value: string) { return value.replace(/[%,()]/g, " ").trim().slice(0, 100); }

export default async function ForumPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const sort = params.sort === "hot" ? "hot" : "latest";
  const queryText = escapeSearch(params.q ?? "");
  const category = params.category ?? "";
  let query = supabase.from("posts").select("*", { count: "exact" }).is("deleted_at", null);
  if (queryText) query = query.or(`title.ilike.%${queryText}%,content.ilike.%${queryText}%`);
  if (category) query = query.eq("category", category);
  query = sort === "hot" ? query.order("upvotes", { ascending: false }).order("replies", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }) : query.order("created_at", { ascending: false }).order("id", { ascending: false });
  const from = (page - 1) * FORUM_PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + FORUM_PAGE_SIZE - 1);
  let posts = data ?? [];
  let total = count ?? 0;
  let loadError = error?.message ?? "";
  if (error) {
    let fallback = supabase.from("posts").select("*", { count: "exact" });
    if (queryText) fallback = fallback.or(`title.ilike.%${queryText}%,content.ilike.%${queryText}%`);
    if (category) fallback = fallback.eq("category", category);
    fallback = sort === "hot" ? fallback.order("upvotes", { ascending: false }).order("replies", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }) : fallback.order("created_at", { ascending: false }).order("id", { ascending: false });
    const fallbackResult = await fallback.range(from, from + FORUM_PAGE_SIZE - 1);
    posts = fallbackResult.data ?? [];
    total = fallbackResult.count ?? 0;
    loadError = fallbackResult.error?.message ?? "";
  }
  const postsWithReplies = await Promise.all(posts.map(async (post) => {
    let result = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id).is("deleted_at", null);
    if (result.error) result = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id);
    return { ...post, replies: result.count ?? post.replies ?? 0 };
  }));
  const pageCount = Math.ceil(total / FORUM_PAGE_SIZE);
  const returnTo = `/forum${params.q || params.category || params.sort || params.page ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ""}`;

  return <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100">
    <header className="flex flex-wrap items-center gap-4 border-b border-zinc-200 px-5 py-4 sm:gap-6 sm:px-8 dark:border-zinc-800"><Link href="/" className="text-2xl font-bold text-blue-500 dark:text-blue-400">SkillHub</Link><nav className="ml-auto flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300"><Link href="/skills">Skills</Link><Link href="/agents">Agents</Link><Link href="/forum">论坛</Link><CreateMenu /><ThemeToggle /><AuthControls /></nav></header>
    <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10"><div className="mb-6 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">论坛</h1><p className="mt-2 text-sm text-zinc-500">讨论、提问与经验分享</p></div><Link href={`/forum/new?returnTo=${encodeURIComponent(returnTo)}`} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">发帖</Link></div>{loadError && <div className="mb-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">论坛数据加载异常，请稍后重试。</div>}<ForumBrowser posts={postsWithReplies} total={total} page={page} pageCount={pageCount} /></section>
  </div>;
}
