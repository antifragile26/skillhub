import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: collection } = await supabase.from("knowledge_collections").select("id,name,description").eq("id", id).eq("status", "published").maybeSingle();
  const { data: items } = await supabase.from("knowledge_collection_items").select("position,knowledge:knowledge_entries(id,title,summary,source_author)").eq("collection_id", id).order("position", { ascending: true });
  if (!collection) return <main className="min-h-screen p-8 dark:bg-[#0a0e14]"><Link href="/collections" className="text-blue-600">← 返回专题</Link><p className="mt-8">专题不存在或暂未发布。</p></main>;
  return <main className="min-h-screen bg-white px-5 py-10 text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100 sm:px-8"><div className="mx-auto max-w-4xl"><Link href="/collections" className="text-blue-600">← 返回专题</Link><h1 className="mt-6 text-3xl font-bold">{collection.name}</h1><p className="mt-2 text-zinc-600 dark:text-zinc-400">{collection.description}</p><ol className="mt-8 space-y-3">{(items ?? []).map((item) => { const knowledge = Array.isArray(item.knowledge) ? item.knowledge[0] : item.knowledge; return knowledge ? <li key={knowledge.id}><Link href={`/knowledge/${knowledge.id}`} className="block rounded-lg border border-zinc-200 bg-zinc-50 p-4 hover:border-blue-400 dark:border-zinc-800 dark:bg-zinc-900/40"><span className="text-xs text-zinc-500">{item.position}.</span><h2 className="mt-1 font-semibold">{knowledge.title}</h2><p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{knowledge.summary}</p></Link></li> : null; })}</ol></div></main>;
}
