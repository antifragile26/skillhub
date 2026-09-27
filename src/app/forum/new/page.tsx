"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PublishPageShell, { inputClassName, labelClassName } from "@/components/PublishPageShell";
import SafeMarkdown from "@/components/SafeMarkdown";
import ProductSearchSelect from "@/components/ProductSearchSelect";
import type { ProductSelection, ProductType } from "@/components/ProductSearchSelect";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getProfileDisplay } from "@/lib/profile";
import { postCategories, composerCategory, categoryForContentType, contentTypeForCategory } from "@/lib/forumCategories";
import { supabase } from "@/lib/supabase";
import { makeRequestId, normalizeForumText, safeReturnPath, validatePostInput } from "@/lib/forumValidation";
import { getSupabaseErrorMessage } from "@/lib/batch2";

type ContentType = "discussion" | "question" | "case";
type CaseFields = { scenario: string; goal: string; toolsEnvironment: string; steps: string; inputExample: string; outputExample: string; effects: string; limitations: string };
type Draft = { title?: string; content?: string; category?: string; contentType?: ContentType; caseFields?: Partial<CaseFields>; linkedProduct?: { type?: string; id: string } | null };

const guestDraftKey = "skillhub:forum:draft:new:guest";
function userDraftKey(userId: string) { return `skillhub:forum:draft:new:${userId}`; }
const emptyCaseFields: CaseFields = { scenario: "", goal: "", toolsEnvironment: "", steps: "", inputExample: "", outputExample: "", effects: "", limitations: "" };
const maxForumUploadBytes = 6 * 1024 * 1024;
const forumFileTypes: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp",
  pdf: "application/pdf", txt: "text/plain", md: "text/markdown", csv: "text/csv", json: "application/json", zip: "application/zip",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const forumImageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

function createUploadId() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = crypto.getRandomValues(new Uint32Array(4));
    return Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readDraft(key = guestDraftKey): Draft {
  if (typeof window === "undefined") return { title: "", content: "", category: "question", contentType: "question", caseFields: emptyCaseFields };
  try {
    const saved = window.sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) as Draft : { title: "", content: "", category: "question", contentType: "question", caseFields: emptyCaseFields };
  } catch { return { title: "", content: "", category: "question", contentType: "question", caseFields: emptyCaseFields }; }
}

function NewPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("returnTo"), "/forum");
  const requestedType = searchParams.get("contentType");
  const initialContentType: ContentType = requestedType === "discussion" || requestedType === "case" || requestedType === "question" ? requestedType : "question";
  const hasContentTypeParam = requestedType === "discussion" || requestedType === "case" || requestedType === "question";
  const initialCategory = categoryForContentType(initialContentType);
  const requestedProductType = searchParams.get("productType");
  const productType: ProductType | null = requestedProductType === "skill" ? requestedProductType : null;
  const productId = searchParams.get("productId")?.trim() || null;
  const legacyAgentParam = requestedProductType === "agent";
  const invalidProductParams = !legacyAgentParam && Boolean(requestedProductType || productId) && (!productType || !productId);

  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [contentType, setContentType] = useState<ContentType>(initialContentType);
  const [caseFields, setCaseFields] = useState<CaseFields>(emptyCaseFields);
  const [linkedProduct, setLinkedProduct] = useState<ProductSelection | null>(null);
  const [legacyAgentDraft, setLegacyAgentDraft] = useState(false);
  const [productLoading, setProductLoading] = useState(Boolean(productType && productId));
  const [productError, setProductError] = useState(invalidProductParams ? "Skill 参数无效，请重新搜索，或移除关联后继续发布。" : "");
  const [draftReady, setDraftReady] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const requestRef = useRef<{ signature: string; id: string } | null>(null);
  const postBodyRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    let active = true;
    async function initializeForm() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setAuthUser(data.user);
      const nextUserId = data.user?.id ?? null;
      setUserId(nextUserId);
      let selectedDraft: Draft = {};
      if (nextUserId) {
        const guest = readDraft();
        const savedForUser = readDraft(userDraftKey(nextUserId));
        const hasUserDraft = Boolean(savedForUser.title || savedForUser.content);
        selectedDraft = hasUserDraft ? savedForUser : guest;
        if (!hasUserDraft && (guest.title || guest.content || Object.hasOwn(guest, "linkedProduct"))) {
          try { sessionStorage.setItem(userDraftKey(nextUserId), JSON.stringify(guest)); sessionStorage.removeItem(guestDraftKey); } catch { /* private mode */ }
        }
      } else {
        selectedDraft = readDraft();
      }
      if (selectedDraft.title || selectedDraft.content) {
        setTitle(selectedDraft.title ?? "");
        setContent(selectedDraft.content ?? "");
        const draftCategory = composerCategory(selectedDraft.category);
        const restoredCategory = hasContentTypeParam
          ? categoryForContentType(initialContentType)
          : postCategories.some((item) => item.value === draftCategory)
            ? draftCategory
            : categoryForContentType(selectedDraft.contentType ?? initialContentType);
        setCategory(restoredCategory);
        setContentType(contentTypeForCategory(restoredCategory));
        setCaseFields({ ...emptyCaseFields, ...(selectedDraft.caseFields ?? {}) });
      }
      const draftHasProductChoice = Object.hasOwn(selectedDraft, "linkedProduct");
      setLegacyAgentDraft(selectedDraft.linkedProduct?.type === "agent");
      const draftProduct = selectedDraft.linkedProduct?.type === "skill" && selectedDraft.linkedProduct.id
        ? { type: "skill" as const, id: selectedDraft.linkedProduct.id }
        : null;
      const target = productType && productId ? { type: productType, id: productId } : (draftHasProductChoice ? draftProduct : null);
      if (target) {
        setProductLoading(true);
        const result = await supabase.from("skills").select("id,name,description").eq("id", target.id).eq("status", "published").maybeSingle();
        if (!active) return;
        if (result.error || !result.data) {
          setProductError("找不到这个 Skill，或当前不可访问。你可以移除关联或重新搜索。");
          setLinkedProduct(null);
        } else {
          setLinkedProduct({ type: "skill", id: String(result.data.id), name: result.data.name, description: result.data.description });
          setProductError("");
        }
      } else {
        setLinkedProduct(null);
        setProductError(invalidProductParams ? "Skill 参数无效，请重新搜索，或不关联作品继续发布。" : "");
      }
      setProductLoading(false);
      setDraftReady(true);
    }
    void initializeForm();
    return () => { active = false; };
  }, [hasContentTypeParam, initialContentType, invalidProductParams, productId, productType]);

  useEffect(() => {
    if (userId === undefined || !draftReady) return;
    try { sessionStorage.setItem(userId ? userDraftKey(userId) : guestDraftKey, JSON.stringify({ title, content, category, contentType, caseFields, linkedProduct: linkedProduct ? { type: linkedProduct.type, id: linkedProduct.id } : null })); } catch { /* private mode */ }
  }, [title, content, category, contentType, caseFields, linkedProduct, userId, draftReady]);

  function insertAtCursor(snippet: string) {
    const textarea = postBodyRef.current;
    if (!textarea) {
      setContent((current) => `${current}${current ? "\n\n" : ""}${snippet}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const prefix = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const suffix = !after || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
    const insertion = `${prefix}${snippet}${suffix}`;
    setContent((current) => `${current.slice(0, start)}${insertion}${current.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + prefix.length + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
    setFieldErrors((current) => { const next = { ...current }; delete next.content; return next; });
  }

  async function uploadPostFiles(fileList: FileList | null, kind: "image" | "attachment") {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    setUploadMessage("");
    if (!authUser) {
      setUploadMessage("登录后才能上传图片或附件；正文草稿会保留在当前浏览器。");
      return;
    }
    if (files.length > 5) {
      setUploadMessage("一次最多选择 5 个文件，请分批上传。");
      return;
    }

    const uploaded: Array<{ name: string; url: string }> = [];
    const errors: string[] = [];
    setUploading(true);
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const contentType = forumFileTypes[extension];
      if (!contentType || (kind === "image" && !forumImageExtensions.has(extension))) {
        errors.push(`${file.name}：不支持这种文件类型`);
        continue;
      }
      if (file.size > maxForumUploadBytes) {
        errors.push(`${file.name}：文件不能超过 6 MB`);
        continue;
      }
      try {
        const filePath = `${authUser.id}/${createUploadId()}.${extension}`;
        const result = await supabase.storage.from("forum-attachments").upload(filePath, file, {
          cacheControl: "3600",
          contentType,
          upsert: false,
        });
        if (result.error || !result.data?.path) {
          errors.push(`${file.name}：上传失败`);
          continue;
        }
        const { data } = supabase.storage.from("forum-attachments").getPublicUrl(result.data.path);
        uploaded.push({ name: file.name.replace(/[\r\n\\[\]]/g, " ").trim() || "附件", url: data.publicUrl });
      } catch {
        errors.push(`${file.name}：上传失败，请检查网络后重试`);
      }
    }
    setUploading(false);

    if (uploaded.length) {
      if (kind === "image") {
        insertAtCursor(uploaded.map(({ name, url }) => `![${name}](${url})`).join("\n\n") + "\n");
        setUploadMessage(`已插入 ${uploaded.length} 张图片，可以在正文任意位置调整。`);
      } else {
        const attachmentLines = uploaded.map(({ name, url }) => `- [${name}](${url})`).join("\n");
        setContent((current) => `${current.trimEnd()}\n\n### 附件\n\n${attachmentLines}`);
        setFieldErrors((current) => { const next = { ...current }; delete next.content; return next; });
        setUploadMessage(`已在正文末尾添加 ${uploaded.length} 个附件。`);
      }
    }
    if (errors.length) setUploadMessage((current) => [current, ...errors].filter(Boolean).join(" "));
  }

  async function publishPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validatePostInput(title, content, category);
    setFieldErrors(errors);
    setMessage("");
    if (Object.keys(errors).length) return;
    if (productLoading || (linkedProduct && productError)) { setMessage(productError || "关联作品尚未加载完成，请稍后重试。"); return; }
    setIsSubmitting(true);
    setSubmissionStep("正在确认登录状态…");
    try {
    if (!authUser) {
      setIsSubmitting(false);
      setSubmissionStep("");
      const loginParams = new URLSearchParams(searchParams.toString());
      if (linkedProduct) { loginParams.set("productType", linkedProduct.type); loginParams.set("productId", linkedProduct.id); }
      else { loginParams.delete("productType"); loginParams.delete("productId"); }
      const currentFormPath = `/forum/new${loginParams.toString() ? `?${loginParams.toString()}` : ""}`;
      router.push(`/login?returnTo=${encodeURIComponent(currentFormPath)}`);
      return;
    }
    const payloadSignature = JSON.stringify({ title, content, category, contentType, caseFields, productType: linkedProduct?.type ?? null, productId: linkedProduct?.id ?? null });
    const requestId = requestRef.current?.signature === payloadSignature ? requestRef.current.id : makeRequestId();
    requestRef.current = { signature: payloadSignature, id: requestId };
    setSubmissionStep("正在检查发布限制…");
    const limit = await supabase.rpc("check_forum_rate_limit", { p_action: "post", p_request_id: requestId }).abortSignal(AbortSignal.timeout(12000));
    if (limit.error) {
      const timedOut = /abort|timeout/i.test(limit.error.message);
      setMessage(timedOut ? "发布检查超时了，请检查网络后重试。" : "发布检查失败，请稍后重试。" );
      if (!timedOut) requestRef.current = null;
      setIsSubmitting(false); setSubmissionStep(""); return;
    }
    if (!(limit.data as { allowed?: boolean } | null)?.allowed) { setMessage("发布过于频繁，请 1 分钟后再试。"); setIsSubmitting(false); setSubmissionStep(""); requestRef.current = null; return; }
    const profile = getProfileDisplay(authUser);
    setSubmissionStep("正在保存帖子…");
    const result = await supabase.rpc("create_forum_post_with_product", {
      p_title: normalizeForumText(title),
      p_content: normalizeForumText(content),
      p_category: category,
      p_content_type: contentType,
      p_author: profile.name,
      p_request_id: requestId,
      p_case_scenario: normalizeForumText(caseFields.scenario),
      p_case_goal: normalizeForumText(caseFields.goal),
      p_case_tools_environment: normalizeForumText(caseFields.toolsEnvironment),
      p_case_steps: normalizeForumText(caseFields.steps),
      p_case_input_example: normalizeForumText(caseFields.inputExample),
      p_case_output_example: normalizeForumText(caseFields.outputExample),
      p_case_effects: normalizeForumText(caseFields.effects),
      p_case_limitations: normalizeForumText(caseFields.limitations),
      p_product_type: linkedProduct?.type ?? null,
      p_product_id: linkedProduct?.id ?? null,
    }).abortSignal(AbortSignal.timeout(20000));
    if (result.error) {
      const timedOut = /abort|timeout/i.test(result.error.message);
      setMessage(timedOut ? "保存响应超时。帖子可能仍在处理中，点击重试可安全确认结果；请先不要更改内容。" : `发布失败：${getSupabaseErrorMessage(result.error.message)}`);
      if (!timedOut) requestRef.current = null;
      setIsSubmitting(false); setSubmissionStep(""); return;
    }
    const created = result.data as { id?: string | number } | null;
    try { sessionStorage.removeItem(userId ? userDraftKey(userId) : guestDraftKey); } catch { /* ignore */ }
    if (created?.id) {
      void fetch("/api/embed-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: created.id, requestId }) }).catch(() => {});
      router.push(`/forum/${created.id}`);
      router.refresh();
    } else {
      setMessage("帖子已提交，但没有返回帖子地址，请从论坛查看。");
      setIsSubmitting(false); setSubmissionStep("");
    }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知错误";
      setMessage(`发布请求未完成：${detail}。请稍后重试。`);
      setIsSubmitting(false);
      setSubmissionStep("");
    }
  }

  const linkedProductHref = linkedProduct ? `/skills/${encodeURIComponent(linkedProduct.id)}` : returnTo;
  const caseLabels = [["scenario", "适用场景"], ["goal", "目标"], ["toolsEnvironment", "工具与环境版本"], ["steps", "执行步骤"], ["inputExample", "输入示例"], ["outputExample", "输出示例"], ["effects", "效果说明"], ["limitations", "限制条件"]] as const;

  return <PublishPageShell title="发布新帖子" description="分享 Skill 使用问题、经验和实践结果。">
    <form className="space-y-6" onSubmit={publishPost} noValidate>
      <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"><div><h2 className="text-sm font-semibold">关联 Skill <span className="font-normal text-zinc-500">（选填）</span></h2><p className="mt-1 text-xs text-zinc-500">选择讨论相关的 Skill，方便其他使用者找到；也可以不关联。</p></div>{(legacyAgentParam || legacyAgentDraft) && <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">Agent 作品已停止展示和关联。帖子内容已保留，请选择一个 Skill，或不关联作品继续发布。</p>}{productLoading ? <p role="status" className="text-sm text-zinc-500">正在确认 Skill...</p> : <ProductSearchSelect selected={linkedProduct} onSelect={(product) => { setLinkedProduct(product); setProductError(""); }} onClear={() => { setLinkedProduct(null); setProductError(""); }} />}{productError && !productLoading && <p role="alert" className="text-sm text-amber-700">{productError}</p>}{linkedProduct && <Link href={linkedProductHref} className="inline-block text-xs text-blue-600 hover:underline">查看 Skill 详情 →</Link>}</section>
      <div><span className={labelClassName}>讨论方向</span><div className="flex flex-wrap gap-3">{postCategories.map((item) => <label key={item.value} className="cursor-pointer"><input type="radio" name="category" value={item.value} checked={category === item.value} onChange={() => { setCategory(item.value); setContentType(contentTypeForCategory(item.value)); setFieldErrors((current) => { const next = { ...current }; delete next.category; return next; }); }} className="peer sr-only" /><span className="block rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-600 transition peer-checked:border-blue-500 peer-checked:text-blue-600 dark:border-zinc-700 dark:bg-[#0f141c] dark:text-zinc-300 dark:peer-checked:border-zinc-200 dark:peer-checked:text-white">{item.label}</span></label>)}</div>{fieldErrors.category && <p className="mt-2 text-sm text-red-600">{fieldErrors.category}</p>}</div>
      <div><label className={labelClassName} htmlFor="post-title">标题 <span className="font-normal text-zinc-500">（1–120 字）</span></label><input id="post-title" value={title} maxLength={120} onChange={(event) => { setTitle(event.target.value); setFieldErrors((current) => { const next = { ...current }; delete next.title; return next; }); }} className={inputClassName} placeholder="用一句话说明你想讨论的内容" aria-invalid={Boolean(fieldErrors.title)} />{fieldErrors.title && <p className="mt-2 text-sm text-red-600">{fieldErrors.title}</p>}</div>
      <div>
        <div className="flex items-center justify-between"><label className={labelClassName} htmlFor="post-body">正文 <span className="font-normal text-zinc-500">（1–20,000 字）</span></label><button type="button" onClick={() => setShowPreview((value) => !value)} className="mb-2 text-sm text-blue-600 hover:underline">{showPreview ? "返回编辑" : "预览 Markdown"}</button></div>
        {!showPreview && <div className="mb-2 flex flex-wrap items-center gap-2">
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="sr-only" onChange={(event) => { void uploadPostFiles(event.currentTarget.files, "image"); event.currentTarget.value = ""; }} />
          <input ref={attachmentInputRef} type="file" accept=".pdf,.txt,.md,.csv,.json,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx" multiple className="sr-only" onChange={(event) => { void uploadPostFiles(event.currentTarget.files, "attachment"); event.currentTarget.value = ""; }} />
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading || isSubmitting} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">{uploading ? "上传中…" : "插入图片"}</button>
          <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={uploading || isSubmitting} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">添加附件</button>
          <span className="text-xs text-zinc-500">图片可插入正文任意位置；附件会加在正文末尾。单个文件最大 6 MB。</span>
        </div>}
        {showPreview ? <div className="min-h-72 rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-[#0f141c]">{content.trim() ? <SafeMarkdown content={content} /> : <p className="text-sm text-zinc-500">暂无内容。</p>}</div> : <textarea ref={postBodyRef} id="post-body" value={content} maxLength={20000} onChange={(event) => { setContent(event.target.value); setFieldErrors((current) => { const next = { ...current }; delete next.content; return next; }); }} className={`${inputClassName} min-h-72 resize-y font-mono`} placeholder="支持标题、列表、加粗、代码块和普通 http(s) 链接。" aria-invalid={Boolean(fieldErrors.content)} />}
        {uploadMessage && <p role="status" className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{uploadMessage}</p>}
        {fieldErrors.content && <p className="mt-2 text-sm text-red-600">{fieldErrors.content}</p>}
      </div>
      {contentType === "case" && <section className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20"><div><h2 className="font-semibold">经验补充（可选）</h2><p className="mt-1 text-sm text-blue-800/80 dark:text-blue-200/80">正文是主要内容，下面的信息可以帮助别人复现你的方法，不需要全部填写。</p></div>{caseLabels.map(([key, label]) => <div key={key}><label className={labelClassName} htmlFor={`case-${key}`}>{label}</label><textarea id={`case-${key}`} value={caseFields[key]} onChange={(event) => setCaseFields((current) => ({ ...current, [key]: event.target.value }))} className={`${inputClassName} min-h-20`} /></div>)}</section>}
      {message && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{message}</p>}
      <div className="flex flex-wrap justify-end gap-4"><Link href={returnTo} className="rounded-md border border-zinc-300 px-6 py-3 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900">取消</Link><button type="submit" disabled={isSubmitting || productLoading || Boolean(linkedProduct && productError)} className="rounded-md bg-green-600 px-8 py-3 font-medium text-white disabled:cursor-wait disabled:opacity-60">{isSubmitting ? submissionStep || "发布中…" : "发布帖子"}</button></div>
    </form>
  </PublishPageShell>;
}

export default function NewPostPage() { return <Suspense fallback={<div className="min-h-screen" />}><NewPostForm /></Suspense>; }
