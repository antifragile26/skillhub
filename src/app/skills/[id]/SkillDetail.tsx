"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { contentTypeLabels, getSupabaseErrorMessage, statusLabels } from "@/lib/batch2";
import { automatedReviewLabel, automatedReviewSummary } from "@/lib/moderation";
import { skillCategoryLabel } from "@/lib/skillCategories";
import { supabase } from "@/lib/supabase";

type PendingPost = { id: number; title: string; content: string; author: string; status: string; content_type: string; created_at: string; is_featured?: boolean; pin_rank?: number | null; rejection_reason?: string | null; automated_review_status?: "not_run" | "clean" | "flagged"; automated_risk_score?: number; automated_labels?: string[] };
type SkillReview = { id: number; name: string; version: string | null; description: string | null; category: string | null; created_at: string; submitted_at: string | null; package_name: string | null; package_size: number | null; user_id: string | null; status?: string; deleted_at?: string | null };
type Report = { id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string };
type Knowledge = { id: string; title: string; status: string; source_post_id?: number | null; summary: string; scenario: string; steps: string; conclusions: string; limitations: string; tags: string[] };
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
  const [skillReviews, setSkillReviews] = useState<SkillReview[]>([]);
  const [managedSkills, setManagedSkills] = useState<SkillReview[]>([]);
  const [skillReviewError, setSkillReviewError] = useState("");
  const [postCount, setPostCount] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [knowledgeEditOriginal, setKnowledgeEditOriginal] = useState<Knowledge | null>(null);
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
    setPosts((postResult.data ?? []) as PendingPost[]); setPostCount(postResult.count ?? 0); setReports((reportResult.data ?? []) as Report[]); setKnowledge((knowledgeResult.data ?? []) as Knowledge[]); setCollections((collectionsResult.data ?? []) as Collection[]);
    setSkillReviews((skillResult.data ?? []) as SkillReview[]); setSkillReviewError(skillResult.error ? `Skill å®¡æ ¸é˜Ÿåˆ—åŠ è½½å¤±è´¥ï¼š${skillResult.error.message}` : "");
    setManagedSkills((managedSkillResult.data ?? []) as SkillReview[]);
    const now = new Date(); const from = new Date(now); from.setDate(now.getDate() - 7); const statResult = await supabase.rpc("get_forum_stats", { p_from: from.toISOString(), p_to: now.toISOString() }); if (!statResult.error) setStats((statResult.data ?? null) as Stats | null);
  }, [authorFilter, contentTypeFilter, page, statusFilter]);

  function errorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : "æ“ä½œå¤±è´¥ï¼Œè¯·ç¨åé‡è¯•ã€‚";
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

  // åå°é¦–æ¬¡åŠ è½½éœ€è¦æŠŠå¼‚æ­¥æƒé™ç»“æœåŒæ­¥åˆ°é¡µé¢çŠ¶æ€ï¼›å»¶åä¸€æ‹é¿å… React effect è§„åˆ™å°†å…¶åˆ¤å®šä¸ºåŒæ­¥çº§è”æ›´æ–°ã€‚
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function moderate(post: PendingPost, decision: string) {
    const reason = decision === "approve" || decision === "restore" ? "" : window.prompt("è¯·è¾“å…¥å¤„ç†åŸå› ") ?? "";
    if (decision !== "approve" && decision !== "restore" && !reason.trim()) return;
    const successText = decision === "approve" ? "å¸–å­å·²é€šè¿‡å¹¶å‘å¸ƒã€‚" : decision === "reject" ? "å¸–å­å·²é©³å›ã€‚" : decision === "unpublish" ? "å¸–å­å·²ä¸‹æ¶ã€yçí¢G§²ÚîÆ­yÔ(€€€€€€€€€íÍ­¥±°¹Á…­…•}¹…µ”€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•Ñİ••¸…À´ÌÁä´ÄˆøñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áĞµé¥¹Œ´ÔÀÀˆûšZ’îÛ–2ğ½ÍÁ…¸øñÍÁ…¸±…ÍÍ9…µ”ô‰ÑÉÕ¹…Ñ”™½¹Ğµµ½¹¼Ñ•áĞµáÌˆùíÍ­¥±°¹Á…­…•}¹…µ•ôğ½ÍÁ…¸øğ½‘¥Øùô(€€€€€€€€ğ½‘¥Øø4(4(€€€€€€ğ½…Í¥‘”ø((€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰±œé½°µÍÁ…¸´Èˆø(€€€€€€€€ñAÉ½‘ÕÑ¥ÍÕÍÍ¥½¹ÌÁÉ½‘ÕÑQåÁ”ô‰Í­¥±°ˆÁÉ½‘ÕÑ%õíÍ­¥±°¹¥‘ô€¼ø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øø4(€€¤ì4)ô4(