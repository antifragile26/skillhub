import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; tag?: string };

function KnowledgeIcon({ kind = "book" }: { kind?: "book" | "search" | "source" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths = kind === "search"
    ? <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></>
    : kind === "source"
      ? <><path d="M5 4.5h14v15H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>
      : <><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21z" /><path d="M5 5.5v15M8.5 7h7" /></>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" {...common}>{paths}</svg>;
}

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? "";
  let request = supabase.from("knowledge_entries").select("id,title,summary,scenario,tags,source_post_id,source_author,published_at,needs_review").eq("status", "published").is("deleted_at", null).order("published_at", { ascending: false });
  if (query) request = request.or(`title.ilike.%${query}%,summary.ilike.%${query}%,scenario.ilike.%${query}%`);
  if (params.tag) request = request.contains("tags", [params.tag]);
  const { data, error } = await request;
  const entries = data ?? [];
  const sourceCounts = new Map<string, number>();
  if (entries.length > 0) {
    const sources = await supabase.from("knowledge_post_sources").select("knowledge_id").in("knowledge_id", entries.map((entry) => entry.id));
    for (const source of sources.data ?? []) sourceCounts.set(source.knowledge_id, (sourceCounts.get(source.knowledge_id) ?? 0) + 1);
  }
  const tagSet = Array.from(new Set(entries.flatMap((entry) => entry.tags ?? []))).slice(0, 20);

  return <main className="hub-page knowledge-page">
    <div className="hub-container max-w-6xl py-7 sm:py-10"><section className="knowledge-hero"><div className="knowledge-hero-copy"><span className="knowledge-hero-mark"><KnowledgeIcon /></span><p className="hub-kicker">从社区讨论沉淀</p><h1 className="hub-page-heading mt-2">知识库</h1><p className="mt-2 text-sm hub-muted">把解决问题的方法整理成下一次可以直接复用的步骤、检查点和限制。</p></div><Link href="/forum" className="knowledge-hero-action"><KnowledgeIcon kind="source" />去论坛找案例</Link></section>
      <form className="knowledge-search" method="get"><KnowledgeIcon kind="search" /><label htmlFor="knowledge-q" className="sr-only">搜索知识</label><input id="knowledge-q" name="q" defaultValue={query} placeholder="搜索标题、摘要或场景" className="hub-input min-w-0 flex-1" /><button className="hub-button-primary">搜索</button></form>
      {tagSet.length > 0 && <div className="knowledge-tag-strip" aria-label="知识分类"><Link href="/knowledge" className={`knowledge-tag ${!params.tag ? "knowledge-tag-active" : ""}`}><KnowledgeIcon kind="book" />全部</Link>{tagSet.map((tag) => <Link key={tag} href={`/knowledge?tag=${encodeURIComponent(tag)}`} className={`knowledge-tag ${params.tag === tag ? "knowledge-tag-active" : ""}`}>#{tag}</Link>)}</div>}
      {error && <p className="mt-6 rounded-md bg-amber-50 p-4 text-sm text-amber-800">知识库暂时无法加载。</p>}
      <div className="knowledge-grid grid gap-4 md:grid-cols-2">{entries.length === 0 ? <p className="knowledge-card col-span-full py-12 text-center text-sm hub-muted">暂无匹配的已发布知识。</p> : entries.map((entry) => <article key={entry.id} className="knowledge-card transition"><Link href={`/knowledge/${entry.id}`} className="block"><div className="flex items-start gap-3"><span className="knowledge-card-icon"><KnowledgeIcon /></span><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">{entry.title}</h2>{entry.needs_review && <span className="text-xs text-amber-600">来源待核对</span>}</div></div><p className="mt-3 line-clamp-3 text-sm hub-muted">{entry.summary || entry.scenario || "暂无摘要"}</p></Link><div className="knowledge-card-meta"><span><KnowledgeIcon kind="source" /> 来源：{sourceCounts.get(entry.id) ?? (entry.source_post_id ? 1 : 0)} 条帖子</span>{entry.source_post_id && <Link href={`/forum/${entry.source_post_id}`} className="knowledge-source-link">查看主来源 #{entry.source_post_id}</Link>}{(entry.tags ?? []).map((tag: string) => <span key={tag} className="hub-chip">#{tag}</span>)}</div></article>)}</div>
    </div>
  </main>;
}
