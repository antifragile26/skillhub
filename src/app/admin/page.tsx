"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { contentTypeLabels, getSupabaseErrorMessage, statusLabels } from "@/lib/batch2";
import { automatedReviewLabel, automatedReviewSummary } from "@/lib/moderation";
import { supabase } from "@/lib/supabase";

type PendingPost = { id: number; title: string; content: string; author: string; status: string; content_type: string; created_at: string; rejection_reason?: string | null; automated_review_status?: "not_run" | "clean" | "flagged"; automated_risk_score?: number; automated_labels?: string[] };
type Report = { id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string };
type Knowledge = { id: string; title: string; status: string; source_post_id?: number | null; summary: string; steps: string; conclusions: string; limitations: string; tags: string[] };
type Collection = { id: string; name: string; description: string; status: string };
type Stats = Record<string, number>;
type Feedback = { type: "success" | "error" | "info"; text: string };
type ActionResult = { error: { message: string } | null };

const panelClass = "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70";
const fieldClass = "w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";
const primaryButtonClass = "inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60";
const secondaryButtonClass = "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
const dangerButtonClass = "inline-flex items-center justify-center rounded-md border border-rose-300 bg-white px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/60";

export default function AdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [roleUserId, setRoleUserId] = useState("");
  const [roleValue, setRoleValue] = useState("operator");
  const [muteUntil, setMuteUntil] = useState("");
  const [linkForm, setLinkForm] = useState({ contentType: "post", contentId: "", productType: "skill", productId: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("");
  const [page, setPage] = useState(1);

  async function load() {
    const roleResult = await supabase.rpc("current_user_role");
    setRole((roleResult.data as string | null) ?? "member");
    if (roleResult.error || !["operator", "admin"].includes(String(roleResult.data))) return;
    const [postResult, reportResult, knowledgeResult, collectionsResult] = await Promise.all([
      supabase.from("posts").select("id,title,content,author,status,content_type,created_at,rejection_reason,automated_review_status,automated_risk_score,automated_labels").in("status", ["pending", "published", "unpublished"]).order("created_at", { ascending: true }).limit(50),
      supabase.from("content_reports").select("id,target_type,target_id,reason,status,created_at").eq("status", "open").order("created_at", { ascending: true }).limit(50),
      supabase.from("knowledge_entries").select("id,title,status,source_post_id,summary,steps,conclusions,limitations,tags").in("status", ["draft", "published"]).order("updated_at", { ascending: false }).limit(50),
      supabase.from("knowledge_collections").select("id,name,description,status").order("updated_at", { ascending: false }).limit(50),
    ]);
    setPosts((postResult.data ?? []) as PendingPost[]); setReports((reportResult.data ?? []) as Report[]); setKnowledge((knowledgeResult.data ?? []) as Knowledge[]); setCollections((collectionsResult.data ?? []) as Collection[]);
    const now = new Date(); const from = new Date(now); from.setDate(now.getDate() - 7); const statResult = await supabase.rpc("get_forum_stats", { p_from: from.toISOString(), p_to: now.toISOString() }); if (!statResult.error) setStats((statResult.data ?? null) as Stats | null);
  }

  function errorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : "操作失败，请稍后重试。";
    return getSupabaseErrorMessage(message);
  }

  async function runAction<T extends ActionResult>(key: string, request: () => PromiseLike<T>, successText: string, refresh = true) {
    setBusy(key);
    try {
      const result = await request();
      if (result.error) {
        setFeedback({ type: "error", text: errorMessage(result.error) });
        return;
      }
      setFeedback({ type: "success", text: successText });
      if (refresh) void load();
    } catch (error) {
      setFeedback({ type: "error", text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  // 后台首次加载需要把异步权限结果同步到页面状态；延后一拍避免 React effect 规则将其判定为同步级联更新。
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  async function moderate(post: PendingPost, decision: string) {
    const reason = decision === "approve" || decision === "restore" ? "" : window.prompt("请输入处理原因") ?? "";
    if (decision !== "approve" && decision !== "restore" && !reason.trim()) return;
    const successText = decision === "approve" ? "帖子已通过并发布。" : decision === "reject" ? "帖子已驳回。" : decision === "unpublish" ? "帖子已下架。" : "帖子状态已更新。";
    await runAction(`post-${post.id}`, () => supabase.rpc("moderate_post", { p_post_id: post.id, p_decision: decision, p_reason: reason }), successText);
  }
  async function feature(post: PendingPost, featured: boolean, pinRank: number | null) {
    const successText = pinRank !== null ? `帖子已置顶到第 ${pinRank} 位。` : featured ? "帖子已标记为精选。" : "精选状态已取消。";
    await runAction(`feature-${post.id}`, () => supabase.rpc("set_post_feature_flags", { p_post_id: post.id, p_featured: featured, p_pin_rank: pinRank }), successText);
  }
  async function resolve(report: Report, resultValue: string) {
    const reason = window.prompt("请输入处理原因") ?? "";
    if (!reason.trim()) return;
    const key = `report-${report.id}`;
    setBusy(key);
    try {
      const result = await supabase.rpc("resolve_report", { p_report_id: report.id, p_result: resultValue, p_reason: reason });
      if (result.error) {
        setFeedback({ type: "error", text: errorMessage(result.error) });
        return;
      }
      if (resultValue === "violation") {
        const moderationResult = report.target_type === "post"
          ? await supabase.rpc("moderate_post", { p_post_id: Number(report.target_id), p_decision: "unpublish", p_reason: reason })
          : report.target_type === "comment"
            ? await supabase.rpc("moderate_comment", { p_comment_id: report.target_id, p_decision: "unpublish", p_reason: reason })
            : null;
        if (moderationResult?.error) {
          setFeedback({ type: "error", text: `举报已记录，但内容下架失败：${errorMessage(moderationResult.error)}` });
          void load();
          return;
        }
      }
      setFeedback({ type: "success", text: resultValue === "violation" ? "举报已处理，相关内容已下架。" : "举报已处理。" });
      void load();
    } catch (error) {
      setFeedback({ type: "error", text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }
  async function createKnowledge(post: PendingPost) {
    await runAction(`knowledge-${post.id}`, () => supabase.rpc("create_knowledge_from_post", { p_post_id: post.id }), "知识草稿已创建，可继续编辑后发布。");
  }
  async function publishKnowledge(item: Knowledge) {
    await runAction(`publish-${item.id}`, () => supabase.rpc("publish_knowledge", { p_knowledge_id: item.id }), "知识条目已发布。");
  }
  async function saveKnowledge(item: Knowledge) {
    await runAction(`save-knowledge-${item.id}`, () => supabase.from("knowledge_entries").update({ title: item.title, summary: item.summary, steps: item.steps, conclusions: item.conclusions, limitations: item.limitations, tags: item.tags }).eq("id", item.id), "知识草稿已保存。");
  }
  async function createCollection() {
    const name = window.prompt("专题名称（1-80字）");
    if (!name?.trim()) return;
    const description = window.prompt("专题简介（可选）") ?? "";
    await runAction("collection-create", async () => supabase.from("knowledge_collections").insert({ name: name.trim(), description, status: "draft", created_by: (await supabase.auth.getUser()).data.user?.id }).select("id").single(), "专题草稿已创建。");
  }
  async function publishCollection(collection: Collection) {
    await runAction(`collection-${collection.id}`, () => supabase.from("knowledge_collections").update({ status: "published" }).eq("id", collection.id), "专题已发布。");
  }
  async function addKnowledgeToCollection(collection: Collection) {
    const knowledgeId = window.prompt("输入要加入的知识条目 UUID");
    if (!knowledgeId?.trim()) return;
    await runAction(`collection-item-${collection.id}`, async () => {
      const existing = await supabase.from("knowledge_collection_items").select("position").eq("collection_id", collection.id).order("position", { ascending: false }).limit(1);
      if (existing.error) return existing;
      const position = (existing.data?.[0]?.position ?? 0) + 1;
      return supabase.from("knowledge_collection_items").insert({ collection_id: collection.id, knowledge_id: knowledgeId.trim(), position });
    }, "知识已加入专题。", false);
  }
  async function addProductLink() {
    if (!linkForm.contentId.trim() || !linkForm.productId.trim()) {
      setFeedback({ type: "error", text: "请先填写内容 ID 和产品 ID。" });
      return;
    }
    await runAction("product-link", async () => supabase.from("content_product_links").insert({ content_type: linkForm.contentType, content_id: linkForm.contentId.trim(), product_type: linkForm.productType, product_id: linkForm.productId.trim(), created_by: (await supabase.auth.getUser()).data.user?.id }), "产品关联已保存。", false);
  }
  async function saveRole() {
    if (!roleUserId.trim()) {
      setFeedback({ type: "error", text: "请填写用户 UUID。" });
      return;
    }
    await runAction("role", () => supabase.from("user_roles").upsert({ user_id: roleUserId.trim(), role: roleValue, muted_until: muteUntil ? new Date(muteUntil).toISOString() : null }), "角色 / 禁言状态已保存。", false);
  }

  if (role === null) return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"><main className="mx-auto grid min-h-[55vh] max-w-6xl place-items-center px-5"><p className={`${panelClass} px-6 py-5 text-sm text-slate-600 dark:text-slate-300`}>正在检查后台权限…</p></main></div>;
  const filteredPosts = posts.filter((post) => (statusFilter === "all" || post.status === statusFilter) && (contentTypeFilter === "all" || post.content_type === contentTypeFilter) && (!authorFilter.trim() || post.author.toLowerCase().includes(authorFilter.trim().toLowerCase())));
  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / 20));
  const visiblePosts = filteredPosts.slice((page - 1) * 20, page * 20);
  const pendingPosts = visiblePosts.filter((post) => post.status === "pending");
  const publishedPosts = visiblePosts.filter((post) => post.status === "published");
  if (!["operator", "admin"].includes(role)) return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"><main className="mx-auto grid min-h-[55vh] max-w-6xl place-items-center px-5"><section className={`${panelClass} w-full max-w-xl p-8`}><h1 className="text-2xl font-bold">没有后台权限</h1><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">当前账号角色为成员。请由管理员在安全后台分配运营角色。</p><Link href="/forum" className={`${primaryButtonClass} mt-6`}>← 返回论坛</Link></section></main></div>;

  const postActionBusy = (postId: number) => busy === `post-${postId}`;
  const feedbackStyles = feedback?.type === "success"
    ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/80 dark:text-green-100"
    : feedback?.type === "error"
      ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/80 dark:text-red-100"
      : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/80 dark:text-blue-100";

  return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/forum" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">← 返回论坛</Link>
          <h1 className="mt-3 text-3xl font-bold">运营后台</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">角色：{role === "admin" ? "管理员" : "运营"} · 近 7 日统计</p>
        </div>
        <nav aria-label="后台快捷入口" className="flex flex-wrap gap-2">
          <Link href="/knowledge" className={secondaryButtonClass}>知识库</Link>
          <Link href="/collections" className={secondaryButtonClass}>专题</Link>
          <Link href="/admin/audit" className={secondaryButtonClass}>审计日志</Link>
        </nav>
      </header>

      <section aria-label="近七日数据" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {[["新增提交帖", "new_submissions"], ["新增回复", "new_replies"], ["活跃成员", "active_members"], ["新增知识", "new_knowledge"], ["待审核", "pending"], ["关联产品点击", "product_clicks"]].map(([label, key]) => <article key={key} className={`${panelClass} p-4`}>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{stats?.[key] ?? 0}</p>
        </article>)}
      </section>

      <section className={`${panelClass} mt-8 overflow-hidden`}>
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">审核与精选</h2><span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">{pendingPosts.length} 条待处理</span></div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">自动审核 Agent 会先处理低风险内容；命中风险规则的内容保留在这里等待人工确认。</p>
            </div>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
              <select aria-label="按状态筛选" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className={fieldClass}><option value="all">全部状态</option><option value="pending">待审核</option><option value="published">已发布</option><option value="unpublished">已下架</option></select>
              <select aria-label="按内容类型筛选" value={contentTypeFilter} onChange={(event) => { setContentTypeFilter(event.target.value); setPage(1); }} className={fieldClass}><option value="all">全部类型</option><option value="discussion">讨论</option><option value="question">问答</option><option value="case">案例</option></select>
              <input aria-label="按作者筛选" value={authorFilter} onChange={(event) => { setAuthorFilter(event.target.value); setPage(1); }} placeholder="按作者筛选" className={fieldClass} />
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          {pendingPosts.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-700">当前筛选下暂无待审核帖子。</p> : pendingPosts.map((post) => <article key={post.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">{statusLabels[post.status as keyof typeof statusLabels]}</span>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{contentTypeLabels[post.content_type as keyof typeof contentTypeLabels] ?? post.content_type}</span>
              {post.automated_review_status && <span className={`rounded px-2 py-0.5 text-xs ${post.automated_review_status === "flagged" ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-200" : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-200"}`}>{automatedReviewSummary(post.automated_review_status, post.automated_risk_score ?? 0)}</span>}
              <span className="ml-auto text-xs text-slate-500">{post.author} · {new Date(post.created_at).toLocaleDateString("zh-CN")}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">{post.title}</h3>
            {post.automated_labels?.length ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs leading-5 text-red-700 dark:bg-red-950/30 dark:text-red-200">命中规则：{post.automated_labels.map(automatedReviewLabel).join("、")}</p> : null}
            <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">{post.content}</p>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <button type="button" disabled={busy !== null} onClick={() => void moderate(post, "approve")} className={primaryButtonClass}>{postActionBusy(post.id) ? "处理中…" : "通过并发布"}</button>
              <button type="button" disabled={busy !== null} onClick={() => void moderate(post, "reject")} className={dangerButtonClass}>{postActionBusy(post.id) ? "处理中…" : "驳回"}</button>
            </div>
          </article>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:px-6">
          <span>第 {page} / {pageCount} 页 · 已加载 {filteredPosts.length} 条</span>
          <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className={secondaryButtonClass}>上一页</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className={secondaryButtonClass}>下一页</button></div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">已发布内容运营</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">精选、置顶、整理为知识，或在必要时将内容下架。</p></div><span className="text-sm text-slate-500">{publishedPosts.length} 条显示中</span></div>
        {publishedPosts.length === 0 ? <p className={`${panelClass} p-8 text-center text-sm text-slate-500`}>当前页没有已发布内容。</p> : <div className="grid gap-3 md:grid-cols-2">{publishedPosts.map((post) => <article key={post.id} className={`${panelClass} p-4`}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-slate-500 dark:text-slate-400">{contentTypeLabels[post.content_type as keyof typeof contentTypeLabels] ?? post.content_type} · {post.author}</p><Link href={`/forum/${post.id}`} className="mt-2 block font-semibold hover:text-blue-600 dark:hover:text-blue-400">{post.title}</Link></div><span className="shrink-0 rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-950/50 dark:text-green-200">已发布</span></div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button type="button" disabled={busy !== null} onClick={() => void feature(post, true, null)} className={secondaryButtonClass}>{busy === `feature-${post.id}` ? "保存中…" : "标记精选"}</button>
            <button type="button" disabled={busy !== null} onClick={() => void feature(post, true, 1)} className={secondaryButtonClass}>{busy === `feature-${post.id}` ? "保存中…" : "置顶第 1 位"}</button>
            <button type="button" disabled={busy !== null} onClick={() => void createKnowledge(post)} className={secondaryButtonClass}>{busy === `knowledge-${post.id}` ? "创建中…" : "整理为知识"}</button>
            <button type="button" disabled={busy !== null} onClick={() => void moderate(post, "unpublish")} className={dangerButtonClass}>{postActionBusy(post.id) ? "处理中…" : "下架"}</button>
          </div>
        </article>)}</div>}
      </section>

      <section className={`${panelClass} mt-8 overflow-hidden`}>
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">举报队列</h2><span className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-200">{reports.length} 条待处理</span></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">确认违规后会自动下架对应帖子或评论。</p></div>
        <div className="space-y-3 p-4 sm:p-6">{reports.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500 dark:border-slate-700">暂无未处理举报。</p> : reports.map((report) => <article key={report.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs text-slate-500 dark:text-slate-400">{report.target_type === "post" ? "帖子举报" : "评论举报"} · #{report.target_id}</p><p className="mt-2 font-medium">{report.reason}</p><p className="mt-1 text-xs text-slate-500">提交于 {new Date(report.created_at).toLocaleString("zh-CN")}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy !== null} onClick={() => void resolve(report, "violation")} className={dangerButtonClass}>{busy === `report-${report.id}` ? "处理中…" : "违规并下架"}</button><button type="button" disabled={busy !== null} onClick={() => void resolve(report, "no_violation")} className={secondaryButtonClass}>无违规</button><button type="button" disabled={busy !== null} onClick={() => void resolve(report, "merged")} className={secondaryButtonClass}>重复合并</button></div>
        </article>)}</div>
      </section>

      <section className="mt-8"><div className="mb-4"><h2 className="text-xl font-bold">知识发布</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">编辑草稿内容，核对后再发布到知识库。</p></div>
        <div className="space-y-3">{knowledge.length === 0 ? <p className={`${panelClass} p-8 text-center text-sm text-slate-500`}>暂无知识条目，可从已发布帖子中整理创建。</p> : knowledge.map((item) => <article key={item.id} className={`${panelClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs text-slate-500">知识条目</span><Link href={`/knowledge/${item.id}`} className="mt-1 block font-semibold hover:text-blue-600 dark:hover:text-blue-400">{item.title}</Link></div><span className={`rounded px-2 py-1 text-xs ${item.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"}`}>{item.status === "published" ? "已发布" : "草稿"}</span></div>
          {item.status === "draft" && <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 md:grid-cols-2"><input value={item.title} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, title: event.target.value } : value))} className={fieldClass} placeholder="标题" /><input value={item.summary} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, summary: event.target.value } : value))} className={fieldClass} placeholder="摘要" /><textarea value={item.steps} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, steps: event.target.value } : value))} className={`${fieldClass} min-h-28 resize-y`} placeholder="操作步骤" /><textarea value={item.conclusions} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, conclusions: event.target.value } : value))} className={`${fieldClass} min-h-28 resize-y`} placeholder="结论 / 效果" /><textarea value={item.limitations} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, limitations: event.target.value } : value))} className={`${fieldClass} min-h-24 resize-y md:col-span-2`} placeholder="限制条件" /><div className="flex flex-wrap gap-2 md:col-span-2"><button type="button" disabled={busy !== null} onClick={() => void saveKnowledge(item)} className={secondaryButtonClass}>{busy === `save-knowledge-${item.id}` ? "保存中…" : "保存草稿"}</button><button type="button" disabled={busy !== null} onClick={() => void publishKnowledge(item)} className={primaryButtonClass}>{busy === `publish-${item.id}` ? "发布中…" : "预览确认并发布"}</button></div></div>}
        </article>)}</div>
      </section>

      <section className={`${panelClass} mt-8 p-4 sm:p-5`}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">专题目录</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">将知识条目组织成主题专题。</p></div><button type="button" disabled={busy !== null} onClick={() => void createCollection()} className={primaryButtonClass}>{busy === "collection-create" ? "创建中…" : "＋ 新建专题"}</button></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{collections.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500 dark:border-slate-700 md:col-span-2">暂无专题。</p> : collections.map((collection) => <article key={collection.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{collection.name}</h3><span className={`rounded px-2 py-1 text-xs ${collection.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-200" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{collection.status === "published" ? "已发布" : "草稿"}</span></div><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{collection.description || "暂无简介"}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy !== null} onClick={() => void addKnowledgeToCollection(collection)} className={secondaryButtonClass}>{busy === `collection-item-${collection.id}` ? "处理中…" : "加入知识"}</button>{collection.status === "draft" && <button type="button" disabled={busy !== null} onClick={() => void publishCollection(collection)} className={primaryButtonClass}>{busy === `collection-${collection.id}` ? "发布中…" : "发布专题"}</button>}</div></article>)}</div>
      </section>

      <section className={`${panelClass} mt-8 p-4 sm:p-5`}><h2 className="text-xl font-bold">关联 Skill / Agent</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">关联内容与产品，并统计相关点击。</p><p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">产品 ID 可从产品详情 URL 获取；只接受已存在的产品。</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><select aria-label="内容类型" value={linkForm.contentType} onChange={(event) => setLinkForm((value) => ({ ...value, contentType: event.target.value }))} className={fieldClass}><option value="post">帖子 / 案例</option><option value="knowledge">知识</option></select><input aria-label="内容 ID" value={linkForm.contentId} onChange={(event) => setLinkForm((value) => ({ ...value, contentId: event.target.value }))} placeholder="内容 ID" className={fieldClass} /><select aria-label="产品类型" value={linkForm.productType} onChange={(event) => setLinkForm((value) => ({ ...value, productType: event.target.value }))} className={fieldClass}><option value="skill">Skill</option><option value="agent">Agent</option></select><input aria-label="产品 ID" value={linkForm.productId} onChange={(event) => setLinkForm((value) => ({ ...value, productId: event.target.value }))} placeholder="产品 ID" className={fieldClass} /><button type="button" disabled={busy !== null} onClick={() => void addProductLink()} className={primaryButtonClass}>{busy === "product-link" ? "保存中…" : "保存关联"}</button></div>
      </section>

      {role === "admin" && <section className={`${panelClass} mt-8 p-4 sm:p-5`}><h2 className="text-xl font-bold">用户角色与禁言</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">仅管理员可用。使用 Supabase 用户 UUID；不能移除最后一个管理员。</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input aria-label="用户 UUID" value={roleUserId} onChange={(event) => setRoleUserId(event.target.value)} placeholder="用户 UUID" className={fieldClass} /><select aria-label="用户角色" value={roleValue} onChange={(event) => setRoleValue(event.target.value)} className={fieldClass}><option value="member">成员</option><option value="operator">运营</option><option value="admin">管理员</option></select><input aria-label="禁言截止时间" type="datetime-local" value={muteUntil} onChange={(event) => setMuteUntil(event.target.value)} className={fieldClass} /><button type="button" disabled={busy !== null} onClick={() => void saveRole()} className={primaryButtonClass}>{busy === "role" ? "保存中…" : "保存角色 / 禁言"}</button></div></section>}

      <footer className="py-8 text-center text-xs text-slate-500">SkillHub · 运营后台</footer>
    </main>
    {feedback && <div className={`fixed bottom-5 right-5 z-50 flex w-[min(92vw,26rem)] items-start gap-3 rounded-lg border p-4 shadow-lg ${feedbackStyles}`} role={feedback.type === "error" ? "alert" : "status"} aria-live={feedback.type === "error" ? "assertive" : "polite"}>
      <span aria-hidden="true" className="mt-0.5 font-bold">{feedback.type === "success" ? "✓" : feedback.type === "error" ? "!" : "i"}</span><p className="min-w-0 flex-1 text-sm leading-6">{feedback.text}</p><button type="button" onClick={() => setFeedback(null)} aria-label="关闭提示" className="rounded px-1 text-lg leading-none opacity-70 hover:opacity-100">×</button>
    </div>}
  </div>;
}
