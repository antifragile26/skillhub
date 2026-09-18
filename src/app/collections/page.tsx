import Link from "next/link";
import ForumHeader from "@/components/ForumHeader";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const { data: collections } = await supabase.from("knowledge_collections").select("id,name,description,updated_at").eq("status", "published").order("updated_at", { ascending: false });
  return <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100"><ForumHeader /><main className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><div className="flex items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">知识专题</h1><p className="mt-2 text-sm text-zinc-500">运营整理的有序知识目录。</p></div><Link href="/knowledge" className="text-sm text-blue-600">知识库</Link></div><div className="mt-8 grid gap-4 md:grid-cols-2">{(collections ?? []).length === 0 ? <p className="col-span-full rounded-lg border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500">暂无已发布专题。</p> : collections?.map((collection) => <Link key={collection.id} href={`/collections/${collection.id}`} className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 hover:border-blue-400 dark:border-zinc-800 dark:bg-zinc-900/40"><h2 className="text-lg font-semibold">{collection.name}</h2><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{collection.description || "暂无简介"}</p></Link>)}</div></main></div>;
}
