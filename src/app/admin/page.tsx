"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { contentTypeLabels, getSupabaseErrorMessage, statusLabels } from "@/lib/batch2";
import { automatedReviewLabel, automatedReviewSummary } from "@/lib/moderation";
import { isKnowledgeCategory, knowledgeCategories } from "@/lib/knowledgeCategories";
import { skillCategoryLabel } from "@/lib/skillCategories";
import { supabase } from "@/lib/supabase";

type PendingPost = { id: number; title: string; content: string; author: string; status: string; content_type: string; created_at: string; is_featured?: boolean; pin_rank?: number | null; rejection_reason?: string | null; automated_review_status?: "not_run" | "clean" | "flagged"; automated_risk_score?: number; automated_labels?: string[] };
type SkillReview = { id: number; name: string; version: string | null; description: string | null; category: string | null; created_at: string; submitted_at: string | null; package_name: string | null; package_size: number | null; user_id: string | null; status?: string; deleted_at?: string | null };
type Report = { id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string };
type Knowledge = { id: string; title: string; status: string; source_post_id?: number | null; summary: string; scenario: string; steps: string; conclusions: string; limitations: string; tags: string[] };
type KnowledgeSource = { knowledge_id: string; post_id: number; position: number };
type Collection = { id: string; name: string; description: string; status: string };
type CollectionItem = { collection_id: string; knowledge_id: string; position: number; knowledge: { id: string; title: string; status: string; needs_review: boolean; deleted_at: string | null } | null };
type Stats = Record<string, number>;
type Feedback = { type: "success" | "error" | "info"; text: string };
type ActionResult = { error: { message: string } | null };

const panelClass = "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70";
const fieldClass = "w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";
const primaryButtonClass = "inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60";
const secondaryButtonClass = "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
const dangerButtonClass = "inline-flex items-center justify-center rounded-md border border-rose-300 bg-white px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/60";
const managedListClass = "max-h-[28rem] overflow-y-auto overscroll-contain [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500";

export default function AdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [skillReviews, setSkillReviews] = useState<SkillReview[]>([]);
  const [managedSkills, setManagedSkills] = useState<SkillReview[]>([]);
  const [skillReviewError, setSkillReviewError] = useState("");
  const [postCount, setPostCount] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<Record<string, number[]>>({});
  const [editingKnowledgeSourcesId, setEditingKnowledgeSourcesId] = useState<string | null>(null);
  const [additionalSourceDraft, setAdditionalSourceDraft] = useState("");
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [knowledgeEditOriginal, setKnowledgeEditOriginal] = useState<Knowledge | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionItems, setCollectionItems] = useState<Record<string, CollectionItem[]>>({});
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

  const load = useCallback(async () => {
    const [userResult, roleResult] = await Promise.all([supabase.auth.getUser(), supabase.rpc("current_user_role")]);
    if (roleResult.error) { setRole("member"); return; }
    if (!userResult.data.user) { setRole("guest"); return; }
    setRole((roleResult.data as string | null) ?? "member");
    if (!["operator", "admin"].includes(String(roleResult.data))) return;
    let postQuery = supabase.from("posts").select("id,title,content,author,status,content_type,created_at,is_featured,pin_rank,rejection_reason,automated_review_status,automated_risk_score,automated_labels", { count: "exact" }).in("status", ["pending", "published", "unpublished"]).order("created_at", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
    if (statusFilter !== "all") postQuery = postQuery.eq("status", statusFilter);
    if (contentTypeFilter !== "all") postQuery = postQuery.eq("content_type", contentTypeFilter);
    if (authorFilter.trim()) postQuery = postQuery.ilike("author", `%${authorFilter.trim().replace(/[%_]/g, "\\$&")}%`);
    const [postResult, reportResult, knowledgeResult, collectionsResult, skillResult, managedSkillResult] = await Promise.all([
      postQuery,
      supabase.from("content_reports").select("id,target_type,target_id,reason,status,created_at").eq("status", "open").order("created_at", { ascending: true }).limit(50),
      supabase.from("knowledge_entries").select("id,title,status,source_post_id,summary,scenario,steps,conclusions,limitations,tags").in("status", ["draft", "published"]).order("updated_at", { ascending: false }).limit(50),
      supabase.from("knowledge_collections").select("id,name,description,status").order("updated_at", { ascending: false }).limit(50),
      supabase.from("skills").select("id,name,version,description,category,created_at,submitted_at,package_name,package_size,user_id").eq("status", "pending").order("submitted_at", { ascending: true }).limit(20),
      supabase.from("skills").select("id,name,version,description,category,created_at,submitted_at,package_name,package_size,user_id,status,deleted_at").or("status.eq.published,deleted_at.not.is.null").order("updated_at", { ascending: false }).limit(100),
    ]);
    const knowledgeRows = (knowledgeResult.data ?? []) as Knowledge[];
    const sourceResult = knowledgeRows.length > 0
      ? await supabase.from("knowledge_post_sources").select("knowledge_id,post_id,position").in("knowledge_id", knowledgeRows.map((item) => item.id)).order("position", { ascending: true })
      : { data: [] };
    const sourceMap: Record<string, number[]> = {};
    for (const source of (sourceResult.data ?? []) as KnowledgeSource[]) {
      sourceMap[source.knowledge_id] ??= [];
      sourceMap[source.knowledge_id].push(source.post_id);
    }
    const collectionRows = (collectionsResult.data ?? []) as Collection[];
    const collectionItemResult = collectionRows.length > 0
      ? await supabase.from("knowledge_collection_items").select("collection_id,knowledge_id,position,knowledge:knowledge_entries(id,title,status,needs_review,deleted_at)").in("collection_id", collectionRows.map((item) => item.id)).order("position", { ascending: true })
      : { data: [], error: null };
    const itemMap: Record<string, CollectionItem[]> = {};
    for (const item of (collectionItemResult.data ?? []) as Array<Omit<CollectionItem, "knowledge"> & { knowledge: CollectionItem["knowledge"] | CollectionItem["knowledge"][] }>) {
      itemMap[item.collection_id] ??= [];
      itemMap[item.collection_id].push({ ...item, knowledge: Array.isArray(item.knowledge) ? item.knowledge[0] ?? null : item.knowledge });
    }
    if (collectionItemResult.error) setFeedback({ type: "error", text: "专题目录加载失败，请刷新后再审核。" });
    setPosts((postResult.data ?? []) as PendingPost[]); setPostCount(postResult.count ?? 0); setReports((reportResult.data ?? []) as Report[]); setKnowledge(knowledgeRows); setKnowledgeSources(sourceMap); setCollections(collectionRows); setCollectionItems(itemMap);
    setSkillReviews((skillResult.data ?? []) as SkillReview[]); setSkillReviewError(skillResult.error ? `Skill 审核队列加载失败：${skillResult.error.message}` : "");
    setManagedSkills((managedSkillResult.data ?? []) as SkillReview[]);
    const now = new Date(); const from = new Date(now); from.setDate(now.getDate() - 7); const statResult = await supabase.rpc("get_forum_stats", { p_from: from.toISOString(), p_to: now.toISOString() }); if (!statResult.error) setStats((statResult.data ?? null) as Stats | null);
  }, [authorFilter, contentTypeFilter, page, statusFilter]);

  function errorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "操作失败，请稍后重试。";
    return getSupabaseErrorMessage(message);
  }

  async function runAction<T extends ActionResult>(key: string, request: () => PromiseLike<T>, successText: string, refresh = true): Promise<boolean> {
    setBusy(key);
    try {
      const result = await request();
      if (result.error) {
        setFeedback({ type: "error", text: errorMessage(result.error) });
        return false;
      }
      setFeedback({ type: "success", text: successText });
      if (refresh) void load();
      return true;
    } catch (error) {
      setFeedback({ type: "error", text: errorMessage(error) });
      return false;
    } finally {
      setBusy(null);
    }
  }

  // 后台首次加载需要把异步权限结果同步到页面状态；延后一拍避免 React effect 规则将其判定为同步级联更新。
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function moderate(post: PendingPost, decision: string) {
    const reason = decision === "approve" || decision === "restore" ? "" : window.prompt("请输入处理原因") ?? "";
    if (decision !== "approve" && decision !== "restore" && !reason.trim()) return;
    const successText = decision === "approve" ? "帖子已通过并发布。" : decision === "reject" ? "帖子已驳回。" : decision === "unpublish" ? "帖子已下架。" : "帖子状态已更新。";
    await runAction(`post-${post.id}`, () => supabase.rpc("moderate_post", { p_post_id: post.id, p_decision: decision, p_reason: reason }), successText);
  }
  async function moderateSkill(skill: SkillReview, decision: "approve" | "reject" | "delete" | "restore") {
    if (decision === "delete" && !window.confirm(`将「${skill.name}」从公开 Skill 目录移除？关联讨论和文件会保留，之后可恢复。`)) return;
    const reason = decision === "reject" || decision === "delete" ? window.prompt(decision === "reject" ? "请填写驳回原因（会通知作者）：" : "请填写移除原因：") ?? "" : "";
    if ((decision === "reject" || decision === "delete") && !reason.trim()) return;
    const successText = decision === "approve" ? `Skill「${skill.name}」已通过并发布。` : decision === "reject" ? `Skill「${skill.name}」已驳回。` : decision === "delete" ? `Skill「${skill.name}」已从公开目录移除，可恢复。` : `Skill「${skill.name}」已恢复展示。`;
    await runAction(`skill-${skill.id}`, () => supabase.rpc("moderate_skill", { p_skill_id: skill.id, p_decision: decision, p_reason: reason }), successText);
  }
  async function feature(post: PendingPost, featured: boolean, pinRank: number | null, changed: "featured" | "pin") {
    const successText = changed === "featured"
      ? featured ? "帖子已标记为精选。" : "精选状态已取消。"
      : pinRank !== null ? `帖子已置顶到第 ${pinRank} 位。` : "帖子已取消置顶。";
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
            : report.target_type === "skill"
              ? await supabase.rpc("moderate_skill", { p_skill_id: Number(report.target_id), p_decision: "delete", p_reason: reason })
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
  async function generateKnowledge() {
    setBusy("knowledge-generate");
    try {
      const response = await fetch("/api/admin/knowledge/generate", { method: "POST", credentials: "same-origin" });
      const result = (await response.json()) as { error?: string; title?: string; warning?: string };
      if (!response.ok) {
        setFeedback({ type: "error", text: result.error || "知识草稿生成失败，请稍后重试。" });
        return;
      }
      setFeedback({ type: result.warning ? "info" : "success", text: result.warning ? `「${result.title || "新知识"}」${result.warning}` : `已生成「${result.title || "新知识"}」草稿，请核对来源和内容后发布。` });
      await load();
      document.getElementById("knowledge-publishing")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setFeedback({ type: "error", text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }
  function startEditingKnowledgeSources(item: Knowledge) {
    setEditingKnowledgeSourcesId(item.id);
    setAdditionalSourceDraft((knowledgeSources[item.id] ?? []).filter((id) => id !== item.source_post_id).join(", "));
  }
  async function saveKnowledgeSources(item: Knowledge) {
    const parts = additionalSourceDraft.trim() ? additionalSourceDraft.trim().split(/[,，\s]+/) : [];
    const ids = parts.map(Number);
    if (ids.length > 9 || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      setFeedback({ type: "error", text: "请输入最多 9 个有效帖子 ID，用逗号分隔。" });
      return;
    }
    const saved = await runAction(`sources-${item.id}`, () => supabase.rpc("set_knowledge_post_sources", { p_knowledge_id: item.id, p_additional_post_ids: ids }), "来源帖子已更新。" );
    if (saved) setEditingKnowledgeSourcesId(null);
  }
  async function publishKnowledge(item: Knowledge) {
    if (item.tags.length !== 1 || !isKnowledgeCategory(item.tags[0])) {
      setFeedback({ type: "error", text: "发布前请选择一个知识分类。" });
      return;
    }
    await runAction(`publish-${item.id}`, async () => {
      const saved = await supabase.from("knowledge_entries").update({ title: item.title, summary: item.summary, scenario: item.scenario, steps: item.steps, conclusions: item.conclusions, limitations: item.limitations, tags: item.tags }).eq("id", item.id);
      if (saved.error) return saved;
      return supabase.rpc("publish_knowledge", { p_knowledge_id: item.id });
    }, "知识条目已审核发布。");
  }
  async function saveKnowledge(item: Knowledge) {
    if (item.tags.length > 1 || (item.tags.length === 1 && !isKnowledgeCategory(item.tags[0])) || (item.status === "published" && item.tags.length !== 1)) {
      setFeedback({ type: "error", text: "知识只能选择一个固定分类。" });
      return;
    }
    const saved = await runAction(`save-knowledge-${item.id}`, () => supabase.from("knowledge_entries").update({ title: item.title, summary: item.summary, scenario: item.scenario, steps: item.steps, conclusions: item.conclusions, limitations: item.limitations, tags: item.tags }).eq("id", item.id), item.status === "published" ? "知识条目已更新并保持发布。" : "知识草稿已保存。");
    if (saved && item.status === "published") {
      setEditingKnowledgeId(null);
      setKnowledgeEditOriginal(null);
    }
  }
  function startEditingKnowledge(item: Knowledge) {
    setKnowledgeEditOriginal({ ...item, tags: [...item.tags] });
    setEditingKnowledgeId(item.id);
  }
  function cancelEditingKnowledge(item: Knowledge) {
    if (knowledgeEditOriginal?.id === item.id) {
      setKnowledge((items) => items.map((value) => value.id === item.id ? knowledgeEditOriginal : value));
    }
    setEditingKnowledgeId(null);
    setKnowledgeEditOriginal(null);
  }
  async function createCollection() {
    const name = window.prompt("专题名称（1-80字）");
    if (!name?.trim()) return;
    const description = window.prompt("专题简介（可选）") ?? "";
    await runAction("collection-create", async () => supabase.from("knowledge_collections").insert({ name: name.trim(), description, status: "draft", created_by: (await supabase.auth.getUser()).data.user?.id }).select("id").single(), "专题草稿已创建。");
  }
  async function generateCollection() {
    setBusy("collection-generate");
    try {
      const response = await fetch("/api/admin/collections/generate", { method: "POST", credentials: "same-origin" });
      const result = (await response.json()) as { error?: string; name?: string };
      if (!response.ok) {
        setFeedback({ type: "error", text: result.error || "专题生成失败，请稍后重试。" });
        return;
      }
      setFeedback({ type: "success", text: `已生成「${result.name || "新专题"}」草稿，请检查内容和顺序后发布。` });
      await load();
    } catch (error) {
      setFeedback({ type: "error", text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }
  async function editCollection(collection: Collection) {
    const name = window.prompt("专题名称（1-80字）", collection.name);
    if (name === null) return;
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 80) { setFeedback({ type: "error", text: "专题名称需为 1 到 80 字。" }); return; }
    const description = window.prompt("专题简介", collection.description);
    if (description === null) return;
    if (description.length > 2000) { setFeedback({ type: "error", text: "专题简介不能超过 2000 字。" }); return; }
    await runAction(`collection-edit-${collection.id}`, () => supabase.from("knowledge_collections").update({ name: trimmedName, description: description.trim() }).eq("id", collection.id), "专题草稿已更新。");
  }
  async function publishCollection(collection: Collection) {
    const items = collectionItems[collection.id] ?? [];
    if (items.length < 2) { setFeedback({ type: "error", text: "专题至少需要两条知识才能发布。" }); return; }
    if (items.some((item) => !item.knowledge || item.knowledge.status !== "published" || item.knowledge.needs_review || item.knowledge.deleted_at)) {
      setFeedback({ type: "error", text: "专题中有未发布或待复核的知识，请先调整目录。" });
      return;
    }
    await runAction(`collection-${collection.id}`, async () => {
      const currentItems = await supabase.from("knowledge_collection_items").select("knowledge_id").eq("collection_id", collection.id);
      if (currentItems.error) return currentItems;
      const ids = (currentItems.data ?? []).map((item) => item.knowledge_id);
      if (ids.length < 2) return { error: { message: "专题至少需要两条知识才能发布。" } };
      const currentKnowledge = await supabase.from("knowledge_entries").select("id").in("id", ids).eq("status", "published").is("deleted_at", null).eq("needs_review", false);
      if (currentKnowledge.error) return currentKnowledge;
      if (currentKnowledge.data?.length !== ids.length) return { error: { message: "专题中有未发布或待复核的知识，请先调整目录。" } };
      return supabase.from("knowledge_collections").update({ status: "published" }).eq("id", collection.id);
    }, "专题已审核发布。");
  }
  async function discardCollection(collection: Collection) {
    await runAction(`collection-discard-${collection.id}`, () => supabase.from("knowledge_collections").update({ status: "unpublished" }).eq("id", collection.id), "专题草稿已停用。");
  }
  async function removeCollectionItem(collection: Collection, knowledgeId: string) {
    await runAction(`collection-remove-${collection.id}-${knowledgeId}`, () => supabase.from("knowledge_collection_items").delete().eq("collection_id", collection.id).eq("knowledge_id", knowledgeId), "知识已从专题草稿移除。");
  }
  async function moveCollectionItem(collection: Collection, knowledgeId: string, direction: -1 | 1) {
    const items = collectionItems[collection.id] ?? [];
    const index = items.findIndex((item) => item.knowledge_id === knowledgeId);
    const neighbor = items[index + direction];
    if (index < 0 || !neighbor) return;
    const current = items[index];
    const temporaryPosition = Math.max(...items.map((item) => item.position)) + 1;
    setBusy(`collection-move-${collection.id}`);
    try {
      const move = (id: string, position: number) => supabase.from("knowledge_collection_items").update({ position }).eq("collection_id", collection.id).eq("knowledge_id", id);
      const first = await move(current.knowledge_id, temporaryPosition);
      if (first.error) throw first.error;
      const second = await move(neighbor.knowledge_id, current.position);
      if (second.error) throw second.error;
      const third = await move(current.knowledge_id, neighbor.position);
      if (third.error) throw third.error;
      setFeedback({ type: "success", text: "阅读顺序已更新。" });
    } catch (error) {
      setFeedback({ type: "error", text: `调整顺序未完成：${errorMessage(error)}。请核对当前目录。` });
    } finally {
      await load();
      setBusy(null);
    }
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
    if (linkForm.productType !== "skill") {
      setFeedback({ type: "error", text: "现在只支持关联 Skill。" });
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
  const pageCount = Math.max(1, Math.ceil(postCount / 20));
  const visiblePosts = posts;
  const pendingPosts = visiblePosts.filter((post) => post.status === "pending");
  const publishedPosts = visiblePosts.filter((post) => post.status === "published");
  if (!["operator", "admin"].includes(role)) return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"><main className="mx-auto grid min-h-[55vh] max-w-6xl place-items-center px-5"><section className={`${panelClass} w-full max-w-xl p-8`}><h1 className="text-2xl font-bold">{role === "guest" ? "请先登录" : "没有后台权限"}</h1><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{role === "guest" ? "登录运营账号后即可进入内容审核和社区管理。" : "当前账号没有运营权限，请联系管理员分配合适的角色。"}</p>{role === "guest" ? <Link href="/login?returnTo=%2Fadmin" className={`${primaryButtonClass} mt-6`}>登录</Link> : <Link href="/forum" className={`${primaryButtonClass} mt-6`}>← 返回论坛</Link>}</section></main></div>;

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
          <Link href="#skill-review" className={`${secondaryButtonClass} ${skillReviews.length > 0 ? "border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-200" : ""}`}>Skill 审核{skillReviews.length > 0 ? `（${skillReviews.length}）` : ""}</Link>
          <Link href="#skill-management" className={secondaryButtonClass}>已发布 Skill</Link>
          <Link href="#post-management" className={secondaryButtonClass}>已发布帖子</Link>
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
          <span>共 {postCount} 条 · 第 {page} / {pageCount} 页 · 当前页 {posts.length} 条</span>
          <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className={secondaryButtonClass}>上一页</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className={secondaryButtonClass}>下一页</button></div>
        </div>
      </section>

      <section id="skill-review" className={`${panelClass} mt-8 overflow-hidden`}>
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">Skill 审核</h2><span className={`rounded-md px-2 py-1 text-xs font-medium ${skillReviews.length > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{skillReviews.length} 条待处理</span></div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">用户提交的 Skill 会先进入这里。请检查名称、简介、分类和 ZIP 包信息，再通过发布或填写原因驳回。</p>
            </div>
            <Link href="/admin/skills" className={secondaryButtonClass}>打开完整审核页</Link>
          </div>
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          {skillReviewError && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{skillReviewError}</p>}
          {!skillReviewError && skillReviews.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-700">当前没有待审核的 Skill。</p>}
          {skillReviews.map((skill) => <article key={skill.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h3 className="font-mono text-lg font-semibold">{skill.name}</h3><p className="mt-1 text-sm text-slate-500">v{skill.version || "0.1.0"} · {skill.submitted_at ? `提交于 ${new Date(skill.submitted_at).toLocaleString("zh-CN")}` : "等待审核"}</p></div>
              <Link href={`/skills/${skill.id}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">预览详情</Link>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">{skill.description || "暂无简介"}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400"><span className="rounded bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">分类：{skillCategoryLabel(skill.category)}</span>{skill.package_name && <span>文件：{skill.package_name}</span>}{skill.package_size ? <span>· {(skill.package_size / 1024).toFixed(1)} KB</span> : null}</div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700"><button type="button" disabled={busy !== null} onClick={() => void moderateSkill(skill, "approve")} className={primaryButtonClass}>{busy === `skill-${skill.id}` ? "处理中…" : "通过并发布"}</button><button type="button" disabled={busy !== null} onClick={() => void moderateSkill(skill, "reject")} className={dangerButtonClass}>{busy === `skill-${skill.id}` ? "处理中…" : "驳回"}</button></div>
          </article>)}
        </div>
      </section>

      <section id="skill-management" className={`${panelClass} mt-8 scroll-mt-6 overflow-hidden`}>
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">已发布 Skill 管理</h2><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{managedSkills.length} 条</span></div><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">从公开目录移除会保留讨论、举报和文件；已移除的 Skill 可在此恢复。{managedSkills.length > 4 && " 列表内可滚动查看。"}</p></div>
        <div role="region" aria-label="已发布及已移除 Skill 列表" tabIndex={0} className={`${managedListClass} space-y-3 p-4 sm:p-6`}>{managedSkills.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500 dark:border-slate-700">没有已发布或已移除的 Skill。</p> : managedSkills.map((skill) => <article key={skill.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{skill.deleted_at ? <span className="font-mono font-semibold">{skill.name}</span> : <Link href={`/skills/${skill.id}`} className="font-mono font-semibold text-blue-700 hover:underline dark:text-blue-300">{skill.name}</Link>}<span className={`rounded px-2 py-0.5 text-xs ${skill.deleted_at ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>{skill.deleted_at ? "已移除，可恢复" : "公开展示中"}</span></div><p className="mt-1 text-sm text-slate-500">#{skill.id} · v{skill.version || "0.1.0"} · 更新于 {new Date(skill.created_at).toLocaleDateString("zh-CN")}</p></div><div className="flex shrink-0 gap-2">{skill.deleted_at ? <button type="button" disabled={busy !== null} onClick={() => void moderateSkill(skill, "restore")} className={secondaryButtonClass}>{busy === `skill-${skill.id}` ? "处理中…" : "恢复展示"}</button> : <button type="button" disabled={busy !== null} onClick={() => void moderateSkill(skill, "delete")} className={dangerButtonClass}>{busy === `skill-${skill.id}` ? "处理中…" : "删除 Skill"}</button>}</div></article>)}</div>
      </section>

      <section id="post-management" className={`${panelClass} mt-8 scroll-mt-6 overflow-hidden`}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6"><div><h2 className="text-xl font-bold">已发布帖子管理</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">精选、置顶、整理为知识，或在必要时下架。{publishedPosts.length > 4 && " 列表内可滚动查看。"}</p></div><div className="flex items-center gap-3">{statusFilter !== "published" && <button type="button" onClick={() => { setStatusFilter("published"); setPage(1); }} className={secondaryButtonClass}>仅看已发布</button>}<span className="text-sm text-slate-500 dark:text-slate-400">当前筛选页 {publishedPosts.length} 条</span></div></div>
        {publishedPosts.length === 0 ? <p className="m-4 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">当前筛选页没有已发布帖子，请调整上方筛选条件。</p> : <div role="region" aria-label="当前筛选页的已发布帖子列表" tabIndex={0} className={`${managedListClass} grid content-start gap-3 p-4 sm:p-6 md:grid-cols-2`}>{publishedPosts.map((post) => <article key={post.id} className={`${panelClass} p-4`}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs text-slate-500 dark:text-slate-400">{contentTypeLabels[post.content_type as keyof typeof contentTypeLabels] ?? post.content_type} · {post.author}</p><Link href={`/forum/${post.id}`} className="mt-2 block font-semibold hover:text-blue-600 dark:hover:text-blue-400">{post.title}</Link></div><span className="shrink-0 rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-950/50 dark:text-green-200">已发布</span></div>
          {(post.is_featured || post.pin_rank) && <div className="mt-3 flex flex-wrap gap-2">{post.is_featured && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">已精选</span>}{post.pin_rank && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">已置顶 · 第 {post.pin_rank} 位</span>}</div>}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button type="button" disabled={busy !== null} onClick={() => void feature(post, !post.is_featured, post.pin_rank ?? null, "featured")} className={secondaryButtonClass}>{busy === `feature-${post.id}` ? "保存中…" : post.is_featured ? "取消精选" : "设为精选"}</button>
            <button type="button" disabled={busy !== null} onClick={() => void feature(post, post.is_featured ?? false, post.pin_rank ? null : 1, "pin")} className={secondaryButtonClass}>{busy === `feature-${post.id}` ? "保存中…" : post.pin_rank ? "取消置顶" : "置顶第 1 位"}</button>
            <button type="button" disabled={busy !== null} onClick={() => void createKnowledge(post)} className={secondaryButtonClass}>{busy === `knowledge-${post.id}` ? "创建中…" : "整理为知识"}</button>
            <button type="button" disabled={busy !== null} onClick={() => void moderate(post, "unpublish")} className={dangerButtonClass}>{postActionBusy(post.id) ? "处理中…" : "下架"}</button>
          </div>
        </article>)}</div>}
        {statusFilter === "published" && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:px-6"><span>第 {page} / {pageCount} 页 · 共 {postCount} 条</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className={secondaryButtonClass}>上一页</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className={secondaryButtonClass}>下一页</button></div></div>}
      </section>

      <section className={`${panelClass} mt-8 overflow-hidden`}>
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">举报队列</h2><span className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-200">{reports.length} 条待处理</span></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">确认违规后会自动下架对应帖子、评论或 Skill。</p></div>
        <div className="space-y-3 p-4 sm:p-6">{reports.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500 dark:border-slate-700">暂无未处理举报。</p> : reports.map((report) => <article key={report.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs text-slate-500 dark:text-slate-400">{report.target_type === "post" ? "帖子举报" : report.target_type === "comment" ? "评论举报" : report.target_type === "skill" ? "Skill 举报" : "知识举报"} · {report.target_type === "skill" ? managedSkills.some((skill) => String(skill.id) === report.target_id && !!skill.deleted_at) ? `Skill #${report.target_id}（已移除）` : <Link className="text-blue-600 hover:underline dark:text-blue-400" href={`/skills/${report.target_id}`}>查看 Skill #{report.target_id}</Link> : `#${report.target_id}`}</p><p className="mt-2 font-medium">{report.reason}</p><p className="mt-1 text-xs text-slate-500">提交于 {new Date(report.created_at).toLocaleString("zh-CN")}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy !== null} onClick={() => void resolve(report, "violation")} className={dangerButtonClass}>{busy === `report-${report.id}` ? "处理中…" : "违规并下架"}</button><button type="button" disabled={busy !== null} onClick={() => void resolve(report, "no_violation")} className={secondaryButtonClass}>无违规</button><button type="button" disabled={busy !== null} onClick={() => void resolve(report, "merged")} className={secondaryButtonClass}>重复合并</button></div>
        </article>)}</div>
      </section>

      <section id="knowledge-publishing" className="mt-8 scroll-mt-6"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">知识发布</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">AI 从已发布讨论整理知识草稿；核对来源、分类和内容后再发布。已发布条目的修改会即时生效。</p></div><button type="button" disabled={busy !== null} onClick={() => void generateKnowledge()} className={primaryButtonClass}>{busy === "knowledge-generate" ? "正在整理讨论…" : "AI 生成知识草稿"}</button></div>
        <div className="space-y-3">{knowledge.length === 0 ? <p className={`${panelClass} p-8 text-center text-sm text-slate-500`}>暂无知识条目，可从已发布帖子中整理创建。</p> : knowledge.map((item) => <article key={item.id} className={`${panelClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs text-slate-500">知识条目</span><Link href={`/knowledge/${item.id}`} className="mt-1 block font-semibold hover:text-blue-600 dark:hover:text-blue-400">{item.title}</Link></div><span className={`rounded px-2 py-1 text-xs ${item.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"}`}>{item.status === "published" ? "已发布" : "草稿"}</span></div>
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-sm dark:bg-slate-800/60">
            <div className="flex flex-wrap items-center gap-2"><span className="text-slate-500 dark:text-slate-400">来源帖子：</span>{(knowledgeSources[item.id] ?? (item.source_post_id ? [item.source_post_id] : [])).map((postId) => <Link key={postId} href={`/forum/${postId}`} className="text-blue-600 hover:underline dark:text-blue-400">#{postId}</Link>)}<button type="button" disabled={busy !== null} onClick={() => startEditingKnowledgeSources(item)} className="ml-auto text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">管理来源</button></div>
            {editingKnowledgeSourcesId === item.id && <div className="mt-3 space-y-2"><p className="text-xs text-slate-500 dark:text-slate-400">主来源 #{item.source_post_id ?? "无"} 保留。输入其他已发布帖子的 ID，最多 9 条，用逗号分隔；留空会移除补充来源。</p><input aria-label="补充来源帖子 ID" value={additionalSourceDraft} onChange={(event) => setAdditionalSourceDraft(event.target.value)} className={fieldClass} placeholder="例如：36, 38" /><div className="flex gap-2"><button type="button" disabled={busy !== null} onClick={() => void saveKnowledgeSources(item)} className={secondaryButtonClass}>{busy === `sources-${item.id}` ? "保存中…" : "保存来源"}</button><button type="button" disabled={busy !== null} onClick={() => setEditingKnowledgeSourcesId(null)} className={secondaryButtonClass}>取消</button></div></div>}
          </div>
          {item.status === "published" && editingKnowledgeId !== item.id && <button type="button" disabled={busy !== null} onClick={() => startEditingKnowledge(item)} className={`${secondaryButtonClass} mt-4`}>编辑知识</button>}
          {(item.status === "draft" || editingKnowledgeId === item.id) && <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 md:grid-cols-2">
            <input aria-label="知识标题" value={item.title} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, title: event.target.value } : value))} className={fieldClass} placeholder="标题" />
            <input aria-label="知识摘要" value={item.summary} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, summary: event.target.value } : value))} className={fieldClass} placeholder="摘要" />
            <textarea aria-label="适用场景" value={item.scenario} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, scenario: event.target.value } : value))} className={`${fieldClass} min-h-24 resize-y md:col-span-2`} placeholder="适用场景" />
            <textarea aria-label="操作步骤" value={item.steps} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, steps: event.target.value } : value))} className={`${fieldClass} min-h-28 resize-y`} placeholder="操作步骤" />
            <textarea aria-label="结论与效果" value={item.conclusions} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, conclusions: event.target.value } : value))} className={`${fieldClass} min-h-28 resize-y`} placeholder="结论 / 效果" />
            <textarea aria-label="限制条件" value={item.limitations} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, limitations: event.target.value } : value))} className={`${fieldClass} min-h-24 resize-y md:col-span-2`} placeholder="限制条件" />
            <label className="grid gap-1 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">知识分类<select aria-label="知识分类" value={item.tags[0] ?? ""} onChange={(event) => setKnowledge((items) => items.map((value) => value.id === item.id ? { ...value, tags: event.target.value ? [event.target.value] : [] } : value))} className={fieldClass}><option value="">请选择分类</option>{knowledgeCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <div className="flex flex-wrap gap-2 md:col-span-2"><button type="button" disabled={busy !== null} onClick={() => void saveKnowledge(item)} className={item.status === "published" ? primaryButtonClass : secondaryButtonClass}>{busy === `save-knowledge-${item.id}` ? "保存中…" : item.status === "published" ? "保存修改" : "保存草稿"}</button>{item.status === "draft" ? <button type="button" disabled={busy !== null} onClick={() => void publishKnowledge(item)} className={primaryButtonClass}>{busy === `publish-${item.id}` ? "发布中…" : "审核并发布"}</button> : <button type="button" disabled={busy !== null} onClick={() => cancelEditingKnowledge(item)} className={secondaryButtonClass}>取消编辑</button>}</div>
          </div>}
        </article>)}</div>
      </section>

      <section className={`${panelClass} mt-8 p-4 sm:p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-xl font-bold">专题目录</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">AI 从已发布知识中整理阅读顺序，生成草稿后由运营核对并发布。</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={() => void generateCollection()} className={primaryButtonClass}>{busy === "collection-generate" ? "正在整理知识…" : "AI 生成专题草稿"}</button>
            <button type="button" disabled={busy !== null} onClick={() => void createCollection()} className={secondaryButtonClass}>{busy === "collection-create" ? "创建中…" : "手动新建"}</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {collections.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 px-5 py-7 text-center text-sm text-slate-500 dark:border-slate-700 md:col-span-2">暂无专题。可先用 AI 整理一份草稿。</p> : collections.map((collection) => {
            const items = collectionItems[collection.id] ?? [];
            return <article key={collection.id} className={`rounded-lg border p-4 ${collection.status === "draft" ? "border-blue-200 bg-blue-50/40 dark:border-blue-900/70 dark:bg-blue-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"}`}>
              <div className="flex items-start justify-between gap-3"><h3 className="font-semibold leading-6">{collection.name}</h3><span className={`shrink-0 rounded px-2 py-1 text-xs ${collection.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-200" : collection.status === "draft" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{collection.status === "published" ? "已发布" : collection.status === "draft" ? "待审核草稿" : "已停用"}</span></div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">{collection.description || "暂无简介"}</p>
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">阅读顺序 · {items.length} 条知识</p>
                {items.length === 0 ? <p className="mt-2 text-sm text-slate-500">尚未加入知识条目。</p> : <ol className="mt-2 space-y-2">{items.map((item, index) => <li key={item.knowledge_id} className="flex items-start gap-2 text-sm"><span className="min-w-5 text-slate-500">{index + 1}.</span><div className="min-w-0 flex-1"><Link href={`/knowledge/${item.knowledge_id}`} className="font-medium text-blue-700 underline-offset-2 hover:underline dark:text-blue-300">{item.knowledge?.title || item.knowledge_id}</Link>{item.knowledge && (item.knowledge.status !== "published" || item.knowledge.needs_review || item.knowledge.deleted_at) && <span className="ml-2 text-xs text-rose-600">需调整</span>}</div>{collection.status === "draft" && <div className="flex shrink-0 items-center gap-2"><button type="button" aria-label={`将${item.knowledge?.title || "知识"}上移`} disabled={busy !== null || index === 0} onClick={() => void moveCollectionItem(collection, item.knowledge_id, -1)} className="rounded px-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700">↑</button><button type="button" aria-label={`将${item.knowledge?.title || "知识"}下移`} disabled={busy !== null || index === items.length - 1} onClick={() => void moveCollectionItem(collection, item.knowledge_id, 1)} className="rounded px-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700">↓</button><button type="button" disabled={busy !== null} onClick={() => void removeCollectionItem(collection, item.knowledge_id)} className="text-xs text-rose-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-rose-300">移除</button></div>}</li>)}</ol>}
              </div>
              {collection.status === "draft" && <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy !== null} onClick={() => void editCollection(collection)} className={secondaryButtonClass}>编辑名称与简介</button><button type="button" disabled={busy !== null} onClick={() => void addKnowledgeToCollection(collection)} className={secondaryButtonClass}>加入知识</button><button type="button" disabled={busy !== null} onClick={() => void publishCollection(collection)} className={primaryButtonClass}>{busy === `collection-${collection.id}` ? "发布中…" : "审核并发布"}</button><button type="button" disabled={busy !== null} onClick={() => void discardCollection(collection)} className={dangerButtonClass}>不采用</button></div>}
            </article>;
          })}
        </div>
      </section>

      <section className={`${panelClass} mt-8 p-4 sm:p-5`}><h2 className="text-xl font-bold">关联 Skill</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">将帖子或知识关联到 Skill，并查看相关点击。</p><p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">Skill ID 可从 Skill 详情地址获取；历史 Agent 关联保持原样展示。</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><select aria-label="内容类型" value={linkForm.contentType} onChange={(event) => setLinkForm((value) => ({ ...value, contentType: event.target.value }))} className={fieldClass}><option value="post">帖子 / 案例</option><option value="knowledge">知识</option></select><input aria-label="内容 ID" value={linkForm.contentId} onChange={(event) => setLinkForm((value) => ({ ...value, contentId: event.target.value }))} placeholder="内容 ID" className={fieldClass} /><input aria-label="Skill ID" value={linkForm.productId} onChange={(event) => setLinkForm((value) => ({ ...value, productId: event.target.value }))} placeholder="Skill ID" className={fieldClass} /><button type="button" disabled={busy !== null} onClick={() => void addProductLink()} className={primaryButtonClass}>{busy === "product-link" ? "保存中…" : "关联 Skill"}</button></div>
      </section>

      {role === "admin" && <section className={`${panelClass} mt-8 p-4 sm:p-5`}><h2 className="text-xl font-bold">用户角色与禁言</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">仅管理员可用。使用 Supabase 用户 UUID；不能移除最后一个管理员。</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input aria-label="用户 UUID" value={roleUserId} onChange={(event) => setRoleUserId(event.target.value)} placeholder="用户 UUID" className={fieldClass} /><select aria-label="用户角色" value={roleValue} onChange={(event) => setRoleValue(event.target.value)} className={fieldClass}><option value="member">成员</option><option value="operator">运营</option><option value="admin">管理员</option></select><div className="grid gap-1"><label htmlFor="mute-until" className="text-xs font-medium text-slate-600 dark:text-slate-300">禁言截止时间</label><input id="mute-until" aria-describedby="mute-until-help" type="datetime-local" value={muteUntil} onChange={(event) => setMuteUntil(event.target.value)} className={fieldClass} /><p id="mute-until-help" className="text-xs leading-5 text-slate-500 dark:text-slate-400">到此时间前不能发帖、评论、投票或举报；留空即解除禁言。</p></div><button type="button" disabled={busy !== null} onClick={() => void saveRole()} className={primaryButtonClass}>{busy === "role" ? "保存中…" : "保存角色 / 禁言"}</button></div></section>}

      <footer className="py-8 text-center text-xs text-slate-500">SkillHub · 运营后台</footer>
    </main>
    {feedback && <div className={`fixed bottom-5 right-5 z-50 flex w-[min(92vw,26rem)] items-start gap-3 rounded-lg border p-4 shadow-lg ${feedbackStyles}`} role={feedback.type === "error" ? "alert" : "status"} aria-live={feedback.type === "error" ? "assertive" : "polite"}>
      <span aria-hidden="true" className="mt-0.5 font-bold">{feedback.type === "success" ? "✓" : feedback.type === "error" ? "!" : "i"}</span><p className="min-w-0 flex-1 text-sm leading-6">{feedback.text}</p><button type="button" onClick={() => setFeedback(null)} aria-label="关闭提示" className="rounded px-1 text-lg leading-none opacity-70 hover:opacity-100">×</button>
    </div>}
  </div>;
}
