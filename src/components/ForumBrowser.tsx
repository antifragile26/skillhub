"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, type ReactNode } from "react";
import { postCategories, categoryLabel, normalizeForumCategory } from "@/lib/forumCategories";
import ProductSearchSelect from "@/components/ProductSearchSelect";
import type { ProductSelection } from "@/components/ProductSearchSelect";

type LinkedSkill = { id: string; name: string };
type Post = { id: string | number; title: string; content?: string | null; category?: string | null; content_type?: string | null; author?: string | null; replies?: number | null; upvotes?: number | null; downvotes?: number | null; created_at?: string | null; updated_at?: string | null; is_featured?: boolean; pin_rank?: number | null; resolved?: boolean; linkedSkills?: LinkedSkill[] };

function ForumIcon({ kind, className = "h-4 w-4" }: { kind: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    question: <><path d="M8.5 8.5a3.6 3.6 0 1 1 6.2 2.5c-1.5 1.4-2.7 1.7-2.7 3.5" /><path d="M12 18h.01" /><circle cx="12" cy="12" r="9" /></>,
    showcase: <><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></>,
    skill_exchange: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.5 5.5a1.6 1.6 0 0 0 2.3 2.3l5.5-5.5a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.3-2.3 2.4-2.4Z" /><path d="m4.5 4.5 3.2 3.2" /></>,
    general: <><path d="M4 5.5h16v11H9l-5 3v-14Z" /><path d="M8 9h8M8 13h5" /></>,
    featured: <><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    reply: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-1.5 1v-8.5A7.5 7.5 0 0 1 11 4h1.5" /><path d="m15 7 2-2 2 2M17 5v7" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.8 8.2-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2Z" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...common}>{paths[kind] ?? paths.general}</svg>;
}

function excerptFor(content?: string | null) {
  if (!content) return "打开帖子查看讨论内容。";
  const paragraph = content.split(/\n\s*\n/).map((part) => part.trim()).find((part) => part && !part.startsWith(">"));
  return (paragraph ?? content)
    .replace(/```[\s\S]*?```/g, "代码示例")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`~>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function PostState({ post }: { post: Post }) {
  if (post.resolved) return <span className="forum-state forum-state-resolved"><span aria-hidden="true">✓</span> 已解决</span>;
  if (normalizeForumCategory(post.category) === "question") return <span className="forum-state forum-state-open"><span aria-hidden="true">●</span> {post.replies ? `${post.replies} 条回应` : "等你来答"}</span>;
  return <span className="forum-state forum-state-discussion"><span aria-hidden="true">●</span> 经验交流</span>;
}

function PostRow({ post, featured = false }: { post: Post; featured?: boolean }) {
  const label = categoryLabel(post.category) || "综合讨论";
  const categoryKey = normalizeForumCategory(post.category) || "general";
  return <article className={`forum-post-row forum-post-${categoryKey} ${featured ? "forum-post-featured" : ""}`}>
    <div className="forum-post-icon" aria-hidden="true"><ForumIcon kind={categoryKey} className="h-5 w-5" /></div>
    <div className="min-w-0 flex-1">
      <div className="forum-post-meta"><span className={`forum-category-label forum-category-${categoryKey}`}><ForumIcon kind={categoryKey} className="h-3.5 w-3.5" />{label}</span>{post.is_featured && <span className="forum-featured-label"><ForumIcon kind="featured" className="h-3.5 w-3.5" />官方精选</span>}<PostState post={post} />{post.content_type === "case" && <span className="forum-mini-label">案例</span>}</div>
      <Link href={`/forum/${post.id}`} className="forum-post-title">{post.title}</Link>
      <p className="forum-post-excerpt">{excerptFor(post.content)}</p>
      <div className="forum-post-footer"><span className="forum-author"><span className="forum-avatar" aria-hidden="true">{(post.author || "社").charAt(0)}</span>{post.author || "社区用户"}</span><span className="forum-post-stat"><ForumIcon kind="reply" />{post.replies ?? 0} 回复</span>{post.created_at && <time className="forum-post-date" dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString("zh-CN")}</time>}</div>
      {post.linkedSkills && post.linkedSkills.length > 0 && <div className="forum-linked-skills" aria-label="讨论的 Skill">{post.linkedSkills.map((skill) => <Link key={skill.id} href={`/skills/${encodeURIComponent(skill.id)}`} className="forum-skill-link"><span className="forum-skill-glyph" aria-hidden="true">S</span><span><small>讨论的 Skill</small>{skill.name}</span><span className="forum-skill-open" aria-hidden="true">↗</span></Link>)}</div>}
    </div>
    <Link href={`/forum/${post.id}`} className="forum-row-open" aria-label={`打开帖子：${post.title}`}><span aria-hidden="true">↗</span></Link>
  </article>;
}

export default function ForumBrowser({ posts, featuredPost, total, openQuestionCount, page, pageCount, selectedProduct, newPostHref, emptyMessage, legacyAgentFilter = false }: { posts: Post[]; featuredPost: Post | null; total: number; openQuestionCount: number; page: number; pageCount: number; selectedProduct: ProductSelection | null; newPostHref: string; emptyMessage?: string; legacyAgentFilter?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const sort = searchParams.get("sort") === "hot" ? "hot" : "latest";
  const category = normalizeForumCategory(searchParams.get("category"));
  const featured = searchParams.get("featured") === "1";
  function navigate(next: { q?: string; sort?: string; category?: string; featured?: boolean; product?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (legacyAgentFilter) { params.delete("productType"); params.delete("productId"); }
    if (next.q !== undefined) { if (next.q) params.set("q", next.q); else params.delete("q"); }
    if (next.sort !== undefined) { if (next.sort === "latest") params.delete("sort"); else params.set("sort", next.sort); }
    if (next.category !== undefined) {
      if (next.category) params.set("category", next.category); else params.delete("category");
      params.delete("featured");
    }
    if (next.featured !== undefined) {
      if (next.featured) { params.set("featured", "1"); params.delete("category"); }
      else params.delete("featured");
    }
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

  const showFeatured = Boolean(featuredPost && page === 1 && !query && !category && !featured && !selectedProduct);
  const listPosts = showFeatured && featuredPost ? posts.filter((post) => String(post.id) !== String(featuredPost.id)) : posts;

  return <div className="forum-browser">
    <section className="forum-masthead">
      <div className="forum-masthead-copy"><div className="forum-masthead-kicker"><span className="forum-kicker-orbit" aria-hidden="true"><ForumIcon kind="compass" className="h-4 w-4" /></span>SkillHub 交流现场</div><h1 className="forum-masthead-title">遇到的难题，<br /><span>也许别人刚好走过。</span></h1><p className="forum-masthead-description">聊聊 Skill 怎么用、哪里卡住了、哪些经验值得留下。问题可以很具体，经验也不必完美。</p><div className="forum-masthead-actions"><Link href={newPostHref} className="forum-compose-button"><span aria-hidden="true">＋</span>发起讨论</Link><Link href="/skills" className="forum-discover-link"><ForumIcon kind="compass" />浏览 Skills</Link></div><div className="forum-masthead-stats"><span><b>{total}</b> 条公开讨论</span><span className="forum-stat-divider" aria-hidden="true" /><Link href="/forum?category=question"><i aria-hidden="true" />{openQuestionCount} 个问题待回应</Link></div></div>
      <div className="forum-map-art" aria-hidden="true"><div className="forum-map-orbit forum-map-orbit-one" /><div className="forum-map-orbit forum-map-orbit-two" /><svg viewBox="0 0 440 300" fill="none"><path d="M72 218 157 165 231 198 311 109 370 150" /><path d="m157 165 8-93 146 37M231 198l59 63 80-111" /><circle cx="72" cy="218" r="7" /><circle cx="157" cy="165" r="9" /><circle cx="165" cy="72" r="6" /><circle cx="231" cy="198" r="11" /><circle cx="311" cy="109" r="8" /><circle cx="370" cy="150" r="6" /><circle cx="290" cy="261" r="6" /></svg><span className="forum-map-node forum-map-node-main"><ForumIcon kind="compass" className="h-6 w-6" /><b>Skill</b></span><span className="forum-map-node forum-map-node-help"><ForumIcon kind="question" />求助</span><span className="forum-map-node forum-map-node-note"><ForumIcon kind="showcase" />经验</span><span className="forum-map-caption">连接问题 · 经验 · Skills</span></div>
    </section>

    {showFeatured && featuredPost && <section className="forum-featured-card" aria-labelledby="forum-featured-heading"><div className="forum-featured-art" aria-hidden="true"><span>✳</span><i /><i /><i /></div><div className="forum-featured-copy"><div className="forum-featured-topline"><span className="forum-featured-label"><ForumIcon kind="featured" />编辑精选</span><span className="forum-featured-context">值得从这里开始</span></div><h2 id="forum-featured-heading"><Link href={`/forum/${featuredPost.id}`}>{featuredPost.title}</Link></h2><p>{excerptFor(featuredPost.content)}</p><div className="forum-featured-bottom"><span><ForumIcon kind="reply" />{featuredPost.replies ?? 0} 条回应</span>{featuredPost.linkedSkills?.map((skill) => <Link key={skill.id} href={`/skills/${encodeURIComponent(skill.id)}`} className="forum-featured-skill"><span className="forum-skill-glyph" aria-hidden="true">S</span>讨论的 Skill：{skill.name}</Link>)}<Link href={`/forum/${featuredPost.id}`} className="forum-featured-open">加入这场讨论 <span aria-hidden="true">↗</span></Link></div></div></section>}

    <form onSubmit={submitSearch} className="forum-search-form"><label htmlFor="forum-search" className="sr-only">搜索论坛</label><ForumIcon kind="search" className="forum-search-icon" /><input id="forum-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜一个工作场景、问题或 Skill 名称" className="forum-search-input" /><button type="submit" className="forum-search-button">搜索讨论</button></form>
    {legacyAgentFilter && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"><span>Agent 作品筛选已停止使用。历史帖子仍可阅读，你可以筛选 Skill 或查看全部讨论。</span><Link href="/forum" className="font-medium underline">查看全部讨论</Link></div>}
    {selectedProduct && <section className="forum-filtered-skill"><div><span className="forum-filtered-skill-mark">S</span><div><h2>正在看：{selectedProduct.name}</h2><p>这里只显示与这个 Skill 关联的讨论。</p></div></div><ProductSearchSelect selected={selectedProduct} onSelect={(product) => navigate({ product: `${product.type}:${product.id}`, page: 1 })} onClear={() => navigate({ product: "", page: 1 })} /></section>}
    {!selectedProduct && <section className="forum-skill-filter"><div className="forum-filter-heading"><div><h2>从一个 Skill 开始</h2><p>筛选与它有关的求助和经验。</p></div><span className="forum-filter-spark" aria-hidden="true">✳</span></div><ProductSearchSelect selected={null} onSelect={(product) => navigate({ product: `${product.type}:${product.id}`, page: 1 })} onClear={() => navigate({ product: "", page: 1 })} /></section>}

    <div className="forum-controls"><div className="forum-sort-tabs" aria-label="排序"><button type="button" onClick={() => navigate({ sort: "latest", page: 1 })} aria-pressed={sort === "latest"}>最近聊起</button><button type="button" onClick={() => navigate({ sort: "hot", page: 1 })} aria-pressed={sort === "hot"}>大家在聊</button></div><div className="forum-category-tabs" aria-label="论坛分类"><button type="button" onClick={() => navigate({ category: "", page: 1 })} aria-pressed={!category && !featured}><ForumIcon kind="general" />全部</button><button type="button" onClick={() => navigate({ featured: !featured, page: 1 })} aria-pressed={featured} className="forum-tab-featured"><ForumIcon kind="featured" />官方精选</button>{postCategories.map((item) => <button key={item.value} type="button" onClick={() => navigate({ category: category === item.value ? "" : item.value, page: 1 })} aria-pressed={category === item.value && !featured} className={`forum-tab-${item.value}`}><ForumIcon kind={item.value} />{item.label}</button>)}</div></div>
    <div className="forum-list-heading"><div><span className="forum-list-eyebrow">社区正在发生</span><h2>{featured ? "官方精选" : category ? categoryLabel(category) : "最近的讨论"}</h2></div><p>{total} 条 · 第 {page}/{Math.max(pageCount, 1)} 页</p></div>
    <div className="forum-post-list">{listPosts.length === 0 ? <div className="forum-empty-state"><span className="forum-empty-icon"><ForumIcon kind={featured ? "featured" : "question"} className="h-7 w-7" /></span><h3>{emptyMessage ?? (featured ? "精选内容还在路上" : "暂时没有匹配的讨论")}</h3><p>{featured ? "先看看最新讨论，或分享一个你正在解决的问题。" : "换个关键词或分类试试，也可以发起第一条讨论。"}</p><Link href={featured ? "/forum" : newPostHref} className="forum-empty-action">{featured ? "回到全部讨论" : "发起讨论"}</Link></div> : listPosts.map((post) => <PostRow key={post.id} post={post} featured={featured || post.is_featured} />)}</div>
    {pageCount > 1 && <nav className="forum-pagination" aria-label="论坛分页"><button type="button" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })}>← 上一页</button><span>{page} <i>/</i> {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => navigate({ page: page + 1 })}>下一页 →</button></nav>}
  </div>;
}
