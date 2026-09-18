"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PublishPageShell, { inputClassName, labelClassName } from "@/components/PublishPageShell";
import SafeMarkdown from "@/components/SafeMarkdown";
import { getProfileDisplay } from "@/lib/profile";
import { postCategories } from "@/lib/forumCategories";
import { supabase } from "@/lib/supabase";
import { makeRequestId, normalizeForumText, safeReturnPath, validatePostInput } from "@/lib/forumValidation";
import { contentTypeLabels, getSupabaseErrorMessage } from "@/lib/batch2";

const guestDraftKey = "skillhub:forum:draft:new:guest";
function userDraftKey(userId: string) { return `skillhub:forum:draft:new:${userId}`; }
function readDraft(key = guestDraftKey) {
  if (typeof window === "undefined") return { title: "", content: "", category: "question" };
  try {
    const saved = window.sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) as { title?: string; content?: string; category?: string } : { title: "", content: "", category: "question" };
  } catch { return { title: "", content: "", category: "question" }; }
}

function NewPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("returnTo"), "/forum");
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("question");
  const [contentType, setContentType] = useState<"discussion" | "question" | "case">("question");
  const [caseFields, setCaseFields] = useState({ scenario: "", goal: "", toolsEnvironment: "", steps: "", inputExample: "", outputExample: "", effects: "", limitations: "" });
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function loadGuestDraft() {
      const draft = readDraft();
      if (draft.title || draft.content) { setTitle(draft.title ?? ""); setContent(draft.content ?? ""); setCategory(draft.category ?? "question"); }
    }
    void loadGuestDraft();
  }, []);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const nextUserId = data.user?.id ?? null;
      setUserId(nextUserId);
      if (nextUserId) {
        const guest = readDraft();
        const savedForUser = readDraft(userDraftKey(nextUserId));
        const hasUserDraft = Boolean(savedForUser.title || savedForUser.content);
        const selected = hasUserDraft ? savedForUser : guest;
        if (!hasUserDraft && (guest.title || guest.content)) {
          try { sessionStorage.setItem(userDraftKey(nextUserId), JSON.stringify(guest)); sessionStorage.removeItem(guestDraftKey); } catch { /* private mode */ }
        }
        setTitle(selected.title ?? ""); setContent(selected.content ?? ""); setCategory(selected.category ?? "question");
      }
    });
  }, []);

  useEffect(() => {
    if (userId === undefined) return;
    try { sessionStorage.setItem(userId ? userDraftKey(userId) : guestDraftKey, JSON.stringify({ title, content, category })); } catch { /* private mode */ }
  }, [title, content, category, userId]);

  async function publishPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validatePostInput(title, content, category);
    if (contentType === "case") {
      const missing = Object.entries(caseFields).filter(([, value]) => !value.trim()).map(([key]) => key);
      if (missing.length) errors.case = "案例字段必须全部填写，限制条件可填写“暂无已知限制”。";
    }
    setFieldErrors(errors);
    setMessage("");
    if (Object.keys(errors).length) return;
    setIsSubmitting(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push(`/login?returnTo=${encodeURIComponent(`/forum/new?returnTo=${encodeURIComponent(returnTo)}`)}`);
      return;
    }
    const requestId = makeRequestId();
    const limit = await supabase.rpc("check_forum_rate_limit", { p_action: "post", p_request_id: requestId });
    if (limit.error) { setMessage("发布服务尚未完成数据库升级，请稍后重试。"); setIsSubmitting(false); return; }
    if (!(limit.data as { allowed?: boolean } | null)?.allowed) { setMessage("发布过于频繁，请 1 分钟后再试。"); setIsSubmitting(false); return; }
    const profile = getProfileDisplay(data.user);
    const { data: created, error } = await supabase.from("posts").upsert({ title: normalizeForumText(title), content: normalizeForumText(content), category, content_type: contentType, status: "pending", author: profile.name, user_id: data.user.id, request_id: requestId, case_scenario: caseFields.scenario, case_goal: caseFields.goal, case_tools_environment: caseFields.toolsEnvironment, case_steps: caseFields.steps, case_input_example: caseFields.inputExample, case_output_example: caseFields.outputExample, case_effects: caseFields.effects, case_limitations: caseFields.limitations }, { onConflict: "user_id,request_id" }).select("id").single();
    if (error) { setMessage(`发布失败：${error.message}`); setIsSubmitting(false); return; }
    if (created?.id) {
      const submit = await supabase.rpc("submit_post_for_review", { p_post_id: created.id });
      if (submit.error) { setMessage(`提交审核失败：${getSupabaseErrorMessage(submit.error.message)}`); setIsSubmitting(false); return; }
    }
    try { sessionStorage.removeItem(userId ? userDraftKey(userId) : guestDraftKey); } catch { /* ignore */ }
    if (created?.id) void fetch("/api/embed-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: created.id, requestId }) }).catch(() => {});
    router.push(returnTo); router.refresh();
  }

  return <PublishPageShell title="发布新帖子" description="分享问题、展示成果，或讨论 Skill 和 Agent 的使用经验。">
    <form className="space-y-6" onSubmit={publishPost} noValidate>
      <div><span className={labelClassName}>内容类型</span><div className="flex flex-wrap gap-3">{Object.entries(contentTypeLabels).map(([value, label]) => <label key={value} className="cursor-pointer"><input type="radio" name="content-type" value={value} checked={contentType === value} onChange={() => { setContentType(value as typeof contentType); if (value === "question") setCategory("question"); }} className="peer sr-only" /><span className="block rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-600 transition peer-checked:border-blue-500 peer-checked:text-blue-600 dark:border-zinc-700 dark:bg-[#0f141c] dark:text-zinc-300 dark:peer-checked:border-zinc-200 dark:peer-checked:text-white">{label}</span></label>)}</div>{fieldErrors.case && <p className="mt-2 text-sm text-red-600">{fieldErrors.case}</p>}</div>
      <div><span className={labelClassName}>标签分类</span><div className="flex flex-wrap gap-3">{postCategories.map((item) => <label key={item.value} className="cursor-pointer"><input type="radio" name="category" value={item.value} checked={category === item.value} onChange={() => { setCategory(item.value); setFieldErrors((current) => { const next = { ...current }; delete next.category; return next; }); }} className="peer sr-only" /><span className="block rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-600 transition peer-checked:border-blue-500 peer-checked:text-blue-600 dark:border-zinc-700 dark:bg-[#0f141c] dark:text-zinc-300 dark:peer-checked:border-zinc-200 dark:peer-checked:text-white">{item.label}</span></label>)}</div>{fieldErrors.category && <p className="mt-2 text-sm text-red-600">{fieldErrors.category}</p>}</div>
      <div><label className={labelClassName} htmlFor="post-title">标题 <span className="font-normal text-zinc-500">（1–120 字）</span></label><input id="post-title" value={title} maxLength={120} onChange={(event) => { setTitle(event.target.value); setFieldErrors((current) => { const next = { ...current }; delete next.title; return next; }); }} className={inputClassName} placeholder="用一句话说明你想讨论的内容" aria-invalid={Boolean(fieldErrors.title)} />{fieldErrors.title && <p className="mt-2 text-sm text-red-600">{fieldErrors.title}</p>}</div>
      <div><div className="flex items-center justify-between"><label className={labelClassName} htmlFor="post-body">正文 <span className="font-normal text-zinc-500">（1–20,000 字）</span></label><button type="button" onClick={() => setShowPreview((value) => !value)} className="mb-2 text-sm text-blue-600 hover:underline">{showPreview ? "返回编辑" : "预览 Markdown"}</button></div>{showPreview ? <div className="min-h-72 rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-[#0f141c]">{content.trim() ? <SafeMarkdown content={content} /> : <p className="text-sm text-zinc-500">暂无内容。</p>}</div> : <textarea id="post-body" value={content} maxLength={20000} onChange={(event) => { setContent(event.target.value); setFieldErrors((current) => { const next = { ...current }; delete next.content; return next; }); }} className={`${inputClassName} min-h-72 resize-y font-mono`} placeholder="支持标题、列表、加粗、代码块和普通 http(s) 链接。" aria-invalid={Boolean(fieldErrors.content)} />}{fieldErrors.content && <p className="mt-2 text-sm text-red-600">{fieldErrors.content}</p>}</div>
      {contentType === "case" && <section className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20"><h2 className="font-semibold">结构化案例字段</h2>{([['scenario','适用场景'],['goal','目标'],['toolsEnvironment','工具与环境版本'],['steps','执行步骤（至少 1 步）'],['inputExample','输入示例'],['outputExample','输出示例'],['effects','效果说明'],['limitations','限制条件']] as const).map(([key, label]) => <div key={key}><label className={labelClassName} htmlFor={`case-${key}`}>{label}</label><textarea id={`case-${key}`} value={caseFields[key]} onChange={(event) => setCaseFields((current) => ({ ...current, [key]: event.target.value }))} className={`${inputClassName} min-h-20`} /></div>)}</section>}
      {message && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{message}</p>}
      <div className="flex flex-wrap justify-end gap-4"><Link href={returnTo} className="rounded-md border border-zinc-300 px-6 py-3 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900">取消</Link><button type="submit" disabled={isSubmitting} className="rounded-md bg-green-600 px-8 py-3 font-medium text-white disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "发布中..." : "发布帖子"}</button></div>
    </form>
  </PublishPageShell>;
}

export default function NewPostPage() { return <Suspense fallback={<div className="min-h-screen" /> }><NewPostForm /></Suspense>; }
