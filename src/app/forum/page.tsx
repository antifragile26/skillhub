import { supabase } from "@/lib/supabase";
import ForumBrowser from "@/components/ForumBrowser";
import Link from "next/link";
import { FORUM_PAGE_SIZE } from "@/lib/forumValidation";
import { categoryFilterValues, normalizeForumCategory } from "@/lib/forumCategories";
import type { ProductSelection } from "@/components/ProductSearchSelect";

export const dynamic = "force-dynamic";
type SearchParams = { q?: string; sort?: string; category?: string; featured?: string; page?: string; productType?: string; productId?: string };
type ForumPost = { id: string | number; title: string; content?: string | null; category?: string | null; content_type?: string | null; author?: string | null; replies?: number | null; upvotes?: number | null; downvotes?: number | null; created_at?: string | null; updated_at?: string | null; is_featured?: boolean; pin_rank?: number | null; resolved?: boolean; linkedSkills?: { id: string; name: string }[] };
function escapeSearch(value: string) { return value.replace(/[%,()]/g, " ").trim().slice(0, 100); }

export default async function ForumPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const sort = params.sort === "hot" ? "hot" : "latest";
  const queryText = escapeSearch(params.q ?? "");
  const category = normalizeForumCategory(params.category);
  const categoryValues = categoryFilterValues(category);
  const featured = params.featured === "1";
  const productType = params.productType === "skill" ? "skill" : "";
  const legacyAgentFilter = params.productType === "agent";
  const productId = params.productId?.trim() ?? "";
  let selectedProduct: ProductSelection | null = null;
  if (productType && productId) {
    const product = await supabase.from("skills").select("id,name,description").eq("id", productId).eq("status", "published").is("deleted_at", null).maybeSingle();
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
    let query = supabase.from("posts").select("*", { count: "exact" }).eq("status", "published").is("deleted_at", null);
    if (productPostIds) query = query.in("id", productPostIds);
    if (queryText) query = query.or(`title.ilike.%${queryText}%,content.ilike.%${queryText}%`);
    if (categoryValues.length) query = query.in("category", categoryValues);
    if (featured) query = query.eq("is_featured", true);
    query = query.order("pin_rank", { ascending: true, nullsFirst: false });
    query = sort === "hot" ? query.order("upvotes", { ascending: false }).order("replies", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }) : query.order("created_at", { ascending: false }).order("id", { ascending: false });
    const { data, count, error } = await query.range(from, from + FORUM_PAGE_SIZE - 1);
    posts = (data ?? []) as ForumPost[];
    total = count ?? 0;
    loadError ||= error?.message ?? "";
    if (error) {
      let fallback = supabase.from("posts").select("*", { count: "exact" }).eq("status", "published").is("deleted_at", null);
      if (productPostIds) fallback = fallback.in("id", productPostIds);
      if (queryText) fallback = fallback.or(`title.ilike.%${queryText}%,content.ilike.%${queryText}%`);
      if (categoryValues.length) fallback = fallback.in("category", categoryValues);
      if (featured) fallback = fallback.eq("is_featured", true);
      fallback = fallback.order("pin_rank", { ascending: true, nullsFirst: false });
      fallback = sort === "hot" ? fallback.order("upvotes", { ascending: false }).order("replies", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }) : fallback.order("created_at", { ascending: false }).order("id", { ascending: false });
      const fallbackResult = await fallback.range(from, from + FORUM_PAGE_SIZE - 1);
      posts = (fallbackResult.data ?? []) as ForumPost[];
      total = fallbackResult.count ?? 0;
      loadError ||= fallbackResult.error?.message ?? "";
    }
  }

  const showFeatured = page === 1 && !queryText && !categoryValues.length && !featured && !selectedProduct;
  const featuredResult = showFeatured
    ? await supabase.from("posts").select("*").eq("status", "published").is("deleted_at", null).eq("is_featured", true).order("pin_rank", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null, error: null };
  if (featuredResult.error) loadError ||= featuredResult.error.message;
  const featuredPostRaw = featuredResult.data as ForumPost | null;
  const visibleIds = [...new Set([...posts.map((post) => String(post.id)), ...(featuredPostRaw ? [String(featuredPostRaw.id)] : [])])];
  const [linksResult, openQuestionsResult] = await Promise.all([
    visibleIds.length ? supabase.from("content_product_links").select("content_id,product_id").eq("content_type", "post").eq("product_type", "skill").in("content_id", visibleIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("posts").select("id", { count: "exact", head: true }).in("category", ["question", "bug_report"]).eq("status", "published").eq("resolved", false).is("deleted_at", null),
  ]);
  if (linksResult.error) loadError ||= linksResult.error.message;
  if (openQuestionsResult.error) loadError ||= openQuestionsResult.error.message;
  const linkedIds = [...new Set((linksResult.data ?? []).map((link) => String(link.product_id)))];
  const skillResult = linkedIds.length
    ? await supabase.from("skills").select("id,name").in("id", linkedIds).eq("status", "published").is("deleted_at", null)
    : { data: [], error: null };
  if (skillResult.error) loadError ||= skillResult.error.message;
  const skillNames = new Map((skillResult.data ?? []).map((skill) => [String(skill.id), skill.name]));
  const skillLinksByPost = new Map<string, { id: string; name: string }[]>();
  for (const link of linksResult.data ?? []) {
    const id = String(link.product_id);
    const name = skillNames.get(id);
    if (!name) continue;
    const postId = String(link.content_id);
    skillLinksByPost.set(postId, [...(skillLinksByPost.get(postId) ?? []), { id, name }]);
  }
  const postsWithDetails = await Promise.all(posts.map(async (post) => {
    let result = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id).is("deleted_at", null);
    if (result.error) result = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id);
    return { ...post, replies: result.count ?? post.replies ?? 0, linkedSkills: skillLinksByPost.get(String(post.id)) ?? [] };
  }));
  const featuredPost = featuredPostRaw ? { ...featuredPostRaw, linkedSkills: skillLinksByPost.get(String(featuredPostRaw.id)) ?? [] } : null;

  const pageCount = Math.ceil(total / FORUM_PAGE_SIZE);
  const returnParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value || (legacyAgentFilter && (key === "productType" || key === "productId"))) return;
    returnParams.set(key, value);
  });
  const returnTo = `/forum${returnParams.toString() ? `?${returnParams.toString()}` : ""}`;
  const newPostHref = `/forum/new?returnTo=${encodeURIComponent(returnTo)}${selectedProduct ? `&productType=skill&productId=${encodeURIComponent(selectedProduct.id)}` : ""}`;
  const productPath = productType && productId ? `/skills/${encodeURIComponent(productId)}` : "";

  return <main className="hub-page forum-page">
    <div className="hub-container max-w-5xl py-7 sm:py-10">{loadError && <div className="forum-load-error" role="status">部分论坛信息暂时没能加载，请稍后刷新。</div>}{productPath && <Link href={productPath} className="forum-return-skill">← 返回 {selectedProduct?.name ?? "Skill"}</Link>}<ForumBrowser posts={postsWithDetails} featuredPost={featuredPost} total={total} openQuestionCount={openQuestionsResult.count ?? 0} page={page} pageCount={pageCount} selectedProduct={selectedProduct} newPostHref={newPostHref} legacyAgentFilter={legacyAgentFilter} emptyMessage={featured ? undefined : productPath ? "这个 Skill 还没有关联讨论。你可以从 Skill 详情页发起第一条讨论。" : undefined} /></div>
  </main>;
}
