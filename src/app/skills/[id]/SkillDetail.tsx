"use client";

import { useRef, useState } from "react";
import ProductDiscussions from "@/components/ProductDiscussions";
import SafeMarkdown from "@/components/SafeMarkdown";
import { extractFirstUrl } from "@/lib/linkify";
import { skillCategoryLabel } from "@/lib/skillCategories";
import { supabase } from "@/lib/supabase";

type Skill = {
  id: string | number;
  name: string;
  category?: string | null;
  version?: string | null;
  description?: string | null;
  downloads?: number | null;
  created_at?: string | null;
  repo_url?: string | null;
  file_path?: string | null;
  storage_bucket?: "packages" | "skill-packages" | null;
  readme?: string | null;
  license?: string | null;
  package_name?: string | null;
};

// 目前只有 README 有真实内容，其余 tab 待实现前先不展示
const tabs = ["README"] as const;

export default function SkillDetail({ skill }: { skill: Skill }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("README");
  const [shareUrl, setShareUrl] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [showShareFallback, setShowShareFallback] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const shareInputRef = useRef<HTMLInputElement>(null);
  const repoUrl = skill.repo_url || extractFirstUrl(skill.description);
  const hasFile = !!skill.file_path;

  async function handleDownload() {
    if (hasFile && skill.file_path) {
      // 让浏览器直接处理 Content-Disposition 下载，避免内置浏览器对 Blob 下载卡在“即将完成”。
      window.location.assign(`/api/skills/${encodeURIComponent(String(skill.id))}/download`);
      return;
    } else if (repoUrl) {
      await supabase.rpc("increment_skill_downloads", { skill_id: skill.id });
      window.open(repoUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function shareSkill() {
    const url = new URL(`/skills/${encodeURIComponent(String(skill.id))}`, window.location.origin).toString();
    setShareUrl(url);
    setShareMessage("");

    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        setShowShareFallback(false);
        setShareMessage("Skill 链接已复制。");
        return;
      } catch {
        // Show a selectable link below when clipboard permission is denied.
      }
    }

    setShowShareFallback(true);
    setShareMessage("浏览器无法直接复制，请复制下方链接。");
  }

  function copyShareLinkFallback() {
    const input = shareInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
    try {
      if (document.execCommand("copy")) {
        setShareMessage("Skill 链接已复制。");
        return;
      }
    } catch {
      // Keep the text selected so the user can copy it with the keyboard.
    }
    setShareMessage("链接已选中，请按 Ctrl+C 复制。");
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = reportReason.trim();
    if (reason.length < 2 || reason.length > 2000) {
      setReportMessage("请填写 2–2000 字的举报原因。");
      return;
    }
    setReportBusy(true);
    setReportMessage("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const { error } = await supabase.from("content_reports").insert({
      reporter_id: auth.user.id,
      target_type: "skill",
      target_id: String(skill.id),
      reason,
    });
    setReportBusy(false);
    if (error) {
      setReportMessage(error.code === "23505" ? "你已经提交过这条 Skill 的待处理举报。" : `提交失败：${error.message}`);
      return;
    }
    setReportMessage("举报已提交，管理员会尽快核查。");
    setReportReason("");
    setReportOpen(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* 左侧：标题 + tabs + 内容 */}
      <div>
        <div className="flex items-start gap-4">
          <div className="mt-1 text-3xl">📄</div>
          <div>
            <h1 className="font-mono text-3xl font-bold">{skill.name}</h1>
            <div className="mt-1 text-sm text-zinc-500">
              <span className="font-mono">{skill.version ?? "0.1.0"}</span>
              <span className="ml-3 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{skillCategoryLabel(skill.category)}</span>
              {skill.license && <span className="ml-3 font-mono">{skill.license}</span>}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="mt-8 flex gap-6 border-b border-zinc-200 dark:border-zinc-800 text-sm">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`-mb-px border-b-2 pb-3 ${
                tab === item
                  ? "border-blue-500 text-zinc-900 dark:text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* tab 内容 */}
        <div className="mt-6">
          {tab === "README" ? (
            <SafeMarkdown className="hub-content-prose" content={skill.readme || skill.description || "作者暂未填写说明。"} />
          ) : (
            <p className="text-sm text-zinc-500">暂无内容。</p>
          )}
        </div>
      </div>

      {/* 右侧信息卡片 */}
      <aside className="space-y-4">
        {(hasFile || repoUrl) && (
          <button
            onClick={handleDownload}
            className="hub-button-primary w-full"
          >
            {hasFile ? "⬇ 下载 Skill 包" : "↗ 查看源码仓库"}
          </button>
        )}
        <button type="button" onClick={shareSkill} className="hub-button-secondary w-full">分享此 Skill</button>
        <button type="button" onClick={() => { setReportOpen((open) => !open); setReportMessage(""); }} className="w-full rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:border-rose-300 hover:text-rose-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-rose-800 dark:hover:text-rose-300">举报此 Skill</button>
        {reportOpen && <form onSubmit={(event) => void submitReport(event)} className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
          <label htmlFor="skill-report-reason" className="block text-sm font-medium">举报原因</label>
          <textarea id="skill-report-reason" required minLength={2} maxLength={2000} value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="请描述你发现的问题，便于管理员核实。" className="min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950" />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setReportOpen(false)} className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800">取消</button><button type="submit" disabled={reportBusy} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60">{reportBusy ? "提交中…" : "提交举报"}</button></div>
        </form>}
        {reportMessage && <p role="status" aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-300">{reportMessage}</p>}
        {shareMessage && <p role="status" aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-300">{shareMessage}</p>}
        {showShareFallback && <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
          <label htmlFor="skill-share-url" className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Skill 链接</label>
          <input id="skill-share-url" ref={shareInputRef} readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-xs text-zinc-800 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200" />
          <button type="button" onClick={copyShareLinkFallback} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">复制链接</button>
        </div>}

        <div className="hub-surface-soft p-5 text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500">总下载量</span>
            <span className="font-semibold">{skill.downloads ?? 0}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500">当前版本</span>
            <span className="font-mono text-xs">{skill.version ?? "0.1.0"}</span>
          </div>
          {skill.package_name && <div className="flex items-center justify-between gap-3 py-1"><span className="text-zinc-500">文件包</span><span className="truncate font-mono text-xs">{skill.package_name}</span></div>}
        </div>

      </aside>

      <div className="lg:col-span-2">
        <ProductDiscussions productType="skill" productId={skill.id} />
      </div>
    </div>
  );
}
