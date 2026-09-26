import { supabase } from "@/lib/supabase";
import ForumBrowser from "@/components/ForumBrowser";
import Link from "next/link";
import { FORUM_PAGE_SIZE } from "@/lib/forumValidation";
import type { ProductSelection } from "@/components/ProductSearchSelect";

export const dynamic = "force-dynamic";
type SearchParams = { q?: string; sort?: string; category?: string; page?: string; productType?: string; productId?: string };
type ForumPost = { id: string | number; title: string; category?: string | null; content_type?: string | null; author?: string | null; replies?: number | null; upvotes?: number | null; downvotes?: number | null; created_at?: string | null; updated_at?: string | null; is_featured?: boolean; pin_rank?: number | null; resolved?: boolean };
function escapeSearch(value: string) { return value.replace(/[%,()]/g, " ").trim().slice(0, 100); }

export default async function ForumPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const sort = params.sort === "hot" ? "hot" : "latest";
  const queryText = escapeSearch(params.q ?? "");
  const category = params.category ?? "";
  const productType = params.productType === "skill" ? "skill" : "";
  const legacyAgentFilter = params.productType === "agent";
  const productId = params.productId?.trim() ?? "";
  let selectedProduct: ProductSelection | null = null;
  if (productType && productId) {
    const product = await supabase.from("skills").select("id,name,description").eq("id", productId).eq("status", "published").maybeSingle();
    selectedProduct = product.data
      ? { type: "skill", id: String(product.data.id), name: product.data.name, description: product.data.description }
      : { type: "skill", id: productId, name: "当前 Skill 暂不可访问" };
  }
  const from = (page - 1) * FORUM_PAGE_SIZE;
  let productPostIds: string[] | null = null;
  let loadError = "";
  if (productType && productId) {
    const linkedIds: string[] = [];
    for (let start = 0; ; start += 1000) {
      const links = await supabase.from("content_product_links").select("content_id").eq("content_type", "post").eq("product_type", productType).eq("product_id", productId).range(start, start + 999);
      if (links.error) { loadError = links.error.message; break; }
      linkedIds.push(...(links.data ?? []).map((item) => String(item.content_id)));
      if ((links.data ?? []).length < 1000) break;
    }
    productPostIds = [...new Set(linkedIds)];
  }
  let posts: ForumPost[] = [];
  let total = 0;
  if (!productPostIds || productPostIds.length > 0) {
    let query = supabase.from("posts").select("*", { count: "exact" }).is("deleted_at", null);
    if (productPostIds) query = query.in("id", productPostIds);
    if (queryText) query = query.or(`title.ilike.%${queryText}%,content.ilike.%${queryText}%`);
    if (category) query = query.eq("category", category);
    query = query.order("pin_rank", { ascending: true, nullsFirst: false });
    query = sort === "hot" ? query.order("upvotes", { ascending: false }).order("replies", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }) : query.order("created_at", { ascending: false }).order("id", { ascending: false });
    const { data, count, error } = await query.range(from, from + FORUM_PAGE_SIZE - 1);
    posts = (data ?? []) as ForumPost[];
    total = count ?? 0;
    loadError ||= error?.message ?? "";
    if (error) {
      let fallback = supabase.from("posts").select("*", { count: "exact" }).is("deleted_at", null);
      if (productPostIds) fallback = fallback.in("id", productPostIds);
      if (queryText) fallback = fallback.or(`title.ilike.%${queryText}%,content.ilike.%${queryText}%`);
      if (category) fallback = fallback.eq("category", category);
      fallback = fallback.order("pin_rank", { ascending: true, nullsFirst: false });
      fallback = sort === "hot" ? fallback.order("upvotes", { ascending: false }).order("replies", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }) : fallback.order("created_at", { ascending: false }).order("id", { ascending: false });
      const fallbackResult = await fallback.range(from, from + FORUM_PAGE_SIZE - 1);
      posts = (fallbackResult.data ?? []) as ForumPost[];
      total = fallbackResult.count ?? 0;
      loadError ||= fallbackResult.error?.message ?? "";
    }
  }
  const postsWithReplies = await Promise.all(posts.map(async (post) => {
    let result = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id).is("deleted_at", null);
    if (result.error) result = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id);
    return { ...post, replies: result.count ?? post.replies ?? 0 };
  }));
  const pageCount = Math.ceil(total / FORUM_PAGE_SIZE);
  const returnParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value || (legacyAgentFilter && (key === "productType" || key === "productId"))) return;
    returnParams.set(key, value);
  });
  const returnTo = `/forum${returnParams.toString() ? `?${returnParams.toString()}` : ""}`;

  const productPath = productType && productId ? `/skills/${encodeURIComponent(productId)}` : "";
  return <main className="hub-page">
    <section className="hub-container max-w-5xl py-8 sm:py-10"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="hub-kicker">SkillHub 社区</p><h1 className="hub-page-heading mt-2">论坛</h1><p className="mt-2 text-sm hub-muted">{selectedProduct ? `正在查看与「${selectedProduct.name}」关联的讨论` : "围绕 Skills 提问、反馈问题、分享经验。"}</p></div><div className="flex items-center gap-3">{productPath && <Link href={productPath} className="hub-button-secondary">返回 Skill</Link>}<Link href={`/forum/new?returnTo=${encodeURIComponent(returnTo)}${selectedProduct ? `&productType=skill&productId=${encodeURIComponent(selectedProduct.id)}` : ""}`} className="hub-button-primary">发布讨论</Link></div></div>{loadError && <div className="mb-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">论坛数据加载异常，请稍后重试。</div>}<ForumBrowser posts={postsWithReplies} total={total} page={page} pageCount={pageCount} selectedProduct={selectedProduct} legacyAgentFilter={legacyAgentFilter} emptyMessage={productPath ? "这个 Skill 还没有关联讨论。你可以从 Skill 详情页发起第一条讨论。" : undefined} /></section>
  </main>;
}
