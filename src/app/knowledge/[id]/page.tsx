"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import SafeMarkdown from "@/components/SafeMarkdown";
import ForumHeader from "@/components/ForumHeader";
import { hashSessionId } from "@/lib/batch2";
import { supabase } from "@/lib/supabase";

type Knowledge = { id: string; title: string; summary: string; scenario: string; steps: string; conclusions: string; limitations: string; tags: string[]; source_post_id?: number | null; source_author?: string | null; needs_review?: boolean };
type ProductLink = { id: string; content_id: string; product_type: "skill" | "agent"; product_id: string };

export default function KnowledgeDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [entry, setEntry] = useState<Knowledge | null>(null);
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [products, setProducts] = useState<Record<string, { name: string; href: string }>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const result = await supabase.from("knowledge_entries").select("*").eq("id", id).eq("status", "published").is("deleted_at", null).maybeSingle();
      if (result.error || !result.data) { setMessage("知识条目不存在或暂不可见。"); return; }
      setEntry(result.data as Knowledge);
      const linkResult = await supabase.from("content_product_links").select("id,content_id,product_type,product_id").eq("content_type", "knowledge").eq("content_id", id);
      const loaded = (linkResult.data ?? []) as ProductLink[];
      setLinks(loaded);
      const next: Record<string, { name: string; href: string }> = {};
      await Promise.all(loaded.map(async (link) => {
        const table = link.product_type === "skill" ? "skills" : "agents";
        const result = await supabase.from(table).select("id,name").eq("id", link.product_id).maybeSingle();
        if (result.data) next[link.id] = { name: result.data.name, href: `/${link.product_type === "skill" ? "skills" : "agents"}/${result.data.id}` };
      }));
      setProducts(next);
    }
    void load();
  }, [id]);

  async function clickProduct(link: ProductLink) {
    const sessionKey = typeof window === "undefined" ? "server" : (window.localStorage.getItem("skillhub:session") ?? (() => { const value = crypto.randomUUID(); window.localStorage.setItem("skillhub:session", value); return value; })());
    const result = await supabase.rpc("log_product_click", { p_content_type: "knowledge", p_content_id: id, p_product_type: link.product_type, p_product_id: link.product_id, p_session_hash: hashSessionId(sessionKey) });
    if (result.error) setMessage(result.error.message.includes("product_unavailable") ? "该产品当前不可用。" : "关联产品暂时不可用。");
  }

  if (message && !entry) return <main className="min-h-screen p-8 text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100"><Link href="/knowledge" className="text-blue-600">← 返回知识库</Link><p className="mt-8">{message}</p></main>;
  if (!entry) return <main className="min-h-screen p-8 dark:bg-[#0a0e14]">正在加载知识...</main>;
  const sections = [["适用场景", entry.scenario], ["步骤", entry.steps], ["结论与效果", entry.conclusions], ["限制条件", entry.limitations]] as const;
  return <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0a0e14] dark:text-zinc-100"><ForumHeader /><main className="mx-auto max-w-4xl px-5 py-10 sm:px-8"><Link href="/knowledge" className="text-blue-600 dark:text-blue-400">← 返回知识库</Link><article className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">{entry.title}</h1><p className="mt-2 text-sm text-zinc-500">来源：{entry.source_author || "社区作者"}{entry.source_post_id ? ` · 帖子 #${entry.source_post_id}` : ""}</p></div>{entry.needs_review && <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">来源待核对</span>}</div><div className="mt-8 space-y-8"><section><h2 className="mb-2 text-lg font-semibold">摘要</h2><SafeMarkdown content={entry.summary} /></section>{sections.map(([title, content]) => <section key={title}><h2 className="mb-2 text-lg font-semibold">{title}</h2><SafeMarkdown content={content} /></section>)}</div>{entry.tags.length > 0 && <div className="mt-8 flex flex-wrap gap-2 text-sm">{entry.tags.map((tag) => <span key={tag} className="rounded bg-zinc-200 px-2 py-1 dark:bg-zinc-800">#{tag}</span>)}</div>}</article>{links.length > 0 && <section className="mt-8"><h2 className="mb-3 text-xl font-bold">关联 Skill / Agent</h2><div className="grid gap-3 sm:grid-cols-2">{links.map((link) => products[link.id] ? <Link key={link.id} href={products[link.id].href} onClick={() => void clickProduct(link)} className="rounded-lg border border-zinc-200 p-4 hover:border-blue-400 dark:border-zinc-800"><span className="text-xs text-zinc-500">{link.product_type === "skill" ? "Skill" : "Agent"}</span><p className="mt-1 font-medium">{products[link.id].name}</p></Link> : <div key={link.id} className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">关联产品当前不可用</div>)}</div></section>}{message && <p className="mt-4 text-sm text-amber-700">{message}</p>}</main></div>;
}
