"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { postCategories, categoryLabel } from "@/lib/forumCategories";

type Post = { id: string | number; title: string; category?: string | null; author?: string | null; replies?: number | null; upvotes?: number | null; downvotes?: number | null; created_at?: string | null; updated_at?: string | null };

export default function ForumBrowser({ posts, total, page, pageCount }: { posts: Post[]; total: number; page: number; pageCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const sort = searchParams.get("sort") === "hot" ? "hot" : "latest";
  const category = searchParams.get("category") ?? "";

  function navigate(next: { q?: string; sort?: string; category?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) { if (next.q) params.set("q", next.q); else params.delete("q"); }
    if (next.sort !== undefined) { if (next.sort === "latest") params.delete("sort"); else params.set("sort", next.sort); }
    if (next.category !== undefined) { if (next.category) params.set("category", next.category); else params.delete("category"); }
    if (next.page !== undefined && next.page > 1) params.set("page", String(next.page)); else params.delete("page");
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); navigate({ q: query.trim(), page: 1 }); }

  return <>
    <form onSubmit={submitSearch} className="mb-6 flex gap-2"><label htmlFor="forum-search" className="sr-only">搜索论坛</label><input id="forum-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索论坛" className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200" /><button type="submit" className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">搜索</button></form>
    <div className="mb-6 flex flex-wrap items-center gap-3"><div className="flex gap-1 text-sm" aria-label="排序"><button type="button" onClick={() => navigate({ sort: "latest", page: 1 })} aria-pressed={sort === "latest"} className={`rounded-md px-3 py-1.5 ${sort === "latest" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}>最新</button><button type="button" onClick={() => navigate({ sort: "hot", page: 1 })} aria-pressed={sort === "hot"} className={`rounded-md px-3 py-1.5 ${sort === "hot" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}>最热</button></div><div className="flex flex-wrap gap-2 text-sm" aria-label="分类"><button type="button" onClick={() => navigate({ category: "", page: 1 })} aria-pressed={!category} className={`rounded-md px-3 py-1.5 ${!category ? "bg-blue-600 text-white" : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"}`}>全部</button>{postCategories.map((item) => <button key={item.value} type="button" onClick={() => navigate({ category: category === item.value ? "" : item.value, page: 1 })} aria-pressed={category === item.value} className={`rounded-md px-3 py-1.5 ${category === item.value ? "bg-blue-600 text-white" : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"}`}>{item.label}</button>)}</div></div>
    <p className="mb-3 text-sm text-zinc-500">共 {total} 篇 · 第 {page}/{Math.max(pageCount, 1)} 页</p>
    <div className="space-y-3">{posts.length === 0 ? <p className="rounded-lg border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">没有匹配的帖子。可以更换关键词或分类后重试。</p> : posts.map((post) => <Link key={post.id} href={`/forum/${post.id}`} className="flex items-start gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-600"><div className="flex shrink-0 flex-col items-center text-xs"><span className="text-green-600 dark:text-green-500">▲ {post.upvotes ?? 0}</span><span className="text-red-600 dark:text-red-500">▼ {post.downvotes ?? 0}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded border border-zinc-300 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:border-zinc-700">{categoryLabel(post.category) || "综合讨论"}</span><span className="font-medium">{post.title}</span></div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-[10px]">{(post.author || "社").charAt(0)}</span><span className="text-purple-500 dark:text-purple-400">{post.author || "社区用户"}</span><span>· {post.replies ?? 0} 回复</span>{post.created_at && <span>· {new Date(post.created_at).toLocaleDateString("zh-CN")}</span>}{post.updated_at && post.updated_at !== post.created_at && <span>· 已编辑</span>}</div></div></Link>)}</div>
    {pageCount > 1 && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="论坛分页"><button type="button" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700">上一页</button><span className="text-sm text-zinc-500">{page} / {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => navigate({ page: page + 1 })} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700">下一页</button></nav>}
  </>;
}
