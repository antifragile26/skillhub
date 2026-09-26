"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProductType = "skill";
type ProductPost = {
  id: string | number;
  title: string;
  content_type?: "discussion" | "question" | "case" | null;
  replies?: number | null;
  resolved?: boolean | null;
  created_at?: string | null;
};

function contentTypeLabel(value?: ProductPost["content_type"]) {
  if (value === "question") return "求助";
  if (value === "case") return "经验分享";
  return "讨论";
}

export default function ProductDiscussions({ productType, productId }: { productType: ProductType; productId: string | number }) {
  const [posts, setPosts] = useState<ProductPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const links = await supabase
        .from("content_product_links")
        .select("content_id,created_at")
        .eq("content_type", "post")
        .eq("product_type", productType)
        .eq("product_id", String(productId))
        .order("created_at", { ascending: false })
        .limit(20);
      if (links.error) {
        if (active) { setError("相关讨论暂时加载失败，请稍后重试。"); setLoading(false); }
        return;
      }
      const ids = [...new Set((links.data ?? []).map((item) => String(item.content_id)))];
      if (!ids.length) {
        if (active) { setPosts([]); setLoading(false); }
        return;
      }
      const result = await supabase
        .from("posts")
        .select("id,title,content_type,replies,resolved,created_at")
        .in("id", ids)
        .eq("status", "published")
        .is("deleted_at", null);
      if (result.error) {
        if (active) { setError("相关讨论暂时加载失败，请稍后重试。"); setLoading(false); }
        return;
      }
      const ordered = ((result.data ?? []) as ProductPost[])
        .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
        .slice(0, 5);
      if (active) { setPosts(ordered); setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [productId, productType]);

  const detailPath = `/skills/${encodeURIComponent(String(productId))}`;
  const returnTo = `${detailPath}`;
  const createPath = (contentType: "question" | "case") => `/forum/new?${new URLSearchParams({ contentType, productType, productId: String(productId), returnTo }).toString()}`;
  const forumPath = `/forum?${new URLSearchParams({ productType, productId: String(productId) }).toString()}`;

  return <section className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold">社区讨论</h2>
        <p className="mt-1 text-sm text-zinc-500">遇到问题可以求助，也可以分享你的使用经验。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={createPath("question")} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">遇到问题，发求助</Link>
        <Link href={createPath("case")} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-white dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">分享使用经验</Link>
      </div>
    </div>
    {loading && <p className="mt-5 text-sm text-zinc-500">正在加载讨论...</p>}
    {!loading && error && <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{error}</p>}
    {!loading && !error && posts.length === 0 && <div className="mt-5 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700"><p>还没有相关讨论，发起第一条吧。</p><Link href={createPath("question")} className="mt-3 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">发起讨论</Link></div>}
    {!loading && !error && posts.length > 0 && <div className="mt-5 space-y-2">{posts.map((post) => <Link key={post.id} href={`/forum/${post.id}`} className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-blue-700"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{contentTypeLabel(post.content_type)}</span>{post.resolved && <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">已解决</span>}<span className="font-medium text-zinc-900 dark:text-zinc-100">{post.title}</span></div><div className="mt-2 flex gap-3 text-xs text-zinc-500"><span>{post.replies ?? 0} 回复</span>{post.created_at && <span>{new Date(post.created_at).toLocaleDateString("zh-CN")}</span>}</div></Link>)}</div>}
    <div className="mt-4"><Link href={forumPath} className="text-sm font-medium text-blue-600 hover:underline">查看全部讨论 →</Link></div>
  </section>;
}
