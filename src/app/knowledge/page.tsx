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

  return <main className="hub-page">
    <div className="hub-container max-w-6xl py-10 sm:py-12"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="hub-kicker">从社区讨论沉淀</p><h1 className="hub-page-heading mt-2">知识库</h1><p className="mt-2 text-sm hub-muted">从已审核内容整理的可复用知识，保留来源和作者署名。</p></div><Link href="/forum" className="hub-button-secondary">回到论坛</Link></div>
      <form className="hub-surface mt-8 flex gap-3 p-4" method="get"><label htmlFor="knowledge-q" className="sr-only">搜索知识</label><input id="knowledge-q" name="q" defaultValue={query} placeholder="搜索标题、摘要或场景" className="hub-input min-w-0 flex-1" /><button className="hub-button-primary">搜索</button></form>
      {tagSet.length > 0 && <div className="mt-4 flex flex-wrap gap-2 text-sm"><Link href="/knowledge" className={`rounded-full px-3 py-1 ${!params.tag ? "bg-blue-600 text-white" : "border border-zinc-300 dark:border-zinc-700"}`}>全部</Link>{tagSet.map((tag) => <Link key={tag} href={`/knowledge?tag=${encodeURIComponent(tag)}`} className={`rounded-full px-3 py-1 ${params.tag === tag ? "bg-blue-600 text-white" : "border border-zinc-300 dark:border-zinc-700"}`}>#{tag}</Link>)}</div>}
      {error && <p className="mt-6 rounded-md bg-amber-50 p-4 text-sm text-amber-800">知识库暂时无法加载。</p>}
      <div className="mt-8 grid gap-4 md:grid-cols-2">{entries.length === 0 ? <p className="hub-surface col-span-full py-12 text-center text-sm hub-muted">暂无匹配的已发布知识。</p> : entries.map((entry) => <article key={entry.id} className="hub-surface p-5 transition hover:border-[var(--accent)]"><Link href={`/knowledge/${entry.id}`} className="block"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{entry.title}</h2>{entry.needs_review && <span className="text-xs text-amber-600">来源待核对</span>}</div><p className="mt-2 line-clamp-3 text-sm hub-muted">{entry.summary || entry.scenario || "暂无摘要"}</p></Link><div className="mt-4 flex flex-wrap gap-2 text-xs hub-muted"><span>{entry.source_author || "社区作者"}</span>{entry.source_post_id && <Link href={`/forum/${entry.source_post_id}`} className="text-[var(--accent-strong)] hover:underline">· 查看来源帖子 #{entry.source_post_id}</Link>}{(entry.tags ?? []).map((tag: string) => <span key={tag} className="hub-chip">#{tag}</span>)}</div></article>)}</div>
    </div>
  </main>;
}
