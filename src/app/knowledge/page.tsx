import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; tag?: string };

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? "";
  let request = supabase.from("knowledge_entries").select("id,title,summary,scenario,tags,source_post_id,source_author,published_at,needs_review").eq("status", "published").is("deleted_at", null).order("published_at", { ascending: false });
  if (query) request = request.or(`title.ilike.%${query}%,summary.ilike.%${query}%,scenario.ilike.%${query}%`);
  if (params.tag) request = request.contains("tags", [params.tag]);
  const { data, error } = await request;
  const entries = data ?? [];
  const tagSet = Array.from(new Set(entries.flatMap((entry) => entry.tags ?? []))).slice(0, 20);

  return <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100">
    <header className="flex flex-wrap items-center gap-5 border-b border-zinc-200 px-5 py-4 sm:px-8 dark:border-zinc-800"><Link href="/" className="text-2xl font-bold text-blue-500 dark:text-blue-400">SkillHub</Link><nav className="ml-auto flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300"><Link href="/skills">Skills</Link><Link href="/agents">Agents</Link><Link href="/forum">论坛</Link><Link href="/collections">专题</Link><Link href="/notifications">通知</Link></nav></header>
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">知识库</h1><p className="mt-2 text-sm text-zinc-500">从已审核内容整理的可复用知识，保留来源和作者署名。</p></div><Link href="/forum" className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">回到论坛</Link></div>
      <form className="mt-8 flex gap-2" method="get"><label htmlFor="knowledge-q" className="sr-only">搜索知识</label><input id="knowledge-q" name="q" defaultValue={query} placeholder="搜索标题、摘要或场景" className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-950" /><button className="rounded-md bg-zinc-800 px-4 py-2.5 text-sm text-white">搜索</button></form>
      {tagSet.length > 0 && <div className="mt-4 flex flex-wrap gap-2 text-sm"><Link href="/knowledge" className={`rounded-full px-3 py-1 ${!params.tag ? "bg-blue-600 text-white" : "border border-zinc-300 dark:border-zinc-700"}`}>全部</Link>{tagSet.map((tag) => <Link key={tag} href={`/knowledge?tag=${encodeURIComponent(tag)}`} className={`rounded-full px-3 py-1 ${params.tag === tag ? "bg-blue-600 text-white" : "border border-zinc-300 dark:border-zinc-700"}`}>#{tag}</Link>)}</div>}
      {error && <p className="mt-6 rounded-md bg-amber-50 p-4 text-sm text-amber-800">知识库暂时无法加载。</p>}
      <div className="mt-8 grid gap-4 md:grid-cols-2">{entries.length === 0 ? <p className="col-span-full rounded-lg border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500">暂无匹配的已发布知识。</p> : entries.map((entry) => <Link key={entry.id} href={`/knowledge/${entry.id}`} className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 transition hover:border-blue-400 dark:border-zinc-800 dark:bg-zinc-900/40"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{entry.title}</h2>{entry.needs_review && <span className="text-xs text-amber-600">来源待核对</span>}</div><p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{entry.summary || entry.scenario || "暂无摘要"}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500"><span>{entry.source_author || "社区作者"}</span>{entry.source_post_id && <span>· 来源帖子 #{entry.source_post_id}</span>}{(entry.tags ?? []).map((tag: string) => <span key={tag} className="rounded bg-zinc-200 px-2 py-0.5 dark:bg-zinc-800">#{tag}</span>)}</div></Link>)}</div>
    </main>
  </div>;
}
