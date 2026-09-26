import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const { data: collections } = await supabase.from("knowledge_collections").select("id,name,description,updated_at").eq("status", "published").order("updated_at", { ascending: false });
  return <main className="hub-page"><section className="hub-container max-w-5xl py-10 sm:py-12"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="hub-kicker">主题阅读</p><h1 className="hub-page-heading mt-2">知识专题</h1><p className="mt-2 text-sm hub-muted">运营整理的主题内容，帮助你沿着一个问题继续探索。</p></div><Link href="/knowledge" className="hub-button-secondary">打开知识库</Link></div><div className="mt-8 grid gap-4 md:grid-cols-2">{(collections ?? []).length === 0 ? <p className="hub-surface col-span-full py-12 text-center text-sm hub-muted">暂无已发布专题。</p> : collections?.map((collection) => <Link key={collection.id} href={`/collections/${collection.id}`} className="hub-surface group p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)]"><span className="hub-kicker">SkillHub 专题</span><h2 className="mt-3 text-lg font-semibold group-hover:text-[var(--accent-strong)]">{collection.name}</h2><p className="mt-2 text-sm leading-6 hub-muted">{collection.description || "暂无简介"}</p><span className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-strong)]">阅读专题 →</span></Link>)}</div></section></main>;
}
