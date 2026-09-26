"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { postCategories, categoryLabel } from "@/lib/forumCategories";
import ProductSearchSelect from "@/components/ProductSearchSelect";
import type { ProductSelection } from "@/components/ProductSearchSelect";

type Post = { id: string | number; title: string; category?: string | null; content_type?: string | null; author?: string | null; replies?: number | null; upvotes?: number | null; downvotes?: number | null; created_at?: string | null; updated_at?: string | null; is_featured?: boolean; pin_rank?: number | null; resolved?: boolean };

export default function ForumBrowser({ posts, total, page, pageCount, selectedProduct, emptyMessage, legacyAgentFilter = false }: { posts: Post[]; total: number; page: number; pageCount: number; selectedProduct: ProductSelection | null; emptyMessage?: string; legacyAgentFilter?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const sort = searchParams.get("sort") === "hot" ? "hot" : "latest";
  const category = searchParams.get("category") ?? "";
  function navigate(next: { q?: string; sort?: string; category?: string; product?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (legacyAgentFilter) { params.delete("productType"); params.delete("productId"); }
    if (next.q !== undefined) { if (next.q) params.set("q", next.q); else params.delete("q"); }
    if (next.sort !== undefined) { if (next.sort === "latest") params.delete("sort"); else params.set("sort", next.sort); }
    if (next.category !== undefined) { if (next.category) params.set("category", next.category); else params.delete("category"); }
    if (next.product !== undefined) {
      const separator = next.product.indexOf(":");
      const type = separator > 0 ? next.product.slice(0, separator) : "";
      const id = separator > 0 ? next.product.slice(separator + 1) : "";
      if (type === "skill" && id) { params.set("productType", type); params.set("productId", id); }
      else { params.delete("productType"); params.delete("productId"); }
    }
    if (next.page !== undefined && next.page > 1) params.set("page", String(next.page)); else params.delete("page");
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); navigate({ q: query.trim(), page: 1 }); }

  return <>
    <form onSubmit={submitSearch} className="mb-5 flex gap-2"><label htmlFor="forum-search" className="sr-only">搜索论坛</label><input id="forum-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、问题或经验" className="hub-input min-w-0 flex-1" /><button type="submit" className="hub-button-primary">搜索</button></form>
    {legacyAgentFilter && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"><span>Agent 作品筛选已停止使用。历史帖子仍可阅读，你可以筛选 Skill 或查看全部讨论。</span><Link href="/forum" className="font-medium underline">查看全部讨论</Link></div>}
    <section className="hub-surface mb-6 p-4 sm:p-5"><h2 className="mb-1 text-sm font-semibold">按关联 Skill 筛选</h2><p className="mb-3 text-xs hub-muted">搜索并选择一个 Skill，只查看与它关联的讨论。</p><ProductSearchSelect selected={selectedProduct} onSelect={(product) => navigate({ product: `${product.type}:${product.id}`, page: 1 })} onClear={() => navigate({ product: "", page: 1 })} /></section>
    <div className="mb-6 flex flex-wrap items-center gap-3"><div className="flex gap-1 text-sm" aria-label="排序"><button type="button" onClick={() => navigate({ sort: "latest", page: 1 })} aria-pressed={sort === "latest"} className={`rounded-md px-3 py-1.5 ${sort === "latest" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}>最新</button><button type="button" onClick={() => navigate({ sort: "hot", page: 1 })} aria-pressed={sort === "hot"} className={`rounded-md px-3 py-1.5 ${sort === "hot" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}>最热</button></div><div className="flex flex-wrap gap-2 text-sm" aria-label="分类"><button type="button" onClick={() => navigate({ category: "", page: 1 })} aria-pressed={!category} className={`rounded-md px-3 py-1.5 ${!category ? "bg-blue-600 text-white" : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"}`}>全部</button>{postCategories.map((item) => <button key={item.value} type="button" onClick={() => navigate({ category: category === item.value ? "" : item.value, page: 1 })} aria-pressed={category === item.value} className={`rounded-md px-3 py-1.5 ${category === item.value ? "bg-blue-600 text-white" : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"}`}>{item.label}</button>)}</div></div>
    <p className="mb-3 text-sm hub-muted">共 {total} 篇 · 第 {page}/{Math.max(pageCount, 1)} 页</p>
    <div className="space-y-3">{posts.length === 0 ? <p className="hub-surface py-12 text-center text-sm hub-muted">{emptyMessage ?? "没有匹配的帖子。可以更换关键词或分类后重试。"}</p> : posts.map((post) => <Link key={post.id} href={`/forum/${post.id}`} className="hub-surface group flex items-start gap-4 p-4 transition hover:border-[var(--accent)] sm:p-5"><div className="flex shrink-0 flex-col items-center text-xs"><span className="font-semibold text-[var(--positive)]">▲ {post.upvotes ?? 0}</span><span className="mt-1 hub-muted">▼ {post.downvotes ?? 0}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="hub-chip">{categoryLabel(post.category) || "综合讨论"}</span>{post.content_type === "case" && <span className="hub-chip hub-chip-active">经验分享</span>}{post.resolved && <span className="hub-chip">已解决</span>}{post.is_featured && <span className="hub-chip">精选</span>}{post.pin_rank && <span className="hub-chip">置顶</span>}<span className="font-semibold group-hover:text-[var(--accent-strong)]">{post.title}</span></div><div className="mt-2 flex flex-wrap items-center gap-2 text-xs hub-muted"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">{(post.author || "社").charAt(0)}</span><span>{post.author || "社区用户"}</span><span>· {post.replies ?? 0} 回复</span>{post.created_at && <span>· {new Date(post.created_at).toLocaleDateString("zh-CN")}</span>}{post.updated_at && post.updated_at !== post.created_at && <span>· 已编辑</span>}</div></div></Link>)}</div>
    {pageCount > 1 && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="论坛分页"><button type="button" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700">上一页</button><span className="text-sm text-zinc-500">{page} / {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => navigate({ page: page + 1 })} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700">下一页</button></nav>}
  </>;
}
